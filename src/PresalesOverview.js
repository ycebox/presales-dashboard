import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from './supabaseClient';
import {
  Activity,
  Briefcase,
  Globe2,
  Target,
  Users,
  User,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
  CalendarDays,
  Filter,
  Plane,
} from 'lucide-react';
import './PresalesOverview.css';

const HOURS_PER_DAY = 8;
const DEFAULT_TASK_HOURS = 4; // fallback if estimated_hours is null

function PresalesOverview() {
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [scheduleEvents, setScheduleEvents] = useState([]);
  const [presalesResources, setPresalesResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Assignment helper filters
  const [assignPriority, setAssignPriority] = useState('Normal');
  const [assignStart, setAssignStart] = useState('');
  const [assignEnd, setAssignEnd] = useState('');

  // Calendar view: 14 or 30 days
  const [calendarView, setCalendarView] = useState('14'); // '14' | '30'

  // Manage schedule form state
  const [scheduleAssignee, setScheduleAssignee] = useState('');
  const [scheduleType, setScheduleType] = useState('Leave');
  const [scheduleStart, setScheduleStart] = useState('');
  const [scheduleEnd, setScheduleEnd] = useState('');
  const [scheduleNote, setScheduleNote] = useState('');
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [scheduleMessage, setScheduleMessage] = useState(null);
  const [scheduleError, setScheduleError] = useState(null);

  // ---------- Load data from Supabase ----------
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [projRes, taskRes, scheduleRes, presalesRes] = await Promise.all([
          supabase
            .from('projects')
            .select('id, customer_name, country, sales_stage, deal_value')
            .order('customer_name', { ascending: true }),
          supabase
            .from('project_tasks')
            .select(
              'id, project_id, assignee, status, due_date, start_date, end_date, estimated_hours, priority, task_type'
            ),
          supabase
            .from('presales_schedule')
            .select('id, assignee, type, start_date, end_date, note'),
          supabase
            .from('presales_resources')
            // Only existing columns
            .select('id, name, email, region, is_active')
            .order('name', { ascending: true }),
        ]);

        if (projRes.error) throw projRes.error;
        if (taskRes.error) throw taskRes.error;

        setProjects(projRes.data || []);
        setTasks(taskRes.data || []);

        if (scheduleRes.error) {
          console.warn('presales_schedule not loaded:', scheduleRes.error.message);
          setScheduleEvents([]);
        } else {
          setScheduleEvents(scheduleRes.data || []);
        }

        if (presalesRes.error) {
          console.warn('presales_resources not loaded:', presalesRes.error.message);
          setPresalesResources(presalesRes.data || []);
        } else {
          setPresalesResources(presalesRes.data || []);
        }
      } catch (err) {
        console.error('Error loading presales overview:', err);
        setError('Failed to load presales overview data.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // ---------- Helpers ----------
  const formatCurrency = (amount) => {
    if (!amount || isNaN(amount)) return '$0';
    return amount.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    });
  };

  const toMidnight = (d) => {
    const c = new Date(d);
    c.setHours(0, 0, 0, 0);
    return c;
  };

  const isSameDay = (d1, d2) => {
    const a = toMidnight(d1);
    const b = toMidnight(d2);
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  };

  const isWithinRange = (day, startStr, endStr) => {
    if (!startStr || !endStr) return false;
    const start = toMidnight(startStr);
    const end = toMidnight(endStr);
    const d = toMidnight(day);
    return d >= start && d <= end;
  };

  const getTaskEffortHours = (task) => {
    const est = parseFloat(task.estimated_hours);
    if (!isNaN(est) && est > 0) return est;
    return DEFAULT_TASK_HOURS;
  };

  // ---------- Summary stats ----------
  const {
    activeDeals,
    wonDeals,
    pipelineValue,
    wonValue,
    avgDeal,
    countryCount,
    openTasksCount,
  } = useMemo(() => {
    if (!projects || projects.length === 0) {
      return {
        activeDeals: 0,
        wonDeals: 0,
        pipelineValue: 0,
        wonValue: 0,
        avgDeal: 0,
        countryCount: 0,
        openTasksCount: tasks.filter((t) => t.status !== 'Completed').length,
      };
    }

    let active = 0;
    let won = 0;
    let pipeline = 0;
    let wonVal = 0;
    const countrySet = new Set();

    projects.forEach((p) => {
      if (p.country) countrySet.add(p.country);

      const value =
        typeof p.deal_value === 'number'
          ? p.deal_value
          : parseFloat(p.deal_value || 0);

      const isDone =
        p.sales_stage === 'Done' || p.sales_stage === 'Closed-Won';

      if (isDone) {
        won += 1;
        wonVal += isNaN(value) ? 0 : value;
      } else {
        active += 1;
        pipeline += isNaN(value) ? 0 : value;
      }
    });

    const openTasks = tasks.filter((t) => t.status !== 'Completed').length;
    const avg = active > 0 ? pipeline / active : 0;

    return {
      activeDeals: active,
      wonDeals: won,
      pipelineValue: pipeline,
      wonValue: wonVal,
      avgDeal: avg,
      countryCount: countrySet.size,
      openTasksCount: openTasks,
    };
  }, [projects, tasks]);

  // ---------- Date ranges ----------
  const daysRange = useMemo(() => {
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const totalDays = calendarView === '30' ? 30 : 14;

    for (let i = 0; i < totalDays; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      days.push(d);
    }
    return days;
  }, [calendarView]);

  const thisWeekRange = useMemo(() => {
    const today = new Date();
    const day = today.getDay(); // 0-6 (Sun-Sat)
    const start = new Date(today);
    start.setDate(today.getDate() - day + 1); // Monday
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }, []);

  const nextWeekRange = useMemo(() => {
    const { start } = thisWeekRange;
    const nextStart = new Date(start);
    nextStart.setDate(start.getDate() + 7);
    const nextEnd = new Date(nextStart);
    nextEnd.setDate(nextStart.getDate() + 6);
    nextStart.setHours(0, 0, 0, 0);
    nextEnd.setHours(23, 59, 59, 999);
    return { start: nextStart, end: nextEnd };
  }, [thisWeekRange]);

  const last30DaysRange = useMemo(() => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date(end);
    start.setDate(end.getDate() - 30);
    start.setHours(0, 0, 0, 0);
    return { start, end };
  }, []);

  // ---------- Workload per assignee + utilization ----------
  const workloadByAssignee = useMemo(() => {
    // If no presales and no tasks at all, nothing to show
    if (
      (!tasks || tasks.length === 0) &&
      (!presalesResources || presalesResources.length === 0)
    ) {
      return [];
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const map = new Map();

    // 1) Start with all presales resources so they always appear
    (presalesResources || [])
      .filter((r) => r.is_active !== false) // treat null as active
      .forEach((r) => {
        map.set(r.name, {
          assignee: r.name,
          total: 0,
          open: 0,
          overdue: 0,
          projects: new Set(),
          overdueLast30: 0,
          overdueTotalLast30: 0,
          thisWeekHours: 0,
          nextWeekHours: 0,
        });
      });

    // 2) Add anyone who has tasks but isn't in presales_resources (keeps "Unassigned" etc)
    (tasks || []).forEach((t) => {
      const name = t.assignee || 'Unassigned';
      if (!map.has(name)) {
        map.set(name, {
          assignee: name,
          total: 0,
          open: 0,
          overdue: 0,
          projects: new Set(),
          overdueLast30: 0,
          overdueTotalLast30: 0,
          thisWeekHours: 0,
          nextWeekHours: 0,
        });
      }
    });

    // 3) Now walk tasks and update workload metrics
    (tasks || []).forEach((t) => {
      const name = t.assignee || 'Unassigned';
      const entry = map.get(name);
      if (!entry) return;

      entry.total += 1;

      const isCompleted = t.status === 'Completed';
      const taskEffort = getTaskEffortHours(t);

      if (t.project_id) {
        entry.projects.add(t.project_id);
      }

      // overdue counters
      let isOverdue = false;
      if (!isCompleted && t.due_date) {
        const due = new Date(t.due_date);
        due.setHours(0, 0, 0, 0);
        if (due < today) {
          isOverdue = true;
          entry.overdue += 1;
        }
        if (due >= last30DaysRange.start && due <= last30DaysRange.end) {
          entry.overdueTotalLast30 += 1;
          if (isOverdue) entry.overdueLast30 += 1;
        }
      }

      if (!isCompleted) {
        entry.open += 1;

        const taskStart = t.start_date ? toMidnight(t.start_date) : null;
        const taskEnd = t.end_date ? toMidnight(t.end_date) : null;
        const taskDue = t.due_date ? toMidnight(t.due_date) : null;

        const addHoursToRange = (range, hoursToSpread) => {
          const { start, end } = range;

          let rStart = taskStart || taskDue || start;
          let rEnd = taskEnd || taskDue || end;

          rStart = toMidnight(rStart);
          rEnd = toMidnight(rEnd);

          const overlapStart = rStart < start ? start : rStart;
          const overlapEnd = rEnd > end ? end : rEnd;

          if (overlapEnd < overlapStart) return 0;

          let days = 1;
          if (taskStart && taskEnd) {
            const ms = overlapEnd - overlapStart;
            days = Math.floor(ms / (1000 * 60 * 60 * 24)) + 1;
          }

          if (days <= 0) days = 1;
          const perDay = hoursToSpread / days;
          return perDay * days;
        };

        entry.thisWeekHours += addHoursToRange(thisWeekRange, taskEffort);
        entry.nextWeekHours += addHoursToRange(nextWeekRange, taskEffort);
      }
    });

    const capacityWeekHours = HOURS_PER_DAY * 5;

    const arr = Array.from(map.values()).map((e) => {
      const utilThisWeek = capacityWeekHours
        ? Math.min((e.thisWeekHours / capacityWeekHours) * 100, 999)
        : 0;
      const utilNextWeek = capacityWeekHours
        ? Math.min((e.nextWeekHours / capacityWeekHours) * 100, 999)
        : 0;

      const loadRatio = e.total === 0 ? 0 : e.open / e.total;

      const overdueRateLast30 =
        e.overdueTotalLast30 > 0
          ? (e.overdueLast30 / e.overdueTotalLast30) * 100
          : 0;

      return {
        ...e,
        projectCount: e.projects.size,
        loadRatio,
        utilThisWeek,
        utilNextWeek,
        overdueRateLast30,
      };
    });

    // Sort by open tasks (those without tasks will naturally fall at bottom)
    arr.sort((a, b) => b.open - a.open);
    return arr;
  }, [tasks, presalesResources, thisWeekRange, nextWeekRange, last30DaysRange]);

  // ---------- Team-level health summary ----------
  const teamSummary = useMemo(() => {
    if (!workloadByAssignee || workloadByAssignee.length === 0) return null;

    const count = workloadByAssignee.length;
    const avgNext =
      workloadByAssignee.reduce((sum, w) => sum + w.utilNextWeek, 0) / count;

    let overloaded = 0;
    let underused = 0;
    workloadByAssignee.forEach((w) => {
      if (w.utilNextWeek >= 90) overloaded += 1;
      else if (w.utilNextWeek <= 40) underused += 1;
    });

    return {
      avgNext: Math.round(avgNext),
      overloaded,
      underused,
      total: count,
    };
  }, [workloadByAssignee]);

  // ---------- Deals by country ----------
  const dealsByCountry = useMemo(() => {
    if (!projects || projects.length === 0) return [];

    const map = new Map();

    projects.forEach((p) => {
      const country = p.country || 'Unknown';
      if (!map.has(country)) {
        map.set(country, {
          country,
          total: 0,
          active: 0,
          done: 0,
          pipelineValue: 0,
        });
      }

      const entry = map.get(country);
      entry.total += 1;

      const value =
        typeof p.deal_value === 'number'
          ? p.deal_value
          : parseFloat(p.deal_value || 0);

      const isDone =
        p.sales_stage === 'Done' || p.sales_stage === 'Closed-Won';

      if (isDone) {
        entry.done += 1;
      } else {
        entry.active += 1;
        entry.pipelineValue += isNaN(value) ? 0 : value;
      }
    });

    const arr = Array.from(map.values());
    arr.sort((a, b) => b.pipelineValue - a.pipelineValue);

    return arr;
  }, [projects]);

  // ---------- Availability heatmap ----------
  const availabilityGrid = useMemo(() => {
    if (!workloadByAssignee || workloadByAssignee.length === 0) return [];

    return workloadByAssignee.map((res) => {
      const row = { assignee: res.assignee, days: [] };

      daysRange.forEach((day) => {
        let status = 'free';
        let label = 'Free';

        // 1) leave/travel overrides
        const ev = scheduleEvents.find(
          (e) =>
            e.assignee === res.assignee &&
            isWithinRange(day, e.start_date, e.end_date)
        );

        if (ev) {
          const type = (ev.type || '').toLowerCase();
          if (type === 'travel') {
            status = 'travel';
            label = 'Travel';
          } else {
            status = 'leave';
            label = ev.type || 'Leave';
          }
        } else {
          // 2) tasks
          const hasTask = tasks.some((t) => {
            if (t.assignee !== res.assignee) return false;
            if (t.status === 'Completed') return false;

            const d = toMidnight(day);

            if (t.start_date && t.end_date) {
              return isWithinRange(d, t.start_date, t.end_date);
            }

            if (t.start_date && !t.end_date) {
              const start = toMidnight(t.start_date);
              return d >= start;
            }

            if (!t.start_date && t.end_date) {
              const end = toMidnight(t.end_date);
              return d <= end;
            }

            if (t.due_date) {
              const due = toMidnight(t.due_date);
              return isSameDay(due, d);
            }

            return false;
          });

          if (hasTask) {
            status = 'busy';
            label = 'Busy';
          }
        }

        row.days.push({ status, label, date: day });
      });

      return row;
    });
  }, [workloadByAssignee, daysRange, scheduleEvents, tasks]);

  // ---------- Assignment helper (no skills) ----------
  const assignmentSuggestions = useMemo(() => {
    if (!assignStart || !assignEnd || workloadByAssignee.length === 0) {
      return [];
    }

    const start = toMidnight(assignStart);
    const end = toMidnight(assignEnd);

    const rangeDays = [];
    const probe = new Date(start);
    while (probe <= end) {
      rangeDays.push(new Date(probe));
      probe.setDate(probe.getDate() + 1);
    }

    const busyMap = new Map();
    workloadByAssignee.forEach((res) => {
      busyMap.set(res.assignee, new Set());
    });

    // mark busy from schedule and tasks
    workloadByAssignee.forEach((res) => {
      const busySet = busyMap.get(res.assignee);

      // schedule
      scheduleEvents.forEach((e) => {
        if (e.assignee !== res.assignee) return;
        rangeDays.forEach((d) => {
          if (isWithinRange(d, e.start_date, e.end_date)) {
            busySet.add(d.toDateString());
          }
        });
      });

      // tasks
      tasks.forEach((t) => {
        if (t.assignee !== res.assignee) return;
        if (t.status === 'Completed') return;

        rangeDays.forEach((d) => {
          const dd = toMidnight(d);
          let overlaps = false;

          if (t.start_date && t.end_date) {
            overlaps = isWithinRange(dd, t.start_date, t.end_date);
          } else if (t.start_date && !t.end_date) {
            const startT = toMidnight(t.start_date);
            overlaps = dd >= startT;
          } else if (!t.start_date && t.end_date) {
            const endT = toMidnight(t.end_date);
            overlaps = dd <= endT;
          } else if (t.due_date) {
            const due = toMidnight(t.due_date);
            overlaps = isSameDay(due, dd);
          }

          if (overlaps) busySet.add(d.toDateString());
        });
      });
    });

    // score suggestions (purely on free days + next week load)
    const suggestions = workloadByAssignee.map((w) => {
      const busySet = busyMap.get(w.assignee) || new Set();
      const totalDays = rangeDays.length || 1;
      const busyDays = busySet.size;
      const freeDays = totalDays - busyDays;
      const freeRatio = freeDays / totalDays;

      const loadPenalty =
        w.utilNextWeek >= 120 ? 0 : w.utilNextWeek >= 90 ? 0.2 : 1;

      const score = freeRatio * 2 + loadPenalty;

      return {
        assignee: w.assignee,
        projectCount: w.projectCount,
        open: w.open,
        utilThisWeek: w.utilThisWeek,
        utilNextWeek: w.utilNextWeek,
        freeDays,
        totalDays,
        score,
      };
    });

    suggestions.sort((a, b) => b.score - a.score);
    return suggestions;
  }, [assignStart, assignEnd, workloadByAssignee, tasks, scheduleEvents]);

  // ---------- Upcoming crunch days (quality/risk signal) ----------
  const crunchDays = useMemo(() => {
    if (!tasks || tasks.length === 0) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const rangeEnd = new Date(today);
    rangeEnd.setDate(today.getDate() + 14);
    rangeEnd.setHours(23, 59, 59, 999);

    const perDayMap = new Map(); // key: dateString -> { date, perAssigneeCount }

    tasks.forEach((t) => {
      if (!t.due_date) return;
      if (t.status === 'Completed') return;

      const due = toMidnight(t.due_date);
      if (due < today || due > rangeEnd) return;

      const key = due.toDateString();
      if (!perDayMap.has(key)) {
        perDayMap.set(key, {
          date: due,
          byAssignee: new Map(),
        });
      }

      const dayEntry = perDayMap.get(key);
      const name = t.assignee || 'Unassigned';
      const current = dayEntry.byAssignee.get(name) || 0;
      dayEntry.byAssignee.set(name, current + 1);
    });

    const results = [];

    perDayMap.forEach((value) => {
      const { date, byAssignee } = value;
      const heavyAssignees = [];
      byAssignee.forEach((count, name) => {
        if (count >= 3) {
          heavyAssignees.push({ name, count });
        }
      });

      if (heavyAssignees.length > 0) {
        results.push({
          date,
          heavyAssignees,
        });
      }
    });

    results.sort((a, b) => a.date - b.date);
    return results;
  }, [tasks]);

  // ---------- Add schedule handler ----------
  const handleAddSchedule = async (e) => {
    e.preventDefault();
    setScheduleError(null);
    setScheduleMessage(null);

    if (!scheduleAssignee || !scheduleType || !scheduleStart || !scheduleEnd) {
      setScheduleError('Please fill in assignee, type, start and end dates.');
      return;
    }

    try {
      setScheduleSaving(true);

      const { data, error: insertError } = await supabase
        .from('presales_schedule')
        .insert([
          {
            assignee: scheduleAssignee,
            type: scheduleType,
            start_date: scheduleStart,
            end_date: scheduleEnd,
            note: scheduleNote || null,
          },
        ])
        .select();

      if (insertError) {
        console.error('Error adding schedule:', insertError);
        setScheduleError('Failed to save schedule entry.');
      } else if (data && data.length > 0) {
        // Push new schedule entry into local state so heatmap updates
        setScheduleEvents((prev) => [...prev, data[0]]);
        setScheduleMessage('Schedule saved.');
        // Reset form (keep assignee for faster multiple inputs if you like)
        setScheduleType('Leave');
        setScheduleStart('');
        setScheduleEnd('');
        setScheduleNote('');
      }
    } catch (err) {
      console.error('Error adding schedule:', err);
      setScheduleError('Unexpected error while saving schedule.');
    } finally {
      setScheduleSaving(false);
    }
  };

  // ---------- UI states ----------
  if (loading) {
    return (
      <div className="presales-page-container">
        <div className="presales-loading">
          <div className="presales-spinner" />
          <p>Loading presales overview…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="presales-page-container">
        <div className="presales-error">
          <AlertTriangle size={20} />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="presales-page-container">
      {/* HEADER */}
      <header className="presales-header">
        <div className="presales-header-main">
          <Link to="/" className="back-to-home-link">
            <ArrowLeft size={14} />
            Back to Home
          </Link>
          <div>
            <h2>Presales Overview</h2>
            <p>Regional view of APAC deals, workload, and availability.</p>
          </div>
        </div>

        {teamSummary && (
          <div className="team-summary-bar">
            <div className="team-summary-item">
              <span className="team-summary-label">Avg. next week load</span>
              <span className="team-summary-value">
                {teamSummary.avgNext}%
              </span>
            </div>
            <div className="team-summary-item">
              <span className="team-summary-label">Overloaded (≥90%)</span>
              <span className="team-summary-value">
                {teamSummary.overloaded}/{teamSummary.total}
              </span>
            </div>
            <div className="team-summary-item">
              <span className="team-summary-label">Underused (≤40%)</span>
              <span className="team-summary-value">
                {teamSummary.underused}/{teamSummary.total}
              </span>
            </div>
          </div>
        )}
      </header>

      {/* TOP SUMMARY CARDS */}
      <section className="presales-summary-section">
        <div className="presales-summary-grid">
          <div className="presales-summary-card">
            <div className="psc-icon psc-icon-primary">
              <Briefcase size={18} />
            </div>
            <div className="psc-content">
              <p className="psc-label">Active deals</p>
              <p className="psc-value">{activeDeals}</p>
              <p className="psc-sub">
                {pipelineValue
                  ? `${formatCurrency(pipelineValue)} in pipeline`
                  : 'No value set yet'}
              </p>
            </div>
          </div>

          <div className="presales-summary-card">
            <div className="psc-icon psc-icon-accent">
              <CheckCircle2 size={18} />
            </div>
            <div className="psc-content">
              <p className="psc-label">Closed / Done</p>
              <p className="psc-value">{wonDeals}</p>
              <p className="psc-sub">
                {wonValue
                  ? `${formatCurrency(wonValue)} closed`
                  : 'No closed deals yet'}
              </p>
            </div>
          </div>

          <div className="presales-summary-card">
            <div className="psc-icon psc-icon-orange">
              <Target size={18} />
            </div>
            <div className="psc-content">
              <p className="psc-label">Avg. deal size</p>
              <p className="psc-value">
                {avgDeal ? formatCurrency(avgDeal) : '—'}
              </p>
              <p className="psc-sub">Based on active pipeline</p>
            </div>
          </div>

          <div className="presales-summary-card">
            <div className="psc-icon psc-icon-neutral">
              <Globe2 size={18} />
            </div>
            <div className="psc-content">
              <p className="psc-label">Countries & tasks</p>
              <p className="psc-value">
                {countryCount}{' '}
                <span className="psc-value-suffix">countries</span>
              </p>
              <p className="psc-sub">
                {openTasksCount} open task
                {openTasksCount !== 1 ? 's' : ''} across APAC
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* WORKLOAD + DEALS */}
      <section className="presales-main-grid">
        {/* WORKLOAD PANEL */}
        <div className="presales-panel">
          <div className="presales-panel-header">
            <div>
              <h3>
                <Users size={16} className="panel-icon" />
                Presales workload
              </h3>
              <p>How loaded each presales is, this week and next week.</p>
            </div>
          </div>

          {workloadByAssignee.length === 0 ? (
            <div className="presales-empty">
              <User size={20} />
              <p>No tasks found. Assign tasks to presales to see workload.</p>
            </div>
          ) : (
            <div className="workload-table-wrapper">
              <table className="workload-table">
                <thead>
                  <tr>
                    <th>Presales</th>
                    <th className="th-center">Projects</th>
                    <th className="th-center">Total</th>
                    <th className="th-center">Open</th>
                    <th className="th-center">Overdue</th>
                    <th className="th-center">This week</th>
                    <th className="th-center">Next week</th>
                    <th className="th-center">Last 30d overdue %</th>
                  </tr>
                </thead>
                <tbody>
                  {workloadByAssignee.map((w) => (
                    <tr key={w.assignee}>
                      <td>
                        <div className="wl-name-cell">
                          <div className="wl-avatar">
                            {(w.assignee || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div className="wl-name-text">
                            <span className="wl-name-main">{w.assignee}</span>
                            <span className="wl-name-sub">
                              {w.projectCount} project
                              {w.projectCount !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="td-center">{w.projectCount}</td>
                      <td className="td-center">{w.total}</td>
                      <td className="td-center">{w.open}</td>
                      <td className="td-center overdue">{w.overdue}</td>
                      <td className="td-center">
                        {Math.round(w.utilThisWeek)}%
                      </td>
                      <td className="td-center">
                        {Math.round(w.utilNextWeek)}%
                      </td>
                      <td className="td-center">
                        {Math.round(w.overdueRateLast30)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* DEALS BY COUNTRY */}
        <div className="presales-panel">
          <div className="presales-panel-header">
            <div>
              <h3>
                <Activity size={16} className="panel-icon" />
                Deals by country
              </h3>
              <p>Where the pipeline is concentrated across APAC.</p>
            </div>
          </div>

          {dealsByCountry.length === 0 ? (
            <div className="presales-empty">
              <Globe2 size={20} />
              <p>No deals found. Add projects with country and deal value.</p>
            </div>
          ) : (
            <div className="country-table-wrapper">
              <table className="country-table">
                <thead>
                  <tr>
                    <th>Country</th>
                    <th className="th-center">Total</th>
                    <th className="th-center">Active</th>
                    <th className="th-center">Done</th>
                    <th className="th-right">Pipeline</th>
                  </tr>
                </thead>
                <tbody>
                  {dealsByCountry.map((c) => (
                    <tr key={c.country}>
                      <td>
                        <div className="cty-name-cell">
                          <span className="cty-flag-placeholder">
                            {c.country.charAt(0).toUpperCase()}
                          </span>
                          <span>{c.country}</span>
                        </div>
                      </td>
                      <td className="td-center">{c.total}</td>
                      <td className="td-center">{c.active}</td>
                      <td className="td-center">{c.done}</td>
                      <td className="td-right">
                        {c.pipelineValue
                          ? formatCurrency(c.pipelineValue)
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* AVAILABILITY HEATMAP */}
      <section className="presales-calendar-section">
        <div className="presales-panel">
          <div className="presales-panel-header presales-panel-header-row">
            <div>
              <h3>
                <CalendarDays size={16} className="panel-icon" />
                Presales availability (
                {calendarView === '14' ? 'next 14 days' : 'next 30 days'})
              </h3>
              <p>
                Heatmap of busy days, leave, travel, and free capacity for each
                presales resource.
              </p>
            </div>
            <div className="calendar-toggle">
              <button
                type="button"
                className={
                  calendarView === '14'
                    ? 'calendar-toggle-btn active'
                    : 'calendar-toggle-btn'
                }
                onClick={() => setCalendarView('14')}
              >
                14 days
              </button>
              <button
                type="button"
                className={
                  calendarView === '30'
                    ? 'calendar-toggle-btn active'
                    : 'calendar-toggle-btn'
                }
                onClick={() => setCalendarView('30')}
              >
                30 days
              </button>
            </div>
          </div>

          {availabilityGrid.length === 0 ? (
            <div className="presales-empty">
              <Users size={20} />
              <p>
                No presales workload found yet. Assign tasks and schedule leave /
                travel to see availability.
              </p>
            </div>
          ) : (
            <div className="heatmap-wrapper">
              <div className="heatmap-legend">
                <span className="legend-item">
                  <span className="legend-dot status-free" />
                  Free
                </span>
                <span className="legend-item">
                  <span className="legend-dot status-busy" />
                  Busy (tasks)
                </span>
                <span className="legend-item">
                  <span className="legend-dot status-leave" />
                  Leave
                </span>
                <span className="legend-item">
                  <span className="legend-dot status-travel" />
                  Travel
                </span>
              </div>

              <div className="heatmap-table">
                <div className="heatmap-header-row">
                  <div className="heatmap-header-cell heatmap-name-col">
                    Presales
                  </div>
                  {daysRange.map((d, idx) => {
                    const label = d.toLocaleDateString('en-SG', {
                      weekday: 'short',
                      day: 'numeric',
                    });
                    return (
                      <div
                        key={idx}
                        className="heatmap-header-cell heatmap-day-col"
                      >
                        {label}
                      </div>
                    );
                  })}
                </div>

                {availabilityGrid.map((row) => (
                  <div key={row.assignee} className="heatmap-row">
                    <div className="heatmap-presales-cell">
                      <div className="wl-avatar">
                        {(row.assignee || 'U').charAt(0).toUpperCase()}
                      </div>
                      <span className="heatmap-presales-name">
                        {row.assignee}
                      </span>
                    </div>
                    {row.days.map((d, idx) => {
                      const dateLabel = d.date.toLocaleDateString('en-SG', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                      });
                      return (
                        <div
                          key={idx}
                          className={`heatmap-cell status-${d.status}`}
                          title={`${row.assignee} · ${dateLabel} · ${d.label}`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* UPCOMING CRUNCH DAYS (RISK SIGNAL) */}
      <section className="presales-crunch-section">
        <div className="presales-panel">
          <div className="presales-panel-header">
            <div>
              <h3>
                <AlertTriangle size={16} className="panel-icon" />
                Upcoming crunch days (next 14 days)
              </h3>
              <p>Days where someone has 3 or more tasks due on the same day.</p>
            </div>
          </div>

          {crunchDays.length === 0 ? (
            <div className="presales-empty small">
              <p>No crunch days detected in the next 2 weeks.</p>
            </div>
          ) : (
            <div className="crunch-list">
              {crunchDays.map((cd) => (
                <div key={cd.date.toDateString()} className="crunch-item">
                  <div className="crunch-date">
                    {cd.date.toLocaleDateString('en-SG', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })}
                  </div>
                  <div className="crunch-assignees">
                    {cd.heavyAssignees.map((h) => (
                      <span key={h.name} className="crunch-chip">
                        {h.name}: {h.count} tasks
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* MANAGE PRESALES SCHEDULE */}
      <section className="presales-schedule-section">
        <div className="presales-panel">
          <div className="presales-panel-header">
            <div>
              <h3>
                <Plane size={16} className="panel-icon" />
                Manage presales schedule
              </h3>
              <p>
                Log leave, travel, or training so the availability heatmap stays
                realistic.
              </p>
            </div>
          </div>

          <form className="schedule-form" onSubmit={handleAddSchedule}>
            <div className="schedule-form-row">
              <div className="schedule-field">
                <label>Presales</label>
                <select
                  value={scheduleAssignee}
                  onChange={(e) => setScheduleAssignee(e.target.value)}
                >
                  <option value="">Select presales</option>
                  {presalesResources
                    .filter((r) => r.is_active !== false)
                    .map((r) => (
                      <option key={r.id} value={r.name}>
                        {r.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="schedule-field">
                <label>Type</label>
                <select
                  value={scheduleType}
                  onChange={(e) => setScheduleType(e.target.value)}
                >
                  <option value="Leave">Leave</option>
                  <option value="Travel">Travel</option>
                  <option value="Training">Training</option>
                  <option value="Public Holiday">Public Holiday</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="schedule-form-row">
              <div className="schedule-field">
                <label>Start date</label>
                <input
                  type="date"
                  value={scheduleStart}
                  onChange={(e) => setScheduleStart(e.target.value)}
                />
              </div>

              <div className="schedule-field">
                <label>End date</label>
                <input
                  type="date"
                  value={scheduleEnd}
                  onChange={(e) => setScheduleEnd(e.target.value)}
                />
              </div>
            </div>

            <div className="schedule-form-row">
              <div className="schedule-field schedule-field-full">
                <label>Note (optional)</label>
                <input
                  type="text"
                  placeholder="Example: Family trip, Manila workshop, APAC tour…"
                  value={scheduleNote}
                  onChange={(e) => setScheduleNote(e.target.value)}
                />
              </div>
            </div>

            <div className="schedule-form-actions">
              {scheduleError && (
                <span className="schedule-message schedule-message-error">
                  {scheduleError}
                </span>
              )}
              {scheduleMessage && (
                <span className="schedule-message schedule-message-success">
                  {scheduleMessage}
                </span>
              )}
              <button
                type="submit"
                className="primary-btn"
                disabled={scheduleSaving}
              >
                {scheduleSaving ? 'Saving…' : 'Add schedule entry'}
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* ASSIGNMENT HELPER */}
      <section className="presales-assignment-section">
        <div className="presales-panel">
          <div className="presales-panel-header">
            <div>
              <h3>
                <Filter size={16} className="panel-icon" />
                Assignment helper
              </h3>
              <p>
                Pick dates and see who has the most free days with reasonable
                next-week load.
              </p>
            </div>
          </div>

          <div className="assignment-content">
            <div className="assignment-filters">
              <div className="assignment-field">
                <label>Task window</label>
                <div className="assignment-dates">
                  <input
                    type="date"
                    value={assignStart}
                    onChange={(e) => setAssignStart(e.target.value)}
                  />
                  <span className="assignment-dash">to</span>
                  <input
                    type="date"
                    value={assignEnd}
                    onChange={(e) => setAssignEnd(e.target.value)}
                  />
                </div>
              </div>

              <div className="assignment-field">
                <label>Priority</label>
                <select
                  value={assignPriority}
                  onChange={(e) => setAssignPriority(e.target.value)}
                >
                  <option value="High">High</option>
                  <option value="Normal">Normal</option>
                  <option value="Low">Low</option>
                </select>
              </div>
            </div>

            <div className="assignment-list">
              {!assignStart || !assignEnd ? (
                <div className="presales-empty small">
                  <p>Select start and end date to see suggestions.</p>
                </div>
              ) : assignmentSuggestions.length === 0 ? (
                <div className="presales-empty small">
                  <p>No suggestions found for the selected range.</p>
                </div>
              ) : (
                <table className="assignment-table">
                  <thead>
                    <tr>
                      <th>Presales</th>
                      <th className="th-center">Free days</th>
                      <th className="th-center">Next week load</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignmentSuggestions.slice(0, 6).map((sug) => (
                      <tr key={sug.assignee}>
                        <td>
                          <div className="wl-name-cell">
                            <div className="wl-avatar">
                              {(sug.assignee || 'U')
                                .charAt(0)
                                .toUpperCase()}
                            </div>
                            <div className="wl-name-text">
                              <span className="wl-name-main">
                                {sug.assignee}
                              </span>
                              <span className="wl-name-sub">
                                {sug.projectCount} proj · {sug.open} open
                                tasks
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="td-center">
                          {sug.freeDays}/{sug.totalDays}
                        </td>
                        <td className="td-center">
                          {Math.round(sug.utilNextWeek)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default PresalesOverview;
