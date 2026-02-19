import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  AlertTriangle,
  Filter,
  Plane,
  X,
  ListChecks,
  Edit3,
  Trash2,
  Save,
  CalendarDays,
} from 'lucide-react';
import './PresalesOverview.css';
import TaskModal from './TaskModal';

const HOURS_PER_DAY = 8;
const DEFAULT_TASK_HOURS = 4;

const DEFAULT_TASK_TYPES = [
  { id: 'rfp', name: 'RFP / Proposal' },
  { id: 'poc', name: 'PoC / Integration / Workshop' },
  { id: 'demo', name: 'Demo' },
  { id: 'meeting', name: 'Meeting / Call' },
  { id: 'admin', name: 'Admin / Internal' },
  { id: 'other', name: 'Other' },
];

const CANONICAL_TYPE_MULTIPLIERS = {
  'rfp / proposal': 1.6,
  'poc / integration / workshop': 1.4,
  demo: 1.2,
  'meeting / call': 0.8,
  'admin / internal': 0.7,
  other: 1.0,
};

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

const isCompletedStatus = (status) => {
  const s = (status || '').toLowerCase().trim();
  return s === 'completed' || s === 'done' || s === 'closed';
};

const normalizeStatusGroup = (status) => {
  const s = (status || '').toLowerCase().trim();
  if (s.includes('progress')) return 'In Progress';
  if (s.includes('not started') || s === 'open' || s === 'new') return 'Not Started';
  return 'Other';
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

const buildDayRange = (start, end) => {
  const s = parseDate(start);
  const e = parseDate(end) || s;
  if (!s || !e) return [];
  const arr = [];
  const cur = new Date(s);
  while (cur.getTime() <= e.getTime()) {
    arr.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return arr;
};

const getWeekRanges = () => {
  const today = toMidnight(new Date());

  const thisWeekStart = new Date(today);
  const day = thisWeekStart.getDay();
  const diff = (day === 0 ? -6 : 1) - day; // Monday
  thisWeekStart.setDate(thisWeekStart.getDate() + diff);

  const thisWeekEnd = new Date(thisWeekStart);
  thisWeekEnd.setDate(thisWeekStart.getDate() + 4);

  const nextWeekStart = new Date(thisWeekStart);
  nextWeekStart.setDate(thisWeekStart.getDate() + 7);
  const nextWeekEnd = new Date(nextWeekStart);
  nextWeekEnd.setDate(nextWeekStart.getDate() + 4);

  const last30Start = new Date(today);
  last30Start.setDate(today.getDate() - 30);
  const last30End = new Date(today);

  return {
    thisWeek: { start: thisWeekStart, end: thisWeekEnd },
    nextWeek: { start: nextWeekStart, end: nextWeekEnd },
    last30: { start: last30Start, end: last30End },
  };
};

const getOverlapDays = (rangeStart, rangeEnd, taskStart, taskEnd) => {
  const rs = parseDate(rangeStart);
  const re = parseDate(rangeEnd);
  const ts = parseDate(taskStart);
  const te = parseDate(taskEnd);

  if (!rs || !re) return 0;

  const start = ts || te || rs;
  const end = te || ts || start;

  const overlapStart = start.getTime() > rs.getTime() ? start : rs;
  const overlapEnd = end.getTime() < re.getTime() ? end : re;

  if (overlapEnd.getTime() < overlapStart.getTime()) return 0;

  const ms = overlapEnd.getTime() - overlapStart.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24)) + 1;
};

const isTaskOnDay = (task, day) => {
  const d = parseDate(day);
  if (!d) return false;

  const start = parseDate(task.start_date) || parseDate(task.due_date) || parseDate(task.end_date);
  const end = parseDate(task.end_date) || parseDate(task.due_date) || parseDate(task.start_date);

  if (!start && !end) return false;

  const s = start || end;
  const e = end || start;

  return d.getTime() >= s.getTime() && d.getTime() <= e.getTime();
};

// Project inactivity (computed)
// Rule:
// 1) Inactive if there are NO open/active tasks
// 2) OR if the last movement (project last_activity_at OR latest open task updated/created date) is older than N days
const DAYS_INACTIVE_THRESHOLD = 60;

