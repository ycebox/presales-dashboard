// ReportsDashboard.js
import React, { useEffect, useMemo, useState } from 'react';
import {
  FaChartLine,
  FaTrophy,
  FaDollarSign,
  FaTasks,
  FaFlag,
  FaGlobeAsia
} from 'react-icons/fa';
import { supabase } from './supabaseClient';
import './ReportsDashboard.css';

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
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // For now we hardcode "Last 90 days"
  const [period, setPeriod] = useState('last90'); // 'last90' | 'ytd' | 'all'

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [projectsRes, tasksRes, customersRes] = await Promise.all([
          supabase
            .from('projects')
            .select('id, project_name, customer_name, sales_stage, deal_value, created_at'),
          supabase
            .from('project_tasks')
            .select('id, task_type, status, due_date, created_at'),
          // 🔧 FIX HERE: use `country` instead of `customer_country`
          supabase
            .from('customers')
            .select('id, customer_name, country')
        ]);

        if (projectsRes.error) throw projectsRes.error;
        if (tasksRes.error) throw tasksRes.error;
        if (customersRes.error) throw customersRes.error;

        setProjects(projectsRes.data || []);
        setTasks(tasksRes.data || []);
        setCustomers(customersRes.data || []);
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

    // 'all' – effectively no start filter
    return { periodStart: null, periodEnd: end };
  }, [period]);

  const projectsInPeriod = useMemo(() => {
    if (!periodStart) return projects; // "all time"
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

  // Build customer -> country map
  const customerCountryMap = useMemo(() => {
    const map = new Map();
    customers.forEach((c) => {
      if (c.customer_name) {
        // Use whichever field exists; your table has `country`
        const country =
          c.country || c.customer_country || 'Unknown';
        map.set(c.customer_name, country);
      }
    });
    return map;
  }, [customers]);

  // ===== KPI SUMMARY =====
  const {
    winRate,
    closedWonValue,
    activePipelineValue,
    rfpCount,
    demosPoCsCount,
    overduePercent
  } = useMemo(() => {
    // Win / loss based on projectsInPeriod
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

    // Active pipeline (all time): not in closed/cancelled/done list
    const activeProjects = projects.filter(
      (p) => !CLOSED_STAGES_FOR_PIPELINE.includes(p.sales_stage || '')
    );
    const activePipelineValueVal = activeProjects.reduce((sum, p) => {
      const v = Number(p.deal_value) || 0;
      return sum + v;
    }, 0);

    // RFP / Proposals (tasks)
    const rfpTypes = ['RFP / Proposal', 'RFI'];
    const rfpCountVal = tasksInPeriod.filter(
      (t) =>
        t.status === 'Completed' &&
        rfpTypes.includes(t.task_type || '')
    ).length;

    // Demos & PoCs (tasks)
    const demoPoCTypes = ['Demo / Walkthrough', 'PoC / Sandbox'];
    const demosPoCsCountVal = tasksInPeriod.filter(
      (t) =>
        t.status === 'Completed' &&
        demoPoCTypes.includes(t.task_type || '')
    ).length;

    // Overdue tasks % (all tasks, regardless of period)
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

  // ===== PIPELINE BY COUNTRY =====
  const pipelineByCountry = useMemo(() => {
    if (!projects || projects.length === 0) return [];

    const countryMap = new Map();

    projects.forEach((p) => {
      const stage = p.sales_stage || '';
      // Only active pipeline by country
      if (CLOSED_STAGES_FOR_PIPELINE.includes(stage)) return;

      const customerName = p.customer_name || '';
      const country = customerCountryMap.get(customerName) || 'Unknown';
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
  }, [projects, customerCountryMap]);

  const totalPipelineValueForCountry = useMemo(() => {
    return pipelineByCountry.reduce((sum, c) => sum + c.value, 0);
  }, [pipelineByCountry]);

  const getCountryShare = (value) => {
    if (!totalPipelineValueForCountry) return null;
    return (value / totalPipelineValueForCountry) * 100;
  };

  const handleFilterClick = (value) => {
    setPeriod(value);
  };

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
      {/* Page header */}
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
              <div className="reports-kpi-value">
                {formatPercent(winRate)}
              </div>
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
              <div className="reports-kpi-hint">
                Deals won in selected period
              </div>
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
              <div className="reports-kpi-hint">
                Completed in selected period
              </div>
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
      </main>
    </div>
  );
}

export default ReportsDashboard;
