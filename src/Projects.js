// src/Projects.js
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Building2, Trash2, UserPlus, Search, X, Edit3, Check, AlertTriangle } from 'lucide-react';
import './Projects.css';

// Modal outside component so inputs don't lose focus
function Modal({ onClose, children }) {
  return ReactDOM.createPortal(
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
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

  const [countries, setCountries] = useState([]); // string[]
  const [accountManagers, setAccountManagers] = useState([]); // {id,name,email,region}[]

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    country: '',
    account_manager: '',
    customer_type: '',
    status_id: '',
    is_inactive: '' // '', 'active', 'inactive'
  });

  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [toast, setToast] = useState(null);

  // Only DB-backed fields we want on this page
  const [formCustomer, setFormCustomer] = useState({
    customer_name: '',
    account_manager: '',
    country: '',
    customer_type: 'New',
    status_id: '',
    notes: ''
  });

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3200);
  }, []);

  const closeModal = () => {
    setShowCustomerModal(false);
    setEditingCustomer(null);
  };

  const resetForm = () => {
    setFormCustomer({
      customer_name: '',
      account_manager: '',
      country: '',
      customer_type: 'New',
      status_id: '',
      notes: ''
    });
  };

  const openAddCustomerModal = () => {
    setEditingCustomer(null);
    resetForm();
    setShowCustomerModal(true);
  };

  const openEditCustomerModal = (customer) => {
    setEditingCustomer(customer);
    setFormCustomer({
      customer_name: customer.customer_name || '',
      account_manager: customer.account_manager || '',
      country: customer.country || '',
      customer_type: customer.customer_type || 'New',
      status_id: customer.status_id ?? '',
      notes: customer.notes || ''
    });
    setShowCustomerModal(true);
  };

  const openCustomer = (customer) => customer?.id && navigate(`/customer/${customer.id}`);

  const getCustomerStatus = (customer) => {
    const id = customer?.status_id;
    if (!id) return null;
    return customerStatuses.find((s) => String(s.id) === String(id)) || null;
  };

  const getStatusBadgeClass = (statusCodeOrLabel) => {
    const s = String(statusCodeOrLabel || '').toLowerCase();
    if (!s) return 'status-badge';
    if (s.includes('at risk') || s.includes('risk')) return 'status-badge status-risk';
    if (s.includes('active')) return 'status-badge status-active';
    if (s.includes('prospect')) return 'status-badge status-prospect';
    if (s.includes('hold')) return 'status-badge status-hold';
    return 'status-badge';
  };

  const clearFilters = () => {
    setFilters({ country: '', account_manager: '', customer_type: '', status_id: '', is_inactive: '' });
    setSearchTerm('');
  };

  const hasActiveFilters = useMemo(() => {
    return (
      !!searchTerm.trim() ||
      !!filters.country ||
      !!filters.account_manager ||
      !!filters.customer_type ||
      !!filters.status_id ||
      !!filters.is_inactive
    );
  }, [searchTerm, filters]);

  // Load master data + customers
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const statusRes = await supabase
          .from('customer_statuses')
          .select('*')
          .order('id', { ascending: true });
        if (statusRes.error) throw statusRes.error;
        setCustomerStatuses(statusRes.data || []);

        const countriesRes = await supabase
          .from('countries')
          .select('name')
          .order('name', { ascending: true });
        if (countriesRes.error) throw countriesRes.error;
        setCountries((countriesRes.data || []).map((c) => c.name));

        const amRes = await supabase
          .from('account_managers')
          .select('id, name, email, region')
          .order('name', { ascending: true });
        if (amRes.error) throw amRes.error;
        setAccountManagers(amRes.data || []);

        const customersRes = await supabase
          .from('customers')
          .select('*')
          .eq('is_archived', false)
          .order('customer_name', { ascending: true });
        if (customersRes.error) throw customersRes.error;
        setCustomers(customersRes.data || []);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err?.message || 'Failed to load customers.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredCustomers = useMemo(() => {
    let list = [...customers];

    if (searchTerm.trim()) {
      const t = searchTerm.trim().toLowerCase();
      list = list.filter((c) => {
        const n = String(c.customer_name || '').toLowerCase();
        const a = String(c.account_manager || '').toLowerCase();
        const co = String(c.country || '').toLowerCase();
        return n.includes(t) || a.includes(t) || co.includes(t);
      });
    }

    if (filters.country) list = list.filter((c) => String(c.country || '') === String(filters.country));
    if (filters.account_manager)
      list = list.filter((c) => String(c.account_manager || '') === String(filters.account_manager));
    if (filters.customer_type)
      list = list.filter((c) => String(c.customer_type || '') === String(filters.customer_type));
    if (filters.status_id) list = list.filter((c) => String(c.status_id || '') === String(filters.status_id));

    if (filters.is_inactive === 'active') {
      list = list.filter((c) => !c.is_inactive);
    } else if (filters.is_inactive === 'inactive') {
      list = list.filter((c) => !!c.is_inactive);
    }

    // Always keep name sort stable
    list.sort((a, b) => String(a.customer_name || '').localeCompare(String(b.customer_name || '')));

    return list;
  }, [customers, searchTerm, filters]);

  const deleteCustomer = async (customer) => {
    if (!customer?.id) return;
    const ok = window.confirm(`Archive customer "${customer.customer_name}"?`);
    if (!ok) return;

    try {
      const { error } = await supabase.from('customers').update({ is_archived: true }).eq('id', customer.id);
      if (error) throw error;

      setCustomers((prev) => prev.filter((c) => c.id !== customer.id));
      showToast('Customer archived.');
    } catch (err) {
      console.error('Error archiving customer:', err);
      showToast(err?.message || 'Failed to archive customer.', 'error');
    }
  };

  const buildCustomerPayload = () => {
    return {
      customer_name: (formCustomer.customer_name || '').trim(),
      account_manager: formCustomer.account_manager || null,
      country: formCustomer.country || null,
      customer_type: formCustomer.customer_type || null,
      status_id: formCustomer.status_id === '' || formCustomer.status_id == null ? null : Number(formCustomer.status_id),
      notes: formCustomer.notes || null
    };
  };

  const handleSaveCustomer = async () => {
    try {
      const payload = buildCustomerPayload();

      if (!payload.customer_name) {
        showToast('Customer name is required.', 'error');
        return;
      }

      if (editingCustomer?.id) {
        const { error } = await supabase.from('customers').update(payload).eq('id', editingCustomer.id);
        if (error) throw error;

        setCustomers((prev) => prev.map((c) => (c.id === editingCustomer.id ? { ...c, ...payload } : c)));
        showToast('Customer updated.');
      } else {
        const { data, error } = await supabase.from('customers').insert([payload]).select('*').single();
        if (error) throw error;

        setCustomers((prev) => [...prev, data]);
        showToast('Customer added.');
      }

      closeModal();
    } catch (err) {
      console.error('Error saving customer:', err);
      showToast(err?.message || 'Failed to save customer.', 'error');
    }
  };

  const EmptyState = () => (
    <div className="empty-state">
      <div className="empty-state-icon">
        <Building2 size={22} />
      </div>
      <h3>No customers yet</h3>
      <p>Add your first customer to start tracking opportunities and delivery work.</p>
      <button className="action-button primary" onClick={openAddCustomerModal}>
        <UserPlus size={12} className="button-icon" />
        New Customer
      </button>
    </div>
  );

  if (loading) {
    return (
      <div className="projects-container">
        <div className="loading-container">
          <div className="loading-spinner" />
          <div className="loading-text">Loading customers…</div>
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
    <div className={`projects-container ${embedded ? 'is-embedded' : ''}`}>
      {toast && (
        <div className={`toast ${toast.type === 'error' ? 'toast-error' : ''}`}>
          {toast.type === 'error' ? <AlertTriangle size={16} /> : <Check size={16} />}
          {toast.message}
        </div>
      )}

      <div className="projects-inner">
        <header className="projects-header sticky">
          <div className="header-title-section">
            <h2>Customers</h2>
            <p className="header-subtitle">
              {filteredCustomers.length} shown • {customers.length} total
            </p>
          </div>

          <div className="header-actions">
            <button className="action-button primary" onClick={openAddCustomerModal}>
              <UserPlus size={12} className="button-icon" />
              New Customer
            </button>
          </div>
        </header>

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

            <div className="filters-grid">
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
                  <option key={a.id} value={a.name}>
                    {a.name}
                  </option>
                ))}
              </select>

              <select
                className="filter-select"
                value={filters.customer_type}
                onChange={(e) => setFilters((p) => ({ ...p, customer_type: e.target.value }))}
              >
                <option value="">All Types</option>
                <option value="New">New</option>
                <option value="Existing">Existing</option>
                <option value="Internal Initiative">Internal Initiative</option>
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

              <select
                className="filter-select"
                value={filters.is_inactive}
                onChange={(e) => setFilters((p) => ({ ...p, is_inactive: e.target.value }))}
              >
                <option value="">All (Active + Inactive)</option>
                <option value="active">Active only</option>
                <option value="inactive">Inactive only</option>
              </select>
            </div>
          </div>

          {hasActiveFilters && (
            <div className="filters-footer">
              <button className="action-button secondary" onClick={clearFilters}>
                <X size={12} className="button-icon" />
                Clear
              </button>
            </div>
          )}
        </section>

        <section className="list-section">
          {filteredCustomers.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="customers-list">
              {filteredCustomers.map((customer) => {
                const statusObj = getCustomerStatus(customer);
                const statusLabel = statusObj?.label || 'Not Set';
                const statusClass = getStatusBadgeClass(statusObj?.code || statusObj?.label);

                const isInactive = !!customer.is_inactive;

                return (
                  <div key={customer.id} className={`customer-card ${isInactive ? 'inactive' : ''}`}>
                    <div className="customer-card-main">
                      <button
                        className="customer-name"
                        onClick={() => openCustomer(customer)}
                        title="Open customer"
                      >
                        {customer.customer_name}
                      </button>

                      <div className="customer-meta">
                        <span className="meta-pill">{customer.country || '—'}</span>
                        <span className="meta-pill">{customer.account_manager || '—'}</span>
                        <span className="meta-pill">{customer.customer_type || '—'}</span>
                      </div>
                    </div>

                    <div className="customer-card-right">
                      <div className="customer-badges">
                        {isInactive ? <span className="status-badge status-hold">Inactive</span> : null}
                        <span className={statusClass}>{statusLabel}</span>
                      </div>

                      <div className="actions-wrap">
                        <button className="icon-btn" onClick={() => openEditCustomerModal(customer)} title="Edit">
                          <Edit3 size={14} />
                        </button>
                        <button className="icon-btn danger" onClick={() => deleteCustomer(customer)} title="Archive">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {showCustomerModal && (
          <Modal onClose={closeModal}>
            <div className="modal-header">
              <h3>{editingCustomer ? 'Edit Customer' : 'New Customer'}</h3>
              <button className="icon-btn" onClick={closeModal}>
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              <div className="modal-grid">
                <div className="form-field">
                  <label>Customer Name *</label>
                  <input
                    value={formCustomer.customer_name}
                    onChange={(e) => setFormCustomer((p) => ({ ...p, customer_name: e.target.value }))}
                    placeholder="e.g., Metrobank"
                  />
                </div>

                <div className="form-field">
                  <label>Country</label>
                  <select
                    value={formCustomer.country || ''}
                    onChange={(e) => setFormCustomer((p) => ({ ...p, country: e.target.value }))}
                  >
                    <option value="">Select country</option>
                    {countries.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label>Account Manager</label>
                  <select
                    value={formCustomer.account_manager || ''}
                    onChange={(e) => setFormCustomer((p) => ({ ...p, account_manager: e.target.value }))}
                  >
                    <option value="">Select account manager</option>
                    {accountManagers.map((a) => (
                      <option key={a.id} value={a.name}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label>Customer Type</label>
                  <select
                    value={formCustomer.customer_type || 'New'}
                    onChange={(e) => setFormCustomer((p) => ({ ...p, customer_type: e.target.value }))}
                  >
                    <option value="New">New</option>
                    <option value="Existing">Existing</option>
                    <option value="Internal Initiative">Internal Initiative</option>
                  </select>
                </div>

                <div className="form-field">
                  <label>Status</label>
                  <select
                    value={formCustomer.status_id}
                    onChange={(e) => setFormCustomer((p) => ({ ...p, status_id: e.target.value }))}
                  >
                    <option value="">Not Set</option>
                    {customerStatuses.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field full">
                  <label>Notes</label>
                  <textarea
                    value={formCustomer.notes}
                    onChange={(e) => setFormCustomer((p) => ({ ...p, notes: e.target.value }))}
                    placeholder="Short notes only (optional)"
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="action-button secondary" onClick={closeModal}>
                Cancel
              </button>
              <button className="action-button primary" onClick={handleSaveCustomer}>
                <Check size={12} className="button-icon" />
                Save
              </button>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}

export default Projects;
