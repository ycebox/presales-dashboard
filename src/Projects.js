// src/Projects.js
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';
import {
  Trash2,
  UserPlus,
  Globe,
  Search,
  X,
  Edit3,
  AlertTriangle
} from 'lucide-react';
import './Projects.css';

function Modal({ onClose, children }) {
  return ReactDOM.createPortal(
    <div
      className="modal-overlay"
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className="modal-content">{children}</div>
    </div>,
    document.body
  );
}

function Projects({ embedded = false }) {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [customerStatuses, setCustomerStatuses] = useState([]);
  const [countries, setCountries] = useState([]);
  const [accountManagers, setAccountManagers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    country: '',
    account_manager: '',
    status_id: '' // default to Active once statuses are loaded
  });

  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3200);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Statuses
        const statusRes = await supabase
          .from('customer_statuses')
          .select('*')
          .order('id', { ascending: true });

        if (statusRes.error) throw statusRes.error;
        const statuses = statusRes.data || [];
        setCustomerStatuses(statuses);

        // Countries
        const countriesRes = await supabase
          .from('countries')
          .select('name')
          .order('name', { ascending: true });

        if (countriesRes.error) throw countriesRes.error;
        setCountries((countriesRes.data || []).map((c) => c.name));

        // Account managers
        const amRes = await supabase
          .from('account_managers')
          .select('name')
          .order('name', { ascending: true });

        if (amRes.error) throw amRes.error;
        setAccountManagers((amRes.data || []).map((a) => a.name));

        // Customers
        const customersRes = await supabase
          .from('customers')
          .select('*')
          .eq('is_archived', false)
          .order('customer_name', { ascending: true });

        if (customersRes.error) throw customersRes.error;
        setCustomers(customersRes.data || []);

        // ✅ Default status filter to "Active"
        // Works if your customer_statuses table has label/code that includes "active"
        const active = statuses.find((s) => {
          const label = String(s.label || '').toLowerCase();
          const code = String(s.code || '').toLowerCase();
          return label.includes('active') || code.includes('active');
        });

        if (active?.id) {
          setFilters((p) => ({
            ...p,
            status_id: String(active.id)
          }));
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load customers.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredCustomers = useMemo(() => {
    let list = [...customers];

    // search
    if (searchTerm.trim()) {
      const t = searchTerm.trim().toLowerCase();
      list = list.filter((c) => {
        const n = String(c.customer_name || '').toLowerCase();
        const a = String(c.account_manager || '').toLowerCase();
        const co = String(c.country || '').toLowerCase();
        return n.includes(t) || a.includes(t) || co.includes(t);
      });
    }

    // filters
    if (filters.country) {
      list = list.filter((c) => String(c.country || '') === String(filters.country));
    }
    if (filters.account_manager) {
      list = list.filter(
        (c) => String(c.account_manager || '') === String(filters.account_manager)
      );
    }
    if (filters.status_id) {
      list = list.filter((c) => String(c.status_id || '') === String(filters.status_id));
    }

    return list;
  }, [customers, searchTerm, filters]);

  const getCustomerStatus = (customer) => {
    return customerStatuses.find((s) => String(s.id) === String(customer.status_id)) || null;
  };

  const openCustomer = (customer) => {
    navigate(`/customer/${customer.id}`);
  };

  const deleteCustomer = async (customer) => {
    if (!window.confirm(`Archive customer "${customer.customer_name}"?`)) return;

    await supabase
      .from('customers')
      .update({ is_archived: true })
      .eq('id', customer.id);

    setCustomers((prev) => prev.filter((c) => c.id !== customer.id));
    showToast('Customer archived');
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilters({ country: '', account_manager: '', status_id: '' });
  };

  const hasActiveFilters =
    !!searchTerm.trim() || !!filters.country || !!filters.account_manager || !!filters.status_id;

  if (loading) {
    return (
      <div className="projects-container">
        <div className="loading-container">
          <div className="loading-spinner" />
          <div className="loading-text">Loading customer portfolio…</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="projects-container">
        <div className="error-state">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="projects-container">
      {toast && (
        <div className={`toast ${toast.type === 'error' ? 'toast-error' : ''}`}>
          {toast.message}
        </div>
      )}

      <div className="projects-inner">
        <header className="projects-header">
          <div className="header-title-section">
            <h2>Customer Portfolio</h2>
            <p className="header-subtitle">
              {filteredCustomers.length} shown • {customers.length} total
            </p>
          </div>

          <div className="header-actions">
            <button className="action-button primary" onClick={() => setShowCustomerModal(true)}>
              <UserPlus size={12} className="button-icon" />
              Add Customer
            </button>
          </div>
        </header>

        {/* ✅ Search + Dropdown filters */}
        <section className="filters-section">
          <div className="filters-row">
            <div className="search-wrapper">
              <Search size={14} className="search-icon" />
              <input
                className="search-input"
                placeholder="Search customers (name, AM, country)…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm ? (
                <button className="icon-btn" onClick={() => setSearchTerm('')} title="Clear search">
                  <X size={14} />
                </button>
              ) : null}
            </div>

            <div className="filters-grid filters-grid-3">
              <select
                className="filter-select"
                value={filters.country}
                onChange={(e) => setFilters((p) => ({ ...p, country: e.target.value }))}
              >
                <option value="">All Countries</option>
                {countries.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <select
                className="filter-select"
                value={filters.account_manager}
                onChange={(e) => setFilters((p) => ({ ...p, account_manager: e.target.value }))}
              >
                <option value="">All Account Managers</option>
                {accountManagers.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>

              <select
                className="filter-select"
                value={filters.status_id}
                onChange={(e) => setFilters((p) => ({ ...p, status_id: e.target.value }))}
              >
                <option value="">All Status</option>
                {customerStatuses.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {hasActiveFilters && (
            <div className="filters-footer">
              <button className="action-button secondary" onClick={clearFilters}>
                <X size={12} className="button-icon" />
                Clear All
              </button>
            </div>
          )}
        </section>

        {/* Table */}
        <section className="table-section">
          <div className="table-wrapper">
            <div className="customers-table-scroll">
              <table className="customers-table customers-table-6col">
                <thead>
                  <tr>
                    <th className="th-left">Customer</th>
                    <th className="th-center">Country</th>
                    <th className="th-center">Account Manager</th>
                    <th className="th-center">Type</th>
                    <th className="th-center">Status</th>
                    <th className="th-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((c) => {
                    const status = getCustomerStatus(c);
                    return (
                      <tr key={c.id} className="table-row">
                        <td className="td-left">
                          <button className="link-btn" onClick={() => openCustomer(c)}>
                            {c.customer_name}
                          </button>
                        </td>
                        <td className="td-center">{c.country || '—'}</td>
                        <td className="td-center">{c.account_manager || '—'}</td>
                        <td className="td-center">{c.customer_type || '—'}</td>
                        <td className="td-center">{status?.label || 'Not Set'}</td>
                        <td className="cell-actions">
                          <button className="icon-btn" title="Edit">
                            <Edit3 size={14} />
                          </button>
                          <button
                            className="icon-btn danger"
                            onClick={() => deleteCustomer(c)}
                            title="Archive"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredCustomers.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ padding: '16px', color: '#64748b' }}>
                        No customers found. Try adjusting your search/filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Modal placeholder (kept as-is) */}
        {showCustomerModal && (
          <Modal onClose={() => setShowCustomerModal(false)}>
            <div className="modal-header">
              <h3>Add Customer</h3>
              <button className="icon-btn" onClick={() => setShowCustomerModal(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ margin: 0, color: '#475569' }}>
                (Modal content unchanged in this update)
              </p>
            </div>
            <div className="modal-footer">
              <button className="action-button secondary" onClick={() => setShowCustomerModal(false)}>
                Close
              </button>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}

export default Projects;
