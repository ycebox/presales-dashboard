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
  Filter,
  X,
  Edit3,
  MoreHorizontal,
  Check,
  AlertTriangle,
  Clock,
  Activity
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
    customer_type: ''
  });
  const [selectedCustomers, setSelectedCustomers] = useState(new Set());
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [toast, setToast] = useState(null);
  const [newCustomer, setNewCustomer] = useState({
    customer_name: '',
    account_manager: '',
    country: '',
    customer_type: 'Existing',
    health_score: 7,
    notes: ''
  });

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

  // Filter and search customers
  const filteredCustomers = useMemo(() => {
    return customers.filter(customer => {
      const matchesSearch = !searchTerm || 
        customer.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.account_manager?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.country?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesFilters = Object.entries(filters).every(([key, value]) => {
        if (!value) return true;
        return customer[key] === value;
      });
      
      return matchesSearch && matchesFilters;
    });
  }, [customers, searchTerm, filters]);

  // Get unique filter options
  const filterOptions = useMemo(() => ({
    countries: [...new Set(customers.map(c => c.country).filter(Boolean))].sort(),
    managers: [...new Set(customers.map(c => c.account_manager).filter(Boolean))].sort(),
    types: [...new Set(customers.map(c => c.customer_type).filter(Boolean))].sort()
  }), [customers]);

  // Active filters for chips
  const activeFilters = useMemo(() => {
    return Object.entries(filters)
      .filter(([key, value]) => value)
      .map(([key, value]) => ({ key, value, label: `${key.replace('_', ' ')}: ${value}` }));
  }, [filters]);

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
    setFilters({ country: '', account_manager: '', customer_type: '' });
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

  // FIXED: Memoize customer change handler to prevent recreation on each render
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

  // FIXED: Memoize customer type change handler
  const handleCustomerTypeChange = useCallback((type) => {
    setNewCustomer(prev => ({ ...prev, customer_type: type }));
  }, []);

  // FIXED: Memoize health score change handler
  const handleHealthScoreChange = useCallback((e) => {
    setNewCustomer(prev => ({ ...prev, health_score: parseInt(e.target.value) }));
  }, []);

  const resetCustomerForm = useCallback(() => {
    setNewCustomer({
      customer_name: '',
      account_manager: '',
      country: '',
      customer_type: 'Existing',
      health_score: 7,
      notes: ''
    });
    setEditingCustomer(null);
  }, []);

  const handleAddCustomer = useCallback(async (e) => {
    e.preventDefault();
    
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert([newCustomer])
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
  }, [newCustomer, fetchCustomers, resetCustomerForm, showToast]);

  const handleUpdateCustomer = useCallback(async (e) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase
        .from('customers')
        .update(newCustomer)
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
      country: customer.country || '',
      customer_type: customer.customer_type || 'Existing',
      health_score: customer.health_score || 7,
      notes: customer.notes || ''
    });
    setShowCustomerModal(true);
  }, []);

  const handleCustomerClick = useCallback((customerId) => {
    navigate(`/customer/${customerId}`);
  }, [navigate]);

  const getHealthScoreColor = useCallback((score) => {
    if (score >= 8) return 'excellent';
    if (score >= 6) return 'good';
    if (score >= 4) return 'fair';
    return 'poor';
  }, []);

  const getHealthScoreLabel = useCallback((score) => {
    if (score >= 8) return 'Excellent';
    if (score >= 6) return 'Good';
    if (score >= 4) return 'Fair';
    return 'Poor';
  }, []);

  // FIXED: Memoize modal close handler
  const handleModalClose = useCallback(() => {
    setShowCustomerModal(false);
    resetCustomerForm();
  }, [resetCustomerForm]);

  // FIXED: Memoize Modal component to prevent recreating on each render
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
            {selectedCustomers.size > 0 && ` • ${selectedCustomers.size} selected`}
          </p>
        </div>
        
        <div className="header-actions">
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
            <table className="customers-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>
                    <input
                      type="checkbox"
                      className="table-checkbox"
                      checked={selectedCustomers.size === filteredCustomers.length && filteredCustomers.length > 0}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th>Customer</th>
                  <th>Location</th>
                  <th>Account Manager</th>
                  <th>Type</th>
                  <th>Health</th>
                  <th style={{ width: '80px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map(customer => (
                  <tr 
                    key={customer.id}
                    className={selectedCustomers.has(customer.id) ? 'selected' : ''}
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
                          {customer.customer_name?.charAt(0)?.toUpperCase() || 'C'}
                        </div>
                        <div className="customer-info">
                          <div className="customer-name">{customer.customer_name}</div>
                          <div className="customer-email">
                            {customer.customer_type === 'Internal Initiative' ? 'Internal' : 'External Client'}
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
                      <span className={`status-badge ${customer.customer_type?.toLowerCase().replace(/\s+/g, '-') || 'new'}`}>
                        {customer.customer_type || 'New'}
                      </span>
                    </td>
                    <td className="health-cell">
                      {customer.health_score && (
                        <div className="health-score">
                          <div className={`health-dot ${getHealthScoreColor(customer.health_score)}`}></div>
                          <span>{customer.health_score}/10</span>
                        </div>
                      )}
                    </td>
                    <td className="actions-cell">
                      <div className="table-actions">
                        <button
                          className="table-action-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditCustomer(customer);
                          }}
                          title="Edit customer"
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
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* FIXED: Compact Customer Modal with stable references */}
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
                  <input 
                    name="account_manager" 
                    value={newCustomer.account_manager} 
                    onChange={handleCustomerChange} 
                    required 
                    className="form-input-compact"
                    placeholder="John Smith"
                    autoComplete="off"
                  />
                </div>
              </div>
              
              <div className="form-row-compact">
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
              Customer Type
            </h4>
            
            <div className="type-pills-compact">
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
          </div>

          <div className="form-section-compact">
            <h4 className="section-title-compact">
              <Activity size={14} className="section-icon-compact" />
              Health Score
            </h4>
            
            <div className="health-score-container-compact">
              <input 
                type="range" 
                className="health-score-slider-compact" 
                min="1" 
                max="10" 
                value={newCustomer.health_score}
                onChange={handleHealthScoreChange}
              />
              <div className="health-score-display-compact">
                <span className="health-score-value-compact">Score: {newCustomer.health_score}/10</span>
                <span className={`health-score-label-compact ${getHealthScoreColor(newCustomer.health_score)}`}>
                  {getHealthScoreLabel(newCustomer.health_score)}
                </span>
              </div>
              <div className="health-labels-compact">
                <span>Poor</span>
                <span>Fair</span>
                <span>Good</span>
                <span>Excellent</span>
              </div>
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
