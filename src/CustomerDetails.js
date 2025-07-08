// CustomerDetails.js - Enhanced version with inline editing and improved layout
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import './CustomerDetails.css';
import {
  FaHome, FaUsers, FaEdit, FaPlus, FaBriefcase, FaTrash, FaSave, FaTimes
} from 'react-icons/fa';

function StakeholderModal({ isOpen, onClose, onSave, customerName, editingStakeholder = null, editingIndex = null }) {
  const [newStakeholder, setNewStakeholder] = useState({
    name: '',
    role: '',
    email: '',
    phone: ''
  });

  // Initialize form with editing data when editing
  useEffect(() => {
    if (editingStakeholder) {
      setNewStakeholder({
        name: editingStakeholder.name || '',
        role: editingStakeholder.role || '',
        email: editingStakeholder.email || '',
        phone: editingStakeholder.phone || ''
      });
    } else {
      clearForm();
    }
  }, [editingStakeholder, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNewStakeholder(prev => ({ ...prev, [name]: value }));
  };

  const clearForm = () => {
    setNewStakeholder({
      name: '',
      role: '',
      email: '',
      phone: ''
    });
  };

  const handleClose = () => {
    clearForm();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!newStakeholder.name) {
      alert('Stakeholder name is required');
      return;
    }

    // Create stakeholder object with all information
    const stakeholderInfo = {
      name: newStakeholder.name,
      role: newStakeholder.role || '',
      email: newStakeholder.email || '',
      phone: newStakeholder.phone || ''
    };

    onSave(stakeholderInfo, editingIndex);
    clearForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <h3>{editingStakeholder ? 'Edit Stakeholder' : 'Add New Stakeholder'}</h3>
        <form onSubmit={handleSubmit} className="modern-form">
          <label style={{ gridColumn: 'span 2' }}>
            Name *
            <input 
              name="name" 
              value={newStakeholder.name} 
              onChange={handleChange}
              placeholder="Enter stakeholder name"
              required
            />
          </label>

          <label style={{ gridColumn: 'span 2' }}>
            Role/Title
            <input 
              name="role" 
              value={newStakeholder.role} 
              onChange={handleChange}
              placeholder="e.g., CTO, Project Manager, etc."
            />
          </label>

          <label>
            Email
            <input 
              name="email" 
              type="email"
              value={newStakeholder.email} 
              onChange={handleChange}
              placeholder="email@company.com"
            />
          </label>

          <label>
            Phone
            <input 
              name="phone" 
              type="tel"
              value={newStakeholder.phone} 
              onChange={handleChange}
              placeholder="+65 1234 5678"
            />
          </label>
          
          <div className="modal-actions">
            <button type="button" onClick={handleClose}>Cancel</button>
            <button type="submit">{editingStakeholder ? 'Update Stakeholder' : 'Add Stakeholder'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

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
  const [showStakeholderModal, setShowStakeholderModal] = useState(false);
  const [editingStakeholder, setEditingStakeholder] = useState(null);
  const [editingStakeholderIndex, setEditingStakeholderIndex] = useState(null);
  
  // Inline editing states
  const [isEditing, setIsEditing] = useState(false);
  const [editCustomer, setEditCustomer] = useState({});
  const [saving, setSaving] = useState(false);
  
  // Project filtering state
  const [activeTab, setActiveTab] = useState('active');

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

  const handleAddStakeholder = () => {
    setEditingStakeholder(null);
    setEditingStakeholderIndex(null);
    setShowStakeholderModal(true);
  };

  const handleEditStakeholder = (stakeholder, index) => {
    setEditingStakeholder(stakeholder);
    setEditingStakeholderIndex(index);
    setShowStakeholderModal(true);
  };

  const handleStakeholderSaved = async (stakeholderInfo, editingIndex = null) => {
    try {
      // Get current stakeholders or initialize as empty array
      const currentStakeholders = customer.key_stakeholders || [];
      let updatedStakeholders;

      if (editingIndex !== null) {
        // Update existing stakeholder
        updatedStakeholders = [...currentStakeholders];
        updatedStakeholders[editingIndex] = stakeholderInfo;
      } else {
        // Add new stakeholder
        updatedStakeholders = [...currentStakeholders, stakeholderInfo];
      }
      
      // Update customer with new/updated stakeholder
      const { data, error } = await supabase
        .from('customers')
        .update({ key_stakeholders: updatedStakeholders })
        .eq('id', customer.id)
        .select();
      
      if (error) {
        console.error('Error details:', error);
        throw error;
      }
      
      if (data && data.length > 0) {
        setCustomer(data[0]);
        setEditCustomer(data[0]);
        alert(editingIndex !== null ? 'Stakeholder updated successfully!' : 'Stakeholder added successfully!');
      }
    } catch (error) {
      console.error('Error saving stakeholder:', error);
      alert('Error saving stakeholder: ' + error.message);
    }
  };

  const handleDeleteStakeholder = async (stakeholderIndex) => {
    if (!window.confirm('Are you sure you want to remove this stakeholder?')) return;
    
    try {
      // Get current stakeholders and remove the one at the specified index
      const currentStakeholders = customer.key_stakeholders || [];
      const updatedStakeholders = currentStakeholders.filter((_, index) => index !== stakeholderIndex);
      
      // Update customer with updated stakeholders list
      const { data, error } = await supabase
        .from('customers')
        .update({ key_stakeholders: updatedStakeholders })
        .eq('id', customer.id)
        .select();
      
      if (error) {
        console.error('Error details:', error);
        throw error;
      }
      
      if (data && data.length > 0) {
        setCustomer(data[0]);
        setEditCustomer(data[0]);
        alert('Stakeholder removed successfully!');
      }
    } catch (error) {
      console.error('Error removing stakeholder:', error);
      alert('Error removing stakeholder: ' + error.message);
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

  // Helper function to parse stakeholder data
  const parseStakeholder = (stakeholder) => {
    // If it's already an object, return it
    if (typeof stakeholder === 'object' && stakeholder !== null) {
      return stakeholder;
    }
    
    // If it's a string, try to parse it as JSON first
    if (typeof stakeholder === 'string') {
      try {
        const parsed = JSON.parse(stakeholder);
        if (typeof parsed === 'object' && parsed !== null) {
          return parsed;
        }
      } catch (e) {
        // If JSON parsing fails, treat as old format string
        if (stakeholder.includes(' - ')) {
          const [name, role] = stakeholder.split(' - ');
          return { name, role, email: '', phone: '' };
        } else {
          return { name: stakeholder, role: 'Contact', email: '', phone: '' };
        }
      }
    }
    
    // Fallback
    return { name: 'Unknown', role: 'Contact', email: '', phone: '' };
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

  // Project filtering
  const getFilteredProjects = () => {
    switch (activeTab) {
      case 'active':
        return projects.filter(p => !p.sales_stage?.toLowerCase().startsWith('closed'));
      case 'closed':
        return projects.filter(p => p.sales_stage?.toLowerCase().startsWith('closed'));
      case 'all':
      default:
        return projects;
    }
  };

  const getActiveProjectsCount = () => {
    return projects.filter(p => !p.sales_stage?.toLowerCase().startsWith('closed')).length;
  };

  const getClosedProjectsCount = () => {
    return projects.filter(p => p.sales_stage?.toLowerCase().startsWith('closed')).length;
  };

  // Mock data for tasks and activities (you can replace with actual data)
  const mockTasks = [
    { id: 1, name: 'Prepare technical demo', project: 'Mobile Banking Platform', dueDate: 'today' },
    { id: 2, name: 'Review contract terms', project: 'Payment Processing Upgrade', dueDate: 'overdue' },
    { id: 3, name: 'Schedule stakeholder meeting', project: 'Data Analytics Solution', dueDate: 'upcoming' },
    { id: 4, name: 'Update project timeline', project: 'Security Framework', dueDate: 'upcoming' },
    { id: 5, name: 'Prepare PoC results presentation', project: 'Mobile Banking Platform', dueDate: 'upcoming' }
  ];

  const mockActivities = [
    { id: 1, type: 'project', title: 'Project moved to Contracting', meta: 'Payment Processing Upgrade • 2 hours ago' },
    { id: 2, type: 'meeting', title: 'Demo completed successfully', meta: 'Mobile Banking Platform • Yesterday' },
    { id: 3, type: 'email', title: 'Proposal sent to customer', meta: 'Security Framework • 3 days ago' },
    { id: 4, type: 'task', title: 'Task completed: Requirements gathering', meta: 'Data Analytics Solution • 5 days ago' },
    { id: 5, type: 'project', title: 'New project created', meta: 'API Integration Suite • 1 week ago' }
  ];

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

  const filteredProjects = getFilteredProjects();
  const pendingTasksCount = mockTasks.length;
  const overdueTasksCount = mockTasks.filter(t => t.dueDate === 'overdue').length;

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

        {/* Dashboard Overview */}
        <div className="dashboard-overview">
          <div className="overview-card">
            <div className="overview-content">
              <div className="metric-item">
                <div className="metric-value">{getActiveProjectsCount()}</div>
                <div className="metric-label">Active Projects</div>
                <div className="metric-trend trend-up">↗ +2 this quarter</div>
              </div>
              <div className="metric-item">
                <div className="metric-value">{pendingTasksCount}</div>
                <div className="metric-label">Pending Tasks</div>
                <div className="metric-trend">📅 3 due today</div>
              </div>
              <div className="metric-item">
                <div className="metric-value">{overdueTasksCount}</div>
                <div className="metric-label">Overdue Items</div>
                <div className="metric-trend trend-down">⚠️ Needs attention</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="main-content">
          {/* Left Column */}
          <div className="left-column">
            {/* Customer Information (Compact) */}
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

              {isEditing && (
                <div className="editing-indicator">
                  📝 Currently editing - Click Save to confirm changes or Cancel to discard
                </div>
              )}

              <div className="customer-info-compact">
                <div className="info-item">
                  <div className="info-label">Customer Name</div>
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
                    <div className="info-value">{customer.customer_name}</div>
                  )}
                </div>

                <div className="info-item">
                  <div className="info-label">Account Manager</div>
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
                    <div className="info-value">{customer.account_manager || 'Not assigned'}</div>
                  )}
                </div>

                <div className="info-item">
                  <div className="info-label">Country</div>
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
                    <div className="info-value">{customer.country || 'Not specified'}</div>
                  )}
                </div>

                <div className="info-item">
                  <div className="info-label">Industry</div>
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
                    <div className="info-value">{customer.industry_vertical || 'Not specified'}</div>
                  )}
                </div>

                <div className="info-item">
                  <div className="info-label">Company Size</div>
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
                    <div className="info-value">{customer.company_size || 'Not specified'}</div>
                  )}
                </div>

                <div className="info-item">
                  <div className="info-label">Customer Since</div>
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
                    <div className="info-value">{customer.year_first_closed || 'Not specified'}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Key Stakeholders - moved under customer information */}
            <div className="section-card">
              <div className="section-header">
                <h3>👤 Key Stakeholders</h3>
                <button className="btn btn-secondary" onClick={handleAddStakeholder}>
                  Add Contact
                </button>
              </div>
              <div className="stakeholder-grid">
                {customer.key_stakeholders && customer.key_stakeholders.length > 0 ? (
                  customer.key_stakeholders.map((stakeholder, index) => {
                    const parsedStakeholder = parseStakeholder(stakeholder);
                    const { name, role, email, phone } = parsedStakeholder;

                    return (
                      <div key={index} className="stakeholder-card">
                        <div className="stakeholder-header">
                          <div className="stakeholder-info">
                            <div className="stakeholder-name">{name}</div>
                            <div className="stakeholder-role">{role || 'Contact'}</div>
                            {email && (
                              <div className="stakeholder-contact">
                                <span className="contact-icon">✉️</span>
                                <a href={`mailto:${email}`} className="stakeholder-email">{email}</a>
                              </div>
                            )}
                            {phone && (
                              <div className="stakeholder-contact">
                                <span className="contact-icon">📞</span>
                                <a href={`tel:${phone}`} className="stakeholder-phone">{phone}</a>
                              </div>
                            )}
                          </div>
                          <div className="stakeholder-actions">
                            <button 
                              className="stakeholder-action-btn edit-action"
                              onClick={() => handleEditStakeholder(parsedStakeholder, index)}
                              title="Edit stakeholder"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="m18.5 2.5 a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                              </svg>
                            </button>
                            <button 
                              className="stakeholder-action-btn delete-action"
                              onClick={() => handleDeleteStakeholder(index)}
                              title="Remove stakeholder"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3,6 5,6 21,6"/>
                                <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"/>
                                <line x1="10" y1="11" x2="10" y2="17"/>
                                <line x1="14" y1="11" x2="14" y2="17"/>
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="stakeholder-card stakeholder-empty">
                    <div className="stakeholder-name">No stakeholders added</div>
                    <div className="stakeholder-role">Click "Add Contact" to add stakeholders</div>
                  </div>
                )}
              </div>
            </div>

            {/* Projects Section with Filtering */}
            <div className="section-card">
              <div className="section-header">
                <h3>
                  <FaBriefcase /> Projects Portfolio
                </h3>
                <div className="section-controls">
                  <button onClick={handleAddProject} className="add-btn">
                    <FaPlus /> Add Project
                  </button>
                </div>
              </div>

              <div className="projects-tabs">
                <button 
                  className={`tab-button ${activeTab === 'active' ? 'active' : ''}`}
                  onClick={() => setActiveTab('active')}
                >
                  Active Projects ({getActiveProjectsCount()})
                </button>
                <button 
                  className={`tab-button ${activeTab === 'closed' ? 'active' : ''}`}
                  onClick={() => setActiveTab('closed')}
                >
                  Closed Projects ({getClosedProjectsCount()})
                </button>
                <button 
                  className={`tab-button ${activeTab === 'all' ? 'active' : ''}`}
                  onClick={() => setActiveTab('all')}
                >
                  All Projects ({projects.length})
                </button>
              </div>

              <div className="tab-content">
                {filteredProjects.length > 0 ? (
                  filteredProjects.map((project) => (
                    <div key={project.id} className="project-item">
                      <div className="project-header">
                        <button
                          onClick={() => handleProjectClick(project.id, project.project_name)}
                          className="project-name"
                        >
                          📁 {project.project_name || project.customer_name || 'Unnamed Project'}
                        </button>
                        <span className={`project-stage stage-${project.sales_stage?.toLowerCase().replace(/[\s-]/g, '-')}`}>
                          {project.sales_stage || 'No Stage'}
                        </span>
                      </div>
                      <div className="project-details">
                        <div className="project-meta">
                          Due: {formatDate(project.due_date)} • Account Manager: {project.account_manager || 'Not assigned'}
                        </div>
                        <div className="project-value">
                          {formatCurrency(project.deal_value)}
                        </div>
                      </div>
                      {project.scope && (
                        <div className="project-scope">
                          {project.scope}
                        </div>
                      )}
                      <div className="project-actions">
                        <button 
                          className="delete-btn" 
                          onClick={() => handleDeleteProject(project.id)}
                          title="Delete project"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">
                    <div className="empty-state-icon">📁</div>
                    <p>No projects found for this filter.</p>
                    {activeTab === 'active' && (
                      <button onClick={handleAddProject} className="add-first-project-btn">
                        <FaPlus /> Add First Project
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="right-column">
            {/* Task List */}
            <div className="section-card">
              <div className="section-header">
                <h3>✓ Active Tasks</h3>
                <div className="filter-toggle">
                  <button className="active">My Tasks</button>
                  <button>All Tasks</button>
                </div>
              </div>
              <div className="tasks-content">
                {mockTasks.map((task) => (
                  <div key={task.id} className="task-item">
                    <input type="checkbox" className="task-checkbox" />
                    <div className="task-content">
                      <div className="task-name">{task.name}</div>
                      <div className="task-project">{task.project}</div>
                    </div>
                    <div className={`task-due due-${task.dueDate}`}>
                      {task.dueDate === 'today' ? 'Today' : 
                       task.dueDate === 'overdue' ? '2 days overdue' : 
                       task.dueDate === 'upcoming' ? 'Tomorrow' : task.dueDate}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="section-card">
              <div className="section-header">
                <h3>📈 Recent Activity</h3>
                <button className="btn btn-secondary">View All</button>
              </div>
              <div className="activity-content">
                {mockActivities.map((activity) => (
                  <div key={activity.id} className="timeline-item">
                    <div className={`timeline-icon ${activity.type}`}>
                      {activity.type === 'project' ? '📁' : 
                       activity.type === 'meeting' ? '📅' : 
                       activity.type === 'email' ? '✉️' : 
                       activity.type === 'task' ? '✓' : '📝'}
                    </div>
                    <div className="timeline-content">
                      <div className="timeline-title">{activity.title}</div>
                      <div className="timeline-meta">{activity.meta}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Stakeholder Modal */}
      {customer && (
        <StakeholderModal
          isOpen={showStakeholderModal}
          onClose={() => {
            setShowStakeholderModal(false);
            setEditingStakeholder(null);
            setEditingStakeholderIndex(null);
          }}
          onSave={handleStakeholderSaved}
          customerName={customer.customer_name}
          editingStakeholder={editingStakeholder}
          editingIndex={editingStakeholderIndex}
        />
      )}

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
