// ReportsDashboard.js
import React, { useEffect, useMemo, useState } from 'react';
import {
  FaChartLine,
  FaDollarSign,
  FaFlag,
  FaFileExcel,
  FaGlobeAsia,
  FaTasks,
  FaTrophy,
  FaExclamationTriangle,
  FaSyncAlt,
  FaListAlt
} from 'react-icons/fa';
import { supabase } from './supabaseClient';
import './ReportsDashboard.css';
import * as XLSX from 'xlsx';

// Charts
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  PieChart,
  Pie,
  ComposedChart,
  Line,
  Legend
} from 'recharts';

const CLOSED_STAGES_FOR_PIPELINE = [
  'Closed-Won',
  'Closed-Lost',
  'Closed-Cancelled/Hold',
  'Done'
];

const WON_STAGES = ['Closed-Won', 'Won'];
const LOST_STAGES = ['Closed-Lost', 'Lost'];

const PASTEL_BAR_COLORS = [
  'rgba(59, 130, 246, 0.45)',
  'rgba(14, 165, 233, 0.45)',
  'rgba(99, 102, 241, 0.42)',
  'rgba(34, 197, 94, 0.38)',
  'rgba(245, 158, 11, 0.35)',
  'rgba(236, 72, 153, 0.30)',
  'rgba(20, 184, 166, 0.36)',
  'rgba(168, 85, 247, 0.30)'
];

// Deal health colors
const DEAL_HEALTH_COLORS = {
  Healthy: 'rgba(34, 197, 94, 0.45)',     // green
  'At Risk': 'rgba(245, 158, 11, 0.42)',  // amber
  Critical: 'rgba(239, 68, 68, 0.40)'     // red
};

// Trend colors (light, readable)
const TREND_COLORS = {
  opened: 'rgba(59, 130, 246, 0.35)',
  won: 'rgba(34, 197, 94, 0.35)',
  lost: 'rgba(239, 68, 68, 0.28)',
  winRate: 'rgba(99, 102, 241, 0.85)'
};

const formatCurrency = (value) => {
  const num = Number(value);
  if (value === null || value === undefined) return '–';
  if (Number.isNaN(num)) return '–';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(num);
};

const formatPercent = (value) => {
  if (value === null || value === undefined) return '–';
  const n = Number(value);
  if (Number.isNaN(n)) return '–';
  return `${n.toFixed(0)}%`;
};

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const diffDays = (fromDate, toDate) => {
  const ms = toDate.getTime() - fromDate.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
};

// Priority for "worst wins" when grouping by customer
const healthPriority = (status) => {
  if (status === 'Critical') return 3;
  if (status === 'At Risk') return 2;
  return 1; // Healthy
};

const toMonthKey = (d) => {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  const y = dt.getFullYear();
  const m = `${dt.getMonth() + 1}`.padStart(2, '0');
  return `${y}-${m}`;
};

const monthKeyToLabel = (key) => {
  const [y, m] = key.split('-');
  const dt = new Date(Number(y), Number(m) - 1, 1);
  return dt.toLocaleString('en-US', { month: 'short', year: '2-digit' });
};

const fmtDate = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toISOString().slice(0, 10);
};

