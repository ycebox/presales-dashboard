// src/Projects.js
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';
import {
  Trash2,
  UserPlus,
  Search,
  X,
  Edit3,
  AlertTriangle,
  Check
} from 'lucide-react';
import './Projects.css';

/**
 * Modal OUTSIDE Projects() so inputs won't lose focus on re-render.
 */
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

const emptyCustomerForm = {
  customer_name: '',
  country: '',
  account_manager: '',
  customer_type: 'New',
  status_id: ''
};

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
    status_id: '' // default set to Active after statuses load
  });

  const [toast, setToast] = useState(null);

  // modal states
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [customerForm, setCustomerForm] = useState(emptyCustomerForm);
  const [saving, setSaving] = useState(false);

  const showToastMsg = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3200);
  }, []);

  const loadData = useCallback(async () => {
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

      // Default status filter to Active (label or code contains "active")
      const active = statuses.find((s) => {
        const label = String(s.label || '').toLowerCase();
        const code = String(s.code || '').toLowerCase();
        return label.includes('active') || code.includes('active');
      });

      if (active?.id) {
        setFilters((p) => ({ ...p, status_id: String(active.id) }));
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load customers.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  const clearFilters = () => {
    setSearchTerm('');
    setFilters({ country: '', account_manager: '', status_id: '' });
  };

  const hasActiveFilters =
    !!searchTerm.trim() || !!filters.country || !!filters.account_manager || !!filters.status_id;

  // ===== MODAL HANDLERS =====
  const openAddModal = () => {
    setIsEditMode(false);
    setSelectedCustomerId(null);

    // default status in form = current filter status OR blank
    setCustomerForm((prev) => ({
      ...emptyCustomerForm,
      status_id: filters.status_id || ''
    }));

    setShowCustomerModal(true);
  };

  const openEditModal = (customer) => {
    setIsEditMode(true);
    setSelectedCustomerId(customer.id);

    setCustomerForm({
      customer_name: customer.customer_name || '',
      country: customer.country || '',
      account_manager: customer.account_manager || '',
      customer_type: customer.customer_type || 'New',
      status_id: customer.status_id ? String(customer.status_id) : ''
    });

    setShowCustomerModal(true);
  };

  const closeModal = () => {
    if (saving) return;
    setShowCustomerModal(false);
  };

  const validateCustomerForm = () => {
    if (!customerForm.customer_name.trim()) return 'Customer name is required.';
    if (!customerForm.country) return 'Country is required.';
    if (!customerForm.account_manager) return 'Account manager is required.';
    if (!customerForm.status_id) return 'Status is required.';
    return null;
  };

  const saveCustomer = async () => {
    const msg = validateCustomerForm();
    if (msg) {
      showToastMsg(msg, 'error');
      return;
    }

    setSaving(true);
    try {
      if (isEditMode && selectedCustomerId) {
        // UPDATE
        const { error: updErr } = await supabase
          .from('customers')
          .update({
            customer_name: customerForm.customer_name.trim(),
            country: customerForm.country,
            account_manager: customerForm.account_manager,
            customer_type: customerForm.customer_type,
            status_id: customerForm.status_id
          })
          .eq('id', selectedCustomerId);

        if (updErr) throw updErr;

        setCustomers((prev) =>
          prev.map((c) =>
            c.id === selectedCustomerId
              ? {
                  ...c,
                  customer_name: customerForm.customer_name.trim(),
                  country: customerForm.country,
                  account_manager: customerForm.account_manager,
                  customer_type: customerForm.customer_type,
                  status_id: customerForm.status_id
                }
              : c
          )
        );

        showToastMsg('Customer updated');
      } else {
        // INSERT
        const { data, error: insErr } = await supabase
          .from('customers')
          .insert([
            {
              customer_name: customerForm.customer_name.trim(),
              country: customerForm.country,
              account_manager: customerForm.account_manager,
              customer_type: customerForm.customer_type,
              status_id: customerForm.status_id,
              is_archived: false
            }
          ])
          .select()
          .single();

        if (insErr) throw insErr;

        setCustomers((prev) => {
          const next = [data, ...prev];
          next.sort((a, b) =>
            String(a.customer_name || '').localeCompare(String(b.customer_name || ''))
          );
          return next;
        });

        showToastMsg('Customer added');
      }

      setShowCustomerModal(false);
    } catch (e) {
      console.error(e);
      showToastMsg('Save failed. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ===== DELETE (ARCHIVE) =====
  const deleteCustomer = async (customer) => {
    if (!window.confirm(`Archive customer "${customer.customer_name}"?`)) return;

    try {
      const { error: delErr } = await supabase
        .from('customers')
        .update({ is_archived: true })
        .eq('id', customer.id);

      if (delErr) throw delErr;

      setCustomers((prev) => prev.filter((c) => c.id !== customer.id));
      showToastMsg('Customer archived');
    } catch (e) {
      console.error(e);
      showToastMsg('Archive failed. Please try again.', 'error');
    }
  };

  // ===== RENDER STATES =====
  if (loading) {
    return (
      <div className="projects-container">
        <div className="loading-container">Loading customer portfolio…</div>
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
            <button className="action-button primary" onClick={openAddModal}>
              <UserPlus size={12} className="button-icon" />
              Add Customer
            </button>
          </div>
        </header>

        <section className="filters-section">
          <div className="filters-row">
            <div className="search-wrapper">
              <Search size={14} />
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

            <div className="filters-grid-3">
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

        <section className="table-section">
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
                        <button className="icon-btn" title="Edit" onClick={() => openEditModal(c)}>
                          <Edit3 size={14} />
                        </button>
                        <button
                          className="icon-btn danger"
                          title="Archive"
                          onClick={() => deleteCustomer(c)}
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
        </section>

        {showCustomerModal && (
          <Modal onClose={closeModal}>
            <div className="modal-header">
              <h3>{isEditMode ? 'Edit Customer' : 'Add Customer'}</h3>
              <button className="icon-btn" onClick={closeModal} title="Close">
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              <div className="modal-grid">
                <div className="form-field">
                  <label>Customer Name</label>
                  <input
                    value={customerForm.customer_name}
                    onChange={(e) =>
                      setCustomerForm((p) => ({ ...p, customer_name: e.target.value }))
                    }
                    placeholder="e.g., Metrobank"
                  />
                </div>

                <div className="form-field">
                  <label>Country</label>
                  <select
                    value={customerForm.country}
                    onChange={(e) => setCustomerForm((p) => ({ ...p, country: e.target.value }))}
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
                    value={customerForm.account_manager}
                    onChange={(e) =>
                      setCustomerForm((p) => ({ ...p, account_manager: e.target.value }))
                    }
                  >
                    <option value="">Select account manager</option>
                    {accountManagers.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label>Customer Type</label>
                  <select
                    value={customerForm.customer_type}
                    onChange={(e) =>
                      setCustomerForm((p) => ({ ...p, customer_type: e.target.value }))
                    }
                  >
                    <option value="New">New</option>
                    <option value="Existing">Existing</option>
                  </select>
                </div>

                <div className="form-field full">
                  <label>Status</label>
                  <select
                    value={customerForm.status_id}
                    onChange={(e) => setCustomerForm((p) => ({ ...p, status_id: e.target.value }))}
                  >
                    <option value="">Select status</option>
                    {customerStatuses.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="action-button secondary" onClick={closeModal} disabled={saving}>
                Cancel
              </button>
              <button className="action-button primary" onClick={saveCustomer} disabled={saving}>
                <Check size={14} />
                {saving ? 'Saving…' : isEditMode ? 'Save Changes' : 'Add Customer'}
              </button>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}

export default Projects;
