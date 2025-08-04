import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import './ProjectDetails.css';
import {
  FaHome, FaTasks, FaBookOpen, FaEdit, FaSave, FaTimes,
  FaPlus, FaInfo, FaTrash, FaChevronDown, FaChevronUp, 
  FaUsers, FaCalendarAlt, FaDollarSign, FaChartLine,
  FaCheckCircle, FaClock, FaExclamationTriangle, FaArrowLeft,
  FaFilter, FaEye, FaEyeSlash, FaProjectDiagram, FaAward,
  FaBullseye, FaRocket, FaLightbulb, FaFileAlt
} from 'react-icons/fa';

// Constants

const SMARTVISTA_MODULES = [
  'Core Banking',
  'Card Management',
  'Digital Banking',
  'Payment Processing',
  'Risk Management',
  'Fraud Detection',
  'ATM Management',
  'Mobile Banking',
  'Internet Banking',
  'Merchant Acquiring',
  'Switch & Authorization',
  'Customer Onboarding'
];

const SALES_STAGES = [
  'Discovery', 'Demo', 'PoC', 'RFI', 'RFP', 'SoW', 
  'Contracting', 'Closed-Won', 'Closed-Lost', 'Closed-Cancelled/Hold'
];

const PRODUCTS = ['Marketplace', 'O-City', 'Processing', 'SmartVista'];

const TASK_STATUSES = ['Not Started', 'In Progress', 'Completed', 'Cancelled/On-hold'];

// Utility Functions

const getStatusClass = (status) => {
  if (!status) return 'status-not-specified';
  
  const statusLower = status.toLowerCase();
  
  // Check for common status patterns
  if (statusLower.includes('complet')) return 'status-completed';
  if (statusLower.includes('progress') || statusLower.includes('active') || statusLower.includes('working')) return 'status-in-progress';
  if (statusLower.includes('plan')) return 'status-planning';
  if (statusLower.includes('hold') || statusLower.includes('pause')) return 'status-on-hold';
  if (statusLower.includes('cancel')) return 'status-cancelled';
  if (statusLower.includes('delay')) return 'status-delayed';
  if (statusLower.includes('review')) return 'status-under-review';
  
  // Default to in-progress for any other status
  return 'status-in-progress';
};

const getStatusIcon = (status) => {
  if (!status) return <FaClock />;
  
  const statusLower = status.toLowerCase();
  
  if (statusLower.includes('complet')) return <FaCheckCircle />;
  if (statusLower.includes('progress') || statusLower.includes('active') || statusLower.includes('working')) return <FaClock />;
  if (statusLower.includes('plan')) return <FaLightbulb />;
  if (statusLower.includes('hold') || statusLower.includes('pause')) return <FaExclamationTriangle />;
  if (statusLower.includes('cancel')) return <FaTimes />;
  if (statusLower.includes('delay')) return <FaExclamationTriangle />;
  if (statusLower.includes('review')) return <FaEye />;
  
  return <FaClock />;
};

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
  return <FaRocket className="stage-active" />;
};

const getSalesStageClass = (stage) => {
  if (stage?.toLowerCase().includes('closed-won')) return 'stage-won';
  if (stage?.toLowerCase().includes('closed-lost')) return 'stage-lost';
  if (stage?.toLowerCase().includes('closed-cancelled')) return 'stage-cancelled';
  return 'stage-active';
};

