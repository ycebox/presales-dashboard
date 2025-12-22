// src/Projects.js
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Trash2,
  User,
  UserPlus,
  Globe,
  Search,
  X,
  Edit3,
  Check,
  AlertTriangle,
  Briefcase
} from 'lucide-react';
import './Projects.css';

function Projects({ embedded = false }) {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [customerStatuses, setCustomerStatuses] = useState([]);

  // ✅ master data from tables
  const [countries, setCountries] = useState([]); // string[]
  const [accountManagers, setAccountManagers] = useState([]); // { id, name, email, region }[]

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    country: '',
    account_manager: '',
    customer_type: '',
    status_id: ''
  });

  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [toast, setToast] = useState(null);

  const [newCustomer, setNewCustomer] = useState({
    customer_name: '',
    account_manager: '',
    country: '',
    industry_vertical: '',
    customer_type: 'New',
    year_first_closed: '',
    company_size: '',
    annual_revenue: '',
    technical_complexity: 'Medium',
    relationship_strength: 'Medium',
    health_score: '',
    key_stakeholders: [],
    competitors: [],
    notes: '',
    status_id: ''
  });

  const [dealsSummary, setDealsSummary] = useState({
    activeCount: 0,
    byStage: {}
  });

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3200);
  }, []);

  // ✅ Load master data + customers
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // statuses
        const statusRes = await supabase
          .from('customer_statuses')
          .select('*')
          .order('id', { ascending: true });
        if (statusRes.error) throw statusRes.error;
        setCustomerStatuses(statusRes.data || []);

        // ✅ countries from table public.countries
        const countriesRes = await supabase
          .from('countries')
          .select('name')
          .order('name', { ascending: true });
        if (countriesRes.error) throw countriesRes.error;
        setCountries((countriesRes.data || []).map((c) => c.name));

        // ✅ account managers from table public.account_managers
        const amRes = await supabase
          .from('account_managers')
          .select('id, name, email, region')
          .order('name', { ascending: true });
        if (amRes.error) throw amRes.error;
        setAccountManagers(amRes.data || []);

        // customers
        const customersRes = await supabase
          .from('customers')
          .select('*')
          .eq('is_archived', false)
          .order('customer_name', { ascending: true });
        if (customersRes.error) throw customersRes.error;
        setCustomers(customersRes.data || []);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load customers.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // deals summary
  useEffect(() => {
    const fetchDealsSummary = async () => {
      try {
        const { data, error } = await supabase.from('projects').select('id, sales_stage');

        if (error) {
          console.error('Error fetching projects for deals summary:', error);
          setDealsSummary({ activeCount: 0, byStage: {} });
          return;
        }

        if (!data || data.length === 0) {
          setDealsSummary({ activeCount: 0, byStage: {} });
          return;
        }

        const activeProjects = data.filter((p) => {
          const stage = String(p.sales_stage || '').trim().toLowerCase();
          if (!stage) return true;
          if (stage.startsWith('closed')) return false;
          if (stage === 'done') return false;
          if (stage.includes('completed')) return false;
          return true;
        });

        const byStage = {};
        activeProjects.forEach((p) => {
          const stage = String(p.sales_stage || 'Unspecified').trim() || 'Unspecified';
          byStage[stage] = (byStage[stage] || 0) + 1;
        });

        setDealsSummary({ activeCount: activeProjects.length, byStage });
      } catch (err) {
        console.error('Unexpected error in deals summary:', err);
        setDealsSummary({ activeCount: 0, byStage: {} });
      }
    };

    fetchDealsSummary();
  }, []);

  const kpiCounts = useMemo(() => {
    const byStage = dealsSummary?.byStage || {};
    const findCount = (label) => {
      const target = String(label || '').toLowerCase();
      const key = Object.keys(byStage).find((k) => String(k).toLowerCase() === target);
      return key ? Number(byStage[key] || 0) : 0;
    };

    return {
      lead: findCount('Lead'),
      opportunity: findCount('Opportunity'),
      proposal: findCount('Proposal'),
      contracting: findCount('Contracting')
    };
  }, [dealsSummary]);

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
    if (filters.customer_type) {
      list = list.filter((c) => String(c.customer_type || '') === String(filters.customer_type));
    }
    if (filters.status_id) {
      list = list.filter((c) => String(c.status_id || '') === String(filters.status_id));
    }

    return list;
  }, [customers, searchTerm, filters]);

  // For summary stats (based on actual customers, not master tables)
  const uniqueCountriesInPortfolio = useMemo(() => {
    const set = new Set();
    customers.forEach((c) => {
      if (c.country) set.add(c.country);
    });
    return Array.from(set).sort();
  }, [customers]);

  const uniqueAccountManagersInPortfolio = useMemo(() => {
    const set = new Set();
    customers.forEach((c) => {
      if (c.account_manager) set.add(c.account_manager);
    });
    return Array.from(set).sort();
  }, [customers]);

  const portfolioStats = useMemo(() => {
    if (!customers || customers.length === 0) return null;

    const typesCount = customers.reduce((acc, c) => {
      const t = c.customer_type || 'Unknown';
      acc[t] = (acc[t] || 0) + 1;
      return acc;
    }, {});

    return {
      totalCustomers: customers.length,
      uniqueCountries: uniqueCountriesInPortfolio.length,
      byType: typesCount
    };
  }, [customers, uniqueCountriesInPortfolio]);

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

  const openCustomer = (customer) => {
    if (!customer?.id) return;
    navigate(`/customer/${customer.id}`);
  };

  const deleteCustomer = async (customer) => {
    if (!customer?.id) return;

    const ok = window.confirm(`Archive customer "${customer.customer_name}"?`);
    if (!ok) return;

    try {
      const { error } = await supabase
        .from('customers')
        .update({ is_archived: true })
        .eq('id', customer.id);

      if (error) throw error;

      setCustomers((prev) => prev.filter((c) => c.id !== customer.id));
      showToast('Customer archived.');
    } catch (err) {
      console.error('Error archiving customer:', err);
      showToast('Failed to archive customer.', 'error');
    }
  };

  const handleSaveCustomer = async () => {
    try {
      const payload = {
        ...newCustomer,
        status_id: newCustomer.status_id ? Number(newCustomer.status_id) : null,
        health_score: newCustomer.health_score ? Number(newCustomer.health_score) : null
      };

      if (!payload.customer_name || !payload.customer_name.trim()) {
        showToast('Customer name is required.', 'error');
        return;
      }

      if (editingCustomer?.id) {
        const { error } = await supabase
          .from('customers')
          .update(payload)
          .eq('id', editingCustomer.id);
        if (error) throw error;

        setCustomers((prev) =>
          prev.map((c) => (c.id === editingCustomer.id ? { ...c, ...payload } : c))
        );

        showToast('Customer updated.');
      } else {
        const { data, error } = await supabase
          .from('customers')
          .insert([payload])
          .select('*')
          .single();
        if (error) throw error;

        setCustomers((prev) => {
          const next = [...prev, data];
          next.sort((a, b) =>
            String(a.customer_name || '').localeCompare(String(b.customer_name || ''))
          );
          return next;
        });

        showToast('Customer added.');
      }

      setShowCustomerModal(false);
      setEditingCustomer(null);
    } catch (err) {
      console.error('Error saving customer:', err);
      showToast('Failed to save customer.', 'error');
    }
  };

  const resetCustomerForm = () => {
    setNewCustomer({
      customer_name: '',
      account_manager: '',
      country: '',
      industry_vertical: '',
      customer_type: 'New',
      year_first_closed: '',
      company_size: '',
      annual_revenue: '',
      technical_complexity: 'Medium',
      relationship_strength: 'Medium',
      health_score: '',
      key_stakeholders: [],
      competitors: [],
      notes: '',
      status_id: ''
    });
  };

  const openAddCustomerModal = () => {
    setEditingCustomer(null);
    resetCustomerForm();
    setShowCustomerModal(true);
  };

  const openEditCustomerModal = (customer) => {
    setEditingCustomer(customer);

    setNewCustomer({
      customer_name: customer.customer_name || '',
      account_manager: customer.account_manager || '',
      country: customer.country || '',
      industry_vertical: customer.industry_vertical || '',
      customer_type: customer.customer_type || 'New',
      year_first_closed: customer.year_first_closed || '',
      company_size: customer.company_size || '',
      annual_revenue: customer.annual_revenue || '',
      technical_complexity: customer.technical_complexity || 'Medium',
      relationship_strength: customer.relationship_strength || 'Medium',
      health_score: customer.health_score ?? '',
      key_stakeholders: customer.key_stakeholders || [],
      competitors: customer.competitors || [],
      notes: customer.notes || '',
      status_id: customer.status_id ?? ''
    });

    setShowCustomerModal(true);
  };

  const clearFilters = () => {
    setFilters({
      country: '',
      account_manager: '',
      customer_type: '',
      status_id: ''
    });
    setSearchTerm('');
  };

  const hasActiveFilters = useMemo(() => {
    return (
      !!searchTerm.trim() ||
      !!filters.country ||
      !!filters.account_manager ||
      !!filters.customer_type ||
      !!filters.status_id
    );
  }, [searchTerm, filters]);

  const EmptyState = () => (
    <div className="empty-state">
      <div className="empty-state-icon">
        <Building2 size={22} />
      </div>
      <h3>No customers found</h3>
      <p>Try adjusting your search or filters, or add a new customer.</p>
      <button className="action-button primary" onClick={openAddCustomerModal}>
        <UserPlus size={12} className="button-icon" />
        Add Customer
      </button>
    </div>
  );

  const Modal = ({ children }) =>
    ReactDOM.createPortal(
      <div
        className="modal-overlay"
        onMouseDown={(e) => e.target === e.currentTarget && setShowCustomerModal(false)}
      >
        <div className="modal-content">{children}</div>
      </div>,
      document.body
    );

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
          {toast.type === 'error' ? <AlertTriangle size={16} /> : <Check size={16} />}
          {toast.message}
        </div>
      )}

      <div className="projects-inner">
        <header className="projects-header">
          <div className="header-title-section">
            <h2>Customer Portfolio</h2>
            <p className="header-subtitle">
              {filteredCustomers.length} of {customers.length} customer
              {customers.length !== 1 ? 's' : ''}
              {portfolioStats && (
                <>
                  {' • '}
                  {portfolioStats.uniqueCountries} countr
                  {portfolioStats.uniqueCountries === 1 ? 'y' : 'ies'}
                </>
              )}
            </p>
          </div>

          <div className="header-actions">
            <button className="action-button primary" onClick={openAddCustomerModal}>
              <UserPlus size={12} className="button-icon" />
              Add Customer
            </button>
          </div>
        </header>

        {!embedded && (
          <section className="portfolio-kpi-strip">
            <div className="portfolio-kpi-card">
              <div className="portfolio-kpi-label">Lead</div>
              <div className="portfolio-kpi-value">{kpiCounts.lead}</div>
            </div>
            <div className="portfolio-kpi-card">
              <div className="portfolio-kpi-label">Opportunity</div>
              <div className="portfolio-kpi-value">{kpiCounts.opportunity}</div>
            </div>
            <div className="portfolio-kpi-card">
              <div className="portfolio-kpi-label">Proposal</div>
              <div className="portfolio-kpi-value">{kpiCounts.proposal}</div>
            </div>
            <div className="portfolio-kpi-card">
              <div className="portfolio-kpi-label">Contracting</div>
              <div className="portfolio-kpi-value">{kpiCounts.contracting}</div>
            </div>
          </section>
        )}

        {!embedded && portfolioStats && (
          <section className="portfolio-summary-section">
            <div className="portfolio-summary-grid">
              <div className="summary-card">
                <div className="summary-card-icon summary-card-icon-primary">
                  <Building2 size={18} />
                </div>
                <div className="summary-card-content">
                  <div className="summary-card-label">Total Customers</div>
                  <div className="summary-card-value">{portfolioStats.totalCustomers}</div>
                </div>
              </div>

              <div className="summary-card">
                <div className="summary-card-icon summary-card-icon-secondary">
                  <Globe size={18} />
                </div>
                <div className="summary-card-content">
                  <div className="summary-card-label">Countries</div>
                  <div className="summary-card-value">{portfolioStats.uniqueCountries}</div>
                </div>
              </div>

              <div className="summary-card">
                <div className="summary-card-icon summary-card-icon-tertiary">
                  <User size={18} />
                </div>
                <div className="summary-card-content">
                  <div className="summary-card-label">Account Managers</div>
                  <div className="summary-card-value">{uniqueAccountManagersInPortfolio.length}</div>
                </div>
              </div>

              <div className="summary-card">
                <div className="summary-card-icon summary-card-icon-warning">
                  <Briefcase size={18} />
                </div>
                <div className="summary-card-content">
                  <div className="summary-card-label">Active Deals</div>
                  <div className="summary-card-value">{dealsSummary.activeCount}</div>
                  <div className="summary-card-sub">
                    {Object.keys(dealsSummary.byStage).length > 0
                      ? Object.entries(dealsSummary.byStage)
                          .slice(0, 2)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(' • ')
                      : '—'}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

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
              {/* ✅ countries table */}
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

              {/* ✅ account_managers table */}
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
          <div className="table-section-header">
            <div className="table-section-header-left">
              <h3 className="table-section-title">Customers</h3>
              <p className="table-section-sub">{filteredCustomers.length} shown</p>
            </div>

            <button className="action-button primary" onClick={openAddCustomerModal}>
              <UserPlus size={12} className="button-icon" />
              Add Customer
            </button>
          </div>

          <div className="table-wrapper">
            {filteredCustomers.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="customers-table-scroll">
                <table className="customers-table">
                  <thead>
                    <tr>
                      <th className="th-customer">Customer</th>
                      <th>Country</th>
                      <th>Account Manager</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th className="th-actions">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredCustomers.map((customer) => {
                      const statusObj = getCustomerStatus(customer);
                      const statusLabel = statusObj?.label || 'Not Set';
                      const statusClass = getStatusBadgeClass(statusObj?.code || statusObj?.label);

                      return (
                        <tr key={customer.id} className="table-row">
                          <td className="cell-customer">
                            <button
                              className="link-btn"
                              onClick={() => openCustomer(customer)}
                              title="Open customer"
                            >
                              {customer.customer_name}
                            </button>
                          </td>

                          <td className="td-center">{customer.country || '—'}</td>
                          <td className="td-center">{customer.account_manager || '—'}</td>
                          <td className="td-center">{customer.customer_type || '—'}</td>

                          <td className="td-center">
                            <span className={statusClass}>{statusLabel}</span>
                          </td>

                          <td className="cell-actions">
                            <div className="actions-wrap">
                              <button
                                className="icon-btn"
                                onClick={() => openEditCustomerModal(customer)}
                                title="Edit"
                              >
                                <Edit3 size={14} />
                              </button>
                              <button
                                className="icon-btn danger"
                                onClick={() => deleteCustomer(customer)}
                                title="Archive"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {showCustomerModal && (
          <Modal>
            <div className="modal-header">
              <h3>{editingCustomer ? 'Edit Customer' : 'Add Customer'}</h3>
              <button className="icon-btn" onClick={() => setShowCustomerModal(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              <div className="modal-grid">
                <div className="form-field">
                  <label>Customer Name *</label>
                  <input
                    value={newCustomer.customer_name}
                    onChange={(e) => setNewCustomer((p) => ({ ...p, customer_name: e.target.value }))}
                    placeholder="e.g., Metrobank"
                  />
                </div>

                {/* ✅ countries table */}
                <div className="form-field">
                  <label>Country</label>
                  <select
                    value={newCustomer.country || ''}
                    onChange={(e) => setNewCustomer((p) => ({ ...p, country: e.target.value }))}
                  >
                    <option value="">Select country</option>
                    {countries.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* ✅ account_managers table */}
                <div className="form-field">
                  <label>Account Manager</label>
                  <select
                    value={newCustomer.account_manager || ''}
                    onChange={(e) =>
                      setNewCustomer((p) => ({ ...p, account_manager: e.target.value }))
                    }
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
                    value={newCustomer.customer_type}
                    onChange={(e) => setNewCustomer((p) => ({ ...p, customer_type: e.target.value }))}
                  >
                    <option value="New">New</option>
                    <option value="Existing">Existing</option>
                    <option value="Internal Initiative">Internal Initiative</option>
                  </select>
                </div>

                <div className="form-field">
                  <label>Status</label>
                  <select
                    value={newCustomer.status_id}
                    onChange={(e) => setNewCustomer((p) => ({ ...p, status_id: e.target.value }))}
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
                    value={newCustomer.notes}
                    onChange={(e) => setNewCustomer((p) => ({ ...p, notes: e.target.value }))}
                    placeholder="Any useful context, stakeholders, next steps…"
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="action-button secondary" onClick={() => setShowCustomerModal(false)}>
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
