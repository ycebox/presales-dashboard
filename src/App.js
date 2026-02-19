// src/App.js
import React, { useEffect, useMemo, useState } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';

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

// ----------------- HOME (CUSTOMERS LIST) -----------------
function HomeCustomers() {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [homeError, setHomeError] = useState(null);

  const [search, setSearch] = useState('');

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState(null);

  const [form, setForm] = useState({
    customer_name: '',
    country: '',
    account_manager: ''
  });

  const loadCustomers = async () => {
    setLoading(true);
    setHomeError(null);

    try {
      const res = await supabase
        .from('customers')
        .select('id, customer_name, country, account_manager, is_archived')
        .eq('is_archived', false)
        .order('customer_name', { ascending: true });

      if (res.error) throw res.error;
      setCustomers(res.data || []);
    } catch (err) {
      console.error(err);
      setHomeError('Failed to load customers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredCustomers = useMemo(() => {
    const q = (search || '').trim().toLowerCase();
    if (!q) return customers;

    return (customers || []).filter((c) => {
      const name = (c.customer_name || '').toLowerCase();
      const country = (c.country || '').toLowerCase();
      const am = (c.account_manager || '').toLowerCase();
      return name.includes(q) || country.includes(q) || am.includes(q);
    });
  }, [customers, search]);

  const openAdd = () => {
    setAddError(null);
    setForm({ customer_name: '', country: '', account_manager: '' });
    setIsAddOpen(true);
  };

  const closeAdd = () => {
    if (saving) return;
    setIsAddOpen(false);
  };

  const onCreateCustomer = async () => {
    setAddError(null);

    const name = (form.customer_name || '').trim();
    if (!name) {
      setAddError('Customer name is required.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        customer_name: name,
        country: (form.country || '').trim() || null,
        account_manager: (form.account_manager || '').trim() || null,
        is_archived: false
      };

      const res = await supabase.from('customers').insert([payload]).select('id').single();
      if (res.error) throw res.error;

      setIsAddOpen(false);
      await loadCustomers();

      if (res.data?.id) {
        navigate(`/customer/${res.data.id}`);
      }
    } catch (err) {
      console.error(err);
      setAddError('Failed to create customer. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <div className="loading-text">Loading customers…</div>
      </div>
    );
  }

  if (homeError) return <div className="presales-error">{homeError}</div>;

  return (
    <div className="home-dashboard">
      <section className="home-card home-card-wide">
        <div className="home-card-header-row">
          <div>
            <h3 className="home-card-title home-page-title">Customers</h3>
            <p className="home-card-subtitle">Quick list of active customers (not archived).</p>
          </div>

          <div className="home-actions">
            <button className="home-btn secondary" onClick={() => loadCustomers()} disabled={loading}>
              Refresh
            </button>
            <button className="home-btn" onClick={openAdd}>
              + New customer
            </button>
          </div>
        </div>

        <div className="home-toolbar">
          <input
            className="home-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer, country, or account manager…"
          />
          <div className="home-toolbar-meta">
            <span className="pill">{filteredCustomers.length}</span>
            <span className="small-muted">showing</span>
          </div>
        </div>

        {filteredCustomers.length === 0 ? (
          <p className="small-muted">No customers found.</p>
        ) : (
          <div className="home-table-wrap">
            <table className="home-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Country</th>
                  <th>Account manager</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((c) => (
                  <tr key={c.id} onClick={() => navigate(`/customer/${c.id}`)} className="row-click">
                    <td>
                      <button
                        className="table-link-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/customer/${c.id}`);
                        }}
                      >
                        {c.customer_name || '-'}
                      </button>
                    </td>
                    <td className="td-ellipsis">{c.country || '-'}</td>
                    <td className="td-ellipsis">{c.account_manager || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Add Customer Modal */}
      {isAddOpen && (
        <div className="modal-backdrop" onClick={closeAdd} role="dialog" aria-modal="true">
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div className="modal-title">New customer</div>
                <div className="modal-subtitle">Create a customer record for your portfolio.</div>
              </div>
              <button className="icon-btn" onClick={closeAdd} aria-label="Close">
                ✕
              </button>
            </div>

            <div className="modal-body">
              {addError && <div className="inline-error">{addError}</div>}

              <div className="form-grid">
                <label className="field">
                  <span className="label">Customer name *</span>
                  <input
                    className="home-input"
                    value={form.customer_name}
                    onChange={(e) => setForm((p) => ({ ...p, customer_name: e.target.value }))}
                    placeholder="e.g., Security Bank"
                  />
                </label>

                <label className="field">
                  <span className="label">Country</span>
                  <input
                    className="home-input"
                    value={form.country}
                    onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))}
                    placeholder="e.g., Philippines"
                  />
                </label>

                <label className="field">
                  <span className="label">Account manager</span>
                  <input
                    className="home-input"
                    value={form.account_manager}
                    onChange={(e) => setForm((p) => ({ ...p, account_manager: e.target.value }))}
                    placeholder="e.g., Audrey"
                  />
                </label>
              </div>
            </div>

            <div className="modal-footer">
              <button className="home-btn secondary" onClick={closeAdd} disabled={saving}>
                Cancel
              </button>
              <button className="home-btn" onClick={onCreateCustomer} disabled={saving}>
                {saving ? 'Saving…' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
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
            <Route path="/" element={<HomeCustomers />} />
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