function ReportsDashboard() {
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [period, setPeriod] = useState('last90'); // last90 | ytd | all
  const [presalesFilter, setPresalesFilter] = useState('All');
  const [pipelineGroupBy, setPipelineGroupBy] = useState('country'); // country | account_manager

  // Deal health toggle: projects vs customers
  const [dealHealthMode, setDealHealthMode] = useState('projects'); // 'projects' | 'customers'

  // Active projects report (hidden by default)
  const [showActiveProjects, setShowActiveProjects] = useState(false);
  const [refreshingActiveExport, setRefreshingActiveExport] = useState(false);
  const [refreshingProjects, setRefreshingProjects] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [projectsRes, tasksRes] = await Promise.all([
          supabase.from('projects').select('*'),
          supabase.from('project_tasks').select('*')
        ]);

        if (projectsRes.error) throw projectsRes.error;
        if (tasksRes.error) throw tasksRes.error;

        setProjects(projectsRes.data || []);
        setTasks(tasksRes.data || []);
      } catch (err) {
        console.error(err);
        setError('Failed to load report data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const { periodStart } = useMemo(() => {
    if (period === 'last90') {
      const d = new Date();
      d.setDate(d.getDate() - 90);
      return { periodStart: d };
    }
    if (period === 'ytd') {
      return { periodStart: new Date(new Date().getFullYear(), 0, 1) };
    }
    return { periodStart: null };
  }, [period]);

  const projectsInPeriod = useMemo(() => {
    if (!periodStart) return projects;
    return projects.filter((p) => p.created_at && new Date(p.created_at) >= periodStart);
  }, [projects, periodStart]);

  const tasksInPeriod = useMemo(() => {
    if (!periodStart) return tasks;
    return tasks.filter((t) => t.created_at && new Date(t.created_at) >= periodStart);
  }, [tasks, periodStart]);

  /* ================= KPIs ================= */
  const {
    winRate,
    closedWonValue,
    activePipelineValue,
    rfpCount,
    demosPoCsCount,
    overduePercent
  } = useMemo(() => {
    const won = projectsInPeriod.filter((p) => WON_STAGES.includes(p.sales_stage));
    const lost = projectsInPeriod.filter((p) => LOST_STAGES.includes(p.sales_stage));

    const active = projects.filter(
      (p) => !CLOSED_STAGES_FOR_PIPELINE.includes(p.sales_stage)
    );

    const overdueTasks = tasks.filter(
      (t) => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'Completed'
    );

    return {
      winRate:
        won.length + lost.length
          ? (won.length / (won.length + lost.length)) * 100
          : null,
      closedWonValue: won.reduce((s, p) => s + (Number(p.deal_value) || 0), 0),
      activePipelineValue: active.reduce((s, p) => s + (Number(p.deal_value) || 0), 0),
      rfpCount: tasksInPeriod.filter((t) => (t.task_type || '').toLowerCase().includes('rfp')).length,
      demosPoCsCount: tasksInPeriod.filter((t) => (t.task_type || '').toLowerCase().includes('demo')).length,
      overduePercent: tasks.length ? (overdueTasks.length / tasks.length) * 100 : null
    };
  }, [projects, projectsInPeriod, tasks, tasksInPeriod]);

  /* ================= PIPELINE (COUNT opportunities, ALL active) ================= */
  const pipelineGrouped = useMemo(() => {
    const map = new Map();

    projects.forEach((p) => {
      if (CLOSED_STAGES_FOR_PIPELINE.includes(p.sales_stage)) return;

      const key =
        pipelineGroupBy === 'account_manager'
          ? (p.account_manager || 'Unassigned')
          : (p.country || 'Unknown');

      if (!map.has(key)) map.set(key, { name: key, opportunities: 0 });
      map.get(key).opportunities += 1;
    });

    return Array.from(map.values())
      .filter((x) => x.opportunities > 0)
      .sort((a, b) => b.opportunities - a.opportunities);
  }, [projects, pipelineGroupBy]);

  const pipelineChartHeight = useMemo(() => {
    const rowH = 28;
    const base = 140;
    const h = base + pipelineGrouped.length * rowH;
    return Math.min(Math.max(260, h), 420);
  }, [pipelineGrouped.length]);

  /* ================= ACTIVE PROJECTS (EXPORT-FIRST, OPTIONAL VIEW) ================= */
  const activeProjectsList = useMemo(() => {
    const list = (projects || []).filter(
      (p) => !CLOSED_STAGES_FOR_PIPELINE.includes(p.sales_stage)
    );

    return list.slice().sort((a, b) => {
      const ad = a.due_date ? new Date(a.due_date).getTime() : Number.POSITIVE_INFINITY;
      const bd = b.due_date ? new Date(b.due_date).getTime() : Number.POSITIVE_INFINITY;
      if (ad !== bd) return ad - bd;
      return (a.project_name || '').localeCompare(b.project_name || '');
    });
  }, [projects]);

  const exportActiveProjectsToExcel = async () => {
    try {
      setRefreshingActiveExport(true);

      const res = await supabase.from('projects').select('*');
      if (res.error) throw res.error;

      const all = res.data || [];
      const active = all.filter((p) => !CLOSED_STAGES_FOR_PIPELINE.includes(p.sales_stage));

      const groupMap = new Map();
      active.forEach((p) => {
        const key = p.primary_presales || 'Unassigned';
        if (!groupMap.has(key)) groupMap.set(key, []);
        groupMap.get(key).push(p);
      });

      const groups = Array.from(groupMap.entries())
        .map(([presales, items]) => ({
          presales,
          items: items.slice().sort((a, b) => (a.project_name || '').localeCompare(b.project_name || ''))
        }))
        .sort((a, b) => a.presales.localeCompare(b.presales));

      const rows = [];
      rows.push(['Active Projects (Not Closed) - Grouped by Presales']);
      rows.push([`Generated: ${new Date().toISOString().slice(0, 10)}`]);
      rows.push([`Total active projects: ${active.length}`]);
      rows.push([]);

      const headers = [
        'Project',
        'Customer',
        'Country',
        'Account Manager',
        'Primary Presales',
        'Stage',
        'Deal Value',
        'Due Date',
        'Last Activity',
        'Next Key Activity'
      ];

      groups.forEach((g) => {
        const totalValue = g.items.reduce((s, p) => s + (Number(p.deal_value) || 0), 0);

        rows.push([`Presales: ${g.presales}`]);
        rows.push([`Projects: ${g.items.length}`, `Total Value: ${totalValue}`]);
        rows.push(headers);

        g.items.forEach((p) => {
          rows.push([
            p.project_name || '—',
            p.customer_name || '—',
            p.country || '—',
            p.account_manager || '—',
            p.primary_presales || 'Unassigned',
            p.sales_stage || '—',
            Number(p.deal_value) || 0,
            p.due_date || '',
            p.last_activity || '',
            p.next_key_activity || ''
          ]);
        });

        rows.push([]);
      });

      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [
        { wch: 28 },
        { wch: 22 },
        { wch: 14 },
        { wch: 18 },
        { wch: 16 },
        { wch: 16 },
        { wch: 14 },
        { wch: 12 },
        { wch: 34 },
        { wch: 34 }
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Active Projects');
      XLSX.writeFile(wb, 'active_projects_by_presales.xlsx');
    } catch (e) {
      console.error(e);
      alert(`Export failed: ${e?.message || 'Unknown error'}`);
    } finally {
      setRefreshingActiveExport(false);
    }
  };

  // ... rest of your original file continues unchanged ...
  // (Use the download link above for the full complete version)
}

export default ReportsDashboard;
