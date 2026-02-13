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

const ymd = (d) => {
  const dd = parseDate(d);
  if (!dd) return '';
  return dd.toISOString().slice(0, 10);
};

const validateDateRange = (start, end) => {
  if (!start || !end) return '';
  const s = parseDate(start);
  const e = parseDate(end);
  if (!s || !e) return '';
  if (s.getTime() > e.getTime()) return 'Start date cannot be later than end date.';
  return '';
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

// ✅ ACTIVE PROJECT RULE
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

  if (s.includes('rfp') || s.includes('rfi') || s.includes('proposal') || s.includes('tender'))
    return 1.6;
  if (s.includes('poc') || s.includes('integration') || s.includes('workshop') || s.includes('discovery'))
    return 1.4;
  if (s.includes('demo')) return 1.2;
  if (s.includes('meeting') || s.includes('call') || s.includes('sync')) return 0.8;
  if (s.includes('admin') || s.includes('internal')) return 0.7;

  return 1.0;
};

const canonicalTypeMultiplier = (taskType) => {
  const key = (taskType || '').toLowerCase().trim();
  if (!key) return 1.0;
  if (CANONICAL_TYPE_MULTIPLIERS[key]) return CANONICAL_TYPE_MULTIPLIERS[key];
  return legacyKeywordMultiplier(taskType);
};

