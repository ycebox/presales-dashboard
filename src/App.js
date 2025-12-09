// src/App.js
import React, { useEffect, useMemo, useState } from 'react';
import {
  BrowserRouter as Router,
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
        <Link
          to="/"
          className={isActive('/') ? 'nav-link active' : 'nav-link'}
        >
          Home
        </Link>
        <Link
          to="/presales-overview"
          className={
            isActive('/presales-overview') ? 'nav-link active' : 'nav-link'
          }
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
  const [notes, setNotes] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const loadHomeData = async () => {
      setLoading(true);
      setHomeError(null);
      try {
        const [projRes, taskRes] = await Promise.all([
          supabase
            .from('projects')
            .select('id, customer_name, sales_stage, deal_value')
            .order('customer_name', { ascending: true }),
          supabase
            .from('project_tasks')
            .select(
              'id, project_id, assignee, status, due_date, task_type, description'
            ),
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

  // ---------- Executive snapshot ----------
  const activeProjects = useMemo(
    () =>
      (projects || []).filter((p) => {
        const stage = (p.sales_stage || '').toLowerCase();
        return stage !== 'done' && !stage.startsWith('closed');
      }),
    [projects]
  );

  const activeCount = activeProjects.length;

  const totalPipelineValue = useMemo(
    () =>
      activeProjects.reduce(
        (sum, p) => sum + (Number(p.deal_value) || 0),
        0
      ),
    [activeProjects]
  );

  const stageCounts = useMemo(() => {
    const map = new Map();
    (projects || []).forEach((p) => {
      const stage = p.sales_stage || 'Not set';
      map.set(stage, (map.get(stage) || 0) + 1);
    });
    return map;
  }, [projects]);

  const dealsByStageLabel = useMemo(() => {
    const order = ['Lead', 'Opportunity', 'Proposal', 'Contracting', 'Done'];
    const parts = [];
    order.forEach((stage) => {
      const count = stageCounts.get(stage) || 0;
      if (count > 0 && stage !== 'Done') {
        parts.push(`${count} ${stage}`);
      }
    });
    if (parts.length === 0) return 'No active stages yet';
    return parts.join(' · ');
  }, [stageCounts]);

  const proposalCount = stageCounts.get('Proposal') || 0;
  const contractingCount = stageCounts.get('Contracting') || 0;

  // ---------- Top deals to watch ----------
  const topDeals = useMemo(() => {
    if (!activeProjects || activeProjects.length === 0) return [];
    const sorted = activeProjects
      .slice()
      .sort(
        (a, b) =>
          (Number(b.deal_value) || 0) - (Number(a.deal_value) || 0)
      );
    return sorted.slice(0, 6);
  }, [activeProjects]);

  // ---------- Upcoming presales commitments ----------
  const upcomingCommitments = useMemo(() => {
    if (!tasks || tasks.length === 0) return [];

    const importantTypes = [
      'Demo',
      'Workshop',
      'RFP',
      'Proposal',
      'Presentation',
      'POC',
    ];

    const projectNameMap = new Map();
    (projects || []).forEach((p) => {
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
        customer_name:
          projectNameMap.get(t.project_id) || 'Unknown project',
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
  }, [tasks, projects, inNextNDays, today]);

  // ---------- Quick access tiles (by stage) ----------
  const quickTiles = useMemo(
    () => [
      {
        key: 'opp',
        label: 'In Opportunity',
        count: stageCounts.get('Opportunity') || 0,
        description: 'Early-stage deals that need shaping.',
      },
      {
        key: 'proposal',
        label: 'In Proposal',
        count: proposalCount,
        description: 'RFPs / proposals under preparation.',
      },
      {
        key: 'contracting',
        label: 'In Contracting',
        count: contractingCount,
        description: 'Deals close to signature.',
      },
      {
        key: 'total-active',
        label: 'All active deals',
        count: activeCount,
        description: 'Anything not Done / Closed.',
      },
    ],
    [stageCounts, proposalCount, contractingCount, activeCount]
  );

  const formatCurrency = (value) => {
    if (!Number.isFinite(value)) return '-';
    return value.toLocaleString('en-US', {
      maximumFractionDigits: 0,
    });
  };

  const formatShortDate = (d) =>
    d
      ? new Date(d).toLocaleDateString('en-SG', {
          day: '2-digit',
          month: 'short',
        })
      : '';

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
        {/* Executive snapshot strip */}
        <section className="home-kpi-strip">
          <div className="home-kpi-card">
            <div className="home-kpi-label">Active opportunities</div>
            <div className="home-kpi-value">{activeCount}</div>
            <div className="home-kpi-sub">
              Deals not in Done / Closed.
            </div>
          </div>
          <div className="home-kpi-card">
            <div className="home-kpi-label">Total pipeline value</div>
            <div className="home-kpi-value">
              {formatCurrency(totalPipelineValue)}
            </div>
            <div className="home-kpi-sub">Sum of active deal values.</div>
          </div>
          <div className="home-kpi-card">
            <div className="home-kpi-label">Deals by stage</div>
            <div className="home-kpi-value-small">
              {dealsByStageLabel}
            </div>
            <div className="home-kpi-sub">
              Quick view of where pipeline is sitting.
            </div>
          </div>
          <div className="home-kpi-card">
            <div className="home-kpi-label">Proposal + Contracting</div>
            <div className="home-kpi-value">
              {proposalCount + contractingCount}
            </div>
            <div className="home-kpi-sub">
              Combined deals close to the finish line.
            </div>
          </div>
        </section>

        {/* Quick access tiles */}
        <section className="home-quick-tiles">
          {quickTiles.map((tile) => (
            <button
              key={tile.key}
              type="button"
              className="home-quick-tile"
              onClick={() => navigate('/projects')}
            >
              <div className="home-quick-count">{tile.count}</div>
              <div className="home-quick-label">{tile.label}</div>
              <div className="home-quick-desc">{tile.description}</div>
            </button>
          ))}
        </section>

        {/* Projects list below the summary */}
        <Projects />
      </div>

      {/* RIGHT: sidebar with top deals + commitments + notes */}
      <div className="home-side-column">
        {/* Top deals to watch */}
        <section className="home-card">
          <h3 className="home-card-title">Top deals to watch</h3>
          <p className="home-card-subtitle">
            Highest-value active opportunities.
          </p>
          {topDeals.length === 0 ? (
            <p className="small-muted">
              No active deals found yet. Create projects to start tracking.
            </p>
          ) : (
            <table className="home-topdeals-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Stage</th>
                  <th className="th-right">Value</th>
                </tr>
              </thead>
              <tbody>
                {topDeals.map((p) => (
                  <tr key={p.id}>
                    <td>{p.customer_name || 'Unknown'}</td>
                    <td>{p.sales_stage || 'N/A'}</td>
                    <td className="td-right">
                      {formatCurrency(Number(p.deal_value) || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Upcoming presales commitments */}
        <section className="home-card">
          <h3 className="home-card-title">Upcoming presales commitments</h3>
          <p className="home-card-subtitle">
            Demos, workshops, proposals in the next 14 days.
          </p>
          {upcomingCommitments.length === 0 ? (
            <p className="small-muted">
              No upcoming major commitments in the next 2 weeks.
            </p>
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
                    {t.task_type && (
                      <span className="home-commitment-tag">
                        {t.task_type}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Notes scratchpad */}
        <section className="home-card">
          <h3 className="home-card-title">My notes</h3>
          <p className="home-card-subtitle">
            Quick reminders for this week (local only for now).
          </p>
          <textarea
            className="home-notes-textarea"
            placeholder="Talking points, follow-ups, reminders for CEO / sales / presales huddle..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <p className="home-notes-hint">
            Notes are not saved to the database yet.
          </p>
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

            {/* SEPARATE PROJECTS VIEW (for future filters from tiles) */}
            <Route path="/projects" element={<Projects />} />

            {/* PROJECT + CUSTOMER DETAIL PAGES */}
            <Route path="/project/:projectId" element={<ProjectDetails />} />
            <Route path="/customer/:customerId" element={<CustomerDetails />} />

            {/* PRESALES OVERVIEW */}
            <Route
              path="/presales-overview"
              element={<PresalesOverview />}
            />

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