const daysSinceDate = (value) => {
  const d = value instanceof Date ? value : new Date(value);
  if (!d || Number.isNaN(d.getTime())) return null;
  const now = new Date();
  const ms = now.getTime() - d.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
};

const getLatestOpenTaskMovementAt = (tasksForProject) => {
  const open = (tasksForProject || []).filter((t) => !isCompletedStatus(t?.status));
  if (open.length === 0) return null;

  const candidates = open
    .map((t) => t?.updated_at || t?.created_at || t?.start_date || t?.due_date)
    .map((x) => (x ? new Date(x) : null))
    .filter((d) => d && !Number.isNaN(d.getTime()));

  if (candidates.length === 0) return null;
  return new Date(Math.max(...candidates.map((d) => d.getTime())));
};

const computeProjectInactive = (project, tasksForProject, thresholdDays = DAYS_INACTIVE_THRESHOLD) => {
  const openTaskCount = (tasksForProject || []).filter((t) => !isCompletedStatus(t?.status)).length;
  if (openTaskCount === 0) return true;

  const projectLast = project?.last_activity_at ? new Date(project.last_activity_at) : null;
  const taskLast = getLatestOpenTaskMovementAt(tasksForProject);

  const valid = [projectLast, taskLast].filter((d) => d && !Number.isNaN(d.getTime()));
  const lastMovementAt = valid.length ? new Date(Math.max(...valid.map((d) => d.getTime()))) : null;
  if (!lastMovementAt) return true;

  const days = daysSinceDate(lastMovementAt);
  if (days === null) return true;
  return days > thresholdDays;
};

// Board filter: exclude these stages
const isStageAllowedForBoard = (project) => {
  const stage = (project?.sales_stage || '').toLowerCase().trim();
  const s = stage.replace(/\s+/g, '-'); // normalize
  const blocked = new Set(['closed-lost', 'close-won', 'closed-won', 'on-hold', 'cancelled', 'canceled']);
  return !blocked.has(s);
};

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

const canonicalTypeMultiplier = (taskType) => {
  const key = (taskType || '').toLowerCase().trim();
  if (!key) return 1.0;
  if (CANONICAL_TYPE_MULTIPLIERS[key]) return CANONICAL_TYPE_MULTIPLIERS[key];
  return legacyKeywordMultiplier(taskType);
};

// presales_schedule mapping
const normalizeScheduleTypeToStatus = (type, blockHours) => {
  const t = (type || '').toLowerCase().trim();

  if (t.includes('holiday')) return 'holiday';
  if (t.includes('leave') || t.includes('pto') || t.includes('vacation')) return 'leave';
  if (t.includes('travel') || t.includes('trip') || t.includes('flight')) return 'travel';
  if (t.includes('training') || t.includes('workshop') || t.includes('bootcamp')) return 'training';
  if (t.includes('internal') || t.includes('office') || t.includes('admin')) return 'internal';
  if (t.includes('busy') || t.includes('blocked') || t.includes('block')) return 'busy';

  if (safeNumber(blockHours, 0) > 0) return 'busy';
  return 'other';
};

const statusPriority = (status) => {
  const s = (status || '').toLowerCase();
  if (s === 'holiday') return 7;
  if (s === 'leave') return 6;
  if (s === 'travel') return 5;
  if (s === 'training') return 4;
  if (s === 'busy') return 3;
  if (s === 'internal') return 2;
  if (s === 'other') return 1;
  return 0; // free
};

// capacity (available hours) per day based on schedule
const statusToAvailableHours = (status) => {
  const s = (status || 'free').toLowerCase();
  if (s === 'holiday' || s === 'leave' || s === 'travel' || s === 'training') return 0;
  if (s === 'busy') return 2;
  if (s === 'internal') return 4;
  if (s === 'other') return 4;
  return HOURS_PER_DAY;
};

