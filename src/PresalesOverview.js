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

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [scheduleEvents, setScheduleEvents] = useState([]);
  const [presalesResources, setPresalesResources] = useState([]);
  const [taskTypes, setTaskTypes] = useState(DEFAULT_TASK_TYPES);

  // Filters
  const [calendarView, setCalendarView] = useState('14');
  const [helperStartDate, setHelperStartDate] = useState('');
  const [helperEndDate, setHelperEndDate] = useState('');
  const [helperPriority, setHelperPriority] = useState('Normal');

  // Schedule modal state
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
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

  const today = useMemo(() => toMidnight(new Date()), []);
  const weekRanges = useMemo(() => getWeekRanges(), []);

  // Map project_id -> name info for quick lookup
  const projectMap = useMemo(() => {
    const m = new Map();
    (projects || []).forEach((p) => {
      if (!p?.id) return;
      m.set(p.id, p.project_name || p.customer_name || 'Unknown project');
    });
    return m;
  }, [projects]);

  const projectInfoMap = useMemo(() => {
    const m = new Map();
    (projects || []).forEach((p) => {
      if (!p?.id) return;
      m.set(p.id, {
        projectName: p.project_name || p.customer_name || 'Unknown project',
        customerName: p.customer_name || 'Unknown customer',
        dealValue: p.deal_value,
      });
    });
    return m;
  }, [projects]);

  // ---------- Task type multiplier map ----------
  const taskTypeMultiplierMap = useMemo(() => {
    const m = new Map();
    (taskTypes || []).forEach((t) => {
      const key = (t?.name || '').toLowerCase().trim();
      if (!key) return;

      if (CANONICAL_TYPE_MULTIPLIERS[key]) {
        m.set(key, CANONICAL_TYPE_MULTIPLIERS[key]);
      } else {
        const baseHours = typeof t.base_hours === 'number' ? t.base_hours : null;
        const multiplier = baseHours ? Math.min(Math.max(baseHours / DEFAULT_TASK_HOURS, 0.5), 2.0) : 1.0;
        m.set(key, multiplier);
      }
    });
    return m;
  }, [taskTypes]);

  // ---------- Effort estimation ----------
  const getTaskEffortHours = (task) => {
    const base =
      typeof task?.estimated_hours === 'number' && !Number.isNaN(task.estimated_hours)
        ? task.estimated_hours
        : DEFAULT_TASK_HOURS;

    const typeNameRaw = taskTypes?.find((tt) => tt.id === task?.task_type)?.name || task?.task_type || '';
    const typeNameLower = (typeNameRaw || '').toLowerCase().trim();

    let mult = 1.0;

    if (typeNameLower && taskTypeMultiplierMap?.has(typeNameLower)) {
      mult = taskTypeMultiplierMap.get(typeNameLower);
    } else {
      mult = legacyKeywordMultiplier(task?.task_type);
    }

    const effective = Math.max(0, base * (mult ?? 1.0));
    return Math.min(effective, 80);
  };

  // ---------- Group tasks for Kanban ----------
  const ongoingUpcomingGrouped = useMemo(() => {
    const grouped = { Overdue: [], 'In Progress': [], 'Not Started': [] };

    (tasks || [])
      .filter((t) => !t.is_archived)
      .filter((t) => !isCompletedStatus(t.status))
      .forEach((t) => {
        const due = parseDate(t.due_date);
        const isOverdue = due && today && due.getTime() < today.getTime();

        const statusGroup = isOverdue ? 'Overdue' : normalizeStatusGroup(t.status);
        if (statusGroup === 'In Progress') grouped['In Progress'].push(t);
        else if (statusGroup === 'Not Started') grouped['Not Started'].push(t);
        else grouped['Not Started'].push(t);
      });

    // Sort within each column: priority then due date
    Object.keys(grouped).forEach((k) => {
      grouped[k].sort((a, b) => {
        const ps = priorityScore(a.priority) - priorityScore(b.priority);
        if (ps !== 0) return ps;
        const ad = parseDate(a.due_date)?.getTime() || 0;
        const bd = parseDate(b.due_date)?.getTime() || 0;
        return ad - bd;
      });
    });

    return grouped;
  }, [tasks, today]);

  // ---------- ✅ Active projects board (PRIMARY ONLY) ----------
  const activeProjectsByPresales = useMemo(() => {
    // active task count per project
    const activeTaskCountByProject = new Map();
    (tasks || []).forEach((t) => {
      if (t.is_archived) return;
      if (isCompletedStatus(t.status)) return;
      const pid = t.project_id;
      if (!pid) return;
      activeTaskCountByProject.set(pid, (activeTaskCountByProject.get(pid) || 0) + 1);
    });

    const grouped = new Map();

    const addToGroup = (presalesNameRaw, projectRow) => {
      const presalesName = (presalesNameRaw || '').trim();
      if (!presalesName) return; // only primary presales projects

      if (!grouped.has(presalesName)) grouped.set(presalesName, []);

      const pid = projectRow?.id || null;

      grouped.get(presalesName).push({
        projectId: pid,
        customerName: projectRow.customer_name || 'Unknown customer',
        projectName: projectRow.project_name || projectRow.customer_name || 'Unknown project',
        activeTaskCount: pid ? activeTaskCountByProject.get(pid) || 0 : 0,
      });
    };

    (projects || [])
      .filter((p) => isProjectActive(p))
      .forEach((p) => {
        // ✅ only list projects under primary presales
        addToGroup(p.primary_presales, p);
      });

    return Array.from(grouped.entries())
      .map(([assignee, list]) => ({
        assignee,
        projects: list
          .filter((x, idx, arr) => {
            // de-dupe by projectId if present
            if (!x.projectId) return true;
            return arr.findIndex((y) => y.projectId === x.projectId) === idx;
          })
          .sort((a, b) => {
            if ((b.activeTaskCount || 0) !== (a.activeTaskCount || 0))
              return (b.activeTaskCount || 0) - (a.activeTaskCount || 0);
            return (a.projectName || '').localeCompare(b.projectName || '');
          }),
      }))
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

  // ---------- Availability grid (kept) ----------
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

    const formatTypeLabel = (t) => {
      if (!t) return 'Scheduled';
      if (t === 'leave') return 'Leave';
      if (t === 'travel') return 'Travel';
      if (t === 'training') return 'Training';
      if (t === 'internal') return 'Internal';
      if (t === 'other') return 'Other';
      return 'Scheduled';
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
          (ev) => ev.assignee === name && isWithinRange(d, ev.start_date, ev.end_date)
        );

        const totalTaskHours = dayTasks.reduce((sum, t) => sum + getTaskEffortHours(t), 0);

        const scheduleHours = daySchedules.reduce(
          (sum, ev) => sum + getScheduleBlockHours(ev, dailyCapacity),
          0
        );

        const usedHours = totalTaskHours + scheduleHours;
        const freeHours = Math.max(0, dailyCapacity - usedHours);

        const blockedType = pickPrimaryScheduleType(daySchedules.map((x) => (x.type || '').toLowerCase().trim()));
        const blockedLabel = blockedType ? formatTypeLabel(blockedType) : null;

        const pct = dailyCapacity > 0 ? Math.round((usedHours / dailyCapacity) * 100) : 0;
        const utilLabel = getUtilLabel(pct);

        const isBlockedFullDay = isFullDayBlocked(scheduleHours, dailyCapacity);
        const isOverTasks = dayTasks.length > maxTasksPerDay;
        const isOverCap = usedHours > dailyCapacity;

        return {
          date: d,
          tasks: dayTasks,
          schedules: daySchedules,
          totalTaskHours,
          scheduleHours,
          usedHours,
          freeHours,
          pct,
          utilLabel,
          blockedLabel,
          isBlockedFullDay,
          isOverTasks,
          isOverCap,
        };
      });

      return { name, dailyCapacity, maxTasksPerDay, cells };
    });

    return { days, rows };
  }, [presalesResources, tasks, scheduleEvents, calendarView]);

  // ---------- Assignment helper ----------
  const helperResult = useMemo(() => {
    const start = parseDate(helperStartDate);
    const end = parseDate(helperEndDate);
    if (!start || !end || start.getTime() > end.getTime()) return null;

    const priority = (helperPriority || 'Normal').toLowerCase();
    const minFree = getPriorityMinFreeHours(priority);

    const candidates = (availabilityGrid.rows || []).map((r) => {
      const inRangeCells = r.cells.filter((c) => c.date.getTime() >= start.getTime() && c.date.getTime() <= end.getTime());

      const avgFree = inRangeCells.length
        ? Math.round((inRangeCells.reduce((s, c) => s + c.freeHours, 0) / inRangeCells.length) * 10) / 10
        : 0;

      const blockedDays = inRangeCells.filter((c) => c.isBlockedFullDay).length;
      const overCapDays = inRangeCells.filter((c) => c.isOverCap).length;

      return {
        name: r.name,
        avgFree,
        blockedDays,
        overCapDays,
        ok: avgFree >= minFree && blockedDays === 0,
      };
    });

    const ranked = candidates
      .sort((a, b) => {
        if ((b.ok ? 1 : 0) !== (a.ok ? 1 : 0)) return (b.ok ? 1 : 0) - (a.ok ? 1 : 0);
        if (b.avgFree !== a.avgFree) return b.avgFree - a.avgFree;
        if (a.blockedDays !== b.blockedDays) return a.blockedDays - b.blockedDays;
        return a.overCapDays - b.overCapDays;
      })
      .slice(0, 5);

    return { ranked, minFree };
  }, [helperStartDate, helperEndDate, helperPriority, availabilityGrid.rows]);

  // ---------- Modals & actions ----------
  const openTaskModal = (task) => {
    setEditingTask(task);
    setTaskModalOpen(true);
  };

  const closeTaskModal = () => {
    setEditingTask(null);
    setTaskModalOpen(false);
  };

  const refreshTasks = async () => {
    const taskRes = await supabase
      .from('project_tasks')
      .select(
        'id, project_id, assignee, status, due_date, start_date, end_date, estimated_hours, priority, task_type, description, notes, created_at, is_archived'
      );
    if (!taskRes.error) setTasks(taskRes.data || []);
  };

  const deleteTask = async (taskId) => {
    if (!taskId) return;
    const ok = window.confirm('Delete this task?');
    if (!ok) return;
    const res = await supabase.from('project_tasks').delete().eq('id', taskId);
    if (res.error) {
      alert('Failed to delete task.');
      return;
    }
    await refreshTasks();
  };

  const openScheduleModalCreate = (assignee) => {
    setScheduleError(null);
    setScheduleMode('create');
    setEditingScheduleId(null);
    setScheduleDateError('');
    setScheduleModalOpen(true);

    // seed default inputs via DOM handled in modal section (kept)
    setTimeout(() => {
      const elAssignee = document.getElementById('schedule_assignee');
      if (elAssignee) elAssignee.value = assignee || '';
    }, 50);
  };

  const openScheduleModalEdit = (schedule) => {
    if (!schedule) return;
    setScheduleError(null);
    setScheduleMode('edit');
    setEditingScheduleId(schedule.id);
    setScheduleDateError('');
    setScheduleModalOpen(true);

    setTimeout(() => {
      const elAssignee = document.getElementById('schedule_assignee');
      const elType = document.getElementById('schedule_type');
      const elStart = document.getElementById('schedule_start');
      const elEnd = document.getElementById('schedule_end');
      const elNote = document.getElementById('schedule_note');
      const elBlock = document.getElementById('schedule_block');
      if (elAssignee) elAssignee.value = schedule.assignee || '';
      if (elType) elType.value = schedule.type || 'other';
      if (elStart) elStart.value = schedule.start_date || '';
      if (elEnd) elEnd.value = schedule.end_date || '';
      if (elNote) elNote.value = schedule.note || '';
      if (elBlock) elBlock.value = schedule.block_hours ?? '';
    }, 50);
  };

  const saveSchedule = async () => {
    setScheduleSaving(true);
    setScheduleError(null);

    try {
      const assignee = document.getElementById('schedule_assignee')?.value || '';
      const type = document.getElementById('schedule_type')?.value || 'other';
      const start = document.getElementById('schedule_start')?.value || '';
      const end = document.getElementById('schedule_end')?.value || '';
      const note = document.getElementById('schedule_note')?.value || '';
      const blockHoursRaw = document.getElementById('schedule_block')?.value || '';
      const block_hours = blockHoursRaw === '' ? null : Number(blockHoursRaw);

      const dateErr = validateDateRange(start, end || start);
      setScheduleDateError(dateErr);
      if (dateErr) {
        setScheduleSaving(false);
        return;
      }

      if (!assignee) throw new Error('Assignee is required.');
      if (!start) throw new Error('Start date is required.');

      if (scheduleMode === 'create') {
        const res = await supabase.from('presales_schedule').insert([
          {
            assignee,
            type,
            start_date: start,
            end_date: end || start,
            note,
            block_hours,
          },
        ]);
        if (res.error) throw res.error;
      } else {
        if (!editingScheduleId) throw new Error('Missing schedule id.');
        const res = await supabase
          .from('presales_schedule')
          .update({
            assignee,
            type,
            start_date: start,
            end_date: end || start,
            note,
            block_hours,
          })
          .eq('id', editingScheduleId);
        if (res.error) throw res.error;
      }

      const scheduleRes = await supabase.from('presales_schedule').select('id, assignee, type, start_date, end_date, note, block_hours');
      if (!scheduleRes.error) setScheduleEvents(scheduleRes.data || []);

      setScheduleModalOpen(false);
    } catch (err) {
      console.error(err);
      setScheduleError(err.message || 'Failed to save schedule.');
    } finally {
      setScheduleSaving(false);
    }
  };

  const deleteSchedule = async (scheduleId) => {
    if (!scheduleId) return;
    const ok = window.confirm('Delete this schedule entry?');
    if (!ok) return;

    const res = await supabase.from('presales_schedule').delete().eq('id', scheduleId);
    if (res.error) {
      alert('Failed to delete schedule.');
      return;
    }

    const scheduleRes = await supabase.from('presales_schedule').select('id, assignee, type, start_date, end_date, note, block_hours');
    if (!scheduleRes.error) setScheduleEvents(scheduleRes.data || []);
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
                      <div
                        key={p.projectId || `${p.customerName}-${p.projectName}`}
                        className="presales-board-card"
                      >
                        <button
                          type="button"
                          className="table-link-btn project-link board-project-link"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!p.projectId) return;
                            navigate(`/project/${p.projectId}`);
                          }}
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

          <div className="assignment-helper">
            <div className="assignment-helper-controls">
              <div className="field">
                <label>Start date</label>
                <input type="date" value={helperStartDate} onChange={(e) => setHelperStartDate(e.target.value)} />
              </div>

              <div className="field">
                <label>End date</label>
                <input type="date" value={helperEndDate} onChange={(e) => setHelperEndDate(e.target.value)} />
              </div>

              <div className="field">
                <label>Priority</label>
                <select value={helperPriority} onChange={(e) => setHelperPriority(e.target.value)}>
                  <option>High</option>
                  <option>Normal</option>
                  <option>Low</option>
                </select>
              </div>
            </div>

            {!helperResult ? (
              <div className="presales-empty small">
                <p>Select a valid date range to get suggestions.</p>
              </div>
            ) : (
              <div className="assignment-helper-results">
                <div className="helper-note">
                  Suggesting people with at least <b>{helperResult.minFree}h</b> average free time per day.
                </div>

                <div className="helper-grid">
                  {helperResult.ranked.map((c) => (
                    <div key={c.name} className={`helper-card ${c.ok ? 'ok' : ''}`}>
                      <div className="helper-card-top">
                        <div className="helper-name">{c.name}</div>
                        <div className="helper-free">{c.avgFree}h free/day</div>
                      </div>
                      <div className="helper-meta">
                        <span>Blocked: {c.blockedDays}</span>
                        <span>Over cap: {c.overCapDays}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CALENDAR VIEW CONTROLS + GRID (kept as-is in your original) */}
      {/* ... your remaining existing render code stays unchanged ... */}

      {/* Task modal */}
      <TaskModal
        isOpen={taskModalOpen}
        onClose={closeTaskModal}
        task={editingTask}
        refreshTasks={refreshTasks}
      />

      {/* Schedule modal (kept) */}
      {scheduleModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h3>
                <Plane size={18} />
                {scheduleMode === 'create' ? 'Add schedule block' : 'Edit schedule block'}
              </h3>
              <button type="button" className="icon-btn" onClick={() => setScheduleModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            {scheduleError ? (
              <div className="modal-error">
                <AlertTriangle size={16} />
                <span>{scheduleError}</span>
              </div>
            ) : null}

            <div className="modal-body">
              <div className="form-grid">
                <div className="field">
                  <label>Assignee</label>
                  <input id="schedule_assignee" placeholder="Name" />
                </div>

                <div className="field">
                  <label>Type</label>
                  <select id="schedule_type" defaultValue="other">
                    <option value="leave">Leave</option>
                    <option value="travel">Travel</option>
                    <option value="training">Training</option>
                    <option value="internal">Internal</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="field">
                  <label>Start date</label>
                  <input id="schedule_start" type="date" />
                </div>

                <div className="field">
                  <label>End date</label>
                  <input id="schedule_end" type="date" />
                </div>

                <div className="field">
                  <label>Block hours (optional)</label>
                  <input id="schedule_block" type="number" step="0.5" min="0" />
                </div>

                <div className="field field-wide">
                  <label>Note</label>
                  <input id="schedule_note" placeholder="Optional note..." />
                </div>
              </div>

              {scheduleDateError ? <div className="form-error">{scheduleDateError}</div> : null}
            </div>

            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={() => setScheduleModalOpen(false)}>
                Cancel
              </button>

              <button type="button" className="btn-primary" onClick={saveSchedule} disabled={scheduleSaving}>
                <Save size={16} />
                {scheduleSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Day detail modal (kept) */}
      {dayDetailOpen && (
        <div className="modal-backdrop">
          <div className="modal-card modal-wide">
            <div className="modal-header">
              <h3>
                <CalendarDays size={18} />
                {dayDetail.assignee} •{' '}
                {dayDetail.date ? dayDetail.date.toLocaleDateString('en-SG', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
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
                          <div className="daydetail-item-title">
                            {(s.type || 'Scheduled').toString()}
                          </div>
                          <div className="daydetail-item-sub">
                            <span className="truncate">{s.note || '-'}</span>
                          </div>

                          <div className="daydetail-actions">
                            <button type="button" className="icon-btn" onClick={() => openScheduleModalEdit(s)} title="Edit">
                              <Edit3 size={16} />
                            </button>
                            <button type="button" className="icon-btn danger" onClick={() => deleteSchedule(s.id)} title="Delete">
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
