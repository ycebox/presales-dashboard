// ReportsDashboard.js
import React, { useEffect, useMemo, useState } from 'react';
import {
  FaChartLine,
  FaDollarSign,
  FaFlag,
  FaFileExcel,
  FaGlobeAsia,
  FaTasks,
  FaTrophy
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
  Tooltip
} from 'recharts';

const CLOSED_STAGES_FOR_PIPELINE = [
  'Closed-Won',
  'Closed-Lost',
  'Closed-Cancelled/Hold',
  'Done'
];

const WON_STAGES = ['Closed-Won', 'Won'];
const LOST_STAGES = ['Closed-Lost', 'Lost'];
const CANCELLED_STAGES = ['Closed-Cancelled/Hold', 'Cancelled', 'On Hold'];

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

function ReportsDashboard() {
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Period filter (added back for better UX)
  const [period, setPeriod] = useState('last90'); // last90 | ytd | all

  const [presalesFilter, setPresalesFilter] = useState('All');
  const [pipelineGroupBy, setPipelineGroupBy] = useState('country'); // country | account_manager

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

  /* ================= PIPELINE GROUPING ================= */
  const pipelineGrouped = useMemo(() => {
    const map = new Map();

    projects.forEach((p) => {
      if (CLOSED_STAGES_FOR_PIPELINE.includes(p.sales_stage)) return;

      const key =
        pipelineGroupBy === 'account_manager'
          ? (p.account_manager || 'Unassigned')
          : (p.country || 'Unknown');

      const val = Number(p.deal_value) || 0;

      if (!map.has(key)) map.set(key, { name: key, count: 0, value: 0 });
      const row = map.get(key);
      row.count += 1;
      row.value += val;
    });

    return Array.from(map.values()).sort((a, b) => b.value - a.value);
  }, [projects, pipelineGroupBy]);

  const pipelineChartData = useMemo(() => pipelineGrouped.slice(0, 10), [pipelineGrouped]);

  const pipelineLeftColTitle =
    pipelineGroupBy === 'account_manager' ? 'Account Manager' : 'Country';

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
          p.next_key_activity || '—',
          Number(p.deal_value) || 0
        ]);
      });

      rows.push([]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);

    // light formatting helpers (widths + freeze)
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
            Quick snapshot of performance, pipeline, and workload.
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
              <div className="reports-kpi-label"><FaChartLine /><span>Active pipeline</span></div>
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

        {/* Pipeline chart + table */}
        <section className="reports-section">
          <div className="reports-section-header">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div className="reports-section-title">
                  <FaGlobeAsia className="reports-section-icon" />
                  <h2>
                    {pipelineGroupBy === 'account_manager'
                      ? 'Pipeline by Account Manager'
                      : 'Pipeline by Country'}
                  </h2>
                </div>
                <p className="reports-section-subtitle">
                  Active pipeline only (excludes closed stages). Top 10 by value.
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

          <div className="reports-panel reports-chart-panel" style={{ height: 300 }}>
            {pipelineChartData.length === 0 ? (
              <div className="reports-table-row reports-row-muted">
                <span>No active pipeline</span>
                <span>–</span>
                <span>–</span>
              </div>
            ) : (
              <ResponsiveContainer>
                <BarChart data={pipelineChartData} margin={{ top: 10, right: 16, left: 6, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-18} textAnchor="end" height={70} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                  <Bar dataKey="value" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="reports-panel">
            <div className="reports-table-header">
              <span>{pipelineLeftColTitle}</span>
              <span>Deals</span>
              <span>Value</span>
            </div>

            {pipelineGrouped.length === 0 ? (
              <div className="reports-table-row reports-row-muted">
                <span>No active pipeline</span>
                <span>–</span>
                <span>–</span>
              </div>
            ) : (
              pipelineGrouped.map((r) => (
                <div key={r.name} className="reports-table-row">
                  <span>{r.name}</span>
                  <span>{r.count}</span>
                  <span>{formatCurrency(r.value)}</span>
                </div>
              ))
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
              <div className="reports-table-row reports-row-muted">
                <span>No projects found</span>
                <span>–</span>
                <span>–</span>
              </div>
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
                      <span className="reports-wrap">{p.next_key_activity || '—'}</span>
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
