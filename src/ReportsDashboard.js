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

  // Smaller + capped height so it doesn’t look massive
  const pipelineChartHeight = useMemo(() => {
    const rowH = 28;     // smaller bar row height
    const base = 140;    // smaller base padding
    const h = base + pipelineGrouped.length * rowH;
    return Math.min(Math.max(260, h), 420); // min 260, max 420
  }, [pipelineGrouped.length]);

  /* ================= ACTIVE PROJECTS (EXPORT-FIRST, OPTIONAL VIEW) ================= */
  const activeProjectsList = useMemo(() => {
    const list = (projects || []).filter(
      (p) => !CLOSED_STAGES_FOR_PIPELINE.includes(p.sales_stage)
    );

    // Sort: due date soonest, then project name
    return list.slice().sort((a, b) => {
      const ad = a.due_date ? new Date(a.due_date).getTime() : Number.POSITIVE_INFINITY;
      const bd = b.due_date ? new Date(b.due_date).getTime() : Number.POSITIVE_INFINITY;
      if (ad !== bd) return ad - bd;
      return (a.project_name || '').localeCompare(b.project_name || '');
    });
  }, [projects]);

  const exportActiveProjectsToExcel = async () => {
    try {
      // Pull fresh from DB (so export always reflects latest)
      const res = await supabase.from('projects').select('*');
      if (res.error) throw res.error;

      const all = res.data || [];
      const active = all.filter((p) => !CLOSED_STAGES_FOR_PIPELINE.includes(p.sales_stage));

      // Group by primary presales
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
      ws['!freeze'] = { xSplit: 0, ySplit: 4 };

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Active Projects');
      XLSX.writeFile(wb, 'active_projects_grouped_by_presales.xlsx');
    } catch (e) {
      console.error(e);
      alert(`Export failed: ${e?.message || 'Unknown error'}`);
    }
  };

  /* ================= DEAL HEALTH DASHBOARD (30-day rule + toggle) ================= */
  const {
    dealHealthCounts,
    dealHealthChartData,
    criticalDeals,
    scoredUnitsLabel
  } = useMemo(() => {
    const today = startOfToday();
    const STUCK_DAYS = 30;

    const activeProjects = projects.filter(
      (p) => !CLOSED_STAGES_FOR_PIPELINE.includes(p.sales_stage)
    );

    const scoreProject = (p) => {
      const nextActivity = (p.next_key_activity || '').trim();
      const hasNextActivity = nextActivity.length > 0;

      const due = p.due_date ? new Date(p.due_date) : null;
      if (due) due.setHours(0, 0, 0, 0);
      const isOverdue = !!(due && due < today);

      const created = p.created_at ? new Date(p.created_at) : null;
      if (created) created.setHours(0, 0, 0, 0);

      const ageDays = created ? diffDays(created, today) : null;
      const isStuck = ageDays !== null ? ageDays > STUCK_DAYS : true;

      if (!hasNextActivity || isOverdue) {
        let reason = '';
        let severityScore = 0;

        if (!hasNextActivity) {
          reason = 'Missing next key activity';
          severityScore += 50;
        }

        if (isOverdue) {
          const overdueDays = diffDays(due, today);
          reason = reason
            ? `${reason} + overdue by ${overdueDays}d`
            : `Overdue by ${overdueDays}d`;
          severityScore += 100 + overdueDays;
        }

        return { status: 'Critical', reason, severityScore, ageDays };
      }

      if (isStuck) {
        return {
          status: 'At Risk',
          reason: ageDays !== null ? `Stuck for ${ageDays}d` : 'Stuck (no created date)',
          severityScore: 10 + (ageDays || 0),
          ageDays
        };
      }

      return { status: 'Healthy', reason: 'On track', severityScore: 1, ageDays };
    };

    if (dealHealthMode === 'projects') {
      let healthy = 0;
      let atRisk = 0;
      let critical = 0;

      const criticalList = [];

      activeProjects.forEach((p) => {
        const scored = scoreProject(p);

        if (scored.status === 'Critical') {
          critical += 1;
          criticalList.push({
            id: p.id,
            unitKey: p.id,
            project_name: p.project_name || '—',
            customer_name: p.customer_name || '—',
            account_manager: p.account_manager || '—',
            country: p.country || '—',
            sales_stage: p.sales_stage || '—',
            primary_presales: p.primary_presales || 'Unassigned',
            next_key_activity: (p.next_key_activity || '—'),
            due_date: p.due_date || null,
            deal_value: Number(p.deal_value) || 0,
            age_days: scored.ageDays,
            reason: scored.reason,
            severityScore: scored.severityScore
          });
        } else if (scored.status === 'At Risk') {
          atRisk += 1;
        } else {
          healthy += 1;
        }
      });

      const counts = { Healthy: healthy, 'At Risk': atRisk, Critical: critical };
      const chartData = [
        { name: 'Healthy', value: counts.Healthy },
        { name: 'At Risk', value: counts['At Risk'] },
        { name: 'Critical', value: counts.Critical }
      ].filter((x) => x.value > 0);

      criticalList.sort((a, b) => {
        if (b.severityScore !== a.severityScore) return b.severityScore - a.severityScore;
        if (b.deal_value !== a.deal_value) return b.deal_value - a.deal_value;
        return (a.project_name || '').localeCompare(b.project_name || '');
      });

      return {
        dealHealthCounts: counts,
        dealHealthChartData: chartData,
        criticalDeals: criticalList.slice(0, 8),
        scoredUnitsLabel: 'projects'
      };
    }

    const customerMap = new Map();
    activeProjects.forEach((p) => {
      const cust = (p.customer_name || 'Unknown Customer').trim() || 'Unknown Customer';
      if (!customerMap.has(cust)) customerMap.set(cust, []);
      customerMap.get(cust).push(p);
    });

    let healthy = 0;
    let atRisk = 0;
    let critical = 0;

    const criticalCustomers = [];

    customerMap.forEach((custProjects, customer_name) => {
      let worst = { status: 'Healthy', severityScore: 0, reason: 'On track', ageDays: null };
      let worstProject = custProjects[0];

      custProjects.forEach((p) => {
        const scored = scoreProject(p);
        if (healthPriority(scored.status) > healthPriority(worst.status)) {
          worst = scored;
          worstProject = p;
        } else if (healthPriority(scored.status) === healthPriority(worst.status)) {
          const curVal = Number(p.deal_value) || 0;
          const bestVal = Number(worstProject?.deal_value) || 0;

          if (scored.severityScore > worst.severityScore) {
            worst = scored;
            worstProject = p;
          } else if (scored.severityScore === worst.severityScore && curVal > bestVal) {
            worst = scored;
            worstProject = p;
          }
        }
      });

      if (worst.status === 'Critical') {
        critical += 1;

        const totalValue = custProjects.reduce((s, p) => s + (Number(p.deal_value) || 0), 0);
        const countries = [...new Set(custProjects.map((p) => p.country || '—'))].slice(0, 3);
        const ams = [...new Set(custProjects.map((p) => p.account_manager || '—'))].slice(0, 2);

        criticalCustomers.push({
          id: customer_name,
          unitKey: customer_name,
          project_name: worstProject?.project_name || '—',
          customer_name,
          account_manager: ams.join(', '),
          country: countries.join(', '),
          sales_stage: worstProject?.sales_stage || '—',
          primary_presales: worstProject?.primary_presales || 'Unassigned',
          next_key_activity: (worstProject?.next_key_activity || '—'),
          due_date: worstProject?.due_date || null,
          deal_value: totalValue,
          age_days: worst.ageDays,
          reason: `Customer risk: ${worst.reason}`,
          severityScore: worst.severityScore
        });
      } else if (worst.status === 'At Risk') {
        atRisk += 1;
      } else {
        healthy += 1;
      }
    });

    const counts = { Healthy: healthy, 'At Risk': atRisk, Critical: critical };
    const chartData = [
      { name: 'Healthy', value: counts.Healthy },
      { name: 'At Risk', value: counts['At Risk'] },
      { name: 'Critical', value: counts.Critical }
    ].filter((x) => x.value > 0);

    criticalCustomers.sort((a, b) => {
      if (b.severityScore !== a.severityScore) return b.severityScore - a.severityScore;
      if (b.deal_value !== a.deal_value) return b.deal_value - a.deal_value;
      return (a.customer_name || '').localeCompare(b.customer_name || '');
    });

    return {
      dealHealthCounts: counts,
      dealHealthChartData: chartData,
      criticalDeals: criticalCustomers.slice(0, 8),
      scoredUnitsLabel: 'customers'
    };
  }, [projects, dealHealthMode]);

  /* ================= WIN / LOSS TREND (Over Time) ================= */
  const winLossTrend = useMemo(() => {
    const dataSource = projectsInPeriod;
    const map = new Map();

    dataSource.forEach((p) => {
      if (!p.created_at) return;
      const key = toMonthKey(p.created_at);
      if (!key) return;

      if (!map.has(key)) {
        map.set(key, {
          monthKey: key,
          month: monthKeyToLabel(key),
          opened: 0,
          won: 0,
          lost: 0,
          winRate: 0
        });
      }

      const row = map.get(key);
      row.opened += 1;

      if (WON_STAGES.includes(p.sales_stage)) row.won += 1;
      if (LOST_STAGES.includes(p.sales_stage)) row.lost += 1;
    });

    const sorted = Array.from(map.values()).sort((a, b) =>
      (a.monthKey || '').localeCompare(b.monthKey || '')
    );

    sorted.forEach((r) => {
      const denom = r.won + r.lost;
      r.winRate = denom ? Math.round((r.won / denom) * 100) : 0;
    });

    return sorted;
  }, [projectsInPeriod]);

  // Smaller fixed height for CEO view
  const trendChartHeight = useMemo(() => 260, []);

  /* ================= PROJECTS BY PRESALES ================= */
  const projectsGroupedByPresales = useMemo(() => {
    const map = new Map();
    projects.forEach((p) => {
      const key = p.primary_presales || 'Unassigned';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(p);
    });

    return Array.from(map.entries())
      .map(([presales, items]) => ({
        presales,
        items: items
          .slice()
          .sort((a, b) => (a.project_name || '').localeCompare(b.project_name || ''))
      }))
      .filter((g) => presalesFilter === 'All' || g.presales === presalesFilter)
      .sort((a, b) => a.presales.localeCompare(b.presales));
  }, [projects, presalesFilter]);

  const presalesOptions = useMemo(() => {
    const list = [...new Set(projects.map((p) => p.primary_presales || 'Unassigned'))].sort();
    return ['All', ...list];
  }, [projects]);

  /* ================= EXCEL EXPORT ================= */
  const exportProjectsByPresalesToExcel = () => {
    const rows = [];

    rows.push(['Projects by Presales']);
    rows.push([`Generated: ${new Date().toISOString().slice(0, 10)}`]);
    rows.push([`Filter: ${presalesFilter}`]);
    rows.push([]);

    projectsGroupedByPresales.forEach((g) => {
      rows.push([`Presales: ${g.presales}`]);
      rows.push(['Project', 'Customer', 'Stage', 'Next key activity', 'Value']);

      g.items.forEach((p) => {
        rows.push([
          p.project_name || '—',
          p.customer_name || '—',
          p.sales_stage || '—',
          (p.next_key_activity || '—'),
          Number(p.deal_value) || 0
        ]);
      });

      rows.push([]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [
      { wch: 28 },
      { wch: 22 },
      { wch: 16 },
      { wch: 44 },
      { wch: 14 }
    ];
    ws['!freeze'] = { xSplit: 0, ySplit: 4 };

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Projects by Presales');
    XLSX.writeFile(wb, 'projects_by_presales.xlsx');
  };

  if (loading) {
    return (
      <div className="reports-page">
        <header className="reports-header">
          <div className="reports-header-left">
            <h1 className="reports-title">Presales Reports & Analytics</h1>
            <p className="reports-subtitle">Loading report data…</p>
          </div>
        </header>

        <div className="reports-loading">
          <div className="reports-loading-spinner" />
          <span>Loading reports…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="reports-page">
        <header className="reports-header">
          <div className="reports-header-left">
            <h1 className="reports-title">Presales Reports & Analytics</h1>
            <p className="reports-subtitle">Something went wrong</p>
          </div>
        </header>

        <div className="reports-error">{error}</div>
      </div>
    );
  }

  return (
    <div className="reports-page">
      <header className="reports-header">
        <div className="reports-header-left">
          <h1 className="reports-title">Presales Reports & Analytics</h1>
          <p className="reports-subtitle">
            Quick snapshot of performance, pipeline, deal health, and outcomes trend.
          </p>
        </div>

        <div className="reports-filters">
          <button
            className={`reports-filter-chip ${period === 'last90' ? 'reports-filter-chip-active' : ''}`}
            onClick={() => setPeriod('last90')}
          >
            Last 90 days
          </button>
          <button
            className={`reports-filter-chip ${period === 'ytd' ? 'reports-filter-chip-active' : ''}`}
            onClick={() => setPeriod('ytd')}
          >
            Year to date
          </button>
          <button
            className={`reports-filter-chip ${period === 'all' ? 'reports-filter-chip-active' : ''}`}
            onClick={() => setPeriod('all')}
          >
            All time
          </button>
        </div>
      </header>

      <main className="reports-main">
        {/* KPIs */}
        <section className="reports-section">
          <div className="reports-section-header">
            <div className="reports-section-title">
              <FaChartLine className="reports-section-icon" />
              <h2>Performance KPIs</h2>
            </div>
            <p className="reports-section-subtitle">High level numbers for quick review.</p>
          </div>

          <div className="reports-kpi-grid">
            <div className="reports-kpi-card">
              <div className="reports-kpi-label"><FaTrophy /><span>Win rate</span></div>
              <div className="reports-kpi-value">{formatPercent(winRate)}</div>
              <div className="reports-kpi-hint">Won vs lost (period)</div>
            </div>

            <div className="reports-kpi-card">
              <div className="reports-kpi-label"><FaDollarSign /><span>Closed-won value</span></div>
              <div className="reports-kpi-value">{formatCurrency(closedWonValue)}</div>
              <div className="reports-kpi-hint">Total won (period)</div>
            </div>

            <div className="reports-kpi-card">
              <div className="reports-kpi-label"><FaChartLine /><span>Active pipeline value</span></div>
              <div className="reports-kpi-value">{formatCurrency(activePipelineValue)}</div>
              <div className="reports-kpi-hint">Open only (current)</div>
            </div>

            <div className="reports-kpi-card">
              <div className="reports-kpi-label"><FaTasks /><span>RFPs</span></div>
              <div className="reports-kpi-value">{rfpCount || 0}</div>
              <div className="reports-kpi-hint">Tasks tagged “RFP” (period)</div>
            </div>

            <div className="reports-kpi-card">
              <div className="reports-kpi-label"><FaTasks /><span>Demos / PoCs</span></div>
              <div className="reports-kpi-value">{demosPoCsCount || 0}</div>
              <div className="reports-kpi-hint">Tasks tagged “Demo” (period)</div>
            </div>

            <div className="reports-kpi-card">
              <div className="reports-kpi-label"><FaFlag /><span>Overdue tasks</span></div>
              <div className="reports-kpi-value">{formatPercent(overduePercent)}</div>
              <div className="reports-kpi-hint">Share of overdue tasks</div>
            </div>
          </div>
        </section>

        {/* Win/Loss Trend */}
        <section className="reports-section">
          <div className="reports-section-header">
            <div className="reports-section-title">
              <FaChartLine className="reports-section-icon" />
              <h2>Win / Loss Trend Over Time</h2>
            </div>
            <p className="reports-section-subtitle">
              Based on project <strong>created_at</strong> month (close date is not stored). Win rate = Won / (Won + Lost).
            </p>
          </div>

          <div className="reports-panel reports-chart-panel">
            {winLossTrend.length === 0 ? (
              <div className="reports-empty">No data in this period.</div>
            ) : (
              <div style={{ height: trendChartHeight }}>
                <ResponsiveContainer>
                  <ComposedChart
                    data={winLossTrend}
                    margin={{ top: 8, right: 14, left: 8, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 11 }} allowDecimals={false} />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 11 }}
                      domain={[0, 100]}
                      unit="%"
                    />
                    <Tooltip
                      formatter={(v, name) => {
                        if (name === 'winRate') return [`${v}%`, 'Win rate'];
                        return [v, name];
                      }}
                    />
                    <Legend />

                    <Bar yAxisId="left" dataKey="opened" name="Opened" fill={TREND_COLORS.opened} radius={[7, 7, 0, 0]} />
                    <Bar yAxisId="left" dataKey="won" name="Won" fill={TREND_COLORS.won} radius={[7, 7, 0, 0]} />
                    <Bar yAxisId="left" dataKey="lost" name="Lost" fill={TREND_COLORS.lost} radius={[7, 7, 0, 0]} />

                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="winRate"
                      name="Win rate"
                      stroke={TREND_COLORS.winRate}
                      strokeWidth={3}
                      dot={{ r: 2 }}
                      activeDot={{ r: 4 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </section>

        {/* Deal Health Dashboard */}
        <section className="reports-section">
          <div className="reports-section-header">
            <div className="reports-section-title">
              <FaExclamationTriangle className="reports-section-icon" />
              <h2>Deal Health</h2>
            </div>

            <div className="reports-dealhealth-subrow">
              <p className="reports-section-subtitle" style={{ margin: 0 }}>
                Active only. Critical = overdue due date or missing next key activity. At Risk = stuck &gt; 30 days.
              </p>

              <div className="reports-mini-toggle">
                <button
                  className={`reports-mini-toggle-btn ${dealHealthMode === 'projects' ? 'active' : ''}`}
                  onClick={() => setDealHealthMode('projects')}
                  type="button"
                >
                  By Projects
                </button>
                <button
                  className={`reports-mini-toggle-btn ${dealHealthMode === 'customers' ? 'active' : ''}`}
                  onClick={() => setDealHealthMode('customers')}
                  type="button"
                >
                  By Customers
                </button>
              </div>
            </div>
          </div>

          <div className="reports-dealhealth-grid">
            <div className="reports-panel reports-dealhealth-card">
              {dealHealthChartData.length === 0 ? (
                <div className="reports-empty">No active opportunities to score.</div>
              ) : (
                <div className="reports-dealhealth-chartWrap">
                  <div className="reports-dealhealth-chart">
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie
                          data={dealHealthChartData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={50}
                          outerRadius={74}
                          paddingAngle={2}
                        >
                          {dealHealthChartData.map((entry) => (
                            <Cell key={entry.name} fill={DEAL_HEALTH_COLORS[entry.name]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v, n) => [`${v}`, `${n}`]} />
                        {/* Removed Legend to avoid extra empty space */}
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="reports-dealhealth-stats">
                    <div className="reports-healthStat">
                      <span className="reports-healthDot healthy" />
                      <div>
                        <div className="reports-healthNum">{dealHealthCounts.Healthy}</div>
                        <div className="reports-healthLbl">Healthy</div>
                      </div>
                    </div>

                    <div className="reports-healthStat">
                      <span className="reports-healthDot risk" />
                      <div>
                        <div className="reports-healthNum">{dealHealthCounts['At Risk']}</div>
                        <div className="reports-healthLbl">At Risk</div>
                      </div>
                    </div>

                    <div className="reports-healthStat">
                      <span className="reports-healthDot critical" />
                      <div>
                        <div className="reports-healthNum">{dealHealthCounts.Critical}</div>
                        <div className="reports-healthLbl">Critical</div>
                      </div>
                    </div>

                    <div className="reports-healthFootnote">
                      Counting by <strong>{scoredUnitsLabel}</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="reports-panel reports-dealhealth-card">
              <div className="reports-dealhealth-listHeader">
                <div>
                  <div className="reports-dealhealth-listTitle">
                    Critical {dealHealthMode === 'customers' ? 'customers' : 'deals'} needing attention
                  </div>
                  <div className="reports-dealhealth-listSub">Top 8 based on urgency</div>
                </div>
              </div>

              {criticalDeals.length === 0 ? (
                <div className="reports-empty">No critical items right now. 👍</div>
              ) : (
                <div className="reports-critical-list">
                  {criticalDeals.map((d) => (
                    <div key={d.unitKey} className="reports-critical-row">
                      <div className="reports-critical-main">
                        <div className="reports-critical-title">
                          <span className="reports-critical-badge">CRITICAL</span>
                          <span className="reports-critical-project">
                            {dealHealthMode === 'customers' ? d.customer_name : d.project_name}
                          </span>
                        </div>

                        <div className="reports-critical-meta">
                          {dealHealthMode === 'customers' ? (
                            <>
                              <span>Example: {d.project_name}</span>
                              <span className="reports-dotSep">•</span>
                              <span>{d.sales_stage}</span>
                              <span className="reports-dotSep">•</span>
                              <span>{d.country}</span>
                              <span className="reports-dotSep">•</span>
                              <span>AM: {d.account_manager}</span>
                            </>
                          ) : (
                            <>
                              <span>{d.customer_name}</span>
                              <span className="reports-dotSep">•</span>
                              <span>{d.sales_stage}</span>
                              <span className="reports-dotSep">•</span>
                              <span>{d.country}</span>
                              <span className="reports-dotSep">•</span>
                              <span>AM: {d.account_manager}</span>
                            </>
                          )}
                        </div>

                        <div className="reports-critical-reason">{d.reason}</div>
                      </div>

                      <div className="reports-critical-side">
                        <div className="reports-critical-value">{formatCurrency(d.deal_value)}</div>
                        <div className="reports-critical-small">
                          Presales: <strong>{d.primary_presales}</strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Pipeline */}
        <section className="reports-section">
          <div className="reports-section-header">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div className="reports-section-title">
                  <FaGlobeAsia className="reports-section-icon" />
                  <h2>
                    {pipelineGroupBy === 'account_manager'
                      ? 'Active Opportunities by Account Manager'
                      : 'Active Opportunities by Country'}
                  </h2>
                </div>
                <p className="reports-section-subtitle">
                  Open opportunities only (excludes closed stages). Showing all active groups.
                </p>
              </div>

              <div className="reports-filters" style={{ justifyContent: 'flex-end' }}>
                <button
                  className={`reports-filter-chip ${pipelineGroupBy === 'country' ? 'reports-filter-chip-active' : ''}`}
                  onClick={() => setPipelineGroupBy('country')}
                >
                  By Country
                </button>
                <button
                  className={`reports-filter-chip ${pipelineGroupBy === 'account_manager' ? 'reports-filter-chip-active' : ''}`}
                  onClick={() => setPipelineGroupBy('account_manager')}
                >
                  By Account Manager
                </button>
              </div>
            </div>
          </div>

          <div className="reports-panel reports-chart-panel reports-chart-scroll">
            {pipelineGrouped.length === 0 ? (
              <div className="reports-empty">
                No active opportunities to show.
              </div>
            ) : (
              <div style={{ height: pipelineChartHeight }}>
                <ResponsiveContainer>
                  <BarChart
                    data={pipelineGrouped}
                    layout="vertical"
                    margin={{ top: 8, right: 14, left: 10, bottom: 8 }}
                    barCategoryGap={6}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={180}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip formatter={(v) => `${v} opportunities`} />
                    <Bar dataKey="opportunities" radius={[9, 9, 9, 9]} barSize={14}>
                      {pipelineGrouped.map((entry, idx) => (
                        <Cell
                          key={`cell-${entry.name}-${idx}`}
                          fill={PASTEL_BAR_COLORS[idx % PASTEL_BAR_COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
          
        {/* Active Projects (export-first, hidden by default) */}
        <section className="reports-section">
          <div className="reports-section-header">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div className="reports-section-title">
                  <FaListAlt className="reports-section-icon" />
                  <h2>Active Projects (Not Closed)</h2>
                </div>
                <p className="reports-section-subtitle" style={{ marginBottom: 0 }}>
                  Most of the time you can just export. If you need to view, click “Show list”.
                </p>
              </div>

              <div className="reports-controls">
                <button
                  className="reports-filter-chip reports-export-chip"
                  onClick={exportActiveProjectsToExcel}
                  disabled={refreshingActiveExport}
                  title="Export active projects grouped by presales"
                >
                  <FaFileExcel style={{ marginRight: 6 }} />
                  {refreshingActiveExport ? 'Preparing…' : 'Download Excel'}
                </button>

                <button
                  className="reports-filter-chip"
                  onClick={() => setShowActiveProjects((v) => !v)}
                  title="Show or hide the list on screen"
                >
                  {showActiveProjects ? 'Hide list' : 'Show list'}
                </button>

                <button
                  className="reports-filter-chip"
                  onClick={async () => {
                    try {
                      setRefreshingProjects(true);
                      const res = await supabase.from('projects').select('*');
                      if (res.error) throw res.error;
                      setProjects(res.data || []);
                    } catch (e) {
                      console.error(e);
                      alert(`Failed to extract projects: ${e?.message || 'Unknown error'}`);
                    } finally {
                      setRefreshingProjects(false);
                    }
                  }}
                  disabled={refreshingProjects}
                  title="Refresh the data on screen from DB"
                >
                  <FaSyncAlt style={{ marginRight: 6 }} />
                  {refreshingProjects ? 'Refreshing…' : 'Refresh'}
                </button>
              </div>
            </div>
          </div>

          {showActiveProjects && (
            <div className="reports-panel">
              {activeProjectsList.length === 0 ? (
                <div className="reports-empty">No active projects found.</div>
              ) : (
                <>
                  <div
                    className="reports-table-header"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1.1fr 0.9fr 0.7fr 0.9fr 0.85fr 0.7fr 0.8fr 1.2fr 1.2fr',
                      gap: 10
                    }}
                  >
                    <span>Project</span>
                    <span>Customer</span>
                    <span>Country</span>
                    <span>AM</span>
                    <span>Presales</span>
                    <span>Stage</span>
                    <span>Due</span>
                    <span>Last activity</span>
                    <span>Next key activity</span>
                  </div>

                  {activeProjectsList.map((p) => (
                    <div
                      key={p.id}
                      className="reports-table-row"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1.1fr 0.9fr 0.7fr 0.9fr 0.85fr 0.7fr 0.8fr 1.2fr 1.2fr',
                        gap: 10,
                        alignItems: 'start'
                      }}
                    >
                      <span>{p.project_name || '—'}</span>
                      <span>{p.customer_name || '—'}</span>
                      <span>{p.country || '—'}</span>
                      <span>{p.account_manager || '—'}</span>
                      <span>{p.primary_presales || 'Unassigned'}</span>
                      <span>{p.sales_stage || '—'}</span>
                      <span>{fmtDate(p.due_date)}</span>
                      <span className="reports-wrap">{p.last_activity || '—'}</span>
                      <span className="reports-wrap">{p.next_key_activity || '—'}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </section>

    </div>
            )}
          </div>
        </section>

        {/* Projects by Presales */}
        <section className="reports-section">
          <div className="reports-section-header">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div className="reports-section-title">
                  <FaTasks className="reports-section-icon" />
                  <h2>Projects by Presales</h2>
                </div>
                <p className="reports-section-subtitle">
                  Grouped by primary presales assigned in the projects table.
                </p>
              </div>

              <div className="reports-controls">
                <div className="reports-control">
                  <span className="reports-control-label">Presales</span>
                  <select
                    className="reports-select"
                    value={presalesFilter}
                    onChange={(e) => setPresalesFilter(e.target.value)}
                  >
                    {presalesOptions.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <button
                  className="reports-filter-chip reports-export-chip"
                  onClick={exportProjectsByPresalesToExcel}
                  title="Export grouped report"
                >
                  <FaFileExcel style={{ marginRight: 6 }} />
                  Export Excel
                </button>
              </div>
            </div>
          </div>

          {projectsGroupedByPresales.length === 0 ? (
            <div className="reports-panel">
              <div className="reports-empty">No projects found.</div>
            </div>
          ) : (
            projectsGroupedByPresales.map((g) => (
              <div key={g.presales} className="reports-presales-group">
                <div className="reports-presales-group-header">
                  <div className="reports-presales-name">{g.presales}</div>
                  <div className="reports-presales-count">{g.items.length} projects</div>
                </div>

                <div className="reports-panel">
                  <div className="reports-table-header reports-presales-simple-table">
                    <span>Project</span>
                    <span>Stage</span>
                    <span>Next key activity</span>
                    <span>Value</span>
                  </div>

                  {g.items.map((p) => (
                    <div key={p.id} className="reports-table-row reports-presales-simple-table">
                      <span>{p.project_name || '—'}</span>
                      <span>{p.sales_stage || '—'}</span>
                      <span className="reports-wrap">{(p.next_key_activity || '—')}</span>
                      <span>{formatCurrency(p.deal_value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </section>
      </main>
    </div>
  );
}

export default ReportsDashboard;
