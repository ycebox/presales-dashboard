import React, { useEffect, useState, useMemo } from 'react';
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

  // Workload per assignee
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

    // Sort by open tasks desc
    arr.sort((a, b) => b.open - a.open);

    return arr;
  }, [tasks]);

  // Deals by country and stage (for table)
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
      {/* Header */}
      <header className="presales-header">
        <div>
          <h2>Presales Overview</h2>
          <p>
            Regional view of APAC deals and presales workload.
          </p>
        </div>
      </header>

      {/* Top stats cards */}
      <section className="presales-summary-section">
        <div className="presales-summary-grid">
          <div className="presales-summary-card">
            <div className="psc-icon psc-icon-primary">
              <Briefcase size={18} />
            </div>
            <div className="psc-content">
              <p className="psc-label">Active deals</p>
              <p className="psc-value">{activeDeals}</p>
              <p className="psc-sub">
                {pipelineValue ? `${formatCurrency(pipelineValue)} in pipeline` : 'No value set yet'}
              </p>
            </div>
          </div>

          <div className="presales-summary-card">
            <div className="psc-icon psc-icon-accent">
              <CheckCircle2 size={18} />
            </div>
            <div className="psc-content">
              <p className="psc-label">Closed / Done</p>
              <p className="psc-value">{wonDeals}</p>
              <p className="psc-sub">
                {wonValue ? `${formatCurrency(wonValue)} closed` : 'No closed deals yet'}
              </p>
            </div>
          </div>

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
                {openTasksCount} open task{openTasksCount !== 1 ? 's' : ''} across APAC
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Workload + Deals layout */}
      <section className="presales-main-grid">
        {/* Workload panel */}
        <div className="presales-panel">
          <div className="presales-panel-header">
            <div>
              <h3>
                <Users size={16} className="panel-icon" />
                Presales workload
              </h3>
              <p>Who is handling what, and where the pressure is.</p>
            </div>
          </div>

          {workloadByAssignee.length === 0 ? (
            <div className="presales-empty">
              <User size={20} />
              <p>No tasks found. Assign tasks to presales to see workload.</p>
            </div>
          ) : (
            <div className="workload-table-wrapper">
              <table className="workload-table">
                <thead>
                  <tr>
                    <th>Presales</th>
                    <th className="th-center">Projects</th>
                    <th className="th-center">Total tasks</th>
                    <th className="th-center">Open</th>
                    <th className="th-center">Overdue</th>
                    <th>Load</th>
                  </tr>
                </thead>
                <tbody>
                  {workloadByAssignee.map((w) => (
                    <tr key={w.assignee}>
                      <td>
                        <div className="wl-name-cell">
                          <div className="wl-avatar">
                            {(w.assignee || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div className="wl-name-text">
                            <span className="wl-name-main">{w.assignee}</span>
                            <span className="wl-name-sub">
                              {w.projectCount} project{w.projectCount !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="td-center">{w.projectCount}</td>
                      <td className="td-center">{w.total}</td>
                      <td className="td-center">{w.open}</td>
                      <td className="td-center overdue">
                        {w.overdue}
                      </td>
                      <td>
                        <div className="wl-load-bar">
                          <div className="wl-load-track">
                            <div
                              className="wl-load-fill"
                              style={{ width: `${Math.min(w.loadRatio * 100, 100)}%` }}
                            />
                          </div>
                          <span className="wl-load-text">
                            {Math.round(w.loadRatio * 100)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Deals by country */}
        <div className="presales-panel">
          <div className="presales-panel-header">
            <div>
              <h3>
                <Activity size={16} className="panel-icon" />
                Deals by country
              </h3>
              <p>Where the pipeline is concentrated across APAC.</p>
            </div>
          </div>

          {dealsByCountry.length === 0 ? (
            <div className="presales-empty">
              <Globe2 size={20} />
              <p>No deals found. Add projects with country and deal value.</p>
            </div>
          ) : (
            <div className="country-table-wrapper">
              <table className="country-table">
                <thead>
                  <tr>
                    <th>Country</th>
                    <th className="th-center">Total deals</th>
                    <th className="th-center">Active</th>
                    <th className="th-center">Done</th>
                    <th className="th-right">Pipeline value</th>
                  </tr>
                </thead>
                <tbody>
                  {dealsByCountry.map((c) => (
                    <tr key={c.country}>
                      <td>
                        <div className="cty-name-cell">
                          <span className="cty-flag-placeholder">
                            {c.country.charAt(0).toUpperCase()}
                          </span>
                          <span>{c.country}</span>
                        </div>
                      </td>
                      <td className="td-center">{c.total}</td>
                      <td className="td-center">{c.active}</td>
                      <td className="td-center">{c.done}</td>
                      <td className="td-right">
                        {c.pipelineValue ? formatCurrency(c.pipelineValue) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default PresalesOverview;
