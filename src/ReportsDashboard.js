// ReportsDashboard.js
import React from 'react';
import {
  FaChartLine,
  FaTrophy,
  FaDollarSign,
  FaTasks,
  FaFlag,
  FaGlobeAsia
} from 'react-icons/fa';
import './ReportsDashboard.css';

function ReportsDashboard() {
  // Later we will:
  // - Add Supabase queries here (projects + project_tasks)
  // - Compute KPIs for the selected period

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
        {/* Placeholder for future filters (date range, country, etc.) */}
        <div className="reports-filters">
          <button className="reports-filter-chip reports-filter-chip-active">
            Last 90 days
          </button>
          <button className="reports-filter-chip">
            Year to date
          </button>
          <button className="reports-filter-chip">
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
              <div className="reports-kpi-value">– %</div>
              <div className="reports-kpi-hint">Closed-won vs closed-lost</div>
            </div>

            <div className="reports-kpi-card">
              <div className="reports-kpi-label">
                <FaDollarSign />
                <span>Closed-won value</span>
              </div>
              <div className="reports-kpi-value">–</div>
              <div className="reports-kpi-hint">Deals won in selected period</div>
            </div>

            <div className="reports-kpi-card">
              <div className="reports-kpi-label">
                <FaChartLine />
                <span>Active pipeline</span>
              </div>
              <div className="reports-kpi-value">–</div>
              <div className="reports-kpi-hint">Open opportunities by value</div>
            </div>

            <div className="reports-kpi-card">
              <div className="reports-kpi-label">
                <FaTasks />
                <span>RFP / Proposals</span>
              </div>
              <div className="reports-kpi-value">–</div>
              <div className="reports-kpi-hint">Completed in selected period</div>
            </div>

            <div className="reports-kpi-card">
              <div className="reports-kpi-label">
                <FaTasks />
                <span>Demos & PoCs</span>
              </div>
              <div className="reports-kpi-value">–</div>
              <div className="reports-kpi-hint">Delivered to customers</div>
            </div>

            <div className="reports-kpi-card">
              <div className="reports-kpi-label">
                <FaFlag />
                <span>Overdue tasks</span>
              </div>
              <div className="reports-kpi-value">– %</div>
              <div className="reports-kpi-hint">Share of tasks beyond due date</div>
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
              How many deals we won, lost, or cancelled in the selected period.
            </p>
          </div>

          <div className="reports-panel">
            <div className="reports-table-header">
              <span>Result</span>
              <span>Count</span>
              <span>Total value</span>
            </div>
            <div className="reports-table-row reports-row-muted">
              <span>Won</span>
              <span>–</span>
              <span>–</span>
            </div>
            <div className="reports-table-row reports-row-muted">
              <span>Lost</span>
              <span>–</span>
              <span>–</span>
            </div>
            <div className="reports-table-row reports-row-muted">
              <span>Cancelled / On hold</span>
              <span>–</span>
              <span>–</span>
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
              Distribution of opportunities across sales stages.
            </p>
          </div>

          <div className="reports-panel">
            <div className="reports-table-header">
              <span>Stage</span>
              <span>Deals</span>
              <span>Pipeline value</span>
            </div>
            {/* Placeholder rows */}
            <div className="reports-table-row reports-row-muted">
              <span>Discovery</span>
              <span>–</span>
              <span>–</span>
            </div>
            <div className="reports-table-row reports-row-muted">
              <span>Demo / PoC</span>
              <span>–</span>
              <span>–</span>
            </div>
            <div className="reports-table-row reports-row-muted">
              <span>RFP / SoW</span>
              <span>–</span>
              <span>–</span>
            </div>
            <div className="reports-table-row reports-row-muted">
              <span>Contracting</span>
              <span>–</span>
              <span>–</span>
            </div>
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
              How presales time is used across demos, RFPs, PoCs, and internal work.
            </p>
          </div>

          <div className="reports-panel">
            <div className="reports-table-header">
              <span>Task type</span>
              <span>Completed (period)</span>
            </div>
            <div className="reports-table-row reports-row-muted">
              <span>RFP / Proposal</span>
              <span>–</span>
            </div>
            <div className="reports-table-row reports-row-muted">
              <span>Demo / Walkthrough</span>
              <span>–</span>
            </div>
            <div className="reports-table-row reports-row-muted">
              <span>PoC / Sandbox</span>
              <span>–</span>
            </div>
            <div className="reports-table-row reports-row-muted">
              <span>Discovery / Workshop</span>
              <span>–</span>
            </div>
            <div className="reports-table-row reports-row-muted">
              <span>Internal / Admin</span>
              <span>–</span>
            </div>
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
              Which markets are driving the most opportunities and value.
            </p>
          </div>

          <div className="reports-panel">
            <div className="reports-table-header">
              <span>Country</span>
              <span>Active deals</span>
              <span>Pipeline value</span>
            </div>
            <div className="reports-table-row reports-row-muted">
              <span>–</span>
              <span>–</span>
              <span>–</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default ReportsDashboard;
