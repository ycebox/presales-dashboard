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

// formatted excel export
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

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
  const [pipelineGroupBy, setPipelineGroupBy] = useState('country'); // country | account_manager

  // Active Projects report is hidden by default
  const [showActiveProjects, setShowActiveProjects] = useState(false);
  const [refreshingProjects, setRefreshingProjects] = useState(false);
  const [exportingActive, setExportingActive] = useState(false);

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

  const refreshProjectsFromDB = async () => {
    try {
      setRefreshingProjects(true);
      const res = await supabase.from('projects').select('*');
      if (res.error) throw res.error;
      setProjects(res.data || []);
    } catch (e) {
      console.error(e);
      alert(`Failed to refresh projects: ${e?.message || 'Unknown error'}`);
    } finally {
      setRefreshingProjects(false);
    }
  };

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

  /* ================= TASKS WATCHLIST ================= */
  const taskStatusDone = new Set(['Completed', 'Done']);

  const projectById = useMemo(() => {
    const m = new Map();
    (projects || []).forEach((p) => m.set(p.id, p));
    return m;
  }, [projects]);

  const { overdueTasksTop, dueSoonTasksTop } = useMemo(() => {
    const today = startOfToday();
    const soon = new Date(today);
    soon.setDate(soon.getDate() + 14);

    const openTasks = (tasks || []).filter((t) => !taskStatusDone.has(t.status));

    const overdue = openTasks
      .filter((t) => t.due_date && new Date(t.due_date) < today)
      .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
      .slice(0, 10)
      .map((t) => {
        const p = projectById.get(t.project_id) || {};
        return {
          id: t.id,
          description: t.description || t.title || '—',
          due_date: t.due_date,
          status: t.status || '—',
          project_name: p.project_name || '—',
          customer_name: p.customer_name || '—'
        };
      });

    const dueSoon = openTasks
      .filter((t) => t.due_date && new Date(t.due_date) >= today && new Date(t.due_date) <= soon)
      .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
      .slice(0, 10)
      .map((t) => {
        const p = projectById.get(t.project_id) || {};
        return {
          id: t.id,
          description: t.description || t.title || '—',
          due_date: t.due_date,
          status: t.status || '—',
          project_name: p.project_name || '—',
          customer_name: p.customer_name || '—'
        };
      });

    return { overdueTasksTop: overdue, dueSoonTasksTop: dueSoon };
  }, [tasks, projectById]);

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
    const rowH = 28;
    const base = 140;
    const h = base + pipelineGrouped.length * rowH;
    return Math.min(Math.max(260, h), 420);
  }, [pipelineGrouped.length]);

  /* ================= ACTIVE PROJECTS (HIDDEN BY DEFAULT) ================= */
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

  const exportActiveProjectsByPresalesFormatted = async () => {
    try {
      setExportingActive(true);

      // always pull fresh from DB for export
      const res = await supabase.from('projects').select('*');
      if (res.error) throw res.error;

      const all = res.data || [];
      const active = all.filter((p) => !CLOSED_STAGES_FOR_PIPELINE.includes(p.sales_stage));

      // group by primary presales
      const groupedMap = new Map();
      active.forEach((p) => {
        const key = p.primary_presales || 'Unassigned';
        if (!groupedMap.has(key)) groupedMap.set(key, []);
        groupedMap.get(key).push(p);
      });

      const groups = Array.from(groupedMap.entries())
        .map(([presales, items]) => ({
          presales,
          items: items.slice().sort((a, b) => {
            const ad = a.due_date ? new Date(a.due_date).getTime() : Number.POSITIVE_INFINITY;
            const bd = b.due_date ? new Date(b.due_date).getTime() : Number.POSITIVE_INFINITY;
            if (ad !== bd) return ad - bd;
            return (a.project_name || '').localeCompare(b.project_name || '');
          })
        }))
        .sort((a, b) => a.presales.localeCompare(b.presales));

      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Active Projects');

      ws.columns = [
        { header: 'Project Name', key: 'project_name', width: 30 },
        { header: 'Customer', key: 'customer_name', width: 22 },
        { header: 'Country', key: 'country', width: 14 },
        { header: 'Account Manager', key: 'account_manager', width: 18 },
        { header: 'Primary Presales', key: 'primary_presales', width: 16 },
        { header: 'Sales Stage', key: 'sales_stage', width: 14 },
        { header: 'Deal Value (USD)', key: 'deal_value', width: 16 },
        { header: 'Due Date', key: 'due_date', width: 12 },
        { header: 'Last Activity', key: 'last_activity', width: 28 },
        { header: 'Next Key Activity', key: 'next_key_activity', width: 28 }
      ];

      ws.getRow(1).font = { bold: true };
      ws.getRow(1).alignment = { vertical: 'middle' };
      ws.views = [{ state: 'frozen', ySplit: 1 }];

      let rowCursor = 2;

      groups.forEach((g) => {
        // group header row
        const groupHeaderRow = ws.addRow([`Presales: ${g.presales}`]);
        groupHeaderRow.font = { bold: true };
        groupHeaderRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFEFF6FF' }
        };
        ws.mergeCells(`A${rowCursor}:J${rowCursor}`);
        rowCursor += 1;

        // group table header row (repeat headers)
        const hdr = ws.addRow(ws.columns.map((c) => c.header));
        hdr.font = { bold: true };
        hdr.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF1F5F9' }
        };
        rowCursor += 1;

        g.items.forEach((p) => {
          ws.addRow([
            p.project_name || '',
            p.customer_name || '',
            p.country || '',
            p.account_manager || '',
            p.primary_presales || 'Unassigned',
            p.sales_stage || '',
            Number(p.deal_value) || 0,
            fmtDate(p.due_date),
            p.last_activity || '',
            p.next_key_activity || ''
          ]);
          rowCursor += 1;
        });

        // blank row between groups
        ws.addRow([]);
        rowCursor += 1;
      });

      // Style numeric column
      ws.getColumn('deal_value').numFmt = '"$"#,##0';

      const buf = await wb.xlsx.writeBuffer();
      saveAs(new Blob([buf]), 'active_projects_by_presales_formatted.xlsx');
    } catch (e) {
      console.error(e);
      alert(`Export failed: ${e?.message || 'Unknown error'}`);
    } finally {
      setExportingActive(false);
    }
  };

  /* ================= WIN/LOSS TREND ================= */
  const winLossTrend = useMemo(() => {
    const map = new Map();

    projectsInPeriod.forEach((p) => {
      const mk = toMonthKey(p.created_at);
      if (!mk) return;

      if (!map.has(mk)) {
        map.set(mk, { monthKey: mk, month: monthKeyToLabel(mk), opened: 0, won: 0, lost: 0, winRate: 0 });
      }
      const row = map.get(mk);
      row.opened += 1;

      if (WON_STAGES.includes(p.sales_stage)) row.won += 1;
      if (LOST_STAGES.includes(p.sales_stage)) row.lost += 1;
    });

    const rows = Array.from(map.values()).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
    rows.forEach((r) => {
      const denom = r.won + r.lost;
      r.winRate = denom ? Math.round((r.won / denom) * 100) : 0;
    });

    return rows;
  }, [projectsInPeriod]);

  // responsive chart height
  const trendChartHeight = useMemo(() => {
    return 320;
  }, []);

  if (loading) {
    return (
      <div className="reports-page">
        <header className="reports-header">
          <div className="reports-header-left">
            <h1 className="reports-title">Presales Reports & Analytics</h1>
            <p className="reports-subtitle">Loading reports…</p>
          </div>
        </header>

        <div className="reports-loading">
          <div className="reports-loading-spinner" />
          <div className="reports-loading-text">Fetching data from Supabase…</div>
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
            Quick snapshot of performance, pipeline, tasks, and outcomes trend.
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

        {/* Tasks Watchlist */}
        <section className="reports-section">
          <div className="reports-section-header">
            <div className="reports-section-title">
              <FaExclamationTriangle className="reports-section-icon" />
              <h2>Tasks Watchlist</h2>
            </div>
            <p className="reports-section-subtitle">
              Open tasks only. Overdue items and tasks due in the next 14 days.
            </p>
          </div>

          <div className="reports-watchlist-grid">
            <div className="reports-panel">
              <div className="reports-watchlist-title">Overdue (Top 10)</div>

              {overdueTasksTop.length === 0 ? (
                <div className="reports-empty">No overdue tasks right now. 👍</div>
              ) : (
                <div className="reports-watchlist-list">
                  {overdueTasksTop.map((t) => (
                    <div key={t.id} className="reports-watchlist-row">
                      <div className="reports-watchlist-main">
                        <div className="reports-watchlist-task">{t.description}</div>
                        <div className="reports-watchlist-meta">
                          <span>{t.customer_name}</span>
                          <span className="reports-dotSep">•</span>
                          <span>{t.project_name}</span>
                          <span className="reports-dotSep">•</span>
                          <span>Status: {t.status}</span>
                        </div>
                      </div>
                      <div className="reports-watchlist-side">
                        <div className="reports-watchlist-date">{fmtDate(t.due_date)}</div>
                        <div className="reports-watchlist-badge danger">OVERDUE</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="reports-panel">
              <div className="reports-watchlist-title">Due Soon (Next 14 days, Top 10)</div>

              {dueSoonTasksTop.length === 0 ? (
                <div className="reports-empty">No tasks due soon.</div>
              ) : (
                <div className="reports-watchlist-list">
                  {dueSoonTasksTop.map((t) => (
                    <div key={t.id} className="reports-watchlist-row">
                      <div className="reports-watchlist-main">
                        <div className="reports-watchlist-task">{t.description}</div>
                        <div className="reports-watchlist-meta">
                          <span>{t.customer_name}</span>
                          <span className="reports-dotSep">•</span>
                          <span>{t.project_name}</span>
                          <span className="reports-dotSep">•</span>
                          <span>Status: {t.status}</span>
                        </div>
                      </div>
                      <div className="reports-watchlist-side">
                        <div className="reports-watchlist-date">{fmtDate(t.due_date)}</div>
                        <div className="reports-watchlist-badge">DUE SOON</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
              </div>
            )}
          </div>
        </section>

        {/* Active Projects (Export-first, hidden by default) */}
        <section className="reports-section">
          <div className="reports-section-header">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div className="reports-section-title">
                  <FaListAlt className="reports-section-icon" />
                  <h2>Active Projects Export</h2>
                </div>
                <p className="reports-section-subtitle">
                  Most of the time you only need the Excel. You can optionally expand the list.
                </p>
              </div>

              <div className="reports-controls">
                <button
                  className="reports-filter-chip reports-export-chip"
                  onClick={exportActiveProjectsByPresalesFormatted}
                  disabled={exportingActive}
                  title="Export active projects grouped by presales (formatted)"
                >
                  <FaFileExcel style={{ marginRight: 6 }} />
                  {exportingActive ? 'Exporting…' : 'Download Excel (Grouped)'}
                </button>

                <button
                  className="reports-filter-chip"
                  onClick={() => setShowActiveProjects((v) => !v)}
                  title="Show/hide the active projects list"
                >
                  {showActiveProjects ? 'Hide List' : 'View List'}
                </button>

                {showActiveProjects && (
                  <button
                    className="reports-filter-chip"
                    onClick={refreshProjectsFromDB}
                    disabled={refreshingProjects}
                    title="Refresh projects list from DB"
                  >
                    <FaSyncAlt style={{ marginRight: 6 }} />
                    {refreshingProjects ? 'Refreshing…' : 'Refresh'}
                  </button>
                )}
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
      </main>
    </div>
  );
}

export default ReportsDashboard;
