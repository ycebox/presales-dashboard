import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom';
import './Projects.css';
import { supabase } from './supabaseClient';
import {
  Search,
  Filter,
  Download,
  Eye,
  EyeOff,
  X,
  Check,
  AlertTriangle,
  Building2,
  Globe,
  User,
  Briefcase,
  TrendingUp,
  Clock,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Edit,
  Trash2,
  Save,
  Plus,
  Archive
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Helper functions
const formatCurrency = (value) => {
  if (!value) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(value);
};

const formatDate = (dateString) => {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '—';
  }
};

const getHealthLabel = (score) => {
  if (score === null || score === undefined) return { label: 'Not scored', className: 'health-none' };
  if (score >= 8) return { label: 'Strong', className: 'health-strong' };
  if (score >= 6) return { label: 'Healthy', className: 'health-healthy' };
  if (score >= 4) return { label: 'At Risk', className: 'health-risk' };
  return { label: 'Critical', className: 'health-critical' };
};

const getStatusClassName = (statusText) => {
  if (!statusText) return '';
  const s = String(statusText).toLowerCase();
  if (s.includes('new')) return 'new';
  if (s.includes('active')) return 'active';
  if (s.includes('watch') || s.includes('attention')) return 'attention';
  if (s.includes('paused') || s.includes('hold')) return 'paused';
  if (s.includes('archived')) return 'archived';
  if (s.includes('internal')) return 'internal-initiative';
  return '';
};

