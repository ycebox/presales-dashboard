// ReportsDashboard.js
import React, { useEffect, useMemo, useState } from 'react';
import {
  FaChartLine,
  FaTrophy,
  FaDollarSign,
  FaTasks,
  FaFlag,
  FaGlobeAsia,
  FaFileExcel
} from 'react-icons/fa';
import { supabase } from './supabaseClient';
import './ReportsDashboard.css';
import * as XLSX from 'xlsx';

// ✅ charts
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
  return `${Number(value).toFixed(0)}%`;
};

function ReportsDashboard() {
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [period, setPeriod] = useState('last90');
  const [presalesFilter, setPresalesFilter] = useState('All');
  const [pipelineGroupBy, setPipelineGroupBy] = useState('country');

  useEffect(() => {
    const fetchData = async () => {
      try {
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
    return projects.filter((p) => new Date(p.created_at) >= periodStart);
  }, [projects, periodStart]);

  const tasksInPeriod = useMemo(() => {
    if (!periodStart) return tasks;
    return tasks.filter((t) => new Date(t.created_at) >= periodStart);
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
      winRate: won.length + lost.length ? (won.length / (won.length + lost.length)) * 100 : null,
      closedWonValue: won.reduce((s, p) => s + (Number(p.deal_value) || 0), 0),
      activePipelineValue: active.reduce((s, p) => s + (Number(p.deal_value) || 0), 0),
      rfpCount: tasksInPeriod.filter((t) => t.task_type?.includes('RFP')).length,
      demosPoCsCount: tasksInPeriod.filter((t) => t.task_type?.includes('Demo')).length,
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
          ? p.account_manager || 'Unassigned'
          : p.country || 'Unknown';

      const val = Number(p.deal_value) || 0;

      if (!map.has(key)) map.set(key, { name: key, count: 0, value: 0 });
      const row = map.get(key);
      row.count += 1;
      row.value += val;
    });

    return Array.from(map.values()).sort((a, b) => b.value - a.value);
  }, [projects, pipelineGroupBy]);

  const pipelineChartData = pipelineGrouped.slice(0, 10);

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
      .map(([presales, items]) => ({ presales, items }))
      .filter((g) => presalesFilter === 'All' || g.presales === presalesFilter);
  }, [projects, presalesFilter]);

  const presalesOptions = ['All', ...new Set(projects.map((p) => p.primary_presales || 'Unassigned'))];

  /* ================= EXCEL EXPORT ================= */
  const exportProjectsByPresalesToExcel = () => {
    const rows = [];
    projectsGroupedByPresales.forEach((g) => {
      rows.push([`Presales: ${g.presales}`]);
      rows.push(['Project', 'Customer', 'Stage', 'Next key activity', 'Value']);
      g.items.forEach((p) => {
        rows.push([
          p.project_name,
          p.customer_name,
          p.sales_stage,
          p.next_key_activity,
          p.deal_value
        ]);
      });
      rows.push([]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Projects by Presales');
    XLSX.writeFile(wb, 'projects_by_presales.xlsx');
  };

  if (loading) return <div className="reports-loading">Loading reports…</div>;
  if (error) return <div className="reports-error">{error}</div>;

  return (
    <div className="reports-page">
      <header className="reports-header">
        <h1 className="reports-title">Presales Reports & Analytics</h1>
      </header>

      {/* KPIs */}
      <section className="reports-section">
        <div className="reports-kpi-grid">
          <div className="reports-kpi-card">
            <span>Win rate</span>
            <strong>{formatPercent(winRate)}</strong>
          </div>
          <div className="reports-kpi-card">
            <span>Closed-won value</span>
            <strong>{formatCurrency(closedWonValue)}</strong>
          </div>
          <div className="reports-kpi-card">
            <span>Active pipeline</span>
            <strong>{formatCurrency(activePipelineValue)}</strong>
          </div>
          <div className="reports-kpi-card">
            <span>RFPs</span>
            <strong>{rfpCount}</strong>
          </div>
          <div className="reports-kpi-card">
            <span>Demos / PoCs</span>
            <strong>{demosPoCsCount}</strong>
          </div>
          <div className="reports-kpi-card">
            <span>Overdue tasks</span>
            <strong>{formatPercent(overduePercent)}</strong>
          </div>
        </div>
      </section>

      {/* Pipeline chart + table */}
      <section className="reports-section">
        <div className="reports-section-header">
          <h2>
            {pipelineGroupBy === 'account_manager'
              ? 'Pipeline by Account Manager'
              : 'Pipeline by Country'}
          </h2>
          <div>
            <button onClick={() => setPipelineGroupBy('country')}>By Country</button>
            <button onClick={() => setPipelineGroupBy('account_manager')}>
              By Account Manager
            </button>
          </div>
        </div>

        <div className="reports-panel" style={{ height: 280 }}>
          <ResponsiveContainer>
            <BarChart data={pipelineChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip formatter={(v) => formatCurrency(v)} />
              <Bar dataKey="value" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="reports-panel">
          <div className="reports-table-header">
            <span>{pipelineLeftColTitle}</span>
            <span>Deals</span>
            <span>Value</span>
          </div>
          {pipelineGrouped.map((r) => (
            <div key={r.name} className="reports-table-row">
              <span>{r.name}</span>
              <span>{r.count}</span>
              <span>{formatCurrency(r.value)}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Projects by Presales */}
      <section className="reports-section">
        <div className="reports-section-header">
          <h2>Projects by Presales</h2>
          <select value={presalesFilter} onChange={(e) => setPresalesFilter(e.target.value)}>
            {presalesOptions.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
          <button onClick={exportProjectsByPresalesToExcel}>
            <FaFileExcel /> Export
          </button>
        </div>

        {projectsGroupedByPresales.map((g) => (
          <div key={g.presales} className="reports-panel">
            <strong>{g.presales}</strong>
            {g.items.map((p) => (
              <div key={p.id} className="reports-table-row">
                <span>{p.project_name}</span>
                <span>{p.sales_stage}</span>
                <span>{p.next_key_activity}</span>
                <span>{formatCurrency(p.deal_value)}</span>
              </div>
            ))}
          </div>
        ))}
      </section>
    </div>
  );
}

export default ReportsDashboard;
