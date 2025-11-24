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
  ArrowLeft,
  CalendarDays,
} from 'lucide-react';
import './PresalesOverview.css';

function PresalesOverview() {
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [scheduleEvents, setScheduleEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load projects, tasks, and presales_schedule
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [projRes, taskRes, scheduleRes] = await Promise.all([
          supabase
            .from('projects')
            .select('id, customer_name, country, sales_stage, deal_value')
            .order('customer_name', { ascending: true }),
          supabase
            .from('project_tasks')
            .select('id, project_id, assignee, status, due_date, start_date, end_date'),
          supabase
            .from('presales_schedule')
            .select('id, assignee, type, start_date, end_date, note'),
        ]);

        if (projRes.error) throw projRes.error;
        if (taskRes.error) throw taskRes.error;

        setProjects(projRes.data || []);
        setTasks(taskRes.data || []);

        if (scheduleRes.error) {
          console.warn('presales_schedule not loaded:', scheduleRes.error.message);
          setScheduleEvents([]);
        } else {
          setScheduleEvents(scheduleRes.data || []);
        }
      } catch (err) {
        console.error('Error loading presales overview:', err);
        setError('Failed to load presales overview data.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // --------- Summary stats ---------
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

      const value =
        typeof p.deal_value === 'number'
          ? p.deal_value
          : parseFloat(p.deal_value || 0);

      if (p.sales_stage === 'Done' || p.sales_stage === 'Closed-Won') {
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

  // --------- Workload per assignee ---------
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

  // --------- Deals by country ---------
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

      const value =
        typeof p.deal_value === 'number'
          ? p.deal_value
          : parseFloat(p.deal_value || 0);

      if (p.sales_stage === 'Done' || p.sales_stage === 'Closed-Won') {
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

  // --------- Date helpers for heatmap ---------
  const daysRange = useMemo(() => {
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      days.push(d);
    }
    return days;
  }, []);

  const toMidnight = (d) => {
    const c = new Date(d);
    c.setHours(0, 0, 0, 0);
    return c;
  };

  const isSameDay = (d1, d2) => {
    const a = toMidnight(d1);
    const b = toMidnight(d2);
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  };

  const isWithinRange = (day, startStr, endStr) => {
    if (!startStr || !endStr) return false;
    const start = toMidnight(startStr);
    const end = toMidnight(endStr);
    const d = toMidnight(day);
    return d >= start && d <= end;
  };

  // --------- Availability heatmap logic (tightened with start/end date) ---------
  const availabilityGrid = useMemo(() => {
    if (!workloadByAssignee || workloadByAssignee.length === 0) return [];

    return workloadByAssignee.map((res) => {
      const row = { assignee: res.assignee, days: [] };

      daysRange.forEach((day) => {
        let status = 'free';
        let label = 'Free';

        // 1) Check leave / travel from presales_schedule (highest priority)
        const ev = scheduleEvents.find(
          (e) =>
            e.assignee === res.assignee &&
            isWithinRange(day, e.start_date, e.end_date)
        );

        if (ev) {
          if ((ev.type || '').toLowerCase() === 'travel') {
            status = 'travel';
            label = 'Travel';
          } else {
            status = 'leave';
            label = e.type || 'Leave';
          }
        } else {
          // 2) Check tasks for busy days (start/end/due logic)
          const hasTask = tasks.some((t) => {
            if (t.assignee !== res.assignee) return false;
            if (t.status === 'Completed') return false;

            const d = toMidnight(day);

            // a. Range: start_date + end_date
            if (t.start_date && t.end_date) {
              return isWithinRange(d, t.start_date, t.end_date);
            }

            // b. Only start_date: treat as ongoing from that day onward
            if (t.start_date && !t.end_date) {
              const start = toMidnight(t.start_date);
              return d >= start;
            }

            // c. Only end_date: treat as ongoing up to that day
            if (!t.start_date && t.end_date) {
              const end = toMidnight(t.end_date);
              return d <= end;
            }

            // d. Fallback: due_date = that specific day
            if (t.due_date) {
              const due = toMidnight(t.due_date);
              return isSameDay(due, d);
            }

            return false;
          });

          if (hasTask) {
            status = 'busy';
            label = 'Busy';
          }
        }

        row.days.push({ status, label, date: day });
      });

      return row;
    });
  }, [workloadByAssignee, daysRange, scheduleEvents, tasks]);

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
      {/* HEADER */}
      <header className="presales-header">
        <div className="presales-header-main">
          <Link
            to="/"
            className="back-to-home-link"
          >
            <ArrowLeft size={14} />
            Back to Home
          </Link>
          <div>
            <h2>Presales Overview</h2>
            <p>Regional view of APAC deals, workload, and availability.</p>
          </div>
        </div>
      </header>

      {/* Top summary cards */}
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
                {pipelineValue
                  ? `${formatCurrency(pipelineValue)} in pipeline`
                  : 'No value set yet'}
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
                {wonValue
                  ? `${formatCurrency(wonValue)} closed`
                  : 'No closed deals yet'}
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
                {countryCount}{' '}
                <span className="psc-value-suffix">countries</span>
              </p>
              <p className="psc-sub">
                {openTasksCount} open task
                {openTasksCount !== 1 ? 's' : ''} across APAC
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Workload + Deals tables */}
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
                              {w.projectCount} project
                              {w.projectCount !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="td-center">{w.projectCount}</td>
                      <td className="td-center">{w.total}</td>
                      <td className="td-center">{w.open}</td>
                      <td className="td-center overdue">{w.overdue}</td>
                      <td>
                        <div className="wl-load-bar">
                          <div className="wl-load-track">
                            <div
                              className="wl-load-fill"
                              style={{
                                width: `${Math.min(
                                  w.loadRatio * 100,
                                  100
                                )}%`,
                              }}
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
                        {c.pipelineValue
                          ? formatCurrency(c.pipelineValue)
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Resource availability heatmap / calendar */}
      <section className="presales-calendar-section">
        <div className="presales-panel">
          <div className="presales-panel-header">
            <div>
              <h3>
                <CalendarDays size={16} className="panel-icon" />
                Presales availability (next 14 days)
              </h3>
              <p>
                Heatmap of busy days, leave, travel, and free capacity for each
                presales resource.
              </p>
            </div>
          </div>

          {availabilityGrid.length === 0 ? (
            <div className="presales-empty">
              <Users size={20} />
              <p>
                No presales workload found yet. Assign tasks and schedule leave /
                travel to see availability.
              </p>
            </div>
          ) : (
            <div className="heatmap-wrapper">
              {/* Legend */}
              <div className="heatmap-legend">
                <span className="legend-item">
                  <span className="legend-dot status-free" />
                  Free
                </span>
                <span className="legend-item">
                  <span className="legend-dot status-busy" />
                  Busy (tasks)
                </span>
                <span className="legend-item">
                  <span className="legend-dot status-leave" />
                  Leave
                </span>
                <span className="legend-item">
                  <span className="legend-dot status-travel" />
                  Travel
                </span>
              </div>

              {/* Calendar grid */}
              <div className="heatmap-table">
                {/* Header row */}
                <div className="heatmap-header-row">
                  <div className="heatmap-header-cell heatmap-name-col">
                    Presales
                  </div>
                  {daysRange.map((d, idx) => {
                    const label = d.toLocaleDateString('en-SG', {
                      weekday: 'short',
                      day: 'numeric',
                    });
                    return (
                      <div
                        key={idx}
                        className="heatmap-header-cell heatmap-day-col"
                      >
                        {label}
                      </div>
                    );
                  })}
                </div>

                {/* Rows */}
                {availabilityGrid.map((row) => (
                  <div key={row.assignee} className="heatmap-row">
                    <div className="heatmap-presales-cell">
                      <div className="wl-avatar">
                        {(row.assignee || 'U').charAt(0).toUpperCase()}
                      </div>
                      <span className="heatmap-presales-name">
                        {row.assignee}
                      </span>
                    </div>
                    {row.days.map((d, idx) => {
                      const dateLabel = d.date.toLocaleDateString('en-SG', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                      });
                      return (
                        <div
                          key={idx}
                          className={`heatmap-cell status-${d.status}`}
                          title={`${row.assignee} · ${dateLabel} · ${d.label}`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default PresalesOverview;
