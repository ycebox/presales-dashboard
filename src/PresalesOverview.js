import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from './supabaseClient';
import {
  Activity,
  Briefcase,
  Globe2,
  Target,
  User,
  Users,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft
} from 'lucide-react';
import './PresalesOverview.css';

function PresalesOverview() {
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [{ data: projData, error: projError }, { data: taskData, error: taskError }] =
          await Promise.all([
            supabase
              .from('projects')
              .select('id, customer_name, country, sales_stage, deal_value')
              .order('customer_name', { ascending: true }),
            supabase
              .from('project_tasks')
              .select('id, project_id, assignee, status, due_date'),
          ]);

        if (projError) throw projError;
        if (taskError) throw taskError;

        setProjects(projData || []);
        setTasks(taskData || []);
      } catch (err) {
        console.error('Error loading presales overview:', err);
        setError('Failed to load presales overview data.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // --- (stats + workload calculations here, unchanged) ---
  const {
    activeDeals,
    wonDeals,
    pipelineValue,
    wonValue,
    avgDeal,
    countryCount,
    openTasksCount,
  } = useMemo(() => {
    if (!projects || projects.length === 0) {
      return {
        activeDeals: 0,
        wonDeals: 0,
        pipelineValue: 0,
        wonValue: 0,
        avgDeal: 0,
        countryCount: 0,
        openTasksCount: tasks.filter((t) => t.status !== 'Completed').length,
      };
    }

    let active = 0;
    let won = 0;
    let pipeline = 0;
    let wonVal = 0;

    const countrySet = new Set();

    projects.forEach((p) => {
      if (p.country) countrySet.add(p.country);

      const value = typeof p.deal_value === 'number'
        ? p.deal_value
        : parseFloat(p.deal_value || 0);

      if (p.sales_stage === 'Done') {
        won += 1;
        wonVal += isNaN(value) ? 0 : value;
      } else {
        active += 1;
        pipeline += isNaN(value) ? 0 : value;
      }
    });

    const openTasks = tasks.filter((t) => t.status !== 'Completed').length;
    const avg = active > 0 ? pipeline / active : 0;

    return {
      activeDeals: active,
      wonDeals: won,
      pipelineValue: pipeline,
      wonValue: wonVal,
      avgDeal: avg,
      countryCount: countrySet.size,
      openTasksCount: openTasks,
    };
  }, [projects, tasks]);

  const workloadByAssignee = useMemo(() => {
    if (!tasks || tasks.length === 0) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const map = new Map();

    tasks.forEach((t) => {
      const name = t.assignee || 'Unassigned';
      if (!map.has(name)) {
        map.set(name, {
          assignee: name,
          total: 0,
          open: 0,
          overdue: 0,
          projects: new Set(),
        });
      }

      const entry = map.get(name);
      entry.total += 1;

      const isCompleted = t.status === 'Completed';

      if (!isCompleted) {
        entry.open += 1;

        if (t.due_date) {
          const due = new Date(t.due_date);
          due.setHours(0, 0, 0, 0);
          if (due < today) {
            entry.overdue += 1;
          }
        }
      }

      if (t.project_id) {
        entry.projects.add(t.project_id);
      }
    });

    const arr = Array.from(map.values()).map((e) => ({
      ...e,
      projectCount: e.projects.size,
      loadRatio: e.total === 0 ? 0 : e.open / e.total,
    }));

    arr.sort((a, b) => b.open - a.open);
    return arr;
  }, [tasks]);

  const dealsByCountry = useMemo(() => {
    if (!projects || projects.length === 0) return [];

    const map = new Map();

    projects.forEach((p) => {
      const country = p.country || 'Unknown';
      if (!map.has(country)) {
        map.set(country, {
          country,
          total: 0,
          active: 0,
          done: 0,
          pipelineValue: 0,
        });
      }

      const entry = map.get(country);
      entry.total += 1;

      const value = typeof p.deal_value === 'number'
        ? p.deal_value
        : parseFloat(p.deal_value || 0);

      if (p.sales_stage === 'Done') {
        entry.done += 1;
      } else {
        entry.active += 1;
        entry.pipelineValue += isNaN(value) ? 0 : value;
      }
    });

    const arr = Array.from(map.values());
    arr.sort((a, b) => b.pipelineValue - a.pipelineValue);
    return arr;
  }, [projects]);

  const formatCurrency = (amount) => {
    if (!amount || isNaN(amount)) return '$0';
    return amount.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    });
  };

  if (loading) {
    return (
      <div className="presales-page-container">
        <div className="presales-loading">
          <div className="presales-spinner" />
          <p>Loading presales overview…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="presales-page-container">
        <div className="presales-error">
          <AlertTriangle size={20} />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="presales-page-container">
      
      {/* ---------- HEADER ---------- */}
      <header className="presales-header">

        {/* NEW: Back to home button */}
        <Link 
          to="/"
          className="back-to-home-link"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            textDecoration: 'none',
            background: '#f3f4f6',
            padding: '6px 10px',
            borderRadius: '8px',
            fontSize: '0.75rem',
            fontWeight: 500,
            color: '#374151',
            border: '1px solid #e5e7eb',
            transition: '0.15s'
          }}
          onMouseOver={(e) => e.target.style.background = '#e5e7eb'}
          onMouseOut={(e) => e.target.style.background = '#f3f4f6'}
        >
          <ArrowLeft size={14} />
          Back to Home
        </Link>

        <div style={{ marginTop: '0.75rem' }}>
          <h2>Presales Overview</h2>
          <p>Regional view of APAC deals and presales workload.</p>
        </div>

      </header>
      {/* ---------- END HEADER ---------- */}

      
      {/* --- summary cards + main content (unchanged) --- */}
      
      <section className="presales-summary-section">
        <div className="presales-summary-grid">
          
          {/* Active deals */}
          <div className="presales-summary-card">
            <div className="psc-icon psc-icon-primary">
              <Briefcase size={18} />
            </div>
            <div className="psc-content">
              <p className="psc-label">Active deals</p>
              <p className="psc-value">{activeDeals}</p>
              <p className="psc-sub">
                {pipelineValue ? `${formatCurrency(pipelineValue)} in pipeline` : 'No value yet'}
              </p>
            </div>
          </div>

          {/* Closed deals */}
          <div className="presales-summary-card">
            <div className="psc-icon psc-icon-accent">
              <CheckCircle2 size={18} />
            </div>
            <div className="psc-content">
              <p className="psc-label">Closed / Done</p>
              <p className="psc-value">{wonDeals}</p>
              <p className="psc-sub">
                {wonValue ? `${formatCurrency(wonValue)} closed` : 'No closed deals'}
              </p>
            </div>
          </div>

          {/* Avg deal size */}
          <div className="presales-summary-card">
            <div className="psc-icon psc-icon-orange">
              <Target size={18} />
            </div>
            <div className="psc-content">
              <p className="psc-label">Avg. deal size</p>
              <p className="psc-value">
                {avgDeal ? formatCurrency(avgDeal) : '—'}
              </p>
              <p className="psc-sub">Based on active pipeline</p>
            </div>
          </div>

          {/* Countries + open tasks */}
          <div className="presales-summary-card">
            <div className="psc-icon psc-icon-neutral">
              <Globe2 size={18} />
            </div>
            <div className="psc-content">
              <p className="psc-label">Countries & tasks</p>
              <p className="psc-value">
                {countryCount} <span className="psc-value-suffix">countries</span>
              </p>
              <p className="psc-sub">
                {openTasksCount} open task{openTasksCount !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

        </div>
      </section>


      {/* Workload + Deals */}
      <section className="presales-main-grid">
        
        {/* Workload */}
        <div className="presales-panel">
          <div className="presales-panel-header">
            <h3><Users size={16} className="panel-icon" /> Presales workload</h3>
            <p>Who is handling what.</p>
          </div>
          
          {/* table */}
          {/* ... unchanged workload table ... */}
          
        </div>

        {/* Deals by country */}
        <div className="presales-panel">
          <div className="presales-panel-header">
            <h3><Activity size={16} className="panel-icon" /> Deals by country</h3>
            <p>Where pipeline is concentrated.</p>
          </div>

          {/* table */}
          {/* ... unchanged deals-by-country table ... */}

        </div>

      </section>

    </div>
  );
}

export default PresalesOverview;
