// CustomerDetails.js - Complete Modern Minimalist Version
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import './CustomerDetails.css';
import {
  FaHome, FaUsers, FaEdit, FaPlus, FaBriefcase, FaTrash, FaSave, FaTimes,
  FaBuilding, FaGlobe, FaIndustry, FaCalendarAlt, FaChartLine, FaCheckCircle,
  FaClock, FaExclamationTriangle, FaEnvelope, FaPhone, FaDollarSign, FaTasks,
  FaArrowRight, FaSparkles, FaTarget, FaAward, FaTrendingUp, FaUserCheck,
  FaCalendar, FaFlag, FaPaperPlane, FaLightbulb, FaShieldAlt
} from 'react-icons/fa';

// Enhanced Stakeholder Modal
function StakeholderModal({ isOpen, onClose, onSave, customerName, editingStakeholder = null, editingIndex = null }) {
  const [newStakeholder, setNewStakeholder] = useState({
    name: '',
    role: '',
    email: '',
    phone: ''
  });

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
    setNewStakeholder({ name: '', role: '', email: '', phone: '' });
  };

  const handleClose = () => {
    clearForm();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newStakeholder.name.trim()) {
      alert('Stakeholder name is required');
      return;
    }

    const stakeholderInfo = {
      name: newStakeholder.name.trim(),
      role: newStakeholder.role.trim() || '',
      email: newStakeholder.email.trim() || '',
      phone: newStakeholder.phone.trim() || ''
    };

    onSave(stakeholderInfo, editingIndex);
    clearForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-container stakeholder-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <div className="modal-icon">
              <FaUserCheck />
            </div>
            <h2>{editingStakeholder ? 'Edit Contact' : 'Add New Contact'}</h2>
          </div>
          <button className="modal-close" onClick={handleClose}>
            <FaTimes />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-grid">
            <div className="form-field full-width">
              <label className="field-label">
                <FaUsers className="field-icon" />
                Full Name
              </label>
              <input 
                name="name" 
                value={newStakeholder.name} 
                onChange={handleChange}
                placeholder="Enter full name"
                className="field-input"
                required
                autoFocus
              />
            </div>

            <div className="form-field">
              <label className="field-label">
                <FaBriefcase className="field-icon" />
                Role / Title
              </label>
              <input 
                name="role" 
                value={newStakeholder.role} 
                onChange={handleChange}
                placeholder="e.g., CTO, Project Manager"
                className="field-input"
              />
            </div>

            <div className="form-field">
              <label className="field-label">
                <FaEnvelope className="field-icon" />
                Email Address
              </label>
              <input 
                name="email" 
                type="email"
                value={newStakeholder.email} 
                onChange={handleChange}
                placeholder="name@company.com"
                className="field-input"
              />
            </div>

            <div className="form-field">
              <label className="field-label">
                <FaPhone className="field-icon" />
                Phone Number
              </label>
              <input 
                name="phone" 
                type="tel"
                value={newStakeholder.phone} 
                onChange={handleChange}
                placeholder="+65 1234 5678"
                className="field-input"
              />
            </div>
          </div>
          
          <div className="modal-actions">
            <button type="button" onClick={handleClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <FaSave />
              {editingStakeholder ? 'Update Contact' : 'Add Contact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Enhanced Project Modal
function ProjectModal({ isOpen, onClose, onSave, customerName, editingProject = null }) {
  const [projectData, setProjectData] = useState({
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

  useEffect(() => {
    if (editingProject) {
      setProjectData({
        customer_name: editingProject.customer_name || customerName || '',
        project_name: editingProject.project_name || '',
        account_manager: editingProject.account_manager || '',
        scope: editingProject.scope || '',
        deal_value: editingProject.deal_value || '',
        product: editingProject.product || '',
        backup_presales: editingProject.backup_presales || '',
        sales_stage: editingProject.sales_stage || '',
        remarks: editingProject.remarks || '',
        due_date: editingProject.due_date || '',
        project_type: editingProject.project_type || ''
      });
    } else if (customerName) {
      setProjectData({
        customer_name: customerName,
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
    }
  }, [customerName, editingProject, isOpen]);

  const products = ['Marketplace', 'O-City', 'Processing', 'SmartVista'].sort();
  const salesStages = [
    'Discovery', 'Demo', 'PoC', 'RFI', 'RFP', 'SoW', 
    'Contracting', 'Closed-Won', 'Closed-Lost', 'Closed-Cancelled/Hold'
  ];
  const projectTypes = ['RFP', 'CR'].sort();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProjectData(prev => ({ ...prev, [name]: value }));
  };

  const clearForm = () => {
    setProjectData({
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
    if (!editingProject) {
      clearForm();
    }
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!customerName && !projectData.customer_name) {
      alert('Customer name is required');
      return;
    }

    if (!projectData.project_name?.trim()) {
      alert('Project name is required');
      return;
    }

    if (!projectData.sales_stage) {
      alert('Sales stage is required');
      return;
    }

    if (!projectData.product) {
      alert('Product is required');
      return;
    }

    try {
      const submissionData = {
        customer_name: customerName || projectData.customer_name,
        project_name: projectData.project_name.trim(),
        account_manager: projectData.account_manager?.trim() || null,
        scope: projectData.scope?.trim() || null,
        deal_value: projectData.deal_value ? parseFloat(projectData.deal_value) : null,
        product: projectData.product,
        backup_presales: projectData.backup_presales?.trim() || null,
        sales_stage: projectData.sales_stage,
        remarks: projectData.remarks?.trim() || null,
        due_date: projectData.due_date || null,
        project_type: projectData.project_type || null
      };

      let result;
      
      if (editingProject) {
        const { data, error } = await supabase
          .from('projects')
          .update(submissionData)
          .eq('id', editingProject.id)
          .select();
        
        if (error) throw error;
        result = { data, isEdit: true };
      } else {
        submissionData.created_at = new Date().toISOString().split('T')[0];
        
        const { data, error } = await supabase
          .from('projects')
          .insert([submissionData])
          .select();
        
        if (error) throw error;
        result = { data, isEdit: false };
      }
      
      if (result.data && result.data.length > 0) {
        onSave(result.data[0], result.isEdit);
        if (!editingProject) {
          clearForm();
        }
        onClose();
      }
    } catch (error) {
      console.error('Error saving project:', error);
      alert(`Error ${editingProject ? 'updating' : 'adding'} project: ${error.message}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-container project-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <div className="modal-icon">
              <FaBriefcase />
            </div>
            <h2>
              {editingProject 
                ? `Edit ${editingProject.project_name || 'Project'}` 
                : `New Project for ${customerName}`
              }
            </h2>
          </div>
          <button className="modal-close" onClick={handleClose}>
            <FaTimes />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-grid">
            <div className="form-field full-width">
              <label className="field-label">
                <FaTarget className="field-icon" />
                Project Name
              </label>
              <input 
                name="project_name" 
                value={projectData.project_name} 
                onChange={handleChange}
                placeholder="Enter project name"
                className="field-input"
                required
                autoFocus
              />
            </div>

            <div className="form-field">
              <label className="field-label">
                <FaUsers className="field-icon" />
                Account Manager
              </label>
              <input 
                name="account_manager" 
                value={projectData.account_manager} 
                onChange={handleChange}
                placeholder="Account manager name"
                className="field-input"
              />
            </div>

            <div className="form-field">
              <label className="field-label">
                <FaTrendingUp className="field-icon" />
                Sales Stage
              </label>
              <select 
                name="sales_stage" 
                value={projectData.sales_stage} 
                onChange={handleChange} 
                className="field-select"
                required
              >
                <option value="">Select Stage</option>
                {salesStages.map((stage, i) => (
                  <option key={i} value={stage}>{stage}</option>
                ))}
              </select>
            </div>
            
            <div className="form-field">
              <label className="field-label">
                <FaSparkles className="field-icon" />
                Product
              </label>
              <select 
                name="product" 
                value={projectData.product} 
                onChange={handleChange} 
                className="field-select"
                required
              >
                <option value="">Select Product</option>
                {products.map((product, i) => (
                  <option key={i} value={product}>{product}</option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label className="field-label">
                <FaFlag className="field-icon" />
                Project Type
              </label>
              <select 
                name="project_type" 
                value={projectData.project_type} 
                onChange={handleChange}
                className="field-select"
              >
                <option value="">Select Type</option>
                {projectTypes.map((type, i) => (
                  <option key={i} value={type}>{type}</option>
                ))}
              </select>
            </div>
            
            <div className="form-field">
              <label className="field-label">
                <FaDollarSign className="field-icon" />
                Deal Value (USD)
              </label>
              <input 
                name="deal_value" 
                type="number" 
                step="0.01"
                value={projectData.deal_value} 
                onChange={handleChange}
                placeholder="0.00"
                className="field-input"
              />
            </div>
            
            <div className="form-field">
              <label className="field-label">
                <FaShieldAlt className="field-icon" />
                Backup Presales
              </label>
              <input 
                name="backup_presales" 
                value={projectData.backup_presales} 
                onChange={handleChange}
                placeholder="Backup contact"
                className="field-input"
              />
            </div>

            <div className="form-field">
              <label className="field-label">
                <FaCalendar className="field-icon" />
                Expected Close Date
              </label>
              <input 
                name="due_date" 
                type="date"
                value={projectData.due_date} 
                onChange={handleChange}
                className="field-input"
              />
            </div>
            
            <div className="form-field full-width">
              <label className="field-label">
                <FaLightbulb className="field-icon" />
                Project Scope
              </label>
              <textarea 
                name="scope" 
                value={projectData.scope} 
                onChange={handleChange}
                rows="3"
                placeholder="Describe the project scope and objectives..."
                className="field-textarea"
              />
            </div>
            
            <div className="form-field full-width">
              <label className="field-label">
                <FaEdit className="field-icon" />
                Remarks & Notes
              </label>
              <textarea 
                name="remarks" 
                value={projectData.remarks} 
                onChange={handleChange}
                rows="3"
                placeholder="Add any additional notes or remarks..."
                className="field-textarea"
              />
            </div>
          </div>
          
          <div className="modal-actions">
            <button type="button" onClick={handleClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <FaSave />
              {editingProject ? 'Update Project' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Enhanced Task Modal
function TaskModal({ isOpen, onClose, onSave, editingTask = null }) {
  const [taskData, setTaskData] = useState({
    description: '',
    status: 'Not Started',
    due_date: '',
    notes: ''
  });

  useEffect(() => {
    if (editingTask) {
      setTaskData({
        description: editingTask.description || '',
        status: editingTask.status || 'Not Started',
        due_date: editingTask.due_date || '',
        notes: editingTask.notes || ''
      });
    } else {
      setTaskData({
        description: '',
        status: 'Not Started',
        due_date: '',
        notes: ''
      });
    }
  }, [editingTask, isOpen]);

  const taskStatuses = [
    { value: 'Not Started', icon: FaClock, color: 'gray' },
    { value: 'In Progress', icon: FaSparkles, color: 'blue' },
    { value: 'Completed', icon: FaCheckCircle, color: 'green' },
    { value: 'Cancelled/On-hold', icon: FaExclamationTriangle, color: 'red' }
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setTaskData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!taskData.description.trim()) {
      alert('Task description is required');
      return;
    }
    onSave(taskData);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container task-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <div className="modal-icon">
              <FaTasks />
            </div>
            <h2>{editingTask ? 'Edit Task' : 'Add New Task'}</h2>
          </div>
          <button className="modal-close" onClick={onClose}>
            <FaTimes />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-grid">
            <div className="form-field full-width">
              <label className="field-label">
                <FaTarget className="field-icon" />
                Task Description
              </label>
              <input 
                name="description" 
                value={taskData.description} 
                onChange={handleChange}
                placeholder="What needs to be done?"
                className="field-input"
                required
                autoFocus
              />
            </div>

            <div className="form-field">
              <label className="field-label">
                <FaTrendingUp className="field-icon" />
                Status
              </label>
              <select 
                name="status" 
                value={taskData.status} 
                onChange={handleChange}
                className="field-select"
              >
                {taskStatuses.map((status, i) => (
                  <option key={i} value={status.value}>
                    {status.value}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label className="field-label">
                <FaCalendar className="field-icon" />
                Due Date
              </label>
              <input 
                name="due_date" 
                type="date"
                value={taskData.due_date} 
                onChange={handleChange}
                className="field-input"
              />
            </div>

            <div className="form-field full-width">
              <label className="field-label">
                <FaEdit className="field-icon" />
                Additional Notes
              </label>
              <textarea 
                name="notes" 
                value={taskData.notes} 
                onChange={handleChange}
                rows="3"
                placeholder="Add any additional details or context..."
                className="field-textarea"
              />
            </div>
          </div>
          
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <FaSave />
              {editingTask ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Main CustomerDetails Component
function CustomerDetails() {
  const { customerId } = useParams();
  const navigate = useNavigate();
  
  // Core state
  const [customer, setCustomer] = useState(null);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Modal states
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showStakeholderModal, setShowStakeholderModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingStakeholder, setEditingStakeholder] = useState(null);
  const [editingStakeholderIndex, setEditingStakeholderIndex] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [editingProject, setEditingProject] = useState(null);
  
  // Inline editing states
  const [isEditing, setIsEditing] = useState(false);
  const [editCustomer, setEditCustomer] = useState({});
  const [saving, setSaving] = useState(false);
  
  // Filter states
  const [activeTab, setActiveTab] = useState('active');
  const [taskFilter, setTaskFilter] = useState('active');
  
  // Data arrays for dropdowns
  const asiaPacificCountries = [
    "Australia", "Bangladesh", "Brunei", "Cambodia", "China", "Fiji", "India", "Indonesia", 
    "Japan", "Laos", "Malaysia", "Myanmar", "Nepal", "New Zealand", "Pakistan", 
    "Papua New Guinea", "Philippines", "Singapore", "Solomon Islands", "South Korea", 
    "Sri Lanka", "Thailand", "Timor-Leste", "Tonga", "Vanuatu", "Vietnam"
  ].sort();

  const industryVerticals = [
    'Banking', 'Financial Services', 'Insurance', 'Government', 'Healthcare', 'Education', 
    'Retail', 'Manufacturing', 'Telecommunications', 'Energy & Utilities', 'Transportation', 'Other'
  ].sort();

  const companySizes = [
    'Startup (1-10)', 'Small (11-50)', 'Medium (51-200)', 'Large (201-1000)', 'Enterprise (1000+)'
  ];

  // useEffect hooks for data fetching
  useEffect(() => {
    if (customerId) {
      fetchCustomerDetails();
    }
  }, [customerId]);

  useEffect(() => {
    if (customer?.customer_name) {
      fetchCustomerProjects();
      fetchCustomerTasks();
    }
  }, [customer]);

  // Data fetching functions
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
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('customer_name', customer.customer_name)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching projects:', error);
        setProjects([]);
      } else {
        setProjects(data || []);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      setProjects([]);
    }
  };

  const fetchCustomerTasks = async () => {
    if (!customer?.customer_name) return;
    
    try {
      const { data: customerProjects, error: projectsError } = await supabase
        .from('projects')
        .select('id')
        .eq('customer_name', customer.customer_name);

      if (projectsError) {
        console.error('Error fetching customer projects for tasks:', projectsError);
        setTasks([]);
        return;
      }

      if (!customerProjects || customerProjects.length === 0) {
        setTasks([]);
        return;
      }

      const projectIds = customerProjects.map(p => p.id);

      const { data: customerTasks, error: tasksError } = await supabase
        .from('project_tasks')
        .select(`
          *,
          projects!inner(project_name, customer_name)
        `)
        .in('project_id', projectIds)
        .order('created_at', { ascending: false });

      if (tasksError) {
        console.error('Error fetching tasks:', tasksError);
        setTasks([]);
      } else {
        setTasks(customerTasks || []);
      }
    } catch (error) {
      console.error('Error fetching customer tasks:', error);
      setTasks([]);
    }
  };

  // Task management handlers
  const handleTaskStatusChange = async (taskId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'Completed' ? 'Not Started' : 'Completed';
      
      const { error } = await supabase
        .from('project_tasks')
        .update({ status: newStatus })
        .eq('id', taskId);

      if (error) throw error;
      
      await fetchCustomerTasks();
    } catch (error) {
      console.error('Error updating task status:', error);
      alert('Error updating task status: ' + error.message);
    }
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setShowTaskModal(true);
  };

  const handleTaskSaved = async (taskData) => {
    try {
      if (editingTask) {
        const { error } = await supabase
          .from('project_tasks')
          .update(taskData)
          .eq('id', editingTask.id);

        if (error) throw error;
        alert('Task updated successfully!');
      } else {
        alert('Task creation not available from customer view. Please use project details.');
        return;
      }

      setShowTaskModal(false);
      setEditingTask(null);
      await fetchCustomerTasks();
    } catch (error) {
      console.error('Error saving task:', error);
      alert('Error saving task: ' + error.message);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;

    try {
      const { error } = await supabase
        .from('project_tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
      
      alert('Task deleted successfully!');
      await fetchCustomerTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Error deleting task: ' + error.message);
    }
  };

  // Inline editing handlers
  const handleEditToggle = () => {
    if (isEditing) {
      setEditCustomer(customer);
      setIsEditing(false);
    } else {
      setIsEditing(true);
    }
  };

  const handleEditChange = (e) => {
    const { name, value, type } = e.target;
    
    if (name === 'key_stakeholders' || name === 'competitors') {
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
      
      const { data, error } = await supabase
        .from('customers')
        .update(editCustomer)
        .eq('id', customer.id)
        .select();
      
      if (error) throw error;
      
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

  // Stakeholder management handlers
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
      const currentStakeholders = customer.key_stakeholders || [];
      let updatedStakeholders;

      if (editingIndex !== null) {
        updatedStakeholders = [...currentStakeholders];
        updatedStakeholders[editingIndex] = stakeholderInfo;
      } else {
        updatedStakeholders = [...currentStakeholders, stakeholderInfo];
      }
      
      const { data, error } = await supabase
        .from('customers')
        .update({ key_stakeholders: updatedStakeholders })
        .eq('id', customer.id)
        .select();
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        setCustomer(data[0]);
        setEditCustomer(data[0]);
        alert(editingIndex !== null ? 'Contact updated successfully!' : 'Contact added successfully!');
      }
    } catch (error) {
      console.error('Error saving stakeholder:', error);
      alert('Error saving contact: ' + error.message);
    }
  };

  const handleDeleteStakeholder = async (stakeholderIndex) => {
    if (!window.confirm('Are you sure you want to remove this contact?')) return;
    
    try {
      const currentStakeholders = customer.key_stakeholders || [];
      const updatedStakeholders = currentStakeholders.filter((_, index) => index !== stakeholderIndex);
      
      const { data, error } = await supabase
        .from('customers')
        .update({ key_stakeholders: updatedStakeholders })
        .eq('id', customer.id)
        .select();
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        setCustomer(data[0]);
        setEditCustomer(data[0]);
        alert('Contact removed successfully!');
      }
    } catch (error) {
      console.error('Error removing stakeholder:', error);
      alert('Error removing contact: ' + error.message);
    }
  };

  // Project management handlers
  const handleAddProject = () => {
    if (!customer?.customer_name) {
      alert('Customer information not loaded. Please refresh the page.');
      return;
    }
    setEditingProject(null);
    setShowProjectModal(true);
  };

  const handleEditProject = (project) => {
    setEditingProject(project);
    setShowProjectModal(true);
  };

  const handleProjectSaved = (projectData, isEdit = false) => {
    if (isEdit) {
      setProjects(prev => prev.map(p => 
        p.id === projectData.id ? projectData : p
      ));
      alert('Project updated successfully!');
    } else {
      setProjects(prev => [projectData, ...prev]);
      alert('Project created successfully!');
    }
    
    setEditingProject(null);
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
    if (!window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) return;
    
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
    if (typeof stakeholder === 'object' && stakeholder !== null) {
      return stakeholder;
    }
    
    if (typeof stakeholder === 'string') {
      try {
        const parsed = JSON.parse(stakeholder);
        if (typeof parsed === 'object' && parsed !== null) {
          return parsed;
        }
      } catch (e) {
        if (stakeholder.includes(' - ')) {
          const [name, role] = stakeholder.split(' - ');
          return { name, role, email: '', phone: '' };
        } else {
          return { name: stakeholder, role: 'Contact', email: '', phone: '' };
        }
      }
    }
    
    return { name: 'Unknown', role: 'Contact', email: '', phone: '' };
  };

  // Formatting helper functions
  const formatDate = (dateString) => {
    if (!dateString) return 'No date set';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  const formatCurrency = (value) => {
    if (!value || value === 0) return 'Not specified';
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(parseFloat(value));
    } catch (error) {
      return 'Invalid amount';
    }
  };

  const formatPhoneNumber = (phone) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length >= 10) {
      return `+${cleaned.slice(0, -10)} ${cleaned.slice(-10, -7)} ${cleaned.slice(-7, -4)} ${cleaned.slice(-4)}`;
    }
    return phone;
  };

  // Project filtering functions
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

  // Task filtering and counting functions
  const getFilteredTasks = () => {
    if (taskFilter === 'all') {
      return tasks;
    }
    return tasks.filter(task => !['Completed', 'Cancelled/On-hold'].includes(task.status));
  };

  const getActiveProjectsCount = () => {
    return projects.filter(p => !p.sales_stage?.toLowerCase().startsWith('closed')).length;
  };

  const getClosedProjectsCount = () => {
    return projects.filter(p => p.sales_stage?.toLowerCase().startsWith('closed')).length;
  };

  const getActiveTasksCount = () => {
    return tasks.filter(task => !['Completed', 'Cancelled/On-hold'].includes(task.status)).length;
  };

  const getCompletedTasksCount = () => {
    return tasks.filter(task => task.status === 'Completed').length;
  };

  const getOverdueTasksCount = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return tasks.filter(task => {
      if (!task.due_date || ['Completed', 'Cancelled/On-hold'].includes(task.status)) return false;
      const dueDate = new Date(task.due_date);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate < today;
    }).length;
  };

  const getTotalDealValue = () => {
    return projects
      .filter(p => !p.sales_stage?.toLowerCase().startsWith('closed'))
      .reduce((sum, project) => sum + (parseFloat(project.deal_value) || 0), 0);
  };

  // Task status and due date helpers
  const getTaskStatusClass = (status) => {
    const statusMap = {
      'completed': 'status-completed',
      'in progress': 'status-in-progress', 
      'not started': 'status-pending',
      'cancelled/on-hold': 'status-cancelled'
    };
    return statusMap[status?.toLowerCase()] || 'status-pending';
  };

  const getTaskStatusIcon = (status) => {
    const iconMap = {
      'completed': FaCheckCircle,
      'in progress': FaSparkles,
      'not started': FaClock,
      'cancelled/on-hold': FaExclamationTriangle
    };
    const IconComponent = iconMap[status?.toLowerCase()] || FaClock;
    return <IconComponent />;
  };

  const getTaskDueStatus = (dueDate, status) => {
    if (!dueDate || ['Completed', 'Cancelled/On-hold'].includes(status)) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    
    const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'overdue';
    if (diffDays === 0) return 'today';
    if (diffDays <= 3) return 'upcoming';
    return 'normal';
  };

  const formatTaskDueDate = (dueDate, status) => {
    if (!dueDate) return '';
    
    const dueStatus = getTaskDueStatus(dueDate, status);
    const formattedDate = formatDate(dueDate);
    
    switch (dueStatus) {
      case 'overdue':
        const today = new Date();
        const due = new Date(dueDate);
        const diffDays = Math.ceil((today - due) / (1000 * 60 * 60 * 24));
        return `${diffDays} day${diffDays > 1 ? 's' : ''} overdue`;
      case 'today':
        return 'Due today';
      case 'upcoming':
        return `Due ${formattedDate}`;
      default:
        return `Due ${formattedDate}`;
    }
  };

  // Project sales stage helpers
  const getSalesStageColor = (stage) => {
    const stageColors = {
      'discovery': 'stage-discovery',
      'demo': 'stage-demo', 
      'poc': 'stage-poc',
      'rfi': 'stage-rfi',
      'rfp': 'stage-rfp',
      'sow': 'stage-sow',
      'contracting': 'stage-contracting',
      'closed-won': 'stage-won',
      'closed-lost': 'stage-lost',
      'closed-cancelled/hold': 'stage-cancelled'
    };
    return stageColors[stage?.toLowerCase().replace(/[\s/]/g, '-')] || 'stage-default';
  };

  const getSalesStageIcon = (stage) => {
    const stageIcons = {
      'discovery': FaLightbulb,
      'demo': FaPaperPlane,
      'poc': FaSparkles,
      'rfi': FaFlag,
      'rfp': FaTarget,
      'sow': FaEdit,
      'contracting': FaShieldAlt,
      'closed-won': FaAward,
      'closed-lost': FaExclamationTriangle,
      'closed-cancelled/hold': FaClock
    };
    const IconComponent = stageIcons[stage?.toLowerCase().replace(/[\s/]/g, '-')] || FaFlag;
    return <IconComponent />;
  };

  // Customer metrics helpers
  const getCustomerHealthScore = () => {
    if (projects.length === 0) return { score: 0, status: 'unknown', color: 'gray' };
    
    const activeProjects = getActiveProjectsCount();
    const overdueItems = getOverdueTasksCount();
    const completionRate = tasks.length > 0 ? (getCompletedTasksCount() / tasks.length) * 100 : 0;
    
    let score = 0;
    if (activeProjects > 0) score += 30;
    if (overdueItems === 0) score += 25;
    if (completionRate >= 80) score += 25;
    if (completionRate >= 50) score += 20;
    
    if (score >= 80) return { score, status: 'excellent', color: 'green' };
    if (score >= 60) return { score, status: 'good', color: 'blue' };
    if (score >= 40) return { score, status: 'fair', color: 'yellow' };
    return { score, status: 'needs-attention', color: 'red' };
  };

  const getEngagementLevel = () => {
    const recentProjects = projects.filter(p => {
      if (!p.created_at) return false;
      const projectDate = new Date(p.created_at);
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      return projectDate >= sixMonthsAgo;
    }).length;

    if (recentProjects >= 3) return { level: 'high', color: 'green', icon: FaTrendingUp };
    if (recentProjects >= 1) return { level: 'medium', color: 'blue', icon: FaChartLine };
    return { level: 'low', color: 'orange', icon: FaClock };
  };

  // Progress calculation
  const calculateProgress = () => {
    if (tasks.length === 0) return 0;
    return Math.round((getCompletedTasksCount() / tasks.length) * 100);
  };

  // Loading state
  if (loading) {
    return (
      <div className="app-container">
        <div className="loading-container">
          <div className="loading-spinner modern">
            <div className="spinner-ring"></div>
            <div className="spinner-ring"></div>
            <div className="spinner-ring"></div>
          </div>
          <div className="loading-content">
            <h3>Loading customer details</h3>
            <p>Getting the latest information...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !customer) {
    return (
      <div className="app-container">
        <div className="error-container">
          <div className="error-icon">
            <FaExclamationTriangle />
          </div>
          <div className="error-content">
            <h2>Something went wrong</h2>
            <p>{error || 'Customer not found'}</p>
            <div className="error-actions">
              <button onClick={() => navigate('/')} className="btn btn-primary">
                <FaHome />
                Back to Dashboard
              </button>
              <button onClick={fetchCustomerDetails} className="btn btn-secondary">
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Calculate metrics for display
  const filteredProjects = getFilteredProjects();
  const filteredTasks = getFilteredTasks();
  const pendingTasksCount = getActiveTasksCount();
  const overdueTasksCount = getOverdueTasksCount();
  const healthScore = getCustomerHealthScore();
  const engagement = getEngagementLevel();
  const progress = calculateProgress();
  const totalValue = getTotalDealValue();

  return (
    <div className="app-container">
      {/* Navigation Bar */}
      <nav className="app-nav">
        <div className="nav-content">
          <button onClick={() => navigate('/')} className="nav-back">
            <FaHome />
            <span>Dashboard</span>
          </button>
          
          <div className="nav-breadcrumb">
            <span className="breadcrumb-item">Customers</span>
            <FaArrowRight className="breadcrumb-arrow" />
            <span className="breadcrumb-current">{customer.customer_name}</span>
          </div>

          <div className="nav-actions">
            <div className="customer-health">
              <div className={`health-indicator health-${healthScore.color}`}>
                <div className="health-score">{healthScore.score}%</div>
                <div className="health-label">Health Score</div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="app-main">
        {/* Customer Header */}
        <section className="customer-hero">
          <div className="hero-content">
            <div className="hero-main">
              <div className="customer-avatar">
                <FaBuilding />
              </div>
              <div className="customer-info">
                <h1 className="customer-name">{customer.customer_name}</h1>
                <div className="customer-meta">
                  {customer.country && (
                    <div className="meta-item">
                      <FaGlobe />
                      <span>{customer.country}</span>
                    </div>
                  )}
                  {customer.company_size && (
                    <div className="meta-item">
                      <FaUsers />
                      <span>{customer.company_size}</span>
                    </div>
                  )}
                  {customer.year_first_closed && (
                    <div className="meta-item">
                      <FaCalendarAlt />
                      <span>Customer since {customer.year_first_closed}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="hero-actions">
              {!isEditing ? (
                <button onClick={handleEditToggle} className="btn btn-secondary">
                  <FaEdit />
                  Edit Details
                </button>
              ) : (
                <div className="edit-actions">
                  <button 
                    onClick={handleSaveCustomer} 
                    className="btn btn-primary"
                    disabled={saving}
                  >
                    <FaSave />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button 
                    onClick={handleEditToggle} 
                    className="btn btn-ghost"
                    disabled={saving}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>

          {isEditing && (
            <div className="edit-banner">
              <FaEdit />
              <span>Edit mode active - Make your changes and save</span>
            </div>
          )}
        </section>

        {/* Metrics Overview */}
        <section className="metrics-grid">
          <div className="metric-card primary">
            <div className="metric-icon">
              <FaBriefcase />
            </div>
            <div className="metric-content">
              <div className="metric-value">{getActiveProjectsCount()}</div>
              <div className="metric-label">Active Projects</div>
              <div className="metric-trend">
                <FaChartLine />
                <span>{getClosedProjectsCount()} completed</span>
              </div>
            </div>
          </div>

          <div className="metric-card success">
            <div className="metric-icon">
              <FaTasks />
            </div>
            <div className="metric-content">
              <div className="metric-value">{pendingTasksCount}</div>
              <div className="metric-label">Active Tasks</div>
              <div className="metric-trend">
                <FaCheckCircle />
                <span>{progress}% completed</span>
              </div>
            </div>
          </div>

          <div className={`metric-card ${overdueTasksCount > 0 ? 'warning' : 'info'}`}>
            <div className="metric-icon">
              {overdueTasksCount > 0 ? <FaExclamationTriangle /> : <FaCheckCircle />}
            </div>
            <div className="metric-content">
              <div className="metric-value">{overdueTasksCount}</div>
              <div className="metric-label">Overdue Items</div>
              <div className="metric-trend">
                {overdueTasksCount > 0 ? (
                  <>
                    <FaExclamationTriangle />
                    <span>Needs attention</span>
                  </>
                ) : (
                  <>
                    <FaCheckCircle />
                    <span>All current</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="metric-card accent">
            <div className="metric-icon">
              <FaDollarSign />
            </div>
            <div className="metric-content">
              <div className="metric-value">{formatCurrency(totalValue).replace('$', '$')}</div>
              <div className="metric-label">Pipeline Value</div>
              <div className="metric-trend">
                <FaTrendingUp />
                <span>Active deals</span>
              </div>
            </div>
          </div>
        </section>

        {/* Main Content Grid */}
        <div className="content-grid">
          {/* Left Column */}
          <div className="content-primary">
            {/* Customer Information Card */}
            <div className="card customer-details">
              <div className="card-header">
                <div className="card-title">
                  <FaBuilding />
                  <h3>Company Information</h3>
                </div>
                <div className="card-actions">
                  <div className={`engagement-badge engagement-${engagement.color}`}>
                    <engagement.icon.type />
                    <span>{engagement.level} engagement</span>
                  </div>
                </div>
              </div>

              <div className="card-content">
                <div className="info-grid">
                  <div className="info-field">
                    <label className="info-label">
                      <FaBuilding />
                      Company Name
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="customer_name"
                        value={editCustomer.customer_name || ''}
                        onChange={handleEditChange}
                        className="info-input"
                        required
                      />
                    ) : (
                      <div className="info-value">{customer.customer_name}</div>
                    )}
                  </div>

                  <div className="info-field">
                    <label className="info-label">
                      <FaUsers />
                      Account Manager
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="account_manager"
                        value={editCustomer.account_manager || ''}
                        onChange={handleEditChange}
                        className="info-input"
                        placeholder="Account manager name"
                      />
                    ) : (
                      <div className="info-value">{customer.account_manager || 'Not assigned'}</div>
                    )}
                  </div>

                  <div className="info-field">
                    <label className="info-label">
                      <FaGlobe />
                      Country
                    </label>
                    {isEditing ? (
                      <select
                        name="country"
                        value={editCustomer.country || ''}
                        onChange={handleEditChange}
                        className="info-select"
                      >
                        <option value="">Select Country</option>
                        {asiaPacificCountries.map((country, i) => (
                          <option key={i} value={country}>{country}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="info-value">{customer.country || 'Not specified'}</div>
                    )}
                  </div>

                  <div className="info-field">
                    <label className="info-label">
                      <FaIndustry />
                      Company Size
                    </label>
                    {isEditing ? (
                      <select
                        name="company_size"
                        value={editCustomer.company_size || ''}
                        onChange={handleEditChange}
                        className="info-select"
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

                  <div className="info-field">
                    <label className="info-label">
                      <FaCalendarAlt />
                      Customer Since
                    </label>
                    {isEditing ? (
                      <input
                        type="number"
                        name="year_first_closed"
                        value={editCustomer.year_first_closed || ''}
                        onChange={handleEditChange}
                        className="info-input"
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
            </div>

            {/* Key Stakeholders Section */}
            <div className="card stakeholders">
              <div className="card-header">
                <div className="card-title">
                  <FaUsers />
                  <h3>Key Contacts</h3>
                  <span className="count-badge">{customer.key_stakeholders?.length || 0}</span>
                </div>
                <div className="card-actions">
                  <button className="btn btn-primary" onClick={handleAddStakeholder}>
                    <FaPlus />
                    Add Contact
                  </button>
                </div>
              </div>

              <div className="card-content">
                {customer.key_stakeholders && customer.key_stakeholders.length > 0 ? (
                  <div className="stakeholders-grid">
                    {customer.key_stakeholders.map((stakeholder, index) => {
                      const parsedStakeholder = parseStakeholder(stakeholder);
                      const { name, role, email, phone } = parsedStakeholder;

                      return (
                        <div key={index} className="stakeholder-card">
                          <div className="stakeholder-header">
                            <div className="stakeholder-avatar">
                              <FaUserCheck />
                            </div>
                            <div className="stakeholder-actions">
                              <button 
                                className="action-btn edit"
                                onClick={() => handleEditStakeholder(parsedStakeholder, index)}
                                title="Edit contact"
                              >
                                <FaEdit />
                              </button>
                              <button 
                                className="action-btn delete"
                                onClick={() => handleDeleteStakeholder(index)}
                                title="Remove contact"
                              >
                                <FaTrash />
                              </button>
                            </div>
                          </div>

                          <div className="stakeholder-info">
                            <h4 className="stakeholder-name">{name}</h4>
                            <p className="stakeholder-role">{role || 'Contact'}</p>
                            
                            <div className="stakeholder-contacts">
                              {email && (
                                <a href={`mailto:${email}`} className="contact-link email">
                                  <FaEnvelope />
                                  <span>{email}</span>
                                </a>
                              )}
                              {phone && (
                                <a href={`tel:${phone}`} className="contact-link phone">
                                  <FaPhone />
                                  <span>{formatPhoneNumber(phone)}</span>
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="empty-state">
                    <div className="empty-icon">
                      <FaUsers />
                    </div>
                    <h4>No contacts added yet</h4>
                    <p>Add key stakeholders to build stronger relationships</p>
                    <button onClick={handleAddStakeholder} className="btn btn-primary">
                      <FaPlus />
                      Add First Contact
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Projects Portfolio Section */}
            <div className="card projects">
              <div className="card-header">
                <div className="card-title">
                  <FaBriefcase />
                  <h3>Projects Portfolio</h3>
                </div>
                <div className="card-actions">
                  <button onClick={handleAddProject} className="btn btn-primary">
                    <FaPlus />
                    New Project
                  </button>
                </div>
              </div>

              {/* Project Tabs */}
              <div className="project-tabs">
                <button 
                  className={`tab-btn ${activeTab === 'active' ? 'active' : ''}`}
                  onClick={() => setActiveTab('active')}
                >
                  <FaChartLine />
                  <span>Active</span>
                  <span className="tab-count">{getActiveProjectsCount()}</span>
                </button>
                <button 
                  className={`tab-btn ${activeTab === 'closed' ? 'active' : ''}`}
                  onClick={() => setActiveTab('closed')}
                >
                  <FaCheckCircle />
                  <span>Closed</span>
                  <span className="tab-count">{getClosedProjectsCount()}</span>
                </button>
                <button 
                  className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
                  onClick={() => setActiveTab('all')}
                >
                  <FaBriefcase />
                  <span>All</span>
                  <span className="tab-count">{projects.length}</span>
                </button>
              </div>

              <div className="card-content">
                {filteredProjects.length > 0 ? (
                  <div className="projects-list">
                    {filteredProjects.map((project) => (
                      <div key={project.id} className="project-card">
                        <div className="project-main">
                          <div className="project-header">
                            <button
                              onClick={() => handleProjectClick(project.id, project.project_name)}
                              className="project-name-btn"
                            >
                              <FaBriefcase />
                              <span>{project.project_name || 'Unnamed Project'}</span>
                            </button>
                            
                            <div className={`project-stage ${getSalesStageColor(project.sales_stage)}`}>
                              {getSalesStageIcon(project.sales_stage)}
                              <span>{project.sales_stage || 'No Stage'}</span>
                            </div>
                          </div>

                          <div className="project-details">
                            <div className="project-meta">
                              {project.product && (
                                <div className="meta-item">
                                  <FaSparkles />
                                  <span>{project.product}</span>
                                </div>
                              )}
                              {project.account_manager && (
                                <div className="meta-item">
                                  <FaUsers />
                                  <span>{project.account_manager}</span>
                                </div>
                              )}
                              {project.due_date && (
                                <div className="meta-item">
                                  <FaCalendar />
                                  <span>{formatDate(project.due_date)}</span>
                                </div>
                              )}
                            </div>

                            {project.deal_value && (
                              <div className="project-value">
                                <FaDollarSign />
                                <span>{formatCurrency(project.deal_value)}</span>
                              </div>
                            )}
                          </div>

                          {project.scope && (
                            <div className="project-scope">
                              <p>{project.scope}</p>
                            </div>
                          )}
                        </div>

                        <div className="project-actions">
                          <button 
                            className="action-btn edit" 
                            onClick={() => handleEditProject(project)}
                            title="Edit project"
                          >
                            <FaEdit />
                          </button>
                          <button 
                            className="action-btn delete" 
                            onClick={() => handleDeleteProject(project.id)}
                            title="Delete project"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <div className="empty-icon">
                      <FaBriefcase />
                    </div>
                    <h4>No {activeTab === 'all' ? '' : activeTab + ' '}projects found</h4>
                    <p>
                      {activeTab === 'active' 
                        ? 'Start by creating your first project'
                        : activeTab === 'closed'
                        ? 'No closed projects yet'
                        : 'Create your first project for this customer'
                      }
                    </p>
                    {activeTab !== 'closed' && (
                      <button onClick={handleAddProject} className="btn btn-primary">
                        <FaPlus />
                        Create Project
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="content-sidebar">
            {/* Task Overview Analytics */}
            <div className="card task-analytics">
              <div className="card-header">
                <div className="card-title">
                  <FaChartLine />
                  <h3>Task Overview</h3>
                </div>
              </div>

              <div className="card-content">
                <div className="analytics-grid">
                  <div className="analytics-item completed">
                    <div className="analytics-icon">
                      <FaCheckCircle />
                    </div>
                    <div className="analytics-content">
                      <div className="analytics-value">{getCompletedTasksCount()}</div>
                      <div className="analytics-label">Completed</div>
                    </div>
                  </div>
                  
                  <div className="analytics-item active">
                    <div className="analytics-icon">
                      <FaClock />
                    </div>
                    <div className="analytics-content">
                      <div className="analytics-value">{getActiveTasksCount()}</div>
                      <div className="analytics-label">Active</div>
                    </div>
                  </div>
                  
                  <div className="analytics-item overdue">
                    <div className="analytics-icon">
                      <FaExclamationTriangle />
                    </div>
                    <div className="analytics-content">
                      <div className="analytics-value">{overdueTasksCount}</div>
                      <div className="analytics-label">Overdue</div>
                    </div>
                  </div>
                </div>

                {tasks.length > 0 && (
                  <div className="progress-section">
                    <div className="progress-header">
                      <span className="progress-label">Overall Progress</span>
                      <span className="progress-percentage">{progress}%</span>
                    </div>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="progress-detail">
                      {getCompletedTasksCount()} of {tasks.length} tasks completed
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Active Tasks Section */}
            <div className="card tasks">
              <div className="card-header">
                <div className="card-title">
                  <FaTasks />
                  <h3>Recent Tasks</h3>
                </div>
                <div className="card-actions">
                  <div className="filter-toggle">
                    <button 
                      className={`filter-btn ${taskFilter === 'active' ? 'active' : ''}`}
                      onClick={() => setTaskFilter('active')}
                    >
                      Active
                    </button>
                    <button 
                      className={`filter-btn ${taskFilter === 'all' ? 'active' : ''}`}
                      onClick={() => setTaskFilter('all')}
                    >
                      All
                    </button>
                  </div>
                </div>
              </div>

              <div className="card-content">
                {filteredTasks.length > 0 ? (
                  <div className="tasks-list">
                    {filteredTasks.slice(0, 10).map((task) => (
                      <div key={task.id} className="task-item">
                        <div className="task-main">
                          <div className="task-checkbox-container">
                            <input 
                              type="checkbox" 
                              className="task-checkbox"
                              checked={task.status === 'Completed'}
                              onChange={() => handleTaskStatusChange(task.id, task.status)}
                            />
                          </div>
                          
                          <div className="task-content">
                            <div className="task-header">
                              <h4 className="task-title">{task.description}</h4>
                              <div className={`task-status ${getTaskStatusClass(task.status)}`}>
                                {getTaskStatusIcon(task.status)}
                                <span>{task.status}</span>
                              </div>
                            </div>
                            
                            <div className="task-meta">
                              <div className="task-project">
                                <FaBriefcase />
                                <span>{task.projects?.project_name || 'Unknown Project'}</span>
                              </div>
                              
                              {task.due_date && (
                                <div className={`task-due ${getTaskDueStatus(task.due_date, task.status) || 'normal'}`}>
                                  <FaCalendar />
                                  <span>{formatTaskDueDate(task.due_date, task.status)}</span>
                                </div>
                              )}
                            </div>

                            {task.notes && (
                              <div className="task-notes">
                                <p>{task.notes}</p>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="task-actions">
                          <button 
                            onClick={() => handleEditTask(task)}
                            className="action-btn edit"
                            title="Edit task"
                          >
                            <FaEdit />
                          </button>
                          <button 
                            onClick={() => handleDeleteTask(task.id)}
                            className="action-btn delete"
                            title="Delete task"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </div>
                    ))}
                    
                    {filteredTasks.length > 10 && (
                      <div className="tasks-view-more">
                        <p>Showing 10 of {filteredTasks.length} tasks</p>
                        <button className="btn btn-ghost">
                          View All Tasks
                          <FaArrowRight />
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="empty-state compact">
                    <div className="empty-icon">
                      <FaTasks />
                    </div>
                    <h4>No {taskFilter === 'active' ? 'active ' : ''}tasks</h4>
                    <p>Tasks are managed from individual project pages</p>
                    {projects.length > 0 && (
                      <button 
                        onClick={() => handleProjectClick(projects[0].id, projects[0].project_name)}
                        className="btn btn-secondary"
                      >
                        Go to Project
                        <FaArrowRight />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Customer Health Card */}
            <div className="card health-score">
              <div className="card-header">
                <div className="card-title">
                  <FaShieldAlt />
                  <h3>Customer Health</h3>
                </div>
              </div>

              <div className="card-content">
                <div className="health-overview">
                  <div className={`health-circle health-${healthScore.color}`}>
                    <div className="health-percentage">{healthScore.score}%</div>
                  </div>
                  <div className="health-details">
                    <h4 className={`health-status status-${healthScore.color}`}>
                      {healthScore.status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </h4>
                    <p className="health-description">
                      {healthScore.status === 'excellent' && 'Everything looks great! Strong engagement and on-track progress.'}
                      {healthScore.status === 'good' && 'Healthy relationship with room for improvement.'}
                      {healthScore.status === 'fair' && 'Some areas need attention to maintain momentum.'}
                      {healthScore.status === 'needs-attention' && 'Multiple issues require immediate focus.'}
                    </p>
                  </div>
                </div>

                <div className="health-factors">
                  <div className="factor-item">
                    <FaBriefcase />
                    <span>Active Projects: {getActiveProjectsCount()}</span>
                  </div>
                  <div className="factor-item">
                    <FaCheckCircle />
                    <span>Task Completion: {progress}%</span>
                  </div>
                  <div className="factor-item">
                    <FaExclamationTriangle />
                    <span>Overdue Items: {overdueTasksCount}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modals */}
      {customer && (
        <>
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

          <ProjectModal
            isOpen={showProjectModal}
            onClose={() => {
              setShowProjectModal(false);
              setEditingProject(null);
            }}
            onSave={handleProjectSaved}
            customerName={customer.customer_name}
            editingProject={editingProject}
          />
        </>
      )}

      <TaskModal
        isOpen={showTaskModal}
        onClose={() => {
          setShowTaskModal(false);
          setEditingTask(null);
        }}
        onSave={handleTaskSaved}
        editingTask={editingTask}
      />
    </div>
  );
}

export default CustomerDetails;
