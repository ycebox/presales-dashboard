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
  Clock
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
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [toast, setToast] = useState(null);
  const [newCustomer, setNewCustomer] = useState({
    customer_name: '',
    account_manager: '',
    country: '',
    customer_type: 'Existing',
    year_first_closed: '',
    company_size: '',
    annual_revenue: '',
    technical_complexity: 'Medium',
    relationship_strength: 'Medium',
    health_score: 7,
    key_stakeholders: [],
    competitors: [],
    notes: ''
  });
  const [newProject, setNewProject] = useState({
    customer_id: '',
    customer_name: '',
    country: '',
    account_manager: '',
    sales_stage: '',
    product: '',
    deal_value: '',
    backup_presales: '',
    remarks: '',
    is_archived: 'false'
  });

  // Static data arrays
  const asiaPacificCountries = [
    "Australia", "Bangladesh", "Brunei", "Cambodia", "China", "Fiji", "India", "Indonesia", 
    "Japan", "Laos", "Malaysia", "Myanmar", "Nepal", "New Zealand", "Pakistan", 
    "Papua New Guinea", "Philippines", "Singapore", "Solomon Islands", "South Korea", 
    "Sri Lanka", "Thailand", "Timor-Leste", "Tonga", "Vanuatu", "Vietnam"
  ].sort();

  const products = ['Marketplace', 'O-City', 'Processing', 'SmartVista'].sort();
  const salesStages = [
    'Closed-Cancelled/Hold', 'Closed-Lost', 'Closed-Won', 'Contracting', 'Demo', 
    'Discovery', 'PoC', 'RFI', 'RFP', 'SoW'
  ].sort();
  const companySizes = [
    'Startup (1-10)', 'Small (11-50)', 'Medium (51-200)', 'Large (201-1000)', 'Enterprise (1000+)'
  ];
  const revenueRanges = [
    'Under $1M', '$1M - $10M', '$10M - $50M', '$50M - $100M', '$100M - $500M', '$500M+'
  ];

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
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
  };

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

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const removeFilter = (key) => {
    setFilters(prev => ({ ...prev, [key]: '' }));
  };

  const clearAllFilters = () => {
    setFilters({ country: '', account_manager: '', customer_type: '' });
    setSearchTerm('');
  };

  const handleCustomerSelect = (customerId) => {
    setSelectedCustomers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(customerId)) {
        newSet.delete(customerId);
      } else {
        newSet.add(customerId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedCustomers.size === filteredCustomers.length) {
      setSelectedCustomers(new Set());
    } else {
      setSelectedCustomers(new Set(filteredCustomers.map(c => c.id)));
    }
  };

  const handleBulkDelete = async () => {
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
  };

  const handleCustomerChange = (e) => {
    const { name, value, type } = e.target;
    
    if (name === 'key_stakeholders' || name === 'competitors') {
      const arrayValue = value.split(',').map(item => item.trim()).filter(item => item);
      setNewCustomer(prev => ({ ...prev, [name]: arrayValue }));
    } else if (type === 'number') {
      setNewCustomer(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    } else {
      setNewCustomer(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleProjectChange = (e) => {
    const { name, value } = e.target;
    setNewProject(prev => ({ ...prev, [name]: value }));

    if (name === 'customer_id' && value) {
      const selectedCustomer = customers.find(c => c.id === parseInt(value));
      if (selectedCustomer) {
        setNewProject(prev => ({
          ...prev,
          customer_name: selectedCustomer.customer_name,
          country: selectedCustomer.country,
          account_manager: selectedCustomer.account_manager
        }));
      }
    }
  };

  const resetCustomerForm = () => {
    setNewCustomer({
      customer_name: '',
      account_manager: '',
      country: '',
      customer_type: 'Existing',
      year_first_closed: '',
      company_size: '',
      annual_revenue: '',
      technical_complexity: 'Medium',
      relationship_strength: 'Medium',
      health_score: 7,
      key_stakeholders: [],
      competitors: [],
      notes: ''
    });
    setEditingCustomer(null);
  };

  const resetProjectForm = () => {
    setNewProject({
      customer_id: '',
      customer_name: '',
      country: '',
      account_manager: '',
      sales_stage: '',
      product: '',
      deal_value: '',
      backup_presales: '',
      remarks: '',
      is_archived: 'false'
    });
  };

  const handleAddCustomer = async (e) => {
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
  };

  const handleUpdateCustomer = async (e) => {
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
  };

  const handleAddProject = async (e) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase.from('projects').insert([newProject]);
      if (error) throw error;
      
      setShowProjectModal(false);
      resetProjectForm();
      showToast('Project added successfully!');
    } catch (err) {
      console.error('Error adding project:', err);
      showToast('Failed to add project', 'error');
    }
  };

  const handleDeleteCustomer = async (id) => {
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
  };

  const handleEditCustomer = (customer) => {
    setEditingCustomer(customer);
    setNewCustomer({
      ...customer,
      key_stakeholders: customer.key_stakeholders || [],
      competitors: customer.competitors || []
    });
    setShowCustomerModal(true);
  };

  const handleCustomerClick = (customerId) => {
    navigate(`/customer/${customerId}`);
  };

  const getHealthScoreColor = (score) => {
    if (score >= 8) return 'excellent';
    if (score >= 6) return 'good';
    if (score >= 4) return 'fair';
    return 'poor';
  };

  const Modal = ({ isOpen, onClose, children }) => {
    if (!isOpen) return null;
    
    return ReactDOM.createPortal(
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          {children}
        </div>
      </div>,
      document.body
    );
  };

  const CustomerCard = ({ customer }) => (
    <div 
      className={`customer-card ${selectedCustomers.has(customer.id) ? 'selected' : ''}`}
      onClick={() => handleCustomerClick(customer.id)}
    >
      <input
        type="checkbox"
        className="customer-checkbox"
        checked={selectedCustomers.has(customer.id)}
        onChange={(e) => {
          e.stopPropagation();
          handleCustomerSelect(customer.id);
        }}
      />
      
      <div className="customer-card-header">
        <div>
          <h3 className="customer-name">{customer.customer_name}</h3>
          <span className={`customer-type-badge ${customer.customer_type?.toLowerCase().replace(' ', '-') || 'new'}`}>
            {customer.customer_type || 'New'}
          </span>
        </div>
        
        <div className="customer-actions">
          <button
            className="customer-action-btn"
            onClick={(e) => {
              e.stopPropagation();
              handleEditCustomer(customer);
            }}
            title="Edit customer"
          >
            <Edit3 size={12} />
          </button>
          <button
            className="customer-action-btn delete"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteCustomer(customer.id);
            }}
            title="Delete customer"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      <div className="customer-details">
        <div className="customer-location">
          <Globe size={10} className="location-icon" />
          <span>{customer.country}</span>
        </div>
        <div className="customer-manager">
          <User size={10} className="manager-icon" />
          <span>{customer.account_manager}</span>
        </div>
      </div>

      <div className="customer-stats">
        <div className="stat-item">
          <Building2 size={10} />
          <span>0 projects</span>
        </div>
        {customer.health_score && (
          <div className="health-score">
            <div className={`health-dot ${getHealthScoreColor(customer.health_score)}`}></div>
            <span>Health: {customer.health_score}/10</span>
          </div>
        )}
      </div>
    </div>
  );

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
          <button 
            className="action-button secondary" 
            onClick={() => setShowProjectModal(true)}
          >
            <Plus size={12} className="button-icon" />
            Add Project
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
                  <th>Projects</th>
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
                    <td style={{ textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>
                      0 projects
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

      {/* Simplified Customer Modal */}
      <Modal isOpen={showCustomerModal} onClose={() => { setShowCustomerModal(false); resetCustomerForm(); }}>
        <div className="modal-header">
          <h3 className="modal-title">
            {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
          </h3>
          <button 
            onClick={() => { setShowCustomerModal(false); resetCustomerForm(); }}
            className="modal-close-button"
          >
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={editingCustomer ? handleUpdateCustomer : handleAddCustomer} className="modal-form">
          <div className="form-grid">
            {/* Row 1 */}
            <div className="form-group">
              <label className="form-label required">Customer Name</label>
              <input 
                name="customer_name" 
                value={newCustomer.customer_name} 
                onChange={handleCustomerChange} 
                required 
                className="form-input"
                placeholder="Enter customer name"
              />
            </div>
            
            <div className="form-group">
              <label className="form-label required">Account Manager</label>
              <input 
                name="account_manager" 
                value={newCustomer.account_manager} 
                onChange={handleCustomerChange} 
                required 
                className="form-input"
                placeholder="Enter account manager"
              />
            </div>
            
            {/* Row 2 */}
            <div className="form-group">
              <label className="form-label required">Country</label>
              <select 
                name="country" 
                value={newCustomer.country} 
                onChange={handleCustomerChange} 
                required
                className="form-select"
              >
                <option value="">Select Country</option>
                {asiaPacificCountries.map(country => (
                  <option key={country} value={country}>{country}</option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label className="form-label required">Customer Type</label>
              <select 
                name="customer_type" 
                value={newCustomer.customer_type} 
                onChange={handleCustomerChange}
                required
                className="form-select"
              >
                <option value="New">New Customer</option>
                <option value="Existing">Existing Customer</option>
                <option value="Internal Initiative">Internal Initiative</option>
              </select>
            </div>
            
            {/* Row 3 - Optional fields */}
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input 
                name="email" 
                type="email"
                value={newCustomer.email || ''} 
                onChange={handleCustomerChange}
                className="form-input"
                placeholder="customer@company.com"
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input 
                name="phone" 
                value={newCustomer.phone || ''} 
                onChange={handleCustomerChange}
                className="form-input"
                placeholder="+65 1234 5678"
              />
            </div>
            
            {/* Row 4 - Company details for external customers only */}
            {newCustomer.customer_type !== 'Internal Initiative' && (
              <>
                <div className="form-group">
                  <label className="form-label">Company Size</label>
                  <select 
                    name="company_size" 
                    value={newCustomer.company_size} 
                    onChange={handleCustomerChange}
                    className="form-select"
                  >
                    <option value="">Select Size</option>
                    {companySizes.map(size => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Health Score (1-10)</label>
                  <input 
                    name="health_score" 
                    type="number"
                    min="1"
                    max="10"
                    value={newCustomer.health_score} 
                    onChange={handleCustomerChange}
                    className="form-input"
                    placeholder="7"
                  />
                </div>
              </>
            )}
            
            {/* Row 5 - Notes (full width) */}
            <div className="form-group full-width">
              <label className="form-label">Notes</label>
              <textarea 
                name="notes" 
                value={newCustomer.notes} 
                onChange={handleCustomerChange}
                rows="2"
                className="form-textarea"
                placeholder="Additional information or special requirements..."
              />
            </div>
          </div>
          
          <div className="modal-actions">
            <button 
              type="button" 
              onClick={() => { setShowCustomerModal(false); resetCustomerForm(); }}
              className="button-cancel"
            >
              Cancel
            </button>
            <button type="submit" className="button-submit">
              {editingCustomer ? 'Update Customer' : 'Add Customer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Project Modal */}
      <Modal isOpen={showProjectModal} onClose={() => { setShowProjectModal(false); resetProjectForm(); }}>
        <div className="modal-header">
          <h3 className="modal-title">Add New Project</h3>
          <button 
            onClick={() => { setShowProjectModal(false); resetProjectForm(); }}
            className="modal-close-button"
          >
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleAddProject} className="modal-form">
          <div className="form-grid">
            <div className="form-group full-width">
              <label className="form-label">Select Customer *</label>
              <select 
                name="customer_id" 
                value={newProject.customer_id} 
                onChange={handleProjectChange} 
                required
                className="form-select"
              >
                <option value="">Choose a customer</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.id}>
                    {customer.customer_name} ({customer.country})
                  </option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label className="form-label">Sales Stage *</label>
              <select 
                name="sales_stage" 
                value={newProject.sales_stage} 
                onChange={handleProjectChange} 
                required
                className="form-select"
              >
                <option value="">Select Stage</option>
                {salesStages.map(stage => (
                  <option key={stage} value={stage}>{stage}</option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label className="form-label">Product *</label>
              <select 
                name="product" 
                value={newProject.product} 
                onChange={handleProjectChange} 
                required
                className="form-select"
              >
                <option value="">Select Product</option>
                {products.map(product => (
                  <option key={product} value={product}>{product}</option>
                ))}
              </select>
            </div>
            
            <div className="form-group full-width">
              <label className="form-label">Project Remarks</label>
              <textarea 
                name="remarks" 
                value={newProject.remarks} 
                onChange={handleProjectChange}
                className="form-textarea"
                placeholder="Project details and requirements..."
                rows="3"
              />
            </div>
          </div>
       
          <div className="modal-actions">
            <button 
              type="button" 
              onClick={() => { setShowProjectModal(false); resetProjectForm(); }}
              className="button-cancel"
            >
              Cancel
            </button>
            <button type="submit" className="button-submit">
              Create Project
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default Projects;
