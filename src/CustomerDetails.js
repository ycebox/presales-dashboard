// CustomerDetails.js - Changed from modal to inline editing
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import './CustomerDetails.css';
import {
  FaHome, FaUsers, FaEdit, FaPlus, FaBriefcase, FaTrash, FaSave, FaTimes
} from 'react-icons/fa';

function ProjectModal({ isOpen, onClose, onSave, customerName }) {
  const [newProject, setNewProject] = useState({
    customer_name: customerName || '',
    project_name: '',
    account_manager: '',
    scope: '',
    deal_value: '',
    product: '',
    backup_presales: '',
    sales_stage: '',
    remarks: '',
    due_date: '',
    project_type: ''
  });

  // Update customer_name when prop changes
  useEffect(() => {
    if (customerName) {
      setNewProject(prev => ({ ...prev, customer_name: customerName }));
    }
  }, [customerName]);

  const products = ['Marketplace', 'O-City', 'Processing', 'SmartVista'].sort();
  const salesStages = [
    'Closed-Cancelled/Hold', 'Closed-Lost', 'Closed-Won', 'Contracting', 'Demo', 'Discovery',
    'PoC', 'RFI', 'RFP', 'SoW'
  ].sort();

  const projectTypes = ['RFP', 'CR'].sort();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNewProject(prev => ({ ...prev, [name]: value }));
  };

  const clearForm = () => {
    setNewProject({
      customer_name: customerName || '',
      project_name: '',
      account_manager: '',
      scope: '',
      deal_value: '',
      product: '',
      backup_presales: '',
      sales_stage: '',
      remarks: '',
      due_date: '',
      project_type: ''
    });
  };

  const handleClose = () => {
    clearForm();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!customerName) {
      alert('Customer name is required');
      return;
    }

    try {
      // Prepare project data with proper field mapping
      const projectData = {
        customer_name: customerName,
        account_manager: newProject.account_manager || null,
        scope: newProject.scope || null,
        deal_value: newProject.deal_value ? parseFloat(newProject.deal_value) : null,
        product: newProject.product || null,
        backup_presales: newProject.backup_presales || null,
        sales_stage: newProject.sales_stage,
        remarks: newProject.remarks || null,
        due_date: newProject.due_date || null,
        created_at: new Date().toISOString().split('T')[0]
      };

      // Add project_name and project_type if your table supports them
      if (newProject.project_name) {
        projectData.project_name = newProject.project_name;
      }
      if (newProject.project_type) {
        projectData.project_type = newProject.project_type;
      }

      console.log('Inserting project:', projectData);
      const { data, error } = await supabase.from('projects').insert([projectData]).select();
      
      if (error) {
        console.error('Error details:', error);
        throw error;
      }
      
      if (data && data.length > 0) {
        onSave(data[0]);
        clearForm();
        onClose();
      }
    } catch (error) {
      console.error('Error adding project:', error);
      
      // Handle specific database errors
      if (error.message.includes('column') && error.message.includes('does not exist')) {
        alert('Database schema error: Some fields may not exist in your projects table. Please check the console for details.');
      } else if (error.message.includes('violates')) {
        alert('Data validation error: Please check all required fields and try again.');
      } else {
        alert('Error adding project: ' + error.message);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
        <h3>Add New Project for {customerName || 'Customer'}</h3>
        <form onSubmit={handleSubmit} className="modern-form">
          <label style={{ gridColumn: 'span 2' }}>
            Project Name *
            <input 
              name="project_name" 
              value={newProject.project_name} 
              onChange={handleChange}
              placeholder="Enter project name"
              required
            />
          </label>

          <label>
            Account Manager
            <input 
              name="account_manager" 
              value={newProject.account_manager} 
              onChange={handleChange}
              placeholder="Account manager name"
            />
          </label>

          <label>
            Sales Stage *
            <select name="sales_stage" value={newProject.sales_stage} onChange={handleChange} required>
              <option value="">Select Stage</option>
              {salesStages.map((stage, i) => (
                <option key={i} value={stage}>{stage}</option>
              ))}
            </select>
          </label>
          
          <label>
            Product *
            <select name="product" value={newProject.product} onChange={handleChange} required>
              <option value="">Select Product</option>
              {products.map((product, i) => (
                <option key={i} value={product}>{product}</option>
              ))}
            </select>
          </label>

          <label>
            Project Type
            <select name="project_type" value={newProject.project_type} onChange={handleChange}>
              <option value="">Select Type</option>
              {projectTypes.map((type, i) => (
                <option key={i} value={type}>{type}</option>
              ))}
            </select>
          </label>
          
          <label>
            Deal Value
            <input 
              name="deal_value" 
              type="number" 
              step="0.01"
              value={newProject.deal_value} 
              onChange={handleChange}
              placeholder="Enter deal value (e.g., 50000)"
            />
          </label>
          
          <label>
            Backup Presales
            <input 
              name="backup_presales" 
              value={newProject.backup_presales} 
              onChange={handleChange}
              placeholder="Backup presales contact"
            />
          </label>

          <label>
            Expected Closing Date
            <input 
              name="due_date" 
              type="date"
              value={newProject.due_date} 
              onChange={handleChange}
            />
          </label>
          
          <label style={{ gridColumn: 'span 2' }}>
            Scope
            <textarea 
              name="scope" 
              value={newProject.scope} 
              onChange={handleChange}
              rows="3"
              placeholder="Project scope and objectives"
            />
          </label>
          
          <label style={{ gridColumn: 'span 2' }}>
            Remarks
            <textarea 
              name="remarks" 
              value={newProject.remarks} 
              onChange={handleChange}
              rows="3"
              placeholder="Project remarks or notes"
            />
          </label>
          
          <div className="modal-actions">
            <button type="button" onClick={handleClose}>Cancel</button>
            <button type="submit">Save Project</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CustomerDetails() {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showProjectModal, setShowProjectModal] = useState(false);
  
  // Inline editing states
  const [isEditing, setIsEditing] = useState(false);
  const [editCustomer, setEditCustomer] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (customerId) {
      fetchCustomerDetails();
    }
  }, [customerId]);

  useEffect(() => {
    if (customer?.customer_name) {
      fetchCustomerProjects();
    }
  }, [customer]);

  const fetchCustomerDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();

      if (error) throw error;
      
      if (!data) {
        setError('Customer not found');
        return;
      }
      
      setCustomer(data);
      // Initialize edit state with current customer data
      setEditCustomer(data);
    } catch (error) {
      console.error('Error fetching customer:', error);
      setError('Failed to load customer details: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerProjects = async () => {
    if (!customer?.customer_name) return;
    
    try {
      console.log('Fetching projects for customer:', customer.customer_name);
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('customer_name', customer.customer_name)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching projects:', error);
        setProjects([]);
      } else {
        console.log('Projects found:', data);
        setProjects(data || []);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      setProjects([]);
    }
  };

  // Inline editing handlers
  const handleEditToggle = () => {
    if (isEditing) {
      // Cancel editing - reset to original values
      setEditCustomer(customer);
      setIsEditing(false);
    } else {
      // Start editing
      setIsEditing(true);
    }
  };

  const handleEditChange = (e) => {
    const { name, value, type } = e.target;
    
    if (name === 'key_stakeholders' || name === 'competitors') {
      // Handle comma-separated lists
      const arrayValue = value.split(',').map(item => item.trim()).filter(item => item);
      setEditCustomer(prev => ({ ...prev, [name]: arrayValue }));
    } else if (type === 'number') {
      setEditCustomer(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    } else {
      setEditCustomer(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSaveCustomer = async () => {
    if (!customer?.id) {
      alert('Customer ID is required');
      return;
    }

    try {
      setSaving(true);
      console.log('Updating customer:', editCustomer);
      
      const { data, error } = await supabase
        .from('customers')
        .update(editCustomer)
        .eq('id', customer.id)
        .select();
      
      if (error) {
        console.error('Error details:', error);
        throw error;
      }
      
      if (data && data.length > 0) {
        setCustomer(data[0]);
        setEditCustomer(data[0]);
        setIsEditing(false);
        alert('Customer updated successfully!');
      }
    } catch (error) {
      console.error('Error updating customer:', error);
      alert('Error updating customer: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddProject = () => {
    if (!customer?.customer_name) {
      alert('Customer information not loaded. Please refresh the page.');
      return;
    }
    setShowProjectModal(true);
  };

  const handleProjectSaved = (newProject) => {
    setProjects(prev => [newProject, ...prev]);
    alert('Project added successfully!');
  };

  const handleProjectClick = (projectId, projectName) => {
    if (projectId) {
      navigate(`/project/${projectId}`);
    } else {
      console.log('No project ID found for:', projectName);
      alert('Project details page is not yet available.');
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (!window.confirm('Are you sure you want to delete this project?')) return;
    
    try {
      const { error } = await supabase.from('projects').delete().eq('id', projectId);
      if (error) throw error;
      
      setProjects(prev => prev.filter(p => p.id !== projectId));
      alert('Project deleted successfully!');
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Error deleting project: ' + error.message);
    }
  };

  // Helper functions
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (error) {
      return '-';
    }
  };

  const formatCurrency = (value) => {
    if (!value) return '-';
    try {
      return `$${parseFloat(value).toLocaleString()}`;
    } catch (error) {
      return '-';
    }
  };

  const getComplexityClass = (complexity) => {
    switch (complexity?.toLowerCase()) {
      case 'high': return 'complexity-high';
      case 'medium': return 'complexity-medium';
      case 'low': return 'complexity-low';
      default: return 'complexity-medium';
    }
  };

  const getRelationshipClass = (strength) => {
    switch (strength?.toLowerCase()) {
      case 'strong': return 'relationship-strong';
      case 'medium': return 'relationship-medium';
      case 'weak': return 'relationship-weak';
      default: return 'relationship-medium';
    }
  };

  // Data for dropdowns
  const asiaPacificCountries = [
    "Australia", "Bangladesh", "Brunei", "Cambodia", "China", "Fiji", "India", "Indonesia", "Japan", "Laos", "Malaysia",
    "Myanmar", "Nepal", "New Zealand", "Pakistan", "Papua New Guinea", "Philippines", "Singapore", "Solomon Islands",
    "South Korea", "Sri Lanka", "Thailand", "Timor-Leste", "Tonga", "Vanuatu", "Vietnam"
  ].sort();

  const industryVerticals = [
    'Banking', 'Financial Services', 'Insurance', 'Government', 'Healthcare', 'Education', 
    'Retail', 'Manufacturing', 'Telecommunications', 'Energy & Utilities', 'Transportation', 'Other'
  ].sort();

  const companySizes = [
    'Startup (1-10)', 'Small (11-50)', 'Medium (51-200)', 'Large (201-1000)', 'Enterprise (1000+)'
  ];

  const revenueRanges = [
    'Under $1M', '$1M - $10M', '$10M - $50M', '$50M - $100M', '$100M - $500M', '$500M+'
  ];

  if (loading) {
    return (
      <div className="page-wrapper">
        <div className="loading-state">Loading customer details...</div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="page-wrapper">
        <div className="error-state">
          <p>{error || 'Customer not found'}</p>
          <button onClick={() => navigate('/')} className="back-btn">
            <FaHome /> Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <div className="page-content">
        {/* Back Button */}
        <button onClick={() => navigate('/')} className="back-btn">
          <FaHome /> Back to Dashboard
        </button>

        {/* Customer Header */}
        <div className="customer-header">
          <h1 className="customer-name">{customer.customer_name}</h1>
        </div>

        {/* Customer Information Section with Inline Editing */}
        <div className="section-card">
          <div className="section-header">
            <h3>
              <FaUsers /> Customer Information
            </h3>
            <div className="edit-controls">
              {isEditing ? (
                <>
                  <button 
                    onClick={handleSaveCustomer} 
                    className="save-btn"
                    disabled={saving}
                  >
                    <FaSave /> {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button 
                    onClick={handleEditToggle} 
                    className="cancel-btn"
                    disabled={saving}
                  >
                    <FaTimes /> Cancel
                  </button>
                </>
              ) : (
                <button onClick={handleEditToggle} className="edit-btn">
                  <FaEdit /> Edit Customer
                </button>
              )}
            </div>
          </div>

          <div className="customer-info-grid">
            {/* Left Column */}
            <div className="info-column">
              <div className="info-field">
                <label>Customer Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    name="customer_name"
                    value={editCustomer.customer_name || ''}
                    onChange={handleEditChange}
                    className="inline-edit-input"
                    required
                  />
                ) : (
                  <div className="field-value">{customer.customer_name}</div>
                )}
              </div>

              <div className="info-field">
                <label>Account Manager</label>
                {isEditing ? (
                  <input
                    type="text"
                    name="account_manager"
                    value={editCustomer.account_manager || ''}
                    onChange={handleEditChange}
                    className="inline-edit-input"
                    placeholder="Account manager name"
                  />
                ) : (
                  <div className="field-value">{customer.account_manager || 'Not assigned'}</div>
                )}
              </div>

              <div className="info-field">
                <label>Country</label>
                {isEditing ? (
                  <select
                    name="country"
                    value={editCustomer.country || ''}
                    onChange={handleEditChange}
                    className="inline-edit-select"
                  >
                    <option value="">Select Country</option>
                    {asiaPacificCountries.map((c, i) => (
                      <option key={i} value={c}>{c}</option>
                    ))}
                  </select>
                ) : (
                  <div className="field-value">{customer.country || 'Not specified'}</div>
                )}
              </div>

              <div className="info-field">
                <label>Industry Vertical</label>
                {isEditing ? (
                  <select
                    name="industry_vertical"
                    value={editCustomer.industry_vertical || ''}
                    onChange={handleEditChange}
                    className="inline-edit-select"
                  >
                    <option value="">Select Industry</option>
                    {industryVerticals.map((industry, i) => (
                      <option key={i} value={industry}>{industry}</option>
                    ))}
                  </select>
                ) : (
                  <div className="field-value">{customer.industry_vertical || 'Not specified'}</div>
                )}
              </div>

              <div className="info-field">
                <label>Customer Type</label>
                {isEditing ? (
                  <select
                    name="customer_type"
                    value={editCustomer.customer_type || 'New'}
                    onChange={handleEditChange}
                    className="inline-edit-select"
                  >
                    <option value="New">New</option>
                    <option value="Existing">Existing</option>
                  </select>
                ) : (
                  <div className={`field-value ${customer.customer_type === 'Existing' ? 'existing-customer' : 'new-customer'}`}>
                    {customer.customer_type || 'New'} Customer
                    {customer.customer_type === 'Existing' && customer.year_first_closed && (
                      <span className="year-info"> (since {customer.year_first_closed})</span>
                    )}
                  </div>
                )}
              </div>

              <div className="info-field">
                <label>Year First Closed</label>
                {isEditing ? (
                  <input
                    type="number"
                    name="year_first_closed"
                    value={editCustomer.year_first_closed || ''}
                    onChange={handleEditChange}
                    className="inline-edit-input"
                    min="2000"
                    max={new Date().getFullYear()}
                    placeholder="e.g., 2022"
                  />
                ) : (
                  <div className="field-value">{customer.year_first_closed || 'Not specified'}</div>
                )}
              </div>

              <div className="info-field">
                <label>Company Size</label>
                {isEditing ? (
                  <select
                    name="company_size"
                    value={editCustomer.company_size || ''}
                    onChange={handleEditChange}
                    className="inline-edit-select"
                  >
                    <option value="">Select Size</option>
                    {companySizes.map((size, i) => (
                      <option key={i} value={size}>{size}</option>
                    ))}
                  </select>
                ) : (
                  <div className="field-value">{customer.company_size || 'Not specified'}</div>
                )}
              </div>

              <div className="info-field">
                <label>Annual Revenue</label>
                {isEditing ? (
                  <select
                    name="annual_revenue"
                    value={editCustomer.annual_revenue || ''}
                    onChange={handleEditChange}
                    className="inline-edit-select"
                  >
                    <option value="">Select Revenue Range</option>
                    {revenueRanges.map((range, i) => (
                      <option key={i} value={range}>{range}</option>
                    ))}
                  </select>
                ) : (
                  <div className="field-value">{customer.annual_revenue || 'Not specified'}</div>
                )}
              </div>
            </div>

            {/* Right Column */}
            <div className="info-column">
              <div className="info-field">
                <label>Technical Complexity</label>
                {isEditing ? (
                  <select
                    name="technical_complexity"
                    value={editCustomer.technical_complexity || 'Medium'}
                    onChange={handleEditChange}
                    className="inline-edit-select"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                ) : (
                  <div className={`field-value ${getComplexityClass(customer.technical_complexity)}`}>
                    {customer.technical_complexity || 'Medium'}
                  </div>
                )}
              </div>

              <div className="info-field">
                <label>Relationship Strength</label>
                {isEditing ? (
                  <select
                    name="relationship_strength"
                    value={editCustomer.relationship_strength || 'Medium'}
                    onChange={handleEditChange}
                    className="inline-edit-select"
                  >
                    <option value="Weak">Weak</option>
                    <option value="Medium">Medium</option>
                    <option value="Strong">Strong</option>
                  </select>
                ) : (
                  <div className={`field-value ${getRelationshipClass(customer.relationship_strength)}`}>
                    {customer.relationship_strength || 'Medium'}
                  </div>
                )}
              </div>

              <div className="info-field">
                <label>Health Score (1-10)</label>
                {isEditing ? (
                  <input
                    type="number"
                    name="health_score"
                    value={editCustomer.health_score || 7}
                    onChange={handleEditChange}
                    className="inline-edit-input"
                    min="1"
                    max="10"
                  />
                ) : (
                  <div className="field-value">{customer.health_score || 7}</div>
                )}
              </div>

              <div className="info-field">
                <label>Key Stakeholders</label>
                {isEditing ? (
                  <input
                    type="text"
                    name="key_stakeholders"
                    value={editCustomer.key_stakeholders ? editCustomer.key_stakeholders.join(', ') : ''}
                    onChange={handleEditChange}
                    className="inline-edit-input"
                    placeholder="John Smith, Jane Doe, etc."
                  />
                ) : (
                  <div className="stakeholders-list">
                    {customer.key_stakeholders && customer.key_stakeholders.length > 0 ? (
                      customer.key_stakeholders.map((stakeholder, index) => (
                        <div key={index} className="stakeholder-item">
                          • {stakeholder}
                        </div>
                      ))
                    ) : (
                      <div className="no-data">No stakeholders listed</div>
                    )}
                  </div>
                )}
              </div>

              <div className="info-field">
                <label>Main Competitors</label>
                {isEditing ? (
                  <input
                    type="text"
                    name="competitors"
                    value={editCustomer.competitors ? editCustomer.competitors.join(', ') : ''}
                    onChange={handleEditChange}
                    className="inline-edit-input"
                    placeholder="Company A, Company B, etc."
                  />
                ) : (
                  <div className="competitors-list">
                    {customer.competitors && customer.competitors.length > 0 ? (
                      customer.competitors.map((competitor, index) => (
                        <span key={index} className="competitor-tag">
                          {competitor}
                        </span>
                      ))
                    ) : (
                      <div className="no-data">No competitors listed</div>
                    )}
                  </div>
                )}
              </div>

              <div className="info-field">
                <label>Notes</label>
                {isEditing ? (
                  <textarea
                    name="notes"
                    value={editCustomer.notes || ''}
                    onChange={handleEditChange}
                    className="inline-edit-textarea"
                    rows="3"
                    placeholder="Customer notes..."
                  />
                ) : (
                  <div className="field-value">
                    {customer.notes || 'No notes available'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Projects Section */}
        <div className="section-card">
          <div className="section-header">
            <h3>
              <FaBriefcase /> Projects ({projects.length})
            </h3>
            <button onClick={handleAddProject} className="add-btn" style={{ backgroundColor: '#3b82f6' }}>
              <FaPlus /> Add Project
            </button>
          </div>

          <div className="projects-list">
            {projects.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table className="modern-table">
                  <thead>
                    <tr>
                      <th>Project Name</th>
                      <th>Sales Stage</th>
                      <th>Scope</th>
                      <th style={{ textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((project) => (
                      <tr key={project.id}>
                        <td>
                          <button
                            onClick={() => handleProjectClick(project.id, project.project_name)}
                            className="customer-link-btn"
                            title="View project details"
                            style={{ color: '#1e40af' }}
                          >
                            📁 {project.project_name || project.customer_name || 'Unnamed Project'}
                          </button>
                        </td>
                        <td>{project.sales_stage || '-'}</td>
                        <td style={{ maxWidth: '300px', wordWrap: 'break-word' }}>
                          {project.scope || '-'}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button 
                            className="delete-btn" 
                            onClick={() => handleDeleteProject(project.id)}
                            title="Delete project"
                          >
                            <FaTrash />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="no-projects">
                <p>No projects found for this customer.</p>
                <button onClick={handleAddProject} className="add-first-project-btn">
                  <FaPlus /> Add First Project
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Project Modal */}
      {customer && (
        <ProjectModal
          isOpen={showProjectModal}
          onClose={() => setShowProjectModal(false)}
          onSave={handleProjectSaved}
          customerName={customer.customer_name}
        />
      )}
    </div>
  );
}

export default CustomerDetails;
