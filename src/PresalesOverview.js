// FULL PresalesOverview.js with modal auto-close fix

import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from './supabaseClient';
import {
  Activity,
  Briefcase,
  Globe2,
  Target,
  Users,
  User,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
  CalendarDays,
  Filter,
  Plane,
  X,
} from 'lucide-react';
import './PresalesOverview.css';

const HOURS_PER_DAY = 8;
const DEFAULT_TASK_HOURS = 4;

function PresalesOverview() {
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [scheduleEvents, setScheduleEvents] = useState([]);
  const [presalesResources, setPresalesResources] = useState([]);
  const [loading, setLoading] = useState(true);

  const [assignStart, setAssignStart] = useState('');
  const [assignEnd, setAssignEnd] = useState('');
  const [assignPriority, setAssignPriority] = useState('Normal');

  const [calendarView, setCalendarView] = useState('14');

  // modal state
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleAssignee, setScheduleAssignee] = useState('');
  const [scheduleType, setScheduleType] = useState('Leave');
  const [scheduleStart, setScheduleStart] = useState('');
  const [scheduleEnd, setScheduleEnd] = useState('');
  const [scheduleNote, setScheduleNote] = useState('');
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [scheduleError, setScheduleError] = useState(null);

  // ------------------ LOAD DATA ---------------------
  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);

      const [projRes, taskRes, schRes, preRes] = await Promise.all([
        supabase.from('projects').select('id, customer_name, country, sales_stage, deal_value'),
        supabase.from('project_tasks').select(
          'id, project_id, assignee, status, due_date, start_date, end_date, estimated_hours'
        ),
        supabase.from('presales_schedule').select('*'),
        supabase.from('presales_resources').select('id, name, region, is_active').order('name')
      ]);

      setProjects(projRes.data || []);
      setTasks(taskRes.data || []);
      setScheduleEvents(schRes.data || []);
      setPresalesResources(preRes.data || []);
      setLoading(false);
    };

    loadAll();
  }, []);

  // ----------------- HELPERS --------------------
  const toMidnight = (d) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  };

  const isSameDay = (a, b) => {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  };

  const isWithinRange = (day, startStr, endStr) => {
    if (!startStr || !endStr) return false;
    const s = toMidnight(startStr);
    const e = toMidnight(endStr);
    const d = toMidnight(day);
    return d >= s && d <= e;
  };

  // ----------------- DATE RANGES -------------------
  const daysRange = useMemo(() => {
    const out = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const count = calendarView === '30' ? 30 : 14;
    for (let i = 0; i < count; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      out.push(d);
    }
    return out;
  }, [calendarView]);

  const thisMonday = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const m = new Date(now);
    m.setDate(now.getDate() - day + 1);
    m.setHours(0, 0, 0, 0);
    return m;
  }, []);

  const thisWeekRange = useMemo(() => {
    const start = new Date(thisMonday);
    const end = new Date(thisMonday);
    end.setDate(end.getDate() + 6);
    return { start, end };
  }, [thisMonday]);

  const nextWeekRange = useMemo(() => {
    const start = new Date(thisMonday);
    start.setDate(start.getDate() + 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return { start, end };
  }, [thisMonday]);

  // ----------------- WORKLOAD -------------------
  const workloadByAssignee = useMemo(() => {
    const map = new Map();

    presalesResources
      .filter((r) => r.is_active !== false)
      .forEach((r) =>
        map.set(r.name, {
          assignee: r.name,
          total: 0,
          open: 0,
          overdue: 0,
          projectCount: 0,
          projects: new Set(),
          utilThisWeek: 0,
          utilNextWeek: 0,
        })
      );

    tasks.forEach((t) => {
      const name = t.assignee || 'Unassigned';
      if (!map.has(name)) {
        map.set(name, {
          assignee: name,
          total: 0,
          open: 0,
          overdue: 0,
          projectCount: 0,
          projects: new Set(),
          utilThisWeek: 0,
          utilNextWeek: 0,
        });
      }

      const e = map.get(name);
      e.total++;

      const completed = t.status === 'Completed';
      if (!completed) e.open++;

      if (!completed && t.due_date) {
        const due = toMidnight(t.due_date);
        const today = toMidnight(new Date());
        if (due < today) e.overdue++;
      }

      if (t.project_id) e.projects.add(t.project_id);

      const effort = Number(t.estimated_hours) || DEFAULT_TASK_HOURS;

      const spreadToRange = (range) => {
        const { start, end } = range;
        const s = t.start_date ? toMidnight(t.start_date) : toMidnight(t.due_date);
        const e2 = t.end_date ? toMidnight(t.end_date) : toMidnight(t.due_date);

        let overlapStart = s < start ? start : s;
        let overlapEnd = e2 > end ? end : e2;
        if (overlapEnd < overlapStart) return 0;

        const days =
          t.start_date && t.end_date
            ? Math.max(1, (overlapEnd - overlapStart) / 86400000 + 1)
            : 1;

        return effort * days;
      };

      e.utilThisWeek += spreadToRange(thisWeekRange);
      e.utilNextWeek += spreadToRange(nextWeekRange);
    });

    const cap = HOURS_PER_DAY * 5;

    return Array.from(map.values())
      .map((e) => ({
        ...e,
        projectCount: e.projects.size,
        utilThisWeek: cap ? Math.round((e.utilThisWeek / cap) * 100) : 0,
        utilNextWeek: cap ? Math.round((e.utilNextWeek / cap) * 100) : 0,
      }))
      .sort((a, b) => b.open - a.open);
  }, [tasks, presalesResources, thisWeekRange, nextWeekRange]);

  // ----------------- AVAILABILITY -------------------
  const availabilityGrid = useMemo(() => {
    return workloadByAssignee.map((w) => {
      const row = { assignee: w.assignee, days: [] };

      daysRange.forEach((d) => {
        let status = 'free';

        const scheduleHit = scheduleEvents.some(
          (ev) =>
            ev.assignee === w.assignee &&
            isWithinRange(d, ev.start_date, ev.end_date)
        );

        if (scheduleHit) {
          const ev = scheduleEvents.find(
            (ev) =>
              ev.assignee === w.assignee &&
              isWithinRange(d, ev.start_date, ev.end_date)
          );
          const type = ev.type.toLowerCase();
          status = type === 'travel' ? 'travel' : 'leave';
        } else {
          const taskHit = tasks.some((t) => {
            if (t.assignee !== w.assignee) return false;
            if (t.status === 'Completed') return false;

            if (t.start_date && t.end_date)
              return isWithinRange(d, t.start_date, t.end_date);

            if (t.start_date && !t.end_date) {
              return toMidnight(d) >= toMidnight(t.start_date);
            }
            if (!t.start_date && t.end_date) {
              return toMidnight(d) <= toMidnight(t.end_date);
            }
            if (t.due_date) {
              return isSameDay(toMidnight(t.due_date), toMidnight(d));
            }
            return false;
          });

          if (taskHit) status = 'busy';
        }

        row.days.push({ date: d, status });
      });

      return row;
    });
  }, [workloadByAssignee, daysRange, scheduleEvents, tasks]);

  // -------------- ADD SCHEDULE (MODAL) ----------------
  const closeScheduleModal = () => {
    setShowScheduleModal(false);
    setScheduleAssignee('');
    setScheduleType('Leave');
    setScheduleStart('');
    setScheduleEnd('');
    setScheduleNote('');
    setScheduleError(null);
    setScheduleSaving(false);
  };

  const handleAddSchedule = async (e) => {
    e.preventDefault();
    setScheduleError(null);

    if (!scheduleAssignee || !scheduleType || !scheduleStart || !scheduleEnd) {
      setScheduleError('Please complete all fields.');
      return;
    }

    setScheduleSaving(true);

    const { data, error } = await supabase.from('presales_schedule').insert([
      {
        assignee: scheduleAssignee,
        type: scheduleType,
        start_date: scheduleStart,
        end_date: scheduleEnd,
        note: scheduleNote || null,
      },
    ]).select();

    if (error) {
      setScheduleError('Failed to save schedule.');
      setScheduleSaving(false);
      return;
    }

    if (data && data.length > 0) {
      setScheduleEvents((prev) => [...prev, data[0]]);
      closeScheduleModal();   // <-- FIX: CLOSE MODAL AFTER SAVE
    }
  };

  // -------------- UI ------------------

  if (loading) return <div>Loading…</div>;

  return (
    <div className="presales-page-container">

      <header className="presales-header">
        <div className="presales-header-main">
          <Link to="/" className="back-to-home-link">
            <ArrowLeft size={14} /> Back
          </Link>
          <div>
            <h2>Presales Overview</h2>
            <p>Regional workload, pipeline, and availability.</p>
          </div>
        </div>
      </header>

      {/* ------------------------------------- */}
      {/* -------- PRESALES AVAILABILITY ------- */}
      {/* ------------------------------------- */}
      <section className="presales-calendar-section">
        <div className="presales-panel">

          <div className="presales-panel-header presales-panel-header-row">
            <div>
              <h3>
                <CalendarDays size={16} /> Presales Availability
              </h3>
              <p>Heatmap of leave, travel, and busy days.</p>
            </div>

            <button
              className="ghost-btn"
              onClick={() => setShowScheduleModal(true)}
            >
              <Plane size={13} />
              Manage schedule
            </button>
          </div>

          {/* Heatmap table */}
          <div className="heatmap-wrapper">
            <div className="heatmap-table">
              <div className="heatmap-header-row">
                <div className="heatmap-header-cell heatmap-name-col">Presales</div>

                {daysRange.map((d, idx) => (
                  <div key={idx} className="heatmap-header-cell heatmap-day-col">
                    {d.toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric' })}
                  </div>
                ))}
              </div>

              {availabilityGrid.map((row) => (
                <div key={row.assignee} className="heatmap-row">
                  <div className="heatmap-presales-cell">
                    <div className="wl-avatar">
                      {row.assignee.charAt(0).toUpperCase()}
                    </div>
                    <span>{row.assignee}</span>
                  </div>

                  {row.days.map((d, i) => (
                    <div
                      key={i}
                      className={`heatmap-cell status-${d.status}`}
                      title={`${row.assignee} - ${d.status}`}
                    ></div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ */}
      {/* ------------------ MODAL ------------------------ */}
      {/* ------------------------------------------------ */}
      {showScheduleModal && (
        <div className="schedule-modal-backdrop" onClick={closeScheduleModal}>
          <div className="schedule-modal" onClick={(e) => e.stopPropagation()}>
            <div className="schedule-modal-header">
              <h4><Plane size={16}/> Manage Presales Schedule</h4>
              <button className="schedule-modal-close" onClick={closeScheduleModal}>
                <X size={14}/>
              </button>
            </div>

            <form className="schedule-form" onSubmit={handleAddSchedule}>
              <div className="schedule-form-row">
                <div className="schedule-field">
                  <label>Presales</label>
                  <select
                    value={scheduleAssignee}
                    onChange={(e) => setScheduleAssignee(e.target.value)}
                  >
                    <option value="">Select</option>
                    {presalesResources.map((r) => (
                      <option key={r.id} value={r.name}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="schedule-field">
                  <label>Type</label>
                  <select
                    value={scheduleType}
                    onChange={(e) => setScheduleType(e.target.value)}
                  >
                    <option value="Leave">Leave</option>
                    <option value="Travel">Travel</option>
                    <option value="Training">Training</option>
                    <option value="Public Holiday">Public Holiday</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="schedule-form-row">
                <div className="schedule-field">
                  <label>Start date</label>
                  <input
                    type="date"
                    value={scheduleStart}
                    onChange={(e) => setScheduleStart(e.target.value)}
                  />
                </div>

                <div className="schedule-field">
                  <label>End date</label>
                  <input
                    type="date"
                    value={scheduleEnd}
                    onChange={(e) => setScheduleEnd(e.target.value)}
                  />
                </div>
              </div>

              <div className="schedule-form-row">
                <div className="schedule-field schedule-field-full">
                  <label>Note</label>
                  <input
                    type="text"
                    value={scheduleNote}
                    onChange={(e) => setScheduleNote(e.target.value)}
                    placeholder="Optional note"
                  />
                </div>
              </div>

              {scheduleError && (
                <p className="schedule-message-error">{scheduleError}</p>
              )}

              <div className="schedule-form-actions">
                <button
                  type="button"
                  className="ghost-btn ghost-btn-sm"
                  onClick={closeScheduleModal}
                >
                  Cancel
                </button>

                <button type="submit" className="primary-btn" disabled={scheduleSaving}>
                  {scheduleSaving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default PresalesOverview;
