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

// ---------- Simple modal ----------
function Modal({ title, children, onClose }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card">
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="btn btn-ghost" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

// ----------------- HOME (CUSTOMERS LIST) -----------------
function HomeDashboard() {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState(null);

  // Filters
  const [countryFilter, setCountryFilter] = useState('All');
  const [amFilter, setAmFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('Active'); // Active | Archived | All
  const [search, setSearch] = useState('');

  // Add/Edit modal state
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    id: null,
    customer_name: '',
    country: '',
    account_manager: ''
  });

  const loadCustomers = async () => {
    setLoading(true);
    setPageError(null);

    try {
      // Always select is_archived so we can show Active/Archived
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
  };

  useEffect(() => {
    loadCustomers();
  }, []);

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
    const s = (search || '').trim().toLowerCase();

    return (customers || [])
      .filter((c) => {
        if (statusFilter === 'Active') return c.is_archived === false;
        if (statusFilter === 'Archived') return c.is_archived === true;
        return true;
      })
      .filter((c) => (countryFilter === 'All' ? true : (c.country || '') === countryFilter))
      .filter((c) => (amFilter === 'All' ? true : (c.account_manager || '') === amFilter))
      .filter((c) => {
        if (!s) return true;
        const hay = `${c.customer_name || ''} ${c.country || ''} ${c.account_manager || ''}`.toLowerCase();
        return hay.includes(s);
      });
  }, [customers, statusFilter, countryFilter, amFilter, search]);

  const openAdd = () => {
    setForm({ id: null, customer_name: '', country: '', account_manager: '' });
    setShowAdd(true);
  };

  const openEdit = (c) => {
    setForm({
      id: c.id,
      customer_name: c.customer_name || '',
      country: c.country || '',
      account_manager: c.account_manager || ''
    });
    setShowEdit(true);
  };

  const saveNew = async () => {
    if (!form.customer_name.trim()) {
      setPageError('Customer name is required.');
      return;
    }

    setSaving(true);
    setPageError(null);

    try {
      const payload = {
        customer_name: form.customer_name.trim(),
        country: form.country.trim() || null,
        account_manager: form.account_manager.trim() || null,
        is_archived: false
      };

      const res = await supabase.from('customers').insert([payload]).select('id').single();
      if (res.error) throw res.error;

      setShowAdd(false);
      await loadCustomers();
    } catch (err) {
      console.error(err);
      setPageError('Failed to add customer.');
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async () => {
    if (!form.customer_name.trim()) {
      setPageError('Customer name is required.');
      return;
    }

    setSaving(true);
    setPageError(null);

    try {
      const payload = {
        customer_name: form.customer_name.trim(),
        country: form.country.trim() || null,
        account_manager: form.account_manager.trim() || null
      };

      const res = await supabase.from('customers').update(payload).eq('id', form.id);
      if (res.error) throw res.error;

      setShowEdit(false);
      await loadCustomers();
    } catch (err) {
      console.error(err);
      setPageError('Failed to update customer.');
    } finally {
      setSaving(false);
    }
  };

  // "Delete" here = archive (soft delete), so you can restore later if needed
  const archiveCustomer = async (c) => {
    const ok = window.confirm(`Delete ${c.customer_name}? (This will archive the customer.)`);
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

  if (loading) return <div className="home-loading">Loading…</div>;
  if (pageError) return <div className="presales-error">{pageError}</div>;

  return (
    <div className="customer-page">
      <div className="customer-header">
        <div>
          <h2 className="page-title">Customers</h2>
          <p className="page-subtitle">Simple list view with filters and quick actions.</p>
        </div>

        <div className="customer-header-actions">
          <button className="btn btn-primary" onClick={openAdd}>
            + Add customer
          </button>
        </div>
      </div>

      <div className="customer-toolbar">
        <div className="customer-filters">
          <label className="field">
            <span className="field-label">Status</span>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="Active">Active</option>
              <option value="Archived">Archived</option>
              <option value="All">All</option>
            </select>
          </label>

          <label className="field">
            <span className="field-label">Country</span>
            <select value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)}>
              <option value="All">All</option>
              {countries.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="field-label">Account manager</span>
            <select value={amFilter} onChange={(e) => setAmFilter(e.target.value)}>
              <option value="All">All</option>
              {accountManagers.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="customer-search">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer, country, AM…"
            aria-label="Search customers"
          />
        </div>
      </div>

      <div className="customer-card">
        <div className="customer-count">
          Showing <b>{filteredCustomers.length}</b> customer{filteredCustomers.length === 1 ? '' : 's'}
        </div>

        {filteredCustomers.length === 0 ? (
          <div className="empty-state">
            No customers found. Try adjusting filters or add a new customer.
          </div>
        ) : (
          <div className="table-wrap">
            <table className="customer-table">
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
                  <tr key={c.id} className={c.is_archived ? 'row-archived' : ''}>
                    <td>
                      <button className="table-link-btn" onClick={() => navigate(`/customer/${c.id}`)}>
                        {c.customer_name}
                      </button>
                    </td>
                    <td>{c.country || '-'}</td>
                    <td>{c.account_manager || '-'}</td>
                    <td>
                      {c.is_archived ? (
                        <span className="badge badge-muted">Archived</span>
                      ) : (
                        <span className="badge badge-success">Active</span>
                      )}
                    </td>
                    <td className="td-right">
                      <div className="row-actions">
                        <button className="btn btn-secondary btn-sm" onClick={() => openEdit(c)}>
                          Edit
                        </button>

                        {c.is_archived ? (
                          <button className="btn btn-ghost btn-sm" onClick={() => restoreCustomer(c)}>
                            Restore
                          </button>
                        ) : (
                          <button className="btn btn-danger btn-sm" onClick={() => archiveCustomer(c)}>
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
      </div>

      {showAdd && (
        <Modal title="Add customer" onClose={() => setShowAdd(false)}>
          <div className="form-grid">
            <label className="field">
              <span className="field-label">Customer name *</span>
              <input
                value={form.customer_name}
                onChange={(e) => setForm((p) => ({ ...p, customer_name: e.target.value }))}
                placeholder="e.g. Security Bank"
              />
            </label>

            <label className="field">
              <span className="field-label">Country</span>
              <input
                value={form.country}
                onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))}
                placeholder="e.g. Philippines"
              />
            </label>

            <label className="field">
              <span className="field-label">Account manager</span>
              <input
                value={form.account_manager}
                onChange={(e) => setForm((p) => ({ ...p, account_manager: e.target.value }))}
                placeholder="e.g. Audrey"
              />
            </label>
          </div>

          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={() => setShowAdd(false)} disabled={saving}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={saveNew} disabled={saving}>
              {saving ? 'Saving…' : 'Add'}
            </button>
          </div>
        </Modal>
      )}

      {showEdit && (
        <Modal title="Edit customer" onClose={() => setShowEdit(false)}>
          <div className="form-grid">
            <label className="field">
              <span className="field-label">Customer name *</span>
              <input
                value={form.customer_name}
                onChange={(e) => setForm((p) => ({ ...p, customer_name: e.target.value }))}
              />
            </label>

            <label className="field">
              <span className="field-label">Country</span>
              <input value={form.country} onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))} />
            </label>

            <label className="field">
              <span className="field-label">Account manager</span>
              <input
                value={form.account_manager}
                onChange={(e) => setForm((p) => ({ ...p, account_manager: e.target.value }))}
              />
            </label>
          </div>

          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={() => setShowEdit(false)} disabled={saving}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={saveEdit} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </Modal>
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