const safeNumber = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const formatShortDate = (value) => {
  const d = parseDate(value);
  if (!d) return '-';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const buildWorkdayRange = (start, days) => {
  const s = toMidnight(start);
  const arr = [];
  for (let i = 0; i < days; i += 1) {
    const d = new Date(s);
    d.setDate(s.getDate() + i);
    arr.push(d);
  }
  return arr;
};

// --------- Presales Schedule mapping (YOUR table) ----------
const normalizeScheduleTypeToStatus = (type, blockHours) => {
  const t = (type || '').toLowerCase().trim();

  // explicit types
  if (t.includes('leave') || t.includes('pto') || t.includes('vacation') || t.includes('holiday'))
    return 'leave';

  if (t.includes('travel') || t.includes('trip') || t.includes('flight'))
    return 'travel';

  if (t.includes('training') || t.includes('workshop') || t.includes('bootcamp'))
    return 'training';

  if (t.includes('internal') || t.includes('office') || t.includes('admin'))
    return 'internal';

  if (t.includes('busy') || t.includes('blocked') || t.includes('block'))
    return 'busy';

  // if no clear keyword but block_hours exists, treat as busy
  if (safeNumber(blockHours, 0) > 0) return 'busy';

  // fallback
  return 'other';
};

// Higher number = stronger priority
const statusPriority = (status) => {
  const s = (status || '').toLowerCase();
  if (s === 'leave') return 6;
  if (s === 'travel') return 5;
  if (s === 'training') return 4;
  if (s === 'busy') return 3;
  if (s === 'internal') return 2;
  if (s === 'other') return 1;
  return 0; // free
};

const ActivitiesKanban = ({ groups, parseDateFn, today, onEditTask }) => {
  const columns = useMemo(() => {
    const overdue = [];
    const inProgress = [];
    const notStarted = [];

    (groups || []).forEach((t) => {
      const due = parseDateFn(t?.due_date);
      const isOverdue = due && due.getTime() < today.getTime() && !isCompletedStatus(t?.status);
      if (isOverdue) {
        overdue.push(t);
        return;
      }

      const g = normalizeStatusGroup(t?.status);
      if (g === 'In Progress') inProgress.push(t);
      else notStarted.push(t);
    });

    const sorter = (a, b) => {
      const pa = priorityScore(a?.priority);
      const pb = priorityScore(b?.priority);
      if (pa !== pb) return pa - pb;
      const da = parseDateFn(a?.due_date)?.getTime() || 0;
      const db = parseDateFn(b?.due_date)?.getTime() || 0;
      return da - db;
    };

    overdue.sort(sorter);
    inProgress.sort(sorter);
    notStarted.sort(sorter);

    return [
      { key: 'overdue', title: 'Overdue', items: overdue, danger: true },
      { key: 'inprogress', title: 'In Progress', items: inProgress, danger: false },
      { key: 'notstarted', title: 'Not Started', items: notStarted, danger: false },
    ];
  }, [groups, parseDateFn, today]);

  return (
    <div className="activities-kanban">
      {columns.map((col) => (
        <div key={col.key} className={`activities-col ${col.danger ? 'is-overdue' : ''}`}>
          <div className="activities-col-header">
            <span className="activities-col-title">{col.title}</span>
            <span className="activities-col-count">{col.items.length}</span>
          </div>

          {col.items.length === 0 ? (
            <div className="activities-empty">No tasks here.</div>
          ) : (
            <div className="activities-cards">
              {col.items.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`activity-card ${col.danger ? 'is-overdue' : ''}`}
                  onClick={() => onEditTask?.(t)}
                  title="Click to edit"
                >
                  <div className="activity-card-top">
                    <div className="activity-card-title">{t.description || '(Untitled task)'}</div>
                  </div>

                  <div className="activity-card-sub">
                    <span>{t.assignee || 'Unassigned'}</span>
                    <span className="dot">•</span>
                    <span>Due: {formatShortDate(t.due_date)}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

function PresalesOverview() {
  const navigate = useNavigate();

  const today = useMemo(() => toMidnight(new Date()), []);
  const weeks = useMemo(() => getWeekRanges(), []);

  // Data
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [presales, setPresales] = useState([]);
  const [taskTypes, setTaskTypes] = useState([]);

  // Schedule (YOUR table)
  const [scheduleRows, setScheduleRows] = useState([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Range
  const [selectedRangeKey, setSelectedRangeKey] = useState('thisWeek');
  const [rangeStart, setRangeStart] = useState(weeks.thisWeek.start);
  const [rangeEnd, setRangeEnd] = useState(weeks.thisWeek.end);
  const [rangeError, setRangeError] = useState('');

  // Modals
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  // Day detail modal
  const [dayDetailOpen, setDayDetailOpen] = useState(false);
  const [dayDetailAssignee, setDayDetailAssignee] = useState('');
  const [dayDetailDay, setDayDetailDay] = useState(null);

  // Inline edit task helpers (unassigned table)
  const [inlineEditingTaskId, setInlineEditingTaskId] = useState(null);
  const [inlineDraft, setInlineDraft] = useState({});

  // ---------- Load initial data ----------
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');

      try {
        const [{ data: pData, error: pErr }, { data: tData, error: tErr }] = await Promise.all([
          supabase.from('projects').select('*'),
          supabase.from('project_tasks').select('*').eq('is_archived', false),
        ]);

        if (pErr) throw pErr;
        if (tErr) throw tErr;

        setProjects(pData || []);
        setTasks(tData || []);

        // presales list (optional table)
        const { data: rData, error: rErr } = await supabase
          .from('presales_resources')
          .select('name')
          .order('name');

        if (rErr) {
          console.warn('presales_resources load error:', rErr);
          setPresales([]);
        } else {
          setPresales((rData || []).map((x) => x.name).filter(Boolean));
        }

        // task types (optional table)
        const { data: ttData, error: ttErr } = await supabase
          .from('task_types')
          .select('name, is_active, sort_order')
          .eq('is_active', true)
          .order('sort_order', { ascending: true })
          .order('name', { ascending: true });

        if (ttErr) {
          console.warn('task_types load error:', ttErr);
          setTaskTypes(DEFAULT_TASK_TYPES.map((x) => x.name));
        } else {
          const tt = (ttData || []).map((x) => x.name).filter(Boolean);
          setTaskTypes(tt.length ? tt : DEFAULT_TASK_TYPES.map((x) => x.name));
        }

        // ✅ presales_schedule (your table)
        const { data: sData, error: sErr } = await supabase
          .from('presales_schedule')
          .select('*');

        if (sErr) {
          console.warn('presales_schedule load error:', sErr);
          setScheduleRows([]);
        } else {
          setScheduleRows(sData || []);
        }
      } catch (e) {
        console.error('Load error:', e);
        setError(e?.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  // ---------- Range controls ----------
  useEffect(() => {
    if (selectedRangeKey === 'thisWeek') {
      setRangeStart(weeks.thisWeek.start);
      setRangeEnd(weeks.thisWeek.end);
    } else if (selectedRangeKey === 'nextWeek') {
      setRangeStart(weeks.nextWeek.start);
      setRangeEnd(weeks.nextWeek.end);
    } else if (selectedRangeKey === 'last30') {
      setRangeStart(weeks.last30.start);
      setRangeEnd(weeks.last30.end);
    }
  }, [selectedRangeKey, weeks]);

  useEffect(() => {
    setRangeError(validateDateRange(rangeStart, rangeEnd));
  }, [rangeStart, rangeEnd]);

  // ---------- Derivations ----------
  const activeProjects = useMemo(() => (projects || []).filter(isProjectActive), [projects]);

  // ✅ Active Projects by Presales (PRIMARY presales only)
  const activeProjectsByPresales = useMemo(() => {
    const by = {};

    (activeProjects || []).forEach((p) => {
      const primary = (p?.primary_presales || '').trim();
      if (!primary) return;
      if (!by[primary]) by[primary] = [];
      by[primary].push(p);
    });

    const tasksByProject = {};
    (tasks || []).forEach((t) => {
      const pid = t?.project_id;
      if (!pid) return;
      if (!tasksByProject[pid]) tasksByProject[pid] = [];
      tasksByProject[pid].push(t);
    });

    return Object.keys(by)
      .sort((a, b) => a.localeCompare(b))
      .map((assignee) => {
        const projList = by[assignee]
          .map((p) => {
            const projTasks = tasksByProject[p.id] || [];
            const activeTaskCount = projTasks.filter((x) => !isCompletedStatus(x?.status)).length;
            return {
              projectId: p.id,
              projectName: p.project_name || '(Unnamed Project)',
              customerName: p.customer_name || '-',
              activeTaskCount,
              role: 'Primary',
            };
          })
          .sort((a, b) => {
            if ((b.activeTaskCount || 0) !== (a.activeTaskCount || 0)) return (b.activeTaskCount || 0) - (a.activeTaskCount || 0);
            return String(a.projectName).localeCompare(String(b.projectName));
          });

        return { assignee, projects: projList };
      });
  }, [activeProjects, tasks]);

  const ongoingUpcomingGrouped = useMemo(() => {
    return (tasks || []).filter((t) => !isCompletedStatus(t?.status));
  }, [tasks]);

  const unassignedOpenTasks = useMemo(() => {
    const open = (tasks || []).filter((t) => !isCompletedStatus(t?.status));
    return open.filter((t) => !(t?.assignee || '').trim());
  }, [tasks]);

  const rangeDays = useMemo(() => {
    const s = parseDate(rangeStart);
    const e = parseDate(rangeEnd) || s;
    if (!s || !e) return [];
    const daysCount = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return buildWorkdayRange(s, daysCount);
  }, [rangeStart, rangeEnd]);

  const utilizationByPresales = useMemo(() => {
    const by = {};
    (presales || []).forEach((name) => {
      by[name] = { name, hours: 0, days: 0, pct: 0 };
    });

    const range = { start: rangeStart, end: rangeEnd };
    const days = getOverlapDays(range, rangeStart, rangeEnd);
    const totalCapacityHours = days * HOURS_PER_DAY;

    (tasks || []).forEach((t) => {
      const a = (t?.assignee || '').trim();
      if (!a) return;
      if (!by[a]) by[a] = { name: a, hours: 0, days: 0, pct: 0 };

      const overlapDays = getOverlapDays(range, t?.start_date || t?.due_date, t?.end_date || t?.due_date);
      if (!overlapDays) return;

      const est = safeNumber(t?.estimated_hours, DEFAULT_TASK_HOURS);
      const mult = canonicalTypeMultiplier(t?.task_type);
      const effort = est * mult;

      by[a].hours += effort;
    });

    Object.keys(by).forEach((k) => {
      by[k].days = totalCapacityHours ? totalCapacityHours / HOURS_PER_DAY : 0;
      by[k].pct = totalCapacityHours ? Math.round((by[k].hours / totalCapacityHours) * 100) : 0;
    });

    return Object.values(by).sort((a, b) => (b.pct || 0) - (a.pct || 0));
  }, [tasks, presales, rangeStart, rangeEnd]);

  // --- Build schedule lookup: assignee -> date -> {status, entries[]} ---
  const scheduleLookup = useMemo(() => {
    const map = {};

    (scheduleRows || []).forEach((row) => {
      const assignee = (row?.assignee || '').trim();
      if (!assignee) return;

      const s = parseDate(row.start_date);
      const e = parseDate(row.end_date) || s;
      if (!s) return;

      // iterate each day in range
      const cur = new Date(s);
      while (cur.getTime() <= e.getTime()) {
        const key = ymd(cur);
        if (!key) break;

        if (!map[assignee]) map[assignee] = {};
        if (!map[assignee][key]) map[assignee][key] = { status: 'free', entries: [] };

        const derived = normalizeScheduleTypeToStatus(row.type, row.block_hours);
        map[assignee][key].entries.push({
          type: row.type,
          note: row.note,
          block_hours: row.block_hours,
          start_date: row.start_date,
          end_date: row.end_date,
          derivedStatus: derived,
        });

        // pick strongest status for the day
        const currentStatus = map[assignee][key].status || 'free';
        const best =
          statusPriority(derived) > statusPriority(currentStatus) ? derived : currentStatus;

        map[assignee][key].status = best;

        cur.setDate(cur.getDate() + 1);
      }
    });

    return map;
  }, [scheduleRows]);

  const getScheduleStatusForDay = (assignee, day) => {
    const a = (assignee || '').trim();
    const key = ymd(day);
    if (!a || !key) return 'free';
    return scheduleLookup?.[a]?.[key]?.status || 'free';
  };

  const getScheduleEntriesForDay = (assignee, day) => {
    const a = (assignee || '').trim();
    const key = ymd(day);
    if (!a || !key) return [];
    return scheduleLookup?.[a]?.[key]?.entries || [];
  };

  // ---------- Inline edit (unassigned) ----------
  const startInlineEdit = (t) => {
    setInlineEditingTaskId(t.id);
    setInlineDraft({
      description: t.description || '',
      status: t.status || '',
      due_date: t.due_date || '',
      assignee: t.assignee || '',
      task_type: t.task_type || '',
      estimated_hours: t.estimated_hours ?? '',
      priority: t.priority || '',
      notes: t.notes || '',
      start_date: t.start_date || '',
      end_date: t.end_date || '',
    });
  };

  const cancelInlineEdit = () => {
    setInlineEditingTaskId(null);
    setInlineDraft({});
  };

  const saveInlineEdit = async (taskId) => {
    try {
      const payload = {
        description: inlineDraft.description || null,
        status: inlineDraft.status || null,
        due_date: inlineDraft.due_date || null,
        assignee: (inlineDraft.assignee || '').trim() || null,
        task_type: inlineDraft.task_type || null,
        estimated_hours: inlineDraft.estimated_hours === '' ? null : Number(inlineDraft.estimated_hours),
        priority: inlineDraft.priority || null,
        notes: inlineDraft.notes || null,
        start_date: inlineDraft.start_date || null,
        end_date: inlineDraft.end_date || null,
      };

      const { error: qErr } = await supabase.from('project_tasks').update(payload).eq('id', taskId);
      if (qErr) throw qErr;

      setTasks((prev) => (prev || []).map((t) => (t.id === taskId ? { ...t, ...payload } : t)));
      cancelInlineEdit();
    } catch (e) {
      console.error('Inline save error:', e);
      alert('Failed to save task: ' + (e?.message || 'Unknown error'));
    }
  };

  const deleteTask = async (taskId) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      const { error: qErr } = await supabase.from('project_tasks').delete().eq('id', taskId);
      if (qErr) throw qErr;
      setTasks((prev) => (prev || []).filter((t) => t.id !== taskId));
    } catch (e) {
      console.error('Delete task error:', e);
      alert('Failed to delete task: ' + (e?.message || 'Unknown error'));
    }
  };

  // ---------- Availability Day Detail ----------
  const tasksForDayAndAssignee = useMemo(() => {
    if (!dayDetailOpen || !dayDetailAssignee || !dayDetailDay) return [];
    const list = (tasks || []).filter((t) => (t?.assignee || '').trim() === dayDetailAssignee);
    return list.filter((t) => isTaskOnDay(t, dayDetailDay));
  }, [dayDetailOpen, dayDetailAssignee, dayDetailDay, tasks]);

  const scheduleForDayAndAssignee = useMemo(() => {
    if (!dayDetailOpen || !dayDetailAssignee || !dayDetailDay) return [];
    return getScheduleEntriesForDay(dayDetailAssignee, dayDetailDay);
  }, [dayDetailOpen, dayDetailAssignee, dayDetailDay, scheduleLookup]);

  const openDayDetail = (assignee, day) => {
    setDayDetailAssignee(assignee);
    setDayDetailDay(day);
    setDayDetailOpen(true);
  };

  const closeDayDetail = () => {
    setDayDetailOpen(false);
    setDayDetailAssignee('');
    setDayDetailDay(null);
  };

  // ---------- Task Modal ----------
  const openEditTask = (t) => {
    setEditingTask(t);
    setShowTaskModal(true);
  };

  const openNewTask = () => {
    setEditingTask(null);
    setShowTaskModal(true);
  };

  const closeTaskModal = () => {
    setShowTaskModal(false);
    setEditingTask(null);
  };

  const onSaveTaskModal = async (payload) => {
    if (!editingTask?.id) return;
    const { error: qErr } = await supabase.from('project_tasks').update(payload).eq('id', editingTask.id);
    if (qErr) throw qErr;
    setTasks((prev) => (prev || []).map((t) => (t.id === editingTask.id ? { ...t, ...payload } : t)));
  };

  // ---------- Render ----------
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
          <AlertTriangle size={18} />
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
                          {p.role ? (
                            <>
                              <span className="dot">•</span>
                              <span className="board-task-count">{p.role}</span>
                            </>
                          ) : null}
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
            onEditTask={openEditTask}
          />
        </div>
      </section>

      {/* AVAILABILITY + RANGE */}
      <section className="presales-crunch-section">
        <div className="presales-panel presales-panel-large">
          <div className="presales-panel-header">
            <div>
              <h3>
                <Filter size={18} className="panel-icon" />
                Availability and load
              </h3>
              <p>Dot colors come from presales_schedule. Click a day to see tasks and schedule notes.</p>
            </div>

            <div className="panel-actions">
              <div className="field compact">
                <label>Date range</label>
                <select value={selectedRangeKey} onChange={(e) => setSelectedRangeKey(e.target.value)}>
                  <option value="thisWeek">This week (Mon-Fri)</option>
                  <option value="nextWeek">Next week (Mon-Fri)</option>
                  <option value="last30">Last 30 days</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              <div className="field compact">
                <label>Start</label>
                <input
                  type="date"
                  value={parseDate(rangeStart)?.toISOString().slice(0, 10) || ''}
                  onChange={(e) => setRangeStart(e.target.value)}
                  disabled={selectedRangeKey !== 'custom'}
                />
              </div>

              <div className="field compact">
                <label>End</label>
                <input
                  type="date"
                  value={parseDate(rangeEnd)?.toISOString().slice(0, 10) || ''}
                  onChange={(e) => setRangeEnd(e.target.value)}
                  disabled={selectedRangeKey !== 'custom'}
                />
              </div>
            </div>
          </div>

          {rangeError ? (
            <div className="presales-empty">
              <p>{rangeError}</p>
            </div>
          ) : (
            <div className="unassigned-tasks-table-wrapper">
              <div className="availability-grid-wrapper">
                <table className="availability-grid">
                  <thead>
                    <tr>
                      <th className="sticky-col">Presales</th>
                      {rangeDays.map((d) => (
                        <th key={d.toISOString()}>
                          <div>{d.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                          <div>{d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                        </th>
                      ))}
                      <th>Load</th>
                    </tr>
                  </thead>

                  <tbody>
                    {utilizationByPresales.map((u) => {
                      const name = u.name;
                      return (
                        <tr key={name}>
                          <td className="sticky-col assignee-cell">{name}</td>

                          {rangeDays.map((d) => {
                            const status = getScheduleStatusForDay(name, d); // ✅ from presales_schedule
                            return (
                              <td
                                key={`${name}-${ymd(d)}`}
                                className={`avail-cell ${status}`}
                                onClick={() => openDayDetail(name, d)}
                                title="Click to view tasks and schedule notes"
                              >
                                <div className="avail-dot" />
                              </td>
                            );
                          })}

                          <td title={getUtilLabel(u.pct)}>
                            {Math.round(u.hours)}h ({u.pct}%)
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Day detail modal */}
      {dayDetailOpen ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true" onMouseDown={closeDayDetail}>
          <div className="modal-card modal-wide" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <Plane size={16} />
                {dayDetailAssignee} •{' '}
                {dayDetailDay
                  ? dayDetailDay.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : ''}
              </h3>
              <button type="button" className="icon-btn" onClick={closeDayDetail} aria-label="Close">
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              <div className="daydetail-grid">
                <div>
                  <div className="daydetail-title">Tasks on this day</div>
                  <div className="daydetail-list">
                    {tasksForDayAndAssignee.length === 0 ? (
                      <div className="presales-empty small">
                        <p>No tasks found for this day.</p>
                      </div>
                    ) : (
                      tasksForDayAndAssignee.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          className="daydetail-item"
                          onClick={() => {
                            closeDayDetail();
                            openEditTask(t);
                          }}
                        >
                          <div className="daydetail-item-title">{t.description || '(Untitled task)'}</div>
                          <div className="daydetail-item-sub">
                            <span>{t.project_name || '—'}</span>
                            <span className="dot">•</span>
                            <span>Due: {formatShortDate(t.due_date)}</span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <div className="daydetail-title">Schedule (from presales_schedule)</div>

                  {scheduleForDayAndAssignee.length === 0 ? (
                    <div className="daydetail-schedule">
                      <p style={{ margin: 0, color: 'rgba(15, 23, 42, 0.70)', fontSize: 13 }}>
                        No schedule entries for this day. Default is “free”.
                      </p>
                    </div>
                  ) : (
                    <div className="daydetail-schedule">
                      {scheduleForDayAndAssignee.map((s, idx) => (
                        <div key={`${idx}-${s.type}`} style={{ marginBottom: 10 }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: 'rgba(15,23,42,0.88)' }}>
                            {s.type} {s.block_hours ? `(${s.block_hours}h)` : ''}
                          </div>
                          <div style={{ fontSize: 12, color: 'rgba(15,23,42,0.70)' }}>
                            {s.note || '—'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={closeDayDetail}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Task modal */}
      <TaskModal
        isOpen={showTaskModal}
        onClose={closeTaskModal}
        onSave={onSaveTaskModal}
        editingTask={editingTask}
        presalesResources={presales}
        taskTypes={taskTypes}
      />
    </div>
  );
}

export default PresalesOverview;
