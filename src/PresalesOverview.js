import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabaseClient';
import {
  Users,
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
import { useNavigate } from 'react-router-dom';
import './PresalesOverview.css';
import TaskModal from './TaskModal';

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

const validateDateRange = (start, end) => {
  if (!start || !end) return '';
  const s = parseDate(start);
  const e = parseDate(end);
  if (!s || !e) return '';
  if (s.getTime() > e.getTime()) return 'Start date cannot be later than end date.';
  return '';
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

// ✅ ACTIVE PROJECT RULE:
// Use current_status first (more reliable), fallback to sales_stage.
// Treat these as NOT active: archived, inactive, closed, done, cancelled, completed.
// Everything else is active.
const isProjectActive = (project) => {
  const cs = (project?.current_status || '').toLowerCase().trim();
  const ss = (project?.sales_stage || '').toLowerCase().trim();

  const signal = cs || ss;

  if (!signal) return true;

  const inactiveKeywords = [
    'archiv',
    'inactive',
    'closed',
    'done',
    'cancel',
    'completed',
    'on-hold',
    'hold',
  ];

  return !inactiveKeywords.some((k) => signal.includes(k));
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
  if (t === 'internal') return Math.min(3, dailyCapacity);
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
  const navigate = useNavigate();

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
  const [assignDateError, setAssignDateError] = useState('');

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
  const [scheduleDateError, setScheduleDateError] = useState('');

  // Day detail modal
  const [dayDetailOpen, setDayDetailOpen] = useState(false);
  const [dayDetail, setDayDetail] = useState({ assignee: '', date: null, tasks: [], schedules: [] });

  // TaskModal
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  // ---------- Load data ----------
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [projRes, taskRes, scheduleRes, presalesRes, taskTypesRes] = await Promise.all([
          // ✅ include current_status + presales assignments
          supabase
            .from('projects')
            .select(
              'id, customer_name, project_name, sales_stage, current_status, deal_value, primary_presales, backup_presales'
            )
            .order('customer_name', { ascending: true }),

          supabase
            .from('project_tasks')
            .select(
              'id, project_id, assignee, status, due_date, start_date, end_date, estimated_hours, priority, task_type, description, notes, created_at, is_archived'
            ),

          supabase.from('presales_schedule').select('id, assignee, type, start_date, end_date, note, block_hours'),

          supabase
            .from('presales_resources')
            .select('id, name, email, region, is_active, daily_capacity_hours, target_hours, max_tasks_per_day')
            .order('name', { ascending: true }),

          supabase
            .from('task_types')
            .select('id, name, is_active, sort_order, base_hours, buffer_pct, focus_hours_per_day, review_buffer_days')
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

        const typesFromDb = taskTypesRes.data || [];
        setTaskTypes(typesFromDb.length > 0 ? typesFromDb : DEFAULT_TASK_TYPES);
      } catch (err) {
        console.error('Error loading presales overview data:', err);
        setError('Failed to load presales overview data.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const presalesResourceNames = useMemo(() => {
    return (presalesResources || [])
      .map((p) => p.name || p.email || 'Unknown')
      .filter(Boolean);
  }, [presalesResources]);

  const taskTypeNames = useMemo(() => {
    return (taskTypes || [])
      .map((t) => t?.name)
      .filter(Boolean);
  }, [taskTypes]);

  const taskTypeDefaultsMap = useMemo(() => {
    const map = {};
    (taskTypes || []).forEach((t) => {
      if (!t?.name) return;
      map[t.name] = {
        base_hours: t.base_hours ?? 4,
        buffer_pct: t.buffer_pct ?? 0.25,
        focus_hours_per_day: t.focus_hours_per_day ?? 3,
        review_buffer_days: t.review_buffer_days ?? 0,
      };
    });
    return map;
  }, [taskTypes]);

  const taskTypeMultiplierMap = useMemo(() => buildTaskTypeMultiplierMap(taskTypes), [taskTypes]);

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

  const scheduleEventsForTable = useMemo(() => {
    const t = toMidnight(new Date());
    return (scheduleEvents || []).filter((ev) => {
      const end = parseDate(ev.end_date || ev.start_date);
      if (!end) return true;
      return end.getTime() >= t.getTime();
    });
  }, [scheduleEvents]);

  // ---------- Presales Activities grouping ----------
  const ongoingUpcomingGrouped = useMemo(() => {
    const groups = { Overdue: [], 'In Progress': [], 'Not Started': [] };

    (tasks || [])
      .filter((t) => !t.is_archived) // ✅ ignore archived tasks
      .filter((t) => !isCompletedStatus(t.status))
      .forEach((t) => {
        const info =
          projectInfoMap.get(t.project_id) || { customerName: 'Unknown customer', projectName: 'Unknown project' };
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

  // ---------- TaskModal handlers ----------
  const openTaskModal = (task) => {
    setEditingTask(task || null);
    setTaskModalOpen(true);
  };

  const closeTaskModal = () => {
    setTaskModalOpen(false);
    setEditingTask(null);
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
      if (taskModalOpen && editingTask?.id === taskId) closeTaskModal();
    } catch (err) {
      console.error('Unexpected error deleting task:', err);
      alert('Unexpected error while deleting task.');
    }
  };

  // ✅ Active projects board grouped by PRIMARY presales only
  // - includes active projects EVEN IF activeTaskCount = 0
  const activeProjectsByPresales = useMemo(() => {
    // active task count per project (only non-archived + not completed)
    const activeTaskCountByProject = new Map();
    (tasks || []).forEach((t) => {
      if (t.is_archived) return;
      if (isCompletedStatus(t.status)) return;
      const pid = t.project_id;
      if (!pid) return;
      activeTaskCountByProject.set(pid, (activeTaskCountByProject.get(pid) || 0) + 1);
    });

    // group by PRIMARY presales only
    const grouped = new Map();

    const addToGroup = (presalesNameRaw, projectRow) => {
      const presalesName = (presalesNameRaw || '').trim();
      if (!presalesName) return;

      if (!grouped.has(presalesName)) grouped.set(presalesName, []);
      grouped.get(presalesName).push({
        projectId: projectRow.id,
        customerName: projectRow.customer_name || 'Unknown customer',
        projectName: projectRow.project_name || projectRow.customer_name || 'Unknown project',
        activeTaskCount: activeTaskCountByProject.get(projectRow.id) || 0,
      });
    };

    (projects || [])
      .filter((p) => isProjectActive(p))
      .forEach((p) => {
        addToGroup(p.primary_presales, p);
      });

    return Array.from(grouped.entries())
      .map(([assignee, list]) => {
        // de-dupe by projectId just in case
        const deduped = list.filter((item, idx, arr) => arr.findIndex((x) => x.projectId === item.projectId) === idx);

        return {
          assignee,
          projects: deduped.sort((a, b) => {
            if ((b.activeTaskCount || 0) !== (a.activeTaskCount || 0)) return (b.activeTaskCount || 0) - (a.activeTaskCount || 0);
            return (a.projectName || '').localeCompare(b.projectName || '');
          }),
        };
      })
      .sort((a, b) => (a.assignee || '').localeCompare(b.assignee || ''));
  }, [projects, tasks]);

  const unassignedOnly = useMemo(() => {
    const unassigned = [];
    (tasks || []).forEach((t) => {
      if (t.is_archived) return;
      if (isCompletedStatus(t.status)) return;
      if (!t.assignee) unassigned.push(t);
    });
    return unassigned;
  }, [tasks]);

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

    const pickPrimaryScheduleType = (typesLower) => {
      if (!typesLower || typesLower.length === 0) return null;
      if (typesLower.includes('leave')) return 'leave';
      if (typesLower.includes('travel')) return 'travel';
      if (typesLower.includes('training')) return 'training';
      if (typesLower.includes('internal')) return 'internal';
      return 'other';
    };

    const rows = (presalesResources || []).map((res) => {
      const name = res.name || res.email || 'Unknown';
      const { dailyCapacity, maxTasksPerDay } = getCapacityFor(name);

      const cells = days.map((d) => {
        const dayTasks = (tasks || []).filter(
          (t) =>
            !t.is_archived &&
            t.assignee === name &&
            !isCompletedStatus(t.status) &&
            isTaskOnDay(t, d)
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

        const typesLower = daySchedules.map((s) => (s.type || '').toLowerCase().trim()).filter(Boolean);
        const primaryScheduleType = pickPrimaryScheduleType(typesLower);

        let status = 'free';
        let label = 'Free';

        if (daySchedules.length > 0) {
          const fullBlocked = isFullDayBlocked(blockedHours, dailyCapacity);

          if (fullBlocked) {
            status = primaryScheduleType || 'other';
            label = `${status} (full day)`;
          } else {
            if (taskCount === 0 && primaryScheduleType) {
              status = primaryScheduleType;
              label = `${primaryScheduleType} · Blocked ${blockedHours.toFixed(
                1
              )}h · Left ${effectiveCapacity.toFixed(1)}h`;
            } else {
              status = 'busy';
              label = blockedHours > 0 ? `Scheduled · Blocked ${blockedHours.toFixed(1)}h` : 'Scheduled';
            }
          }
        }

        if (taskCount > 0) {
          if (status !== 'busy') status = 'busy';

          const baseLabel = `${taskCount} task${taskCount > 1 ? 's' : ''}`;
          const capText = ` · Tasks ${totalHours.toFixed(1)}h · Blocked ${blockedHours.toFixed(
            1
          )}h · Left ${effectiveCapacity.toFixed(1)}h`;

          let prefix = '';
          if (utilization > 120 || taskCount > maxTasksPerDay) prefix = 'Over capacity: ';
          else if (utilization >= 90) prefix = 'Near capacity: ';

          label = `${prefix}${baseLabel}${capText}`;
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
          markerType: status === 'busy' && primaryScheduleType ? primaryScheduleType : null,
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
    setScheduleDateError('');
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
    setScheduleDateError(validateDateRange(event.start_date || '', event.end_date || event.start_date || ''));
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

    const dateErr = validateDateRange(scheduleStart, scheduleEnd || scheduleStart);
    if (dateErr) {
      setScheduleDateError(dateErr);
      setScheduleError(dateErr);
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
      console.error('Error deleting schedule entry:', err);
      alert('Unexpected error while deleting schedule entry.');
    }
  };

  const openDayDetail = (assignee, date) => {
    const day = toMidnight(date);

    const dayTasks = (tasks || [])
      .filter((t) => !t.is_archived)
      .filter((t) => t.assignee === assignee && !isCompletedStatus(t.status) && isTaskOnDay(t, day))
      .map((t) => ({ ...t, projectName: projectMap.get(t.project_id) || 'Unknown project' }));

    const daySchedules = (scheduleEvents || []).filter((ev) =>
      ev.assignee === assignee && isWithinRange(day, ev.start_date, ev.end_date)
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

  // ---------- Render ----------
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

      {/* ✅ ACTIVE PROJECTS BOARD */}
      <section className="presales-crunch-section">
        <div className="presales-panel presales-panel-large">
          <div className="presales-panel-header">
            <div>
              <h3>
                <Users size={18} className="panel-icon" />
                Active projects by presales
              </h3>
              <p>Shows active projects even if they have 0 active tasks.</p>
            </div>
          </div>

          {activeProjectsByPresales.length === 0 ? (
            <div className="presales-empty small">
              <p>No active projects assigned to presales found.</p>
            </div>
          ) : (
            <div className="presales-board-wrapper">
              {activeProjectsByPresales.map((g) => (
                <div key={g.assignee} className="presales-board-column">
                  <div className="presales-board-header">
                    <div className="presales-board-header-left">
                      <span className="td-ellipsis" title={g.assignee}>
                        {g.assignee}
                      </span>

                      <span className="presales-board-meta">
                        {g.projects.length} project{g.projects.length !== 1 ? 's' : ''}
                      </span>
                    </div>

                    <span className="presales-board-count">
                      {g.projects.reduce((sum, p) => sum + (p.activeTaskCount || 0), 0)} tasks
                    </span>
                  </div>

                  <div className="presales-board-cards">
                    {g.projects.map((p) => (
                      <div key={p.projectId} className="presales-board-card">
                        <button
                          type="button"
                          className="table-link-btn project-link board-project-link"
                          onClick={() => navigate(`/projectdetails/${p.projectId}`)}
                          title="Open project details"
                        >
                          {p.projectName}
                        </button>

                        <div className="board-card-sub">
                          <span className="td-ellipsis" title={p.customerName}>
                            {p.customerName}
                          </span>
                          <span className="dot">•</span>
                          <span className="board-task-count">
                            {p.activeTaskCount} active task{p.activeTaskCount !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

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
            formatShortDate={(d) =>
              d ? new Date(d).toLocaleDateString('en-SG', { day: '2-digit', month: 'short' }) : ''
            }
            onClickTask={(t) => openTaskModal(t)}
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
              <p>Tasks without an owner. Click a task to assign it.</p>
            </div>
          </div>

          {unassignedOnly.length === 0 ? (
            <div className="presales-empty small">
              <p>No unassigned tasks detected right now.</p>
            </div>
          ) : (
            <div className="unassigned-tasks-table-wrapper">
              <table className="unassigned-tasks-table">
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
                      <td className="td-ellipsis">
                        <button
                          type="button"
                          className="unassigned-task-link"
                          onClick={() => openTaskModal(t)}
                          title="Open task"
                        >
                          {t.description || 'Untitled task'}
                        </button>
                      </td>

                      <td className="td-ellipsis">
                        {projectInfoMap.get(t.project_id)?.projectName || 'Unknown project'}
                      </td>

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

          <div className="assignment-helper">
            <div className="assignment-helper-controls">
              <div className="field">
                <label>Start date</label>
                <input
                  type="date"
                  value={assignStart}
                  onChange={(e) => {
                    setAssignStart(e.target.value);
                    setAssignDateError(validateDateRange(e.target.value, assignEnd || e.target.value));
                  }}
                />
              </div>

              <div className="field">
                <label>End date</label>
                <input
                  type="date"
                  value={assignEnd}
                  onChange={(e) => {
                    setAssignEnd(e.target.value);
                    setAssignDateError(validateDateRange(assignStart || e.target.value, e.target.value));
                  }}
                />
              </div>

              <div className="field">
                <label>Priority</label>
                <select value={assignPriority} onChange={(e) => setAssignPriority(e.target.value)}>
                  <option value="High">High</option>
                  <option value="Normal">Normal</option>
                  <option value="Low">Low</option>
                </select>
              </div>
            </div>

            {assignDateError ? <div className="form-error">{assignDateError}</div> : null}

            <div className="assignment-helper-results">
              {(() => {
                const dateErr = validateDateRange(assignStart, assignEnd || assignStart);
                if (!assignStart || !assignEnd || dateErr) {
                  return (
                    <div className="presales-empty small">
                      <p>Select a valid date range to get suggestions.</p>
                    </div>
                  );
                }

                const minFree = getPriorityMinFreeHours(assignPriority);

                const ranked = (availabilityGrid.rows || [])
                  .map((r) => {
                    const start = parseDate(assignStart);
                    const end = parseDate(assignEnd);
                    const inRangeCells = r.cells.filter(
                      (c) => c.date.getTime() >= start.getTime() && c.date.getTime() <= end.getTime()
                    );

                    const avgFree = inRangeCells.length
                      ? Math.round((inRangeCells.reduce((s, c) => s + c.effectiveCapacity - c.taskHours, 0) / inRangeCells.length) * 10) / 10
                      : 0;

                    const fullBlockedDays = inRangeCells.filter((c) => isFullDayBlocked(c.blockedHours, HOURS_PER_DAY)).length;

                    return {
                      name: r.assignee,
                      avgFree,
                      fullBlockedDays,
                      ok: avgFree >= minFree && fullBlockedDays === 0,
                    };
                  })
                  .sort((a, b) => {
                    if ((b.ok ? 1 : 0) !== (a.ok ? 1 : 0)) return (b.ok ? 1 : 0) - (a.ok ? 1 : 0);
                    return b.avgFree - a.avgFree;
                  })
                  .slice(0, 5);

                return (
                  <>
                    <div className="helper-note">
                      Suggesting people with at least <b>{minFree}h</b> average free time per day.
                    </div>

                    <div className="helper-grid">
                      {ranked.map((c) => (
                        <div key={c.name} className={`helper-card ${c.ok ? 'ok' : ''}`}>
                          <div className="helper-card-top">
                            <div className="helper-name">{c.name}</div>
                            <div className="helper-free">{c.avgFree}h free/day</div>
                          </div>
                          <div className="helper-meta">
                            <span>Full-day blocks: {c.fullBlockedDays}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      </section>

      {/* AVAILABILITY GRID */}
      <section className="presales-crunch-section">
        <div className="presales-panel presales-panel-large">
          <div className="presales-panel-header">
            <div>
              <h3>
                <CalendarDays size={18} className="panel-icon" />
                Availability overview
              </h3>
              <p>Click a cell to view tasks and schedule blocks for that day.</p>
            </div>

            <div className="panel-actions">
              <div className="field compact">
                <label>View</label>
                <select value={calendarView} onChange={(e) => setCalendarView(e.target.value)}>
                  <option value="14">Next 14 days</option>
                  <option value="30">Next 30 days</option>
                </select>
              </div>

              <button type="button" className="btn-secondary" onClick={openScheduleModalForCreate}>
                <Plane size={16} />
                Add schedule block
              </button>
            </div>
          </div>

          <div className="availability-grid-wrapper">
            <table className="availability-grid">
              <thead>
                <tr>
                  <th className="sticky-col">Presales</th>
                  {availabilityGrid.days.map((d) => (
                    <th key={d.toISOString()}>
                      {d.toLocaleDateString('en-SG', { day: '2-digit', month: 'short' })}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {availabilityGrid.rows.map((row) => (
                  <tr key={row.assignee}>
                    <td className="sticky-col">
                      <div className="assignee-cell">{row.assignee}</div>
                    </td>

                    {row.cells.map((cell) => (
                      <td
                        key={`${row.assignee}-${cell.date.toISOString()}`}
                        className={`avail-cell ${cell.status}`}
                        title={cell.label}
                        onClick={() => openDayDetail(row.assignee, cell.date)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') openDayDetail(row.assignee, cell.date);
                        }}
                      >
                        <div className="avail-dot" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* SCHEDULE TABLE */}
      <section className="presales-crunch-section">
        <div className="presales-panel presales-panel-large">
          <div className="presales-panel-header">
            <div>
              <h3>
                <Plane size={18} className="panel-icon" />
                Upcoming schedule blocks
              </h3>
              <p>Leave, travel, training, internal commitments.</p>
            </div>
          </div>

          {scheduleEventsForTable.length === 0 ? (
            <div className="presales-empty small">
              <p>No schedule blocks found.</p>
            </div>
          ) : (
            <div className="unassigned-tasks-table-wrapper">
              <table className="unassigned-tasks-table">
                <thead>
                  <tr>
                    <th>Assignee</th>
                    <th>Type</th>
                    <th>Start</th>
                    <th>End</th>
                    <th>Note</th>
                    <th />
                  </tr>
                </thead>

                <tbody>
                  {scheduleEventsForTable.map((s) => (
                    <tr key={s.id}>
                      <td>{s.assignee}</td>
                      <td>{s.type}</td>
                      <td>{s.start_date ? new Date(s.start_date).toLocaleDateString('en-SG') : '-'}</td>
                      <td>{s.end_date ? new Date(s.end_date).toLocaleDateString('en-SG') : '-'}</td>
                      <td className="td-ellipsis">{s.note || '-'}</td>
                      <td className="actions-cell">
                        <button type="button" className="icon-btn" onClick={() => openScheduleModalForEdit(s)} title="Edit">
                          <Edit3 size={16} />
                        </button>
                        <button
                          type="button"
                          className="icon-btn danger"
                          onClick={() => handleDeleteSchedule(s.id)}
                          title="Delete"
                        >
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

      {/* Task modal */}
      <TaskModal
        isOpen={taskModalOpen}
        onClose={closeTaskModal}
        editingTask={editingTask}
        presalesResources={presalesResourceNames}
        taskTypes={taskTypeNames}
        taskTypeDefaultsMap={taskTypeDefaultsMap}
        onSave={async (taskData) => {
          if (!editingTask?.id) return;

          const { data, error: updErr } = await supabase
            .from('project_tasks')
            .update(taskData)
            .eq('id', editingTask.id)
            .select();

          if (updErr) throw updErr;

          const updated = data && data[0] ? data[0] : null;
          if (updated) setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));

          closeTaskModal();
        }}
      />

      {/* Schedule modal */}
      {showScheduleModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h3>
                <Plane size={18} />
                {scheduleMode === 'create' ? 'Add schedule block' : 'Edit schedule block'}
              </h3>
              <button type="button" className="icon-btn" onClick={closeScheduleModal}>
                <X size={18} />
              </button>
            </div>

            {scheduleError ? (
              <div className="modal-error">
                <AlertTriangle size={16} />
                <span>{scheduleError}</span>
              </div>
            ) : null}

            <form className="modal-body" onSubmit={handleScheduleSubmit}>
              <div className="form-grid">
                <div className="field">
                  <label>Assignee</label>
                  <input value={scheduleAssignee} onChange={(e) => setScheduleAssignee(e.target.value)} placeholder="Name" />
                </div>

                <div className="field">
                  <label>Type</label>
                  <select value={scheduleType} onChange={(e) => setScheduleType(e.target.value)}>
                    <option value="Leave">Leave</option>
                    <option value="Travel">Travel</option>
                    <option value="Training">Training</option>
                    <option value="Internal">Internal</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="field">
                  <label>Start date</label>
                  <input
                    type="date"
                    value={scheduleStart}
                    onChange={(e) => {
                      setScheduleStart(e.target.value);
                      setScheduleDateError(validateDateRange(e.target.value, scheduleEnd || e.target.value));
                    }}
                  />
                </div>

                <div className="field">
                  <label>End date</label>
                  <input
                    type="date"
                    value={scheduleEnd}
                    onChange={(e) => {
                      setScheduleEnd(e.target.value);
                      setScheduleDateError(validateDateRange(scheduleStart || e.target.value, e.target.value));
                    }}
                  />
                </div>

                <div className="field">
                  <label>Block hours (optional)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={scheduleBlockHours}
                    onChange={(e) => setScheduleBlockHours(e.target.value)}
                  />
                </div>

                <div className="field field-wide">
                  <label>Note</label>
                  <input value={scheduleNote} onChange={(e) => setScheduleNote(e.target.value)} placeholder="Optional note..." />
                </div>
              </div>

              {scheduleDateError ? <div className="form-error">{scheduleDateError}</div> : null}

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={closeScheduleModal}>
                  Cancel
                </button>

                <button type="submit" className="btn-primary" disabled={scheduleSaving}>
                  <Save size={16} />
                  {scheduleSaving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Day detail modal */}
      {dayDetailOpen && (
        <div className="modal-backdrop">
          <div className="modal-card modal-wide">
            <div className="modal-header">
              <h3>
                <CalendarDays size={18} />
                {dayDetail.assignee} •{' '}
                {dayDetail.date
                  ? dayDetail.date.toLocaleDateString('en-SG', { day: '2-digit', month: 'short', year: 'numeric' })
                  : ''}
              </h3>
              <button type="button" className="icon-btn" onClick={() => setDayDetailOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div className="daydetail-grid">
                <div>
                  <div className="daydetail-title">Tasks</div>
                  {dayDetail.tasks.length === 0 ? (
                    <div className="presales-empty small">
                      <p>No tasks on this day.</p>
                    </div>
                  ) : (
                    <div className="daydetail-list">
                      {dayDetail.tasks.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          className="daydetail-item"
                          onClick={() => openTaskModal(t)}
                          title="Open task"
                        >
                          <div className="daydetail-item-title">{t.description || 'Untitled task'}</div>
                          <div className="daydetail-item-sub">
                            <span className="truncate">{t.projectName}</span>
                            <span className="dot">•</span>
                            <span className="truncate">{t.status || 'Open'}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <div className="daydetail-title">Schedule</div>
                  {dayDetail.schedules.length === 0 ? (
                    <div className="presales-empty small">
                      <p>No schedule blocks on this day.</p>
                    </div>
                  ) : (
                    <div className="daydetail-list">
                      {dayDetail.schedules.map((s) => (
                        <div key={s.id} className="daydetail-schedule">
                          <div className="daydetail-item-title">{(s.type || 'Scheduled').toString()}</div>
                          <div className="daydetail-item-sub">
                            <span className="truncate">{s.note || '-'}</span>
                          </div>

                          <div className="daydetail-actions">
                            <button type="button" className="icon-btn" onClick={() => openScheduleModalForEdit(s)} title="Edit">
                              <Edit3 size={16} />
                            </button>
                            <button type="button" className="icon-btn danger" onClick={() => handleDeleteSchedule(s.id)} title="Delete">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={() => setDayDetailOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PresalesOverview;