// Compact Modal component for adding/editing customers
const CustomerModal = ({ isOpen, onClose, onSave, customer = null, statusOptions = [] }) => {
  const [formData, setFormData] = useState({
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

  useEffect(() => {
    if (customer) {
      setFormData({
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
    } else {
      setFormData({
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
    }
  }, [customer, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'health_score') {
      setFormData((prev) => ({
        ...prev,
        [name]: value === '' ? '' : Math.min(10, Math.max(0, parseFloat(value) || 0))
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleArrayInput = (field, value) => {
    const items = value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    setFormData((prev) => ({
      ...prev,
      [field]: items
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.customer_name.trim()) {
      alert('Customer name is required');
      return;
    }
    onSave(formData);
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="modal-backdrop-compact" onClick={onClose}>
      <div className="modal-content-compact" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header-compact">
          <h3>{customer ? 'Edit Customer' : 'Add Customer'}</h3>
          <button className="modal-close-button-compact" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form-compact">
          <div className="form-row-compact">
            <div className="form-group-compact">
              <label>Customer Name *</label>
              <input
                type="text"
                name="customer_name"
                value={formData.customer_name}
                onChange={handleChange}
                placeholder="e.g. Metrobank"
                required
              />
            </div>

            <div className="form-group-compact">
              <label>Status</label>
              <select name="status_id" value={formData.status_id} onChange={handleChange}>
                <option value="">Select status</option>
                {statusOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.status_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row-compact">
            <div className="form-group-compact">
              <label>Account Manager</label>
              <input
                type="text"
                name="account_manager"
                value={formData.account_manager}
                onChange={handleChange}
                placeholder="e.g. Joyce"
              />
            </div>

            <div className="form-group-compact">
              <label>Country</label>
              <input type="text" name="country" value={formData.country} onChange={handleChange} placeholder="e.g. Singapore" />
            </div>
          </div>

          <div className="form-row-compact">
            <div className="form-group-compact">
              <label>Customer Type</label>
              <select name="customer_type" value={formData.customer_type} onChange={handleChange}>
                <option value="New">New</option>
                <option value="Existing">Existing</option>
                <option value="Internal Initiative">Internal Initiative</option>
              </select>
            </div>

            <div className="form-group-compact">
              <label>Health Score (0-10)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="10"
                name="health_score"
                value={formData.health_score}
                onChange={handleChange}
                placeholder="e.g. 7.5"
              />
            </div>
          </div>

          <div className="form-row-compact">
            <div className="form-group-compact">
              <label>Technical Complexity</label>
              <select name="technical_complexity" value={formData.technical_complexity} onChange={handleChange}>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>

            <div className="form-group-compact">
              <label>Relationship Strength</label>
              <select name="relationship_strength" value={formData.relationship_strength} onChange={handleChange}>
                <option value="Weak">Weak</option>
                <option value="Medium">Medium</option>
                <option value="Strong">Strong</option>
              </select>
            </div>
          </div>

          <div className="form-group-compact full-width">
            <label>Key Stakeholders (comma separated)</label>
            <input
              type="text"
              value={formData.key_stakeholders.join(', ')}
              onChange={(e) => handleArrayInput('key_stakeholders', e.target.value)}
              placeholder="e.g. CIO, Head of Cards"
            />
          </div>

          <div className="form-group-compact full-width">
            <label>Competitors (comma separated)</label>
            <input
              type="text"
              value={formData.competitors.join(', ')}
              onChange={(e) => handleArrayInput('competitors', e.target.value)}
              placeholder="e.g. TSYS, FIS, Mastercard"
            />
          </div>

          <div className="form-group-compact full-width">
            <label>Notes</label>
            <textarea
              rows="3"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Key context, what to watch, actions, relationships..."
            />
          </div>

          <div className="modal-actions-compact">
            <button type="button" className="button-cancel-compact" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="button-submit-compact">
              <Save size={16} />
              {customer ? 'Save' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

const Projects = () => {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [customerStatuses, setCustomerStatuses] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    country: '',
    account_manager: '',
    customer_type: '',
    status_id: '' // status filter
  });

  const [selectedCustomerIds, setSelectedCustomerIds] = useState([]);
  const [expandedCustomer, setExpandedCustomer] = useState(null);

  const [toast, setToast] = useState(null);

  // Customer modal state
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

  // Load customers + statuses + projects
  useEffect(() => {
    const loadAll = async () => {
      try {
        setLoading(true);

        const [{ data: statusData, error: statusErr }, { data: customerData, error: custErr }, { data: projectData, error: projErr }] =
          await Promise.all([
            supabase.from('customer_statuses').select('*').order('id', { ascending: true }),
            supabase
              .from('customers')
              .select('*')
              .eq('is_archived', false)
              .order('customer_name', { ascending: true }),
            supabase.from('projects').select('*').order('created_at', { ascending: false })
          ]);

        if (statusErr) throw statusErr;
        if (custErr) throw custErr;
        if (projErr) throw projErr;

        setCustomerStatuses(statusData || []);
        setCustomers(customerData || []);
        setProjects(projectData || []);
      } catch (err) {
        console.error('Error loading customers/projects:', err);
        showToast('Failed to load customers/projects', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadAll();
  }, []);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2600);
  }, []);

  const statusIdToName = useMemo(() => {
    const map = new Map();
    customerStatuses.forEach((s) => map.set(s.id, s.status_name));
    return map;
  }, [customerStatuses]);

  // Filtered + searched customers
  const filteredCustomers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return customers.filter((c) => {
      const matchesTerm =
        !term ||
        (c.customer_name || '').toLowerCase().includes(term) ||
        (c.account_manager || '').toLowerCase().includes(term) ||
        (c.country || '').toLowerCase().includes(term);

      const matchesCountry = !filters.country || c.country === filters.country;
      const matchesAM = !filters.account_manager || c.account_manager === filters.account_manager;
      const matchesType = !filters.customer_type || c.customer_type === filters.customer_type;
      const matchesStatus = !filters.status_id || String(c.status_id || '') === String(filters.status_id);

      return matchesTerm && matchesCountry && matchesAM && matchesType && matchesStatus;
    });
  }, [customers, searchTerm, filters]);

  // Portfolio stats (simple)
  const portfolioStats = useMemo(() => {
    if (!customers.length) return null;

    const countries = new Set(customers.map((c) => c.country).filter(Boolean));
    const managers = new Set(customers.map((c) => c.account_manager).filter(Boolean));

    const avgHealth = customers
      .map((c) => c.health_score)
      .filter((x) => x !== null && x !== undefined && x !== '')
      .map((x) => Number(x))
      .filter((x) => !Number.isNaN(x));

    const avg = avgHealth.length ? avgHealth.reduce((a, b) => a + b, 0) / avgHealth.length : null;

    return {
      totalCustomers: customers.length,
      countries: countries.size,
      managers: managers.size,
      avgHealth: avg
    };
  }, [customers]);

  // Projects grouped by customer_name
  const projectsByCustomer = useMemo(() => {
    const map = new Map();
    projects.forEach((p) => {
      const key = p.customer_name || '';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(p);
    });
    return map;
  }, [projects]);

  // Helpers for filter dropdown values
  const countryOptions = useMemo(() => {
    return Array.from(new Set(customers.map((c) => c.country).filter(Boolean))).sort();
  }, [customers]);

  const managerOptions = useMemo(() => {
    return Array.from(new Set(customers.map((c) => c.account_manager).filter(Boolean))).sort();
  }, [customers]);

  const customerTypeOptions = ['New', 'Existing', 'Internal Initiative'];

  const activeFilterCount = useMemo(() => {
    return Object.values(filters).filter(Boolean).length;
  }, [filters]);

  const resetFilters = () => {
    setFilters({ country: '', account_manager: '', customer_type: '', status_id: '' });
  };

  const toggleCustomerExpand = (customerId) => {
    setExpandedCustomer((prev) => (prev === customerId ? null : customerId));
  };

  const toggleSelectCustomer = (customerId) => {
    setSelectedCustomerIds((prev) => (prev.includes(customerId) ? prev.filter((id) => id !== customerId) : [...prev, customerId]));
  };

  const clearSelection = () => setSelectedCustomerIds([]);

  const openAddCustomer = () => {
    setEditingCustomer(null);
    setShowCustomerModal(true);
  };

  const openEditCustomer = (customer) => {
    setEditingCustomer(customer);
    setShowCustomerModal(true);
  };

  const handleSaveCustomer = async (formData) => {
    try {
      const payload = {
        ...formData,
        health_score: formData.health_score === '' ? null : Number(formData.health_score),
        status_id: formData.status_id === '' ? null : Number(formData.status_id),
        is_archived: false
      };

      if (editingCustomer) {
        const { data, error } = await supabase.from('customers').update(payload).eq('id', editingCustomer.id).select('*').single();
        if (error) throw error;

        setCustomers((prev) => prev.map((c) => (c.id === editingCustomer.id ? data : c)));
        showToast('Customer updated');
      } else {
        const { data, error } = await supabase.from('customers').insert([payload]).select('*').single();
        if (error) throw error;

        setCustomers((prev) => [...prev, data].sort((a, b) => (a.customer_name || '').localeCompare(b.customer_name || '')));
        showToast('Customer added');
      }

      setShowCustomerModal(false);
      setEditingCustomer(null);
    } catch (err) {
      console.error('Save customer error:', err);
      showToast(`Save failed: ${err.message}`, 'error');
    }
  };

  const archiveSelectedCustomers = async () => {
    if (!selectedCustomerIds.length) return;
    const ok = window.confirm(`Archive ${selectedCustomerIds.length} selected customer(s)?`);
    if (!ok) return;

    try {
      const { error } = await supabase.from('customers').update({ is_archived: true }).in('id', selectedCustomerIds);
      if (error) throw error;

      setCustomers((prev) => prev.filter((c) => !selectedCustomerIds.includes(c.id)));
      clearSelection();
      showToast('Customers archived');
    } catch (err) {
      console.error('Archive error:', err);
      showToast(`Archive failed: ${err.message}`, 'error');
    }
  };

  const exportCustomers = () => {
    const rows = filteredCustomers.map((c) => ({
      customer_name: c.customer_name || '',
      account_manager: c.account_manager || '',
      country: c.country || '',
      customer_type: c.customer_type || '',
      status: statusIdToName.get(c.status_id) || '',
      health_score: c.health_score ?? ''
    }));

    const header = Object.keys(rows[0] || {});
    const csv =
      header.join(',') +
      '\n' +
      rows
        .map((r) =>
          header
            .map((k) => {
              const val = r[k] ?? '';
              const str = String(val).replace(/"/g, '""');
              return `"${str}"`;
            })
            .join(',')
        )
        .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customer_portfolio_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openCustomerDetails = (customerId) => {
    navigate(`/customer/${customerId}`);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <div className="loading-spinner" />
          <p className="loading-text">Loading Customer Portfolio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="projects-container theme-light">
      {/* Toast Notification */}
      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.type === 'success' ? <Check size={16} /> : <AlertTriangle size={16} />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <header className="projects-header">
        <div className="header-title-section">
          <h2>Customer Portfolio</h2>
          <p className="header-subtitle">
            {filteredCustomers.length} of {customers.length} customer{customers.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="header-actions">
          <button className="action-button primary" onClick={openAddCustomer}>
            <Plus size={16} />
            Add Customer
          </button>

          <button className="action-button secondary" onClick={exportCustomers} title="Export filtered customers">
            <Download size={16} />
            Export
          </button>

          <button className="action-button secondary" onClick={() => setShowFilters((s) => !s)}>
            <Filter size={16} />
            Filters
            {activeFilterCount > 0 && <span className="filter-count-badge">{activeFilterCount}</span>}
          </button>
        </div>
      </header>

      {/* Portfolio summary */}
      {portfolioStats && (
        <section className="portfolio-summary-section">
          <div className="portfolio-summary-grid">
            <div className="summary-card">
              <div className="summary-card-icon summary-card-icon-primary">
                <Building2 size={18} />
              </div>
              <div className="summary-card-content">
                <p className="summary-card-label">Total customers</p>
                <p className="summary-card-value">{portfolioStats.totalCustomers}</p>
              </div>
            </div>

            <div className="summary-card">
              <div className="summary-card-icon summary-card-icon-teal">
                <Globe size={18} />
              </div>
              <div className="summary-card-content">
                <p className="summary-card-label">Countries</p>
                <p className="summary-card-value">{portfolioStats.countries}</p>
              </div>
            </div>

            <div className="summary-card">
              <div className="summary-card-icon summary-card-icon-slate">
                <User size={18} />
              </div>
              <div className="summary-card-content">
                <p className="summary-card-label">Account managers</p>
                <p className="summary-card-value">{portfolioStats.managers}</p>
              </div>
            </div>

            <div className="summary-card">
              <div className="summary-card-icon summary-card-icon-amber">
                <TrendingUp size={18} />
              </div>
              <div className="summary-card-content">
                <p className="summary-card-label">Avg health score</p>
                <p className="summary-card-value">{portfolioStats.avgHealth === null ? '—' : portfolioStats.avgHealth.toFixed(1)}</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Filters Panel */}
      {showFilters && (
        <section className="filters-panel">
          <div className="filters-header">
            <h3>Filters</h3>
            <button className="filters-close-button" onClick={() => setShowFilters(false)}>
              <X size={16} />
            </button>
          </div>

          <div className="filters-grid">
            <div className="filter-group">
              <label>Search</label>
              <div className="search-input-wrapper">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search name, AM, country..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="filter-group">
              <label>Country</label>
              <select value={filters.country} onChange={(e) => setFilters((p) => ({ ...p, country: e.target.value }))}>
                <option value="">All</option>
                {countryOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Account Manager</label>
              <select value={filters.account_manager} onChange={(e) => setFilters((p) => ({ ...p, account_manager: e.target.value }))}>
                <option value="">All</option>
                {managerOptions.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Customer Type</label>
              <select value={filters.customer_type} onChange={(e) => setFilters((p) => ({ ...p, customer_type: e.target.value }))}>
                <option value="">All</option>
                {customerTypeOptions.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Status</label>
              <select value={filters.status_id} onChange={(e) => setFilters((p) => ({ ...p, status_id: e.target.value }))}>
                <option value="">All</option>
                {customerStatuses.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.status_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="filters-footer">
            <div className="active-filters">
              {Object.entries(filters)
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <span className="filter-chip" key={k}>
                    {k === 'status_id' ? `Status: ${statusIdToName.get(Number(v)) || v}` : `${k.replace('_', ' ')}: ${v}`}
                    <button
                      type="button"
                      onClick={() =>
                        setFilters((p) => ({
                          ...p,
                          [k]: ''
                        }))
                      }
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))}
            </div>

            <button className="action-button secondary" onClick={resetFilters}>
              Reset
            </button>
          </div>
        </section>
      )}

      {/* Bulk Actions */}
      {selectedCustomerIds.length > 0 && (
        <section className="bulk-actions">
          <div className="bulk-actions-left">
            <span className="bulk-count">{selectedCustomerIds.length} selected</span>
            <button className="bulk-action-button" onClick={clearSelection}>
              Clear
            </button>
          </div>

          <div className="bulk-actions-right">
            <button className="bulk-action-button danger" onClick={archiveSelectedCustomers}>
              <Archive size={16} />
              Archive
            </button>
          </div>
        </section>
      )}

      {/* Customers Table */}
      <section className="customers-table-section">
        <div className="customers-table-scroll">
          <table className="customers-table">
            <thead>
              <tr>
                <th className="checkbox-cell">
                  <input
                    type="checkbox"
                    checked={selectedCustomerIds.length > 0 && selectedCustomerIds.length === filteredCustomers.length}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedCustomerIds(filteredCustomers.map((c) => c.id));
                      else setSelectedCustomerIds([]);
                    }}
                  />
                </th>
                <th>Customer</th>
                <th>Account Manager</th>
                <th>Country</th>
                <th>Type</th>
                <th>Status</th>
                <th>Health</th>
                <th className="actions-cell">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredCustomers.map((c) => {
                const statusName = statusIdToName.get(c.status_id) || '';
                const statusCls = getStatusClassName(statusName);
                const health = getHealthLabel(c.health_score);
                const isExpanded = expandedCustomer === c.id;
                const custProjects = projectsByCustomer.get(c.customer_name) || [];

                return (
                  <React.Fragment key={c.id}>
                    <tr className="customer-row">
                      <td className="checkbox-cell">
                        <input type="checkbox" checked={selectedCustomerIds.includes(c.id)} onChange={() => toggleSelectCustomer(c.id)} />
                      </td>

                      <td className="customer-cell">
                        <div className="customer-info">
                          <button className="expand-button" onClick={() => toggleCustomerExpand(c.id)} aria-label="Expand customer">
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                          <div className="customer-main">
                            <button className="customer-name" onClick={() => openCustomerDetails(c.id)}>
                              {c.customer_name}
                            </button>
                            <div className="customer-email">{c.industry_vertical || '—'}</div>
                          </div>
                        </div>
                      </td>

                      <td className="manager-cell">
                        <span className="manager-icon">
                          <User size={14} />
                        </span>
                        {c.account_manager || '—'}
                      </td>

                      <td className="location-cell">
                        <span className="location-icon">
                          <Globe size={14} />
                        </span>
                        {c.country || '—'}
                      </td>

                      <td>
                        <span className="type-pill">
                          <Briefcase size={14} />
                          {c.customer_type || '—'}
                        </span>
                      </td>

                      <td className="status-cell">
                        {statusName ? <span className={`status-badge ${statusCls}`}>{statusName}</span> : '—'}
                      </td>

                      <td>
                        <span className={`health-badge ${health.className}`}>
                          <TrendingUp size={14} />
                          {c.health_score === null || c.health_score === undefined || c.health_score === '' ? '—' : Number(c.health_score).toFixed(1)}
                        </span>
                      </td>

                      <td className="actions-cell">
                        <button className="row-action-button" onClick={() => openEditCustomer(c)} title="Edit">
                          <Edit size={16} />
                        </button>
                        <button className="row-action-button" onClick={() => openCustomerDetails(c.id)} title="Open">
                          <ChevronRight size={16} />
                        </button>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr className="expanded-row">
                        <td colSpan={8}>
                          <div className="expanded-content">
                            <div className="expanded-grid">
                              <div className="expanded-card">
                                <div className="expanded-card-header">
                                  <h4>Snapshot</h4>
                                  <span className="expanded-subtitle">
                                    <Clock size={14} /> Updated {formatDate(c.updated_at)}
                                  </span>
                                </div>

                                <div className="expanded-card-body">
                                  <div className="kv-row">
                                    <span className="kv-label">Technical complexity</span>
                                    <span className="kv-value">{c.technical_complexity || '—'}</span>
                                  </div>
                                  <div className="kv-row">
                                    <span className="kv-label">Relationship strength</span>
                                    <span className="kv-value">{c.relationship_strength || '—'}</span>
                                  </div>
                                  <div className="kv-row">
                                    <span className="kv-label">Stakeholders</span>
                                    <span className="kv-value">{(c.key_stakeholders || []).length ? c.key_stakeholders.join(', ') : '—'}</span>
                                  </div>
                                  <div className="kv-row">
                                    <span className="kv-label">Competitors</span>
                                    <span className="kv-value">{(c.competitors || []).length ? c.competitors.join(', ') : '—'}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="expanded-card">
                                <div className="expanded-card-header">
                                  <h4>Projects</h4>
                                  <span className="expanded-subtitle">
                                    <Briefcase size={14} /> {custProjects.length} project{custProjects.length !== 1 ? 's' : ''}
                                  </span>
                                </div>

                                <div className="expanded-card-body">
                                  {custProjects.length ? (
                                    <div className="mini-projects-list">
                                      {custProjects.slice(0, 5).map((p) => (
                                        <div className="mini-project-row" key={p.id}>
                                          <div className="mini-project-left">
                                            <span className="mini-project-name">{p.project_name || 'Unnamed project'}</span>
                                            <span className="mini-project-meta">
                                              {p.sales_stage || '—'} • Due {formatDate(p.due_date)}
                                            </span>
                                          </div>
                                          <div className="mini-project-right">
                                            <span className="mini-deal">{formatCurrency(p.deal_value)}</span>
                                          </div>
                                        </div>
                                      ))}
                                      {custProjects.length > 5 && <div className="mini-project-more">+ {custProjects.length - 5} more…</div>}
                                    </div>
                                  ) : (
                                    <div className="empty-mini">
                                      <p>No projects found for this customer.</p>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="expanded-card full-width">
                                <div className="expanded-card-header">
                                  <h4>Notes</h4>
                                </div>
                                <div className="expanded-card-body">
                                  <p className="notes-text">{c.notes || '—'}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}

              {!filteredCustomers.length && (
                <tr>
                  <td colSpan={8}>
                    <div className="empty-state">
                      <div className="empty-state-icon">
                        <AlertTriangle size={22} />
                      </div>
                      <h3>No customers found</h3>
                      <p>Try adjusting your search or filters.</p>
                      <button className="empty-action-button" onClick={openAddCustomer}>
                        <Plus size={16} />
                        Add Customer
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Customer Modal */}
      <CustomerModal
        isOpen={showCustomerModal}
        onClose={() => {
          setShowCustomerModal(false);
          setEditingCustomer(null);
        }}
        onSave={handleSaveCustomer}
        customer={editingCustomer}
        statusOptions={customerStatuses}
      />
    </div>
  );
};

export default Projects;
