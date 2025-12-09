// src/App.js
import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useLocation,
} from 'react-router-dom';
import Projects from './Projects';
import ProjectDetails from './ProjectDetails';
import CustomerDetails from './CustomerDetails';
import PresalesOverview from './PresalesOverview';
import ReportsDashboard from './ReportsDashboard';
import './App.css';

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

// ---- HOME DASHBOARD (Option B layout) ----
function HomeDashboard() {
  const [notes, setNotes] = React.useState('');

  return (
    <div className="home-dashboard">
      {/* LEFT: main work area */}
      <div className="home-main-column">
        <Projects />
      </div>

      {/* RIGHT: slim sidebar */}
      <div className="home-side-column">
        <section className="home-card">
          <h3 className="home-card-title">Top deals to watch</h3>
          <p className="home-card-subtitle">
            High-value or late-stage opportunities you want to keep an eye on.
          </p>
          <ul className="home-list-placeholder">
            <li>Use Reports to define your criteria for “top deals”.</li>
            <li>
              Later, we can wire this to Supabase (e.g. deal_value &gt; X and
              stage in Proposal / Contracting).
            </li>
          </ul>
        </section>

        <section className="home-card">
          <h3 className="home-card-title">Recently updated projects</h3>
          <p className="home-card-subtitle">
            Quick reminder of what changed in the last few days.
          </p>
          <ul className="home-list-placeholder">
            <li>
              Next step: pull from <code>projects</code> ordered by{' '}
              <code>updated_at</code>.
            </li>
            <li>For now, use this as a visual placeholder / reminder.</li>
          </ul>
        </section>

        <section className="home-card">
          <h3 className="home-card-title">My notes</h3>
          <p className="home-card-subtitle">
            Temporary scratchpad for things to remember this week.
          </p>
          <textarea
            className="home-notes-textarea"
            placeholder="Jot down talking points for CEO review, follow-ups for sales, or reminders for next presales huddle..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <p className="home-notes-hint">
            Notes are local only for now (no save to DB yet).
          </p>
        </section>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <div className="app-container">
        <AppHeader />

        <main className="app-main">
          <Routes>
            {/* HOME / MAIN DASHBOARD */}
            <Route path="/" element={<HomeDashboard />} />

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
                  {/* Catch all unknown routes → go Home */}
  <Route path="*" element={<HomeDashboard />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
