// src/App.js
import React, { useEffect, useMemo, useState } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';

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
    location.pathname === path || (path !== '/' && location.pathname.startsWith(path));

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
        <Link to="/reports" className={isActive('/reports') ? 'nav-link active' : 'nav-link'}>
          Reports
        </Link>
      </nav>
    </header>
  );
}

// ----------------- HOME DASHBOARD -----------------
function HomeDashboard() {
  const [projects, setProjects] = useState([]);
  const [customerIdMap, setCustomerIdMap] = useState({});
  const [portfolioSummary, setPortfolioSummary] = useState({
    totalCustomers: 0,
    countries: 0,
    accountManagers: 0
  });

  const [loading, setLoading] = useState(true);
  const [homeError, setHomeError] = useState(null);

  useEffect(() => {
    const loadHomeData = async () => {
      setLoading(true);
      setHomeError(null);

      try {
        const projRes = await supabase
          .from('projects')
          .select('id, customer_name, project_name, sales_stage, deal_value, current_status, is_corporate')
          .order('customer_name', { ascending: true });

        if (projRes.error) throw projRes.error;

        const projData = projRes.data || [];
        setProjects(projData);

        const custRes = await supabase
          .from('customers')
          .select('id, customer_name, country, account_manager')
          .eq('is_archived', false);

        if (custRes.error) throw custRes.error;

        const map = {};
        (custRes.data || []).forEach((c) => {
          map[(c.customer_name || '').trim()] = c.id;
        });
        setCustomerIdMap(map);

        const countries = new Set((custRes.data || []).map((c) => c.country).filter(Boolean));
        const ams = new Set((custRes.data || []).map((c) => c.account_manager).filter(Boolean));

        setPortfolioSummary({
          totalCustomers: (custRes.data || []).length,
          countries: countries.size,
          accountManagers: ams.size
        });
      } catch (err) {
        console.error(err);
        setHomeError('Failed to load dashboard summary.');
      } finally {
        setLoading(false);
      }
    };

    loadHomeData();
  }, []);

  const openDeals = useMemo(() => {
    return (projects || []).filter((p) => {
      const stage = (p.sales_stage || '').toLowerCase();
      return stage !== 'done' && !stage.startsWith('closed') && !stage.includes('completed');
    });
  }, [projects]);

  const leadCount = useMemo(
    () => openDeals.filter((p) => (p.sales_stage || '').toLowerCase() === 'lead').length,
    [openDeals]
  );

  const opportunityCount = useMemo(
    () => openDeals.filter((p) => (p.sales_stage || '').toLowerCase() === 'opportunity').length,
    [openDeals]
  );

  const proposalCount = useMemo(
    () => openDeals.filter((p) => (p.sales_stage || '').toLowerCase() === 'proposal').length,
    [openDeals]
  );

  const contractingCount = useMemo(
    () => openDeals.filter((p) => (p.sales_stage || '').toLowerCase() === 'contracting').length,
    [openDeals]
  );

  const topDeals = useMemo(() => {
    return [...openDeals]
      .sort((a, b) => (Number(b.deal_value) || 0) - (Number(a.deal_value) || 0))
      .slice(0, 5);
  }, [openDeals]);

  const formatCurrency = (v) =>
    Number.isFinite(Number(v)) ? Number(v).toLocaleString() : '-';

  if (loading) {
    return <div className="home-loading">Loading…</div>;
  }

  if (homeError) {
    return <div className="presales-error">{homeError}</div>;
  }

  return (
    <div className="home-dashboard">
      {/* ✅ RESTORED KPI STRIP */}
      <section className="home-kpi-strip">
        <div className="home-kpi-section-label">Pipeline</div>

        <div className="home-kpi-card" data-tone="blue">
          <div className="home-kpi-top">
            <div className="home-kpi-icon" aria-hidden>L</div>
            <div className="home-kpi-top-text">
              <div className="home-kpi-label">Lead</div>
              <div className="home-kpi-sub">Early pipeline</div>
            </div>
          </div>
          <div className="home-kpi-value">{leadCount}</div>
        </div>

        <div className="home-kpi-card" data-tone="teal">
          <div className="home-kpi-top">
            <div className="home-kpi-icon" aria-hidden>O</div>
            <div className="home-kpi-top-text">
              <div className="home-kpi-label">Opportunity</div>
              <div className="home-kpi-sub">Discovery ongoing</div>
            </div>
          </div>
          <div className="home-kpi-value">{opportunityCount}</div>
        </div>

        <div className="home-kpi-card" data-tone="amber">
          <div className="home-kpi-top">
            <div className="home-kpi-icon" aria-hidden>P</div>
            <div className="home-kpi-top-text">
              <div className="home-kpi-label">Proposal</div>
              <div className="home-kpi-sub">RFP / proposal</div>
            </div>
          </div>
          <div className="home-kpi-value">{proposalCount}</div>
        </div>

        <div className="home-kpi-card" data-tone="indigo">
          <div className="home-kpi-top">
            <div className="home-kpi-icon" aria-hidden>C</div>
            <div className="home-kpi-top-text">
              <div className="home-kpi-label">Contracting</div>
              <div className="home-kpi-sub">Close to signature</div>
            </div>
          </div>
          <div className="home-kpi-value">{contractingCount}</div>
        </div>

        <div className="home-kpi-card" data-tone="slate">
          <div className="home-kpi-top">
            <div className="home-kpi-icon" aria-hidden>✦</div>
            <div className="home-kpi-top-text">
              <div className="home-kpi-label">Open deals</div>
              <div className="home-kpi-sub">Not done / closed</div>
            </div>
          </div>
          <div className="home-kpi-value">{openDeals.length}</div>
        </div>

        <div className="home-kpi-section-label">Portfolio</div>

        <div className="home-kpi-card" data-tone="blue">
          <div className="home-kpi-top">
            <div className="home-kpi-icon" aria-hidden>C</div>
            <div className="home-kpi-top-text">
              <div className="home-kpi-label">Customers</div>
              <div className="home-kpi-sub">Active (not archived)</div>
            </div>
          </div>
          <div className="home-kpi-value">{portfolioSummary.totalCustomers}</div>
        </div>

        <div className="home-kpi-card" data-tone="teal">
          <div className="home-kpi-top">
            <div className="home-kpi-icon" aria-hidden>🌏</div>
            <div className="home-kpi-top-text">
              <div className="home-kpi-label">Countries</div>
              <div className="home-kpi-sub">Coverage</div>
            </div>
          </div>
          <div className="home-kpi-value">{portfolioSummary.countries}</div>
        </div>

        <div className="home-kpi-card" data-tone="indigo">
          <div className="home-kpi-top">
            <div className="home-kpi-icon" aria-hidden>AM</div>
            <div className="home-kpi-top-text">
              <div className="home-kpi-label">Account managers</div>
              <div className="home-kpi-sub">Unique AMs</div>
            </div>
          </div>
          <div className="home-kpi-value">{portfolioSummary.accountManagers}</div>
        </div>

        <div className="home-kpi-card" data-tone="amber">
          <div className="home-kpi-top">
            <div className="home-kpi-icon" aria-hidden>$</div>
            <div className="home-kpi-top-text">
              <div className="home-kpi-label">Active deals</div>
              <div className="home-kpi-sub">Same as open deals</div>
            </div>
          </div>
          <div className="home-kpi-value">{openDeals.length}</div>
        </div>
      </section>

      {/* Top Deals */}
      <div className="home-top-row">
        <section className="home-card home-card-wide">
          <h3 className="home-card-title home-topdeals-title">Top deals to watch</h3>
          <p className="home-card-subtitle">Highest-value active opportunities.</p>

          {topDeals.length === 0 ? (
            <p className="small-muted">No active deals found.</p>
          ) : (
            <div className="home-topdeals-wrap">
              <table className="home-topdeals-table home-topdeals-table-wide">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Project</th>
                    <th>Stage</th>
                    <th className="th-right">Value</th>
                    <th>Status</th>
                    <th>Corporate</th>
                  </tr>
                </thead>
                <tbody>
                  {topDeals.map((p) => (
                    <tr key={p.id}>
                      <td>
                        {customerIdMap[(p.customer_name || '').trim()] ? (
                          <Link
                            to={`/customer/${customerIdMap[(p.customer_name || '').trim()]}`}
                            className="home-link"
                          >
                            {p.customer_name}
                          </Link>
                        ) : (
                          p.customer_name
                        )}
                      </td>
                      <td>
                        <Link to={`/project/${p.id}`} className="home-link">
                          {p.project_name}
                        </Link>
                      </td>
                      <td>{p.sales_stage}</td>
                      <td className="td-right">{formatCurrency(p.deal_value)}</td>
                      <td>{p.current_status || '-'}</td>
                      <td>{p.is_corporate ? 'Yes' : 'No'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <div className="home-main-column">
        <Projects embedded />
      </div>
    </div>
  );
}

// ----------------- MAIN APP -----------------
export default function App() {
  return (
    <Router>
      <div className="app-container">
        <AppHeader />
        <main className="app-main">
          <Routes>
            <Route path="/" element={<HomeDashboard />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/project/:projectId" element={<ProjectDetails />} />
            <Route path="/customer/:customerId" element={<CustomerDetails />} />
            <Route path="/presales-overview" element={<PresalesOverview />} />
            <Route path="/reports" element={<ReportsDashboard />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
