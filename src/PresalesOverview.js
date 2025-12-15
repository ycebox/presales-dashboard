import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabaseClient';
import {
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
  Save,
} from 'lucide-react';
import './PresalesOverview.css';

const HOURS_PER_DAY = 8;
const DEFAULT_TASK_HOURS = 4;

// ---- Task type fallback (if task_types table is empty/unavailable) ----
const DEFAULT_TASK_TYPES = [
  { id: 'rfp', name: 'RFP / Proposal' },
  { id: 'poc', name: 'PoC / Integration / Workshop' },
  { id: 'demo', name: 'Demo' },
  { id: 'meeting', name: 'Meeting / Call' },
  { id: 'admin', name: 'Admin / Internal' },
  { id: 'other', name: 'Other' },
];

// Multipliers apply to estimated_hours to reflect “effort”
const CANONICAL_TYPE_MULTIPLIERS = {
  'rfp / proposal': 1.6,
  'poc / integration / workshop': 1.4,
  demo: 1.2,
  'meeting / call': 0.8,
  'admin / internal': 0.7,
  other: 1.0,
};

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

  const start = parseDate(task.start_date) || parseDate(task.due_date) || parseDate(task.end_date);
  const end = parseDate(task.end_date) || parseDate(task.due_date) || parseDate(task.start_date);

  if (!start && !end) return false;

  const s = start || end;
  const e = end || start;

  return d.getTime() >= s.getTime() && d.getTime() <= e.getTime();
};

const getWeekRanges = () => {
  const today = toMidnight(new Date());

  const thisWeekStart = new Date(today);
  const day = thisWeekStart.getDay(); // 0=Sun
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

const isCompletedStatus = (status) => {
  const s = (status || '').toLowerCase();
  return s === 'completed' || s === 'done' || s === 'closed';
};

const normalizeStatusGroup = (status) => {
  const s = (status || '').toLowerCase().trim();
  if (s.includes('progress')) return 'In Progress';
  if (s.includes('not started') || s === 'open' || s === 'new') return 'Not Started';
  return 'Other';
};

// ---------- Task type multiplier ----------
const legacyKeywordMultiplier = (taskType) => {
  const s = (taskType || '').toLowerCase().trim();
  if (!s) return 1.0;

  if (s.includes('rfp') || s.includes('rfi') || s.includes('proposal') || s.includes('tender')) return 1.6;
  if (s.includes('poc') || s.includes('integration') || s.includes('workshop') || s.includes('discovery')) return 1.4;
  if (s.includes('demo')) return 1.2;
  if (s.includes('meeting') || s.includes('call') || s.includes('sync')) return 0.8;
  if (s.includes('admin') || s.includes('internal')) return 0.7;

  return 1.0;
};

const buildTaskTypeMultiplierMap = (taskTypes) => {
  const map = new Map();

  Object.entries(CANONICAL_TYPE_MULTIPLIERS).forEach(([nameLower, mult]) => {
    map.set(nameLower, mult);
  });

  (taskTypes || []).forEach((t) => {
    const key = (t?.name || '').toLowerCase().trim();
    if (!key) return;

    if (CANONICAL_TYPE_MULTIPLIERS[key] !== undefined) {
      map.set(key, CANONICAL_TYPE_MULTIPLIERS[key]);
    } else {
      if (!map.has(key)) map.set(key, 1.0);
    }
  });

  return map;
};

const getEffectiveTaskHours = (task, taskTypeMultiplierMap) => {
  const base =
    typeof task?.estimated_hours === 'number' && !Number.isNaN(task.estimated_hours)
      ? task.estimated_hours
      : DEFAULT_TASK_HOURS;

  const typeNameLower = (task?.task_type || '').toLowerCase().trim();

  let mult = 1.0;

  if (typeNameLower && taskTypeMultiplierMap?.has(typeNameLower)) {
    mult = taskTypeMultiplierMap.get(typeNameLower);
  } else {
    mult = legacyKeywordMultiplier(task?.task_type);
  }

  const effective = Math.max(0, base * (mult ?? 1.0));
  return Math.min(effective, 80);
};

// ---------- Partial-day schedule blocking ----------
const toNumberOrNull = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
};

const getDefaultBlockHoursByType = (type, dailyCapacity) => {
  const t = (type || '').toLowerCase();
  if (t === 'leave' || t === 'travel') return dailyCapacity;
  if (t === 'training') return Math.min(6, dailyCapacity);
  return Math.min(2, dailyCapacity);
};

const getScheduleBlockHours = (event, dailyCapacity) => {
  const explicit = toNumberOrNull(event?.block_hours);
  if (explicit !== null) return Math.max(0, Math.min(explicit, dailyCapacity));
  return getDefaultBlockHoursByType(event?.type, dailyCapacity);
};

const isFullDayBlocked = (blockedHours, dailyCapacity) => {
  if (!dailyCapacity) return false;
  return blockedHours >= dailyCapacity * 0.95;
};

const getPriorityMinFreeHours = (priority) => {
  const p = (priority || '').toLowerCase();
  if (p === 'high') return 4;
  if (p === 'low') return 2;
  return 3;
};

