// CustomerDetails.js - Enhanced version with improved aesthetics and typography
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import './CustomerDetails.css';
import {
  FaHome, FaUsers, FaEdit, FaPlus, FaBriefcase, FaTrash, FaSave, FaTimes,
  FaBuilding, FaGlobe, FaIndustry, FaCalendarAlt, FaChartLine, FaCheckCircle,
  FaClock, FaExclamationTriangle, FaEnvelope, FaPhone, FaDollarSign, FaTasks
} from 'react-icons/fa';

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
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{editingStakeholder ? 'Edit Stakeholder' : 'Add New Stakeholder'}</h3>
          <button className="modal-close-btn" onClick={handleClose}>
            <FaTimes />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="modern-form">
          <div className="form-group full-width">
            <label>
              <FaUsers className="field-icon" />
              Name *
              <input 
                name="name" 
                value={newStakeholder.name} 
                onChange={handleChange}
                placeholder="Enter stakeholder name"
                required
              />
            </label>
          </div>

          <div className="form-group">
            <label>
              <FaBriefcase className="field-icon" />
              Role/Title
              <input 
                name="role" 
                value={newStakeholder.role} 
                onChange={handleChange}
                placeholder="e.g., CTO, Project Manager"
              />
            </label>
          </div>

          <div className="form-group">
            <label>
              <FaEnvelope className="field-icon" />
              Email
              <input 
                name="email" 
                type="email"
                value={newStakeholder.email} 
                onChange={handleChange}
                placeholder="email@company.com"
              />
            </label>
          </div>

          <div className="form-group">
            <label>
              <FaPhone className="field-icon" />
              Phone
              <input 
                name="phone" 
                type="tel"
                value={newStakeholder.phone} 
                onChange={handleChange}
                placeholder="+65 1234 5678"
              />
            </label>
          </div>
          
          <div className="modal-actions">
            <button type="button" onClick={handleClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              <FaSave />
              {editingStakeholder ? 'Update Stakeholder' : 'Add Stakeholder'}
            </button>
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

  useEffect(() => {
    if (customerName) {
      setNewProject(prev => ({ ...prev, customer_name: customerName }));
    }
  }, [customerName]);

  const products = ['Marketplace', 'O-City', 'Processing', 'SmartVista'].sort();
  const salesStages = [
    'Discovery', 'Demo', 'PoC', 'RFI', 'RFP', 'SoW', 
    'Contracting', 'Closed-Won', 'Closed-Lost', 'Closed-Cancelled/Hold'
  ];
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

      if (newProject.project_name) {
        projectData.project_name = newProject.project_name;
      }
      if (newProject.project_type) {
        projectData.project_type = newProject.project_type;
      }

      const { data, error } = await supabase.from('projects').insert([projectData]).select();
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        onSave(data[0]);
        clearForm();
        onClose();
      }
    } catch (error) {
      console.error('Error adding project:', error);
      alert('Error adding project: ' + error.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Add New Project for {customerName}</h3>
          <button className="modal-close-btn" onClick={handleClose}>
            <FaTimes />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="modern-form">
          <div className="form-group full-width">
            <label>
              <FaBriefcase className="field-icon" />
              Project Name *
              <input 
                name="project_name" 
                value={newProject.project_name} 
                onChange={handleChange}
                placeholder="Enter project name"
                required
              />
            </label>
          </div>

          <div className="form-group">
            <label>
              <FaUsers className="field-icon" />
              Account Manager
              <input 
                name="account_manager" 
                value={newProject.account_manager} 
                onChange={handleChange}
                placeholder="Account manager name"
              />
            </label>
          </div>

          <div className="form-group">
            <label>
              <FaChartLine className="field-icon" />
              Sales Stage *
              <select name="sales_stage" value={newProject.sales_stage} onChange={handleChange} required>
                <option value="">Select Stage</option>
                {salesStages.map((stage, i) => (
                  <option key={i} value={stage}>{stage}</option>
                ))}
              </select>
            </label>
          </div>
          
          <div className="form-group">
            <label>
              <FaBuilding className="field-icon" />
              Product *
              <select name="product" value={newProject.product} onChange={handleChange} required>
                <option value="">Select Product</option>
                {products.map((product, i) => (
                  <option key={i} value={product}>{product}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="form-group">
            <label>
              <FaTasks className="field-icon" />
              Project Type
              <select name="project_type" value={newProject.project_type} onChange={handleChange}>
                <option value="">Select Type</option>
                {projectTypes.map((type, i) => (
                  <option key={i} value={type}>{type}</option>
                ))}
              </select>
            </label>
          </div>
          
          <div className="form-group">
            <label>
              <FaDollarSign className="field-icon" />
              Deal Value
              <input 
                name="deal_value" 
                type="number" 
                step="0.01"
                value={newProject.deal_value} 
                onChange={handleChange}
                placeholder="Enter deal value"
              />
            </label>
          </div>
          
          <div className="form-group">
            <label>
              <FaUsers className="field-icon" />
              Backup Presales
              <input 
                name="backup_presales" 
                value={newProject.backup_presales} 
                onChange={handleChange}
                placeholder="Backup presales contact"
              />
            </label>
          </div>

          <div className="form-group">
            <label>
              <FaCalendarAlt className="field-icon" />
              Expected Closing Date
              <input 
                name="due_date" 
                type="date"
                value={newProject.due_date} 
                onChange={handleChange}
              />
            </label>
          </div>
          
          <div className="form-group full-width">
            <label>
              <FaEdit className="field-icon" />
              Scope
              <textarea 
                name="scope" 
                value={newProject.scope} 
                onChange={handleChange}
                rows="3"
                placeholder="Project scope and objectives"
              />
            </label>
          </div>
          
          <div className="form-group full-width">
            <label>
              <FaEdit className="field-icon" />
              Remarks
              <textarea 
                name="remarks" 
                value={newProject.remarks} 
                onChange={handleChange}
                rows="3"
                placeholder="Project remarks or notes"
              />
            </label>
          </div>
          
          <div className="modal-actions">
            <button type="button" onClick={handleClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              <FaSave />
              Save Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

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
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{editingTask ? 'Edit Task' : 'Add New Task'}</h3>
          <button className="modal-close-btn" onClick={onClose}>
            <FaTimes />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="modern-form">
          <div className="form-group full-width">
            <label>
              <FaTasks className="field-icon" />
              Task Description *
              <input 
                name="description" 
                value={taskData.description} 
                onChange={handleChange}
                placeholder="Enter task description"
                required
              />
            </label>
          </div>

          <div className="form-group">
            <label>
              <FaChartLine className="field-icon" />
              Status
              <select name="status" value={taskData.status} onChange={handleChange}>
                <option value="Not Started">Not Started</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled/On-hold">Cancelled/On-hold</option>
              </select>
            </label>
          </div>

          <div className="form-group">
            <label>
              <FaCalendarAlt className="field-icon" />
              Due Date
              <input 
                name="due_date" 
                type="date"
                value={taskData.due_date} 
                onChange={handleChange}
              />
            </label>
          </div>

          <div className="form-group full-width">
            <label>
              <FaEdit className="field-icon" />
              Notes
              <textarea 
                name="notes" 
                value={taskData.notes} 
                onChange={handleChange}
                rows="3"
                placeholder="Additional notes or details"
              />
            </label>
          </div>
          
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              <FaSave />
              {editingTask ? 'Update Task' : 'Add Task'}
            </button>
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
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showStakeholderModal, setShowStakeholderModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingStakeholder, setEditingStakeholder] = useState(null);
  const [editingStakeholderIndex, setEditingStakeholderIndex] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  
  // Inline editing states
  const [isEditing, setIsEditing] = useState(false);
  const [editCustomer, setEditCustomer] = useState({});
  const [saving, setSaving] = useState(false);
  
  // Project filtering state
  const [activeTab, setActiveTab] = useState('active');
  
  // Task filtering state
  const [taskFilter, setTaskFilter] = useState('active');

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

  // Task handlers
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

  // Helper functions
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return '-';
    }
  };

  const formatCurrency = (value) => {
    if (!value) return '-';
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(parseFloat(value));
    } catch (error) {
      return '-';
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

  // Task filtering and helpers
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

  const getTaskStatusClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'status-completed';
      case 'in progress': return 'status-in-progress';
      case 'not started': return 'status-not-started';
      case 'cancelled/on-hold': return 'status-cancelled';
      default: return 'status-not-started';
    }
  };

  const getTaskStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return <FaCheckCircle />;
      case 'in progress': return <FaClock />;
      case 'cancelled/on-hold': return <FaExclamationTriangle />;
      default: return <FaClock />;
    }
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
    return null;
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

  if (loading) {
    return (
      <div className="page-wrapper">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading customer details...</p>
        </div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="page-wrapper">
        <div className="error-state">
          <FaExclamationTriangle className="error-icon" />
          <h2>Oops! Something went wrong</h2>
          <p>{error || 'Customer not found'}</p>
          <button onClick={() => navigate('/')} className="btn-primary">
            <FaHome /> Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const filteredProjects = getFilteredProjects();
  const filteredTasks = getFilteredTasks();
  const pendingTasksCount = getActiveTasksCount();
  const overdueTasksCount = getOverdueTasksCount();

  return (
    <div className="page-wrapper">
      <div className="page-content">
        {/* Navigation */}
        <button onClick={() => navigate('/')} className="nav-btn primary">
          <FaHome />
          Dashboard
        </button>

        {/* Customer Header */}
        <div className="customer-header">
          <div className="customer-title-section">
            <h1 className="customer-title">
              {customer.customer_name}
            </h1>
            <div className="customer-subtitle">
              <span className="location-badge">
                <FaGlobe />
                {customer.country || 'Location Not Set'}
              </span>
            </div>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="overview-grid">
          <div className="overview-card primary">
            <div className="card-icon">
              <FaBriefcase />
            </div>
            <div className="card-content">
              <div className="card-value">{getActiveProjectsCount()}</div>
              <div className="card-label">Active Projects</div>
              <div className="card-trend">
                <FaChartLine />
                {getClosedProjectsCount()} completed
              </div>
            </div>
          </div>

          <div className="overview-card success">
            <div className="card-icon">
              <FaTasks />
            </div>
            <div className="card-content">
              <div className="card-value">{pendingTasksCount}</div>
              <div className="card-label">Pending Tasks</div>
              <div className="card-trend">
                <FaCalendarAlt />
                {tasks.filter(t => getTaskDueStatus(t.due_date, t.status) === 'today').length} due today
              </div>
            </div>
          </div>

          <div className={`overview-card ${overdueTasksCount > 0 ? 'urgent' : 'normal'}`}>
            <div className="card-icon">
              <FaExclamationTriangle />
            </div>
            <div className="card-content">
              <div className="card-value">{overdueTasksCount}</div>
              <div className="card-label">Overdue Items</div>
              <div className="card-trend">
                {overdueTasksCount > 0 ? (
                  <>
                    <FaExclamationTriangle />
                    Needs attention
                  </>
                ) : (
                  <>
                    <FaCheckCircle />
                    All current
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="main-content">
          {/* Left Column */}
          <div className="left-column">
            {/* Customer Information */}
            <div className="section-card">
              <div className="section-header">
                <div className="section-title">
                  <FaBuilding className="section-icon" />
                  <h3>Customer Information</h3>
                </div>
                <div className="section-actions">
                  {isEditing ? (
                    <>
                      <button 
                        onClick={handleSaveCustomer} 
                        className="btn-success"
                        disabled={saving}
                      >
                        <FaSave />
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                      <button 
                        onClick={handleEditToggle} 
                        className="btn-secondary"
                        disabled={saving}
                      >
                        <FaTimes />
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button onClick={handleEditToggle} className="btn-primary">
                      <FaEdit />
                      Edit
                    </button>
                  )}
                </div>
              </div>

              {isEditing && (
                <div className="edit-banner">
                  <FaEdit />
                  <span>Editing mode - Make your changes and click Save</span>
                </div>
              )}

              <div className="section-content">
                <div className="customer-info-grid">
                  <div className="info-item">
                    <label className="info-label">
                      <FaBuilding />
                      Customer Name
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

                  <div className="info-item">
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

                  <div className="info-item">
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
                        {asiaPacificCountries.map((c, i) => (
                          <option key={i} value={c}>{c}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="info-value">{customer.country || 'Not specified'}</div>
                    )}
                  </div>

                  <div className="info-item">
                    <label className="info-label">
                      <FaUsers />
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

                  <div className="info-item">
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

            {/* Key Stakeholders */}
            <div className="section-card">
              <div className="section-header">
                <div className="section-title">
                  <FaUsers className="section-icon" />
                  <h3>Key Stakeholders</h3>
                  <span className="stakeholder-counter">
                    {customer.key_stakeholders?.length || 0}
                  </span>
                </div>
                <div className="section-actions">
                  <button className="btn-primary" onClick={handleAddStakeholder}>
                    <FaPlus />
                    Add Contact
                  </button>
                </div>
              </div>
              <div className="section-content">
                <div className="stakeholder-grid">
                  {customer.key_stakeholders && customer.key_stakeholders.length > 0 ? (
                    customer.key_stakeholders.map((stakeholder, index) => {
                      const parsedStakeholder = parseStakeholder(stakeholder);
                      const { name, role, email, phone } = parsedStakeholder;

                      return (
                        <div key={index} className="stakeholder-card">
                          <div className="stakeholder-header">
                            <div className="stakeholder-avatar">
                              <FaUsers />
                            </div>
                            <div className="stakeholder-actions">
                              <button 
                                className="stakeholder-action-btn edit"
                                onClick={() => handleEditStakeholder(parsedStakeholder, index)}
                                title="Edit stakeholder"
                              >
                                <FaEdit />
                              </button>
                              <button 
                                className="stakeholder-action-btn delete"
                                onClick={() => handleDeleteStakeholder(index)}
                                title="Remove stakeholder"
                              >
                                <FaTrash />
                              </button>
                            </div>
                          </div>
                          <div className="stakeholder-content">
                            <div className="stakeholder-name">{name}</div>
                            <div className="stakeholder-role">{role || 'Contact'}</div>
                            {email && (
                              <div className="stakeholder-contact">
                                <FaEnvelope />
                                <a href={`mailto:${email}`} className="stakeholder-email">{email}</a>
                              </div>
                            )}
                            {phone && (
                              <div className="stakeholder-contact">
                                <FaPhone />
                                <a href={`tel:${phone}`} className="stakeholder-phone">{phone}</a>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="empty-state">
                      <div className="empty-icon">
                        <FaUsers />
                      </div>
                      <h4>No stakeholders added</h4>
                      <p>Add key contacts to manage relationships effectively</p>
                      <button onClick={handleAddStakeholder} className="btn-primary">
                        <FaPlus />
                        Add First Contact
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Projects Section */}
            <div className="section-card">
              <div className="section-header">
                <div className="section-title">
                  <FaBriefcase className="section-icon" />
                  <h3>Projects Portfolio</h3>
                </div>
                <div className="section-actions">
                  <button onClick={handleAddProject} className="btn-primary">
                    <FaPlus />
                    Add Project
                  </button>
                </div>
              </div>

              <div className="projects-tabs">
                <button 
                  className={`tab-button ${activeTab === 'active' ? 'active' : ''}`}
                  onClick={() => setActiveTab('active')}
                >
                  <FaChartLine />
                  Active Projects ({getActiveProjectsCount()})
                </button>
                <button 
                  className={`tab-button ${activeTab === 'closed' ? 'active' : ''}`}
                  onClick={() => setActiveTab('closed')}
                >
                  <FaCheckCircle />
                  Closed Projects ({getClosedProjectsCount()})
                </button>
                <button 
                  className={`tab-button ${activeTab === 'all' ? 'active' : ''}`}
                  onClick={() => setActiveTab('all')}
                >
                  <FaBriefcase />
                  All Projects ({projects.length})
                </button>
              </div>

              <div className="section-content">
                {filteredProjects.length > 0 ? (
                  <div className="project-list">
                    {filteredProjects.map((project) => (
                      <div key={project.id} className="project-item">
                        <div className="project-header">
                          <button
                            onClick={() => handleProjectClick(project.id, project.project_name)}
                            className="project-name"
                          >
                            <FaBriefcase />
                            {project.project_name || project.customer_name || 'Unnamed Project'}
                          </button>
                          <span className={`project-stage stage-${project.sales_stage?.toLowerCase().replace(/[\s-]/g, '-')}`}>
                            {project.sales_stage || 'No Stage'}
                          </span>
                        </div>
                        <div className="project-details">
                          <div className="project-meta">
                            <span className="project-meta-item">
                              <FaCalendarAlt />
                              Due: {formatDate(project.due_date)}
                            </span>
                            <span className="project-meta-item">
                              <FaUsers />
                              AM: {project.account_manager || 'Not assigned'}
                            </span>
                          </div>
                          <div className="project-value">
                            <FaDollarSign />
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
                            className="project-action-btn delete" 
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
                    <h4>No projects found</h4>
                    <p>Start by creating your first project for this customer</p>
                    <button onClick={handleAddProject} className="btn-primary">
                      <FaPlus />
                      Add First Project
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="right-column">
            {/* Task Summary Analytics */}
            <div className="section-card">
              <div className="section-header">
                <div className="section-title">
                  <FaChartLine className="section-icon" />
                  <h3>Task Overview</h3>
                </div>
              </div>
              <div className="section-content">
                <div className="task-analytics-grid">
                  <div className="analytics-item">
                    <div className="analytics-icon completed">
                      <FaCheckCircle />
                    </div>
                    <div className="analytics-content">
                      <div className="analytics-value">{tasks.filter(t => t.status === 'Completed').length}</div>
                      <div className="analytics-label">Completed</div>
                    </div>
                  </div>
                  
                  <div className="analytics-item">
                    <div className="analytics-icon active">
                      <FaClock />
                    </div>
                    <div className="analytics-content">
                      <div className="analytics-value">{getActiveTasksCount()}</div>
                      <div className="analytics-label">Active</div>
                    </div>
                  </div>
                  
                  <div className="analytics-item">
                    <div className="analytics-icon overdue">
                      <FaExclamationTriangle />
                    </div>
                    <div className="analytics-content">
                      <div className="analytics-value">{overdueTasksCount}</div>
                      <div className="analytics-label">Overdue</div>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                {tasks.length > 0 && (
                  <div className="progress-section">
                    <div className="progress-header">
                      <span className="progress-label">Overall Progress</span>
                      <span className="progress-percentage">
                        {Math.round((tasks.filter(t => t.status === 'Completed').length / tasks.length) * 100)}%
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ 
                          width: `${Math.round((tasks.filter(t => t.status === 'Completed').length / tasks.length) * 100)}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Active Tasks */}
            <div className="section-card">
              <div className="section-header">
                <div className="section-title">
                  <FaTasks className="section-icon" />
                  <h3>Active Tasks</h3>
                </div>
                <div className="filter-toggle">
                  <button 
                    className={taskFilter === 'active' ? 'active' : ''}
                    onClick={() => setTaskFilter('active')}
                  >
                    Active
                  </button>
                  <button 
                    className={taskFilter === 'all' ? 'active' : ''}
                    onClick={() => setTaskFilter('all')}
                  >
                    All
                  </button>
                </div>
              </div>
              <div className="section-content">
                {filteredTasks.length > 0 ? (
                  <div className="task-list compact">
                    {filteredTasks.slice(0, 8).map((task) => (
                      <div key={task.id} className="task-item compact">
                        <div className="task-main-content">
                          <div className="task-header">
                            <input 
                              type="checkbox" 
                              className="task-checkbox"
                              checked={task.status === 'Completed'}
                              onChange={() => handleTaskStatusChange(task.id, task.status)}
                            />
                            <div className="task-title">{task.description}</div>
                            <div className="task-status-badge">
                              {getTaskStatusIcon(task.status)}
                              <span className={getTaskStatusClass(task.status)}>
                                {task.status}
                              </span>
                            </div>
                          </div>
                          <div className="task-meta">
                            <span className="task-project">
                              <FaBriefcase />
                              {task.projects?.project_name || 'Unknown Project'}
                            </span>
                            {task.due_date && (
                              <span className={`task-due due-${getTaskDueStatus(task.due_date, task.status) || 'normal'}`}>
                                <FaCalendarAlt />
                                {formatTaskDueDate(task.due_date, task.status)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="task-actions">
                          <button 
                            onClick={() => handleEditTask(task)}
                            className="task-action-btn edit"
                            title="Edit task"
                          >
                            <FaEdit />
                          </button>
                          <button 
                            onClick={() => handleDeleteTask(task.id)}
                            className="task-action-btn delete"
                            title="Delete task"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </div>
                    ))}
                    {filteredTasks.length > 8 && (
                      <div className="task-view-more">
                        <button className="btn-secondary compact">
                          View All {filteredTasks.length} Tasks
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
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
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

      {customer && (
        <ProjectModal
          isOpen={showProjectModal}
          onClose={() => setShowProjectModal(false)}
          onSave={handleProjectSaved}
          customerName={customer.customer_name}
        />
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

