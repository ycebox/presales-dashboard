// CustomerDetails.js - Enhanced version with project edit functionality (Overview Grid Removed)
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
      // Populate form with existing project data
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
      // Reset form for new project
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
        // Update existing project
        const { data, error } = await supabase
          .from('projects')
          .update(submissionData)
          .eq('id', editingProject.id)
          .select();
        
        if (error) throw error;
        result = { data, isEdit: true };
      } else {
        // Create new project
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
    <div className="modal-backdrop" onClick={handleClose}>
      <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            {editingProject 
              ? `Edit Project: ${editingProject.project_name || 'Unnamed Project'}` 
              : `Add New Project for ${customerName}`
            }
          </h3>
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
                value={projectData.project_name} 
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
                value={projectData.account_manager} 
                onChange={handleChange}
                placeholder="Account manager name"
              />
            </label>
          </div>

          <div className="form-group">
            <label>
              <FaChartLine className="field-icon" />
              Sales Stage *
              <select name="sales_stage" value={projectData.sales_stage} onChange={handleChange} required>
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
              <select name="product" value={projectData.product} onChange={handleChange} required>
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
              <select name="project_type" value={projectData.project_type} onChange={handleChange}>
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
                value={projectData.deal_value} 
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
                value={projectData.backup_presales} 
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
                value={projectData.due_date} 
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
                value={projectData.scope} 
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
                value={projectData.remarks} 
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
              {editingProject ? 'Update Project' : 'Save Project'}
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
  const [editingProject, setEditingProject] = useState(null);
  
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

  // Project handlers
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
      alert('Project added successfully!');
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
    if (!window.confirm('Are you sure you want to delete this project?')) return;
    
    try {
      const { error } = await supabase.from('projects').delete().eq('id', projectId);
      if (error) throw error;
      
      setProjects(prev => prev.filter(p => p.id !== projectId));
      alert('Project deleted successfully!');
    } catch (error) {
      console.error('Error deleting project:', error);
