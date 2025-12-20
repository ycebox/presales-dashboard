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

// ----------------- HOME DASHBOARD (main page) -----------------
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
        // ✅ include current_status + is_corporate
        const projRes = await supabase
          .from('projects')
          .select('id, customer_name, project_name, sales_stage, deal_value, current_status, is_corporate')
          .order('customer_name', { ascending: true });

        if (projRes.error) throw projRes.error;

        const projData = projRes.data || [];
        setProjects(projData);

        // ✅ Resolve customer IDs so "Customer" can link to /customer/:id
        const uniqueNames = Array.from(
          new Set(projData.map((p) => (p.customer_name || '').trim()).filter(Boolean))
        );

        if (uniqueNames.length === 0) {
          setCustomerIdMap({});

          // ✅ Still load portfolio summary even if there are no projects yet
          const custSummaryRes = await supabase
            .from('customers')
            .select('id, country, account_manager')
            .eq('is_archived', false);

          if (custSummaryRes.error) throw custSummaryRes.error;

          const custRows = custSummaryRes.data || [];
          const countriesSet = new Set(
            custRows.map((c) => (c.country || '').trim()).filter(Boolean)
          );
          const amSet = new Set(
            custRows.map((c) => (c.account_manager || '').trim()).filter(Boolean)
          );

          setPortfolioSummary({
            totalCustomers: custRows.length,
            countries: countriesSet.size,
            accountManagers: amSet.size
          });

          return;
        }

        const custRes = await supabase
          .from('customers')
          .select('id, customer_name')
          .in('customer_name', uniqueNames);

        if (custRes.error) throw custRes.error;

        const map = {};
        (custRes.data || []).forEach((c) => {
          map[(c.customer_name || '').trim()] = c.id;
        });
        setCustomerIdMap(map);

        // ✅ Portfolio summary for KPI strip
        const custSummaryRes = await supabase
          .from('customers')
          .select('id, country, account_manager')
          .eq('is_archived', false);

        if (custSummaryRes.error) throw custSummaryRes.error;

        const custRows = custSummaryRes.data || [];
        const countriesSet = new Set(
          custRows.map((c) => (c.country || '').trim()).filter(Boolean)
        );
        const amSet = new Set(
          custRows.map((c) => (c.account_manager || '').trim()).filter(Boolean)
        );

        setPortfolioSummary({
          totalCustomers: custRows.length,
          countries: countriesSet.size,
          accountManagers: amSet.size
        });
      } catch (err) {
        console.error('Error loading home dashboard data:', err);
        setHomeError('Failed to load dashboard summary.');
      } finally {
        setLoading(false);
      }
    };

    loadHomeData();
  }, []);

  // ---------- Deal buckets ----------
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

  // ---------- Top deals to watch ----------
  const topDeals = useMemo(() => {
    if (!openDeals || openDeals.length === 0) return [];
    const sorted = openDeals
      .slice()
      .sort((a, b) => (Number(b.deal_value) || 0) - (Number(a.deal_value) || 0));
    return sorted.slice(0, 5);
  }, [openDeals]);

  const formatCurrency = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return '-';
    return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
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
      {/* ✅ ONE unified KPI strip (pipeline + portfolio). Projects will hide its own when embedded */}
      <section className="home-kpi-strip">
        {/* Pipeline */}
        <div className="home-kpi-card">
          <div className="home-kpi-label">Lead</div>
          <div className="home-kpi-value">{leadCount}</div>
          <div className="home-kpi-sub">Early pipeline</div>
        </div>

        <div className="home-kpi-card">
          <div className="home-kpi-label">Opportunity</div>
          <div className="home-kpi-value">{opportunityCount}</div>
          <div className="home-kpi-sub">Discovery ongoing</div>
        </div>

        <div className="home-kpi-card">
          <div className="home-kpi-label">Proposal</div>
          <div className="home-kpi-value">{proposalCount}</div>
          <div className="home-kpi-sub">RFP / proposal</div>
        </div>

        <div className="home-kpi-card">
          <div className="home-kpi-label">Contracting</div>
          <div className="home-kpi-value">{contractingCount}</div>
          <div className="home-kpi-sub">Close to signature</div>
        </div>

        <div className="home-kpi-card">
          <div className="home-kpi-label">Open deals</div>
          <div className="home-kpi-value">{openDeals.length}</div>
          <div className="home-kpi-sub">Not done / closed</div>
        </div>

        {/* Portfolio */}
        <div className="home-kpi-card">
          <div className="home-kpi-label">Customers</div>
          <div className="home-kpi-value">{portfolioSummary.totalCustomers}</div>
          <div className="home-kpi-sub">Active (not archived)</div>
        </div>

        <div className="home-kpi-card">
          <div className="home-kpi-label">Countries</div>
          <div className="home-kpi-value">{portfolioSummary.countries}</div>
          <div className="home-kpi-sub">Coverage</div>
        </div>

        <div className="home-kpi-card">
          <div className="home-kpi-label">Account managers</div>
          <div className="home-kpi-value">{portfolioSummary.accountManagers}</div>
          <div className="home-kpi-sub">Unique AMs</div>
        </div>

        <div className="home-kpi-card">
          <div className="home-kpi-label">Active deals</div>
          <div className="home-kpi-value">{openDeals.length}</div>
          <div className="home-kpi-sub">Same as open deals</div>
        </div>
      </section>

      {/* FULL-WIDTH: Top deals to watch */}
      <div className="home-top-row">
        <section className="home-card home-card-wide">
          <h3 className="home-card-title">Top deals to watch</h3>
          <p className="home-card-subtitle">Highest-value active opportunities.</p>

          {topDeals.length === 0 ? (
            <p className="small-muted">No active deals found yet. Create projects to start tracking.</p>
          ) : (
            <div className="home-topdeals-wrap">
              <table className="home-topdeals-table home-topdeals-table-wide">
                <colgroup>
                  <col style={{ width: '22%' }} />
                  <col style={{ width: '24%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '24%' }} />
                  <col style={{ width: '8%' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Project</th>
                    <th>Stage</th>
                    <th className="th-right">Value</th>
                    <th>Current Status</th>
                    <th>Corporate</th>
                  </tr>
                </thead>
                <tbody>
                  {topDeals.map((p) => {
                    const custName = (p.customer_name || '').trim();
                    const custId = customerIdMap[custName];

                    return (
                      <tr key={p.id}>
                        <td className="td-ellipsis" title={p.customer_name || ''}>
                          {custId ? (
                            <Link to={`/customer/${custId}`} className="home-link">
                              {p.customer_name || 'Unknown'}
                            </Link>
                          ) : (
                            <span>{p.customer_name || 'Unknown'}</span>
                          )}
                        </td>

                        <td className="td-ellipsis" title={p.project_name || ''}>
                          <Link to={`/project/${p.id}`} className="home-link">
                            {p.project_name || '-'}
                          </Link>
                        </td>

                        <td className="td-nowrap">{p.sales_stage || 'N/A'}</td>
                        <td className="td-right td-nowrap">{formatCurrency(p.deal_value)}</td>

                        <td className="td-ellipsis" title={p.current_status || ''}>
                          {p.current_status || '-'}
                        </td>

                        <td className="td-nowrap">{p.is_corporate ? 'Yes' : 'No'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* MAIN: Customer portfolio (embedded mode hides KPIs/summaries inside Projects) */}
      <div className="home-main-column">
        <Projects embedded />
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
            <Route path="/" element={<HomeDashboard />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/project/:projectId" element={<ProjectDetails />} />
            <Route path="/customer/:customerId" element={<CustomerDetails />} />
            <Route path="/presales-overview" element={<PresalesOverview />} />
            <Route path="/reports" element={<ReportsDashboard />} />
            <Route path="*" element={<HomeDashboard />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
