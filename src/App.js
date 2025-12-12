// src/App.js
import React, { useEffect, useMemo, useState } from 'react';
import {
  HashRouter as Router,
  Routes,
  Route,
  Link,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { supabase } from './supabaseClient';
import Projects from './Projects';
import ProjectDetails from './ProjectDetails';
import CustomerDetails from './CustomerDetails';
import PresalesOverview from './PresalesOverview';
import ReportsDashboard from './ReportsDashboard';
import './App.css';

// ---------- Header ----------
function AppHeader() {
  const location = useLocation();

  const isActive = (path) =>
    location.pathname === path ||
    (path !== '/' && location.pathname.startsWith(path));

  return (
    <header className="app-header">
      <div className="app-header-main">
        <div>
          <h1>Jonathan&apos;s Command Center</h1>
          <p>Personal view of customers, deals, and presales workload.</p>
        </div>
      </div>
      <nav className="app-nav">
        <Link to="/" className={isActive('/') ? 'nav-link active' : 'nav-link'}>
          Home
        </Link>
        <Link
          to="/presales-overview"
          className={isActive('/presales-overview') ? 'nav-link active' : 'nav-link'}
        >
          Presales overview
        </Link>
        <Link
          to="/reports"
          className={isActive('/reports') ? 'nav-link active' : 'nav-link'}
        >
          Reports
        </Link>
      </nav>
    </header>
  );
}

// ----------------- HOME DASHBOARD (main page) -----------------
function HomeDashboard() {
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [homeError, setHomeError] = useState(null);

  // Notes (DB-backed)
  const [notes, setNotes] = useState('');
  const [notesDraft, setNotesDraft] = useState('');
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesEdit, setNotesEdit] = useState(false);
  const [notesStatus, setNotesStatus] = useState(''); // "Saved", "Saving...", etc.

  const navigate = useNavigate();

  useEffect(() => {
    const loadHomeData = async () => {
      setLoading(true);
      setHomeError(null);

      try {
        const [projRes, taskRes] = await Promise.all([
          supabase
            .from('projects')
            .select('id, customer_name, project_name, sales_stage, deal_value')
            .order('customer_name', { ascending: true }),
          supabase
            .from('project_tasks')
            .select('id, project_id, assignee, status, due_date, task_type, description'),
        ]);

        if (projRes.error) throw projRes.error;
        if (taskRes.error) throw taskRes.error;

        setProjects(projRes.data || []);
        setTasks(taskRes.data || []);
      } catch (err) {
        console.error('Error loading home dashboard data:', err);
        setHomeError('Failed to load dashboard summary.');
      } finally {
        setLoading(false);
      }
    };

    loadHomeData();
  }, []);

  // Load notes from DB
  useEffect(() => {
    const loadNotes = async () => {
      setNotesLoading(true);
      setNotesStatus('');
      try {
        const { data, error } = await supabase
          .from('app_notes')
          .select('id, notes')
          .eq('id', 1)
          .single();

        if (error) throw error;

        const v = data?.notes || '';
        setNotes(v);
        setNotesDraft(v);
      } catch (err) {
        console.error('Error loading app notes:', err);
        // Don't block the page; just show a subtle status
        setNotesStatus('Notes not available (DB table missing?)');
      } finally {
        setNotesLoading(false);
      }
    };

    loadNotes();
  }, []);

  // Helpers
  const isCompleted = (status) => {
    const s = (status || '').toLowerCase();
    return s === 'completed' || s === 'done' || s === 'closed';
  };

  const parseDate = (value) => {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const inNextNDays = (dateStr, n) => {
    const d = parseDate(dateStr);
    if (!d) return false;
    const limit = new Date(today);
    limit.setDate(limit.getDate() + n);
    return d.getTime() >= today.getTime() && d.getTime() <= limit.getTime();
  };

  // ---------- Deal buckets (Home KPI strip) ----------
  const openDeals = useMemo(() => {
    return (projects || []).filter((p) => {
      const stage = (p.sales_stage || '').toLowerCase();
      // Treat Done and anything "closed*" as not-open
      return stage !== 'done' && !stage.startsWith('closed');
    });
  }, [projects]);

  const earlyStageDeals = useMemo(() => {
    return openDeals.filter((p) => {
      const stage = (p.sales_stage || '').toLowerCase();
      return stage === 'lead' || stage === 'opportunity';
    });
  }, [openDeals]);

  const proposalDeals = useMemo(() => {
    return openDeals.filter((p) => (p.sales_stage || '').toLowerCase() === 'proposal');
  }, [openDeals]);

  const contractingDeals = useMemo(() => {
    return openDeals.filter((p) => (p.sales_stage || '').toLowerCase() === 'contracting');
  }, [openDeals]);

  // ---------- Top deals to watch ----------
  const topDeals = useMemo(() => {
    if (!openDeals || openDeals.length === 0) return [];
    const sorted = openDeals
      .slice()
      .sort((a, b) => (Number(b.deal_value) || 0) - (Number(a.deal_value) || 0));
    return sorted.slice(0, 6);
  }, [openDeals]);

  // ---------- Upcoming presales commitments ----------
  const upcomingCommitments = useMemo(() => {
    if (!tasks || tasks.length === 0) return [];

    const importantTypes = ['Demo', 'Workshop', 'RFP', 'Proposal', 'Presentation', 'POC'];

    const projectNameMap = new Map();
    (projects || []).forEach((p) => {
      // customer_name used as label in the commitments list
      projectNameMap.set(p.id, p.customer_name || 'Unknown project');
    });

    const filtered = (tasks || [])
      .filter((t) => {
        if (isCompleted(t.status)) return false;
        if (!t.due_date) return false;
        if (!inNextNDays(t.due_date, 14)) return false;

        const type = (t.task_type || '').trim();
        if (!type) return false;

        return importantTypes.some(
          (imp) => type.toLowerCase().indexOf(imp.toLowerCase()) !== -1
        );
      })
      .map((t) => ({
        ...t,
        customer_name: projectNameMap.get(t.project_id) || 'Unknown project',
      }));

    filtered.sort((a, b) => {
      const da = parseDate(a.due_date);
      const db = parseDate(b.due_date);
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return da - db;
    });

    return filtered.slice(0, 8);
  }, [tasks, projects, today]);

  const formatCurrency = (value) => {
    if (!Number.isFinite(value)) return '-';
    return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
  };

  const formatShortDate = (d) =>
    d
      ? new Date(d).toLocaleDateString('en-SG', { day: '2-digit', month: 'short' })
      : '';

  // Notes actions
  const startEditNotes = () => {
    setNotesDraft(notes);
    setNotesEdit(true);
    setNotesStatus('');
  };

  const cancelEditNotes = () => {
    setNotesDraft(notes);
    setNotesEdit(false);
    setNotesStatus('');
  };

  const saveNotes = async () => {
    setNotesSaving(true);
    setNotesStatus('Saving…');
    try {
      const payload = { id: 1, notes: notesDraft };

      const { error } = await supabase
        .from('app_notes')
        .upsert(payload, { onConflict: 'id' });

      if (error) throw error;

      setNotes(notesDraft);
      setNotesEdit(false);
      setNotesStatus('Saved');
      setTimeout(() => setNotesStatus(''), 1500);
    } catch (err) {
      console.error('Error saving notes:', err);
      setNotesStatus('Failed to save notes');
    } finally {
      setNotesSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="home-dashboard">
        <div className="home-main-column">
          <div className="home-loading">
            <div className="presales-spinner" />
            <p>Loading dashboard…</p>
          </div>
        </div>
      </div>
    );
  }

  if (homeError) {
    return (
      <div className="home-dashboard">
        <div className="home-main-column">
          <div className="presales-error">
            <p>{homeError}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="home-dashboard">
      {/* LEFT: main work area (Projects list) */}
      <div className="home-main-column">
        {/* Retained-only KPI cards */}
        <section className="home-kpi-strip">
          <div className="home-kpi-card">
            <div className="home-kpi-label">Early-stage deals</div>
            <div className="home-kpi-value">{earlyStageDeals.length}</div>
            <div className="home-kpi-sub">Lead + Opportunity</div>
          </div>

          <div className="home-kpi-card">
            <div className="home-kpi-label">RFPs / Proposal under preparation</div>
            <div className="home-kpi-value">{proposalDeals.length}</div>
            <div className="home-kpi-sub">Proposal stage</div>
          </div>

          <div className="home-kpi-card">
            <div className="home-kpi-label">Deals close to signature</div>
            <div className="home-kpi-value">{contractingDeals.length}</div>
            <div className="home-kpi-sub">Contracting stage</div>
          </div>

          <div className="home-kpi-card">
            <div className="home-kpi-label">Open deals</div>
            <div className="home-kpi-value">{openDeals.length}</div>
            <div className="home-kpi-sub">Anything not Done / Closed</div>
          </div>
        </section>

        {/* Projects list below the summary */}
        <Projects />
      </div>

      {/* RIGHT: sidebar with top deals + commitments + notes */}
      <div className="home-side-column">
        {/* Top deals to watch */}
        <section className="home-card">
          <h3 className="home-card-title">Top deals to watch</h3>
          <p className="home-card-subtitle">Highest-value active opportunities.</p>

          {topDeals.length === 0 ? (
            <p className="small-muted">
              No active deals found yet. Create projects to start tracking.
            </p>
          ) : (
            <table className="home-topdeals-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Project</th>
                  <th>Stage</th>
                  <th className="th-right">Value</th>
                </tr>
              </thead>
              <tbody>
                {topDeals.map((p) => (
                  <tr key={p.id}>
                    <td>{p.customer_name || 'Unknown'}</td>
                    <td>{p.project_name || '-'}</td>
                    <td>{p.sales_stage || 'N/A'}</td>
                    <td className="td-right">{formatCurrency(Number(p.deal_value) || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Upcoming presales commitments */}
        <section className="home-card">
          <h3 className="home-card-title">Upcoming presales commitments</h3>
          <p className="home-card-subtitle">Demos, workshops, proposals in the next 14 days.</p>

          {upcomingCommitments.length === 0 ? (
            <p className="small-muted">No upcoming major commitments in the next 2 weeks.</p>
          ) : (
            <ul className="home-commitments-list">
              {upcomingCommitments.map((t) => (
                <li key={t.id} className="home-commitment-item">
                  <div className="home-commitment-main">
                    <span className="home-commitment-date">
                      {formatShortDate(t.due_date)}
                    </span>
                    <span className="home-commitment-title">
                      {t.description || 'Untitled task'}
                    </span>
                  </div>
                  <div className="home-commitment-meta">
                    <span>{t.customer_name}</span>
                    {t.assignee && <span> · {t.assignee}</span>}
                    {t.task_type && <span className="home-commitment-tag">{t.task_type}</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Notes (DB-backed free text with edit/save) */}
        <section className="home-card">
          <div className="home-card-header-row">
            <div>
              <h3 className="home-card-title">My notes</h3>
              <p className="home-card-subtitle">Quick reminders for this week.</p>
            </div>

            {!notesEdit ? (
              <button
                type="button"
                className="home-notes-btn"
                onClick={startEditNotes}
                disabled={notesLoading}
              >
                Edit
              </button>
            ) : (
              <div className="home-notes-actions">
                <button
                  type="button"
                  className="home-notes-btn secondary"
                  onClick={cancelEditNotes}
                  disabled={notesSaving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="home-notes-btn"
                  onClick={saveNotes}
                  disabled={notesSaving}
                >
                  {notesSaving ? 'Saving…' : 'Save'}
                </button>
              </div>
            )}
          </div>

          {notesEdit ? (
            <textarea
              className="home-notes-textarea"
              placeholder="Talking points, follow-ups, reminders for CEO / sales / presales huddle..."
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              disabled={notesLoading}
            />
          ) : (
            <div className="home-notes-view">
              {notesLoading ? (
                <p className="small-muted">Loading notes…</p>
              ) : notes?.trim() ? (
                <pre className="home-notes-pre">{notes}</pre>
              ) : (
                <p className="small-muted">No notes yet. Click Edit to add.</p>
              )}
            </div>
          )}

          {notesStatus ? <p className="home-notes-hint">{notesStatus}</p> : null}
        </section>
      </div>
    </div>
  );
}

// ----------------- MAIN APP -----------------
function App() {
  return (
    <Router>
      <div className="app-container">
        <AppHeader />
        <main className="app-main">
          <Routes>
            {/* HOME / MAIN DASHBOARD */}
            <Route path="/" element={<HomeDashboard />} />

            {/* SEPARATE PROJECTS VIEW */}
            <Route path="/projects" element={<Projects />} />

            {/* PROJECT + CUSTOMER DETAIL PAGES */}
            <Route path="/project/:projectId" element={<ProjectDetails />} />
            <Route path="/customer/:customerId" element={<CustomerDetails />} />

            {/* PRESALES OVERVIEW */}
            <Route path="/presales-overview" element={<PresalesOverview />} />

            {/* REPORTS DASHBOARD */}
            <Route path="/reports" element={<ReportsDashboard />} />

            {/* CATCH-ALL → HOME */}
            <Route path="*" element={<HomeDashboard />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
