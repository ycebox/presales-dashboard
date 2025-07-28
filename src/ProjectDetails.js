// ProjectDetails.js - Enhanced version with improved aesthetics and typography
import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import './ProjectDetails.css';
import {
  FaHome, FaTasks, FaBookOpen, FaEdit, FaSave, FaTimes,
  FaPlus, FaInfo, FaTrash, FaChevronDown, FaChevronUp, 
  FaUsers, FaCalendarAlt, FaDollarSign, FaChartLine,
  FaCheckCircle, FaClock, FaExclamationTriangle, FaEllipsisV
} from 'react-icons/fa';

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
                placeholder="What needs to be done?"
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
                placeholder="Additional details or context..."
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

function LogModal({ isOpen, onClose, onSave }) {
  const [logEntry, setLogEntry] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!logEntry.trim()) {
      alert('Log entry is required');
      return;
    }
    onSave(logEntry);
    setLogEntry('');
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Add Project Log</h3>
          <button className="modal-close-btn" onClick={onClose}>
            <FaTimes />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="modern-form">
          <div className="form-group full-width">
            <label>
              <FaBookOpen className="field-icon" />
              Log Entry *
              <textarea 
                value={logEntry} 
                onChange={(e) => setLogEntry(e.target.value)}
                rows="4"
                placeholder="Document progress, decisions, or important updates..."
                required
              />
            </label>
          </div>
          
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              <FaPlus />
              Add Log Entry
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ProjectDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Editing states
  const [isEditing, setIsEditing] = useState(false);
  const [editProject, setEditProject] = useState({});
  const [saving, setSaving] = useState(false);
  
  // Modal states
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [showCompleted, setShowCompleted] = useState(false);

  const salesStageOptions = [
    'Discovery', 'Demo', 'PoC', 'RFI', 'RFP', 'SoW', 
    'Contracting', 'Closed-Won', 'Closed-Lost', 'Closed-Cancelled/Hold'
  ];
  const productOptions = ['Marketplace', 'O-City', 'Processing', 'SmartVista'];

  useEffect(() => {
    if (id) {
      fetchProjectDetails();
    }
  }, [id]);

  const fetchProjectDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

      if (projectError) throw projectError;

      if (!projectData) {
        setError('Project not found');
        return;
      }

      setProject(projectData);
      setEditProject(projectData);

      // Fetch related data
      await Promise.all([
        fetchTasks(),
        fetchLogs()
      ]);

    } catch (error) {
      console.error('Error fetching project:', error);
      setError('Failed to load project details: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('project_tasks')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('project_logs')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching logs:', error);
    }
  };

  // Inline editing handlers
  const handleEditToggle = () => {
    if (isEditing) {
      setEditProject(project);
      setIsEditing(false);
    } else {
      setIsEditing(true);
    }
  };

  const handleEditChange = (e) => {
    const { name, value, type } = e.target;
    if (type === 'number') {
      setEditProject(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    } else {
      setEditProject(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSaveProject = async () => {
    if (!project?.id) {
      alert('Project ID is required');
      return;
    }

    try {
      setSaving(true);
      const { data, error } = await supabase
        .from('projects')
        .update(editProject)
        .eq('id', project.id)
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        setProject(data[0]);
        setEditProject(data[0]);
        setIsEditing(false);
        alert('Project updated successfully!');
      }
    } catch (error) {
      console.error('Error updating project:', error);
      alert('Error updating project: ' + error.message);
    } finally {
      setSaving(false);
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
      
      await fetchTasks();
    } catch (error) {
      console.error('Error updating task status:', error);
      alert('Error updating task status: ' + error.message);
    }
  };

  const handleAddTask = () => {
    setEditingTask(null);
    setShowTaskModal(true);
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
        const taskWithProject = {
          ...taskData,
          project_id: id
        };
        
        const { error } = await supabase
          .from('project_tasks')
          .insert([taskWithProject]);

        if (error) throw error;
        alert('Task added successfully!');
      }

      setShowTaskModal(false);
      setEditingTask(null);
      await fetchTasks();
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
      fetchTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Error deleting task: ' + error.message);
    }
  };

  // Log handlers
  const handleAddLog = () => {
    setShowLogModal(true);
  };

  const handleLogSaved = async (logEntry) => {
    try {
      const { error } = await supabase
        .from('project_logs')
        .insert([{ project_id: id, entry: logEntry }]);

      if (error) throw error;

      alert('Log added successfully!');
      setShowLogModal(false);
      fetchLogs();
    } catch (error) {
      console.error('Error adding log:', error);
      alert('Error adding log: ' + error.message);
    }
  };

  const handleDeleteLog = async (logId) => {
    if (!window.confirm('Are you sure you want to delete this log entry?')) return;

    try {
      const { error } = await supabase
        .from('project_logs')
        .delete()
        .eq('id', logId);

      if (error) throw error;
      
      alert('Log deleted successfully!');
      fetchLogs();
    } catch (error) {
      console.error('Error deleting log:', error);
      alert('Error deleting log: ' + error.message);
    }
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

  const getSalesStageIcon = (stage) => {
    if (stage?.toLowerCase().includes('closed-won')) return <FaCheckCircle className="stage-won" />;
    if (stage?.toLowerCase().includes('closed-lost')) return <FaExclamationTriangle className="stage-lost" />;
    if (stage?.toLowerCase().includes('closed-cancelled')) return <FaTimes className="stage-cancelled" />;
    return <FaChartLine className="stage-active" />;
  };

  const getFilteredTasks = () => {
    if (showCompleted) {
      return tasks;
    }
    return tasks.filter(task => !['Completed', 'Cancelled/On-hold'].includes(task.status));
  };

  const getActiveTasksCount = () => {
    return tasks.filter(task => !['Completed', 'Cancelled/On-hold'].includes(task.status)).length;
  };

  const getCompletedTasksCount = () => {
    return tasks.filter(task => task.status === 'Completed').length;
  };

  const getProgressPercentage = () => {
    if (tasks.length === 0) return 0;
    const completed = getCompletedTasksCount();
    return Math.round((completed / tasks.length) * 100);
  };

  const getDaysRemaining = () => {
    if (!project?.due_date) return null;
    const today = new Date();
    const dueDate = new Date(project.due_date);
    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getDaysRemainingText = () => {
    const days = getDaysRemaining();
    if (days === null) return 'No due date';
    if (days > 0) return `${days} days left`;
    if (days === 0) return 'Due today';
    return `${Math.abs(days)} days overdue`;
  };

  const getDaysRemainingClass = () => {
    const days = getDaysRemaining();
    if (days === null) return '';
    if (days < 0) return 'overdue';
    if (days <= 3) return 'urgent';
    if (days <= 7) return 'warning';
    return 'normal';
  };

  if (loading) {
    return (
      <div className="page-wrapper">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading project details...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="page-wrapper">
        <div className="error-state">
          <FaExclamationTriangle className="error-icon" />
          <h2>Oops! Something went wrong</h2>
          <p>{error || 'Project not found'}</p>
          <button onClick={() => navigate('/')} className="btn-primary">
            <FaHome /> Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <div className="page-content">
        {/* Navigation Buttons */}
        <div className="navigation-buttons">
          <button onClick={() => navigate('/')} className="nav-btn primary">
            <FaHome />
            Dashboard
          </button>
          {project.customer_name && (
            <button 
              onClick={() => {
                const findAndNavigateToCustomer = async () => {
                  try {
                    const { data: customers } = await supabase
                      .from('customers')
                      .select('id')
                      .eq('customer_name', project.customer_name)
                      .single();
                    
                    if (customers) {
                      navigate(`/customer/${customers.id}`);
                    } else {
                      navigate('/');
                    }
                  } catch (error) {
                    console.error('Error finding customer:', error);
                    navigate('/');
                  }
                };
                findAndNavigateToCustomer();
              }} 
              className="nav-btn secondary"
            >
              <FaUsers />
              {project.customer_name}
            </button>
          )}
        </div>

        {/* Project Header */}
        <div className="project-header">
          <div className="project-title-section">
            <h1 className="project-title">
              {project.project_name || 'Unnamed Project'}
            </h1>
            <div className="project-subtitle">
              <span className="customer-badge">
                <FaUsers />
                {project.customer_name}
              </span>
              <span className="stage-badge">
                {getSalesStageIcon(project.sales_stage)}
                {project.sales_stage || 'No Stage'}
              </span>
            </div>
          </div>
        </div>

        {/* Project Overview Cards */}
        <div className="overview-grid">
          <div className="overview-card primary">
            <div className="card-icon">
              <FaTasks />
            </div>
            <div className="card-content">
              <div className="card-value">{getActiveTasksCount()}</div>
              <div className="card-label">Active Tasks</div>
              <div className="card-trend">
                <FaCheckCircle />
                {getCompletedTasksCount()} completed
              </div>
            </div>
          </div>

          <div className="overview-card success">
            <div className="card-icon">
              <FaChartLine />
            </div>
            <div className="card-content">
              <div className="card-value">{getProgressPercentage()}%</div>
              <div className="card-label">Progress</div>
              <div className="card-trend">
                <FaChartLine />
                On track
              </div>
            </div>
          </div>

          <div className={`overview-card ${getDaysRemainingClass()}`}>
            <div className="card-icon">
              <FaCalendarAlt />
            </div>
            <div className="card-content">
              <div className="card-value">{getDaysRemaining() || '-'}</div>
              <div className="card-label">Days Remaining</div>
              <div className="card-trend">
                <FaCalendarAlt />
                {getDaysRemainingText()}
              </div>
            </div>
          </div>

          <div className="overview-card warning">
            <div className="card-icon">
              <FaDollarSign />
            </div>
            <div className="card-content">
              <div className="card-value">{formatCurrency(project.deal_value)}</div>
              <div className="card-label">Deal Value</div>
              <div className="card-trend">
                {getSalesStageIcon(project.sales_stage)}
                {project.sales_stage}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="main-content">
          {/* Left Column */}
          <div className="left-column">
            {/* Project Details */}
            <div className="section-card">
              <div className="section-header">
                <div className="section-title">
                  <FaInfo className="section-icon" />
                  <h3>Project Details</h3>
                </div>
                <div className="section-actions">
                  {isEditing ? (
                    <>
                      <button 
                        onClick={handleSaveProject} 
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
                <div className="details-grid">
                  <div className="detail-item">
                    <label className="detail-label">
                      <FaChartLine />
                      Sales Stage
                    </label>
                    {isEditing ? (
                      <select
                        name="sales_stage"
                        value={editProject.sales_stage || ''}
                        onChange={handleEditChange}
                        className="detail-input"
                      >
                        <option value="">Select Stage</option>
                        {salesStageOptions.map((stage, i) => (
                          <option key={i} value={stage}>{stage}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="detail-value">
                        {getSalesStageIcon(project.sales_stage)}
                        {project.sales_stage || 'Not specified'}
                      </div>
                    )}
                  </div>

                  <div className="detail-item">
                    <label className="detail-label">
                      <FaInfo />
                      Product
                    </label>
                    {isEditing ? (
                      <select
                        name="product"
                        value={editProject.product || ''}
                        onChange={handleEditChange}
                        className="detail-input"
                      >
                        <option value="">Select Product</option>
                        {productOptions.map((product, i) => (
                          <option key={i} value={product}>{product}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="detail-value">{project.product || 'Not specified'}</div>
                    )}
                  </div>

                  <div className="detail-item">
                    <label className="detail-label">
                      <FaUsers />
                      Account Manager
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="account_manager"
                        value={editProject.account_manager || ''}
                        onChange={handleEditChange}
                        className="detail-input"
                        placeholder="Account manager name"
                      />
                    ) : (
                      <div className="detail-value">{project.account_manager || 'Not assigned'}</div>
                    )}
                  </div>

                  <div className="detail-item">
                    <label className="detail-label">
                      <FaCalendarAlt />
                      Due Date
                    </label>
                    {isEditing ? (
                      <input
                        type="date"
                        name="due_date"
                        value={editProject.due_date || ''}
                        onChange={handleEditChange}
                        className="detail-input"
                      />
                    ) : (
                      <div className="detail-value">{formatDate(project.due_date)}</div>
                    )}
                  </div>

                  <div className="detail-item">
                    <label className="detail-label">
                      <FaDollarSign />
                      Deal Value
                    </label>
                    {isEditing ? (
                      <input
                        type="number"
                        name="deal_value"
                        value={editProject.deal_value || ''}
                        onChange={handleEditChange}
                        className="detail-input"
                        placeholder="Deal value"
                      />
                    ) : (
                      <div className="detail-value">{formatCurrency(project.deal_value)}</div>
                    )}
                  </div>

                  <div className="detail-item">
                    <label className="detail-label">
                      <FaUsers />
                      Backup Presales
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="backup_presales"
                        value={editProject.backup_presales || ''}
                        onChange={handleEditChange}
                        className="detail-input"
                        placeholder="Backup presales contact"
                      />
                    ) : (
                      <div className="detail-value">{project.backup_presales || 'Not assigned'}</div>
                    )}
                  </div>
                </div>

                <div className="detail-item full-width">
                  <label className="detail-label">
                    <FaInfo />
                    Scope
                  </label>
                  {isEditing ? (
                    <textarea
                      name="scope"
                      value={editProject.scope || ''}
                      onChange={handleEditChange}
                      className="detail-textarea"
                      rows="3"
                      placeholder="Project scope and objectives"
                    />
                  ) : (
                    <div className="detail-value scope-text">
                      {project.scope || 'No scope defined'}
                    </div>
                  )}
                </div>

                {(project.remarks || isEditing) && (
                  <div className="detail-item full-width">
                    <label className="detail-label">
                      <FaEdit />
                      Remarks
                    </label>
                    {isEditing ? (
                      <textarea
                        name="remarks"
                        value={editProject.remarks || ''}
                        onChange={handleEditChange}
                        className="detail-textarea"
                        rows="3"
                        placeholder="Project remarks or notes"
                      />
                    ) : (
                      <div className="detail-value scope-text">
                        {project.remarks || 'No remarks'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Tasks Section */}
            <div className="section-card">
              <div className="section-header">
                <div className="section-title">
                  <FaTasks className="section-icon" />
                  <h3>Project Tasks</h3>
                  <span className="task-counter">
                    {getActiveTasksCount()} active, {getCompletedTasksCount()} completed
                  </span>
                </div>
                <div className="section-actions">
                  <button onClick={handleAddTask} className="btn-primary">
                    <FaPlus />
                    Add Task
                  </button>
                  <button 
                    className={`btn-secondary ${showCompleted ? 'active' : ''}`}
                    onClick={() => setShowCompleted(!showCompleted)}
                  >
                    {showCompleted ? <FaChevronUp /> : <FaChevronDown />}
                    {showCompleted ? 'Hide Completed' : 'Show All'}
                  </button>
                </div>
              </div>

              <div className="section-content">
                {getFilteredTasks().length > 0 ? (
                  <div className="task-list">
                    {getFilteredTasks().map((task) => (
                      <div key={task.id} className="task-item">
                        <div className="task-checkbox-container">
                          <input 
                            type="checkbox" 
                            className="task-checkbox"
                            checked={task.status === 'Completed'}
                            onChange={() => handleTaskStatusChange(task.id, task.status)}
                          />
                        </div>
                        <div className="task-main-content">
                          <div className="task-header">
                            <h4 className="task-title">{task.description}</h4>
                            <div className="task-status-badge">
                              {getTaskStatusIcon(task.status)}
                              <span className={`status-text ${getTaskStatusClass(task.status)}`}>
                                {task.status}
                              </span>
                            </div>
                          </div>
                          {task.due_date && (
                            <div className="task-meta">
                              <FaCalendarAlt />
                              <span>Due {formatDate(task.due_date)}</span>
                            </div>
                          )}
                          {task.notes && (
                            <div className="task-notes">
                              <FaEdit />
                              {task.notes}
                            </div>
                          )}
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
                  </div>
                ) : (
                  <div className="empty-state">
                    <div className="empty-icon">
                      <FaTasks />
                    </div>
                    <h4>No {showCompleted ? '' : 'active '}tasks yet</h4>
                    <p>Create your first task to start tracking project progress</p>
                    <button onClick={handleAddTask} className="btn-primary">
                      <FaPlus />
                      Add Task
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="right-column">
            {/* Enhanced Task Summary */}
            <div className="section-card">
              <div className="section-header">
                <div className="section-title">
                  <FaChartLine className="section-icon" />
                  <h3>Task Analytics</h3>
                </div>
              </div>
              <div className="section-content">
                <div className="task-analytics-grid">
                  <div className="analytics-item">
                    <div className="analytics-icon completed">
                      <FaCheckCircle />
                    </div>
                    <div className="analytics-content">
                      <div className="analytics-value">{getCompletedTasksCount()}</div>
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
                    <div className="analytics-icon total">
                      <FaTasks />
                    </div>
                    <div className="analytics-content">
                      <div className="analytics-value">{tasks.length}</div>
                      <div className="analytics-label">Total</div>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="progress-section">
                  <div className="progress-header">
                    <span className="progress-label">Project Progress</span>
                    <span className="progress-percentage">{getProgressPercentage()}%</span>
                  </div>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${getProgressPercentage()}%` }}
                    ></div>
                  </div>
                </div>

                {/* Task Status Breakdown */}
                <div className="status-breakdown">
                  <h4 className="breakdown-title">Task Status Breakdown</h4>
                  <div className="status-list">
                    {['Not Started', 'In Progress', 'Completed', 'Cancelled/On-hold'].map(status => {
                      const count = tasks.filter(task => task.status === status).length;
                      if (count === 0) return null;
                      return (
                        <div key={status} className="status-item">
                          <div className={`status-indicator ${getTaskStatusClass(status)}`}>
                            {getTaskStatusIcon(status)}
                          </div>
                          <span className="status-name">{status}</span>
                          <span className="status-count">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Upcoming Due Dates */}
                {tasks.filter(task => task.due_date && !['Completed', 'Cancelled/On-hold'].includes(task.status)).length > 0 && (
                  <div className="upcoming-tasks">
                    <h4 className="upcoming-title">Upcoming Due Dates</h4>
                    <div className="upcoming-list">
                      {tasks
                        .filter(task => task.due_date && !['Completed', 'Cancelled/On-hold'].includes(task.status))
                        .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
                        .slice(0, 3)
                        .map(task => {
                          const daysUntilDue = Math.ceil((new Date(task.due_date) - new Date()) / (1000 * 60 * 60 * 24));
                          return (
                            <div key={task.id} className="upcoming-task">
                              <div className="upcoming-task-content">
                                <div className="upcoming-task-title">{task.description}</div>
                                <div className={`upcoming-task-due ${daysUntilDue < 0 ? 'overdue' : daysUntilDue <= 3 ? 'urgent' : 'normal'}`}>
                                  <FaCalendarAlt />
                                  {daysUntilDue < 0 ? `${Math.abs(daysUntilDue)} days overdue` : 
                                   daysUntilDue === 0 ? 'Due today' : 
                                   `${daysUntilDue} days left`}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Compact Project Log */}
            <div className="section-card">
              <div className="section-header">
                <div className="section-title">
                  <FaBookOpen className="section-icon" />
                  <h3>Project Log</h3>
                  <span className="log-counter">
                    {logs.length}
                  </span>
                </div>
                <div className="section-actions">
                  <button onClick={handleAddLog} className="btn-primary">
                    <FaPlus />
                  </button>
                </div>
              </div>

              <div className="section-content compact">
                {logs.length > 0 ? (
                  <div className="log-list compact">
                    {logs.slice(0, 5).map((log) => (
                      <div key={log.id} className="log-item compact">
                        <div className="log-content compact">
                          <div className="log-text">{log.entry}</div>
                          <div className="log-meta">
                            <span className="log-date-compact">
                              {formatDate(log.created_at)}
                            </span>
                            <button 
                              onClick={() => handleDeleteLog(log.id)}
                              className="log-delete-compact"
                              title="Delete"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {logs.length > 5 && (
                      <div className="log-view-more">
                        <button className="btn-secondary compact">
                          View All {logs.length} Entries
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="empty-state compact">
                    <div className="empty-icon">
                      <FaBookOpen />
                    </div>
                    <p>No entries yet</p>
                    <button onClick={handleAddLog} className="btn-primary">
                      <FaPlus />
                      Add Entry
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modals */}
        <TaskModal
          isOpen={showTaskModal}
          onClose={() => {
            setShowTaskModal(false);
            setEditingTask(null);
          }}
          onSave={handleTaskSaved}
          editingTask={editingTask}
        />

        <LogModal
          isOpen={showLogModal}
          onClose={() => setShowLogModal(false)}
          onSave={handleLogSaved}
        />
      </div>
    </div>
  );
}

export default ProjectDetails;
