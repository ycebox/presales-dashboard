// CustomerDetails.js - Updated to use existing projects table structure
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import './CustomerDetails.css';
import {
  FaHome, FaUsers, FaEdit, FaPlus, FaBriefcase, FaTrash
} from 'react-icons/fa';

function ProjectModal({ isOpen, onClose, onSave, customerName }) {
  const [newProject, setNewProject] = useState({
    customer_name: customerName,
    account_manager: '',
    scope: '',
    deal_value: '',
    product: '',
    backup_presales: '',
    sales_stage: '',
    remarks: '',
    due_date: '',
    created_at: new Date().toISOString().split('T')[0] // Today's date
  });

  const products = ['Marketplace', 'O-City', 'Processing', 'SmartVista'].sort();
  const salesStages = [
    'Closed-Cancelled/Hold', 'Closed-Lost', 'Closed-Won', 'Contracting', 'Demo', 'Discovery',
    'PoC', 'RFI', 'RFP', 'SoW'
  ].sort();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNewProject(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Convert deal_value to number if provided
      const projectData = {
        ...newProject,
        deal_value: newProject.deal_value ? parseFloat(newProject.deal_value) : null
      };

      console.log('Inserting project:', projectData);
      const { data, error } = await supabase.from('projects').insert([projectData]).select();
      
      if (error) {
        console.error('Error details:', error);
        throw error;
      }
      
      onSave(data[0]);
      // Reset form
      setNewProject({
        customer_name: customerName,
        account_manager: '',
        scope: '',
        deal_value: '',
        product: '',
        backup_presales: '',
        sales_stage: '',
        remarks: '',
        due_date: '',
        created_at: new Date().toISOString().split('T')[0]
      });
      onClose();
    } catch (error) {
      console.error('Error adding project:', error);
      alert('Error adding project: ' + error.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
        <h3>Add New Project for {customerName}</h3>
        <form onSubmit={handleSubmit} className="modern-form">
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
            Due Date
            <input 
              name="due_date" 
              type="date"
              value={newProject.due_date} 
              onChange={handleChange}
            />
          </label>

          <label>
            Created At
            <input 
              name="created_at" 
              type="date"
              value={newProject.created_at} 
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
            <button type="button" onClick={onClose}>Cancel</button>
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
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();

      if (error) throw error;
      setCustomer(data);
    } catch (error) {
      console.error('Error fetching customer:', error);
      setError('Failed to load customer details');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerProjects = async () => {
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

  const handleEditCustomer = () => {
    console.log('Edit customer:', customerId);
    alert('Edit customer functionality coming soon!');
  };

  const handleAddProject = () => {
    setShowProjectModal(true);
  };

  const handleProjectSaved = (newProject) => {
    setProjects(prev => [newProject, ...prev]);
    alert('Project added successfully!');
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

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (value) => {
    if (!value) return '-';
    return `$${parseFloat(value).toLocaleString()}`;
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

        {/* Customer Header - Simplified */}
        <div className="customer-header">
          <h1 className="customer-name">{customer.customer_name}</h1>
        </div>

        {/* Customer Information Section */}
        <div className="section-card">
          <div className="section-header">
            <h3>
              <FaUsers /> Customer Information
            </h3>
            <button onClick={handleEditCustomer} className="edit-btn">
              <FaEdit /> Edit Customer
            </button>
          </div>

          <div className="customer-info-grid">
            {/* Left Column */}
            <div className="info-column">
              <div className="info-field">
                <label>Account Manager</label>
                <div className="field-value">{customer.account_manager || 'Not assigned'}</div>
              </div>
              <div className="info-field">
                <label>Country</label>
                <div className="field-value">{customer.country || 'Not specified'}</div>
              </div>
              <div className="info-field">
                <label>Industry Vertical</label>
                <div className="field-value">{customer.industry_vertical || 'Not specified'}</div>
              </div>
              <div className="info-field">
                <label>Customer Type</label>
                <div className={`field-value ${customer.customer_type === 'Existing' ? 'existing-customer' : 'new-customer'}`}>
                  {customer.customer_type || 'New'} Customer
                  {customer.customer_type === 'Existing' && customer.year_first_closed && (
                    <span className="year-info"> (since {customer.year_first_closed})</span>
                  )}
                </div>
              </div>
              <div className="info-field">
                <label>Company Size</label>
                <div className="field-value">{customer.company_size || 'Not specified'}</div>
              </div>
              <div className="info-field">
                <label>Annual Revenue</label>
                <div className="field-value">{customer.annual_revenue || 'Not specified'}</div>
              </div>
            </div>

            {/* Right Column */}
            <div className="info-column">
              <div className="info-field">
                <label>Technical Complexity</label>
                <div className={`field-value ${getComplexityClass(customer.technical_complexity)}`}>
                  {customer.technical_complexity || 'Medium'}
                </div>
              </div>
              <div className="info-field">
                <label>Relationship Strength</label>
                <div className={`field-value ${getRelationshipClass(customer.relationship_strength)}`}>
                  {customer.relationship_strength || 'Medium'}
                </div>
              </div>
              <div className="info-field">
                <label>Key Stakeholders</label>
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
              </div>
              <div className="info-field">
                <label>Main Competitors</label>
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
              </div>
              <div className="info-field">
                <label>Notes</label>
                <div className="field-value">
                  {customer.notes || 'No notes available'}
                </div>
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
                      <th>Account Manager</th>
                      <th>Sales Stage</th>
                      <th>Product</th>
                      <th>Deal Value</th>
                      <th>Scope</th>
                      <th>Backup Presales</th>
                      <th>Due Date</th>
                      <th>Created At</th>
                      <th>Remarks</th>
                      <th style={{ textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((project) => (
                      <tr key={project.id}>
                        <td>{project.account_manager || '-'}</td>
                        <td>{project.sales_stage || '-'}</td>
                        <td>{project.product || '-'}</td>
                        <td>{formatCurrency(project.deal_value)}</td>
                        <td style={{ maxWidth: '200px', wordWrap: 'break-word' }}>
                          {project.scope || '-'}
                        </td>
                        <td>{project.backup_presales || '-'}</td>
                        <td>{formatDate(project.due_date)}</td>
                        <td>{formatDate(project.created_at)}</td>
                        <td style={{ maxWidth: '200px', wordWrap: 'break-word' }}>
                          {project.remarks || '-'}
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
      <ProjectModal
        isOpen={showProjectModal}
        onClose={() => setShowProjectModal(false)}
        onSave={handleProjectSaved}
        customerName={customer.customer_name}
      />
    </div>
  );
}

export default CustomerDetails;