// ---------- Kanban ----------
function ActivitiesKanban({ groups, parseDateFn, today, formatShortDate, onClickTask, onDeleteTask }) {
  const [limits, setLimits] = useState({
    Overdue: 6,
    'In Progress': 6,
    'Not Started': 6,
  });

  const columns = [
    { key: 'Not Started', title: 'Not Started' },
    { key: 'In Progress', title: 'In Progress' },
    { key: 'Overdue', title: 'Overdue' },
  ];

  const incLimit = (key) => setLimits((p) => ({ ...p, [key]: (p[key] || 6) + 6 }));
  const countLabel = (key) => groups?.[key]?.length || 0;

  return (
    <div className="activities-kanban">
      {columns.map((col) => {
        const list = groups?.[col.key] || [];
        const visible = list.slice(0, limits[col.key] || 6);
        const hasMore = list.length > visible.length;

        return (
          <div key={col.key} className={`activities-col ${col.key === 'Overdue' ? 'is-overdue' : ''}`}>
            <div className="activities-col-header">
              <div className="activities-col-title">{col.title}</div>
              <div className="activities-col-count">{countLabel(col.key)}</div>
            </div>

            {visible.length === 0 ? (
              <div className="activities-empty">No tasks</div>
            ) : (
              <div className="activities-cards">
                {visible.map((t) => {
                  const due = parseDateFn(t.due_date);
                  const isOverdue = due && due.getTime() < today.getTime();

                  return (
                    <button
                      key={t.id}
                      type="button"
                      className={`activity-card ${isOverdue ? 'is-overdue' : ''}`}
                      onClick={() => onClickTask(t)}
                      title="Click to edit"
                    >
                      <div className="activity-card-top">
                        <div className="activity-card-title">{t.description || 'Untitled task'}</div>

                        <div className="activity-card-actions">
                          <button
                            type="button"
                            className="activity-card-iconbtn danger"
                            title="Delete task"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteTask?.(t.id);
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="activity-card-sub">
                        <span className="truncate">{t.customerName || 'Unknown customer'}</span>
                        <span className="dot">•</span>
                        <span className="truncate">{t.projectName || 'Unknown project'}</span>
                      </div>

                      <div className="activity-card-meta">
                        <div className={`meta-chip ${isOverdue ? 'chip-overdue' : ''}`}>
                          Due: {formatShortDate(t.due_date) || '-'}
                        </div>
                        <div className="meta-chip">{t.assignee || 'Unassigned'}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {hasMore && (
              <button type="button" className="activities-more" onClick={() => incLimit(col.key)}>
                Show more
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PresalesOverview() {
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [scheduleEvents, setScheduleEvents] = useState([]);
  const [presalesResources, setPresalesResources] = useState([]);
  const [taskTypes, setTaskTypes] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Assignment helper
  const [assignPriority, setAssignPriority] = useState('Normal');
  const [assignStart, setAssignStart] = useState('');
  const [assignEnd, setAssignEnd] = useState('');

  // Calendar view
  const [calendarView, setCalendarView] = useState('14');

  // Schedule modal
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleAssignee, setScheduleAssignee] = useState('');
  const [scheduleType, setScheduleType] = useState('Leave');
  const [scheduleStart, setScheduleStart] = useState('');
  const [scheduleEnd, setScheduleEnd] = useState('');
  const [scheduleNote, setScheduleNote] = useState('');
  const [scheduleBlockHours, setScheduleBlockHours] = useState('');
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [scheduleError, setScheduleError] = useState(null);
  const [scheduleMode, setScheduleMode] = useState('create');
  const [editingScheduleId, setEditingScheduleId] = useState(null);

  // Day detail modal
  const [dayDetailOpen, setDayDetailOpen] = useState(false);
  const [dayDetail, setDayDetail] = useState({ assignee: '', date: null, tasks: [], schedules: [] });

  // Task edit modal
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskSaving, setTaskSaving] = useState(false);
  const [taskSaveError, setTaskSaveError] = useState(null);

  const [taskForm, setTaskForm] = useState({
    id: null,
    description: '',
    status: 'Not Started',
    assignee: '',
    start_date: '',
    end_date: '',
    due_date: '',
    estimated_hours: '',
    task_type: '',
    priority: 'Normal',
    notes: '',
    project_id: null,
  });

  // ---------- Load data ----------
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [projRes, taskRes, scheduleRes, presalesRes, taskTypesRes] = await Promise.all([
          supabase
            .from('projects')
            .select('id, customer_name, project_name, sales_stage, deal_value')
            .order('customer_name', { ascending: true }),
          supabase
            .from('project_tasks')
            .select(
              'id, project_id, assignee, status, due_date, start_date, end_date, estimated_hours, priority, task_type, description, notes, created_at'
            ),
          supabase.from('presales_schedule').select('id, assignee, type, start_date, end_date, note, block_hours'),
          supabase
            .from('presales_resources')
            .select('id, name, email, region, is_active, daily_capacity_hours, target_hours, max_tasks_per_day')
            .order('name', { ascending: true }),
          supabase
            .from('task_types')
            .select('id, name, is_active, sort_order')
            .eq('is_active', true)
            .order('sort_order', { ascending: true })
            .order('name', { ascending: true }),
        ]);

        if (projRes.error) throw projRes.error;
        if (taskRes.error) throw taskRes.error;
        if (scheduleRes.error) throw scheduleRes.error;
        if (presalesRes.error) throw presalesRes.error;
        if (taskTypesRes.error) throw taskTypesRes.error;

        setProjects(projRes.data || []);
        setTasks(taskRes.data || []);
        setScheduleEvents(scheduleRes.data || []);
        setPresalesResources((presalesRes.data || []).filter((p) => p.is_active !== false));
        setTaskTypes(taskTypesRes.data || []);
      } catch (err) {
        console.error('Error loading presales overview data:', err);
        setError('Failed to load presales overview data.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // ---------- DB-driven multiplier map ----------
  const taskTypeMultiplierMap = useMemo(() => buildTaskTypeMultiplierMap(taskTypes), [taskTypes]);

  // ---------- Base maps ----------
  const projectInfoMap = useMemo(() => {
    const map = new Map();
    (projects || []).forEach((p) => {
      map.set(p.id, {
        customerName: p.customer_name || 'Unknown customer',
        projectName: p.project_name || p.customer_name || 'Unknown project',
      });
    });
    return map;
  }, [projects]);

  const projectMap = useMemo(() => {
    const map = new Map();
    (projects || []).forEach((p) => {
      map.set(p.id, p.project_name || p.customer_name || 'Unknown project');
    });
    return map;
  }, [projects]);

  const { thisWeek, nextWeek, last30 } = useMemo(() => getWeekRanges(), []);
  const today = useMemo(() => toMidnight(new Date()), []);
  const thisWeekRange = thisWeek;
  const nextWeekRange = nextWeek;
  const last30DaysRange = last30;

  const formatShortDate = (d) =>
    d ? new Date(d).toLocaleDateString('en-SG', { day: '2-digit', month: 'short' }) : '';

  const formatDayDetailDate = (d) =>
    d ? d.toLocaleDateString('en-SG', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }) : '';

  // ---- Task type dropdown options (DB-driven + fallback + legacy support) ----
  const taskTypeOptions = useMemo(() => {
    const base =
      (taskTypes || []).length > 0
        ? (taskTypes || []).map((t) => ({ id: t.id, name: t.name }))
        : DEFAULT_TASK_TYPES;

    const current = (taskForm?.task_type || '').trim();
    if (current && !base.some((x) => (x.name || '').toLowerCase() === current.toLowerCase())) {
      return [{ id: 'legacy', name: current }, ...base];
    }
    return base;
  }, [taskTypes, taskForm?.task_type]);

  // ---------- Presales Activities grouping ----------
  const ongoingUpcomingGrouped = useMemo(() => {
    const groups = { Overdue: [], 'In Progress': [], 'Not Started': [] };

    (tasks || [])
      .filter((t) => !isCompletedStatus(t.status))
      .forEach((t) => {
        const info = projectInfoMap.get(t.project_id) || { customerName: 'Unknown customer', projectName: 'Unknown project' };
        const row = { ...t, customerName: info.customerName, projectName: info.projectName };

        const due = parseDate(row.due_date);
        const isOverdue = due && due.getTime() < today.getTime();

        if (isOverdue) groups.Overdue.push(row);
        else {
          const g = normalizeStatusGroup(row.status);
          if (g === 'In Progress') groups['In Progress'].push(row);
          else if (g === 'Not Started') groups['Not Started'].push(row);
        }
      });

    Object.keys(groups).forEach((k) => {
      groups[k].sort((a, b) => {
        const ad = parseDate(a.due_date) || parseDate(a.end_date) || parseDate(a.start_date) || today;
        const bd = parseDate(b.due_date) || parseDate(b.end_date) || parseDate(b.start_date) || today;
        if (ad.getTime() !== bd.getTime()) return ad - bd;
        return priorityScore(a.priority) - priorityScore(b.priority);
      });
    });

    return groups;
  }, [tasks, projectInfoMap, today]);

  // ---------- Task modal ----------
  const openTaskModal = (task) => {
    setTaskSaveError(null);
    setTaskForm({
      id: task.id,
      project_id: task.project_id || null,
      description: task.description || '',
      status: task.status || 'Not Started',
      assignee: task.assignee || '',
      start_date: task.start_date || '',
      end_date: task.end_date || '',
      due_date: task.due_date || '',
      estimated_hours:
        typeof task.estimated_hours === 'number' && !Number.isNaN(task.estimated_hours)
          ? String(task.estimated_hours)
          : task.estimated_hours
          ? String(task.estimated_hours)
          : '',
      task_type: task.task_type || '',
      priority: task.priority || 'Normal',
      notes: task.notes || '',
    });
    setTaskModalOpen(true);
  };

  const closeTaskModal = () => {
    setTaskModalOpen(false);
    setTaskSaveError(null);
  };

  const saveTaskEdits = async () => {
    if (!taskForm?.id) return;
    setTaskSaving(true);
    setTaskSaveError(null);

    const payload = {
      description: taskForm.description || null,
      status: taskForm.status || null,
      assignee: taskForm.assignee || null,
      start_date: taskForm.start_date || null,
      end_date: taskForm.end_date || null,
      due_date: taskForm.due_date || null,
      estimated_hours: taskForm.estimated_hours === '' ? null : Number(taskForm.estimated_hours),
      task_type: taskForm.task_type || null,
      priority: taskForm.priority || null,
      notes: taskForm.notes || null,
    };

    try {
      const { data, error: updErr } = await supabase
        .from('project_tasks')
        .update(payload)
        .eq('id', taskForm.id)
        .select();

      if (updErr) {
        console.error('Error updating task:', updErr);
        setTaskSaveError('Failed to save task changes.');
        return;
      }

      const updated = data && data[0] ? data[0] : null;
      if (updated) setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      closeTaskModal();
    } catch (err) {
      console.error('Unexpected error updating task:', err);
      setTaskSaveError('Unexpected error while saving.');
    } finally {
      setTaskSaving(false);
    }
  };

  const deleteTask = async (taskId) => {
    const ok = window.confirm('Delete this task? This cannot be undone.');
    if (!ok) return;

    try {
      const { error: delErr } = await supabase.from('project_tasks').delete().eq('id', taskId);

      if (delErr) {
        console.error('Error deleting task:', delErr);
        alert('Failed to delete task.');
        return;
      }

      setTasks((prev) => prev.filter((t) => t.id !== taskId));

      if (taskModalOpen && taskForm?.id === taskId) {
        setTaskModalOpen(false);
      }
    } catch (err) {
      console.error('Unexpected error deleting task:', err);
      alert('Unexpected error while deleting task.');
    }
  };

  // ---------- Workload by assignee ----------
  const workloadByAssignee = useMemo(() => {
    const map = new Map();

    const getCapacityFor = (name) => {
      const res = (presalesResources || []).find((p) => (p.name || p.email || 'Unknown') === name);

      const dailyCapacity =
        res && typeof res.daily_capacity_hours === 'number' && !Number.isNaN(res.daily_capacity_hours)
          ? res.daily_capacity_hours
          : HOURS_PER_DAY;

      const targetHours =
        res && typeof res.target_hours === 'number' && !Number.isNaN(res.target_hours) ? res.target_hours : 6;

      const safeMaxTasksPerDay = res && Number.isInteger(res.max_tasks_per_day) ? res.max_tasks_per_day : 3;

      return { dailyCapacity, targetHours, maxTasksPerDay: safeMaxTasksPerDay };
    };

    const addHoursToRange = (range, task, hours) => {
      if (!range?.start || !range?.end) return 0;

      const effHours = typeof hours === 'number' && !Number.isNaN(hours) ? hours : DEFAULT_TASK_HOURS;

      const taskStart = parseDate(task.start_date) || parseDate(task.due_date) || parseDate(task.end_date);
      const taskEnd = parseDate(task.end_date) || parseDate(task.due_date) || parseDate(task.start_date);

      const days = getOverlapDays(range, taskStart || task.due_date, taskEnd || task.due_date);
      if (days <= 0) return 0;
      return (effHours / days) * days;
    };

    (presalesResources || []).forEach((p) => {
      const name = p.name || p.email || 'Unknown';
      if (!map.has(name)) {
        const { dailyCapacity, targetHours, maxTasksPerDay } = getCapacityFor(name);
        map.set(name, {
          assignee: name,
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

    (tasks || []).forEach((t) => {
      const assignee = t.assignee || 'Unassigned';
      if (!map.has(assignee)) {
        const { dailyCapacity, targetHours, maxTasksPerDay } = getCapacityFor(assignee);
        map.set(assignee, {
          assignee,
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

      const due = parseDate(t.due_date);
      const isCompleted = isCompletedStatus(t.status);
      const isOpen = !isCompleted;
      const isOverdue = due && isOpen && due.getTime() < today.getTime();

      if (isOpen) entry.open += 1;
      if (isOverdue) entry.overdue += 1;

      if (due && isWithinRange(due, last30DaysRange.start, last30DaysRange.end)) {
        entry.overdueTotalLast30 += 1;
        if (isOverdue) entry.overdueLast30 += 1;
      }

      if (isOpen) {
        const taskEffort = getEffectiveTaskHours(t, taskTypeMultiplierMap);
        entry.thisWeekHours += addHoursToRange(thisWeekRange, t, taskEffort);
        entry.nextWeekHours += addHoursToRange(nextWeekRange, t, taskEffort);
      }
    });

    const arr = Array.from(map.values()).map((e) => {
      const capacityWeekHours = (e.dailyCapacity || HOURS_PER_DAY) * 5;

      const utilThisWeek = capacityWeekHours ? Math.min((e.thisWeekHours / capacityWeekHours) * 100, 999) : 0;
      const utilNextWeek = capacityWeekHours ? Math.min((e.nextWeekHours / capacityWeekHours) * 100, 999) : 0;

      const overdueRateLast30 = e.overdueTotalLast30 > 0 ? (e.overdueLast30 / e.overdueTotalLast30) * 100 : 0;

      return {
        ...e,
        utilThisWeek,
        utilNextWeek,
        overdueRateLast30,
      };
    });

    arr.sort((a, b) => b.open - a.open);
    return arr;
  }, [tasks, presalesResources, thisWeekRange, nextWeekRange, last30DaysRange, today, taskTypeMultiplierMap]);

  // ✅ Unassigned tasks only (ONE declaration only)
  const unassignedOnly = useMemo(() => {
    const unassigned = [];
    (tasks || []).forEach((t) => {
      if (isCompletedStatus(t.status)) return;
      if (!t.assignee) unassigned.push(t);
    });
    return unassigned;
  }, [tasks]);

  // ---------- Assignment helper ----------
  const assignmentSuggestions = useMemo(() => {
    if (!assignStart || !assignEnd || !presalesResources) return [];

    const start = parseDate(assignStart);
    const end = parseDate(assignEnd);
    if (!start || !end || end.getTime() < start.getTime()) return [];

    const minFreeHours = getPriorityMinFreeHours(assignPriority);

    const days = [];
    const cur = new Date(start);
    while (cur.getTime() <= end.getTime()) {
      days.push(toMidnight(cur));
      cur.setDate(cur.getDate() + 1);
    }

    const getCapacityFor = (name) => {
      const res = (presalesResources || []).find((p) => (p.name || p.email || 'Unknown') === name) || {};
      const dailyCapacity =
        typeof res.daily_capacity_hours === 'number' && !Number.isNaN(res.daily_capacity_hours)
          ? res.daily_capacity_hours
          : HOURS_PER_DAY;
      return { dailyCapacity };
    };

    return (presalesResources || [])
      .map((res) => {
        const name = res.name || res.email || 'Unknown';
        const { dailyCapacity } = getCapacityFor(name);

        let freeDays = 0;

        days.forEach((d) => {
          const daySchedules = (scheduleEvents || []).filter(
            (s) => s.assignee === name && isWithinRange(d, s.start_date, s.end_date)
          );

          const blockedHours = daySchedules.reduce((sum, s) => sum + getScheduleBlockHours(s, dailyCapacity), 0);
          const effectiveCapacity = Math.max(0, dailyCapacity - blockedHours);
          const fullyBlocked = isFullDayBlocked(blockedHours, dailyCapacity);

          if (fullyBlocked) return;

          const dayTasks = (tasks || []).filter(
            (t) => t.assignee === name && !isCompletedStatus(t.status) && isTaskOnDay(t, d)
          );
          const taskHours = dayTasks.reduce((sum, t) => sum + getEffectiveTaskHours(t, taskTypeMultiplierMap), 0);

          const remaining = effectiveCapacity - taskHours;
          if (remaining >= minFreeHours) freeDays += 1;
        });

        const work = workloadByAssignee.find((w) => w.assignee === name);
        const nextLoad = work ? work.utilNextWeek : 0;

        return { assignee: name, freeDays, nextWeekLoad: nextLoad };
      })
      .filter((s) => s.freeDays > 0)
      .sort((a, b) => {
        if (b.freeDays !== a.freeDays) return b.freeDays - a.freeDays;
        return a.nextWeekLoad - b.nextWeekLoad;
      });
  }, [
    assignStart,
    assignEnd,
    assignPriority,
    presalesResources,
    tasks,
    scheduleEvents,
    workloadByAssignee,
    taskTypeMultiplierMap,
  ]);

  // ---------- Availability grid ----------
  const availabilityGrid = useMemo(() => {
    if (!presalesResources || presalesResources.length === 0) return { days: [], rows: [] };

    const totalDays = calendarView === '14' ? 14 : 30;
    const base = toMidnight(new Date());
    const days = [];
    for (let i = 0; i < totalDays; i += 1) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      days.push(d);
    }

    const getCapacityFor = (name) => {
      const res = (presalesResources || []).find((p) => (p.name || p.email || 'Unknown') === name) || {};
      const dailyCapacity =
        typeof res.daily_capacity_hours === 'number' && !Number.isNaN(res.daily_capacity_hours)
          ? res.daily_capacity_hours
          : HOURS_PER_DAY;

      const maxTasksPerDay =
        Number.isInteger(res.max_tasks_per_day) && res.max_tasks_per_day > 0 ? res.max_tasks_per_day : 3;

      return { dailyCapacity, maxTasksPerDay };
    };

    const rows = (presalesResources || []).map((res) => {
      const name = res.name || res.email || 'Unknown';
      const { dailyCapacity, maxTasksPerDay } = getCapacityFor(name);

      const cells = days.map((d) => {
        const dayTasks = (tasks || []).filter(
          (t) => t.assignee === name && !isCompletedStatus(t.status) && isTaskOnDay(t, d)
        );

        const daySchedules = (scheduleEvents || []).filter(
          (s) => s.assignee === name && isWithinRange(d, s.start_date, s.end_date)
        );

        const taskCount = dayTasks.length;
        const totalHours = dayTasks.reduce((sum, t) => sum + getEffectiveTaskHours(t, taskTypeMultiplierMap), 0);

        const blockedHours = daySchedules.reduce((sum, s) => sum + getScheduleBlockHours(s, dailyCapacity), 0);
        const effectiveCapacity = Math.max(0, dailyCapacity - blockedHours);

        const utilization =
          effectiveCapacity > 0 ? Math.round((totalHours / effectiveCapacity) * 100) : totalHours > 0 ? 999 : 0;

        let status = 'free';
        let label = 'Free';

        if (daySchedules.length > 0) {
          const hasTravel = daySchedules.some((s) => (s.type || '').toLowerCase() === 'travel');
          const hasLeave = daySchedules.some((s) => (s.type || '').toLowerCase() === 'leave');

          if (hasLeave && isFullDayBlocked(blockedHours, dailyCapacity)) {
            status = 'leave';
            label = 'On leave';
          } else if (hasTravel && isFullDayBlocked(blockedHours, dailyCapacity)) {
            status = 'travel';
            label = 'Travel';
          } else {
            status = 'busy';
            label = blockedHours > 0 ? `Scheduled (${blockedHours.toFixed(1)}h)` : 'Scheduled';
          }
        }

        if (taskCount > 0) {
          if (status === 'free') status = 'busy';

          const baseLabel = `${taskCount} task${taskCount > 1 ? 's' : ''}`;
          const capText = ` · Tasks ${totalHours.toFixed(1)}h · Blocked ${blockedHours.toFixed(1)}h · Left ${effectiveCapacity.toFixed(1)}h`;

          let prefix = '';
          if (utilization > 120 || taskCount > maxTasksPerDay) prefix = 'Over capacity: ';
          else if (utilization >= 90) prefix = 'Near capacity: ';

          if (status === 'leave') label = `${prefix}Leave + ${baseLabel}${capText}`;
          else if (status === 'travel') label = `${prefix}Travel + ${baseLabel}${capText}`;
          else label = `${prefix}${baseLabel}${capText}`;
        } else if (blockedHours > 0 && status === 'busy') {
          label = `Scheduled · Blocked ${blockedHours.toFixed(1)}h · Left ${effectiveCapacity.toFixed(1)}h`;
        }

        return {
          date: d,
          status,
          label,
          tasks: dayTasks,
          schedules: daySchedules,
          blockedHours,
          effectiveCapacity,
          taskHours: totalHours,
        };
      });

      return { assignee: name, cells };
    });

    return { days, rows };
  }, [presalesResources, tasks, scheduleEvents, calendarView, taskTypeMultiplierMap]);

  // ---------- Schedule modal handlers ----------
  const openScheduleModalForCreate = () => {
    setScheduleMode('create');
    setEditingScheduleId(null);
    setScheduleAssignee('');
    setScheduleType('Leave');
    setScheduleStart('');
    setScheduleEnd('');
    setScheduleNote('');
    setScheduleBlockHours('');
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
    setScheduleBlockHours(event.block_hours === null || event.block_hours === undefined ? '' : String(event.block_hours));
    setScheduleError(null);
    setShowScheduleModal(true);
  };

  const closeScheduleModal = () => setShowScheduleModal(false);

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    setScheduleError(null);

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
      block_hours: toNumberOrNull(scheduleBlockHours),
    };

    setScheduleSaving(true);

    try {
      if (scheduleMode === 'create') {
        const { data, error: insertError } = await supabase.from('presales_schedule').insert([payload]).select();
        if (insertError) setScheduleError('Failed to create schedule entry.');
        else if (data?.[0]) {
          setScheduleEvents((prev) => [...prev, data[0]]);
          closeScheduleModal();
        }
      } else if (scheduleMode === 'edit' && editingScheduleId) {
        const { data, error: updateError } = await supabase
          .from('presales_schedule')
          .update(payload)
          .eq('id', editingScheduleId)
          .select();

        if (updateError) setScheduleError('Failed to update schedule entry.');
        else if (data?.[0]) {
          const updated = data[0];
          setScheduleEvents((prev) => prev.map((ev) => (ev.id === updated.id ? updated : ev)));
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
      const { error: deleteError } = await supabase.from('presales_schedule').delete().eq('id', id);
      if (deleteError) alert('Failed to delete schedule entry.');
      else setScheduleEvents((prev) => prev.filter((ev) => ev.id !== id));
    } catch (err) {
      console.error('Error deleting schedule:', err);
      alert('Unexpected error while deleting schedule entry.');
    }
  };

  // ---------- Day detail ----------
  const openDayDetail = (assignee, date) => {
    const day = toMidnight(date);

    const dayTasks = (tasks || [])
      .filter((t) => t.assignee === assignee && !isCompletedStatus(t.status) && isTaskOnDay(t, day))
      .map((t) => ({ ...t, projectName: projectMap.get(t.project_id) || 'Unknown project' }));

    const daySchedules = (scheduleEvents || []).filter((ev) => ev.assignee === assignee && isWithinRange(day, ev.start_date, ev.end_date));

    setDayDetail({ assignee, date: day, tasks: dayTasks, schedules: daySchedules });
    setDayDetailOpen(true);
  };

  // ---------- Loading / error ----------
  if (loading) {
    return (
      <div className="presales-page-container theme-light">
        <div className="presales-loading">
          <div className="presales-spinner" />
          <p>Loading presales overview…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
     <div className="presales-page-container theme-light">
        <div className="presales-error">
          <AlertTriangle size={24} />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  // ---------- Render ----------
  return (
    <div className="presales-page-container theme-light">
      <header className="presales-header">
        <div className="presales-header-main">
          <div>
            <h2>Presales Overview</h2>
            <p>Central view of workload, availability, and task focus.</p>
          </div>
        </div>
      </header>

      {/* PRESALES ACTIVITIES */}
      <section className="presales-crunch-section">
        <div className="presales-panel presales-panel-large">
          <div className="presales-panel-header">
            <div>
              <h3>
                <ListChecks size={20} className="panel-icon" />
                Presales activities
              </h3>
              <p>Overdue, In Progress, and Not Started tasks. Click a card to edit.</p>
            </div>
          </div>

          <ActivitiesKanban
            groups={ongoingUpcomingGrouped}
            parseDateFn={parseDate}
            today={today}
            formatShortDate={formatShortDate}
            onClickTask={openTaskModal}
            onDeleteTask={deleteTask}
          />
        </div>
      </section>

      {/* UNASSIGNED TASKS */}
      <section className="presales-crunch-section">
        <div className="presales-panel presales-panel-large">
          <div className="presales-panel-header">
            <div>
              <h3>
                <AlertTriangle size={18} className="panel-icon" />
                Unassigned tasks
              </h3>
              <p>Tasks that still need an owner.</p>
            </div>
          </div>

          {unassignedOnly.length === 0 ? (
            <div className="presales-empty small">
              <p>No unassigned tasks detected right now.</p>
            </div>
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
                  {unassignedOnly.slice(0, 10).map((t) => (
                    <tr key={t.id}>
                      <td className="td-ellipsis">{t.description || 'Untitled task'}</td>
                      <td className="td-ellipsis">{projectInfoMap.get(t.project_id)?.projectName || 'Unknown project'}</td>
                      <td>{(t.due_date && new Date(t.due_date).toLocaleDateString('en-SG')) || '-'}</td>
                      <td>{t.priority || 'Normal'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* ASSIGNMENT HELPER */}
      <section className="presales-crunch-section">
        <div className="presales-panel presales-panel-large">
          <div className="presales-panel-header">
            <div>
              <h3>
                <Filter size={18} className="panel-icon" />
                Assignment helper
              </h3>
              <p>Pick a date range and priority. We’ll suggest who has breathing room.</p>
            </div>
          </div>

          <div className="assignment-content">
            <div className="assignment-filters">
              <div className="assignment-field">
                <label>Priority</label>
            <select value={assignPriority} onChange={(e) => setAssignPriority(e.target.value)}>
  <option value="High">High — needs ≥ 4 free hours/day</option>
  <option value="Normal">Normal — needs ≥ 3 free hours/day</option>
  <option value="Low">Low — needs ≥ 2 free hours/day</option>
</select>
              </div>

              <div className="assignment-field">
                <label>Start date</label>
                <input type="date" value={assignStart} onChange={(e) => setAssignStart(e.target.value)} />
              </div>

              <div className="assignment-field">
                <label>End date</label>
                <input type="date" value={assignEnd} onChange={(e) => setAssignEnd(e.target.value)} />
              </div>
            </div>

            {(!assignStart || !assignEnd) ? (
              <div className="presales-empty small">
                <p>Select start + end dates to see suggestions.</p>
              </div>
            ) : assignmentSuggestions.length === 0 ? (
              <div className="presales-empty small">
                <p>No good matches in that range (based on current schedule + tasks).</p>
              </div>
            ) : (
              <div className="assignment-table-wrapper">
                <table className="assignment-table">
                  <thead>
                    <tr>
                      <th>Presales</th>
                      <th>Free days</th>
                      <th>Next week load</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignmentSuggestions.slice(0, 8).map((s) => (
                      <tr key={s.assignee}>
                        <td>{s.assignee}</td>
                        <td>{s.freeDays}</td>
                        <td>{Math.round(s.nextWeekLoad)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* WORKLOAD */}
      <section className="presales-crunch-section">
        <div className="presales-panel presales-panel-large">
          <div className="presales-panel-header">
            <div>
              <h3>
                <Users size={18} className="panel-icon" />
                Presales workload
              </h3>
              <p>Open tasks, overdue risk, and weekly utilization (based on estimated hours + task type).</p>
            </div>
          </div>

          <div className="workload-table-wrapper">
            <table className="workload-table">
              <thead>
                <tr>
                  <th>Presales</th>
                  <th>Open</th>
                  <th>Overdue</th>
                  <th>This week (hrs)</th>
                  <th>This week (%)</th>
                  <th>Next week (hrs)</th>
                  <th>Next week (%)</th>
                  <th>Overdue rate (30d)</th>
                </tr>
              </thead>
              <tbody>
                {workloadByAssignee.map((w) => (
                  <tr key={w.assignee}>
                    <td className="td-ellipsis">{w.assignee}</td>
                    <td>{w.open}</td>
                    <td className={w.overdue > 0 ? 'overdue' : ''}>{w.overdue}</td>
                    <td className="td-right">{w.thisWeekHours.toFixed(1)}</td>
                    <td>
                      {Math.round(w.utilThisWeek)}% <span style={{ opacity: 0.7 }}>({getUtilLabel(w.utilThisWeek)})</span>
                    </td>
                    <td className="td-right">{w.nextWeekHours.toFixed(1)}</td>
                    <td>
                      {Math.round(w.utilNextWeek)}% <span style={{ opacity: 0.7 }}>({getUtilLabel(w.utilNextWeek)})</span>
                    </td>
                    <td>{Math.round(w.overdueRateLast30)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* AVAILABILITY */}
      <section className="presales-crunch-section">
        <div className="presales-panel presales-panel-large">
          <div className="presales-panel-header">
            <div>
              <h3>
                <CalendarDays size={18} className="panel-icon" />
                Presales availability
              </h3>
              <p>Click a cell to see task + schedule details for that day.</p>
            </div>

            <div className="schedule-actions">
              <div className="schedule-view-toggle">
                <button
                  type="button"
                  className={calendarView === '14' ? 'active' : ''}
                  onClick={() => setCalendarView('14')}
                >
                  14 days
                </button>
                <button
                  type="button"
                  className={calendarView === '30' ? 'active' : ''}
                  onClick={() => setCalendarView('30')}
                >
                  30 days
                </button>
              </div>

              <button type="button" className="btn-secondary" onClick={openScheduleModalForCreate}>
                <Plane size={16} /> Add schedule
              </button>
            </div>
          </div>

          <div className="heatmap-table">
            <div className="heatmap-header">
              <div className="heatmap-presales-name heatmap-header-cell">Presales</div>
              {availabilityGrid.days.map((d) => (
                <div key={d.toISOString()} className="heatmap-day-col heatmap-header-cell">
                  {d.toLocaleDateString('en-SG', { day: '2-digit', month: 'short' })}
                </div>
              ))}
            </div>

            {availabilityGrid.rows.map((row) => (
              <div key={row.assignee} className="heatmap-row">
                <div className="heatmap-presales-name">{row.assignee}</div>

                {row.cells.map((cell) => (
                  <button
                    key={`${row.assignee}-${cell.date.toISOString()}`}
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
      </section>

      {/* SCHEDULE LIST */}
      <section className="presales-crunch-section">
        <div className="presales-panel presales-panel-large">
          <div className="schedule-list-header">
            <div>
              <h3>
                <Plane size={18} className="panel-icon" />
                Schedules
              </h3>
              <p>Leaves, travel, training, and other blockers (full day or partial).</p>
            </div>
          </div>

          {scheduleEvents.length === 0 ? (
            <div className="presales-empty small">
              <p>No schedule entries yet.</p>
            </div>
          ) : (
            <div className="schedule-list-table-wrapper">
              <table className="schedule-list-table">
                <thead>
                  <tr>
                    <th>Presales</th>
                    <th>Type</th>
                    <th>From</th>
                    <th>To</th>
                    <th>Block hrs</th>
                    <th>Note</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {[...scheduleEvents]
                    .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
                    .map((ev) => (
                      <tr key={ev.id}>
                        <td className="td-ellipsis">{ev.assignee}</td>
                        <td>
                          <span className="schedule-type-chip">{ev.type}</span>
                        </td>
                        <td>{ev.start_date ? new Date(ev.start_date).toLocaleDateString('en-SG') : '-'}</td>
                        <td>{ev.end_date ? new Date(ev.end_date).toLocaleDateString('en-SG') : '-'}</td>
                        <td>{ev.block_hours ?? '-'}</td>
                        <td className="td-ellipsis">{ev.note || '-'}</td>
                        <td className="td-right">
                          <button type="button" className="icon-btn" onClick={() => openScheduleModalForEdit(ev)} title="Edit">
                            <Edit3 size={14} />
                          </button>
                          <button type="button" className="icon-btn danger" onClick={() => handleDeleteSchedule(ev.id)} title="Delete">
                            <Trash2 size={14} />
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

      {/* DAY DETAIL MODAL */}
      {dayDetailOpen && (
        <div className="schedule-modal-backdrop" onMouseDown={() => setDayDetailOpen(false)}>
          <div className="schedule-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="schedule-modal-header">
              <div>
                <div className="schedule-modal-title">Day details</div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>
                  {dayDetail.assignee} • {formatDayDetailDate(dayDetail.date)}
                </div>
              </div>
              <button type="button" className="schedule-modal-close" onClick={() => setDayDetailOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="day-detail-body">
              <div className="day-detail-section">
                <h4>Schedules</h4>
                {dayDetail.schedules.length === 0 ? (
                  <div className="day-detail-empty">No schedules</div>
                ) : (
                  <div className="day-detail-list">
                    {dayDetail.schedules.map((s) => (
                      <div key={s.id} className="day-detail-task-item">
                        <div className="day-detail-task-desc">
                          {s.type} {s.note ? `• ${s.note}` : ''}
                        </div>
                        <div style={{ fontSize: 12, opacity: 0.75 }}>
                          {s.start_date ? new Date(s.start_date).toLocaleDateString('en-SG') : '-'} to{' '}
                          {s.end_date ? new Date(s.end_date).toLocaleDateString('en-SG') : '-'}
                          {s.block_hours != null ? ` • block ${s.block_hours}h` : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="day-detail-section">
                <h4>Tasks</h4>
                {dayDetail.tasks.length === 0 ? (
                  <div className="day-detail-empty">No tasks</div>
                ) : (
                  <div className="day-detail-list">
                    {dayDetail.tasks.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        className="day-detail-task-item"
                        onClick={() => {
                          setDayDetailOpen(false);
                          openTaskModal(t);
                        }}
                      >
                        <div className="day-detail-task-desc">{t.description || 'Untitled task'}</div>
                        <div style={{ fontSize: 12, opacity: 0.75 }}>
                          {t.projectName || 'Unknown project'} • Due{' '}
                          {t.due_date ? new Date(t.due_date).toLocaleDateString('en-SG') : '-'}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SCHEDULE MODAL */}
      {showScheduleModal && (
        <div className="schedule-modal-backdrop" onMouseDown={closeScheduleModal}>
          <div className="schedule-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="schedule-modal-header">
              <div className="schedule-modal-title">
                {scheduleMode === 'create' ? 'Add schedule' : 'Edit schedule'}
              </div>
              <button type="button" className="schedule-modal-close" onClick={closeScheduleModal}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleScheduleSubmit} className="schedule-form">
              {scheduleError && <div className="form-error">{scheduleError}</div>}

              <div className="schedule-field">
                <label>Assignee</label>
                <select value={scheduleAssignee} onChange={(e) => setScheduleAssignee(e.target.value)}>
                  <option value="">Select</option>
                  {presalesResources.map((p) => {
                    const name = p.name || p.email || 'Unknown';
                    return (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="schedule-field">
                <label>Type</label>
                <select value={scheduleType} onChange={(e) => setScheduleType(e.target.value)}>
                  <option value="Leave">Leave</option>
                  <option value="Travel">Travel</option>
                  <option value="Training">Training</option>
                  <option value="Internal">Internal</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="schedule-field">
                <label>Start</label>
                <input type="date" value={scheduleStart} onChange={(e) => setScheduleStart(e.target.value)} />
              </div>

              <div className="schedule-field">
                <label>End</label>
                <input type="date" value={scheduleEnd} onChange={(e) => setScheduleEnd(e.target.value)} />
              </div>

              <div className="schedule-field">
                <label>Block hours (optional)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={scheduleBlockHours}
                  onChange={(e) => setScheduleBlockHours(e.target.value)}
                  placeholder="Leave blank to use defaults"
                />
              </div>

              <div className="schedule-field-full">
                <label>Note</label>
                <input value={scheduleNote} onChange={(e) => setScheduleNote(e.target.value)} placeholder="Optional" />
              </div>

              <div className="schedule-actions">
                <button type="button" className="btn-secondary" onClick={closeScheduleModal} disabled={scheduleSaving}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={scheduleSaving}>
                  <Save size={16} /> {scheduleSaving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TASK MODAL */}
      {taskModalOpen && (
        <div className="schedule-modal-backdrop" onMouseDown={closeTaskModal}>
          <div className="schedule-modal activity-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="schedule-modal-header">
              <div className="schedule-modal-title">Edit task</div>
              <button type="button" className="schedule-modal-close" onClick={closeTaskModal}>
                <X size={18} />
              </button>
            </div>

            {taskSaveError && <div className="form-error">{taskSaveError}</div>}

            <div className="schedule-form">
              <div className="schedule-field-full">
                <label>Description</label>
                <input
                  value={taskForm.description}
                  onChange={(e) => setTaskForm((p) => ({ ...p, description: e.target.value }))}
                />
              </div>

              <div className="schedule-field">
                <label>Status</label>
                <select
                  value={taskForm.status}
                  onChange={(e) => setTaskForm((p) => ({ ...p, status: e.target.value }))}
                >
                  <option value="Not Started">Not Started</option>
                  <option value="In Progress">In Progress</option>
                  <option value="On Hold">On Hold</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div className="schedule-field">
                <label>Assignee</label>
                <select
                  value={taskForm.assignee}
                  onChange={(e) => setTaskForm((p) => ({ ...p, assignee: e.target.value }))}
                >
                  <option value="">Unassigned</option>
                  {presalesResources.map((p) => {
                    const name = p.name || p.email || 'Unknown';
                    return (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="schedule-field">
                <label>Due date</label>
                <input
                  type="date"
                  value={taskForm.due_date || ''}
                  onChange={(e) => setTaskForm((p) => ({ ...p, due_date: e.target.value }))}
                />
              </div>

              <div className="schedule-field">
                <label>Estimated hours</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={taskForm.estimated_hours}
                  onChange={(e) => setTaskForm((p) => ({ ...p, estimated_hours: e.target.value }))}
                  placeholder="e.g. 4"
                />
              </div>

              <div className="schedule-field">
                <label>Task type</label>
                <select
                  value={taskForm.task_type || ''}
                  onChange={(e) => setTaskForm((p) => ({ ...p, task_type: e.target.value }))}
                >
                  <option value="">Select</option>
                  {taskTypeOptions.map((t) => (
                    <option key={t.id} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="schedule-field">
                <label>Priority</label>
                <select
                  value={taskForm.priority}
                  onChange={(e) => setTaskForm((p) => ({ ...p, priority: e.target.value }))}
                >
                  <option value="High">High</option>
                  <option value="Normal">Normal</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              <div className="schedule-field-full">
                <label>Notes</label>
                <input
                  value={taskForm.notes || ''}
                  onChange={(e) => setTaskForm((p) => ({ ...p, notes: e.target.value }))}
                />
              </div>

              <div className="schedule-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => deleteTask(taskForm.id)}
                  disabled={taskSaving}
                >
                  <Trash2 size={16} /> Delete
                </button>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="button" className="btn-secondary" onClick={closeTaskModal} disabled={taskSaving}>
                    Cancel
                  </button>
                  <button type="button" className="btn-primary" onClick={saveTaskEdits} disabled={taskSaving}>
                    <Save size={16} /> {taskSaving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PresalesOverview;