// Modal Components
const TaskModal = ({ isOpen, onClose, onSave, editingTask = null }) => {
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
          <div className="modal-title-wrapper">
            <FaTasks className="modal-icon" />
            <h3 className="modal-title">
              {editingTask ? 'Edit Task' : 'Create New Task'}
            </h3>
          </div>
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
                onChange={(e) => setTaskData(prev => ({ ...prev, description: e.target.value }))}
                className="form-input"
                placeholder="What needs to be accomplished?"
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
                onChange={(e) => setTaskData(prev => ({ ...prev, status: e.target.value }))}
                className="form-select"
              >
                {TASK_STATUSES.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
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
                onChange={(e) => setTaskData(prev => ({ ...prev, due_date: e.target.value }))}
                className="form-input"
              />
            </div>

            <div className="form-group full-width">
              <label htmlFor="task-notes" className="form-label">
                <FaFileAlt className="form-icon" />
                Notes
              </label>
              <textarea 
                id="task-notes"
                name="notes" 
                value={taskData.notes} 
                onChange={(e) => setTaskData(prev => ({ ...prev, notes: e.target.value }))}
                rows="3"
                className="form-textarea"
                placeholder="Additional context, requirements, or details..."
              />
            </div>
          </div>
          
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="button-cancel" disabled={loading}>
              <FaTimes />
              Cancel
            </button>
            <button type="submit" className="button-submit" disabled={loading}>
              <FaSave />
              {loading ? 'Saving...' : editingTask ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const LogModal = ({ isOpen, onClose, onSave }) => {
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
          <div className="modal-title-wrapper">
            <FaBookOpen className="modal-icon" />
            <h3 className="modal-title">Add Project Log Entry</h3>
          </div>
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
                <FaEdit className="form-icon" />
                Log Entry *
              </label>
              <textarea 
                id="log-entry"
                value={logEntry} 
                onChange={(e) => setLogEntry(e.target.value)}
                rows="5"
                className="form-textarea"
                placeholder="Document progress, decisions, meeting notes, or any important project updates..."
                required
              />
            </div>
          </div>
          
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="button-cancel" disabled={loading}>
              <FaTimes />
              Cancel
            </button>
            <button type="submit" className="button-submit" disabled={loading}>
              <FaPlus />
              {loading ? 'Adding...' : 'Add Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// UI Components
const EmptyState = ({ title, description, action, icon }) => (
  <div className="empty-state">
    <div className="empty-icon-wrapper">
      {icon}
    </div>
    <h4 className="empty-title">{title}</h4>
    <p className="empty-description">{description}</p>
    {action}
  </div>
);

const LoadingScreen = () => (
  <div className="project-details-container">
    <div className="loading-state">
      <div className="loading-spinner"></div>
      <p className="loading-text">Loading project details...</p>
    </div>
  </div>
);

const ErrorScreen = ({ error, onBack }) => (
  <div className="project-details-container">
    <div className="error-state">
      <div className="error-icon-wrapper">
        <FaExclamationTriangle className="error-icon" />
      </div>
      <h2 className="error-title">Something went wrong</h2>
      <p className="error-message">{error || 'Project not found'}</p>
      <button onClick={onBack} className="action-button primary">
        <FaHome />
        Back to Dashboard
      </button>
    </div>
  </div>
);

// Custom Hook for Project Data
const useProjectData = (projectId) => {
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProjectDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projectError) throw projectError;
      if (!projectData) throw new Error('Project not found');

      setProject(projectData);
      await Promise.all([fetchTasks(), fetchLogs()]);
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
        .eq('project_id', projectId)
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
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching logs:', error);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchProjectDetails();
    }
  }, [projectId]);

  return {
    project,
    setProject,
    tasks,
    logs,
    loading,
    error,
    fetchTasks,
    fetchLogs,
    refetch: fetchProjectDetails
  };
};

// Main Component
function ProjectDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { project, setProject, tasks, logs, loading, error, fetchTasks, fetchLogs } = useProjectData(id);
  
  // Local state
  const [isEditing, setIsEditing] = useState(false);
  const [editProject, setEditProject] = useState({});
  const [saving, setSaving] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [showModulesDropdown, setShowModulesDropdown] = useState(false);

  // Update edit state when project changes
  useEffect(() => {
    if (project) {
      setEditProject(project);
    }
  }, [project]);

  // Calculated values
  const activeTasksCount = tasks.filter(task => !['Completed', 'Cancelled/On-hold'].includes(task.status)).length;
  const completedTasksCount = tasks.filter(task => task.status === 'Completed').length;
  const progressPercentage = tasks.length > 0 ? Math.round((completedTasksCount / tasks.length) * 100) : 0;
  
  const daysRemaining = (() => {
    if (!project?.due_date) return null;
    const today = new Date();
    const dueDate = new Date(project.due_date);
    const diffTime = dueDate - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  })();

  const getDaysRemainingText = () => {
    if (daysRemaining === null) return 'No due date set';
    if (daysRemaining > 0) return `${daysRemaining} days remaining`;
    if (daysRemaining === 0) return 'Due today';
    return `${Math.abs(daysRemaining)} days overdue`;
  };

  const getDaysRemainingClass = () => {
    if (daysRemaining === null) return 'normal';
    if (daysRemaining < 0) return 'overdue';
    if (daysRemaining <= 3) return 'urgent';
    if (daysRemaining <= 7) return 'warning';
    return 'normal';
  };

  const filteredTasks = showCompleted ? tasks : tasks.filter(task => !['Completed', 'Cancelled/On-hold'].includes(task.status));

  // Event handlers
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
    const newValue = type === 'number' ? parseFloat(value) || 0 : value;
    setEditProject(prev => ({ ...prev, [name]: newValue }));
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
        const { error } = await supabase
          .from('project_tasks')
          .insert([{ ...taskData, project_id: id }]);

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

  const navigateToCustomer = async () => {
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

  // Render states
  if (loading) return <LoadingScreen />;
  if (error || !project) return <ErrorScreen error={error} onBack={() => navigate('/')} />;

  return (
    <div className="project-details-container">
      {/* Navigation Header */}
      <header className="navigation-header">
        <div className="nav-left">
          <button onClick={() => navigate('/')} className="nav-button primary">
            <FaArrowLeft />
            <span>Back to Dashboard</span>
          </button>
          {project.customer_name && (
            <button onClick={navigateToCustomer} className="nav-button secondary">
              <FaUsers />
              <span>{project.customer_name}</span>
            </button>
          )}
        </div>
      </header>

      {/* Project Header */}
      <section className="project-header">
        <div className="project-hero">
          <div className="project-title-section">
            <div className="project-icon-wrapper">
              <FaProjectDiagram className="project-icon" />
            </div>
            <div className="project-title-content">
              <h1 className="project-title">
                {project.project_name || 'Unnamed Project'}
              </h1>
              <div className="project-meta">
                <span className="customer-badge">
                  <span>{project.customer_name}</span>
                </span>
                <span className={`stage-badge ${getSalesStageClass(project.sales_stage)}`}>
                  <span>{project.sales_stage || 'No Stage'}</span>
                </span>
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
      <h3>Project Information</h3>
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
            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
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
          <span>Edit Details</span>
        </button>
      )}
    </div>
  </div>

  {isEditing && (
    <div className="edit-banner">
      <FaLightbulb className="edit-icon" />
      <span>Edit mode active - Make your changes and save when ready</span>
    </div>
  )}

  <div className="card-content">
    {/* Current Status/Progress - Highlighted at the top */}
    <div className="status-highlight-section">
      <div className="status-highlight-card">
        <div className="status-highlight-header">
          <div className="status-highlight-icon-wrapper">
            <FaChartLine className="status-highlight-icon" />
          </div>
          <div className="status-highlight-content">
            <h4 className="status-highlight-title">Current Status</h4>
            {isEditing ? (
              <input
                type="text"
                name="current_status"
                value={editProject.current_status || ''}
                onChange={handleEditChange}
                className="status-highlight-input"
                placeholder="Enter current project status..."
              />
            ) : (
              <div className={`status-highlight-value ${getStatusClass(project.current_status)}`}>
                {getStatusIcon(project.current_status)}
                <span>{project.current_status || 'Not specified'}</span>
              </div>
            )}
          </div>
        </div>
        {!isEditing && project.progress_notes && (
          <div className="status-progress-notes">
            <FaFileAlt className="progress-notes-icon" />
            <span>{project.progress_notes}</span>
          </div>
        )}
        {isEditing && (
          <div className="progress-notes-edit">
            <label className="progress-notes-label">
              <FaFileAlt className="form-icon" />
              Progress Notes
            </label>
            <textarea
              name="progress_notes"
              value={editProject.progress_notes || ''}
              onChange={handleEditChange}
              className="progress-notes-textarea"
              rows="2"
              placeholder="Add notes about current progress, blockers, or next steps..."
            />
          </div>
        )}
      </div>
    </div>

    <div className="details-grid">
      <div className="detail-item">
        <label className="detail-label">
          <FaRocket className="detail-icon" />
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
            {SALES_STAGES.map((stage, i) => (
              <option key={i} value={stage}>{stage}</option>
            ))}
          </select>
        ) : (
          <div className={`detail-value stage-value ${getSalesStageClass(project.sales_stage)}`}>
            {getSalesStageIcon(project.sales_stage)}
            <span>{project.sales_stage || 'Not specified'}</span>
          </div>
        )}
      </div>

      <div className="detail-item">
        <label className="detail-label">
          <FaBullseye className="detail-icon" />
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
            {PRODUCTS.map((product, i) => (
              <option key={i} value={product}>{product}</option>
            ))}
          </select>
        ) : (
          <div className="detail-value">
            <span>{project.product || 'Not specified'}</span>
          </div>
        )}
      </div>

      {/* SmartVista Modules - Multi-select */}
      <div className="detail-item">
        <label className="detail-label">
          <FaAward className="detail-icon" />
          <span>SmartVista Modules</span>
        </label>
        {isEditing ? (
          <div className="multi-select-container">
            <div className="multi-select-dropdown">
              <button
                type="button"
                className="multi-select-button"
                onClick={() => setShowModulesDropdown(!showModulesDropdown)}
              >
                <span>
                  {editProject.smartvista_modules && editProject.smartvista_modules.length > 0
                    ? `${editProject.smartvista_modules.length} module(s) selected`
                    : 'Select modules'
                  }
                </span>
                <FaChevronDown className={`dropdown-icon ${showModulesDropdown ? 'rotated' : ''}`} />
              </button>
              {showModulesDropdown && (
                <div className="multi-select-options">
                  {SMARTVISTA_MODULES.map((module, i) => (
                    <label key={i} className="multi-select-option">
                      <input
                        type="checkbox"
                        checked={editProject.smartvista_modules?.includes(module) || false}
                        onChange={(e) => {
                          const currentModules = editProject.smartvista_modules || [];
                          let updatedModules;
                          
                          if (e.target.checked) {
                            updatedModules = [...currentModules, module];
                          } else {
                            updatedModules = currentModules.filter(m => m !== module);
                          }
                          
                          setEditProject(prev => ({ 
                            ...prev, 
                            smartvista_modules: updatedModules 
                          }));
                        }}
                      />
                      <span className="checkmark"></span>
                      <span className="option-text">{module}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            {editProject.smartvista_modules && editProject.smartvista_modules.length > 0 && (
              <div className="selected-modules-preview">
                {editProject.smartvista_modules.map((module, i) => (
                  <span key={i} className="module-tag">
                    {module}
                    <button
                      type="button"
                      onClick={() => {
                        const updatedModules = editProject.smartvista_modules.filter(m => m !== module);
                        setEditProject(prev => ({ 
                          ...prev, 
                          smartvista_modules: updatedModules 
                        }));
                      }}
                      className="remove-module-button"
                    >
                      <FaTimes />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="detail-value">
            {project.smartvista_modules && project.smartvista_modules.length > 0 ? (
              <div className="modules-display">
                {project.smartvista_modules.map((module, i) => (
                  <span key={i} className="module-tag-display">
                    {module}
                  </span>
                ))}
              </div>
            ) : (
              <span>Not specified</span>
            )}
          </div>
        )}
      </div>

      <div className="detail-item">
        <label className="detail-label">
          <FaUsers className="detail-icon" />
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
          <FaCalendarAlt className="detail-icon" />
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
          <FaDollarSign className="detail-icon" />
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
          <FaUsers className="detail-icon" />
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
      </div>
    </div>

    <div className="detail-item full-width">
      <label className="detail-label">
        <FaBullseye className="detail-icon" />
        <span>Project Scope</span>
      </label>
      {isEditing ? (
        <textarea
          name="scope"
          value={editProject.scope || ''}
          onChange={handleEditChange}
          className="detail-textarea"
          rows="4"
          placeholder="Describe the project scope, objectives, and deliverables..."
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
          <FaFileAlt className="detail-icon" />
          <span>Additional Notes</span>
        </label>
        {isEditing ? (
          <textarea
            name="remarks"
            value={editProject.remarks || ''}
            onChange={handleEditChange}
            className="detail-textarea"
            rows="3"
            placeholder="Any additional remarks, constraints, or important notes..."
          />
        ) : (
          <div className="detail-value scope-text">
            {project.remarks || 'No additional notes'}
          </div>
        )}
      </div>
    )}
  </div>
</section>
        

          {/* Tasks Section */}
          <section className="content-card">
            <div className="card-header">
              <div className="header-title">
                <FaTasks className="header-icon" />
                <h3>Project Tasks</h3>
                <div className="task-counter">
                  <span className="counter-item active">
                    <FaClock className="counter-icon" />
                    {activeTasksCount} active
                  </span>
                  <span className="counter-item completed">
                    <FaCheckCircle className="counter-icon" />
                    {completedTasksCount} done
                  </span>
                </div>
              </div>
              <div className="header-actions">
                <button 
                  onClick={() => setShowTaskModal(true)} 
                  className="action-button primary"
                >
                  <FaPlus />
                  <span>New Task</span>
                </button>
                <button 
                  className={`action-button secondary filter-button ${showCompleted ? 'active' : ''}`}
                  onClick={() => setShowCompleted(!showCompleted)}
                  title={showCompleted ? 'Hide completed tasks' : 'Show all tasks'}
                >
                  {showCompleted ? <FaEyeSlash /> : <FaEye />}
                  <span>{showCompleted ? 'Hide Done' : 'Show All'}</span>
                </button>
              </div>
            </div>

  <div className="card-content">
  {filteredTasks.length > 0 ? (
    <div className="task-list">
      {filteredTasks.map((task) => (
        <div key={task.id} className={`task-item ${getTaskStatusClass(task.status)}`}>
          <div className="task-checkbox-wrapper">
            <div className="custom-checkbox">
              <input 
                type="checkbox" 
                className="task-checkbox"
                checked={task.status === 'Completed'}
                onChange={() => handleTaskStatusChange(task.id, task.status)}
                aria-label={`Mark task "${task.description}" as ${task.status === 'Completed' ? 'incomplete' : 'complete'}`}
              />
              <div className="checkbox-visual">
                <FaCheckCircle className="check-icon" />
              </div>
            </div>
          </div>
          
          <div className="task-main-content">
            <div className="task-header">
              <h4 className="task-title">{task.description}</h4>
              <div className={`task-status-badge ${getTaskStatusClass(task.status)}`}>
                {getTaskStatusIcon(task.status)}
                <span className="status-text">
                  {task.status}
                </span>
              </div>
            </div>
            
            <div className="task-meta-row">
              {task.due_date && (
                <div className="task-meta-item">
                  <FaCalendarAlt className="meta-icon" />
                  <span>Due {formatDate(task.due_date)}</span>
                </div>
              )}

              <div className="task-actions">
                <button
                  onClick={() => {
                    setEditingTask(task);
                    setShowTaskModal(true);
                  }}
                  className="task-action-button edit"
                  title="Edit task"
                  aria-label={`Edit task "${task.description}"`}
                >
                  <FaEdit />
                </button>
                <button
                  onClick={() => handleDeleteTask(task.id)}
                  className="task-action-button delete"
                  title="Delete task"
                  aria-label={`Delete task "${task.description}"`}
                >
                  <FaTrash />
                </button>
              </div>
            </div>

            {task.notes && (
              <div className="task-meta-item">
                <FaFileAlt className="meta-icon" />
                <span className="task-notes-preview">{task.notes}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  ) : (
    <EmptyState
      title={`No ${showCompleted ? '' : 'active '}tasks found`}
      description={showCompleted ? "All tasks are completed! Great work." : "Create your first task to start tracking project progress"}
      icon={<FaTasks />}
      action={
        <button 
          onClick={() => setShowTaskModal(true)} 
          className="action-button primary"
        >
          <FaPlus />
          <span>Create Task</span>
        </button>
      }
    />
  )}
</div>
          </section>
        </div>

        {/* Right Sidebar */}
        <div className="sidebar-column">
          {/* Progress Analytics */}
          <section className="content-card">
            <div className="card-header">
              <div className="header-title">
                <FaChartLine className="header-icon" />
                <h3>Task Progress Overview</h3>
              </div>
            </div>
            <div className="card-content">
              {/* Task Analytics Grid */}
              <div className="analytics-grid">
                <div className="analytics-item completed">
                  <div className="analytics-icon-wrapper">
                    <FaCheckCircle className="analytics-icon" />
                  </div>
                  <div className="analytics-content">
                    <div className="analytics-value">{completedTasksCount}</div>
                    <div className="analytics-label">Completed</div>
                  </div>
                </div>
                
                <div className="analytics-item active">
                  <div className="analytics-icon-wrapper">
                    <FaClock className="analytics-icon" />
                  </div>
                  <div className="analytics-content">
                    <div className="analytics-value">{activeTasksCount}</div>
                    <div className="analytics-label">In Progress</div>
                  </div>
                </div>
                
                <div className="analytics-item total">
                  <div className="analytics-icon-wrapper">
                    <FaTasks className="analytics-icon" />
                  </div>
                  <div className="analytics-content">
                    <div className="analytics-value">{tasks.length}</div>
                    <div className="analytics-label">Total Tasks</div>
                  </div>
                </div>
              </div>

              {/* Upcoming Due Dates */}
              {tasks.filter(task => task.due_date && !['Completed', 'Cancelled/On-hold'].includes(task.status)).length > 0 && (
                <div className="upcoming-tasks">
                  <h4 className="upcoming-title">
                    <FaCalendarAlt className="upcoming-icon" />
                    Upcoming Deadlines
                  </h4>
                  <div className="upcoming-list">
                    {tasks
                      .filter(task => task.due_date && !['Completed', 'Cancelled/On-hold'].includes(task.status))
                      .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
                      .slice(0, 3)
                      .map(task => {
                        const daysUntilDue = Math.ceil((new Date(task.due_date) - new Date()) / (1000 * 60 * 60 * 24));
                        return (
                          <div key={task.id} className={`upcoming-task ${daysUntilDue < 0 ? 'overdue' : daysUntilDue <= 3 ? 'urgent' : 'normal'}`}>
                            <div className="upcoming-task-content">
                              <div className="upcoming-task-title">{task.description}</div>
                              <div className="upcoming-task-due">
                                <FaCalendarAlt className="due-icon" />
                                <span>
                                  {daysUntilDue < 0 ? `${Math.abs(daysUntilDue)} days overdue` : 
                                   daysUntilDue === 0 ? 'Due today' : 
                                   `${daysUntilDue} days left`}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Project Log */}
          <section className="content-card">
            <div className="card-header">
              <div className="header-title">
                <FaBookOpen className="header-icon" />
                <h3>Activity Log</h3>
                <span className="log-counter">
                  {logs.length} {logs.length === 1 ? 'entry' : 'entries'}
                </span>
              </div>
              <div className="header-actions">
                <button 
                  onClick={() => setShowLogModal(true)} 
                  className="action-button primary icon-only"
                  title="Add log entry"
                >
                  <FaPlus />
                </button>
              </div>
            </div>

            <div className="card-content">
              {logs.length > 0 ? (
                <div className="log-list">
                  {logs.slice(0, 5).map((log, index) => (
                    <div key={log.id} className="log-item">
                      <div className="log-timeline">
                        <div className="log-dot"></div>
                        {index < logs.slice(0, 5).length - 1 && <div className="log-line"></div>}
                      </div>
                      <div className="log-content">
                        <div className="log-text">{log.entry}</div>
                        <div className="log-meta">
                          <FaCalendarAlt className="log-meta-icon" />
                          <span className="log-date">
                            {formatDate(log.created_at)}
                          </span>
                          <button 
                            onClick={() => handleDeleteLog(log.id)}
                            className="log-delete-button"
                            title="Delete log entry"
                            aria-label={`Delete log entry from ${formatDate(log.created_at)}`}
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {logs.length > 5 && (
                    <div className="log-view-more">
                      <button className="action-button secondary small">
                        <FaEye />
                        View All {logs.length} Entries
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <EmptyState
                  title="No activity yet"
                  description="Start documenting project progress, decisions, and important updates"
                  icon={<FaBookOpen />}
                  action={
                    <button 
                      onClick={() => setShowLogModal(true)} 
                      className="action-button primary"
                    >
                      <FaPlus />
                      <span>Add Entry</span>
                    </button>
                  }
                />
              )}
            </div>
          </section>
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
  );
}

export default ProjectDetails;
