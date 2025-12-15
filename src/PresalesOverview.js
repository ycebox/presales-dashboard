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

// These are the canonical names you want to keep consistent.
// Multipliers apply to estimated_hours to reflect “effort”.
const CANONICAL_TYPE_MULTIPLIERS = {
  'rfp / proposal': 1.6,
  'poc / integration / workshop': 1.4,
  'demo': 1.2,
  'meeting / call': 0.8,
  'admin / internal': 0.7,
  'other': 1.0,
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

// ---------- Task type multiplier (DB-driven) ----------
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

  // Always seed with canonical defaults (in case DB has the same names).
  Object.entries(CANONICAL_TYPE_MULTIPLIERS).forEach(([nameLower, mult]) => {
    map.set(nameLower, mult);
  });

  // Add DB types
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

  // 1) Prefer DB-driven exact name match
  if (typeNameLower && taskTypeMultiplierMap?.has(typeNameLower)) {
    mult = taskTypeMultiplierMap.get(typeNameLower);
  } else {
    // 2) Legacy fallback for old messy values
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

// ---------- Kanban component ----------
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

  // ---------- Presales Activities (Overdue + In Progress + Not Started) ----------
  const ongoingUpcomingActivities = useMemo(() => {
    if (!tasks || tasks.length === 0) return [];

    const rows = (tasks || [])
      .filter((t) => {
        if (isCompletedStatus(t.status)) return false;

        const due = parseDate(t.due_date);
        const isOverdue = due && due.getTime() < today.getTime();

        const statusGroup = normalizeStatusGroup(t.status);
        const isInProgress = statusGroup === 'In Progress';
        const isNotStarted = statusGroup === 'Not Started';

        return isOverdue || isInProgress || isNotStarted;
      })
      .map((t) => {
        const info = projectInfoMap.get(t.project_id) || {
          customerName: 'Unknown customer',
          projectName: 'Unknown project',
        };
        return { ...t, customerName: info.customerName, projectName: info.projectName };
      })
      .sort((a, b) => {
        const ad = parseDate(a.due_date) || parseDate(a.end_date) || parseDate(a.start_date) || today;
        const bd = parseDate(b.due_date) || parseDate(b.end_date) || parseDate(b.start_date) || today;

        const aOverdue = ad && ad.getTime() < today.getTime();
        const bOverdue = bd && bd.getTime() < today.getTime();

        if (aOverdue && !bOverdue) return -1;
        if (!aOverdue && bOverdue) return 1;

        if (ad.getTime() !== bd.getTime()) return ad - bd;
        return priorityScore(a.priority) - priorityScore(b.priority);
      });

    return rows.slice(0, 60);
  }, [tasks, projectInfoMap, today]);

  const ongoingUpcomingGrouped = useMemo(() => {
    const groups = { Overdue: [], 'In Progress': [], 'Not Started': [] };

    (ongoingUpcomingActivities || []).forEach((t) => {
      const due = parseDate(t.due_date);
      const isOverdue = due && due.getTime() < today.getTime();

      if (isOverdue) groups.Overdue.push(t);
      else {
        const g = normalizeStatusGroup(t.status);
        if (g === 'In Progress') groups['In Progress'].push(t);
        else if (g === 'Not Started') groups['Not Started'].push(t);
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
  }, [ongoingUpcomingActivities, today]);

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

  // ---------- Unassigned tasks only (KEEP ONLY THIS ONE) ----------
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

      const maxTasksPerDay = Number.isInteger(res.max_tasks_per_day) && res.max_tasks_per_day > 0 ? res.max_tasks_per_day : 3;

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

  // ---------- Day detail ----------
  const openDayDetail = (assignee, date) => {
    const day = toMidnight(date);

    const dayTasks = (tasks || [])
      .filter((t) => t.assignee === assignee && !isCompletedStatus(t.status) && isTaskOnDay(t, day))
      .map((t) => ({ ...t, projectName: projectMap.get(t.project_id) || 'Unknown project' }));

    const daySchedules = (scheduleEvents || []).filter(
      (ev) => ev.assignee === assignee && isWithinRange(day, ev.start_date, ev.end_date)
    );

    setDayDetail({ assignee, date: day, tasks: dayTasks, schedules: daySchedules });
    setDayDetailOpen(true);
  };

  // ---------- Loading / error ----------
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

  return (
    <div className="presales-page-container">
      <header className="presales-header">
        <div className="presales-header-main">
          <div>
            <h2>Presales Overview</h2>
            <p>Central view of workload, availability, and task focus.</p>
          </div>
        </div>
      </header>

      {/* PRESALES ACTIVITIES (KANBAN) */}
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
            groups={(() => {
              const groups = { Overdue: [], 'In Progress': [], 'Not Started': [] };
              (tasks || [])
                .filter((t) => !isCompletedStatus(t.status))
                .forEach((t) => {
                  const info = projectInfoMap.get(t.project_id) || {
                    customerName: 'Unknown customer',
                    projectName: 'Unknown project',
                  };
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
            })()}
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
                      <td>{t.description || 'Untitled task'}</td>
                      <td>{projectInfoMap.get(t.project_id)?.projectName || 'Unknown project'}</td>
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

      {/* NOTE:
          The rest of your sections (Assignment Helper, Workload, Availability, Schedules, Modals)
          are not included in this file version.
      */}
    </div>
  );
}

export default PresalesOverview;
