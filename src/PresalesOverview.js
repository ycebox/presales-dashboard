import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from './supabaseClient';
import {
  Activity,
  Users,
  User,
  AlertTriangle,
  CalendarDays,
  Filter,
  Plane,
  X,
  Edit3,
  Trash2,
  ListChecks,
} from 'lucide-react';
import './PresalesOverview.css';

const HOURS_PER_DAY = 8;
const DEFAULT_TASK_HOURS = 4;

// ---------- Helpers ----------
const toMidnight = (d) => {
  if (!d) return null;
  const nd = new Date(d);
  nd.setHours(0, 0, 0, 0);
  return nd;
};

const parseDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return toMidnight(value);
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return toMidnight(d);
};

const isWithinRange = (d, start, end) => {
  if (!d) return false;
  const day = toMidnight(d);
  const s = parseDate(start);
  const e = parseDate(end) || s;
  if (!s || !day) return false;
  return day.getTime() >= s.getTime() && day.getTime() <= e.getTime();
};

const isTaskOnDay = (task, day) => {
  if (!day) return false;
  const d = toMidnight(day);

  const start =
    parseDate(task.start_date) ||
    parseDate(task.due_date) ||
    parseDate(task.end_date);
  const end =
    parseDate(task.end_date) ||
    parseDate(task.due_date) ||
    parseDate(task.start_date);

  if (!start && !end) return false;

  const s = start || end;
  const e = end || start;

  return d.getTime() >= s.getTime() && d.getTime() <= e.getTime();
};

const getWeekRanges = () => {
  const today = toMidnight(new Date());

  const thisWeekStart = new Date(today);
  const day = thisWeekStart.getDay(); // 0 = Sun, 1 = Mon
  const diff = (day === 0 ? -6 : 1) - day; // move to Monday
  thisWeekStart.setDate(thisWeekStart.getDate() + diff);

  const thisWeekEnd = new Date(thisWeekStart);
  thisWeekEnd.setDate(thisWeekStart.getDate() + 4); // Mon–Fri

  const nextWeekStart = new Date(thisWeekStart);
  nextWeekStart.setDate(thisWeekStart.getDate() + 7);
  const nextWeekEnd = new Date(nextWeekStart);
  nextWeekEnd.setDate(nextWeekEnd.getDate() + 4);

  const last30Start = new Date(today);
  last30Start.setDate(today.getDate() - 30);
  const last30End = new Date(today);

  return {
    thisWeek: { start: thisWeekStart, end: thisWeekEnd },
    nextWeek: { start: nextWeekStart, end: nextWeekEnd },
    last30: { start: last30Start, end: last30End },
  };
};

const getOverlapDays = (range, start, end) => {
  if (!range || !range.start || !range.end) return 0;
  const rs = toMidnight(range.start);
  const re = toMidnight(range.end);
  const ts = parseDate(start) || rs;
  const te = parseDate(end) || ts;

  const overlapStart = ts.getTime() > rs.getTime() ? ts : rs;
  const overlapEnd = te.getTime() < re.getTime() ? te : re;

  if (overlapEnd.getTime() < overlapStart.getTime()) return 0;

  const ms = overlapEnd.getTime() - overlapStart.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24)) + 1;
};

const getUtilLabel = (pct) => {
  if (!pct || Number.isNaN(pct)) return '';
  if (pct >= 120) return 'Over capacity';
  if (pct >= 90) return 'Near capacity';
  if (pct <= 40) return 'Light load';
  return 'Healthy';
};

const priorityScore = (priority) => {
  const p = (priority || '').toLowerCase();
  if (p === 'high') return 1;
  if (p === 'normal' || p === 'medium') return 2;
  if (p === 'low') return 3;
  return 4;
};

