// src/App.js
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';

import { supabase } from './supabaseClient';

import Projects from './Projects';
import ProjectDetails from './ProjectDetails';
import CustomerDetails from './CustomerDetails';
import PresalesOverview from './PresalesOverview';
import ReportsDashboard from './ReportsDashboard';

import './App.css';

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
          Customers
        </Link>
        <Link
          to="/presales-overview"
          className={isActive('/presales-overview') ? 'nav-link active' : 'nav-link'}
        >
          Presales overview
        </Link>
        <Link to="/projects" className={isActive('/projects') ? 'nav-link active' : 'nav-link'}>
          Projects
        </Link>
        <Link to="/reports" className={isActive('/reports') ? 'nav-link active' : 'nav-link'}>
          Reports
        </Link>
      </nav>
    </header>
  );
}

function HomeCustomers() {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('Active'); // Active | Archived | All
  const [countryFilter, setCountryFilter] = useState('All');
  const [amFilter, setAmFilter] = useState('All');
  const [search, setSearch] = useState('');

  // Add/Edit modal
  const [modalMode, setModalMode] = useState(null); // null | 'add' | 'edit'
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const [form, setForm] = useState({
    id: null,
    customer_name: '',
    country: '',
    account_manager: ''
  });

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    setPageError(null);

    try {
      const res = await supabase
        .from('customers')
        .select('id, customer_name, country, account_manager, is_archived')
        .order('customer_name', { ascending: true });

      if (res.error) throw res.error;
      setCustomers(res.data || []);
    } catch (err) {
      console.error(err);
      setPageError('Failed to load customers.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const countries = useMemo(() => {
    const vals = Array.from(new Set((customers || []).map((c) => c.country).filter(Boolean)));
    vals.sort((a, b) => String(a).localeCompare(String(b)));
    return vals;
  }, [customers]);

  const accountManagers = useMemo(() => {
    const vals = Array.from(new Set((customers || []).map((c) => c.account_manager).filter(Boolean)));
    vals.sort((a, b) => String(a).localeCompare(String(b)));
    return vals;
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    const q = (search || '').trim().toLowerCase();

    return (customers || [])
      .filter((c) => {
        if (statusFilter === 'Active') return c.is_archived === false;
        if (statusFilter === 'Archived') return c.is_archived === true;
        return true;
      })
      .filter((c) => (countryFilter === 'All' ? true : (c.country || '') === countryFilter))
      .filter((c) => (amFilter === 'All' ? true : (c.account_manager || '') === amFilter))
      .filter((c) => {
        if (!q) return true;
        const hay = `${c.customer_name || ''} ${c.country || ''} ${c.account_manager || ''}`.toLowerCase();
        return hay.includes(q);
      });
  }, [customers, statusFilter, countryFilter, amFilter, search]);

  const openAdd = () => {
    setFormError(null);
    setForm({ id: null, customer_name: '', country: '', account_manager: '' });
    setModalMode('add');
  };

  const openEdit = (c) => {
    setFormError(null);
    setForm({
      id: c.id,
      customer_name: c.customer_name || '',
      country: c.country || '',
      account_manager: c.account_manager || ''
    });
    setModalMode('edit');
  };

  const closeModal = () => {
    if (saving) return;
    setModalMode(null);
  };

  const saveCustomer = async () => {
    setFormError(null);

    const name = (form.customer_name || '').trim();
    if (!name) {
      setFormError('Customer name is required.');
      return;
    }

    setSaving(true);
    try {
      if (modalMode === 'add') {
        const payload = {
          customer_name: name,
          country: (form.country || '').trim() || null,
          account_manager: (form.account_manager || '').trim() || null,
          is_archived: false
        };

        const res = await supabase.from('customers').insert([payload]).select('id').single();
        if (res.error) throw res.error;

        setModalMode(null);
        await loadCustomers();

        if (res.data?.id) navigate(`/customer/${res.data.id}`);
        return;
      }

      if (modalMode === 'edit') {
        const payload = {
          customer_name: name,
          country: (form.country || '').trim() || null,
          account_manager: (form.account_manager || '').trim() || null
        };

        const res = await supabase.from('customers').update(payload).eq('id', form.id);
        if (res.error) throw res.error;

        setModalMode(null);
        await loadCustomers();
      }
    } catch (err) {
      console.error(err);
      setFormError(modalMode === 'add' ? 'Failed to create customer.' : 'Failed to update customer.');
    } finally {
      setSaving(false);
    }
  };

  const archiveCustomer = async (c) => {
    const ok = window.confirm(`Delete ${c.customer_name}? This will archive the customer.`);
    if (!ok) return;

    try {
      const res = await supabase.from('customers').update({ is_archived: true }).eq('id', c.id);
      if (res.error) throw res.error;
      await loadCustomers();
    } catch (err) {
      console.error(err);
      setPageError('Failed to delete customer.');
    }
  };

  const restoreCustomer = async (c) => {
    const ok = window.confirm(`Restore ${c.customer_name} back to Active?`);
    if (!ok) return;

    try {
      const res = await supabase.from('customers').update({ is_archived: false }).eq('id', c.id);
      if (res.error) throw res.error;
      await loadCustomers();
    } catch (err) {
      console.error(err);
      setPageError('Failed to restore customer.');
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

  if (pageError) return <div className="presales-error">{pageError}</div>;

  return (
    <div className="home-dashboard">
      <section className="home-card home-card-wide">
        <div className="home-card-header-row">
          <div>
            <h3 className="home-card-title home-page-title">Customers</h3>
            <p className="home-card-subtitle">List view with filters and quick actions.</p>
          </div>

          <div className="home-actions">
            <button className="home-btn secondary" onClick={loadCustomers} disabled={loading}>
              Refresh
            </button>
            <button className="home-btn" onClick={openAdd}>
              + New customer
            </button>
          </div>
        </div>

        {/* Filters row */}
        <div className="home-filterbar">
          <div className="home-filter-group">
            <label className="home-field">
              <span className="home-label">Status</span>
              <select className="home-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="Active">Active</option>
                <option value="Archived">Archived</option>
                <option value="All">All</option>
              </select>
            </label>

            <label className="home-field">
              <span className="home-label">Country</span>
              <select className="home-select" value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)}>
                <option value="All">All</option>
                {countries.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>

            <label className="home-field">
              <span className="home-label">Account manager</span>
              <select className="home-select" value={amFilter} onChange={(e) => setAmFilter(e.target.value)}>
                <option value="All">All</option>
                {accountManagers.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="home-search-wrap">
            <input
              className="home-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customer, country, AM…"
            />
            <div className="home-toolbar-meta">
              <span className="pill">{filteredCustomers.length}</span>
              <span className="small-muted">showing</span>
            </div>
          </div>
        </div>

        {filteredCustomers.length === 0 ? (
          <p className="small-muted">No customers found.</p>
        ) : (
          <div className="home-table-wrap">
            <table className="home-table customers-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Country</th>
                  <th>Account manager</th>
                  <th>Status</th>
                  <th className="th-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((c) => (
                  <tr key={c.id} className={`row-click ${c.is_archived ? 'row-archived' : ''}`}>
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
                    <td>
                      {c.is_archived ? (
                        <span className="badge badge-muted">Archived</span>
                      ) : (
                        <span className="badge badge-success">Active</span>
                      )}
                    </td>
                    <td className="th-right">
                      <div className="row-actions">
                        <button className="mini-btn" onClick={() => openEdit(c)}>
                          Edit
                        </button>
                        {c.is_archived ? (
                          <button className="mini-btn ghost" onClick={() => restoreCustomer(c)}>
                            Restore
                          </button>
                        ) : (
                          <button className="mini-btn danger" onClick={() => archiveCustomer(c)}>
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modal */}
      {modalMode && (
        <div className="modal-backdrop" onClick={closeModal} role="dialog" aria-modal="true">
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div className="modal-title">{modalMode === 'add' ? 'New customer' : 'Edit customer'}</div>
                <div className="modal-subtitle">
                  {modalMode === 'add' ? 'Create a customer record.' : 'Update customer details.'}
                </div>
              </div>
              <button className="icon-btn" onClick={closeModal} aria-label="Close">
                ✕
              </button>
            </div>

            <div className="modal-body">
              {formError && <div className="inline-error">{formError}</div>}

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
              <button className="home-btn secondary" onClick={closeModal} disabled={saving}>
                Cancel
              </button>
              <button className="home-btn" onClick={saveCustomer} disabled={saving}>
                {saving ? 'Saving…' : modalMode === 'add' ? 'Create' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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
