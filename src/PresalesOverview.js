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

// For in-progress overlap checks, prefer explicit dates. If missing, use started_at.
const getOngoingWindow = (t, weekEnd) => {
  const start = t?.start_date || t?.started_at || t?.due_date || null;
  const end = t?.end_date || t?.due_date || null;

  const resolvedStart = start || null;
  const resolvedEnd = end || weekEnd; // open-ended through week end

  return { start: resolvedStart, end: resolvedEnd };
};

/** ---- Workday-based time progress (approximation) ---- */
const isWeekday = (dateObj) => {
  const d = dateObj?.getDay?.();
  return d !== 0 && d !== 6; // Mon-Fri
};

const workdaysBetweenInclusive = (startValue, endValue) => {
  const s = parseDate(startValue);
  const e = parseDate(endValue);
  if (!s || !e) return 0;
  if (s.getTime() > e.getTime()) return 0;

  let count = 0;
  const cur = new Date(s);
  while (cur.getTime() <= e.getTime()) {
    if (isWeekday(cur)) count += 1;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
};

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

const getTimeProgressPct = (task, asOfValue) => {
  if (isCompletedStrict(task?.status)) return 100;
  if (isCancelledOrOnHold(task?.status)) return null;

  const startAnchor = task?.start_date || task?.started_at || null;
  const endAnchor = task?.end_date || task?.due_date || null;
  if (!startAnchor || !endAnchor) return null;

  const start = parseDate(startAnchor);
  const end = parseDate(endAnchor);
  if (!start || !end) return null;
  if (start.getTime() > end.getTime()) return null;

  const asOf = parseDate(asOfValue);
  if (!asOf) return null;

  if (asOf.getTime() < start.getTime()) return 0;

  const cappedAsOf = asOf.getTime() > end.getTime() ? end : asOf;

  const total = workdaysBetweenInclusive(start, end);
  if (total <= 0) {
    return asOf.getTime() >= end.getTime() ? 100 : 0;
  }

  const elapsed = workdaysBetweenInclusive(start, cappedAsOf);
  const pct = Math.round((elapsed / total) * 100);
  return clamp(pct, 0, 100);
};

// helper: remaining -> color class
const remainingToClass = (remaining) => {
  const r = safeNumber(remaining, 0);
  if (r <= 0) return 'is-red';
  if (r < 6) return 'is-orange';
  return 'is-green';
};

// ✅ NEW: only allow real IDs in /customer/:id route
const isValidCustomerId = (id) => {
  const s = String(id || '').trim();
  if (!s) return false;

  // UUID (Supabase default)
  const uuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  // If you ever use numeric IDs, keep this too
  const numeric = /^\d+$/;

  return uuid.test(s) || numeric.test(s);
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

  // Add schedule entry (leave/travel/etc.) in Day Detail modal
  const [newScheduleType, setNewScheduleType] = useState('');
  const [newScheduleHours, setNewScheduleHours] = useState('');
  const [newScheduleNote, setNewScheduleNote] = useState('');
  const [scheduleSaving, setScheduleSaving] = useState(false);

  // Inline edits for unassigned table
  const [inlineEditingTaskId, setInlineEditingTaskId] = useState(null);
  const [inlineDraft, setInlineDraft] = useState({});

  // Assignment Helper
  const [helperStartDate, setHelperStartDate] = useState(ymd(new Date()));
  const [helperRequiredHours, setHelperRequiredHours] = useState(DEFAULT_TASK_HOURS);
  const [helperTaskType, setHelperTaskType] = useState('');

  // Active projects board collapse state (collapsed by default)
  const [expandedPresales, setExpandedPresales] = useState(() => new Set());

  const togglePresalesExpanded = (assignee) => {
    setExpandedPresales((prev) => {
      const next = new Set(prev);
      if (next.has(assignee)) next.delete(assignee);
      else next.add(assignee);
      return next;
    });
  };

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

  // customer label for weekly view
  const getCustomerLabel = (task) => {
    const p = projectsById?.[task?.project_id];
    return p?.customer_name || '-';
  };

  // ✅ FIXED: Only navigate when we have a valid customer_id
  // If missing/invalid, return null so we render plain text (no broken navigation).
  const getCustomerNavTarget = (task) => {
    const p = projectsById?.[task?.project_id];
    const cid = p?.customer_id;
    if (!isValidCustomerId(cid)) return null;
    return `/customer/${String(cid).trim()}`;
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

  /** Assignment Helper table */
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

  // Weekly snapshot per presales
  const weeklySnapshot = useMemo(() => {
    const map = {};
    const ensure = (assignee) => {
      if (!map[assignee]) {
        map[assignee] = {
          assignee,
          thisWeek: [],
          nextWeek: [],
          activitiesLastWeek: {
            completed: [],
            started: [],
            carriedOver: [],
          },
        };
      }
      return map[assignee];
    };

    const weekStart = selectedWeekRange.start;
    const weekEnd = selectedWeekRange.end;

    const prevStart = selectedPrevWeek.start;
    const prevEnd = selectedPrevWeek.end;

    const nextStart = selectedNextWeek.start;
    const nextEnd = selectedNextWeek.end;

    const addUnique = (arr, set, task) => {
      if (!task?.id) return;
      if (set.has(task.id)) return;
      set.add(task.id);
      arr.push(task);
    };

    (tasks || []).forEach((t) => {
      const status = t?.status || '';
      const assignee = (t?.assignee || '').trim() || 'Unassigned';
      const bucket = ensure(assignee);

      if (isCancelledOrOnHold(status)) return;

      if (!bucket._activitiesSet) bucket._activitiesSet = new Set();

      if (isCompletedStrict(status)) {
        const completedAt = getCompletedAt(t);
        if (completedAt && isDateInRange(completedAt, prevStart, prevEnd)) {
          addUnique(bucket.activitiesLastWeek.completed, bucket._activitiesSet, t);
        }
        return;
      }

      const startedSignal = t?.started_at || t?.start_date || null;
      const startedInPrev = startedSignal ? isDateInRange(startedSignal, prevStart, prevEnd) : false;

      if (startedInPrev) {
        addUnique(bucket.activitiesLastWeek.started, bucket._activitiesSet, t);
      } else {
        if (isInProgressStrict(status)) {
          const win = getOngoingWindow(t, prevEnd);
          const overlapsPrev = overlapsRange(prevStart, prevEnd, win.start, win.end);

          const startedAnchor = parseDate(t?.start_date || t?.started_at || null);
          const startedBeforePrev = startedAnchor ? startedAnchor.getTime() < parseDate(prevStart).getTime() : false;

          if (overlapsPrev && startedBeforePrev) {
            addUnique(bucket.activitiesLastWeek.carriedOver, bucket._activitiesSet, t);
          }
        }
      }

      if (isInProgressStrict(status)) {
        const win = getOngoingWindow(t, weekEnd);
        if (overlapsRange(weekStart, weekEnd, win.start, win.end)) {
          bucket.thisWeek.push(t);
        }
      } else if (isNotStartedStrict(status)) {
        const dueInWeek = t?.due_date && isDateInRange(t.due_date, weekStart, weekEnd);
        const startInWeek = t?.start_date && isDateInRange(t.start_date, weekStart, weekEnd);
        if (dueInWeek || startInWeek) {
          bucket.thisWeek.push(t);
        }
      }

      if (isNotStartedStrict(status)) {
        const hasStart = !!t?.start_date;
        const startInNext = hasStart && isDateInRange(t.start_date, nextStart, nextEnd);
        const dueInNext = !hasStart && t?.due_date && isDateInRange(t.due_date, nextStart, nextEnd);
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
      row.nextWeek.sort(sorter);

      row.activitiesLastWeek.completed.sort(sorter);
      row.activitiesLastWeek.started.sort(sorter);
      row.activitiesLastWeek.carriedOver.sort(sorter);

      delete row._activitiesSet;
    });

    return Object.values(map)
      .filter((r) => {
        const a = r.activitiesLastWeek;
        return (
          r.thisWeek.length ||
          r.nextWeek.length ||
          a.completed.length ||
          a.started.length ||
          a.carriedOver.length
        );
      })
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

    // reset add-schedule controls
    setNewScheduleType('');
    setNewScheduleHours('');
    setNewScheduleNote('');
  };

  const closeDayDetail = () => {
    setDayDetailOpen(false);
    setDayDetailAssignee('');
    setDayDetailDay(null);

    // reset add-schedule controls
    setNewScheduleType('');
    setNewScheduleHours('');
    setNewScheduleNote('');
    setScheduleSaving(false);
  };

  const handleAddSchedule = async () => {
    try {
      if (!dayDetailAssignee || dayDetailAssignee === 'Unassigned') return;
      if (!dayDetailDay) return;
      if (!newScheduleType) return;

      setScheduleSaving(true);

      const payload = {
        assignee: dayDetailAssignee,
        type: newScheduleType,
        block_hours: newScheduleHours === '' ? null : Number(newScheduleHours),
        note: newScheduleNote ? newScheduleNote : null,
        start_date: ymd(dayDetailDay),
        end_date: ymd(dayDetailDay),
      };

      const { data, error } = await supabase
        .from('presales_schedule')
        .insert([payload])
        .select('*')
        .single();

      if (error) throw error;

      // update local cache so availability grid reflects immediately
      setScheduleRows((prev) => [data, ...(prev || [])]);

      setNewScheduleType('');
      setNewScheduleHours('');
      setNewScheduleNote('');
    } catch (e) {
      console.error('Add schedule error:', e);
      alert('Failed to add schedule: ' + (e?.message || 'Unknown error'));
    } finally {
      setScheduleSaving(false);
    }
  };


  const openEditTask = (t) => {
    setEditingTask(t);
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

  // For Activities last week % progress, use "as of" prev week Friday
  const activitiesAsOf = selectedPrevWeek.end;

  const renderWeeklyItem = (t, showDoneLabel = false, doneDateValue = null, showTimeProgress = false) => {
    const pct = showTimeProgress ? getTimeProgressPct(t, activitiesAsOf) : null;

    const customer = getCustomerLabel(t);
    const project = getProjectLabel(t);

    // ✅ FIXED: if no valid customer_id, don't navigate (render as plain text)
    const customerTarget = getCustomerNavTarget(t);

    return (
      <button key={t.id} type="button" className="weekly-item" onClick={() => openEditTask(t)}>
        <div className="weekly-item-title-row">
          <div className="weekly-item-title td-ellipsis">{t.description || '(Untitled task)'}</div>
          {showTimeProgress && pct !== null ? (
            <span className="weekly-progress-badge" title="Time progress (approx)">
              {pct}%
            </span>
          ) : null}
        </div>

        <div className="weekly-item-sub">
          {customerTarget ? (
            <button
              type="button"
              className="weekly-customer-link td-ellipsis"
              title={customer}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                navigate(customerTarget);
              }}
            >
              {customer}
            </button>
          ) : (
            <span className="weekly-sub-customer td-ellipsis" title={customer}>
              {customer}
            </span>
          )}

          <span className="dot">•</span>
          <span className="td-ellipsis weekly-sub-project" title={project}>
            {project}
          </span>
          <span className="dot">•</span>

          {showDoneLabel ? (
            <span className="weekly-sub-date">Done {formatShortDate(doneDateValue)}</span>
          ) : (
            <span className="weekly-sub-date">Due {formatShortDate(t.due_date)}</span>
          )}
        </div>
      </button>
    );
  };

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

      {/* WEEKLY TASK VIEW */}
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
                activities last week (includes carried over), and tasks coming next week.
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
              {weeklySnapshot.map((row) => {
                const act = row.activitiesLastWeek || { completed: [], started: [], carriedOver: [] };
                const activitiesCount = act.completed.length + act.started.length + act.carriedOver.length;

                return (
                  <div key={row.assignee} className="weekly-presales-card">
                    <div className="weekly-presales-header">
                      <div className="weekly-name" title={row.assignee}>
                        {row.assignee}
                      </div>
                    </div>

                    <div className="weekly-columns">
                      <div className="weekly-col">
                        <div className="weekly-col-head">
                          <span>Doing this week</span>
                          <span className="weekly-badge">{row.thisWeek.length}</span>
                        </div>
                        <div className="weekly-list">
                          {row.thisWeek.length === 0 ? (
                            <div className="weekly-empty">No tasks.</div>
                          ) : (
                            row.thisWeek.map((t) => renderWeeklyItem(t, false, null, false))
                          )}
                        </div>
                      </div>

                      <div className="weekly-col weekly-col-done">
                        <div className="weekly-col-head">
                          <span>Activities last week</span>
                          <span className="weekly-badge">{activitiesCount}</span>
                        </div>

                        <div className="weekly-list">
                          {activitiesCount === 0 ? (
                            <div className="weekly-empty">No activity.</div>
                          ) : (
                            <>
                              {act.completed.length ? (
                                <>
                                  <div className="weekly-subhead">Completed</div>
                                  {act.completed.map((t) => renderWeeklyItem(t, true, getCompletedAt(t), true))}
                                </>
                              ) : null}

                              {act.started.length ? (
                                <>
                                  <div className="weekly-subhead">Started</div>
                                  {act.started.map((t) => renderWeeklyItem(t, false, null, true))}
                                </>
                              ) : null}

                              {act.carriedOver.length ? (
                                <>
                                  <div className="weekly-subhead">Carried over</div>
                                  {act.carriedOver.map((t) => renderWeeklyItem(t, false, null, true))}
                                </>
                              ) : null}
                            </>
                          )}
                        </div>
                      </div>

                      <div className="weekly-col weekly-col-next">
                        <div className="weekly-col-head">
                          <span>Coming next week</span>
                          <span className="weekly-badge">{row.nextWeek.length}</span>
                        </div>
                        <div className="weekly-list">
                          {row.nextWeek.length === 0 ? (
                            <div className="weekly-empty">No upcoming tasks.</div>
                          ) : (
                            row.nextWeek.map((t) => renderWeeklyItem(t, false, null, false))
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="weekly-tip">
                      Tip: “Activities last week” includes completed, started, and carried-over work. Progress % is time-based
                      (workdays elapsed vs planned window).
                    </div>
                  </div>
                );
              })}
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
              {activeProjectsByPresales.map((g) => {
                const totalActiveTasks = g.projects.reduce((sum, p) => sum + (p.activeTaskCount || 0), 0);
                const isExpanded = expandedPresales.has(g.assignee);

                return (
                  <div key={g.assignee} className={`presales-board-column ${isExpanded ? 'expanded' : 'collapsed'}`}>
                    {/* clickable header */}
                    <button
                      type="button"
                      className="presales-board-header presales-board-header-toggle"
                      onClick={() => togglePresalesExpanded(g.assignee)}
                      aria-expanded={isExpanded}
                      title="Click to expand/collapse"
                    >
                      <div className="presales-board-header-left">
                        <span className="td-ellipsis presales-board-name" title={g.assignee}>
                          {g.assignee}
                        </span>
                        <span className="presales-board-caret">{isExpanded ? '▾' : '▸'}</span>
                      </div>

                      <div className="presales-board-metrics">
                        <div className="metric">
                          <div className="metric-value">{g.projects.length}</div>
                          <div className="metric-label">Projects</div>
                        </div>
                        <div className="metric">
                          <div className="metric-value">{totalActiveTasks}</div>
                          <div className="metric-label">Active tasks</div>
                        </div>
                      </div>
                    </button>

                    {isExpanded ? (
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
                    ) : (
                      <div className="presales-board-collapsed-hint">Click to show projects</div>
                    )}
                  </div>
                );
              })}
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
                              <td className={`helper-remaining ${remainingToClass(r.remaining)}`}>{r.remaining}</td>
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

                {/* removed + Add task button */}
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

                    {/* Add schedule entry */}
                    <div className="schedule-add-box">
                      <div className="schedule-add-title">Add leave / activity</div>
                      <div className="schedule-add-row">
                        <select
                          value={newScheduleType}
                          onChange={(e) => setNewScheduleType(e.target.value)}
                          aria-label="Schedule type"
                        >
                          <option value="">Select type</option>
                          <option value="Leave">Leave</option>
                          <option value="Travel">Travel / Trip</option>
                          <option value="Holiday">Holiday</option>
                          <option value="Training">Training</option>
                          <option value="Busy">Blocked</option>
                          <option value="Internal">Internal</option>
                          <option value="Other">Other</option>
                        </select>

                        <input
                          type="number"
                          min="0"
                          max="8"
                          step="0.5"
                          placeholder="Hours"
                          value={newScheduleHours}
                          onChange={(e) => setNewScheduleHours(e.target.value)}
                          aria-label="Blocked hours"
                        />

                        <input
                          type="text"
                          placeholder="Note"
                          value={newScheduleNote}
                          onChange={(e) => setNewScheduleNote(e.target.value)}
                          aria-label="Note"
                        />

                        <button
                          type="button"
                          className="btn-primary"
                          onClick={handleAddSchedule}
                          disabled={scheduleSaving || !newScheduleType}
                          title={dayDetailAssignee === 'Unassigned' ? 'Select a presales row (not Unassigned)' : 'Add schedule'}
                        >
                          {scheduleSaving ? 'Adding…' : 'Add'}
                        </button>
                      </div>

                      <div className="schedule-add-hint">
                        Tip: Leave/Travel/Training/Holiday = 0h capacity. Blocked = 2h capacity. Internal/Other = 4h.
                      </div>
                    </div>
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
