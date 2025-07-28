import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { supabase } from './supabaseClient';
import { Link, useNavigate } from 'react-router-dom';
import { FaFolderOpen, FaPlus, FaTrash, FaUser, FaUserPlus, FaBuilding, FaGlobe } from 'react-icons/fa';
import './Projects.css';

function Projects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    country: '',
    account_manager: '',
    customer_type: ''
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
    customer_type: 'External', // Changed default to External
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
        return;
      }
      
      console.log('Customers fetched:', data);
      setCustomers(data || []);
    } catch (err) {
      console.error('Unexpected error fetching customers:', err);
    }
  };

  const fetchProjects = async () => {
    setLoading(true);
    try {
      // Instead of joining, let's fetch customers with active projects
      let query = supabase
        .from('customers')
        .select('*');
      
      // Apply filters to customers table (removed industry_vertical)
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
        setProjects([]);
      } else {
        console.log('Customers with projects:', data);
        setProjects(data || []);
      }
    } catch (err) {
      console.error('Unexpected error in fetchProjects:', err);
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
      customer_type: 'External', // Changed default to External
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
        await fetchCustomers(); // For the dropdown in project modal
        await fetchProjects(); // For the main table display
        
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
    if (!window.confirm('Are you sure you want to delete this customer?')) return;
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (!error) {
      fetchProjects(); // Refresh the customer list
      fetchCustomers(); // Also refresh the customers dropdown
    } else {
      console.error('Delete error:', error.message);
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

  return (
    <>
      <section className="projects-wrapper">
        <div className="projects-header-row">
          <h2 className="projects-header">
            <FaBuilding /> Customer Portfolio
          </h2>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button className="add-btn" style={{ backgroundColor: '#10b981' }} onClick={() => setShowCustomerModal(true)}>
              <FaUserPlus /> Add Customer
            </button>
            <button className="add-btn" style={{ backgroundColor: '#a6b2d9' }} onClick={() => setShowProjectModal(true)}>
              <FaPlus /> Add Project
            </button>
          </div>
        </div>

        <div className="filters updated-filters">
          <label>
            <FaGlobe style={{ marginRight: '0.5rem', color: 'var(--color-primary)' }} />
            Country Filter
            <select name="country" value={filters.country} onChange={handleFilterChange}>
              <option value="">All Countries</option>
              {countryOptions}
            </select>
          </label>
          <label>
            <FaUser style={{ marginRight: '0.5rem', color: 'var(--color-success)' }} />
            Account Manager
            <select name="account_manager" value={filters.account_manager} onChange={handleFilterChange}>
              <option value="">All Account Managers</option>
              {[...new Set(projects.map(p => p.account_manager).filter(Boolean))].sort().map((am, i) => (
                <option key={i} value={am}>{am}</option>
              ))}
            </select>
          </label>
          <label>
            <FaBuilding style={{ marginRight: '0.5rem', color: 'var(--color-neutral-500)' }} />
            Customer Type
            <select name="customer_type" value={filters.customer_type} onChange={handleFilterChange}>
              <option value="">All Customer Types</option>
              <option value="Internal">Internal</option>
              <option value="External">External</option>
            </select>
          </label>
        </div>

        {loading ? (
          <div className="loading-container">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ 
                width: '24px', 
                height: '24px', 
                border: '3px solid var(--color-neutral-200)', 
                borderTop: '3px solid var(--color-primary)', 
                borderRadius: '50%', 
                animation: 'spin 1s linear infinite' 
              }}></div>
              Loading customers...
            </div>
          </div>
        ) : (
          <div className="table-scroll-wrapper">
            <div className="table-container">
              <table className="modern-table project-table">
                <thead>
                  <tr>
                    <th>Customer Details</th>
                    <th>Location</th>
                    <th>Account Manager</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ 
                        textAlign: 'center', 
                        padding: '3rem', 
                        color: 'var(--color-neutral-500)',
                        fontStyle: 'italic'
                      }}>
                        No customers found matching the current filters.
                      </td>
                    </tr>
                  ) : (
                    projects.map((customer) => (
                      <tr key={customer.id} id={`customer-${customer.id}`}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <button
                              onClick={() => handleCustomerClick(customer.id, customer.customer_name)}
                              className="customer-link-btn"
                              title="View customer details"
                            >
                              <FaUser size={14} />
                              {customer.customer_name}
                            </button>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <FaGlobe size={12} style={{ color: 'var(--color-neutral-400)' }} />
                            {customer.country}
                          </div>
                        </td>
                        <td>
                          <div style={{ 
                            fontWeight: '600',
                            color: 'var(--color-neutral-700)'
                          }}>
                            {customer.account_manager}
                          </div>
                        </td>
                        <td>
                          <span className={customer.customer_type === 'Internal' ? 'internal-customer' : 'external-customer'}>
                            {customer.customer_type || 'External'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button 
                            className="delete-btn" 
                            onClick={() => handleDeleteCustomer(customer.id)}
                            title="Delete customer"
                          >
                            <FaTrash />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
      
      <Modal isOpen={showCustomerModal} onClose={handleCloseCustomerModal}>
        <h3>Add New {newCustomer.customer_type === 'Internal' ? 'Internal Initiative' : 'Customer'}</h3>
        <form onSubmit={handleAddCustomer} className="modern-form">
          <label>
            {newCustomer.customer_type === 'Internal' ? 'Initiative Name' : 'Customer Name'} *
            <input 
              name="customer_name" 
              value={newCustomer.customer_name} 
              onChange={handleNewCustomerChange} 
              required 
              placeholder={newCustomer.customer_type === 'Internal' ? 'e.g., Q4 Company Retreat, Annual Training' : 'Enter customer name'}
            />
          </label>
          
          <label>
            Account Manager *
            <input 
              name="account_manager" 
              value={newCustomer.account_manager} 
              onChange={handleNewCustomerChange} 
              required 
              placeholder="Enter account manager name"
            />
          </label>
          
          <label>
            Country *
            <select 
              name="country" 
              value={newCustomer.country} 
              onChange={handleNewCustomerChange} 
              required
            >
              <option value="">Select Country</option>
              {countryOptions}
            </select>
          </label>
          
          <label>
            Type *
            <select 
              name="customer_type" 
              value={newCustomer.customer_type} 
              onChange={handleNewCustomerChange}
              required
            >
              <option value="External">External Customer</option>
              <option value="Internal">Internal Initiative</option>
            </select>
          </label>
          
          {/* Only show additional fields for External customers */}
          {newCustomer.customer_type === 'External' && (
            <>
              <label>
                Year First Closed
                <input 
                  name="year_first_closed" 
                  type="number"
                  min="2000"
                  max={new Date().getFullYear()}
                  value={newCustomer.year_first_closed} 
                  onChange={handleNewCustomerChange}
                  placeholder="e.g., 2022"
                />
              </label>
              
              <label>
                Company Size
                <select 
                  name="company_size" 
                  value={newCustomer.company_size} 
                  onChange={handleNewCustomerChange}
                >
                  <option value="">Select Company Size</option>
                  {companySizeOptions}
                </select>
              </label>
              
              <label>
                Annual Revenue
                <select 
                  name="annual_revenue" 
                  value={newCustomer.annual_revenue} 
                  onChange={handleNewCustomerChange}
                >
                  <option value="">Select Revenue Range</option>
                  {revenueOptions}
                </select>
              </label>
              
              <label>
                Technical Complexity
                <select 
                  name="technical_complexity" 
                  value={newCustomer.technical_complexity} 
                  onChange={handleNewCustomerChange}
                >
                  <option value="Low">Low Complexity</option>
                  <option value="Medium">Medium Complexity</option>
                  <option value="High">High Complexity</option>
                </select>
              </label>
              
              <label>
                Relationship Strength
                <select 
                  name="relationship_strength" 
                  value={newCustomer.relationship_strength} 
                  onChange={handleNewCustomerChange}
                >
                  <option value="Weak">Developing</option>
                  <option value="Medium">Established</option>
                  <option value="Strong">Strategic Partnership</option>
                </select>
              </label>
              
              <label>
                Health Score (1-10)
                <input 
                  name="health_score" 
                  type="number"
                  min="1"
                  max="10"
                  value={newCustomer.health_score} 
                  onChange={handleNewCustomerChange}
                  placeholder="Rate from 1-10"
                />
              </label>
              
              <label style={{ gridColumn: 'span 2' }}>
                Key Stakeholders (comma-separated)
                <input 
                  name="key_stakeholders" 
                  value={newCustomer.key_stakeholders.join(', ')} 
                  onChange={handleNewCustomerChange}
                  placeholder="John Smith, Jane Doe, etc."
                />
              </label>
              
              <label style={{ gridColumn: 'span 2' }}>
                Main Competitors (comma-separated)
                <input 
                  name="competitors" 
                  value={newCustomer.competitors.join(', ')} 
                  onChange={handleNewCustomerChange}
                  placeholder="Company A, Company B, etc."
                />
              </label>
            </>
          )}
          
          <label style={{ gridColumn: 'span 2' }}>
            {newCustomer.customer_type === 'Internal' ? 'Initiative Description' : 'Additional Notes'}
            <textarea 
              name="notes" 
              value={newCustomer.notes} 
              onChange={handleNewCustomerChange}
              rows="3"
              style={{ resize: 'vertical' }}
              placeholder={newCustomer.customer_type === 'Internal' ? 'Describe the internal initiative, goals, timeline, etc.' : 'Any additional information about this customer...'}
            />
          </label>
          
          <div className="modal-actions">
            <button type="button" onClick={handleCloseCustomerModal}>Cancel</button>
            <button type="submit">
              {newCustomer.customer_type === 'Internal' ? 'Create Initiative' : 'Save Customer'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showProjectModal} onClose={handleCloseProjectModal}>
        <h3>Add New Project</h3>
        <form onSubmit={handleAddProject} className="modern-form">
          <label style={{ gridColumn: 'span 2' }}>
            Select Customer ({customers.length} available)
            <select 
              name="customer_id" 
              value={newProject.customer_id} 
              onChange={handleNewProjectChange} 
              required
            >
              <option value="">
                {customers.length === 0 ? 'No customers available - Add one first!' : 'Choose a customer'}
              </option>
              {customerOptions}
            </select>
            {customers.length === 0 && (
              <div style={{ 
                fontSize: '0.8rem', 
                color: 'var(--color-danger)', 
                marginTop: '0.5rem',
                padding: '0.5rem',
                background: 'rgba(239, 68, 68, 0.1)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(239, 68, 68, 0.2)'
              }}>
                ⚠️ No customers found. Please add a customer first using the "Add Customer" button.
              </div>
            )}
          </label>
          
          <label>
            Sales Stage
            <select name="sales_stage" value={newProject.sales_stage} onChange={handleNewProjectChange} required>
              <option value="">Select Sales Stage</option>
              {salesStageOptions}
            </select>
          </label>
          
          <label>
            Product
            <select name="product" value={newProject.product} onChange={handleNewProjectChange} required>
              <option value="">Select Product</option>
              {productOptions}
            </select>
          </label>
          
          <label>
            Deal Value ($)
            <input 
              name="deal_value" 
              type="number" 
              value={newProject.deal_value || ''} 
              onChange={handleNewProjectChange}
              placeholder="Enter deal value"
              min="0"
              step="0.01"
            />
          </label>
          
          <label>
            Backup Presales Engineer
            <input 
              name="backup_presales" 
              value={newProject.backup_presales || ''} 
              onChange={handleNewProjectChange}
              placeholder="Enter backup presales name"
            />
          </label>
          
          <label style={{ gridColumn: 'span 2' }}>
            Project Remarks
            <textarea 
              name="remarks" 
              value={newProject.remarks || ''} 
              onChange={handleNewProjectChange}
              placeholder="Additional project details, requirements, or notes..."
              rows="3"
              style={{ resize: 'vertical' }}
            />
          </label>
       
          <div className="modal-actions">
            <button type="button" onClick={handleCloseProjectModal}>Cancel</button>
            <button type="submit">Create Project</button>
          </div>
        </form>
      </Modal>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}

export default Projects;
