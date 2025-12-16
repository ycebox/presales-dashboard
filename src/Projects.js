import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Plus,
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

function Projects() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    country: '',
    account_manager: '',
    customer_type: '',
    status_id: '' // status filter
  });
  const [selectedCustomers, setSelectedCustomers] = useState(new Set());
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [toast, setToast] = useState(null);
  const [newCustomer, setNewCustomer] = useState({
    customer_name: '',
    account_manager: '',
    primary_presales: '',
    country: '',
    customer_type: 'Existing',
    notes: '',
    status_id: ''
  });

  // Customer status lookup
  const [statusOptions, setStatusOptions] = useState([]);
  const [loadingStatuses, setLoadingStatuses] = useState(false);

  // Presales resources lookup
  const [presalesOptions, setPresalesOptions] = useState([]);
  const [loadingPresales, setLoadingPresales] = useState(false);

  // Account managers lookup
  const [accountManagers, setAccountManagers] = useState([]);
  const [loadingAccountManagers, setLoadingAccountManagers] = useState(false);

  // Deals summary (Active Deals card)
  const [dealsSummary, setDealsSummary] = useState({
    activeCount: 0,
    byStage: {}
  });

  // Customer ↔ Deals rollup (for "Top Deals to Watch" alignment)
  const [customerDeals, setCustomerDeals] = useState({});
  const [loadingCustomerDeals, setLoadingCustomerDeals] = useState(false);
  const [showTopDeals, setShowTopDeals] = useState(false);

  // Static data arrays
  const asiaPacificCountries = useMemo(() => [
    "Australia", "Bangladesh", "Brunei", "Cambodia", "China", "Fiji", "India", "Indonesia",
    "Japan", "Laos", "Malaysia", "Myanmar", "Nepal", "New Zealand", "Pakistan",
    "Papua New Guinea", "Philippines", "Singapore", "Solomon Islands", "South Korea",
    "Sri Lanka", "Thailand", "Timor-Leste", "Tonga", "Vanuatu", "Vietnam"
  ].sort(), []);

  useEffect(() => {
    fetchCustomers();
  }, []);

  // Load customer statuses for dropdown + status column
  useEffect(() => {
    const fetchStatuses = async () => {
      try {
        setLoadingStatuses(true);
        const { data, error } = await supabase
          .from('customer_statuses')
          .select('id, code, label')
          .order('id', { ascending: true });

        if (error) {
          console.error('Error fetching customer_statuses:', error);
          setStatusOptions([]);
        } else {
          setStatusOptions(data || []);
        }
      } catch (err) {
        console.error('Unexpected error fetching customer_statuses:', err);
        setStatusOptions([]);
      } finally {
        setLoadingStatuses(false);
      }
    };

    fetchStatuses();
  }, []);

  // Load presales resources for dropdown
  useEffect(() => {
    const fetchPresales = async () => {
      try {
        setLoadingPresales(true);
        const { data, error } = await supabase
          .from('presales_resources')
          .select('id, name, region, role, email')
          .order('name', { ascending: true });

        if (error) {
          console.error('Error fetching presales_resources:', error);
          setPresalesOptions([]);
        } else {
          setPresalesOptions(data || []);
        }
      } catch (err) {
        console.error('Unexpected error fetching presales_resources:', err);
        setPresalesOptions([]);
      } finally {
        setLoadingPresales(false);
      }
    };

    fetchPresales();
  }, []);

  // Load account managers for dropdown
  useEffect(() => {
    const fetchAccountManagers = async () => {
      try {
        setLoadingAccountManagers(true);
        const { data, error } = await supabase
          .from('account_managers')
          .select('id, name, email, region')
          .order('name', { ascending: true });

        if (error) {
          console.error('Error fetching account_managers:', error);
          setAccountManagers([]);
        } else {
          setAccountManagers(data || []);
        }
      } catch (err) {
        console.error('Unexpected error fetching account_managers:', err);
        setAccountManagers([]);
      } finally {
        setLoadingAccountManagers(false);
      }
    };

    fetchAccountManagers();
  }, []);

  // Load deals summary for Active Deals card
  useEffect(() => {
    const fetchDealsSummary = async () => {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('id, sales_stage');

        if (error) {
          console.error('Error fetching projects for deals summary:', error);
          setDealsSummary({ activeCount: 0, byStage: {} });
          return;
        }

        if (!data || data.length === 0) {
          setDealsSummary({ activeCount: 0, byStage: {} });
          return;
        }

        // Active = anything not starting with "Closed"
        const activeProjects = data.filter(p => {
          const stage = (p.sales_stage || '').toString().toLowerCase();
          return !stage.startsWith('closed');
        });

        const byStage = {};
        activeProjects.forEach(p => {
          const stage = p.sales_stage || 'Unspecified';
          byStage[stage] = (byStage[stage] || 0) + 1;
        });

        setDealsSummary({
          activeCount: activeProjects.length,
          byStage
        });
      } catch (err) {
        console.error('Unexpected error in deals summary:', err);
        setDealsSummary({ activeCount: 0, byStage: {} });
      }
    };

    fetchDealsSummary();
  }, []);

  // Helpers for deal signals (kept resilient to missing columns)
  const isDealActive = useCallback((stage) => {
    const s = (stage || '').toString().trim().toLowerCase();
    if (!s) return true; // treat unknown as active
    if (s.startsWith('closed')) return false;
    if (s === 'done' || s === 'won' || s === 'lost') return false;
    if (s.includes('closed')) return false;
    return true;
  }, []);

  const getStageRank = useCallback((stage) => {
    const s = (stage || '').toString().toLowerCase();
    // Adjust freely later — this is only for ordering/primary deal selection
    const rank = [
      { k: 'contract', r: 60 },
      { k: 'sow', r: 55 },
      { k: 'rfp', r: 50 },
      { k: 'proposal', r: 45 },
      { k: 'opportunity', r: 40 },
      { k: 'lead', r: 30 },
    ];
    for (const it of rank) {
      if (s.includes(it.k)) return it.r;
    }
    return 10; // unspecified / other
  }, []);

  const formatDealValue = useCallback((value) => {
    const num = Number(value);
    if (!Number.isFinite(num) || num === 0) return '';
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
      }).format(num);
    } catch {
      return `$${Math.round(num).toLocaleString()}`;
    }
  }, []);

  const computeAttention = useCallback((deal) => {
    // Prefer explicit risk flags if your projects table has them
    const overdue = Number(deal?.overdue_tasks_count || 0);
    const atRisk = Boolean(deal?.at_risk);
    const rank = getStageRank(deal?.sales_stage);

    if (overdue > 0 || atRisk) return 'red';
    if (rank >= 55) return 'red';     // Contracting / SoW
    if (rank >= 50) return 'amber';   // RFP
    if (rank >= 40) return 'amber';   // Opportunity / Proposal
    if (isDealActive(deal?.sales_stage)) return 'green';
    return 'none';
  }, [getStageRank, isDealActive]);

  const attentionLabel = useCallback((level) => {
    if (level === 'red') return 'High';
    if (level === 'amber') return 'Medium';
    if (level === 'green') return 'Low';
    return '—';
  }, []);

  const fetchCustomerDeals = useCallback(async () => {
    setLoadingCustomerDeals(true);
    try {
      // NOTE: keep select list defensive (columns may or may not exist in your schema)
      const { data, error } = await supabase
        .from('projects')
        .select('id, customer_id, customer_name, sales_stage, deal_value, updated_at, next_milestone, next_step, next_action, last_activity_at, overdue_tasks_count, at_risk')
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching projects for customer deals:', error);
        setCustomerDeals({});
        return;
      }

      const rows = data || [];

      // Group by customer_id when possible; fallback to customer_name (case-insensitive)
      const byCustomerId = {};
      const byCustomerName = {};

      rows.forEach((p) => {
        if (!isDealActive(p.sales_stage)) return;

        const cid = p.customer_id ? String(p.customer_id) : '';
        const cname = (p.customer_name || '').toString().trim().toLowerCase();

        if (cid) {
          if (!byCustomerId[cid]) byCustomerId[cid] = [];
          byCustomerId[cid].push(p);
        } else if (cname) {
          if (!byCustomerName[cname]) byCustomerName[cname] = [];
          byCustomerName[cname].push(p);
        }
      });

      const rollup = {};
      // Build rollup for known customers (so we can show — when none)
      customers.forEach((c) => {
        const cid = c.id ? String(c.id) : '';
        const cnameKey = (c.customer_name || '').toString().trim().toLowerCase();

        const deals =
          (cid && byCustomerId[cid]) ||
          (cnameKey && byCustomerName[cnameKey]) ||
          [];

        if (!deals.length) {
          rollup[cid || cnameKey] = { deals: [], primary: null, attention: 'none', nextMilestone: '' };
          return;
        }

        // Pick a primary deal (highest stage rank, then highest value, then most recently updated)
        const sorted = [...deals].sort((a, b) => {
          const sr = getStageRank(b.sales_stage) - getStageRank(a.sales_stage);
          if (sr !== 0) return sr;
          const vr = (Number(b.deal_value) || 0) - (Number(a.deal_value) || 0);
          if (vr !== 0) return vr;
          return new Date(b.updated_at || 0) - new Date(a.updated_at || 0);
        });

        const primary = sorted[0];
        const attention = computeAttention(primary);

        const nextMilestone =
          primary.next_milestone ||
          primary.next_step ||
          primary.next_action ||
          '';

        rollup[cid || cnameKey] = {
          deals: sorted,
          primary,
          attention,
          nextMilestone
        };
      });

      setCustomerDeals(rollup);
    } catch (err) {
      console.error('Unexpected error in fetchCustomerDeals:', err);
      setCustomerDeals({});
    } finally {
      setLoadingCustomerDeals(false);
    }
  }, [customers, computeAttention, getStageRank, isDealActive]);

  // Refresh deal rollup when customers list changes
  useEffect(() => {
    if (!customers || customers.length === 0) return;
    fetchCustomerDeals();
  }, [customers, fetchCustomerDeals]);

  // Default: show only Active customers once statuses are loaded
  useEffect(() => {
    if (!statusOptions || statusOptions.length === 0) return;

    setFilters(prev => {
      if (prev.status_id && prev.status_id !== '') return prev;

      const activeStatus = statusOptions.find(
        s =>
          (s.code && s.code.toUpperCase() === 'ACTIVE') ||
          (s.label && s.label.toLowerCase().includes('active'))
      );

      if (activeStatus) {
        return { ...prev, status_id: String(activeStatus.id) };
      }
      return { ...prev, status_id: '' };
    });
  }, [statusOptions]);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('customer_name', { ascending: true });

      if (error) {
        console.error('Error fetching customers:', error);
        setError('Failed to load customers');
        return;
      }

      setCustomers(data || []);
    } catch (err) {
      console.error('Unexpected error fetching customers:', err);
      setError('Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, []);

  // Map status from id
  const getCustomerStatus = useCallback(
    (customer) => {
      if (!customer || !customer.status_id || !statusOptions.length) return null;
      return statusOptions.find(s => s.id === customer.status_id) || null;
    },
    [statusOptions]
  );

  const getStatusBadgeClass = useCallback((statusCodeOrLabel) => {
    const value = (statusCodeOrLabel || '').toString().toLowerCase();
    if (!value) return 'status-badge status-unknown';

    if (value.includes('active')) return 'status-badge status-active';
    if (value.includes('prospect')) return 'status-badge status-prospect';
    if (value.includes('hold')) return 'status-badge status-onhold';
    if (value.includes('dormant')) return 'status-badge status-dormant';
    if (value.includes('inactive')) return 'status-badge status-inactive';

    return 'status-badge status-unknown';
  }, []);

  // Filter and search customers (includes status filter)
  // If "Top Deals to Watch" is enabled, we also filter down to customers that have an active deal needing attention.
  const filteredCustomers = useMemo(() => {
    const base = customers.filter(customer => {
      const matchesSearch = !searchTerm ||
        customer.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.account_manager?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.country?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesFilters = Object.entries(filters).every(([key, value]) => {
        if (!value) return true;

        if (key === 'status_id') {
          if (!customer.status_id) return false;
          return String(customer.status_id) === String(value);
        }

        return customer[key] === value;
      });

      return matchesSearch && matchesFilters;
    });

    if (!showTopDeals) return base;

    // Only customers with an active deal and at least Amber/Red attention
    const pickKey = (c) => (c.id ? String(c.id) : (c.customer_name || '').toString().trim().toLowerCase());
    const filtered = base.filter((c) => {
      const key = pickKey(c);
      const info = customerDeals?.[key];
      if (!info || !info.primary) return false;
      return info.attention === 'red' || info.attention === 'amber';
    });

    // Sort: Red first, then Amber; tie-breaker: stage rank / value / recency
    const attentionRank = { red: 2, amber: 1, green: 0, none: -1 };
    return filtered.sort((a, b) => {
      const ka = pickKey(a);
      const kb = pickKey(b);
      const ia = customerDeals?.[ka];
      const ib = customerDeals?.[kb];

      const ar = (attentionRank[ib?.attention] || 0) - (attentionRank[ia?.attention] || 0);
      if (ar !== 0) return ar;

      const sr = getStageRank(ib?.primary?.sales_stage) - getStageRank(ia?.primary?.sales_stage);
      if (sr !== 0) return sr;

      const vr = (Number(ib?.primary?.deal_value) || 0) - (Number(ia?.primary?.deal_value) || 0);
      if (vr !== 0) return vr;

      return new Date(ib?.primary?.updated_at || 0) - new Date(ia?.primary?.updated_at || 0);
    });
  }, [customers, searchTerm, filters, showTopDeals, customerDeals, getStageRank]);

  // Get unique filter options
  const filterOptions = useMemo(() => ({
    countries: [...new Set(customers.map(c => c.country).filter(Boolean))].sort(),
    managers: [...new Set(customers.map(c => c.account_manager).filter(Boolean))].sort(),
    types: [...new Set(customers.map(c => c.customer_type).filter(Boolean))].sort()
  }), [customers]);

  // Portfolio stats (simplified: no more average health)
  const portfolioStats = useMemo(() => {
    if (!customers || customers.length === 0) {
      return null;
    }

    const total = customers.length;
    const uniqueCountries = new Set(
      customers.map(c => c.country).filter(Boolean)
    ).size;

    let existingCount = 0;
    let newCount = 0;
    let internalCount = 0;

    customers.forEach(c => {
      if (c.customer_type === 'Existing') existingCount += 1;
      else if (c.customer_type === 'New') newCount += 1;
      else if (c.customer_type === 'Internal Initiative') internalCount += 1;
    });

    return {
      total,
      uniqueCountries,
      existingCount,
      newCount,
      internalCount
    };
  }, [customers]);

  // Active filters for chips (including status)
  const activeFilters = useMemo(() => {
    return Object.entries(filters)
      .filter(([_, value]) => value)
      .map(([key, value]) => {
        if (key === 'status_id') {
          const status = statusOptions.find(s => String(s.id) === String(value));
          return { key, value, label: `Status: ${status?.label || 'Unknown'}` };
        }
        return { key, value, label: `${key.replace('_', ' ')}: ${value}` };
      });
  }, [filters, statusOptions]);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const handleSearchChange = useCallback((e) => {
    setSearchTerm(e.target.value);
  }, []);

  const handleFilterChange = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const removeFilter = useCallback((key) => {
    setFilters(prev => ({ ...prev, [key]: '' }));
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters({ country: '', account_manager: '', customer_type: '', status_id: '' });
    setSearchTerm('');
  }, []);

  const handleCustomerSelect = useCallback((customerId) => {
    setSelectedCustomers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(customerId)) {
        newSet.delete(customerId);
      } else {
        newSet.add(customerId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedCustomers.size === filteredCustomers.length) {
      setSelectedCustomers(new Set());
    } else {
      setSelectedCustomers(new Set(filteredCustomers.map(c => c.id)));
    }
  }, [selectedCustomers.size, filteredCustomers]);

  const handleBulkDelete = useCallback(async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedCustomers.size} customer(s)? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .in('id', Array.from(selectedCustomers));

      if (error) throw error;

      await fetchCustomers();
      setSelectedCustomers(new Set());
      showToast(`Successfully deleted ${selectedCustomers.size} customer(s)`);
    } catch (err) {
      console.error('Error deleting customers:', err);
      showToast('Failed to delete customers', 'error');
    }
  }, [selectedCustomers, fetchCustomers, showToast]);

  const handleCustomerChange = useCallback((e) => {
    const { name, value, type } = e.target;

    setNewCustomer(prev => {
      if (type === 'number') {
        return { ...prev, [name]: parseFloat(value) || 0 };
      } else {
        return { ...prev, [name]: value };
      }
    });
  }, []);

  const handleCustomerTypeChange = useCallback((type) => {
    setNewCustomer(prev => ({ ...prev, customer_type: type }));
  }, []);

  const resetCustomerForm = useCallback(() => {
    setNewCustomer({
      customer_name: '',
      account_manager: '',
      primary_presales: '',
      country: '',
      customer_type: 'Existing',
      notes: '',
      status_id: ''
    });
    setEditingCustomer(null);
  }, []);

  // Add customer: default status = Active if none selected
  const handleAddCustomer = useCallback(async (e) => {
    e.preventDefault();

    try {
      const activeStatus = statusOptions.find(
        s =>
          (s.code && s.code.toUpperCase() === 'ACTIVE') ||
          (s.label && s.label.toLowerCase().includes('active'))
      );

      const statusId =
        newCustomer.status_id ||
        (activeStatus ? activeStatus.id : null);

      const payload = {
        ...newCustomer,
        status_id: statusId ? Number(statusId) : null
      };

      const { data, error } = await supabase
        .from('customers')
        .insert([payload])
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        await fetchCustomers();
        setShowCustomerModal(false);
        resetCustomerForm();
        showToast('Customer added successfully!');
      }
    } catch (err) {
      console.error('Error adding customer:', err);
      showToast('Failed to add customer', 'error');
    }
  }, [newCustomer, fetchCustomers, resetCustomerForm, showToast, statusOptions]);

  const handleUpdateCustomer = useCallback(async (e) => {
    e.preventDefault();

    try {
      const payload = {
        ...newCustomer,
        status_id: newCustomer.status_id ? Number(newCustomer.status_id) : null
      };

      const { error } = await supabase
        .from('customers')
        .update(payload)
        .eq('id', editingCustomer.id);

      if (error) throw error;

      await fetchCustomers();
      setShowCustomerModal(false);
      resetCustomerForm();
      showToast('Customer updated successfully!');
    } catch (err) {
      console.error('Error updating customer:', err);
      showToast('Failed to update customer', 'error');
    }
  }, [newCustomer, editingCustomer, fetchCustomers, resetCustomerForm, showToast]);

  const handleDeleteCustomer = useCallback(async (id) => {
    const customer = customers.find(c => c.id === id);
    if (!window.confirm(`Are you sure you want to delete "${customer?.customer_name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase.from('customers').delete().eq('id', id);
      if (error) throw error;

      await fetchCustomers();
      showToast('Customer deleted successfully!');
    } catch (err) {
      console.error('Error deleting customer:', err);
      showToast('Failed to delete customer', 'error');
    }
  }, [customers, fetchCustomers, showToast]);

  const handleEditCustomer = useCallback((customer) => {
    setEditingCustomer(customer);
    setNewCustomer({
      customer_name: customer.customer_name || '',
      account_manager: customer.account_manager || '',
      primary_presales: customer.primary_presales || '',
      country: customer.country || '',
      customer_type: customer.customer_type || 'Existing',
      notes: customer.notes || '',
      status_id: customer.status_id ? String(customer.status_id) : ''
    });
    setShowCustomerModal(true);
  }, []);

  const handleCustomerClick = useCallback((customerId) => {
    navigate(`/customer/${customerId}`);
  }, [navigate]);

  const handleModalClose = useCallback(() => {
    setShowCustomerModal(false);
    resetCustomerForm();
  }, [resetCustomerForm]);

  const Modal = useCallback(({ isOpen, onClose, children }) => {
    if (!isOpen) return null;

    return ReactDOM.createPortal(
      <div className="modal-backdrop-compact" onClick={onClose}>
        <div className="modal-content-compact" onClick={(e) => e.stopPropagation()}>
          {children}
        </div>
      </div>,
      document.body
    );
  }, []);

  const LoadingSkeleton = () => (
    <div className="loading-container">
      <div className="loading-content">
        <div className="loading-spinner"></div>
        <div className="loading-text">Loading customers...</div>
      </div>
    </div>
  );

  const EmptyState = () => (
    <div className="empty-state">
      <Building2 size={48} className="empty-icon" />
      <h3 className="empty-title">No customers found</h3>
      <p className="empty-description">
        {searchTerm || activeFilters.length > 0
          ? "No customers match your current search or filters. Try adjusting your criteria."
          : "Get started by adding your first customer to begin managing your portfolio."
        }
      </p>
      {(!searchTerm && activeFilters.length === 0) && (
        <button
          onClick={() => setShowCustomerModal(true)}
          className="empty-action-button"
        >
          <UserPlus size={16} />
          Add Your First Customer
        </button>
      )}
    </div>
  );

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="projects-container">
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
            {portfolioStats && (
              <>
                {' • '}
                {portfolioStats.uniqueCountries} countr{portfolioStats.uniqueCountries === 1 ? 'y' : 'ies'}
              </>
            )}
            {selectedCustomers.size > 0 && ` • ${selectedCustomers.size} selected`}
          </p>
        </div>

        <div className="header-actions">
          <button
            className={`action-button secondary ${showTopDeals ? 'active' : ''}`}
            onClick={() => setShowTopDeals(v => !v)}
            title="Show only customers with deals that need attention"
          >
            <Briefcase size={12} className="button-icon" />
            {showTopDeals ? 'Top Deals: On' : 'Top Deals: Off'}
            {loadingCustomerDeals && <span className="tiny-loading-dot" />}
          </button>

          <button
            className="action-button primary"
            onClick={() => setShowCustomerModal(true)}
          >
            <UserPlus size={12} className="button-icon" />
            Add Customer
          </button>
        </div>
      </header>

      {/* Bulk Actions */}
      <div className={`bulk-actions ${selectedCustomers.size === 0 ? 'hidden' : ''}`}>
        <div className="selected-count">
          {selectedCustomers.size} customer{selectedCustomers.size !== 1 ? 's' : ''} selected
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className="bulk-action-button danger"
            onClick={handleBulkDelete}
          >
            <Trash2 size={12} />
            Delete Selected
          </button>
          <button
            className="bulk-action-button"
            onClick={() => setSelectedCustomers(new Set())}
          >
            Clear Selection
          </button>
        </div>
      </div>

      {/* Portfolio summary (with Active Deals card) */}
      {portfolioStats && (
        <section className="portfolio-summary-section">
          <div className="portfolio-summary-grid">
            <div className="summary-card">
              <div className="summary-card-icon summary-card-icon-primary">
                <Building2 size={18} />
              </div>
              <div className="summary-card-content">
                <p className="summary-card-label">Total customers</p>
                <p className="summary-card-value">{portfolioStats.total}</p>
                <p className="summary-card-sub">
                  {portfolioStats.existingCount} existing · {portfolioStats.newCount} new
                </p>
              </div>
            </div>

            <div className="summary-card">
              <div className="summary-card-icon summary-card-icon-accent">
                <Globe size={18} />
              </div>
              <div className="summary-card-content">
                <p className="summary-card-label">Countries covered</p>
                <p className="summary-card-value">{portfolioStats.uniqueCountries}</p>
                <p className="summary-card-sub">APAC footprint overview</p>
              </div>
            </div>

            {/* Active Deals card */}
            <div className="summary-card">
              <div className="summary-card-icon summary-card-icon-deals">
                <Briefcase size={18} />
              </div>
              <div className="summary-card-content">
                <p className="summary-card-label">Active deals</p>
                <p className="summary-card-value">{dealsSummary.activeCount}</p>
                <p className="summary-card-sub">
                  {dealsSummary.activeCount > 0 ? (
                    <>
                      {(dealsSummary.byStage['RFP'] || 0)} RFP ·{' '}
                      {(dealsSummary.byStage['SoW'] || 0)} SoW ·{' '}
                      {(dealsSummary.byStage['Contracting'] || 0)} Contracting
                    </>
                  ) : (
                    'No active opportunities'
                  )}
                </p>
              </div>
            </div>

            <div className="summary-card">
              <div className="summary-card-icon summary-card-icon-neutral">
                <User size={18} />
              </div>
              <div className="summary-card-content">
                <p className="summary-card-label">Internal initiatives</p>
                <p className="summary-card-value">{portfolioStats.internalCount}</p>
                <p className="summary-card-sub">Non-client, internal work tracked</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Search and Filters */}
      <section className="search-filters-section">
        <div className="search-bar">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search customers, managers, or countries..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="search-input"
          />
        </div>

        <div className="filters-row">
          <div className="filter-group">
            <label className="filter-label">Country</label>
            <select
              value={filters.country}
              onChange={(e) => handleFilterChange('country', e.target.value)}
              className="filter-select"
            >
              <option value="">All Countries</option>
              {filterOptions.countries.map(country => (
                <option key={country} value={country}>{country}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">Account Manager</label>
            <select
              value={filters.account_manager}
              onChange={(e) => handleFilterChange('account_manager', e.target.value)}
              className="filter-select"
            >
              <option value="">All Managers</option>
              {filterOptions.managers.map(manager => (
                <option key={manager} value={manager}>{manager}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">Customer Type</label>
            <select
              value={filters.customer_type}
              onChange={(e) => handleFilterChange('customer_type', e.target.value)}
              className="filter-select"
            >
              <option value="">All Types</option>
              {filterOptions.types.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div className="filter-group">
            <label className="filter-label">Status</label>
            <select
              value={filters.status_id}
              onChange={(e) => handleFilterChange('status_id', e.target.value)}
              className="filter-select"
              disabled={loadingStatuses || !statusOptions.length}
            >
              <option value="">
                {loadingStatuses ? 'Loading…' : 'All Statuses'}
              </option>
              {statusOptions.map(status => (
                <option key={status.id} value={status.id}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Active Filters */}
        {activeFilters.length > 0 && (
          <div className="active-filters">
            {activeFilters.map(filter => (
              <div key={filter.key} className="filter-chip">
                <span>{filter.label}</span>
                <button
                  className="filter-chip-remove"
                  onClick={() => removeFilter(filter.key)}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            <button
              className="filter-chip"
              onClick={clearAllFilters}
              style={{ background: '#fee2e2', color: '#991b1b' }}
            >
              Clear All
            </button>
          </div>
        )}
      </section>

      {/* Customers Table */}
      <section className="table-section">
        <div className="table-wrapper">
          {filteredCustomers.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="customers-table-scroll">
              <table className="customers-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>
                      <input
                        type="checkbox"
                        className="table-checkbox"
                        checked={
                          selectedCustomers.size === filteredCustomers.length &&
                          filteredCustomers.length > 0
                        }
                        onChange={handleSelectAll}
                      />
                    </th>
                    <th>Customer</th>
                    <th>Location</th>
                    <th>Account Manager</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Active Deal</th>
                    <th style={{ width: '110px' }}>Attention</th>
                    <th>Next Milestone</th>
                    <th style={{ width: '80px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((customer) => {
                    const statusObj = getCustomerStatus(customer);
                    const statusLabel = statusObj?.label || 'Not Set';
                    const statusClass = getStatusBadgeClass(
                      statusObj?.code || statusObj?.label
                    );

                    return (
                      <tr
                        key={customer.id}
                        className={
                          selectedCustomers.has(customer.id) ? 'selected' : ''
                        }
                        onClick={() => handleCustomerClick(customer.id)}
                      >
                        <td>
                          <input
                            type="checkbox"
                            className="table-checkbox"
                            checked={selectedCustomers.has(customer.id)}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleCustomerSelect(customer.id);
                            }}
                          />
                        </td>
                        <td>
                          <div className="customer-cell">
                            <div className="customer-avatar">
                              {customer.customer_name
                                ?.charAt(0)
                                ?.toUpperCase() || 'C'}
                            </div>
                            <div className="customer-info">
                              <div className="customer-name">
                                {customer.customer_name}
                              </div>
                              <div className="customer-email">
                                {customer.customer_type === 'Internal Initiative'
                                  ? 'Internal'
                                  : 'External Client'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="location-cell">
                            <Globe size={14} className="location-icon" />
                            <span>{customer.country}</span>
                          </div>
                        </td>
                        <td>
                          <div className="manager-cell">
                            <User size={14} className="manager-icon" />
                            <span>{customer.account_manager}</span>
                          </div>
                        </td>
                        <td className="status-cell">
                          <span
                            className={`status-badge ${
                              customer.customer_type
                                ?.toLowerCase()
                                .replace(/\s+/g, '-') || 'new'
                            }`}
                          >
                            {customer.customer_type || 'New'}
                          </span>
                        </td>
                        <td className="status-cell">
                          <span className={statusClass}>
                            <span className="status-dot-pill" />
                            {statusLabel}
                          </span>
                        </td>

                        {/* Deal signal layer (aligns Customer Portfolio with Top Deals to Watch) */}
                        <td>
                          {(() => {
                            const key = customer.id ? String(customer.id) : (customer.customer_name || '').toString().trim().toLowerCase();
                            const info = customerDeals?.[key];
                            const primary = info?.primary;

                            if (!primary) return <span className="deal-empty">—</span>;

                            const stage = primary.sales_stage || 'Unspecified';
                            const value = formatDealValue(primary.deal_value);
                            const dealCount = info?.deals?.length || 0;

                            return (
                              <div className="deal-cell">
                                <span className="deal-stage">{stage}</span>
                                {value && <span className="deal-value">{value}</span>}
                                {dealCount > 1 && <span className="deal-count">+{dealCount - 1}</span>}
                              </div>
                            );
                          })()}
                        </td>

                        <td className="attention-cell">
                          {(() => {
                            const key = customer.id ? String(customer.id) : (customer.customer_name || '').toString().trim().toLowerCase();
                            const info = customerDeals?.[key];
                            const level = info?.attention || 'none';

                            return (
                              <span className={`attention-pill ${level}`}>
                                <span className="attention-dot" />
                                {attentionLabel(level)}
                              </span>
                            );
                          })()}
                        </td>

                        <td>
                          {(() => {
                            const key = customer.id ? String(customer.id) : (customer.customer_name || '').toString().trim().toLowerCase();
                            const info = customerDeals?.[key];
                            const milestone = (info?.nextMilestone || '').toString().trim();
                            return milestone ? (
                              <span className="milestone-text" title={milestone}>{milestone}</span>
                            ) : (
                              <span className="deal-empty">—</span>
                            );
                          })()}
                        </td>

                        <td className="actions-cell">
                          <div className="table-actions">
                            <button
                              className="table-action-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditCustomer(customer);
                              }}
                              title="Edit customer (including status)"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              className="table-action-btn delete"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCustomer(customer.id);
                              }}
                              title="Delete customer"
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

      {/* Customer Modal */}
      <Modal isOpen={showCustomerModal} onClose={handleModalClose}>
        <div className="modal-header-compact">
          <h3 className="modal-title-compact">
            <UserPlus size={20} className="title-icon-compact" />
            {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
          </h3>
          <button
            onClick={handleModalClose}
            className="modal-close-button-compact"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={editingCustomer ? handleUpdateCustomer : handleAddCustomer} className="modal-form-compact">
          <div className="quick-info-compact">
            <p className="quick-info-text-compact">
              Add essential customer details. Additional information can be updated later from the customer profile.
            </p>
          </div>

          <div className="form-section-compact">
            <h4 className="section-title-compact">
              <User size={14} className="section-icon-compact" />
              Basic Information
            </h4>

            <div className="form-grid-compact">
              <div className="form-row-compact">
                <div className="form-group-compact">
                  <label className="form-label-compact required">Customer Name</label>
                  <input
                    name="customer_name"
                    value={newCustomer.customer_name}
                    onChange={handleCustomerChange}
                    required
                    className="form-input-compact"
                    placeholder="Acme Corporation"
                    autoComplete="off"
                  />
                </div>

                <div className="form-group-compact">
                  <label className="form-label-compact required">Account Manager</label>
                  {accountManagers.length > 0 ? (
                    <select
                      name="account_manager"
                      value={newCustomer.account_manager}
                      onChange={handleCustomerChange}
                      className="form-select-compact"
                      required
                      disabled={loadingAccountManagers}
                    >
                      <option value="">
                        {loadingAccountManagers ? 'Loading…' : 'Select Account Manager'}
                      </option>
                      {accountManagers.map((m) => (
                        <option key={m.id} value={m.name}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      name="account_manager"
                      value={newCustomer.account_manager}
                      onChange={handleCustomerChange}
                      required
                      className="form-input-compact"
                      placeholder="John Smith"
                      autoComplete="off"
                    />
                  )}
                </div>
              </div>

              {/* Presales selection */}
              <div className="form-row-compact">
                <div className="form-group-compact">
                  <label className="form-label-compact">Primary Presales</label>
                  {presalesOptions.length > 0 ? (
                    <select
                      name="primary_presales"
                      value={newCustomer.primary_presales}
                      onChange={handleCustomerChange}
                      className="form-select-compact"
                      disabled={loadingPresales}
                    >
                      <option value="">
                        {loadingPresales ? 'Loading…' : 'Select Presales'}
                      </option>
                      {presalesOptions.map((p) => (
                        <option key={p.id} value={p.name}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      name="primary_presales"
                      value={newCustomer.primary_presales}
                      onChange={handleCustomerChange}
                      className="form-input-compact"
                      placeholder="Presales owner (name)"
                      autoComplete="off"
                    />
                  )}
                </div>

                <div className="form-group-compact">
                  <label className="form-label-compact required">Country</label>
                  <select
                    name="country"
                    value={newCustomer.country}
                    onChange={handleCustomerChange}
                    required
                    className="form-select-compact"
                  >
                    <option value="">Select Country</option>
                    {asiaPacificCountries.map(country => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="form-section-compact">
            <h4 className="section-title-compact">
              <Building2 size={14} className="section-icon-compact" />
              Customer Type & Status
            </h4>

            <div className="type-pills-compact" style={{ marginBottom: '0.75rem' }}>
              {['Existing', 'New', 'Internal Initiative'].map(type => (
                <button
                  key={type}
                  type="button"
                  className={`type-pill-compact ${newCustomer.customer_type === type ? 'active' : ''}`}
                  onClick={() => handleCustomerTypeChange(type)}
                >
                  {type === 'Internal Initiative' ? 'Internal' : type}
                </button>
              ))}
            </div>

            {/* Status dropdown (for both add & edit) */}
            <div className="form-group-compact">
              <label className="form-label-compact">Customer Status</label>
              <select
                name="status_id"
                value={newCustomer.status_id}
                onChange={handleCustomerChange}
                className="form-select-compact"
                disabled={loadingStatuses}
              >
                <option value="">
                  {loadingStatuses ? 'Loading statuses…' : 'Select Status (default Active)'}
                </option>
                {statusOptions.map((status) => (
                  <option key={status.id} value={status.id}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </form>

        <div className="modal-actions-compact">
          <button
            type="button"
            onClick={handleModalClose}
            className="button-cancel-compact"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={editingCustomer ? handleUpdateCustomer : handleAddCustomer}
            className="button-submit-compact"
          >
            {editingCustomer ? 'Update Customer' : 'Add Customer'}
          </button>
        </div>
      </Modal>
    </div>
  );
}

export default Projects;
