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
  const [assignSkill, setAssignSkill] = useState('');
  const [assignPriority, setAssignPriority] = useState('Normal');
  const [assignStart, setAssignStart] = useState('');
  const [assignEnd, setAssignEnd] = useState('');

  // Calendar view: 14 or 30 days
  const [calendarView, setCalendarView] = useState('14'); // '14' | '30'

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
            // FIX: removed timezone from select
            .select('id, name, email, region, skills, is_active')
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
          setPresalesResources([]);
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

  // ---------- Assignment helper ----------
  const allSkills = useMemo(() => {
    const set = new Set();
    presalesResources.forEach((r) => {
      const skills = Array.isArray(r.skills)
        ? r.skills
        : typeof r.skills === 'string'
        ? r.skills.split(',').map((s) => s.trim())
        : [];
      skills.forEach((s) => {
        if (s) set.add(s);
      });
    });
    return Array.from(set).sort();
  }, [presalesResources]);

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

    // score suggestions
    const suggestions = workloadByAssignee.map((w) => {
      const resource = presalesResources.find((r) => r.name === w.assignee);
      const skills = resource
        ? Array.isArray(resource.skills)
          ? resource.skills
          : typeof resource.skills === 'string'
          ? resource.skills.split(',').map((s) => s.trim())
          : []
        : [];

      const busySet = busyMap.get(w.assignee) || new Set();
      const totalDays = rangeDays.length || 1;
      const busyDays = busySet.size;
      const freeDays = totalDays - busyDays;
      const freeRatio = freeDays / totalDays;

      const skillMatch =
        !assignSkill ||
        skills.map((s) => s.toLowerCase()).includes(assignSkill.toLowerCase());
      const hasSkillScore = skillMatch ? 1 : 0;

      const loadPenalty =
        w.utilNextWeek >= 120 ? 0 : w.utilNextWeek >= 90 ? 0.2 : 1;

      const score = freeRatio * 2 + hasSkillScore * 1 + loadPenalty;

      return {
        assignee: w.assignee,
        projectCount: w.projectCount,
        open: w.open,
        utilThisWeek: w.utilThisWeek,
        utilNextWeek: w.utilNextWeek,
        freeDays,
        totalDays,
        skillMatch,
        skills,
        score,
      };
    });

    suggestions.sort((a, b) => b.score - a.score);
    return suggestions;
  }, [
    assignStart,
    assignEnd,
    assignSkill,
    workloadByAssignee,
    tasks,
    scheduleEvents,
    presalesResources,
  ]);

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

        {workloadByAssignee.length > 0 && (
          <div className="team-summary-bar">
            <div className="team-summary-item">
              <span className="team-summary-label">Avg. next week load</span>
              <span className="team-summary-value">
                {
                  Math.round(
                    workloadByAssignee.reduce(
                      (sum, w) => sum + w.utilNextWeek,
                      0
                    ) / workloadByAssignee.length
                  )
                }
                %
              </span>
            </div>
          </div>
        )}
      </header>

      {/* rest of the component stays the same (workload, deals by country, heatmap, crunch days, assignment helper) */}
      {/* ... */}
    </div>
  );
}

export default PresalesOverview;