const prettyStatus = (status) => {
  const s = (status || 'free').toLowerCase();
  if (s === 'free') return 'Free';
  if (s === 'holiday') return 'Holiday';
  if (s === 'leave') return 'Leave';
  if (s === 'travel') return 'Travel';
  if (s === 'training') return 'Training';
  if (s === 'busy') return 'Blocked';
  if (s === 'internal') return 'Internal';
  if (s === 'other') return 'Other';
  return status;
};

const ActivitiesKanban = ({ tasks, today, onEditTask }) => {
  const columns = useMemo(() => {
    const overdue = [];
    const inProgress = [];
    const notStarted = [];

    (tasks || []).forEach((t) => {
      const due = parseDate(t?.due_date);
      const isOverdue = due && due.getTime() < today.getTime() && !isCompletedStatus(t?.status);
      if (isOverdue) {
        overdue.push(t);
        return;
      }

      const g = normalizeStatusGroup(t?.status);
      if (g === 'In Progress') inProgress.push(t);
      else notStarted.push(t);
    });

    return [
      { key: 'overdue', title: 'Overdue', items: overdue, danger: true },
      { key: 'inprogress', title: 'In Progress', items: inProgress, danger: false },
      { key: 'notstarted', title: 'Not Started', items: notStarted, danger: false },
    ];
  }, [tasks, today]);

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
                    <span>{(t.assignee || '').trim() || 'Unassigned'}</span>
                    <span className="dot">•</span>
                    <span>Due: {formatShortDate(t.due_date)}</span>
                  </div>

                  <div className="activity-card-meta">
                    {t.project_name ? <span className="meta-chip">{t.project_name}</span> : null}
                    {t.task_type ? <span className="meta-chip">{t.task_type}</span> : null}
                    {t.priority ? <span className="meta-chip">{t.priority}</span> : null}
                    {t.status ? <span className="meta-chip">{t.status}</span> : null}
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

  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [presales, setPresales] = useState([]);
  const [taskTypes, setTaskTypes] = useState([]);
  const [scheduleRows, setScheduleRows] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedRangeKey, setSelectedRangeKey] = useState('thisWeek');
  const [rangeStart, setRangeStart] = useState(weeks.thisWeek.start);
  const [rangeEnd, setRangeEnd] = useState(weeks.thisWeek.end);
  const [rangeError, setRangeError] = useState('');

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const [dayDetailOpen, setDayDetailOpen] = useState(false);
  const [dayDetailAssignee, setDayDetailAssignee] = useState('');
  const [dayDetailDay, setDayDetailDay] = useState(null);

  const [inlineEditingTaskId, setInlineEditingTaskId] = useState(null);
  const [inlineDraft, setInlineDraft] = useState({});

  // Assignment Helper
  const [helperStartDate, setHelperStartDate] = useState(ymd(new Date()));
  const [helperRequiredHours, setHelperRequiredHours] = useState(DEFAULT_TASK_HOURS);
  const [helperTaskType, setHelperTaskType] = useState('');

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

        const { data: rData, error: rErr } = await supabase.from('presales_resources').select('name').order('name');
        if (rErr) {
          console.warn('presales_resources load error:', rErr);
          setPresales([]);
        } else {
          setPresales((rData || []).map((x) => x.name).filter(Boolean));
        }

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

        const { data: sData, error: sErr } = await supabase.from('presales_schedule').select('*');
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

  // Build lookup once so computed inactivity can use tasks per project
  const tasksByProjectId = useMemo(() => {
    const map = {};
    (tasks || []).forEach((t) => {
      const pid = t?.project_id;
      if (!pid) return;
      if (!map[pid]) map[pid] = [];
      map[pid].push(t);
    });
    return map;
  }, [tasks]);

  // A project is "active" if it is NOT computed as inactive
  // (inactive = no open tasks OR no movement in the last 60 days)
  const activeProjects = useMemo(() => {
    return (projects || []).filter((p) => !computeProjectInactive(p, tasksByProjectId[p?.id] || []));
  }, [projects, tasksByProjectId]);

  const activeProjectsByPresales = useMemo(() => {
    const by = {};

    (activeProjects || [])
      .filter(isStageAllowedForBoard)
      .forEach((p) => {
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
            };
          })
          .sort((a, b) => {
            if ((b.activeTaskCount || 0) !== (a.activeTaskCount || 0)) return (b.activeTaskCount || 0) - (a.activeTaskCount || 0);
            return String(a.projectName).localeCompare(String(b.projectName));
          });

        return { assignee, projects: projList };
      });
  }, [activeProjects, tasks]);

  const openTasks = useMemo(() => (tasks || []).filter((t) => !isCompletedStatus(t?.status)), [tasks]);
  const unassignedOpenTasks = useMemo(() => openTasks.filter((t) => !(t?.assignee || '').trim()), [openTasks]);

  const rangeDays = useMemo(() => buildDayRange(rangeStart, rangeEnd), [rangeStart, rangeEnd]);

  const allPresalesNames = useMemo(() => {
    const set = new Set();

    (presales || []).forEach((n) => {
      const nn = (n || '').trim();
      if (nn) set.add(nn);
    });

    (tasks || []).forEach((t) => {
      const a = (t?.assignee || '').trim();
      if (a) set.add(a);
    });

    (scheduleRows || []).forEach((r) => {
      const a = (r?.assignee || '').trim();
      if (a) set.add(a);
    });

    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [presales, tasks, scheduleRows]);

  // schedule lookup: assignee -> ymd -> {status, entries[]}
  const scheduleLookup = useMemo(() => {
    const map = {};

    (scheduleRows || []).forEach((row) => {
      const assignee = (row?.assignee || '').trim();
      if (!assignee) return;

      const s = parseDate(row.start_date);
      const e = parseDate(row.end_date) || s;
      if (!s) return;

      const days = buildDayRange(s, e);
      const status = normalizeScheduleTypeToStatus(row?.type, row?.block_hours);

      days.forEach((d) => {
        const key = ymd(d);
        if (!key) return;

        if (!map[assignee]) map[assignee] = {};
        if (!map[assignee][key]) map[assignee][key] = { status: 'free', entries: [] };

        map[assignee][key].entries.push(row);

        const cur = map[assignee][key].status;
        if (statusPriority(status) > statusPriority(cur)) {
          map[assignee][key].status = status;
        }
      });
    });

    return map;
  }, [scheduleRows]);

  const dayCapacityMatrix = useMemo(() => {
    const matrix = {};
    (allPresalesNames || []).forEach((name) => {
      matrix[name] = {};
      (rangeDays || []).forEach((d) => {
        const key = ymd(d);
        const sched = scheduleLookup?.[name]?.[key];
        const status = sched?.status || 'free';
        matrix[name][key] = { status, availableHours: statusToAvailableHours(status), entries: sched?.entries || [] };
      });
    });
    return matrix;
  }, [allPresalesNames, rangeDays, scheduleLookup]);

  const tasksInRange = useMemo(() => {
    return (openTasks || []).filter((t) => {
      const ts = parseDate(t.start_date) || parseDate(t.due_date) || parseDate(t.end_date);
      const te = parseDate(t.end_date) || parseDate(t.due_date) || parseDate(t.start_date);
      const start = ts || te;
      const end = te || ts;
      if (!start && !end) return false;

      const rs = parseDate(rangeStart);
      const re = parseDate(rangeEnd);
      if (!rs || !re) return false;

      return !(end.getTime() < rs.getTime() || start.getTime() > re.getTime());
    });
  }, [openTasks, rangeStart, rangeEnd]);

  const tasksByAssignee = useMemo(() => {
    const map = {};
    (tasksInRange || []).forEach((t) => {
      const a = (t?.assignee || '').trim() || 'Unassigned';
      if (!map[a]) map[a] = [];
      map[a].push(t);
    });
    return map;
  }, [tasksInRange]);

  const workloadSummary = useMemo(() => {
    const rs = parseDate(rangeStart);
    const re = parseDate(rangeEnd);
    if (!rs || !re) return [];

    const rows = (allPresalesNames || []).map((assignee) => {
      const items = tasksByAssignee?.[assignee] || [];
      let totalHours = 0;
      let weightedHours = 0;

      items.forEach((t) => {
        const overlapDays = getOverlapDays(rs, re, t.start_date, t.end_date);
        if (overlapDays <= 0) return;

        const hours = safeNumber(t.estimated_hours, DEFAULT_TASK_HOURS);
        const perDay = hours / overlapDays;
        totalHours += perDay * overlapDays;

        const mult = canonicalTypeMultiplier(t.task_type);
        weightedHours += perDay * overlapDays * mult;
      });

      const totalDays = buildDayRange(rs, re).length || 1;
      const avgPerDay = totalHours / totalDays;
      const avgWeightedPerDay = weightedHours / totalDays;

      return {
        assignee,
        tasks: items.length,
        totalHours: Math.round(totalHours * 10) / 10,
        weightedHours: Math.round(weightedHours * 10) / 10,
        avgPerDay: Math.round(avgPerDay * 10) / 10,
        avgWeightedPerDay: Math.round(avgWeightedPerDay * 10) / 10,
      };
    });

    return rows.sort((a, b) => (b.weightedHours || 0) - (a.weightedHours || 0));
  }, [allPresalesNames, tasksByAssignee, rangeStart, rangeEnd]);

  const dayDetailTasks = useMemo(() => {
    if (!dayDetailOpen || !dayDetailAssignee || !dayDetailDay) return [];
    const list = tasksByAssignee?.[dayDetailAssignee] || [];
    return list.filter((t) => isTaskOnDay(t, dayDetailDay));
  }, [dayDetailOpen, dayDetailAssignee, dayDetailDay, tasksByAssignee]);

  const openDayDetail = (assignee, d) => {
    setDayDetailAssignee(assignee);
    setDayDetailDay(d);
    setDayDetailOpen(true);
  };

  const closeDayDetail = () => {
    setDayDetailOpen(false);
    setDayDetailAssignee('');
    setDayDetailDay(null);
  };

  const openTaskModal = () => {
    setEditingTask(null);
    setShowTaskModal(true);
  };

  const closeTaskModal = () => {
    setEditingTask(null);
    setShowTaskModal(false);
  };

  const onEditTask = (task) => {
    setEditingTask(task);
    setShowTaskModal(true);
  };

  const onSaveTaskModal = async (payload) => {
    try {
      if (payload?.id) {
        const { error: uErr } = await supabase.from('project_tasks').update(payload).eq('id', payload.id);
        if (uErr) throw uErr;
      } else {
        const { error: iErr } = await supabase.from('project_tasks').insert(payload);
        if (iErr) throw iErr;
      }

      const { data: tData, error: tErr } = await supabase.from('project_tasks').select('*').eq('is_archived', false);
      if (tErr) throw tErr;
      setTasks(tData || []);
      closeTaskModal();
    } catch (e) {
      console.error('Save task error:', e);
      alert(e?.message || 'Failed to save task');
    }
  };

  const startInlineEdit = (task) => {
    setInlineEditingTaskId(task.id);
    setInlineDraft({
      description: task.description || '',
      assignee: task.assignee || '',
      start_date: task.start_date ? ymd(task.start_date) : '',
      end_date: task.end_date ? ymd(task.end_date) : '',
      due_date: task.due_date ? ymd(task.due_date) : '',
      status: task.status || '',
      task_type: task.task_type || '',
      priority: task.priority || '',
      estimated_hours: safeNumber(task.estimated_hours, DEFAULT_TASK_HOURS),
    });
  };

  const cancelInlineEdit = () => {
    setInlineEditingTaskId(null);
    setInlineDraft({});
  };

  const saveInlineEdit = async (taskId) => {
    try {
      const upd = {
        description: inlineDraft.description || null,
        assignee: inlineDraft.assignee || null,
        start_date: inlineDraft.start_date || null,
        end_date: inlineDraft.end_date || null,
        due_date: inlineDraft.due_date || null,
        status: inlineDraft.status || null,
        task_type: inlineDraft.task_type || null,
        priority: inlineDraft.priority || null,
        estimated_hours: safeNumber(inlineDraft.estimated_hours, DEFAULT_TASK_HOURS),
      };

      const { error: uErr } = await supabase.from('project_tasks').update(upd).eq('id', taskId);
      if (uErr) throw uErr;

      const { data: tData, error: tErr } = await supabase.from('project_tasks').select('*').eq('is_archived', false);
      if (tErr) throw tErr;
      setTasks(tData || []);

      cancelInlineEdit();
    } catch (e) {
      console.error('Inline save error:', e);
      alert(e?.message || 'Failed to save task');
    }
  };

  const deleteTask = async (taskId) => {
    const ok = window.confirm('Delete task? This will archive it.');
    if (!ok) return;

    try {
      const { error: dErr } = await supabase.from('project_tasks').update({ is_archived: true }).eq('id', taskId);
      if (dErr) throw dErr;

      const { data: tData, error: tErr } = await supabase.from('project_tasks').select('*').eq('is_archived', false);
      if (tErr) throw tErr;
      setTasks(tData || []);
    } catch (e) {
      console.error('Delete task error:', e);
      alert(e?.message || 'Failed to delete task');
    }
  };

  const helperSuggestions = useMemo(() => {
    const start = parseDate(helperStartDate);
    if (!start) return [];

    const reqHours = safeNumber(helperRequiredHours, DEFAULT_TASK_HOURS);
    const typeMult = canonicalTypeMultiplier(helperTaskType);
    const weighted = reqHours * typeMult;

    const suggestions = (allPresalesNames || []).map((assignee) => {
      let totalAvail = 0;
      let totalAssigned = 0;

      const windowDays = buildDayRange(start, new Date(start.getTime() + 1000 * 60 * 60 * 24 * 4)); // 5 days window
      windowDays.forEach((d) => {
        const key = ymd(d);
        const cap = dayCapacityMatrix?.[assignee]?.[key]?.availableHours ?? HOURS_PER_DAY;
        totalAvail += cap;

        const dayTasks = (tasksByAssignee?.[assignee] || []).filter((t) => isTaskOnDay(t, d));
        dayTasks.forEach((t) => {
          totalAssigned += safeNumber(t.estimated_hours, DEFAULT_TASK_HOURS) / 1;
        });
      });

      const remaining = Math.max(0, totalAvail - totalAssigned);
      const fitScore = remaining - weighted;

      return { assignee, remainingHours: Math.round(remaining * 10) / 10, fitScore };
    });

    return suggestions
      .sort((a, b) => (b.fitScore || 0) - (a.fitScore || 0))
      .slice(0, 5);
  }, [helperStartDate, helperRequiredHours, helperTaskType, allPresalesNames, dayCapacityMatrix, tasksByAssignee]);

  if (loading) {
    return (
      <div className="overview-loading">
        <div className="overview-loading-spinner" />
        <div className="overview-loading-text">Loading presales overview…</div>
      </div>
    );
  }

  if (error) {
    return <div className="overview-error">{error}</div>;
  }

  return (
    <div className="presales-overview">
      <header className="overview-header">
        <div className="overview-title">
          <Users size={20} />
          <h2>Presales Overview</h2>
        </div>

        <div className="overview-range">
          <div className="range-chip">
            <Filter size={14} />
            <select value={selectedRangeKey} onChange={(e) => setSelectedRangeKey(e.target.value)}>
              <option value="thisWeek">This Week</option>
              <option value="nextWeek">Next Week</option>
              <option value="last30">Last 30 Days</option>
            </select>
          </div>

          <div className="range-chip">
            <CalendarDays size={14} />
            <input type="date" value={ymd(rangeStart)} onChange={(e) => setRangeStart(e.target.value)} />
            <span className="range-sep">to</span>
            <input type="date" value={ymd(rangeEnd)} onChange={(e) => setRangeEnd(e.target.value)} />
          </div>

          <button type="button" className="btn-primary" onClick={openTaskModal}>
            + New Task
          </button>
        </div>
      </header>

      {rangeError ? <div className="overview-warning">{rangeError}</div> : null}

      <section className="overview-section">
        <div className="section-header">
          <div className="section-title">
            <ListChecks size={18} />
            <h3>Workload Summary</h3>
          </div>
          <p>Workload is estimated hours within the selected range (weighted by task type).</p>
        </div>

        <div className="summary-grid">
          {workloadSummary.map((row) => (
            <div key={row.assignee} className="summary-card">
              <div className="summary-top">
                <div className="summary-name">{row.assignee}</div>
                <div className="summary-metric">
                  <span className="metric-label">Weighted</span>
                  <span className="metric-value">{row.weightedHours}h</span>
                </div>
              </div>

              <div className="summary-details">
                <div className="detail">
                  <span className="label">Tasks</span>
                  <span className="value">{row.tasks}</span>
                </div>
                <div className="detail">
                  <span className="label">Total</span>
                  <span className="value">{row.totalHours}h</span>
                </div>
                <div className="detail">
                  <span className="label">Avg/day</span>
                  <span className="value">{row.avgWeightedPerDay}h</span>
                </div>
              </div>

              <div className="summary-days">
                {rangeDays.map((d) => {
                  const key = ymd(d);
                  const cap = dayCapacityMatrix?.[row.assignee]?.[key];
                  const status = cap?.status || 'free';
                  const avail = cap?.availableHours ?? HOURS_PER_DAY;

                  const dayTasks = (tasksByAssignee?.[row.assignee] || []).filter((t) => isTaskOnDay(t, d));
                  const dayAssigned = dayTasks.reduce((s, t) => s + safeNumber(t.estimated_hours, DEFAULT_TASK_HOURS), 0);
                  const pct = avail ? Math.min(100, Math.round((dayAssigned / avail) * 100)) : 0;

                  return (
                    <button
                      key={key}
                      type="button"
                      className={`day-cell status-${status}`}
                      onClick={() => openDayDetail(row.assignee, d)}
                      title={`${row.assignee} - ${key} | ${prettyStatus(status)} | ${dayAssigned}h assigned / ${avail}h available`}
                    >
                      <div className="day-top">
                        <span className="day-date">{formatShortDate(d)}</span>
                        <span className="day-status">{prettyStatus(status)}</span>
                      </div>
                      <div className="day-bar">
                        <div className="day-fill" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="day-foot">
                        <span className="day-hours">{dayAssigned}h</span>
                        <span className="day-avail">{avail}h</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="overview-section">
        <div className="section-header">
          <div className="section-title">
            <AlertTriangle size={18} />
            <h3>Unassigned Open Tasks</h3>
          </div>
          <p>These tasks are open but do not have an assignee yet.</p>
        </div>

        {unassignedOpenTasks.length === 0 ? (
          <div className="empty-state">No unassigned tasks.</div>
        ) : (
          <div className="tasks-table">
            <div className="tasks-header">
              <span>Task</span>
              <span>Due</span>
              <span>Type</span>
              <span>Status</span>
              <span className="actions-col">Actions</span>
            </div>

            {unassignedOpenTasks.map((t) => (
              <div key={t.id} className="tasks-row">
                <span className="task-title">{t.description || '(Untitled task)'}</span>
                <span>{formatShortDate(t.due_date)}</span>
                <span>{t.task_type || '-'}</span>
                <span>{t.status || '-'}</span>

                <span className="row-actions">
                  <button type="button" className="icon-btn" onClick={() => onEditTask(t)} title="Edit">
                    <Edit3 size={16} />
                  </button>
                  <button type="button" className="icon-btn danger" onClick={() => deleteTask(t.id)} title="Delete">
                    <Trash2 size={16} />
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="overview-section">
        <div className="section-header">
          <div className="section-title">
            <Plane size={18} />
            <h3>Active Projects by Presales</h3>
          </div>
          <p>
            Active means: has open tasks AND last movement within 60 days. (Movement = last_activity_at or task updates)
          </p>
        </div>

        {activeProjectsByPresales.length === 0 ? (
          <div className="empty-state">No active projects found.</div>
        ) : (
          <div className="projects-by-presales">
            {activeProjectsByPresales.map((g) => (
              <div key={g.assignee} className="projects-group">
                <div className="projects-group-header">
                  <span className="group-name">{g.assignee}</span>
                  <span className="group-count">{g.projects.length}</span>
                </div>

                {g.projects.length === 0 ? (
                  <div className="projects-empty">No projects.</div>
                ) : (
                  <div className="projects-list">
                    {g.projects.map((p) => (
                      <button
                        key={p.projectId}
                        type="button"
                        className="project-row"
                        onClick={() => navigate(`/project/${p.projectId}`)}
                        title="Open project"
                      >
                        <div className="project-main">
                          <div className="project-title">{p.projectName}</div>
                          <div className="project-sub">{p.customerName}</div>
                        </div>

                        <div className="project-meta">
                          <span className="meta-pill">{p.activeTaskCount} open tasks</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="overview-section">
        <div className="section-header">
          <div className="section-title">
            <Filter size={18} />
            <h3>Assignment Helper</h3>
          </div>
          <p>Quick suggestion of who has the most capacity in the next few days.</p>
        </div>

        <div className="helper-grid">
          <div className="helper-row">
            <label>
              Start date
              <input type="date" value={helperStartDate} onChange={(e) => setHelperStartDate(e.target.value)} />
            </label>

            <label>
              Required hours
              <input
                type="number"
                min="1"
                step="1"
                value={helperRequiredHours}
                onChange={(e) => setHelperRequiredHours(e.target.value)}
              />
            </label>

            <label>
              Task type
              <select value={helperTaskType} onChange={(e) => setHelperTaskType(e.target.value)}>
                <option value="">(Any)</option>
                {(taskTypes || []).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="helper-suggestions">
            {helperSuggestions.length === 0 ? (
              <div className="empty-state">No suggestions.</div>
            ) : (
              helperSuggestions.map((s) => (
                <div key={s.assignee} className="helper-card">
                  <div className="helper-name">{s.assignee}</div>
                  <div className="helper-meta">
                    <span className="meta-pill">{s.remainingHours}h available</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="overview-section">
        <div className="section-header">
          <div className="section-title">
            <ListChecks size={18} />
            <h3>Activities Board</h3>
          </div>
          <p>Quick view of tasks by status. Click a card to edit.</p>
        </div>

        <ActivitiesKanban tasks={openTasks} today={today} onEditTask={onEditTask} />
      </section>

      {dayDetailOpen ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card">
            <div className="modal-header">
              <div className="modal-title">
                {dayDetailAssignee} • {formatShortDate(dayDetailDay)}
              </div>

              <button type="button" className="icon-btn" onClick={closeDayDetail} aria-label="Close">
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              <div className="day-detail-list">
                {dayDetailTasks.length === 0 ? (
                  <div className="empty-state">No tasks on this day.</div>
                ) : (
                  dayDetailTasks.map((t) => (
                    <div key={t.id} className="day-detail-row">
                      <div className="day-detail-main">
                        <div className="task-title">{t.description || '(Untitled task)'}</div>
                        <div className="task-sub">
                          <span>{t.project_name || '-'}</span>
                          <span className="dot">•</span>
                          <span>{t.task_type || '-'}</span>
                          <span className="dot">•</span>
                          <span>Due {formatShortDate(t.due_date)}</span>
                        </div>
                      </div>

                      <div className="day-detail-actions">
                        {inlineEditingTaskId === t.id ? (
                          <>
                            <button
                              type="button"
                              className="icon-btn"
                              onClick={() => saveInlineEdit(t.id)}
                              title="Save"
                            >
                              <Save size={16} />
                            </button>
                            <button
                              type="button"
                              className="icon-btn"
                              onClick={cancelInlineEdit}
                              title="Cancel"
                            >
                              <X size={16} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="icon-btn"
                              onClick={() => startInlineEdit(t)}
                              title="Inline Edit"
                            >
                              <Edit3 size={16} />
                            </button>
                            <button
                              type="button"
                              className="icon-btn danger"
                              onClick={() => deleteTask(t.id)}
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
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

      <TaskModal
        isOpen={showTaskModal}
        onClose={closeTaskModal}
        onSave={onSaveTaskModal}
        editingTask={editingTask}
        presalesResources={allPresalesNames}
        taskTypes={taskTypes}
      />
    </div>
  );
}

export default PresalesOverview;
