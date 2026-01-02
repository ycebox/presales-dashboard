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
  if (!value && value !== 0) return '–';
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [projectsRes, tasksRes] = await Promise.all([
          supabase
            .from('projects')
            // ✅ aligned with your projects table
            .select(
              'id, customer_name, account_manager, scope, deal_value, product, backup_presales, sales_stage, remarks, due_date, created_at, project_name, project_type, current_status, smartvista_modules, country, primary_presales, is_corporate, next_key_activity, bid_manager_required, bid_manager'
            ),
          supabase
            .from('project_tasks')
            .select('id, task_type, status, due_date, created_at')
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

  // created_at is DATE in your schema, so parsing works fine
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

    const winRateVal =
      closedCount > 0 ? (wonCount / closedCount) * 100 : null;

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
      (t) =>
        t.status === 'Completed' && demoPoCTypes.includes(t.task_type || '')
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
    const won = projectsInPeriod.filter((p) =>
      WON_STAGES.includes(p.sales_stage || '')
    );
    const lost = projectsInPeriod.filter((p) =>
      LOST_STAGES.includes(p.sales_stage || '')
    );
    const cancelled = projectsInPeriod.filter((p) =>
      CANCELLED_STAGES.includes(p.sales_stage || '')
    );
    const doneGeneric = projectsInPeriod.filter(
      (p) => (p.sales_stage || '') === 'Done'
    );

    const sumValue = (arr) =>
      arr.reduce((sum, p) => sum + (Number(p.deal_value) || 0), 0);

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

      if (!stageMap.has(stage)) {
        stageMap.set(stage, {
          stage,
          count: 0,
          value: 0
        });
      }

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
      if (!typeMap.has(type)) {
        typeMap.set(type, { type, completed: 0 });
      }
      if (t.status === 'Completed') {
        typeMap.get(type).completed += 1;
      }
    });

    const list = Array.from(typeMap.values());
    list.sort((a, b) => b.completed - a.completed);
    return list;
  }, [tasksInPeriod]);

  // ===== PIPELINE BY COUNTRY (use projects.country directly) =====
  const pipelineByCountry = useMemo(() => {
    if (!projects || projects.length === 0) return [];

    const countryMap = new Map();

    projects.forEach((p) => {
      const stage = p.sales_stage || '';
      if (CLOSED_STAGES_FOR_PIPELINE.includes(stage)) return;

      const country = p.country || 'Unknown';
      const value = Number(p.deal_value) || 0;

      if (!countryMap.has(country)) {
        countryMap.set(country, { country, count: 0, value: 0 });
      }
      const entry = countryMap.get(country);
      entry.count += 1;
      entry.value += value;
    });

    const list = Array.from(countryMap.values());
    list.sort((a, b) => b.value - a.value);
    return list;
  }, [projects]);

  const totalPipelineValueForCountry = useMemo(() => {
    return pipelineByCountry.reduce((sum, c) => sum + c.value, 0);
  }, [pipelineByCountry]);

  const getCountryShare = (value) => {
    if (!totalPipelineValueForCountry) return null;
    return (value / totalPipelineValueForCountry) * 100;
  };

  // ✅ Projects grouped by projects.primary_presales (TEXT)
  const projectsGroupedByPresales = useMemo(() => {
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

  // Excel export (grouped + formatted layout)
  const exportProjectsByPresalesToExcel = () => {
    const aoa = [];
    const COLS = [
      'Project',
      'Customer',
      'Country',
      'Stage',
      'Next key activity',
      'Value'
    ];

    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');

    aoa.push(['Projects by Presales']);
    aoa.push([`Generated: ${yyyy}-${mm}-${dd}`]);
    aoa.push([]);

    projectsGroupedByPresales.forEach((group, idx) => {
      aoa.push([`Presales: ${group.presales} (${group.items.length})`]);
      aoa.push(COLS);

      group.items.forEach((p) => {
        aoa.push([
          p.project_name || '—',
          p.customer_name || '—',
          p.country || 'Unknown',
          p.sales_stage || '—',
          p.next_key_activity || '—',
          Number(p.deal_value) || 0
        ]);
      });

      if (idx < projectsGroupedByPresales.length - 1) aoa.push([]);
    });

    const ws = XLSX.utils.aoa_to_sheet(aoa);

    ws['!cols'] = [
      { wch: 28 }, // Project
      { wch: 22 }, // Customer
      { wch: 16 }, // Country
      { wch: 14 }, // Stage
      { wch: 40 }, // Next key activity
      { wch: 14 }  // Value
    ];

    ws['!freeze'] = { xSplit: 0, ySplit: 3 };

    const merges = [];
    merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } });
    merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: 5 } });

    const setCellStyle = (addr, style) => {
      if (!ws[addr]) return;
      ws[addr].s = style;
    };

    // Styling note: some environments ignore .s styles. Layout still works.
    const titleStyle = {
      font: { bold: true, sz: 16 },
      alignment: { horizontal: 'left', vertical: 'center' }
    };

    const metaStyle = {
      font: { italic: true, sz: 11 },
      alignment: { horizontal: 'left', vertical: 'center' }
    };

    const presalesStyle = {
      font: { bold: true, sz: 12 },
      alignment: { horizontal: 'left', vertical: 'center' }
    };

    const headerStyle = {
      font: { bold: true, sz: 11 },
      alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
      border: {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' }
      }
    };

    const rowStyle = {
      font: { sz: 11 },
      alignment: { horizontal: 'left', vertical: 'top', wrapText: true },
      border: {
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' }
      }
    };

    const moneyStyle = {
      ...rowStyle,
      numFmt: '$#,##0'
    };

    setCellStyle('A1', titleStyle);
    setCellStyle('A2', metaStyle);

    let r = 3; // 0-based
    projectsGroupedByPresales.forEach((group) => {
      merges.push({ s: { r, c: 0 }, e: { r, c: 5 } });
      setCellStyle(`A${r + 1}`, presalesStyle);

      const headerRowNum = r + 2; // 1-based row
      ['A', 'B', 'C', 'D', 'E', 'F'].forEach((col) => {
        setCellStyle(`${col}${headerRowNum}`, headerStyle);
      });

      for (let i = 0; i < group.items.length; i++) {
        const rowNum = r + 3 + i;
        setCellStyle(`A${rowNum}`, rowStyle);
        setCellStyle(`B${rowNum}`, rowStyle);
        setCellStyle(`C${rowNum}`, rowStyle);
        setCellStyle(`D${rowNum}`, rowStyle);
        setCellStyle(`E${rowNum}`, rowStyle);
        setCellStyle(`F${rowNum}`, moneyStyle);
      }

      r = r + 2 + group.items.length + 1;
    });

    ws['!merges'] = merges;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Projects by Presales');
    XLSX.writeFile(wb, `projects_by_presales_${yyyy}-${mm}-${dd}.xlsx`);
  };

  const handleFilterClick = (value) => setPeriod(value);

  if (loading) {
    return (
      <div className="reports-page">
        <header className="reports-header">
          <div className="reports-header-left">
            <h1 className="reports-title">Presales Reports & Analytics</h1>
            <p className="reports-subtitle">
              High-level view of presales performance, pipeline, and activity.
            </p>
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
            <p className="reports-subtitle">
              High-level view of presales performance, pipeline, and activity.
            </p>
          </div>
        </header>
        <div className="reports-error">
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="reports-page">
      <header className="reports-header">
        <div className="reports-header-left">
          <h1 className="reports-title">Presales Reports & Analytics</h1>
          <p className="reports-subtitle">
            High-level view of presales performance, pipeline, and activity.
          </p>
        </div>

        <div className="reports-filters">
          <button
            className={
              period === 'last90'
                ? 'reports-filter-chip reports-filter-chip-active'
                : 'reports-filter-chip'
            }
            onClick={() => handleFilterClick('last90')}
          >
            Last 90 days
          </button>
          <button
            className={
              period === 'ytd'
                ? 'reports-filter-chip reports-filter-chip-active'
                : 'reports-filter-chip'
            }
            onClick={() => handleFilterClick('ytd')}
          >
            Year to date
          </button>
          <button
            className={
              period === 'all'
                ? 'reports-filter-chip reports-filter-chip-active'
                : 'reports-filter-chip'
            }
            onClick={() => handleFilterClick('all')}
          >
            All time
          </button>
        </div>
      </header>

      <main className="reports-main">
        {/* Section A: KPI summary */}
        <section className="reports-section">
          <div className="reports-section-header">
            <div className="reports-section-title">
              <FaChartLine className="reports-section-icon" />
              <h2>Performance KPIs</h2>
            </div>
            <p className="reports-section-subtitle">
              Summary of wins, pipeline value, and presales activity.
            </p>
          </div>

          <div className="reports-kpi-grid">
            <div className="reports-kpi-card">
              <div className="reports-kpi-label">
                <FaTrophy />
                <span>Win rate</span>
              </div>
              <div className="reports-kpi-value">{formatPercent(winRate)}</div>
              <div className="reports-kpi-hint">
                Closed-won vs closed-lost (selected period)
              </div>
            </div>

            <div className="reports-kpi-card">
              <div className="reports-kpi-label">
                <FaDollarSign />
                <span>Closed-won value</span>
              </div>
              <div className="reports-kpi-value">
                {formatCurrency(closedWonValue)}
              </div>
              <div className="reports-kpi-hint">Deals won in selected period</div>
            </div>

            <div className="reports-kpi-card">
              <div className="reports-kpi-label">
                <FaChartLine />
                <span>Active pipeline</span>
              </div>
              <div className="reports-kpi-value">
                {formatCurrency(activePipelineValue)}
              </div>
              <div className="reports-kpi-hint">
                Open opportunities by value (current)
              </div>
            </div>

            <div className="reports-kpi-card">
              <div className="reports-kpi-label">
                <FaTasks />
                <span>RFP / Proposals</span>
              </div>
              <div className="reports-kpi-value">{rfpCount || 0}</div>
              <div className="reports-kpi-hint">Completed in selected period</div>
            </div>

            <div className="reports-kpi-card">
              <div className="reports-kpi-label">
                <FaTasks />
                <span>Demos & PoCs</span>
              </div>
              <div className="reports-kpi-value">{demosPoCsCount || 0}</div>
              <div className="reports-kpi-hint">
                Delivered to customers (selected period)
              </div>
            </div>

            <div className="reports-kpi-card">
              <div className="reports-kpi-label">
                <FaFlag />
                <span>Overdue tasks</span>
              </div>
              <div className="reports-kpi-value">
                {formatPercent(overduePercent)}
              </div>
              <div className="reports-kpi-hint">
                Share of tasks beyond due date (all tasks)
              </div>
            </div>
          </div>
        </section>

        {/* Section B: Win / loss breakdown */}
        <section className="reports-section">
          <div className="reports-section-header">
            <div className="reports-section-title">
              <FaTrophy className="reports-section-icon" />
              <h2>Win / Loss Overview</h2>
            </div>
            <p className="reports-section-subtitle">
              Deals we won, lost, or closed in the selected period (by project stage).
            </p>
          </div>

          <div className="reports-panel">
            <div className="reports-table-header">
              <span>Result</span>
              <span>Count</span>
              <span>Total value</span>
            </div>
            <div className="reports-table-row">
              <span>Won</span>
              <span>{winLossStats.wonCount}</span>
              <span>{formatCurrency(winLossStats.wonValue)}</span>
            </div>
            <div className="reports-table-row">
              <span>Lost</span>
              <span>{winLossStats.lostCount}</span>
              <span>{formatCurrency(winLossStats.lostValue)}</span>
            </div>
            <div className="reports-table-row">
              <span>Cancelled / On hold</span>
              <span>{winLossStats.cancelledCount}</span>
              <span>{formatCurrency(winLossStats.cancelledValue)}</span>
            </div>
            <div className="reports-table-row">
              <span>Completed (Done)</span>
              <span>{winLossStats.doneCount}</span>
              <span>{formatCurrency(winLossStats.doneValue)}</span>
            </div>
          </div>
        </section>

        {/* Section C: Pipeline by stage */}
        <section className="reports-section">
          <div className="reports-section-header">
            <div className="reports-section-title">
              <FaChartLine className="reports-section-icon" />
              <h2>Pipeline by Stage</h2>
            </div>
            <p className="reports-section-subtitle">
              Distribution of opportunities across sales stages (current snapshot).
            </p>
          </div>

          <div className="reports-panel">
            <div className="reports-table-header">
              <span>Stage</span>
              <span>Deals</span>
              <span>Pipeline value</span>
            </div>
            {pipelineByStage.length === 0 ? (
              <div className="reports-table-row reports-row-muted">
                <span>No projects found</span>
                <span>–</span>
                <span>–</span>
              </div>
            ) : (
              pipelineByStage.map((s) => (
                <div key={s.stage} className="reports-table-row">
                  <span>{s.stage}</span>
                  <span>{s.count}</span>
                  <span>{formatCurrency(s.value)}</span>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Section D: Activity by task type */}
        <section className="reports-section">
          <div className="reports-section-header">
            <div className="reports-section-title">
              <FaTasks className="reports-section-icon" />
              <h2>Activity by Task Type</h2>
            </div>
            <p className="reports-section-subtitle">
              How presales time is used across demos, RFPs, PoCs, and internal work (selected period).
            </p>
          </div>

          <div className="reports-panel">
            <div className="reports-table-header">
              <span>Task type</span>
              <span>Completed (period)</span>
            </div>
            {activityByTaskType.length === 0 ? (
              <div className="reports-table-row reports-row-muted">
                <span>No tasks found for this period</span>
                <span>–</span>
              </div>
            ) : (
              activityByTaskType.map((t) => (
                <div key={t.type} className="reports-table-row">
                  <span>{t.type}</span>
                  <span>{t.completed}</span>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Section E: Deals by country */}
        <section className="reports-section">
          <div className="reports-section-header">
            <div className="reports-section-title">
              <FaGlobeAsia className="reports-section-icon" />
              <h2>Pipeline by Country</h2>
            </div>
            <p className="reports-section-subtitle">
              Which markets are driving the most active opportunities and value.
            </p>
          </div>

          <div className="reports-panel">
            <div className="reports-table-header">
              <span>Country</span>
              <span>Active deals</span>
              <span>Pipeline value</span>
            </div>
            {pipelineByCountry.length === 0 ? (
              <div className="reports-table-row reports-row-muted">
                <span>No active pipeline</span>
                <span>–</span>
                <span>–</span>
              </div>
            ) : (
              pipelineByCountry.map((c) => (
                <div key={c.country} className="reports-table-row">
                  <span>
                    {c.country}
                    {(() => {
                      const share = getCountryShare(c.value);
                      if (!share) return null;
                      return ` (${share.toFixed(0)}%)`;
                    })()}
                  </span>
                  <span>{c.count}</span>
                  <span>{formatCurrency(c.value)}</span>
                </div>
              ))
            )}
          </div>
        </section>

        {/* ✅ Section F: Projects grouped by Presales */}
        <section className="reports-section">
          <div className="reports-section-header">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                width: '100%'
              }}
            >
              <div>
                <div className="reports-section-title">
                  <FaTasks className="reports-section-icon" />
                  <h2>Projects by Presales</h2>
                </div>
                <p className="reports-section-subtitle" style={{ marginTop: 6 }}>
                  Grouped by the primary presales assigned on each project.
                </p>
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
                    {group.items.length} project
                    {group.items.length !== 1 ? 's' : ''}
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
                    <div
                      key={p.id}
                      className="reports-table-row reports-presales-table"
                    >
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
