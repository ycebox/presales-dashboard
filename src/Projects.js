import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { supabase } from './supabaseClient';
import { Link, useNavigate } from 'react-router-dom';
import { 
  FaFolderOpen, 
  FaPlus, 
  FaTrash, 
  FaUser, 
  FaUserPlus, 
  FaBuilding, 
  FaGlobe,
  FaSearch,
  FaFilter
} from 'react-icons/fa';
import './Projects.css';

function Projects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    country: '',
    account_manager: ''
  });
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
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

  // Static data arrays
  const asiaPacificCountries = [
    "Australia", "Bangladesh", "Brunei", "Cambodia", "China", "Fiji", "India", "Indonesia", "Japan", "Laos", "Malaysia",
    "Myanmar", "Nepal", "New Zealand", "Pakistan", "Papua New Guinea", "Philippines", "Singapore", "Solomon Islands",
    "South Korea", "Sri Lanka", "Thailand", "Timor-Leste", "Tonga", "Vanuatu", "Vietnam"
  ].sort();

  const products = ['Marketplace', 'O-City', 'Processing', 'SmartVista'].sort();

  const salesStages = [
    'Closed-Cancelled/Hold', 'Closed-Lost', 'Closed-Won', 'Contracting', 'Demo', 'Discovery',
    'PoC', 'RFI', 'RFP', 'SoW'
  ].sort();

  const companySizes = [
    'Startup (1-10)', 'Small (11-50)', 'Medium (51-200)', 'Large (201-1000)', 'Enterprise (1000+)'
  ];

  const revenueRanges = [
    'Under $1M', '$1M - $10M', '$10M - $50M', '$50M - $100M', '$100M - $500M', '$500M+'
  ];

  useEffect(() => {
    fetchProjects();
  }, [filters]);

  useEffect(() => {
    console.log('Projects component mounted, fetching customers...');
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      console.log('Fetching customers...');
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('customer_name', { ascending: true });
      
      if (error) {
        console.error('Error fetching customers:', error);
        setError('Failed to load customers');
        return;
      }
      
      console.log('Customers fetched:', data);
      setCustomers(data || []);
    } catch (err) {
      console.error('Unexpected error fetching customers:', err);
      setError('Failed to load customers');
    }
  };

  const fetchProjects = async () => {
    setLoading(true);
    setError(null);
    
    try {
      let query = supabase
        .from('customers')
        .select('*');
      
      // Apply filters to customers table
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          if (key === 'sales_stage' || key === 'product') {
            // Skip project-specific filters for now
            return;
          }
          query = query.eq(key, value);
        }
      });

      const { data, error } = await query.order('customer_name', { ascending: true });
      
      if (error) {
        console.error('Error fetching customers:', error);
        setError('Failed to load customer portfolio');
        setProjects([]);
      } else {
        console.log('Customers with projects:', data);
        setProjects(data || []);
      }
    } catch (err) {
      console.error('Unexpected error in fetchProjects:', err);
      setError('Failed to load customer portfolio');
      setProjects([]);
    }
    setLoading(false);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleNewProjectChange = (e) => {
    const { name, value } = e.target;
    setNewProject((prev) => ({ ...prev, [name]: value }));

    if (name === 'customer_id' && value) {
      const selectedCustomer = customers.find(c => c.id === parseInt(value));
      if (selectedCustomer) {
        setNewProject((prev) => ({
          ...prev,
          customer_name: selectedCustomer.customer_name,
          country: selectedCustomer.country,
          account_manager: selectedCustomer.account_manager
        }));
      }
    }
  };

  const handleNewCustomerChange = (e) => {
    const { name, value, type } = e.target;
    
    if (name === 'key_stakeholders' || name === 'competitors') {
      const arrayValue = value.split(',').map(item => item.trim()).filter(item => item);
      setNewCustomer((prev) => ({ ...prev, [name]: arrayValue }));
    } else if (type === 'number') {
      setNewCustomer((prev) => ({ ...prev, [name]: parseFloat(value) || 0 }));
    } else {
      setNewCustomer((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleCloseCustomerModal = () => {
    setShowCustomerModal(false);
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
  };

  const handleCloseProjectModal = () => {
    setShowProjectModal(false);
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
      console.log('Adding customer:', newCustomer);
      
      const { data, error } = await supabase.from('customers').insert([newCustomer]).select();
      
      if (error) {
        console.error('Error adding customer:', error);
        alert(`Error adding customer: ${error.message}`);
        return;
      }
      
      if (data && data.length > 0) {
        handleCloseCustomerModal();
        
        // Refresh both the customer list and dropdown
        await fetchCustomers();
        await fetchProjects();
        
        const newCustomerId = data[0].id;
        setNewProject((prev) => ({
          ...prev,
          customer_id: newCustomerId.toString(),
          customer_name: data[0].customer_name,
          country: data[0].country,
          account_manager: data[0].account_manager
        }));
        
        alert('Customer added successfully!');
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      alert('An unexpected error occurred. Please try again.');
    }
  };

  const handleAddProject = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('projects').insert([newProject]);
    if (!error) {
      handleCloseProjectModal();
      fetchProjects();
    } else {
      console.error('Error adding project:', error.message);
    }
  };

  const handleDeleteCustomer = async (id) => {
    if (!window.confirm('Are you sure you want to delete this customer? This action cannot be undone.')) return;
    
    try {
      const { error } = await supabase.from('customers').delete().eq('id', id);
      if (!error) {
        fetchProjects();
        fetchCustomers();
      } else {
        console.error('Delete error:', error.message);
        alert('Failed to delete customer. Please try again.');
      }
    } catch (err) {
      console.error('Unexpected delete error:', err);
      alert('An unexpected error occurred while deleting.');
    }
  };

  const handleCustomerClick = (customerId, customerName) => {
    if (customerId) {
      navigate(`/customer/${customerId}`);
    } else {
      console.log('No customer ID found for:', customerName);
    }
  };

  // Memoized dropdown options to prevent re-renders and focus loss
  const customerOptions = useMemo(() => {
    console.log('Creating customer options from:', customers);
    return customers.map((customer) => (
      <option key={customer.id} value={customer.id}>
        {customer.customer_name} ({customer.country})
      </option>
    ));
  }, [customers]);

  const countryOptions = useMemo(() =>
    asiaPacificCountries.map((c, i) => (
      <option key={i} value={c}>{c}</option>
    )), [asiaPacificCountries]
  );

  const companySizeOptions = useMemo(() =>
    companySizes.map((size, i) => (
      <option key={i} value={size}>{size}</option>
    )), [companySizes]
  );

  const revenueOptions = useMemo(() =>
    revenueRanges.map((range, i) => (
      <option key={i} value={range}>{range}</option>
    )), [revenueRanges]
  );

  const salesStageOptions = useMemo(() =>
    salesStages.map((s, i) => (
      <option key={i} value={s}>{s}</option>
    )), [salesStages]
  );

  const productOptions = useMemo(() =>
    products.map((p, i) => (
      <option key={i} value={p}>{p}</option>
    )), [products]
  );

  // Enhanced Modal component
  const Modal = useCallback(({ isOpen, onClose, children }) => {
    if (!isOpen) return null;
    
    return ReactDOM.createPortal(
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          {children}
        </div>
      </div>,
      document.body
    );
  }, []);

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <div className="loading-container">
      <div className="loading-content">
        <div className="loading-spinner"></div>
        <div className="loading-text">Loading customer portfolio...</div>
      </div>
    </div>
  );

  // Error state component
  const ErrorState = () => (
    <div className="error-container">
      <div className="error-content">
        <div className="error-icon">⚠️</div>
        <h3 className="error-title">Something went wrong</h3>
        <p className="error-message">{error}</p>
        <button onClick={fetchProjects} className="retry-button">
          Try Again
        </button>
      </div>
    </div>
  );

  // Empty state component
  const EmptyState = () => (
    <div className="empty-state">
      <div className="empty-icon-wrapper">
        <FaBuilding className="empty-icon" />
      </div>
      <h3 className="empty-title">No customers found</h3>
      <p className="empty-description">
        No customers match your current filters. Try adjusting your search criteria or add a new customer.
      </p>
      <button 
        onClick={() => setShowCustomerModal(true)}
        className="empty-action-button"
      >
        <FaUserPlus />
        Add Your First Customer
      </button>
    </div>
  );

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error && projects.length === 0) {
    return <ErrorState />;
  }

  return (
    <div className="projects-container">
      {/* Clean Header Section */}
      <header className="projects-header-section">
        <div className="header-content">
          <div className="header-title-wrapper">
            <div className="header-icon-wrapper">
              <FaBuilding className="header-icon" />
            </div>
            <div className="header-text">
              <h2 className="projects-title">Customer Portfolio</h2>
              <p className="projects-subtitle">
                {projects.length} customer{projects.length !== 1 ? 's' : ''} in your portfolio
              </p>
            </div>
          </div>
          
          <div className="header-actions">
            <button 
              className="action-button primary" 
              onClick={() => setShowCustomerModal(true)}
              aria-label="Add new customer"
            >
              <FaUserPlus className="button-icon" />
              <span>Add Customer</span>
            </button>
            <button 
              className="action-button secondary" 
              onClick={() => setShowProjectModal(true)}
              aria-label="Add new project"
            >
              <FaPlus className="button-icon" />
              <span>Add Project</span>
            </button>
          </div>
        </div>
      </header>

      {/* Enhanced Filters Section */}
      <section className="filters-section" role="search" aria-label="Filter customers">
        <div className="filters-header">
          <div className="filters-title-wrapper">
            <FaFilter className="filters-icon" />
            <span className="filters-title">Filters</span>
          </div>
        </div>
        
        <div className="filters-grid">
          <div className="filter-group">
            <label htmlFor="country-filter" className="filter-label">
              Country
            </label>
            <select 
              id="country-filter"
              name="country" 
              value={filters.country} 
              onChange={handleFilterChange}
              className="filter-select"
            >
              <option value="">All Countries</option>
              {countryOptions}
            </select>
          </div>
          
          <div className="filter-group">
            <label htmlFor="manager-filter" className="filter-label">
              Account Manager
            </label>
            <select 
              id="manager-filter"
              name="account_manager" 
              value={filters.account_manager} 
              onChange={handleFilterChange}
              className="filter-select"
            >
              <option value="">All Managers</option>
              {[...new Set(projects.map(p => p.account_manager).filter(Boolean))].sort().map((am, i) => (
                <option key={i} value={am}>{am}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Enhanced Table Section */}
      <section className="table-section">
        <div className="table-container">
          <div className="table-wrapper">
            <table className="customers-table" role="table">
              <thead>
                <tr>
                  <th scope="col">Customer Details</th>
                  <th scope="col">Location</th>
                  <th scope="col">Account Manager</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="actions-column">Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="empty-row">
                      <EmptyState />
                    </td>
                  </tr>
                ) : (
                  projects.map((customer) => (
                    <tr key={customer.id} id={`customer-${customer.id}`} className="customer-row">
                      <td className="customer-details-cell">
                        <button
                          onClick={() => handleCustomerClick(customer.id, customer.customer_name)}
                          className="customer-link"
                          title={`View details for ${customer.customer_name}`}
                          aria-label={`View details for ${customer.customer_name}`}
                        >
                          <div className="customer-icon-wrapper">
                            <FaUser className="customer-icon" />
                          </div>
                          <span className="customer-name">{customer.customer_name}</span>
                        </button>
                      </td>
                      
                      <td className="location-cell">
                        <div className="location-wrapper">
                          <FaGlobe className="location-icon" />
                          <span className="location-text">{customer.country}</span>
                        </div>
                      </td>
                      
                      <td className="manager-cell">
                        <span className="manager-name">{customer.account_manager}</span>
                      </td>
                      
                      <td className="status-cell">
                        <span className={`status-badge ${
                          customer.customer_type === 'Internal Initiative' ? 'internal' : 
                          customer.customer_type === 'Existing' ? 'existing' : 'new'
                        }`}>
                          {customer.customer_type || 'New'}
                        </span>
                      </td>
                      
                      <td className="actions-cell">
                        <button 
                          className="delete-button" 
                          onClick={() => handleDeleteCustomer(customer.id)}
                          title={`Delete ${customer.customer_name}`}
                          aria-label={`Delete customer ${customer.customer_name}`}
                        >
                          <FaTrash className="delete-icon" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
      
      {/* Enhanced Customer Modal */}
      <Modal isOpen={showCustomerModal} onClose={handleCloseCustomerModal}>
        <div className="modal-header">
          <h3 className="modal-title">
            Add New {newCustomer.customer_type === 'Internal Initiative' ? 'Internal Initiative' : 'Customer'}
          </h3>
          <button 
            onClick={handleCloseCustomerModal}
            className="modal-close-button"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>
        
        <form onSubmit={handleAddCustomer} className="modal-form">
          <div className="form-grid">
            <div className="form-group full-width">
              <label htmlFor="customer-name" className="form-label">
                {newCustomer.customer_type === 'Internal Initiative' ? 'Initiative Name' : 'Customer Name'} *
              </label>
              <input 
                id="customer-name"
                name="customer_name" 
                value={newCustomer.customer_name} 
                onChange={handleNewCustomerChange} 
                required 
                className="form-input"
                placeholder={
                  newCustomer.customer_type === 'Internal Initiative' ? 
                  'e.g., Q4 Company Retreat, Annual Training' : 
                  'Enter customer name'
                }
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="account-manager" className="form-label">
                Account Manager *
              </label>
              <input 
                id="account-manager"
                name="account_manager" 
                value={newCustomer.account_manager} 
                onChange={handleNewCustomerChange} 
                required 
                className="form-input"
                placeholder="Enter account manager name"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="customer-country" className="form-label">
                Country *
              </label>
              <select 
                id="customer-country"
                name="country" 
                value={newCustomer.country} 
                onChange={handleNewCustomerChange} 
                required
                className="form-select"
              >
                <option value="">Select Country</option>
                {countryOptions}
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="customer-type" className="form-label">
                Type *
              </label>
              <select 
                id="customer-type"
                name="customer_type" 
                value={newCustomer.customer_type} 
                onChange={handleNewCustomerChange}
                required
                className="form-select"
              >
                <option value="New">New</option>
                <option value="Existing">Existing</option>
                <option value="Internal Initiative">Internal Initiative</option>
              </select>
            </div>
            
            {/* Conditional fields for External customers */}
            {newCustomer.customer_type !== 'Internal Initiative' && (
              <>
                <div className="form-group">
                  <label htmlFor="year-closed" className="form-label">
                    Year First Closed
                  </label>
                  <input 
                    id="year-closed"
                    name="year_first_closed" 
                    type="number"
                    min="2000"
                    max={new Date().getFullYear()}
                    value={newCustomer.year_first_closed} 
                    onChange={handleNewCustomerChange}
                    className="form-input"
                    placeholder="e.g., 2022"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="company-size" className="form-label">
                    Company Size
                  </label>
                  <select 
                    id="company-size"
                    name="company_size" 
                    value={newCustomer.company_size} 
                    onChange={handleNewCustomerChange}
                    className="form-select"
                  >
                    <option value="">Select Company Size</option>
                    {companySizeOptions}
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="annual-revenue" className="form-label">
                    Annual Revenue
                  </label>
                  <select 
                    id="annual-revenue"
                    name="annual_revenue" 
                    value={newCustomer.annual_revenue} 
                    onChange={handleNewCustomerChange}
                    className="form-select"
                  >
                    <option value="">Select Revenue Range</option>
                    {revenueOptions}
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="tech-complexity" className="form-label">
                    Technical Complexity
                  </label>
                  <select 
                    id="tech-complexity"
                    name="technical_complexity" 
                    value={newCustomer.technical_complexity} 
                    onChange={handleNewCustomerChange}
                    className="form-select"
                  >
                    <option value="Low">Low Complexity</option>
                    <option value="Medium">Medium Complexity</option>
                    <option value="High">High Complexity</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="relationship-strength" className="form-label">
                    Relationship Strength
                  </label>
                  <select 
                    id="relationship-strength"
                    name="relationship_strength" 
                    value={newCustomer.relationship_strength} 
                    onChange={handleNewCustomerChange}
                    className="form-select"
                  >
                    <option value="Weak">Developing</option>
                    <option value="Medium">Established</option>
                    <option value="Strong">Strategic Partnership</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="health-score" className="form-label">
                    Health Score (1-10)
                  </label>
                  <input 
                    id="health-score"
                    name="health_score" 
                    type="number"
                    min="1"
                    max="10"
                    value={newCustomer.health_score} 
                    onChange={handleNewCustomerChange}
                    className="form-input"
                    placeholder="Rate from 1-10"
                  />
                </div>
                
                <div className="form-group full-width">
                  <label htmlFor="key-stakeholders" className="form-label">
                    Key Stakeholders (comma-separated)
                  </label>
                  <input 
                    id="key-stakeholders"
                    name="key_stakeholders" 
                    value={newCustomer.key_stakeholders.join(', ')} 
                    onChange={handleNewCustomerChange}
                    className="form-input"
                    placeholder="John Smith, Jane Doe, etc."
                  />
                </div>
                
                <div className="form-group full-width">
                  <label htmlFor="competitors" className="form-label">
                    Main Competitors (comma-separated)
                  </label>
                  <input 
                    id="competitors"
                    name="competitors" 
                    value={newCustomer.competitors.join(', ')} 
                    onChange={handleNewCustomerChange}
                    className="form-input"
                    placeholder="Company A, Company B, etc."
                  />
                </div>
              </>
            )}
            
            <div className="form-group full-width">
              <label htmlFor="customer-notes" className="form-label">
                {newCustomer.customer_type === 'Internal Initiative' ? 'Initiative Description' : 'Additional Notes'}
              </label>
              <textarea 
                id="customer-notes"
                name="notes" 
                value={newCustomer.notes} 
                onChange={handleNewCustomerChange}
                rows="3"
                className="form-textarea"
                placeholder={
                  newCustomer.customer_type === 'Internal Initiative' ? 
                  'Describe the internal initiative, goals, timeline, etc.' : 
                  'Any additional information about this customer...'
                }
              />
            </div>
          </div>
          
          <div className="modal-actions">
            <button type="button" onClick={handleCloseCustomerModal} className="button-cancel">
              Cancel
            </button>
            <button type="submit" className="button-submit">
              {newCustomer.customer_type === 'Internal Initiative' ? 'Create Initiative' : 'Save Customer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Enhanced Project Modal */}
      <Modal isOpen={showProjectModal} onClose={handleCloseProjectModal}>
        <div className="modal-header">
          <h3 className="modal-title">Add New Project</h3>
          <button 
            onClick={handleCloseProjectModal}
            className="modal-close-button"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>
        
        <form onSubmit={handleAddProject} className="modal-form">
          <div className="form-grid">
            <div className="form-group full-width">
              <label htmlFor="project-customer" className="form-label">
                Select Customer ({customers.length} available)
              </label>
              <select 
                id="project-customer"
                name="customer_id" 
                value={newProject.customer_id} 
                onChange={handleNewProjectChange} 
                required
                className="form-select"
              >
                <option value="">
                  {customers.length === 0 ? 'No customers available - Add one first!' : 'Choose a customer'}
                </option>
                {customerOptions}
              </select>
              {customers.length === 0 && (
                <div className="form-warning">
                  ⚠️ No customers found. Please add a customer first using the "Add Customer" button.
                </div>
              )}
            </div>
            
            <div className="form-group">
              <label htmlFor="sales-stage" className="form-label">
                Sales Stage
              </label>
              <select 
                id="sales-stage"
                name="sales_stage" 
                value={newProject.sales_stage} 
                onChange={handleNewProjectChange} 
                required
                className="form-select"
              >
                <option value="">Select Sales Stage</option>
                {salesStageOptions}
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="project-product" className="form-label">
                Product
              </label>
              <select 
                id="project-product"
                name="product" 
                value={newProject.product} 
                onChange={handleNewProjectChange} 
                required
                className="form-select"
              >
                <option value="">Select Product</option>
                {productOptions}
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="deal-value" className="form-label">
                Deal Value ($)
              </label>
              <input 
                id="deal-value"
                name="deal_value" 
                type="number" 
                value={newProject.deal_value || ''} 
                onChange={handleNewProjectChange}
                className="form-input"
                placeholder="Enter deal value"
                min="0"
                step="0.01"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="backup-presales" className="form-label">
                Backup Presales Engineer
              </label>
              <input 
                id="backup-presales"
                name="backup_presales" 
                value={newProject.backup_presales || ''} 
                onChange={handleNewProjectChange}
                className="form-input"
                placeholder="Enter backup presales name"
              />
            </div>
            
            <div className="form-group full-width">
              <label htmlFor="project-remarks" className="form-label">
                Project Remarks
              </label>
              <textarea 
                id="project-remarks"
                name="remarks" 
                value={newProject.remarks || ''} 
                onChange={handleNewProjectChange}
                className="form-textarea"
                placeholder="Additional project details, requirements, or notes..."
                rows="3"
              />
            </div>
          </div>
       
          <div className="modal-actions">
            <button type="button" onClick={handleCloseProjectModal} className="button-cancel">
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
