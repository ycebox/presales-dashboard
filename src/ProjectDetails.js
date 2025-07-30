import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import './ProjectDetails.css';
import {
  FaHome, FaTasks, FaBookOpen, FaEdit, FaSave, FaTimes,
  FaPlus, FaInfo, FaTrash, FaChevronDown, FaChevronUp, 
  FaUsers, FaCalendarAlt, FaDollarSign, FaChartLine,
  FaCheckCircle, FaClock, FaExclamationTriangle, FaArrowLeft
} from 'react-icons/fa';

// Enhanced Task Modal Component
function TaskModal({ isOpen, onClose, onSave, editingTask = null }) {
  const [taskData, setTaskData] = useState({
    description: '',
    status: 'Not Started',
    due_date: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);

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
    setLoading(true);
    try {
      await onSave(taskData);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">
            {editingTask ? 'Edit Task' : 'Add New Task'}
          </h3>
          <button 
            className="modal-close-button" 
            onClick={onClose}
            aria-label="Close modal"
          >
            <FaTimes />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-grid">
            <div className="form-group full-width">
              <label htmlFor="task-description" className="form-label">
                <FaTasks className="form-icon" />
                Task Description *
              </label>
              <input 
                id="task-description"
                name="description" 
                value={taskData.description} 
                onChange={handleChange}
                className="form-input"
                placeholder="What needs to be done?"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="task-status" className="form-label">
                <FaChartLine className="form-icon" />
                Status
              </label>
              <select 
                id="task-status"
                name="status" 
                value={taskData.status} 
                onChange={handleChange}
                className="form-select"
              >
                <option value="Not Started">Not Started</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled/On-hold">Cancelled/On-hold</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="task-due-date" className="form-label">
                <FaCalendarAlt className="form-icon" />
                Due Date
              </label>
              <input 
                id="task-due-date"
                name="due_date" 
                type="date"
                value={taskData.due_date} 
                onChange={handleChange}
                className="form-input"
              />
            </div>

            <div className="form-group full-width">
              <label htmlFor="task-notes" className="form-label">
                <FaEdit className="form-icon" />
                Notes
              </label>
              <textarea 
                id="task-notes"
                name="notes" 
                value={taskData.notes} 
                onChange={handleChange}
                rows="3"
                className="form-textarea"
                placeholder="Additional details or context..."
              />
            </div>
          </div>
          
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="button-cancel" disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="button-submit" disabled={loading}>
              <FaSave />
              {loading ? 'Saving...' : editingTask ? 'Update Task' : 'Add Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Enhanced Log Modal Component
function LogModal({ isOpen, onClose, onSave }) {
  const [logEntry, setLogEntry] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!logEntry.trim()) {
      alert('Log entry is required');
      return;
    }
    setLoading(true);
    try {
      await onSave(logEntry);
      setLogEntry('');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Add Project Log</h3>
          <button 
            className="modal-close-button" 
            onClick={onClose}
            aria-label="Close modal"
          >
            <FaTimes />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-grid">
            <div className="form-group full-width">
              <label htmlFor="log-entry" className="form-label">
                <FaBookOpen className="form-icon" />
                Log Entry *
              </label>
              <textarea 
                id="log-entry"
                value={logEntry} 
                onChange={(e) => setLogEntry(e.target.value)}
                rows="4"
                className="form-textarea"
                placeholder="Document progress, decisions, or important updates..."
                required
              />
            </div>
          </div>
          
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="button-cancel" disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="button-submit" disabled={loading}>
              <FaPlus />
              {loading ? 'Adding...' : 'Add Log Entry'}
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
    if (!window.confirm('Are you sure you want to delete this task? This action cannot be undone.')) return;

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
    if (!window.confirm('Are you sure you want to delete this log entry? This action cannot be undone.')) return;

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
    if (days === null) return 'normal';
    if (days < 0) return 'overdue';
    if (days <= 3) return 'urgent';
    if (days <= 7) return 'warning';
    return 'normal';
  };

  // Loading component
  const LoadingScreen = () => (
    <div className="project-details-container">
      <div className="loading-state">
        <div className="loading-spinner"></div>
        <p className="loading-text">Loading project details...</p>
      </div>
    </div>
  );

  // Error component
  const ErrorScreen = () => (
    <div className="project-details-container">
      <div className="error-state">
        <div className="error-icon-wrapper">
          <FaExclamationTriangle className="error-icon" />
        </div>
        <h2 className="error-title">Oops! Something went wrong</h2>
        <p className="error-message">{error || 'Project not found'}</p>
        <button onClick={() => navigate('/')} className="action-button primary">
          <FaHome />
          Back to Dashboard
        </button>
      </div>
    </div>
  );

  // Empty state component
  const EmptyState = ({ title, description, action, icon }) => (
    <div className="empty-state">
      <div className="empty-icon-wrapper">
        {icon}
      </div>
      <h4 className="empty-title">{title}</h4>
      <p className="empty-description">{description}</p>
      {action && action}
    </div>
  );

  if (loading) {
    return <LoadingScreen />;
  }

  if (error || !project) {
    return <ErrorScreen />;
  }

  return (
    <div className="project-details-container">
      {/* Navigation Header */}
      <header className="navigation-header">
        <div className="navigation-content">
          <button onClick={() => navigate('/')} className="nav-button primary">
            <FaArrowLeft />
            <span>Back to Dashboard</span>
          </button>
          {project.customer_name && (
            <button 
              onClick={async () => {
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
              }} 
              className="nav-button secondary"
            >
              <FaUsers />
              <span>{project.customer_name}</span>
            </button>
          )}
        </div>
      </header>

      {/* Project Header */}
      <section className="project-header">
        <div className="project-title-section">
          <h1 className="project-title">
            {project.project_name || 'Unnamed Project'}
          </h1>
          <div className="project-subtitle">
            <span className="customer-badge">
              <FaUsers />
              <span>{project.customer_name}</span>
            </span>
            <span className="stage-badge">
              {getSalesStageIcon(project.sales_stage)}
              <span>{project.sales_stage || 'No Stage'}</span>
            </span>
          </div>
        </div>
      </section>

      {/* Overview Cards */}
      <section className="overview-section">
        <div className="overview-grid">
          <div className="overview-card primary">
            <div className="card-icon-wrapper">
              <FaTasks className="card-icon" />
            </div>
            <div className="card-content">
              <div className="card-value">{getActiveTasksCount()}</div>
              <div className="card-label">Active Tasks</div>
              <div className="card-trend">
                <FaCheckCircle />
                <span>{getCompletedTasksCount()} completed</span>
              </div>
            </div>
          </div>

          <div className="overview-card success">
            <div className="card-icon-wrapper">
              <FaChartLine className="card-icon" />
            </div>
            <div className="card-content">
              <div className="card-value">{getProgressPercentage()}%</div>
              <div className="card-label">Progress</div>
              <div className="card-trend">
                <FaChartLine />
                <span>On track</span>
              </div>
            </div>
          </div>

          <div className={`overview-card ${getDaysRemainingClass()}`}>
            <div className="card-icon-wrapper">
              <FaCalendarAlt className="card-icon" />
            </div>
            <div className="card-content">
              <div className="card-value">{getDaysRemaining() || '-'}</div>
              <div className="card-label">Days Remaining</div>
              <div className="card-trend">
                <FaCalendarAlt />
                <span>{getDaysRemainingText()}</span>
              </div>
            </div>
          </div>

          <div className="overview-card warning">
            <div className="card-icon-wrapper">
              <FaDollarSign className="card-icon" />
            </div>
            <div className="card-content">
              <div className="card-value">{formatCurrency(project.deal_value)}</div>
              <div className="card-label">Deal Value</div>
              <div className="card-trend">
                {getSalesStageIcon(project.sales_stage)}
                <span>{project.sales_stage}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="main-content-grid">
        {/* Left Column */}
        <div className="main-column">
          {/* Project Details Section */}
          <section className="content-card">
            <div className="card-header">
              <div className="header-title">
                <FaInfo className="header-icon" />
                <h3>Project Details</h3>
              </div>
              <div className="header-actions">
                {isEditing ? (
                  <>
                    <button 
                      onClick={handleSaveProject} 
                      className="action-button success"
                      disabled={saving}
                    >
                      <FaSave />
                      <span>{saving ? 'Saving...' : 'Save'}</span>
                    </button>
                    <button 
                      onClick={handleEditToggle} 
                      className="action-button secondary"
                      disabled={saving}
                    >
                      <FaTimes />
                      <span>Cancel</span>
                    </button>
                  </>
                ) : (
                  <button onClick={handleEditToggle} className="action-button primary">
                    <FaEdit />
                    <span>Edit</span>
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

            <div className="card-content">
              <div className="details-grid">
                <div className="detail-item">
                  <label className="detail-label">
                    <FaChartLine />
                    <span>Sales Stage</span>
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
                      <span>{project.sales_stage || 'Not specified'}</span>
                    </div>
                  )}
                </div>

                <div className="detail-item">
                  <label className="detail-label">
                    <FaInfo />
                    <span>Product</span>
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
                    <div className="detail-value">
                      <span>{project.product || 'Not specified'}</span>
                    </div>
                  )}
                </div>

                <div className="detail-item">
                  <label className="detail-label">
                    <FaUsers />
                    <span>Account Manager</span>
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
                    <div className="detail-value">
                      <span>{project.account_manager || 'Not assigned'}</span>
                    </div>
                  )}
                </div>

                <div className="detail-item">
                  <label className="detail-label">
                    <FaCalendarAlt />
                    <span>Due Date</span>
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
                    <div className="detail-value">
                      <span>{formatDate(project.due_date)}</span>
                    </div>
                  )}
                </div>

                <div className="detail-item">
                  <label className="detail-label">
                    <FaDollarSign />
                    <span>Deal Value</span>
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
                    <div className="detail-value">
                      <span>{formatCurrency(project.deal_value)}</span>
                    </div>
                  )}
                </div>

                <div className="detail-item">
                  <label className="detail-label">
                    <FaUsers />
                    <span>Backup Presales</span>
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
                    <div className="detail-value">
                      <span>{project.backup_presales || 'Not assigned'}</span>
                    </div>
                  )}
