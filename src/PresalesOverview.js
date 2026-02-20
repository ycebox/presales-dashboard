import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  AlertTriangle,
  Filter,
  Plane,
  X,
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

const snapToMonday = (d) => {
  const dd = parseDate(d);
  if (!dd) return null;
  const monday = new Date(dd);
  const day = monday.getDay();
  const diff = (day === 0 ? -6 : 1) - day; // Monday
  monday.setDate(monday.getDate() + diff);
  return monday;
};

const getWeekRanges = () => {
  const today = toMidnight(new Date());
  const thisWeekStart = snapToMonday(today);

  const thisWeekEnd = new Date(thisWeekStart);
  thisWeekEnd.setDate(thisWeekStart.getDate() + 4);

  const nextWeekStart = new Date(thisWeekStart);
  nextWeekStart.setDate(thisWeekStart.getDate() + 7);
  const nextWeekEnd = new Date(nextWeekStart);
  nextWeekEnd.setDate(nextWeekStart.getDate() + 4);

  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(thisWeekStart.getDate() - 7);
  const lastWeekEnd = new Date(lastWeekStart);
  lastWeekEnd.setDate(lastWeekStart.getDate() + 4);

  const last30Start = new Date(today);
  last30Start.setDate(today.getDate() - 30);
  const last30End = new Date(today);

  return {
    thisWeek: { start: thisWeekStart, end: thisWeekEnd },
    nextWeek: { start: nextWeekStart, end: nextWeekEnd },
    lastWeek: { start: lastWeekStart, end: lastWeekEnd },
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

const isProjectActive = (project) => {
  const cs = (project?.current_status || '').toLowerCase().trim();
  const ss = (project?.sales_stage || '').toLowerCase().trim();
  const signal = cs || ss;
  if (!signal) return true;

  const inactiveKeywords = ['archiv', 'inactive', 'closed', 'done', 'cancel', 'completed', 'on-hold', 'hold'];
  return !inactiveKeywords.some((k) => signal.includes(k));
};

const isStageAllowedForBoard = (project) => {
  const stage = (project?.sales_stage || '').toLowerCase().trim();
  const s = stage.replace(/\s+/g, '-');
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

/** ---- Long-term weekly accuracy helpers ---- */
const normalizeTaskStatus = (status) => (status || '').toLowerCase().trim();

const isCompletedStrict = (status) => normalizeTaskStatus(status) === 'completed';
const isInProgressStrict = (status) => normalizeTaskStatus(status) === 'in progress';
const isNotStartedStrict = (status) => normalizeTaskStatus(status) === 'not started';

const isCancelledOrOnHold = (status) => {
  const s = normalizeTaskStatus(status);
  // covers "Cancelled/On-hold" and also slightly different entries if someone typed it
  return s.includes('cancel') || s.includes('on-hold') || s.includes('on hold');
};

// For other parts of the page (load tables etc) keep generic completed check
const isCompletedStatus = (status) => {
  const s = normalizeTaskStatus(status);
  return s === 'completed' || s === 'done' || s === 'closed';
};

// Week overlap logic (date-based, inclusive)
const overlapsRange = (rangeStart, rangeEnd, taskStart, taskEnd) => {
  const rs = parseDate(rangeStart);
  const re = parseDate(rangeEnd);
  const ts = parseDate(taskStart);
  const te = parseDate(taskEnd);
  if (!rs || !re) return false;

  const start = ts || te || null;
  const end = te || ts || null;
  if (!start && !end) return false;

  const s = start || end;
  const e = end || start;

  return !(e.getTime() < rs.getTime() || s.getTime() > re.getTime());
};

const isDateInRange = (dateValue, rangeStart, rangeEnd) => {
  const d = parseDate(dateValue);
  const rs = parseDate(rangeStart);
  const re = parseDate(rangeEnd);
  if (!d || !rs || !re) return false;
  return d.getTime() >= rs.getTime() && d.getTime() <= re.getTime();
};

const getCompletedAt = (t) => t?.completed_at || null;

const getOngoingWindow = (t, weekStart, weekEnd) => {
  // For in-progress tasks: prefer explicit dates. If missing, use started_at as anchor.
  const start =
    t?.start_date ||
    t?.started_at || // timestamptz
    t?.due_date ||
    null;

  const end =
    t?.end_date ||
    t?.due_date ||
    null;

  // If only started_at exists and no end/due, treat as open-ended through weekEnd
  const resolvedStart = start || null;
  const resolvedEnd = end || weekEnd;

  return { start: resolvedStart, end: resolvedEnd };
};

function PresalesOverview() {
  const navigate = useNavigate();

  const weeks = useMemo(() => getWeekRanges(), []);

  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [presales, setPresales] = useState([]);
  const [taskTypes, setTaskTypes] = useState([]);
  const [scheduleRows, setScheduleRows] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Availability table range
  const [selectedRangeKey, setSelectedRangeKey] = useState('thisWeek');
  const [rangeStart, setRangeStart] = useState(weeks.thisWeek.start);
  const [rangeEnd, setRangeEnd] = useState(weeks.thisWeek.end);
  const [rangeError, setRangeError] = useState('');

  // Weekly snapshot range selector
  const [snapshotWeek, setSnapshotWeek] = useState('thisWeek'); // thisWeek | lastWeek | nextWeek | custom
  const [customWeekDate, setCustomWeekDate] = useState(ymd(weeks.thisWeek.start));

  const selectedWeekRange = useMemo(() => {
    if (snapshotWeek === 'thisWeek') return weeks.thisWeek;
    if (snapshotWeek === 'nextWeek') return weeks.nextWeek;
    if (snapshotWeek === 'lastWeek') return weeks.lastWeek;

    const d = parseDate(customWeekDate);
    const monday = snapToMonday(d);
    if (!monday) return weeks.thisWeek;

    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    return { start: monday, end: friday };
  }, [snapshotWeek, customWeekDate, weeks]);

  const selectedPrevWeek = useMemo(() => {
    const s = new Date(selectedWeekRange.start);
    s.setDate(s.getDate() - 7);
    const e = new Date(s);
    e.setDate(s.getDate() + 4);
    return { start: s, end: e };
  }, [selectedWeekRange]);

  const selectedNextWeek = useMemo(() => {
    const s = new Date(selectedWeekRange.start);
    s.setDate(s.getDate() + 7);
    const e = new Date(s);
    e.setDate(s.getDate() + 4);
    return { start: s, end: e };
  }, [selectedWeekRange]);

  // Modals
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const [dayDetailOpen, setDayDetailOpen] = useState(false);
  const [dayDetailAssignee, setDayDetailAssignee] = useState('');
  const [dayDetailDay, setDayDetailDay] = useState(null);

  // Inline edits for unassigned table
  const [inlineEditingTaskId, setInlineEditingTaskId] = useState(null);
  const [inlineDraft, setInlineDraft] = useState({});

  // Assignment Helper
  const [helperStartDate, setHelperStartDate] = useState(ymd(new Date()));
  const [helperRequiredHours, setHelperRequiredHours] = useState(DEFAULT_TASK_HOURS);
  const [helperTaskType, setHelperTaskType] = useState('');

  // Load all data
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

  // Availability range sync
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

  const projectsById = useMemo(() => {
    const map = {};
    (projects || []).forEach((p) => {
      map[p.id] = p;
    });
    return map;
  }, [projects]);

  const getProjectLabel = (task) => {
    const p = projectsById?.[task?.project_id];
    return p?.project_name || '—';
  };

  const activeProjects = useMemo(() => (projects || []).filter(isProjectActive), [projects]);

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
            if ((b.activeTaskCount || 0) !== (a.activeTaskCount || 0))
              return (b.activeTaskCount || 0) - (a.activeTaskCount || 0);
            return String(a.projectName).localeCompare(String(b.projectName));
          });

        return { assignee, projects: projList };
      });
  }, [activeProjects, tasks]);

  const openTasks = useMemo(() => (tasks || []).filter((t) => !isCompletedStatus(t?.status)), [tasks]);

  const unassignedOpenTasks = useMemo(
    () => openTasks.filter((t) => !(t?.assignee || '').trim()),
    [openTasks]
  );

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

    set.add('Unassigned');

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

        const currentStatus = map[assignee][key].status || 'free';
        const best = statusPriority(derived) > statusPriority(currentStatus) ? derived : currentStatus;
        map[assignee][key].status = best;

        cur.setDate(cur.getDate() + 1);
      }
    });

    return map;
  }, [scheduleRows]);

  const getScheduleForDay = (assignee, day) => {
    const a = (assignee || '').trim();
    const key = ymd(day);
    return scheduleLookup?.[a]?.[key] || { status: 'free', entries: [] };
  };

  const getScheduleStatusForDay = (assignee, day) => getScheduleForDay(assignee, day).status || 'free';

  // Utilization table
  const utilizationByPresales = useMemo(() => {
    const by = {};
    (allPresalesNames || []).forEach((name) => {
      if (name === 'Unassigned') return;
      by[name] = { name, taskHours: 0, capacityHours: 0, pct: 0 };
    });

    (allPresalesNames || []).forEach((name) => {
      if (name === 'Unassigned') return;
      let cap = 0;
      rangeDays.forEach((d) => {
        const status = getScheduleStatusForDay(name, d);
        cap += statusToAvailableHours(status);
      });
      if (!by[name]) by[name] = { name, taskHours: 0, capacityHours: 0, pct: 0 };
      by[name].capacityHours = Math.round(cap * 10) / 10;
    });

    (tasks || []).forEach((t) => {
      if (isCompletedStatus(t?.status)) return;

      const a = (t?.assignee || '').trim();
      if (!a) return;
      if (!by[a]) by[a] = { name: a, taskHours: 0, capacityHours: 0, pct: 0 };

      const taskStart = t?.start_date || t?.due_date || t?.end_date;
      const taskEnd = t?.end_date || t?.due_date || t?.start_date;
      const overlapDays = getOverlapDays(rangeStart, rangeEnd, taskStart, taskEnd);
      if (!overlapDays) return;

      const est = safeNumber(t?.estimated_hours, DEFAULT_TASK_HOURS);
      const mult = canonicalTypeMultiplier(t?.task_type);
      const effort = est * mult;

      const fullSpanDays = getOverlapDays(taskStart, taskEnd, taskStart, taskEnd) || overlapDays;
      const perDay = effort / Math.max(1, fullSpanDays);
      by[a].taskHours += perDay * overlapDays;
    });

    Object.keys(by).forEach((k) => {
      const cap = safeNumber(by[k].capacityHours, 0);
      const th = Math.round(safeNumber(by[k].taskHours, 0) * 10) / 10;
      by[k].taskHours = th;
      by[k].pct = cap > 0 ? Math.round((th / cap) * 100) : th > 0 ? 999 : 0;
    });

    return Object.values(by).sort((a, b) => {
      if ((b.pct || 0) !== (a.pct || 0)) return (b.pct || 0) - (a.pct || 0);
      return a.name.localeCompare(b.name);
    });
  }, [tasks, allPresalesNames, rangeStart, rangeEnd, rangeDays, scheduleLookup]);

  const getDailyLoadHours = useMemo(() => {
    return (assignee, dateValue) => {
      const a = (assignee || '').trim();
      const day = parseDate(dateValue);
      if (!a || !day) return 0;

      let sum = 0;

      (tasks || []).forEach((t) => {
        if (isCompletedStatus(t?.status)) return;
        if ((t?.assignee || '').trim() !== a) return;
        if (!isTaskOnDay(t, day)) return;

        const taskStart = t?.start_date || t?.due_date || t?.end_date || day;
        const taskEnd = t?.end_date || t?.due_date || t?.start_date || day;

        const est = safeNumber(t?.estimated_hours, DEFAULT_TASK_HOURS);
        const mult = canonicalTypeMultiplier(t?.task_type);
        const effort = est * mult;

        const spanDays = getOverlapDays(taskStart, taskEnd, taskStart, taskEnd) || 1;
        const perDay = effort / Math.max(1, spanDays);
        sum += perDay;
      });

      return Math.round(sum * 10) / 10;
    };
  }, [tasks]);

  /** ✅ Assignment Helper table (was missing in the uploaded file) */
  const helperTable = useMemo(() => {
    const day = parseDate(helperStartDate);
    const requiredBase = safeNumber(helperRequiredHours, DEFAULT_TASK_HOURS);
    const mult = canonicalTypeMultiplier(helperTaskType);
    const required = Math.round(requiredBase * mult * 10) / 10;

    if (!day || required <= 0) {
      return { required: required || 0, rows: [] };
    }

    const candidates = (allPresalesNames || []).filter((n) => n && n !== 'Unassigned');

    const rows = candidates
      .map((name) => {
        const status = getScheduleStatusForDay(name, day);
        const capacity = statusToAvailableHours(status);
        const load = getDailyLoadHours(name, day);
        const remaining = Math.round((capacity - load) * 10) / 10;

        return {
          name,
          status,
          capacity: Math.round(capacity * 10) / 10,
          load,
          remaining,
          canTake: capacity > 0 && remaining >= required,
        };
      })
      .filter((r) => r.canTake)
      .sort((a, b) => {
        if (b.remaining !== a.remaining) return b.remaining - a.remaining;
        return a.name.localeCompare(b.name);
      });

    return { required, rows };
  }, [helperStartDate, helperRequiredHours, helperTaskType, allPresalesNames, scheduleLookup, tasks, getDailyLoadHours]);

  // ✅ Weekly snapshot per presales (selected week + prev + next) — LONG-TERM accurate version
  const weeklySnapshot = useMemo(() => {
    const map = {};
    const ensure = (assignee) => {
      if (!map[assignee]) {
        map[assignee] = { assignee, thisWeek: [], completedPrevWeek: [], nextWeek: [] };
      }
      return map[assignee];
    };

    const weekStart = selectedWeekRange.start;
    const weekEnd = selectedWeekRange.end;

    (tasks || []).forEach((t) => {
      const status = t?.status || '';
      const assignee = (t?.assignee || '').trim() || 'Unassigned';
      const bucket = ensure(assignee);

      // Exclude cancelled/on-hold from weekly buckets (no movement)
      if (isCancelledOrOnHold(status)) return;

      // 1) Completed previous week (strict + accurate): status Completed AND completed_at inside prev week
      if (isCompletedStrict(status)) {
        const completedAt = getCompletedAt(t);
        if (completedAt && isDateInRange(completedAt, selectedPrevWeek.start, selectedPrevWeek.end)) {
          bucket.completedPrevWeek.push(t);
        }
        return; // completed tasks won't appear in "ongoing/coming"
      }

      // 2) Doing this selected week
      // - In Progress: overlaps week (start/end) with started_at fallback
      // - Not Started: due_date inside this week (as you requested)
      if (isInProgressStrict(status)) {
        const window = getOngoingWindow(t, weekStart, weekEnd);
        if (overlapsRange(weekStart, weekEnd, window.start, window.end)) {
          bucket.thisWeek.push(t);
        }
      } else if (isNotStartedStrict(status)) {
        // Due this week -> show it as "doing/planned this week"
        if (t?.due_date && isDateInRange(t.due_date, weekStart, weekEnd)) {
          bucket.thisWeek.push(t);
        } else if (t?.start_date && isDateInRange(t.start_date, weekStart, weekEnd)) {
          // also include if explicitly scheduled to start this week
          bucket.thisWeek.push(t);
        }
      }

      // 3) Coming next week (clean):
      // Not Started tasks that start next week, fallback to due_date next week if no start_date.
      if (isNotStartedStrict(status)) {
        const hasStart = !!t?.start_date;
        const startInNext = hasStart && isDateInRange(t.start_date, selectedNextWeek.start, selectedNextWeek.end);
        const dueInNext =
          !hasStart && t?.due_date && isDateInRange(t.due_date, selectedNextWeek.start, selectedNextWeek.end);

        if (startInNext || dueInNext) {
          bucket.nextWeek.push(t);
        }
      }
    });

    const sorter = (a, b) => {
      const ad = parseDate(a?.due_date)?.getTime() ?? Number.POSITIVE_INFINITY;
      const bd = parseDate(b?.due_date)?.getTime() ?? Number.POSITIVE_INFINITY;
      if (ad !== bd) return ad - bd;
      return String(a?.description || '').localeCompare(String(b?.description || ''));
    };

    Object.values(map).forEach((row) => {
      row.thisWeek.sort(sorter);
      row.completedPrevWeek.sort(sorter);
      row.nextWeek.sort(sorter);
    });

    return Object.values(map)
      .filter((r) => r.thisWeek.length || r.completedPrevWeek.length || r.nextWeek.length)
      .sort((a, b) => a.assignee.localeCompare(b.assignee));
  }, [tasks, selectedWeekRange, selectedPrevWeek, selectedNextWeek]);

  // Day detail: tasks + schedule entries
  const dayDetailSchedule = useMemo(() => {
    if (!dayDetailOpen || !dayDetailAssignee || !dayDetailDay) return { status: 'free', entries: [] };
    return getScheduleForDay(dayDetailAssignee, dayDetailDay);
  }, [dayDetailOpen, dayDetailAssignee, dayDetailDay, scheduleLookup]);

  const tasksForDayAndAssignee = useMemo(() => {
    if (!dayDetailOpen || !dayDetailAssignee || !dayDetailDay) return [];
    const list = (tasks || []).filter((t) => (t?.assignee || '').trim() === dayDetailAssignee);
    return list.filter((t) => isTaskOnDay(t, dayDetailDay) && !isCompletedStatus(t?.status));
  }, [dayDetailOpen, dayDetailAssignee, dayDetailDay, tasks]);

  const openDayDetail = (assignee, day) => {
    setDayDetailAssignee((assignee || '').trim());
    setDayDetailDay(day);
    setDayDetailOpen(true);
  };

  const closeDayDetail = () => {
    setDayDetailOpen(false);
    setDayDetailAssignee('');
    setDayDetailDay(null);
  };

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

  const startInlineEdit = (t) => {
    setInlineEditingTaskId(t.id);
    setInlineDraft({
      description: t.description || '',
      status: t.status || '',
      due_date: t.due_date || '',
      assignee: (t.assignee || '').trim(),
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
            <p>Weekly tasks, active projects, workload, availability, and assignment helper.</p>
          </div>
        </div>
      </header>

      {/* ✅ WEEKLY TASK VIEW */}
      <section className="presales-crunch-section">
        <div className="presales-panel presales-panel-large">
          <div className="presales-panel-header">
            <div>
              <h3>
                <CalendarDays size={18} className="panel-icon" />
                Weekly task view
              </h3>
              <p>
                Selected week ({formatShortDate(selectedWeekRange.start)} to {formatShortDate(selectedWeekRange.end)}),
                completed from previous week, and tasks coming next week.
              </p>
            </div>

            <div className="panel-actions">
              <div className="field compact">
                <label>Week</label>
                <select value={snapshotWeek} onChange={(e) => setSnapshotWeek(e.target.value)}>
                  <option value="thisWeek">This week</option>
                  <option value="lastWeek">Last week</option>
                  <option value="nextWeek">Next week</option>
                  <option value="custom">Pick a date</option>
                </select>
              </div>

              <div className="field compact">
                <label>Custom date</label>
                <input
                  type="date"
                  value={customWeekDate || ''}
                  onChange={(e) => setCustomWeekDate(e.target.value)}
                  disabled={snapshotWeek !== 'custom'}
                />
              </div>
            </div>
          </div>

          {weeklySnapshot.length === 0 ? (
            <div className="presales-empty small">
              <p>No tasks found for these weekly buckets.</p>
            </div>
          ) : (
            <div className="weekly-grid">
              {weeklySnapshot.map((row) => (
                <div key={row.assignee} className="weekly-presales-card">
                  <div className="weekly-presales-header">
                    <div className="weekly-name" title={row.assignee}>
                      {row.assignee}
                    </div>
                    <div className="weekly-mini">
                      {row.thisWeek.length + row.completedPrevWeek.length + row.nextWeek.length} items
                    </div>
                  </div>

                  <div className="weekly-columns">
                    {/* 1) This week */}
                    <div className="weekly-col">
                      <div className="weekly-col-head">
                        <span>Doing this week</span>
                        <span className="weekly-badge">{row.thisWeek.length}</span>
                      </div>
                      <div className="weekly-list">
                        {row.thisWeek.length === 0 ? (
                          <div className="weekly-empty">No tasks.</div>
                        ) : (
                          row.thisWeek.map((t) => (
                            <button key={t.id} type="button" className="weekly-item" onClick={() => openEditTask(t)}>
                              <div className="weekly-item-title">{t.description || '(Untitled task)'}</div>
                              <div className="weekly-item-sub">
                                <span className="td-ellipsis" title={getProjectLabel(t)}>
                                  {getProjectLabel(t)}
                                </span>
                                <span className="dot">•</span>
                                <span>Due {formatShortDate(t.due_date)}</span>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>

                    {/* 2) Completed previous week */}
                    <div className="weekly-col weekly-col-done">
                      <div className="weekly-col-head">
                        <span>Completed last week</span>
                        <span className="weekly-badge">{row.completedPrevWeek.length}</span>
                      </div>
                      <div className="weekly-list">
                        {row.completedPrevWeek.length === 0 ? (
                          <div className="weekly-empty">None completed.</div>
                        ) : (
                          row.completedPrevWeek.map((t) => (
                            <button key={t.id} type="button" className="weekly-item" onClick={() => openEditTask(t)}>
                              <div className="weekly-item-title">{t.description || '(Untitled task)'}</div>
                              <div className="weekly-item-sub">
                                <span className="td-ellipsis" title={getProjectLabel(t)}>
                                  {getProjectLabel(t)}
                                </span>
                                <span className="dot">•</span>
                                <span>Done {formatShortDate(getCompletedAt(t))}</span>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>

                    {/* 3) Next week */}
                    <div className="weekly-col weekly-col-next">
                      <div className="weekly-col-head">
                        <span>Coming next week</span>
                        <span className="weekly-badge">{row.nextWeek.length}</span>
                      </div>
                      <div className="weekly-list">
                        {row.nextWeek.length === 0 ? (
                          <div className="weekly-empty">No upcoming tasks.</div>
                        ) : (
                          row.nextWeek.map((t) => (
                            <button key={t.id} type="button" className="weekly-item" onClick={() => openEditTask(t)}>
                              <div className="weekly-item-title">{t.description || '(Untitled task)'}</div>
                              <div className="weekly-item-sub">
                                <span className="td-ellipsis" title={getProjectLabel(t)}>
                                  {getProjectLabel(t)}
                                </span>
                                <span className="dot">•</span>
                                <span>Due {formatShortDate(t.due_date)}</span>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ padding: '0 12px 12px', fontSize: 12, color: 'rgba(15,23,42,0.65)' }}>
                    Tip: Click a task to edit. “Completed last week” uses completed_at (DB) for accuracy.
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ACTIVE PROJECTS BOARD */}
      <section className="presales-crunch-section">
        <div className="presales-panel presales-panel-large">
          <div className="presales-panel-header">
            <div>
              <h3>
                <Users size={18} className="panel-icon" />
                Active projects by presales
              </h3>
              <p>Grouped by primary presales. Excludes: closed-lost, close-won, on-hold, cancelled.</p>
            </div>
          </div>

          {activeProjectsByPresales.length === 0 ? (
            <div className="presales-empty small">
              <p>No matching projects found.</p>
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

                  <div className="presales-board-cards presales-board-cards-scroll">
                    {g.projects.map((p) => (
                      <div key={p.projectId} className="presales-board-card">
                        <button
                          type="button"
                          className="table-link-btn project-link board-project-link"
                          onClick={() => navigate(`/project/${p.projectId}`)}
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

      {/* AVAILABILITY + LOAD + HELPER */}
      <section className="presales-crunch-section">
        <div className="presales-panel presales-panel-large">
          <div className="presales-panel-header">
            <div>
              <h3>
                <Filter size={18} className="panel-icon" />
                Availability and load
              </h3>
              <p>Click a dot to see schedule entries and tasks for that day.</p>
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
            <>
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
                      {utilizationByPresales.map((u) => (
                        <tr key={u.name}>
                          <td className="sticky-col assignee-cell">{u.name}</td>

                          {rangeDays.map((d) => {
                            const status = getScheduleStatusForDay(u.name, d);
                            return (
                              <td
                                key={`${u.name}-${ymd(d)}`}
                                className={`avail-cell ${status}`}
                                onClick={() => openDayDetail(u.name, d)}
                                title="Click to view schedule + tasks"
                              >
                                <div className="avail-dot" />
                              </td>
                            );
                          })}

                          <td title={`Task hours: ${u.taskHours}h | Capacity: ${u.capacityHours}h`}>
                            {Math.round(u.taskHours)}h ({u.pct}%)
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Assignment Helper */}
              <div className="assignment-helper">
                <div className="presales-panel-header" style={{ borderTop: '1px solid rgba(15,23,42,0.08)' }}>
                  <div>
                    <h3>
                      <Users size={18} className="panel-icon" />
                      Assignment Helper
                    </h3>
                    <p>Shows only presales who can take the task on the selected start date.</p>
                  </div>
                </div>

                <div className="assignment-helper-controls">
                  <div className="field">
                    <label>Start date</label>
                    <input type="date" value={helperStartDate || ''} onChange={(e) => setHelperStartDate(e.target.value)} />
                  </div>

                  <div className="field">
                    <label>Required hours (base)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={helperRequiredHours}
                      onChange={(e) => setHelperRequiredHours(e.target.value)}
                    />
                  </div>

                  <div className="field">
                    <label>Task type</label>
                    <select value={helperTaskType} onChange={(e) => setHelperTaskType(e.target.value)}>
                      <option value="">(No type)</option>
                      {(taskTypes || []).map((x) => (
                        <option key={x} value={x}>
                          {x}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="assignment-helper-results">
                  <div className="helper-note">
                    Required effort (after multiplier): <b>{helperTable.required}h</b>
                  </div>

                  {helperTable.rows.length === 0 ? (
                    <div className="presales-empty small">
                      <p>No available presales found for that date.</p>
                    </div>
                  ) : (
                    <div className="unassigned-tasks-table-wrapper">
                      <table className="unassigned-tasks-table">
                        <thead>
                          <tr>
                            <th>Presales</th>
                            <th>Status</th>
                            <th>Capacity (hrs)</th>
                            <th>Load (hrs)</th>
                            <th>Remaining (hrs)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {helperTable.rows.map((r) => (
                            <tr key={r.name}>
                              <td className="td-ellipsis" title={r.name}>
                                {r.name}
                              </td>
                              <td className="td-ellipsis" title={r.status}>
                                {prettyStatus(r.status)}
                              </td>
                              <td>{r.capacity}</td>
                              <td>{r.load}</td>
                              <td>{r.remaining}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Unassigned tasks */}
              <div className="presales-panel-header" style={{ borderTop: '1px solid rgba(15,23,42,0.08)' }}>
                <div>
                  <h3>
                    <CalendarDays size={18} className="panel-icon" />
                    Unassigned open tasks
                  </h3>
                  <p>Assign these so they reflect in load and helper calculations.</p>
                </div>

                <button type="button" className="btn-primary" onClick={openNewTask}>
                  + Add task
                </button>
              </div>

              {unassignedOpenTasks.length === 0 ? (
                <div className="presales-empty">
                  <p>No unassigned open tasks.</p>
                </div>
              ) : (
                <div className="unassigned-tasks-table-wrapper">
                  <table className="unassigned-tasks-table">
                    <thead>
                      <tr>
                        <th>Task</th>
                        <th>Project</th>
                        <th>Status</th>
                        <th>Type</th>
                        <th>Due</th>
                        <th className="actions-cell">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {unassignedOpenTasks.map((t) => {
                        const isEditing = inlineEditingTaskId === t.id;

                        return (
                          <tr key={t.id}>
                            <td>
                              {isEditing ? (
                                <input
                                  value={inlineDraft.description || ''}
                                  onChange={(e) => setInlineDraft((p) => ({ ...p, description: e.target.value }))}
                                />
                              ) : (
                                <button type="button" className="unassigned-task-link" onClick={() => openEditTask(t)}>
                                  {t.description || '(Untitled task)'}
                                </button>
                              )}
                            </td>

                            <td className="td-ellipsis" title={getProjectLabel(t)}>
                              {getProjectLabel(t)}
                            </td>

                            <td>
                              {isEditing ? (
                                <input
                                  value={inlineDraft.status || ''}
                                  onChange={(e) => setInlineDraft((p) => ({ ...p, status: e.target.value }))}
                                />
                              ) : (
                                t.status || '-'
                              )}
                            </td>

                            <td>
                              {isEditing ? (
                                <select
                                  value={inlineDraft.task_type || ''}
                                  onChange={(e) => setInlineDraft((p) => ({ ...p, task_type: e.target.value }))}
                                >
                                  <option value="">-</option>
                                  {(taskTypes || []).map((x) => (
                                    <option key={x} value={x}>
                                      {x}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                t.task_type || '-'
                              )}
                            </td>

                            <td>
                              {isEditing ? (
                                <input
                                  type="date"
                                  value={inlineDraft.due_date || ''}
                                  onChange={(e) => setInlineDraft((p) => ({ ...p, due_date: e.target.value }))}
                                />
                              ) : (
                                formatShortDate(t.due_date)
                              )}
                            </td>

                            <td className="actions-cell">
                              {isEditing ? (
                                <>
                                  <button type="button" className="icon-btn" title="Save" onClick={() => saveInlineEdit(t.id)}>
                                    <Save size={16} />
                                  </button>
                                  <button type="button" className="icon-btn" title="Cancel" onClick={cancelInlineEdit}>
                                    <X size={16} />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button type="button" className="icon-btn" title="Edit" onClick={() => startInlineEdit(t)}>
                                    <Edit3 size={16} />
                                  </button>
                                  <button type="button" className="icon-btn danger" title="Delete" onClick={() => deleteTask(t.id)}>
                                    <Trash2 size={16} />
                                  </button>
                                </>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Day detail modal (Schedule + Tasks) */}
      {dayDetailOpen ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true" onMouseDown={closeDayDetail}>
          <div className="modal-card modal-wide" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <Plane size={16} />
                {dayDetailAssignee} •{' '}
                {dayDetailDay
                  ? dayDetailDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  : ''}
              </h3>
              <button type="button" className="icon-btn" onClick={closeDayDetail} aria-label="Close">
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              <div className="daydetail-grid">
                <div>
                  <div className="daydetail-title">Schedule</div>
                  <div className="daydetail-schedule">
                    <div style={{ fontSize: 13, marginBottom: 8 }}>
                      Status: <b>{prettyStatus(dayDetailSchedule.status)}</b>
                    </div>

                    {dayDetailSchedule.entries?.length ? (
                      <div className="daydetail-list">
                        {dayDetailSchedule.entries.map((e, idx) => (
                          <div key={`${e.type}-${idx}`} className="daydetail-item" style={{ cursor: 'default' }}>
                            <div className="daydetail-item-title">{e.type || 'Schedule item'}</div>
                            <div className="daydetail-item-sub">
                              <span>{e.note || '—'}</span>
                              {safeNumber(e.block_hours, 0) ? (
                                <>
                                  <span className="dot">•</span>
                                  <span>{e.block_hours}h</span>
                                </>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="presales-empty small">
                        <p>No schedule entry for this day.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="daydetail-title">Assigned tasks on this day</div>
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
                            <span className="td-ellipsis" title={getProjectLabel(t)}>
                              {getProjectLabel(t)}
                            </span>
                            <span className="dot">•</span>
                            <span>Due: {formatShortDate(t.due_date)}</span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
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

      <TaskModal
        isOpen={showTaskModal}
        onClose={closeTaskModal}
        onSave={onSaveTaskModal}
        editingTask={editingTask}
        presalesResources={allPresalesNames.filter((x) => x !== 'Unassigned')}
        taskTypes={taskTypes}
      />
    </div>
  );
}

export default PresalesOverview;
