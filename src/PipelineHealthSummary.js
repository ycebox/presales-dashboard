// PipelineHealthSummary.js
import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from './supabaseClient';
import {
  FaChartLine,
  FaDollarSign,
  FaBullseye,
  FaExclamationTriangle,
  FaCheckCircle,
} from 'react-icons/fa';
import './PipelineHealthSummary.css';

const STAGE_ORDER = [
  'Discovery',
  'Demo',
  'PoC',
  'RFI',
  'RFP',
  'SoW',
  'Contracting',
  'Closed-Won',
  'Closed-Lost',
  'Closed-Cancelled/Hold',
];

const CLOSED_STAGES = [
  'Closed-Won',
  'Closed-Lost',
  'Closed-Cancelled/Hold',
];

const formatCurrency = (value) => {
  if (!value && value !== 0) return '$0';
  const num = Number(value);
  if (Number.isNaN(num)) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
};

function PipelineHealthSummary() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load projects once
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error } = await supabase
          .from('projects')
          .select('id, project_name, customer_name, sales_stage, deal_value');

        if (error) throw error;
        setProjects(data || []);
      } catch (err) {
        console.error('Error loading pipeline data:', err);
        setError('Failed to load pipeline data');
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  // Compute summary
  const {
    activeDeals,
    activeValue,
    closedWonValue,
    stageStats,
  } = useMemo(() => {
    if (!projects || projects.length === 0) {
      return {
        activeDeals: 0,
        activeValue: 0,
        closedWonValue: 0,
        stageStats: [],
      };
    }

    const byStage = new Map();
    let activeDealsCount = 0;
    let activeDealsValue = 0;
    let closedWonTotal = 0;

    projects.forEach((p) => {
      const stage = p.sales_stage || 'Unknown';
      const value = Number(p.deal_value) || 0;

      // Track by stage
      if (!byStage.has(stage)) {
        byStage.set(stage, {
          stage,
          count: 0,
          value: 0,
        });
      }
      const entry = byStage.get(stage);
      entry.count += 1;
      entry.value += value;

      // Active vs closed
      if (!CLOSED_STAGES.includes(stage)) {
        activeDealsCount += 1;
        activeDealsValue += value;
      } else if (stage === 'Closed-Won') {
        closedWonTotal += value;
      }
    });

    // Order stages in a consistent way
    const statsArray = Array.from(byStage.values());
    statsArray.sort((a, b) => {
      const idxA = STAGE_ORDER.indexOf(a.stage);
      const idxB = STAGE_ORDER.indexOf(b.stage);

      if (idxA === -1 && idxB === -1) {
        return a.stage.localeCompare(b.stage);
      }
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
    });

    return {
      activeDeals: activeDealsCount,
      activeValue: activeDealsValue,
      closedWonValue: closedWonTotal,
      stageStats: statsArray,
    };
  }, [projects]);

  const maxStageValue = useMemo(() => {
    if (!stageStats || stageStats.length === 0) return 0;
    return Math.max(...stageStats.map((s) => s.value));
  }, [stageStats]);

  if (loading) {
    return (
      <div className="pipeline-card">
        <div className="pipeline-header">
          <div className="pipeline-title">
            <FaChartLine className="pipeline-icon" />
            <h2>Pipeline Health</h2>
          </div>
        </div>
        <div className="pipeline-loading">
          <div className="pipeline-spinner"></div>
          <span>Loading pipeline...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pipeline-card">
        <div className="pipeline-header">
          <div className="pipeline-title">
            <FaChartLine className="pipeline-icon" />
            <h2>Pipeline Health</h2>
          </div>
        </div>
        <div className="pipeline-error">
          <FaExclamationTriangle />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="pipeline-card">
      {/* Header */}
      <div className="pipeline-header">
        <div className="pipeline-title">
          <FaChartLine className="pipeline-icon" />
          <div>
            <h2>Pipeline Health</h2>
            <p className="pipeline-subtitle">
              Snapshot of active deals in the region
            </p>
          </div>
        </div>
      </div>

      {/* Top KPIs */}
      <div className="pipeline-kpis">
        <div className="pipeline-kpi">
          <span className="kpi-label">Active Opportunities</span>
          <span className="kpi-value">{activeDeals}</span>
        </div>
        <div className="pipeline-kpi">
          <span className="kpi-label">Active Pipeline Value</span>
          <span className="kpi-value kpi-money">{formatCurrency(activeValue)}</span>
        </div>
        <div className="pipeline-kpi">
          <span className="kpi-label">
            Closed-Won (lifetime)
          </span>
          <span className="kpi-value kpi-money">
            {formatCurrency(closedWonValue)}
          </span>
        </div>
      </div>

      {/* Stage breakdown */}
      <div className="pipeline-stage-list">
        {stageStats.length === 0 ? (
          <div className="pipeline-empty">
            <span>No projects found. Create a project to start tracking pipeline.</span>
          </div>
        ) : (
          stageStats.map((s) => {
            // Skip completely empty & weird stage "Unknown" if no value
            const isClosed = CLOSED_STAGES.includes(s.stage);
            const barPercent =
              maxStageValue > 0 ? (s.value / maxStageValue) * 100 : 0;

            return (
              <div
                key={s.stage}
                className={`pipeline-stage-row ${
                  isClosed ? 'stage-closed' : 'stage-open'
                }`}
              >
                <div className="stage-label">
                  <span className="stage-name">{s.stage}</span>
                  <span className="stage-count">
                    {s.count} deal{s.count !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="stage-bar-wrapper">
                  <div className="stage-bar-track">
                    <div
                      className="stage-bar-fill"
                      style={{ width: `${barPercent || 4}%` }} // small visible bar even for tiny deals
                    />
                  </div>
                  <span className="stage-value">
                    {formatCurrency(s.value)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default PipelineHealthSummary;
