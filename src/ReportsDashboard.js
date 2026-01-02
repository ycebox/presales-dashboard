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

// Treat these as "closed" for pipeline purposes
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
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(num);
};

const formatPercent = (value) => {
  if (value === null || value === undefined) return '–';
  const num = Number(value);
  if (Number.isNaN(num)) return '–';
  return `${num.toFixed(0)}%`;
};

function ReportsDashboard() {
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [period, setPeriod] = useState('last90'); // 'last90' | 'ytd' | 'all'

  // Projects by Presales filter
  const [presalesFilter, setPresalesFilter] = useState('All');

  // Pipeline grouping toggle
  const [pipelineGroupBy, setPipelineGroupBy] = useState('country'); // 'country' | 'account_manager'

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [projectsRes, tasksRes] = await Promise.all([
          supabase
            .from('projects')
            .select(
              'id, customer_name, account_manager, scope, deal_value, product, backup_presales, sales_stage, remarks, due_date, created_at, project_name, project_type, current_status, smartvista_modules, country, primary_presales, is_corporate, next_key_activity, bid_manager_required, bid_manager'
            ),
          supabase.from('project_tasks').select('id, task_type, status, due_date, created_at')
        ]);

        if (projectsRes.error) throw projectsRes.error;
        if (tasksRes.error) throw tasksRes.error;

        setProjects(projectsRes.data || []);
        setTasks(tasksRes.data || []);
      } catch (err) {
        console.error('Error loading reports data:', err);
        setError('Failed to load report data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Time period boundaries
  const { periodStart, periodEnd } = useMemo(() => {
    const today = new Date();
    const end = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      23,
      59,
      59
    );

    if (period === 'last90') {
      const start = new Date();
      start.setDate(start.getDate() - 90);
      return { periodStart: start, periodEnd: end };
    }

    if (period === 'ytd') {
      const start = new Date(today.getFullYear(), 0, 1);
      return { periodStart: start, periodEnd: end };
    }

    return { periodStart: null, periodEnd: end };
  }, [period]);

  const projectsInPeriod = useMemo(() => {
    if (!periodStart) return projects;
    return projects.filter((p) => {
      if (!p.created_at) return false;
      const created = new Date(p.created_at);
      return created >= periodStart && created <= periodEnd;
    });
  }, [projects, periodStart, periodEnd]);

  const tasksInPeriod = useMemo(() => {
    if (!periodStart) return tasks;
    return tasks.filter((t) => {
      if (!t.created_at) return false;
      const created = new Date(t.created_at);
      return created >= periodStart && created <= periodEnd;
    });
  }, [tasks, periodStart, periodEnd]);

  // ===== KPI SUMMARY =====
  const {
    winRate,
    closedWonValue,
    activePipelineValue,
    rfpCount,
    demosPoCsCount,
    overduePercent
  } = useMemo(() => {
    const wonProjects = projectsInPeriod.filter((p) =>
      WON_STAGES.includes(p.sales_stage || '')
    );
    const lostProjects = projectsInPeriod.filter((p) =>
      LOST_STAGES.includes(p.sales_stage || '')
    );

    const closedForWinRate = [...wonProjects, ...lostProjects];
    const wonCount = wonProjects.length;
    const closedCount = closedForWinRate.length;

    const winRateVal = closedCount > 0 ? (wonCount / closedCount) * 100 : null;

    const closedWonValueVal = wonProjects.reduce((sum, p) => {
      const v = Number(p.deal_value) || 0;
      return sum + v;
    }, 0);

    const activeProjects = projects.filter(
      (p) => !CLOSED_STAGES_FOR_PIPELINE.includes(p.sales_stage || '')
    );
    const activePipelineValueVal = activeProjects.reduce((sum, p) => {
      const v = Number(p.deal_value) || 0;
      return sum + v;
    }, 0);

    const rfpTypes = ['RFP / Proposal', 'RFI'];
    const rfpCountVal = tasksInPeriod.filter(
      (t) => t.status === 'Completed' && rfpTypes.includes(t.task_type || '')
    ).length;

    const demoPoCTypes = ['Demo / Walkthrough', 'PoC / Sandbox'];
    const demosPoCsCountVal = tasksInPeriod.filter(
      (t) => t.status === 'Completed' && demoPoCTypes.includes(t.task_type || '')
    ).length;

    const now = new Date();
    const tasksWithDueDate = tasks.filter((t) => t.due_date);
    const overdueTasks = tasksWithDueDate.filter((t) => {
      const due = new Date(t.due_date);
      return due < now && t.status !== 'Completed';
    });

    const overduePct =
      tasksWithDueDate.length > 0
        ? (overdueTasks.length / tasksWithDueDate.length) * 100
        : null;

    return {
      winRate: winRateVal,
      closedWonValue: closedWonValueVal,
      activePipelineValue: activePipelineValueVal,
      rfpCount: rfpCountVal,
      demosPoCsCount: demosPoCsCountVal,
      overduePercent: overduePct
    };
  }, [projects, projectsInPeriod, tasks, tasksInPeriod]);

  // ===== WIN / LOSS OVERVIEW TABLE =====
  const winLossStats = useMemo(() => {
    const won = projectsInPeriod.filter((p) => WON_STAGES.includes(p.sales_stage || ''));
    const lost = projectsInPeriod.filter((p) => LOST_STAGES.includes(p.sales_stage || ''));
    const cancelled = projectsInPeriod.filter((p) =>
      CANCELLED_STAGES.includes(p.sales_stage || '')
    );
    const doneGeneric = projectsInPeriod.filter((p) => (p.sales_stage || '') === 'Done');

    const sumValue = (arr) => arr.reduce((sum, p) => sum + (Number(p.deal_value) || 0), 0);

    return {
      wonCount: won.length,
      wonValue: sumValue(won),
      lostCount: lost.length,
      lostValue: sumValue(lost),
      cancelledCount: cancelled.length,
      cancelledValue: sumValue(cancelled),
      doneCount: doneGeneric.length,
      doneValue: sumValue(doneGeneric)
    };
  }, [projectsInPeriod]);

  // ===== PIPELINE BY STAGE =====
  const pipelineByStage = useMemo(() => {
    if (!projects || projects.length === 0) return [];

    const stageMap = new Map();

    projects.forEach((p) => {
      const stage = p.sales_stage || 'Unknown';
      const value = Number(p.deal_value) || 0;

      if (!stageMap.has(stage)) stageMap.set(stage, { stage, count: 0, value: 0 });

      const entry = stageMap.get(stage);
      entry.count += 1;
      entry.value += value;
    });

    const list = Array.from(stageMap.values());

    const ORDER = [
      'Lead',
      'Opportunity',
      'Proposal',
      'RFP',
      'SoW',
      'Contracting',
      'Done',
      'Closed-Won',
      'Closed-Lost',
      'Closed-Cancelled/Hold'
    ];

    list.sort((a, b) => {
      const ia = ORDER.indexOf(a.stage);
      const ib = ORDER.indexOf(b.stage);
      if (ia === -1 && ib === -1) return a.stage.localeCompare(b.stage);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });

    return list;
  }, [projects]);

  // ===== ACTIVITY BY TASK TYPE =====
  const activityByTaskType = useMemo(() => {
    if (!tasksInPeriod || tasksInPeriod.length === 0) return [];

    const typeMap = new Map();
    tasksInPeriod.forEach((t) => {
      const type = t.task_type || 'Uncategorized';
      if (!typeMap.has(type)) typeMap.set(type, { type, completed: 0 });
      if (t.status === 'Completed') typeMap.get(type).completed += 1;
    });

    const list = Array.from(typeMap.values());
    list.sort((a, b) => b.completed - a.completed);
    return list;
  }, [tasksInPeriod]);

  // ===== Pipeline grouped (Country or Account Manager) =====
  const pipelineGrouped = useMemo(() => {
    if (!projects || projects.length === 0) return [];

    const map = new Map();

    projects.forEach((p) => {
      const stage = p.sales_stage || '';
      if (CLOSED_STAGES_FOR_PIPELINE.includes(stage)) return;

      const groupKey =
        pipelineGroupBy === 'account_manager'
          ? (p.account_manager || '').trim() || 'Unassigned'
          : (p.country || '').trim() || 'Unknown';

      const value = Number(p.deal_value) || 0;

      if (!map.has(groupKey)) map.set(groupKey, { key: groupKey, count: 0, value: 0 });

      const entry = map.get(groupKey);
      entry.count += 1;
      entry.value += value;
    });

    const list = Array.from(map.values());
    list.sort((a, b) => b.value - a.value);
    return list;
  }, [projects, pipelineGroupBy]);

  const totalPipelineValueGrouped = useMemo(() => {
    return pipelineGrouped.reduce((sum, r) => sum + r.value, 0);
  }, [pipelineGrouped]);

  const getGroupShare = (value) => {
    if (!totalPipelineValueGrouped) return null;
    return (value / totalPipelineValueGrouped) * 100;
  };

  // ===== Projects grouped by Presales =====
  const projectsGroupedByPresalesAll = useMemo(() => {
    const map = new Map();

    projects.forEach((p) => {
      const presales = (p.primary_presales || '').trim() || 'Unassigned';
      if (!map.has(presales)) map.set(presales, []);
      map.get(presales).push(p);
    });

    const groups = Array.from(map.entries()).map(([presales, items]) => {
      const sorted = [...items].sort((a, b) => {
        const aName = (a.project_name || '').toLowerCase();
        const bName = (b.project_name || '').toLowerCase();
        return aName.localeCompare(bName);
      });
      return { presales, items: sorted };
    });

    groups.sort((a, b) => a.presales.localeCompare(b.presales));
    return groups;
  }, [projects]);

  const presalesOptions = useMemo(() => {
    const opts = projectsGroupedByPresalesAll.map((g) => g.presales);
    return ['All', ...opts];
  }, [projectsGroupedByPresalesAll]);

  const projectsGroupedByPresales = useMemo(() => {
    if (presalesFilter === 'All') return projectsGroupedByPresalesAll;
    return projectsGroupedByPresalesAll.filter((g) => g.presales === presalesFilter);
  }, [projectsGroupedByPresalesAll, presalesFilter]);

  const exportProjectsByPresalesToExcel = () => {
    const aoa = [];
    const COLS = ['Project', 'Customer', 'Country', 'Account Manager', 'Stage', 'Next key activity', 'Value'];

    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');

    aoa.push(['Projects by Presales']);
    aoa.push([`Generated: ${yyyy}-${mm}-${dd}`]);
    aoa.push([`Filter: ${presalesFilter}`]);
    aoa.push([]);

    projectsGroupedByPresales.forEach((group, idx) => {
      aoa.push([`Presales: ${group.presales} (${group.items.length})`]);
      aoa.push(COLS);

      group.items.forEach((p) => {
        aoa.push([
          p.project_name || '—',
          p.customer_name || '—',
          p.country || 'Unknown',
          p.account_manager || 'Unassigned',
          p.sales_stage || '—',
          p.next_key_activity || '—',
          Number(p.deal_value) || 0
        ]);
      });

      if (idx < projectsGroupedByPresales.length - 1) aoa.push([]);
    });

    const ws = XLSX.utils.aoa_to_sheet(aoa);

    ws['!cols'] = [
      { wch: 28 },
      { wch: 22 },
      { wch: 16 },
      { wch: 20 },
      { wch: 14 },
      { wch: 40 },
      { wch: 14 }
    ];

    ws['!freeze'] = { xSplit: 0, ySplit: 4 };

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Projects by Presales');

    const suffix =
      presalesFilter === 'All'
        ? 'all'
        : presalesFilter.replace(/[^a-z0-9]+/gi, '_').toLowerCase();

    XLSX.writeFile(wb, `projects_by_presales_${suffix}_${yyyy}-${mm}-${dd}.xlsx`);
  };

  const handleFilterClick = (value) => setPeriod(value);

  if (loading) {
    return (
      <div className="reports-page">
        <header className="reports-header">
          <div className="reports-header-left">
            <h1 className="reports-title">Presales Reports & Analytics</h1>
            <p className="reports-subtitle">High-level view of presales performance, pipeline, and activity.</p>
          </div>
        </header>
        <div className="reports-loading">
          <div className="reports-loading-spinner" />
          <span>Loading reports...</span>
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
            <p className="reports-subtitle">High-level view of presales performance, pipeline, and activity.</p>
          </div>
        </header>
        <div className="reports-error">
          <span>{error}</span>
        </div>
      </div>
    );
  }

  // ✅ This ensures the left column label and row name always match the selected mode
  const pipelineLeftColTitle =
    pipelineGroupBy === 'account_manager' ? 'Account Manager' : 'Country';

  return (
    <div className="reports-page">
      <header className="reports-header">
        <div className="reports-header-left">
          <h1 className="reports-title">Presales Reports & Analytics</h1>
          <p className="reports-subtitle">High-level view of presales performance, pipeline, and activity.</p>
        </div>

        <div className="reports-filters">
          <button
            className={period === 'last90' ? 'reports-filter-chip reports-filter-chip-active' : 'reports-filter-chip'}
            onClick={() => handleFilterClick('last90')}
          >
            Last 90 days
          </button>
          <button
            className={period === 'ytd' ? 'reports-filter-chip reports-filter-chip-active' : 'reports-filter-chip'}
            onClick={() => handleFilterClick('ytd')}
          >
            Year to date
          </button>
          <button
            className={period === 'all' ? 'reports-filter-chip reports-filter-chip-active' : 'reports-filter-chip'}
            onClick={() => handleFilterClick('all')}
          >
            All time
          </button>
        </div>
      </header>

      <main className="reports-main">
        {/* KPI / WinLoss / PipelineStage / Activity unchanged (same as before) */}

        {/* ✅ Pipeline panel with toggle */}
        <section className="reports-section">
          <div className="reports-section-header">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, width: '100%' }}>
              <div>
                <div className="reports-section-title">
                  <FaGlobeAsia className="reports-section-icon" />
                  <h2>
                    {pipelineGroupBy === 'account_manager'
                      ? 'Pipeline by Account Manager'
                      : 'Pipeline by Country'}
                  </h2>
                </div>
                <p className="reports-section-subtitle" style={{ marginTop: 6 }}>
                  Active pipeline only (excludes closed stages).
                </p>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  className={pipelineGroupBy === 'country' ? 'reports-filter-chip reports-filter-chip-active' : 'reports-filter-chip'}
                  onClick={() => setPipelineGroupBy('country')}
                >
                  By Country
                </button>
                <button
                  className={pipelineGroupBy === 'account_manager' ? 'reports-filter-chip reports-filter-chip-active' : 'reports-filter-chip'}
                  onClick={() => setPipelineGroupBy('account_manager')}
                >
                  By Account Manager
                </button>
              </div>
            </div>
          </div>

          <div className="reports-panel">
            <div className="reports-table-header">
              <span>{pipelineLeftColTitle}</span>
              <span>Active deals</span>
              <span>Pipeline value</span>
            </div>

            {pipelineGrouped.length === 0 ? (
              <div className="reports-table-row reports-row-muted">
                <span>No active pipeline</span>
                <span>–</span>
                <span>–</span>
              </div>
            ) : (
              pipelineGrouped.map((r) => (
                <div key={r.key} className="reports-table-row">
                  {/* ✅ This is always the right name (AM or Country) because r.key is built from the selected mode */}
                  <span>
                    {r.key}
                    {(() => {
                      const share = getGroupShare(r.value);
                      if (!share) return null;
                      return ` (${share.toFixed(0)}%)`;
                    })()}
                  </span>
                  <span>{r.count}</span>
                  <span>{formatCurrency(r.value)}</span>
                </div>
              ))
            )}
          </div>
        </section>

        {/* ✅ Projects by Presales section (with filter + export) */}
        <section className="reports-section">
          <div className="reports-section-header">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, width: '100%' }}>
              <div>
                <div className="reports-section-title">
                  <FaTasks className="reports-section-icon" />
                  <h2>Projects by Presales</h2>
                </div>
                <p className="reports-section-subtitle" style={{ marginTop: 6 }}>
                  Grouped by the primary presales assigned on each project.
                </p>
              </div>

              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, opacity: 0.8 }}>Presales:</span>
                  <select
                    value={presalesFilter}
                    onChange={(e) => setPresalesFilter(e.target.value)}
                    style={{
                      height: 34,
                      borderRadius: 10,
                      border: '1px solid rgba(15, 23, 42, 0.12)',
                      padding: '0 10px',
                      background: '#fff',
                      fontSize: 12
                    }}
                  >
                    {presalesOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  className="reports-filter-chip reports-export-chip"
                  onClick={exportProjectsByPresalesToExcel}
                  title="Export Projects grouped by Presales"
                  style={{ whiteSpace: 'nowrap' }}
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
              </div>
            </div>
          ) : (
            projectsGroupedByPresales.map((group) => (
              <div key={group.presales} className="reports-presales-group">
                <div className="reports-presales-group-header">
                  <div className="reports-presales-name">{group.presales}</div>
                  <div className="reports-presales-count">
                    {group.items.length} project{group.items.length !== 1 ? 's' : ''}
                  </div>
                </div>

                <div className="reports-panel">
                  <div className="reports-table-header reports-presales-table">
                    <span>Project</span>
                    <span>Customer</span>
                    <span>Stage</span>
                    <span>Next key activity</span>
                    <span>Value</span>
                  </div>

                  {group.items.map((p) => (
                    <div key={p.id} className="reports-table-row reports-presales-table">
                      <span>{p.project_name || '—'}</span>
                      <span>{p.customer_name || '—'}</span>
                      <span>{p.sales_stage || '—'}</span>
                      <span>{p.next_key_activity || '—'}</span>
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
