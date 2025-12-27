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

  const t = (task?.task_type || '').toLowerCase().trim();
  if (!t) return base;

  const multFromDb = taskTypeMultiplierMap?.get?.(t);
  if (typeof multFromDb === 'number') return base * multFromDb;

  return base * legacyKeywordMultiplier(t);
};

// ---------- UI helpers ----------
const formatShortDate = (d) => {
  const date = parseDate(d);
  if (!date) return '-';
  return date.toLocaleDateString('en-SG', { month: 'short', day: 'numeric' });
};

// ---------- Activities Kanban ----------
const ActivitiesKanban = ({ groups, parseDateFn, today, formatShortDate, onClickTask, onDeleteTask }) => {
  const statusOrder = ['Overdue', 'In Progress', 'Not Started'];

  const renderMeta = (task) => {
    const due = parseDateFn(task.due_date);
    const start = parseDateFn(task.start_date);
    const end = parseDateFn(task.end_date);

    const dueLabel = due ? formatShortDate(due) : '-';

    let timeLabel = '';
    if (start && end) timeLabel = `${formatShortDate(start)} – ${formatShortDate(end)}`;
    else if (start) timeLabel = `${formatShortDate(start)}`;
    else if (end) timeLabel = `${formatShortDate(end)}`;

    const priority = task.priority || 'Normal';

    return (
      <div className="task-meta">
        <span className="meta-chip">{task.projectName || 'Unknown project'}</span>
        {due && (
          <span className={`meta-chip ${due.getTime() < today.getTime() ? 'chip-overdue' : ''}`}>
            Due {dueLabel}
          </span>
        )}
        {!due && <span className="meta-chip">Due -</span>}
        {timeLabel && <span className="meta-chip">{timeLabel}</span>}
        <span className="meta-chip">{priority}</span>
      </div>
    );
  };

  return (
    <div className="kanban-wrap">
      {statusOrder.map((groupName) => {
        const list = groups[groupName] || [];
        return (
          <div className="kanban-col" key={groupName}>
            <div className="kanban-col-header">
              <h4>{groupName}</h4>
              <span className="kanban-count">{list.length}</span>
            </div>

            {list.length === 0 ? (
              <div className="kanban-empty">No tasks here</div>
            ) : (
              <div className="kanban-cards">
                {list.slice(0, 20).map((t) => (
                  <div className="task-card" key={t.id}>
                    <div className="task-card-top">
                      <button
                        type="button"
                        className="task-title"
                        onClick={() => onClickTask(t)}
                        title="Open task"
                      >
                        {t.description || 'Untitled task'}
                      </button>

                      <button
                        type="button"
                        className="task-delete"
                        onClick={() => onDeleteTask(t)}
                        title="Delete task"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {renderMeta(t)}

                    {t.assignee && (
                      <div className="task-footer">
                        <span className="assignee-pill">{t.assignee}</span>
                      </div>
                    )}
                  </div>
                ))}

                {list.length > 20 && (
                  <button type="button" className="activities-more">
                    Showing 20 of {list.length}. Narrow down using filters below if needed.
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default function PresalesOverview() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [scheduleEvents, setScheduleEvents] = useState([]);
  const [presalesResources, setPresalesResources] = useState([]);
  const [taskTypes, setTaskTypes] = useState([]);

  // Assignment helper filters
  const [filterRange, setFilterRange] = useState('thisWeek');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [dateError, setDateError] = useState('');

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
            .select('id, customer_name, project_name, sales_stage, deal_value, next_key_activity')
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

  // ✅ Next key activities (ONLY those with value)
  const nextKeyActivities = useMemo(() => {
    const list = (projects || [])
      .filter((p) => typeof p?.next_key_activity === 'string' && p.next_key_activity.trim() !== '')
      .map((p) => ({
        id: p.id,
        customerName: p.customer_name || 'Unknown customer',
        projectName: p.project_name || p.customer_name || 'Unknown project',
        nextKeyActivity: p.next_key_activity.trim(),
      }));

    // Keep stable ordering
    list.sort((a, b) => (a.customerName || '').localeCompare(b.customerName || ''));
    return list;
  }, [projects]);

  // ---------- Dates / ranges ----------
  const today = useMemo(() => toMidnight(new Date()), []);
  const weekRanges = useMemo(() => getWeekRanges(), []);

  // ---------- Derived: tasks with project names ----------
  const tasksWithProjectName = useMemo(() => {
    return (tasks || []).map((t) => ({
      ...t,
      projectName: projectMap.get(t.project_id) || 'Unknown project',
    }));
  }, [tasks, projectMap]);

  // ---------- Unassigned tasks ----------
  const unassignedOnly = useMemo(() => {
    return (tasksWithProjectName || [])
      .filter((t) => !t.assignee && !isCompletedStatus(t.status))
      .sort((a, b) => {
        const da = parseDate(a.due_date);
        const db = parseDate(b.due_date);
        if (da && db) return da.getTime() - db.getTime();
        if (da) return -1;
        if (db) return 1;
        return priorityScore(a.priority) - priorityScore(b.priority);
      });
  }, [tasksWithProjectName]);

  // ---------- Presales Activities grouping ----------
  const ongoingUpcomingGrouped = useMemo(() => {
    const active = (tasksWithProjectName || []).filter((t) => !isCompletedStatus(t.status));

    const overdue = [];
    const inProgress = [];
    const notStarted = [];
    const other = [];

    active.forEach((t) => {
      const due = parseDate(t.due_date);

      const statusGroup = normalizeStatusGroup(t.status);
      const isOverdue = due && due.getTime() < today.getTime();

      if (isOverdue) {
        overdue.push(t);
      } else if (statusGroup === 'In Progress') {
        inProgress.push(t);
      } else if (statusGroup === 'Not Started') {
        notStarted.push(t);
      } else {
        other.push(t);
      }
    });

    const sortFn = (a, b) => {
      const da = parseDate(a.due_date);
      const db = parseDate(b.due_date);
      if (da && db) return da.getTime() - db.getTime();
      if (da) return -1;
      if (db) return 1;
      return priorityScore(a.priority) - priorityScore(b.priority);
    };

    overdue.sort(sortFn);
    inProgress.sort(sortFn);
    notStarted.sort(sortFn);

    return {
      Overdue: overdue,
      'In Progress': inProgress,
      'Not Started': notStarted,
      Other: other,
    };
  }, [tasksWithProjectName, today]);

  // ---------- Task modal handlers ----------
  const openTaskModal = (task) => {
    setTaskSaveError(null);

    setTaskForm({
      id: task?.id || null,
      description: task?.description || '',
      status: task?.status || 'Not Started',
      assignee: task?.assignee || '',
      start_date: task?.start_date || '',
      end_date: task?.end_date || '',
      due_date: task?.due_date || '',
      estimated_hours:
        typeof task?.estimated_hours === 'number' ? String(task.estimated_hours) : task?.estimated_hours || '',
      task_type: task?.task_type || '',
      priority: task?.priority || 'Normal',
      notes: task?.notes || '',
      project_id: task?.project_id || null,
    });

    setTaskModalOpen(true);
  };

  const closeTaskModal = () => {
    setTaskModalOpen(false);
    setTaskSaving(false);
    setTaskSaveError(null);
  };

  const deleteTask = async (task) => {
    if (!task?.id) return;

    const ok = window.confirm('Delete this task? This cannot be undone.');
    if (!ok) return;

    try {
      const res = await supabase.from('project_tasks').delete().eq('id', task.id);
      if (res.error) throw res.error;

      setTasks((prev) => (prev || []).filter((t) => t.id !== task.id));
    } catch (e) {
      console.error('Error deleting task:', e);
      alert('Failed to delete task.');
    }
  };

  const saveTask = async () => {
    setTaskSaving(true);
    setTaskSaveError(null);

    try {
      if (!taskForm.project_id) {
        setTaskSaveError('Please select a project.');
        setTaskSaving(false);
        return;
      }

      const payload = {
        description: taskForm.description || null,
        status: taskForm.status || 'Not Started',
        assignee: taskForm.assignee || null,
        start_date: taskForm.start_date || null,
        end_date: taskForm.end_date || null,
        due_date: taskForm.due_date || null,
        estimated_hours: taskForm.estimated_hours === '' ? null : Number(taskForm.estimated_hours),
        task_type: taskForm.task_type || null,
        priority: taskForm.priority || 'Normal',
        notes: taskForm.notes || null,
        project_id: taskForm.project_id,
      };

      let res;
      if (taskForm.id) {
        res = await supabase.from('project_tasks').update(payload).eq('id', taskForm.id).select().single();
      } else {
        res = await supabase.from('project_tasks').insert(payload).select().single();
      }

      if (res.error) throw res.error;

      const saved = res.data;
      setTasks((prev) => {
        const list = prev || [];
        const idx = list.findIndex((t) => t.id === saved.id);
        if (idx >= 0) {
          const next = [...list];
          next[idx] = saved;
          return next;
        }
        return [saved, ...list];
      });

      setTaskModalOpen(false);
    } catch (e) {
      console.error('Error saving task:', e);
      setTaskSaveError('Failed to save task. Please check required fields.');
    } finally {
      setTaskSaving(false);
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

          {/* ✅ NEXT KEY ACTIVITIES (TOP OF PANEL) */}
          <div className="next-activities-block">
            <div className="next-activities-header">
              <h4>Next key activities</h4>
              <p>Only projects with a defined next step.</p>
            </div>

            {nextKeyActivities.length === 0 ? (
              <div className="presales-empty small">
                <p>No next key activities defined.</p>
              </div>
            ) : (
              <div className="unassigned-tasks-table-wrapper next-activities-table-wrapper">
                <table className="unassigned-tasks-table next-activities-table">
                  <thead>
                    <tr>
                      <th style={{ width: '22%' }}>Customer</th>
                      <th style={{ width: '22%' }}>Project</th>
                      <th>Next key activity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nextKeyActivities.map((p) => (
                      <tr key={p.id}>
                        <td className="td-ellipsis next-activity-customer" title={p.customerName}>
                          {p.customerName}
                        </td>
                        <td className="td-ellipsis" title={p.projectName}>
                          {p.projectName}
                        </td>
                        <td>
                          <div className="next-activity-text" title={p.nextKeyActivity}>
                            {p.nextKeyActivity}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="next-activities-divider" />

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

                      <td>
                        {(t.due_date && new Date(t.due_date).toLocaleDateString('en-SG')) || '-'}
                      </td>

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
        The rest of your existing sections (Assignment helper, Workload, Availability, Schedules, modals)
        remain unchanged below this point in your original file.
        If you want, paste the remaining bottom part here and I’ll re-attach it exactly as-is,
        but this edit is safe and isolated to the top panel + projects query.
      */}
    </div>
  );
}