function PresalesOverview() {
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [scheduleEvents, setScheduleEvents] = useState([]);
  const [presalesResources, setPresalesResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Assignment helper filters
  const [assignPriority, setAssignPriority] = useState('Normal'); // UI only for now
  const [assignStart, setAssignStart] = useState('');
  const [assignEnd, setAssignEnd] = useState('');

  // Calendar view
  const [calendarView, setCalendarView] = useState('14'); // 14 | 30

  // Schedule modal state
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleAssignee, setScheduleAssignee] = useState('');
  const [scheduleType, setScheduleType] = useState('Leave');
  const [scheduleStart, setScheduleStart] = useState('');
  const [scheduleEnd, setScheduleEnd] = useState('');
  const [scheduleNote, setScheduleNote] = useState('');
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [scheduleMessage, setScheduleMessage] = useState(null);
  const [scheduleError, setScheduleError] = useState(null);
  const [scheduleMode, setScheduleMode] = useState('create'); // 'create' | 'edit'
  const [editingScheduleId, setEditingScheduleId] = useState(null);

  // Day detail modal state
  const [dayDetailOpen, setDayDetailOpen] = useState(false);
  const [dayDetail, setDayDetail] = useState({
    assignee: '',
    date: null,
    tasks: [],
    schedules: [],
  });

  // ---------- Load data ----------
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [projRes, taskRes, scheduleRes, presalesRes] = await Promise.all([
          supabase
            .from('projects')
            .select('id, customer_name, sales_stage, deal_value')
            .order('customer_name', { ascending: true }),
          supabase
            .from('project_tasks')
            .select(
              'id, project_id, assignee, status, due_date, start_date, end_date, estimated_hours, priority, task_type, description, notes, created_at'
            ),
          supabase
            .from('presales_schedule')
            .select('id, assignee, type, start_date, end_date, note'),
          supabase
            .from('presales_resources')
            .select(
              'id, name, email, region, is_active, daily_capacity_hours, target_hours, max_tasks_per_day'
            )
            .order('name', { ascending: true }),
        ]);

        if (projRes.error) throw projRes.error;
        if (taskRes.error) throw taskRes.error;
        if (scheduleRes.error) throw scheduleRes.error;
        if (presalesRes.error) throw presalesRes.error;

        setProjects(projRes.data || []);
        setTasks(taskRes.data || []);
        setScheduleEvents(scheduleRes.data || []);
        setPresalesResources(
          (presalesRes.data || []).filter((p) => p.is_active !== false)
        );
      } catch (err) {
        console.error('Error loading presales overview data:', err);
        setError('Failed to load presales overview data.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // ---------- Base helpers ----------
  const projectMap = useMemo(() => {
    const map = new Map();
    (projects || []).forEach((p) => {
      map.set(p.id, p.customer_name || 'Unknown project');
    });
    return map;
  }, [projects]);

  const { thisWeek, nextWeek, last30 } = useMemo(() => getWeekRanges(), []);
  const today = useMemo(() => toMidnight(new Date()), []);
  const thisWeekRange = thisWeek;
  const nextWeekRange = nextWeek;
  const last30DaysRange = last30;

  const sevenDaysAhead = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + 7);
    return d;
  }, [today]);

  const isCompletedStatus = (status) => {
    const s = (status || '').toLowerCase();
    return s === 'completed' || s === 'done' || s === 'closed';
  };

  // ---------- Upcoming presales commitments (next 14 days) ----------
  const upcomingCommitments = useMemo(() => {
    if (!tasks || tasks.length === 0) return [];

    const importantTypes = [
      'Demo',
      'Workshop',
      'RFP',
      'Proposal',
      'Presentation',
      'POC',
    ];

    const end = new Date(today);
    end.setDate(end.getDate() + 14);

    const rows = (tasks || [])
      .filter((t) => {
        if (isCompletedStatus(t.status)) return false;
        const due = parseDate(t.due_date);
        if (!due) return false;
        if (due.getTime() < today.getTime()) return false;
        if (due.getTime() > end.getTime()) return false;

        const type = (t.task_type || '').trim();
        if (!type) return false;

        const typeOk = importantTypes.some((x) =>
          type.toLowerCase().includes(x.toLowerCase())
        );

        return typeOk;
      })
      .map((t) => ({
        ...t,
        customerName: projectMap.get(t.project_id) || 'Unknown project',
      }))
      .sort((a, b) => {
        const ad = parseDate(a.due_date) || today;
        const bd = parseDate(b.due_date) || today;
        if (ad.getTime() !== bd.getTime()) return ad - bd;
        return priorityScore(a.priority) - priorityScore(b.priority);
      })
      .slice(0, 12);

    return rows;
  }, [tasks, projectMap, today]);

  // ---------- Workload by assignee ----------
  const workloadByAssignee = useMemo(() => {
    const map = new Map();

    const getCapacityFor = (name) => {
      const res = (presalesResources || []).find((p) => {
        const n = p.name || p.email || 'Unknown';
        return n === name;
      });

      const dailyCapacity =
        res &&
        typeof res.daily_capacity_hours === 'number' &&
        !Number.isNaN(res.daily_capacity_hours)
          ? res.daily_capacity_hours
          : HOURS_PER_DAY;

      const targetHours =
        res &&
        typeof res.target_hours === 'number' &&
        !Number.isNaN(res.target_hours)
          ? res.target_hours
          : 6;

      const maxTasksPerDay =
        res && Number.isInteger(res.max_tasks_per_day)
          ? res.max_tasks_per_day
          : 3;

      return { dailyCapacity, targetHours, maxTasksPerDay };
    };

    // init from presales resources
    (presalesResources || []).forEach((p) => {
      const name = p.name || p.email || 'Unknown';
      if (!map.has(name)) {
        const { dailyCapacity, targetHours, maxTasksPerDay } =
          getCapacityFor(name);
        map.set(name, {
          assignee: name,
          projectIds: new Set(),
          total: 0,
          open: 0,
          overdue: 0,
          thisWeekHours: 0,
          nextWeekHours: 0,
          overdueLast30: 0,
          overdueTotalLast30: 0,
          dailyCapacity,
          targetHours,
          maxTasksPerDay,
        });
      }
    });

    const addHoursToRange = (range, task, hours) => {
      if (!range || !range.start || !range.end) return 0;

      const effHours =
        typeof hours === 'number' && !Number.isNaN(hours)
          ? hours
          : DEFAULT_TASK_HOURS;

      const taskStart =
        parseDate(task.start_date) ||
        parseDate(task.due_date) ||
        parseDate(task.end_date);
      const taskEnd =
        parseDate(task.end_date) ||
        parseDate(task.due_date) ||
        parseDate(task.start_date);

      const days = getOverlapDays(
        range,
        taskStart || task.due_date,
        taskEnd || task.due_date
      );

      if (days <= 0) return 0;

      const perDay = effHours / days;
      return perDay * days;
    };

    (tasks || []).forEach((t) => {
      const assignee = t.assignee || 'Unassigned';
      if (!map.has(assignee)) {
        const { dailyCapacity, targetHours, maxTasksPerDay } =
          getCapacityFor(assignee);
        map.set(assignee, {
          assignee,
          projectIds: new Set(),
          total: 0,
          open: 0,
          overdue: 0,
          thisWeekHours: 0,
          nextWeekHours: 0,
          overdueLast30: 0,
          overdueTotalLast30: 0,
          dailyCapacity,
          targetHours,
          maxTasksPerDay,
        });
      }

      const entry = map.get(assignee);
      entry.total += 1;
      entry.projectIds.add(t.project_id);

      const due = parseDate(t.due_date);

      const isCompleted = isCompletedStatus(t.status);
      const isOverdue = due && !isCompleted && due.getTime() < today.getTime();
      const isOpen = !isCompleted;

      if (isOpen) entry.open += 1;
      if (isOverdue) entry.overdue += 1;

      // last 30 days overdue trend
      if (
        due &&
        isWithinRange(due, last30DaysRange.start, last30DaysRange.end)
      ) {
        entry.overdueTotalLast30 += 1;
        if (isOverdue) entry.overdueLast30 += 1;
      }

      if (isOpen) {
        const taskEffort =
          typeof t.estimated_hours === 'number' &&
          !Number.isNaN(t.estimated_hours)
            ? t.estimated_hours
            : DEFAULT_TASK_HOURS;

        entry.thisWeekHours += addHoursToRange(thisWeekRange, t, taskEffort);
        entry.nextWeekHours += addHoursToRange(nextWeekRange, t, taskEffort);
      }
    });

    const arr = Array.from(map.values()).map((e) => {
      const capacityWeekHours = (e.dailyCapacity || HOURS_PER_DAY) * 5;

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
        projectCount: e.projectIds.size,
        loadRatio,
        utilThisWeek,
        utilNextWeek,
        overdueRateLast30,
      };
    });

    arr.sort((a, b) => b.open - a.open);
    return arr;
  }, [
    tasks,
    presalesResources,
    thisWeekRange,
    nextWeekRange,
    last30DaysRange,
    today,
  ]);

  // ---------- TASK MIX ----------
  const taskMix = useMemo(() => {
    if (!tasks || tasks.length === 0) return null;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);

    const map = new Map();
    let total = 0;

    tasks.forEach((t) => {
      const endDate = t.end_date ? new Date(t.end_date) : null;
      const startDate = t.start_date ? new Date(t.start_date) : null;
      const dueDate = t.due_date ? new Date(t.due_date) : null;

      const date = endDate || startDate || dueDate;
      if (!date || date < cutoff) return;

      const type = (t.task_type || 'Others').trim() || 'Others';
      total += 1;

      if (!map.has(type)) {
        map.set(type, { type, count: 0 });
      }
      map.get(type).count += 1;
    });

    if (total === 0) return { total: 0, rows: [] };

    const result = Array.from(map.values()).map((row) => ({
      ...row,
      percent: total > 0 ? ((row.count / total) * 100).toFixed(1) : '0.0',
    }));

    result.sort((a, b) => b.count - a.count);

    return { total, rows: result };
  }, [tasks]);

  // ---------- Assignment helper ----------
  const assignmentSuggestions = useMemo(() => {
    if (!assignStart || !assignEnd || !presalesResources) return [];

    const start = parseDate(assignStart);
    const end = parseDate(assignEnd);
    if (!start || !end || end.getTime() < start.getTime()) return [];

    const days = [];
    const cur = new Date(start);
    while (cur.getTime() <= end.getTime()) {
      days.push(toMidnight(cur));
      cur.setDate(cur.getDate() + 1);
    }

    return (presalesResources || [])
      .map((res) => {
        const name = res.name || res.email || 'Unknown';

        let freeDays = 0;
        days.forEach((d) => {
          const hasTask = (tasks || []).some(
            (t) => t.assignee === name && !isCompletedStatus(t.status) && isTaskOnDay(t, d)
          );
          const hasSchedule = (scheduleEvents || []).some(
            (s) =>
              s.assignee === name && isWithinRange(d, s.start_date, s.end_date)
          );

          if (!hasTask && !hasSchedule) freeDays += 1;
        });

        const work = workloadByAssignee.find((w) => w.assignee === name);
        const nextLoad = work ? work.utilNextWeek : 0;

        return {
          assignee: name,
          freeDays,
          nextWeekLoad: nextLoad,
        };
      })
      .filter((s) => s.freeDays > 0)
      .sort((a, b) => {
        if (b.freeDays !== a.freeDays) return b.freeDays - a.freeDays;
        return a.nextWeekLoad - b.nextWeekLoad;
      });
  }, [
    assignStart,
    assignEnd,
    presalesResources,
    tasks,
    scheduleEvents,
    workloadByAssignee,
  ]);

  // ---------- Availability heatmap ----------
  const availabilityGrid = useMemo(() => {
    if (!presalesResources || presalesResources.length === 0)
      return { days: [], rows: [] };

    const totalDays = calendarView === '14' ? 14 : 30;
    const base = toMidnight(new Date());
    const days = [];
    for (let i = 0; i < totalDays; i += 1) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      days.push(d);
    }

    const getCapacityFor = (name) => {
      const res =
        (presalesResources || []).find((p) => {
          const n = p.name || p.email || 'Unknown';
          return n === name;
        }) || {};

      const dailyCapacity =
        typeof res.daily_capacity_hours === 'number' &&
        !Number.isNaN(res.daily_capacity_hours)
          ? res.daily_capacity_hours
          : HOURS_PER_DAY;

      const maxTasksPerDay =
        Number.isInteger(res.max_tasks_per_day) && res.max_tasks_per_day > 0
          ? res.max_tasks_per_day
          : 3;

      return { dailyCapacity, maxTasksPerDay };
    };

    const rows = (presalesResources || []).map((res) => {
      const name = res.name || res.email || 'Unknown';
      const { dailyCapacity, maxTasksPerDay } = getCapacityFor(name);

      const cells = days.map((d) => {
        const dayTasks = (tasks || []).filter(
          (t) =>
            t.assignee === name &&
            !isCompletedStatus(t.status) &&
            isTaskOnDay(t, d)
        );

        const daySchedules = (scheduleEvents || []).filter(
          (s) =>
            s.assignee === name && isWithinRange(d, s.start_date, s.end_date)
        );

        let status = 'free';
        let label = 'Free';

        const taskCount = dayTasks.length;

        const totalHours = dayTasks.reduce((sum, t) => {
          const h =
            typeof t.estimated_hours === 'number' &&
            !Number.isNaN(t.estimated_hours)
              ? t.estimated_hours
              : DEFAULT_TASK_HOURS;
          return sum + h;
        }, 0);

        const utilization = dailyCapacity
          ? Math.round((totalHours / dailyCapacity) * 100)
          : 0;

        if (daySchedules.length > 0) {
          const hasTravel = daySchedules.some(
            (s) => (s.type || '').toLowerCase() === 'travel'
          );
          const hasLeave = daySchedules.some(
            (s) => (s.type || '').toLowerCase() === 'leave'
          );

          if (hasLeave) {
            status = 'leave';
            label = 'On leave';
          } else if (hasTravel) {
            status = 'travel';
            label = 'Travel';
          } else {
            status = 'busy';
            label = 'Scheduled';
          }
        }

        if (taskCount > 0) {
          if (status === 'free') status = 'busy';

          const baseLabel = `${taskCount} task${taskCount > 1 ? 's' : ''}`;
          const capText =
            dailyCapacity && totalHours
              ? ` · ${totalHours.toFixed(1)}h / ${dailyCapacity}h`
              : '';

          let prefix = '';
          if (utilization > 120 || taskCount > maxTasksPerDay) {
            prefix = 'Over capacity: ';
          } else if (utilization >= 90) {
            prefix = 'Near capacity: ';
          }

          if (status === 'leave') {
            label = `${prefix}Leave + ${baseLabel}${capText}`;
          } else if (status === 'travel') {
            label = `${prefix}Travel + ${baseLabel}${capText}`;
          } else {
            label = `${prefix}${baseLabel}${capText}`;
          }
        }

        return {
          date: d,
          status,
          label,
          tasks: dayTasks,
          schedules: daySchedules,
          taskCount,
          totalHours,
          utilization,
          dailyCapacity,
          maxTasksPerDay,
        };
      });

      return {
        assignee: name,
        cells,
      };
    });

    return { days, rows };
  }, [presalesResources, tasks, scheduleEvents, calendarView, today]);

  // ---------- Unassigned & At-Risk Tasks ----------
  const unassignedAndAtRisk = useMemo(() => {
    if (!tasks || tasks.length === 0) {
      return { unassigned: [], atRisk: [] };
    }

    const utilMap = new Map();
    workloadByAssignee.forEach((w) => {
      utilMap.set(w.assignee, w.utilNextWeek || 0);
    });

    const unassigned = [];
    const atRisk = [];

    (tasks || []).forEach((t) => {
      if (isCompletedStatus(t.status)) return;

      const due = parseDate(t.due_date);
      const priority = (t.priority || 'Normal').toLowerCase();
      const assignee = t.assignee;

      if (!assignee) unassigned.push(t);
      if (!due) return;

      const dueInNext7 =
        due.getTime() >= today.getTime() &&
        due.getTime() <= sevenDaysAhead.getTime();

      const assigneeLoad = assignee ? utilMap.get(assignee) || 0 : 0;
      const isHighPriority = priority === 'high';
      const isAssigneeOverloaded = assigneeLoad >= 90;

      if (assignee && dueInNext7 && (isHighPriority || isAssigneeOverloaded)) {
        atRisk.push(t);
      }
    });

    return { unassigned, atRisk };
  }, [tasks, workloadByAssignee, today, sevenDaysAhead]);

  // ---------- Today & This Week Focus ----------
  const focusByPresales = useMemo(() => {
    if (!tasks || tasks.length === 0) return [];

    const result = [];

    workloadByAssignee.forEach((w) => {
      const name = w.assignee;
      const personTasks = (tasks || []).filter((t) => {
        if (t.assignee !== name) return false;
        return !isCompletedStatus(t.status);
      });

      if (personTasks.length === 0) return;

      const todayTasks = personTasks.filter((t) => isTaskOnDay(t, today));

      const weekTasks = personTasks.filter((t) => {
        const due = parseDate(t.due_date);
        if (!due) return false;
        return isWithinRange(due, thisWeekRange.start, thisWeekRange.end);
      });

      const sortTasks = (list) =>
        list
          .slice()
          .sort((a, b) => {
            const ps = priorityScore(a.priority) - priorityScore(b.priority);
            if (ps !== 0) return ps;
            const da = parseDate(a.due_date) || parseDate(a.start_date) || today;
            const db = parseDate(b.due_date) || parseDate(b.start_date) || today;
            return da - db;
          });

      const todayTop = sortTasks(todayTasks).slice(0, 3);
      const weekTop = sortTasks(weekTasks).slice(0, 5);

      if (todayTop.length === 0 && weekTop.length === 0) return;

      result.push({
        assignee: name,
        todayTasks: todayTop,
        weekTasks: weekTop,
      });
    });

    return result;
  }, [tasks, workloadByAssignee, today, thisWeekRange]);

 
  // ---------- Schedule modal handlers ----------
  const openScheduleModalForCreate = () => {
    setScheduleMode('create');
    setEditingScheduleId(null);
    setScheduleAssignee('');
    setScheduleType('Leave');
    setScheduleStart('');
    setScheduleEnd('');
    setScheduleNote('');
    setScheduleMessage(null);
    setScheduleError(null);
    setShowScheduleModal(true);
  };

  const openScheduleModalForEdit = (event) => {
    setScheduleMode('edit');
    setEditingScheduleId(event.id);
    setScheduleAssignee(event.assignee || '');
    setScheduleType(event.type || 'Leave');
    setScheduleStart(event.start_date || '');
    setScheduleEnd(event.end_date || event.start_date || '');
    setScheduleNote(event.note || '');
    setScheduleMessage(null);
    setScheduleError(null);
    setShowScheduleModal(true);
  };

  const closeScheduleModal = () => {
    setShowScheduleModal(false);
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    setScheduleError(null);
    setScheduleMessage(null);

    if (!scheduleAssignee || !scheduleStart) {
      setScheduleError('Assignee and start date are required.');
      return;
    }

    const payload = {
      assignee: scheduleAssignee,
      type: scheduleType,
      start_date: scheduleStart,
      end_date: scheduleEnd || scheduleStart,
      note: scheduleNote || null,
    };

    setScheduleSaving(true);

    try {
      if (scheduleMode === 'create') {
        const { data, error: insertError } = await supabase
          .from('presales_schedule')
          .insert([payload])
          .select();

        if (insertError) {
          console.error('Error creating schedule:', insertError);
          setScheduleError('Failed to create schedule entry.');
        } else if (data && data.length > 0) {
          setScheduleEvents((prev) => [...prev, data[0]]);
          setScheduleMessage('Schedule entry created.');
          closeScheduleModal();
        }
      } else if (scheduleMode === 'edit' && editingScheduleId) {
        const { data, error: updateError } = await supabase
          .from('presales_schedule')
          .update(payload)
          .eq('id', editingScheduleId)
          .select();

        if (updateError) {
          console.error('Error updating schedule:', updateError);
          setScheduleError('Failed to update schedule entry.');
        } else if (data && data.length > 0) {
          const updated = data[0];
          setScheduleEvents((prev) =>
            prev.map((e) => (e.id === updated.id ? updated : e))
          );
          alert('Schedule entry updated.');
          closeScheduleModal();
        }
      }
    } catch (err) {
      console.error('Error saving schedule:', err);
      setScheduleError('Unexpected error while saving schedule.');
    } finally {
      setScheduleSaving(false);
    }
  };

  const handleDeleteSchedule = async (id) => {
    if (!window.confirm('Delete this schedule entry?')) return;

    try {
      const { error: deleteError } = await supabase
        .from('presales_schedule')
        .delete()
        .eq('id', id);

      if (deleteError) {
        console.error('Error deleting schedule:', deleteError);
        alert('Failed to delete schedule entry.');
      } else {
        setScheduleEvents((prev) => prev.filter((e) => e.id !== id));
      }
    } catch (err) {
      console.error('Error deleting schedule:', err);
      alert('Unexpected error while deleting schedule entry.');
    }
  };

  // ---------- Day detail modal ----------
  const openDayDetail = (assignee, date) => {
    const day = toMidnight(date);

    const dayTasks = (tasks || [])
      .filter(
        (t) =>
          t.assignee === assignee &&
          !isCompletedStatus(t.status) &&
          isTaskOnDay(t, day)
      )
      .map((t) => ({
        ...t,
        projectName: projectMap.get(t.project_id) || 'Unknown project',
      }));

    const daySchedules = (scheduleEvents || []).filter(
      (e) =>
        e.assignee === assignee &&
        isWithinRange(day, e.start_date, e.end_date)
    );

    setDayDetail({ assignee, date: day, tasks: dayTasks, schedules: daySchedules });
    setDayDetailOpen(true);
  };

  const closeDayDetail = () => {
    setDayDetailOpen(false);
  };

  // ---------- UI helpers ----------
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
          <AlertTriangle size={24} />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const formatDayDetailDate = (d) =>
    d
      ? d.toLocaleDateString('en-SG', {
          weekday: 'short',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : '';

  const formatShortDate = (d) =>
    d
      ? new Date(d).toLocaleDateString('en-SG', {
          day: '2-digit',
          month: 'short',
        })
      : '';

  // ---------- RENDER ----------
  return (
    <div className="presales-page-container">
      {/* HEADER */}
      <header className="presales-header">
        <div className="presales-header-main">
          <div>
            <h2>Presales Overview</h2>
            <p>Central view of workload, availability, and task focus.</p>
          </div>
        </div>
      </header>

      {/* 0. UPCOMING COMMITMENTS (TOP) */}
      <section className="presales-main-grid">
        <div className="presales-panel presales-panel-large">
          <div className="presales-panel-header">
            <div>
              <h3>
                <ListChecks size={20} className="panel-icon" />
                Upcoming presales commitments
              </h3>
              <p>Next 14 days. Based on due date + task type (Demo / RFP / Workshop / etc.).</p>
            </div>
          </div>

          {upcomingCommitments.length === 0 ? (
            <div className="presales-empty small">
              <p>No major commitments found in the next 14 days.</p>
            </div>
          ) : (
            <div className="commitments-list-wrapper">
              <ul className="commitments-list">
                {upcomingCommitments.map((t) => (
                  <li key={t.id} className="commitment-item">
                    <div className="commitment-main">
                      <span className="commitment-date">
                        {formatShortDate(t.due_date)}
                      </span>
                      <span className="commitment-title">
                        {t.description || 'Untitled task'}
                      </span>
                    </div>
                    <div className="commitment-meta">
                      <span className="commitment-customer">{t.customerName}</span>
                      {t.assignee ? <span> · {t.assignee}</span> : <span> · Unassigned</span>}
                      {t.task_type ? <span className="commitment-tag">{t.task_type}</span> : null}
                      {t.priority ? <span className="commitment-priority">{t.priority}</span> : null}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      {/* 1. WORKLOAD */}
      <section className="presales-main-grid">
        <div className="presales-panel presales-panel-large">
          <div className="presales-panel-header">
            <div>
              <h3>
                <Users size={20} className="panel-icon" />
                Presales workload
              </h3>
              <p>See who’s loaded, who’s free, and where the risk is.</p>
            </div>
          </div>

          {workloadByAssignee.length === 0 ? (
            <div className="presales-empty">
              <User size={28} />
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
                              {w.projectCount} project{w.projectCount !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="td-center">{w.projectCount}</td>
                      <td className="td-center">{w.total}</td>
                      <td className="td-center">{w.open}</td>
                      <td className="td-center overdue">{w.overdue}</td>
                      <td className="td-center">
                        <div>
                          <div>{Math.round(w.utilThisWeek)}%</div>
                          <div className="wl-util-label">{getUtilLabel(Math.round(w.utilThisWeek))}</div>
                        </div>
                      </td>
                      <td className="td-center">
                        <div>
                          <div>{Math.round(w.utilNextWeek)}%</div>
                          <div className="wl-util-label">{getUtilLabel(Math.round(w.utilNextWeek))}</div>
                        </div>
                      </td>
                      <td className="td-center">{Math.round(w.overdueRateLast30)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* 2. PRESALES AVAILABILITY (NEXT 14 / 30 DAYS) */}
      <section className="presales-calendar-section">
        <div className="presales-panel presales-panel-large">
          <div className="presales-panel-header presales-panel-header-row">
            <div>
              <h3>
                <CalendarDays size={20} className="panel-icon" />
                Presales availability ({calendarView === '14' ? 'next 14 days' : 'next 30 days'})
              </h3>
              <p>See who is free, busy, on leave, or travelling so you can assign tasks safely.</p>
            </div>
            <div className="calendar-header-actions">
              <div className="calendar-toggle">
                <button
                  type="button"
                  className={calendarView === '14' ? 'calendar-toggle-btn active' : 'calendar-toggle-btn'}
                  onClick={() => setCalendarView('14')}
                >
                  14 days
                </button>
              </div>
              <div className="calendar-toggle">
                <button
                  type="button"
                  className={calendarView === '30' ? 'calendar-toggle-btn active' : 'calendar-toggle-btn'}
                  onClick={() => setCalendarView('30')}
                >
                  30 days
                </button>
              </div>
              <button type="button" className="ghost-btn ghost-btn-sm" onClick={openScheduleModalForCreate}>
                <Plane size={16} />
                <span>Add leave / travel</span>
              </button>
            </div>
          </div>

          {availabilityGrid.rows.length === 0 ? (
            <div className="presales-empty">
              <CalendarDays size={28} />
              <p>No presales resources found.</p>
            </div>
          ) : (
            <div className="heatmap-wrapper">
              <div className="heatmap-legend">
                <span className="legend-item"><span className="legend-dot status-free" />Free</span>
                <span className="legend-item"><span className="legend-dot status-busy" />Busy</span>
                <span className="legend-item"><span className="legend-dot status-leave" />Leave</span>
                <span className="legend-item"><span className="legend-dot status-travel" />Travel</span>
              </div>

              <div className="heatmap-table">
                <div className="heatmap-header-row">
                  <div className="heatmap-header-cell heatmap-name-col">Presales</div>
                  {availabilityGrid.days.map((d) => (
                    <div key={d.toISOString()} className="heatmap-header-cell heatmap-day-col">
                      {d.toLocaleDateString('en-SG', { day: '2-digit', month: 'short' })}
                    </div>
                  ))}
                </div>

                {availabilityGrid.rows.map((row) => (
                  <div key={row.assignee} className="heatmap-row">
                    <div className="heatmap-presales-cell">
                      <div className="wl-avatar">{(row.assignee || 'U').charAt(0).toUpperCase()}</div>
                      <div className="heatmap-presales-name">{row.assignee}</div>
                    </div>
                    {row.cells.map((cell) => (
                      <button
                        key={cell.date.toISOString()}
                        type="button"
                        className={`heatmap-cell status-${cell.status}`}
                        title={cell.label}
                        onClick={() => openDayDetail(row.assignee, cell.date)}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* SCHEDULE LIST */}
        <div className="presales-panel">
          <div className="presales-panel-header">
            <div>
              <h3>
                <ListChecks size={18} className="panel-icon" />
                Leave / travel schedule
              </h3>
              <p>Upcoming leave, travel, training and other blocks.</p>
            </div>
          </div>

          {scheduleEvents.length === 0 ? (
            <div className="presales-empty">
              <Plane size={24} />
              <p>No schedule entries yet.</p>
            </div>
          ) : (
            <div className="schedule-list-wrapper schedule-list-table-wrapper">
              <div className="schedule-list-header">
                <h4>All schedule entries</h4>
                <p>Sorted by start date across all presales.</p>
              </div>
              <table className="schedule-list-table">
                <thead>
                  <tr>
                    <th>Presales</th>
                    <th>Type</th>
                    <th>Dates</th>
                    <th>Note</th>
                    <th className="th-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {scheduleEvents
                    .slice()
                    .sort((a, b) => {
                      const as = parseDate(a.start_date) || today;
                      const bs = parseDate(b.start_date) || today;
                      return as - bs;
                    })
                    .map((e) => (
                      <tr key={e.id}>
                        <td>
                          <div className="wl-name-cell">
                            <div className="wl-avatar">{(e.assignee || 'U').charAt(0).toUpperCase()}</div>
                            <div className="wl-name-text">
                              <span className="wl-name-main">{e.assignee}</span>
                            </div>
                          </div>
                        </td>
                        <td><span className="schedule-type-chip">{e.type}</span></td>
                        <td>
                          {formatShortDate(e.start_date)}
                          {e.end_date && e.end_date !== e.start_date ? ` – ${formatShortDate(e.end_date)}` : ''}
                        </td>
                        <td className="schedule-note-cell">{e.note}</td>
                        <td className="td-center">
                          <button type="button" className="icon-btn" onClick={() => openScheduleModalForEdit(e)}>
                            <Edit3 size={16} />
                          </button>
                          <button type="button" className="icon-btn icon-btn-danger" onClick={() => handleDeleteSchedule(e.id)}>
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* 3. UNASSIGNED & AT-RISK TASKS */}
      <section className="presales-crunch-section">
        <div className="presales-panel presales-panel-large">
          <div className="presales-panel-header">
            <div>
              <h3>
                <AlertTriangle size={18} className="panel-icon" />
                Unassigned & at-risk tasks
              </h3>
              <p>Tasks that need attention before they become a problem.</p>
            </div>
          </div>

          {unassignedAndAtRisk.unassigned.length === 0 &&
          unassignedAndAtRisk.atRisk.length === 0 ? (
            <div className="presales-empty small">
              <p>No unassigned or at-risk tasks detected right now.</p>
            </div>
          ) : (
            <div className="unassigned-at-risk-grid">
              <div className="unassigned-column unassigned-tasks-panel">
                <h3>Unassigned tasks</h3>
                {unassignedAndAtRisk.unassigned.length === 0 ? (
                  <p className="small-muted">No unassigned tasks.</p>
                ) : (
                  <div className="assignment-table-wrapper unassigned-tasks-table-wrapper">
                    <table className="assignment-table unassigned-tasks-table">
                      <thead>
                        <tr>
                          <th>Task</th>
                          <th>Project</th>
                          <th>Due</th>
                          <th>Priority</th>
                        </tr>
                      </thead>
                      <tbody>
                        {unassignedAndAtRisk.unassigned.slice(0, 10).map((t) => (
                          <tr key={t.id}>
                            <td>{t.description || 'Untitled task'}</td>
                            <td>{projectMap.get(t.project_id) || 'Unknown project'}</td>
                            <td>{formatShortDate(t.due_date)}</td>
                            <td>{t.priority || 'Normal'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="unassigned-column atrisk-tasks-panel">
                <h3>At-risk tasks (next 7 days)</h3>
                {unassignedAndAtRisk.atRisk.length === 0 ? (
                  <p className="small-muted">No high-priority or overloaded tasks in the next 7 days.</p>
                ) : (
                  <div className="assignment-table-wrapper atrisk-tasks-table-wrapper">
                    <table className="assignment-table atrisk-tasks-table">
                      <thead>
                        <tr>
                          <th>Task</th>
                          <th>Assignee</th>
                          <th>Due</th>
                          <th>Priority</th>
                        </tr>
                      </thead>
                      <tbody>
                        {unassignedAndAtRisk.atRisk.slice(0, 10).map((t) => (
                          <tr key={t.id}>
                            <td>{t.description || 'Untitled task'}</td>
                            <td>{t.assignee || 'Unassigned'}</td>
                            <td>{formatShortDate(t.due_date)}</td>
                            <td>{t.priority || 'Normal'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 4. TODAY & THIS WEEK FOCUS */}
      <section className="presales-crunch-section">
        <div className="presales-panel presales-panel-large">
          <div className="presales-panel-header">
            <div>
              <h3>
                <CalendarDays size={18} className="panel-icon" />
                Today & this week focus
              </h3>
              <p>Top tasks each presales should focus on.</p>
            </div>
          </div>

          {focusByPresales.length === 0 ? (
            <div className="presales-empty small">
              <p>No focus tasks found for today or this week.</p>
            </div>
          ) : (
            <div className="focus-list">
              {focusByPresales.map((f) => (
                <div key={f.assignee} className="focus-item">
                  <div className="focus-header">
                    <div className="wl-avatar">{(f.assignee || 'U').charAt(0).toUpperCase()}</div>
                    <div className="wl-name-text">
                      <span className="wl-name-main">{f.assignee}</span>
                    </div>
                  </div>
                  <div className="focus-columns">
                    <div className="focus-column">
                      <h4>Today</h4>
                      {f.todayTasks.length === 0 ? (
                        <p className="small-muted">No specific tasks for today.</p>
                      ) : (
                        <ul className="focus-task-list">
                          {f.todayTasks.map((t) => (
                            <li key={t.id}>
                              <div className="focus-task-main">
                                <span className="focus-task-title">{t.description || 'Untitled task'}</span>
                              </div>
                              <div className="focus-task-meta">
                                <span>{projectMap.get(t.project_id) || 'Unknown project'}</span>
                                {t.priority && <span className="focus-priority">{t.priority}</span>}
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="focus-column">
                      <h4>This week</h4>
                      {f.weekTasks.length === 0 ? (
                        <p className="small-muted">No priority tasks tagged for this week.</p>
                      ) : (
                        <ul className="focus-task-list">
                          {f.weekTasks.map((t) => (
                            <li key={t.id}>
                              <div className="focus-task-main">
                                <span className="focus-task-title">{t.description || 'Untitled task'}</span>
                              </div>
                              <div className="focus-task-meta">
                                <span>{projectMap.get(t.project_id) || 'Unknown project'}</span>
                                <span>Due: {formatShortDate(t.due_date) || 'n/a'}</span>
                                {t.priority && <span className="focus-priority">{t.priority}</span>}
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 5. HIGH-VALUE / CRITICAL DEALS COVERAGE */}
      <section className="presales-crunch-section">
        <div className="presales-panel presales-panel-large">
          <div className="presales-panel-header">
            <div>
              <h3>
                <Activity size={18} className="panel-icon" />
                High-value / critical deals coverage
              </h3>
              <p>Check if big or critical deals have enough presales focus.</p>
            </div>
          </div>

          {highValueDealsCoverage.length === 0 ? (
            <div className="presales-empty small">
              <p>No high-value or critical-stage deals found.</p>
            </div>
          ) : (
            <div className="taskmix-table-wrapper">
              <table className="taskmix-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Stage</th>
                    <th className="th-center">Open tasks</th>
                    <th className="th-center">Presales on it</th>
                    <th className="th-center">Deal value</th>
                  </tr>
                </thead>
                <tbody>
                  {highValueDealsCoverage.slice(0, 12).map((d) => (
                    <tr key={d.projectId}>
                      <td>{d.customerName}</td>
                      <td>{d.stage || 'N/A'}</td>
                      <td className="td-center">{d.openTasksCount}</td>
                      <td className="td-center">{d.assigneeCount}</td>
                      <td className="td-center">
                        {Number.isFinite(d.dealValue)
                          ? d.dealValue.toLocaleString('en-US', { maximumFractionDigits: 0 })
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="taskmix-footer">
                <span>
                  Showing top <strong>{Math.min(12, highValueDealsCoverage.length)}</strong> high-value / critical deals.
                </span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 6. ASSIGNMENT HELPER */}
      <section className="presales-assignment-section">
        <div className="presales-panel presales-panel-large">
          <div className="presales-panel-header">
            <div>
              <h3>
                <Filter size={18} className="panel-icon" />
                Assignment helper
              </h3>
              <p>Pick dates and see who is safest to assign.</p>
            </div>
          </div>

          <div className="assignment-content">
            <div className="assignment-filters">
              <div className="assignment-field">
                <label>Task window</label>
                <div className="assignment-dates">
                  <input type="date" value={assignStart} onChange={(e) => setAssignStart(e.target.value)} />
                  <span className="assignment-dash">to</span>
                  <input type="date" value={assignEnd} onChange={(e) => setAssignEnd(e.target.value)} />
                </div>
              </div>

              <div className="assignment-field">
                <label>Priority</label>
                <select value={assignPriority} onChange={(e) => setAssignPriority(e.target.value)}>
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
                            <div className="wl-avatar">{(sug.assignee || 'U').charAt(0).toUpperCase()}</div>
                            <div className="wl-name-text">
                              <span className="wl-name-main">{sug.assignee}</span>
                            </div>
                          </div>
                        </td>
                        <td className="td-center">{sug.freeDays}</td>
                        <td className="td-center">{Math.round(sug.nextWeekLoad)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 7. TASK MIX – bottom */}
      <section className="presales-taskmix-section">
        <div className="presales-panel presales-panel-large">
          <div className="presales-panel-header">
            <div>
              <h3>
                <Activity size={18} className="panel-icon" />
                Task mix (last 30 days)
              </h3>
              <p>Where the team is spending time based on task types.</p>
            </div>
          </div>

          {!taskMix || taskMix.rows.length === 0 ? (
            <div className="presales-empty small">
              <p>No recent tasks found in the last 30 days.</p>
            </div>
          ) : (
            <div className="taskmix-table-wrapper">
              <table className="taskmix-table">
                <thead>
                  <tr>
                    <th>Task type</th>
                    <th className="th-center">Count</th>
                    <th className="th-center">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {taskMix.rows.map((row) => (
                    <tr key={row.type}>
                      <td>{row.type}</td>
                      <td className="td-center">{row.count}</td>
                      <td className="td-center">{row.percent}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="taskmix-footer">
                <span>
                  Total tasks counted: <strong>{taskMix.total}</strong> (last 30 days)
                </span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* SCHEDULE MODAL */}
      {showScheduleModal && (
        <div className="schedule-modal-backdrop">
          <div className="schedule-modal">
            <div className="schedule-modal-header">
              <div className="schedule-modal-title">
                <Plane />
                <div>
                  <h4>{scheduleMode === 'create' ? 'Add leave / travel' : 'Edit schedule'}</h4>
                  <p>Block days where this presales is not fully available.</p>
                </div>
              </div>
              <button type="button" className="schedule-modal-close" onClick={closeScheduleModal}>
                <X size={18} />
              </button>
            </div>

            <form className="schedule-form" onSubmit={handleScheduleSubmit}>
              <div className="schedule-form-row">
                <div className="schedule-field">
                  <label>Presales</label>
                  <select value={scheduleAssignee} onChange={(e) => setScheduleAssignee(e.target.value)}>
                    <option value="">Select presales</option>
                    {presalesResources.map((p) => (
                      <option key={p.id} value={p.name || p.email}>
                        {p.name || p.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="schedule-field">
                  <label>Type</label>
                  <select value={scheduleType} onChange={(e) => setScheduleType(e.target.value)}>
                    <option value="Leave">Leave</option>
                    <option value="Travel">Travel</option>
                    <option value="Training">Training</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="schedule-form-row">
                <div className="schedule-field">
                  <label>Start date</label>
                  <input type="date" value={scheduleStart} onChange={(e) => setScheduleStart(e.target.value)} />
                </div>
                <div className="schedule-field">
                  <label>End date</label>
                  <input type="date" value={scheduleEnd} onChange={(e) => setScheduleEnd(e.target.value)} />
                </div>
              </div>

              <div className="schedule-form-row">
                <div className="schedule-field schedule-field-full">
                  <label>Note</label>
                  <input
                    type="text"
                    value={scheduleNote}
                    onChange={(e) => setScheduleNote(e.target.value)}
                    placeholder="Optional note (e.g. client visit, internal training)"
                  />
                </div>
              </div>

              <div className="schedule-form-actions">
                <div className="schedule-message">
                  {scheduleError && <span className="schedule-message-error">{scheduleError}</span>}
                  {scheduleMessage && <span className="schedule-message-success">{scheduleMessage}</span>}
                </div>
                <div className="schedule-form-buttons">
                  <button type="button" className="ghost-btn ghost-btn-sm" onClick={closeScheduleModal} disabled={scheduleSaving}>
                    Cancel
                  </button>
                  <button type="submit" className="primary-btn" disabled={scheduleSaving}>
                    {scheduleSaving ? 'Saving…' : scheduleMode === 'create' ? 'Add schedule' : 'Update schedule'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DAY DETAIL MODAL */}
      {dayDetailOpen && (
        <div className="schedule-modal-backdrop">
          <div className="schedule-modal">
            <div className="schedule-modal-header">
              <div className="schedule-modal-title">
                <CalendarDays />
                <div>
                  <h4>Day details</h4>
                  <p>
                    {dayDetail.assignee} · {formatDayDetailDate(dayDetail.date)}
                  </p>
                </div>
              </div>
              <button type="button" className="schedule-modal-close" onClick={closeDayDetail}>
                <X size={18} />
              </button>
            </div>

            <div className="day-detail-body">
              <div className="day-detail-section">
                <h5>Tasks</h5>
                {dayDetail.tasks.length === 0 ? (
                  <p className="day-detail-empty">No tasks on this day.</p>
                ) : (
                  <ul className="day-detail-task-list">
                    {dayDetail.tasks.map((t) => (
                      <li key={t.id} className="day-detail-task-item">
                        <div className="day-detail-task-main">
                          <span className="day-detail-task-project">{t.projectName}</span>
                          <span className="day-detail-task-status">{t.status || 'Open'}</span>
                        </div>
                        {t.description && <div className="day-detail-task-desc">{t.description}</div>}
                        <div className="day-detail-task-meta">
                          <span>
                            Type: <strong>{t.task_type || 'General task'}</strong>
                          </span>
                          {t.priority && (
                            <span>
                              Priority: <strong>{t.priority}</strong>
                            </span>
                          )}
                          {t.start_date && <span>Start: {formatShortDate(t.start_date)}</span>}
                          {t.end_date && <span>End: {formatShortDate(t.end_date)}</span>}
                          {t.due_date && <span>Due: {formatShortDate(t.due_date)}</span>}
                          {t.estimated_hours && (
                            <span>
                              Est.: <strong>{t.estimated_hours}h</strong>
                            </span>
                          )}
                        </div>
                        {t.notes && <div className="day-detail-task-notes">Notes: {t.notes}</div>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="day-detail-section">
                <h5>Schedule (leave / travel / others)</h5>
                {dayDetail.schedules.length === 0 ? (
                  <p className="day-detail-empty">No schedule blocks.</p>
                ) : (
                  <ul className="day-detail-schedule-list">
                    {dayDetail.schedules.map((s) => (
                      <li key={s.id} className="day-detail-schedule-item">
                        <span className="day-detail-schedule-type">{s.type}</span>
                        <span className="day-detail-schedule-dates">
                          {formatShortDate(s.start_date)}
                          {s.end_date && s.end_date !== s.start_date ? ` – ${formatShortDate(s.end_date)}` : ''}
                        </span>
                        {s.note && <span className="day-detail-schedule-note">{s.note}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PresalesOverview;
