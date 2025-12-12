// TopDealsToWatch.js
import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from './supabaseClient';
import {
  FaFlag,
  FaDollarSign,
  FaCalendarAlt,
  FaChartLine,
  FaExclamationTriangle,
  FaBuilding,
} from 'react-icons/fa';
import './TopDealsToWatch.css';

const CLOSED_STAGES = ['Closed-Won', 'Closed-Lost', 'Closed-Cancelled/Hold', 'Done'];

const STAGE_WEIGHTS = {
  Discovery: 1,
  Demo: 2,
  PoC: 3,
  RFI: 3,
  RFP: 4,
  SoW: 5,
  Contracting: 6,
  Lead: 1,
  Opportunity: 2,
  Proposal: 4,
};

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

const formatDate = (dateString) => {
  if (!dateString) return '-';
  try {
    return new Date(dateString).toLocaleDateString('en-SG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '-';
  }
};

const getUrgencyScore = (dueDateStr) => {
  if (!dueDateStr) return 1;
  const today = new Date();
  const due = new Date(dueDateStr);
  const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return 5; // overdue / today
  if (diffDays <= 7) return 4;
  if (diffDays <= 14) return 3;
  if (diffDays <= 30) return 2;
  return 1;
};

const getUrgencyLabelClass = (dueDateStr) => {
  if (!dueDateStr) return 'urgency-normal';

  const today = new Date();
  const due = new Date(dueDateStr);
  const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'urgency-overdue';
  if (diffDays === 0) return 'urgency-today';
  if (diffDays <= 7) return 'urgency-high';
  if (diffDays <= 14) return 'urgency-medium';
  return 'urgency-normal';
};

const getValueScore = (value) => {
  const v = Number(value) || 0;
  if (v >= 1_000_000) return 5;
  if (v >= 500_000) return 4;
  if (v >= 200_000) return 3;
  if (v >= 50_000) return 2;
  if (v > 0) return 1;
  return 0;
};

const getStageScore = (stage) => {
  if (!stage) return 0;
  return STAGE_WEIGHTS[stage] || 1;
};

function TopDealsToWatch() {
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
          .select('id, project_name, customer_name, sales_stage, deal_value, due_date, is_corporate');

        if (error) throw error;
        setProjects(data || []);
      } catch (err) {
        console.error('Error loading top deals:', err);
        setError('Failed to load deals');
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  const rankedDeals = useMemo(() => {
    if (!projects || projects.length === 0) return [];

    // Active (not closed/done)
    const active = projects.filter((p) => {
      const stage = (p.sales_stage || '').trim();
      return !CLOSED_STAGES.includes(stage);
    });

    // Corporate-first rule:
    // If there are any corporate active projects, only rank among corporate.
    const corporateActive = active.filter((p) => p.is_corporate === true);
    const pool = corporateActive.length > 0 ? corporateActive : active;

    const scored = pool.map((p) => {
      const stageScore = getStageScore(p.sales_stage);
      const valueScore = getValueScore(p.deal_value);
      const urgencyScore = getUrgencyScore(p.due_date);

      const score = stageScore + valueScore + urgencyScore;

      return {
        ...p,
        score,
        stageScore,
        valueScore,
        urgencyScore,
      };
    });

    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const aVal = Number(a.deal_value) || 0;
      const bVal = Number(b.deal_value) || 0;
      if (bVal !== aVal) return bVal - aVal;
      const aDue = a.due_date ? new Date(a.due_date).getTime() : Infinity;
      const bDue = b.due_date ? new Date(b.due_date).getTime() : Infinity;
      return aDue - bDue;
    });

    return scored.slice(0, 5);
  }, [projects]);

  const showCorporateMode = useMemo(() => {
    const active = (projects || []).filter((p) => !CLOSED_STAGES.includes((p.sales_stage || '').trim()));
    return active.some((p) => p.is_corporate === true);
  }, [projects]);

  if (loading) {
    return (
      <div className="topdeals-card">
        <div className="topdeals-header">
          <div className="topdeals-title">
            <FaFlag className="topdeals-icon" />
            <h2>Top Deals to Watch</h2>
          </div>
        </div>
        <div className="topdeals-loading">
          <div className="topdeals-spinner" />
          <span>Loading deals...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="topdeals-card">
        <div className="topdeals-header">
          <div className="topdeals-title">
            <FaFlag className="topdeals-icon" />
            <h2>Top Deals to Watch</h2>
          </div>
        </div>
        <div className="topdeals-error">
          <FaExclamationTriangle />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (!rankedDeals.length) {
    return (
      <div className="topdeals-card">
        <div className="topdeals-header">
          <div className="topdeals-title">
            <FaFlag className="topdeals-icon" />
            <h2>Top Deals to Watch</h2>
          </div>
        </div>
        <div className="topdeals-empty">
          <span>No active opportunities found. Create or update projects to see them here.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="topdeals-card">
      <div className="topdeals-header">
        <div className="topdeals-title">
          <FaFlag className="topdeals-icon" />
          <div>
            <h2>Top Deals to Watch</h2>
            <p className="topdeals-subtitle">
              {showCorporateMode
                ? 'Corporate deals prioritized (then ranked by stage, value, urgency)'
                : 'Auto-ranked by stage, value, and urgency'}
            </p>
          </div>
        </div>
      </div>

      {/* Column header */}
      <div className="topdeals-table-head" role="row">
        <div>#</div>
        <div>Customer</div>
        <div>Project</div>
        <div>Stage</div>
        <div>Due</div>
        <div className="td-right">Value</div>
      </div>

      <div className="topdeals-list">
        {rankedDeals.map((deal, index) => {
          const urgencyClass = getUrgencyLabelClass(deal.due_date);

          return (
            <div key={deal.id} className="topdeals-row" role="row">
              <div className="topdeals-rank">#{index + 1}</div>

              <div className="topdeals-customer-cell" title={deal.customer_name || ''}>
                {deal.customer_name || 'Unknown customer'}
                {deal.is_corporate ? (
                  <span className="topdeals-corp-badge" title="Corporate project">
                    <FaBuilding />
                    Corporate
                  </span>
                ) : null}
              </div>

              <div className="topdeals-project-cell" title={deal.project_name || ''}>
                {deal.project_name || 'Unnamed project'}
              </div>

              <div className="topdeals-stage-cell">
                <span className="topdeals-stage-badge">
                  <FaChartLine />
                  {deal.sales_stage || 'No stage'}
                </span>
              </div>

              <div className="topdeals-due-cell">
                <span className={`topdeals-urgency-badge ${urgencyClass}`}>
                  <FaCalendarAlt />
                  {deal.due_date ? formatDate(deal.due_date) : 'No due'}
                </span>
              </div>

              <div className="topdeals-value-cell td-right">
                <FaDollarSign />
                {formatCurrency(deal.deal_value)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default TopDealsToWatch;
