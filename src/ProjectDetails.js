// ProjectDetails.js
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import './ProjectDetails.css';
import {
  FaTasks,
  FaBookOpen,
  FaEdit,
  FaSave,
  FaTimes,
  FaPlus,
  FaInfo,
  FaTrash,
  FaUsers,
  FaCalendarAlt,
  FaDollarSign,
  FaChartLine,
  FaCheckCircle,
  FaClock,
  FaExclamationTriangle,
  FaEye,
  FaEyeSlash,
  FaProjectDiagram,
  FaBullseye,
  FaRocket,
  FaFileAlt,
} from 'react-icons/fa';

const SALES_STAGES = [
  'Discovery', 'Demo', 'PoC', 'RFI', 'RFP', 'SoW',
  'Contracting', 'Closed-Won', 'Closed-Lost', 'Closed-Cancelled/Hold'
];

const TASK_STATUSES = ['Not Started', 'In Progress', 'Completed', 'Cancelled/On-hold'];

const formatDate = (dateString) => {
  if (!dateString) return '-';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (e) {
    return '-';
  }
};

const formatCurrency = (value) => {
  if (value === null || value === undefined || value === '') return '-';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Number(value));
  } catch (e) {
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
  if (!stage) return <FaRocket className="stage-active" />;
  const s = stage.toLowerCase();
  if (s.includes('closed-won')) return <FaCheckCircle className="stage-won" />;
  if (s.includes('closed-lost')) return <FaExclamationTriangle className="stage-lost" />;
  if (s.includes('closed-cancelled')) return <FaTimes className="stage-cancelled" />;
  return <FaRocket className="stage-active" />;
};

const getSalesStageClass = (stage) => {
  if (!stage) return 'stage-active';
  const s = stage.toLowerCase();
  if (s.includes('closed-won')) return 'stage-won';
  if (s.includes('closed-lost')) return 'stage-lost';
  if (s.includes('closed-cancelled')) return 'stage-cancelled';
  return 'stage-active';
};

// ---------- Task Modal ----------
const TaskModal = ({
  isOpen,
  onClose,
  onSave,
  editingTask = null,
  presalesResources = [],
  taskTypes = [],
}) => {
  const [taskData, setTaskData] = useState({
    description: '',
    status: 'Not Started',
    start_date: '',
    end_date: '',
    due_date: '',
    notes: '',
    assignee: '',
    task_type: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingTask) {
      setTaskData({
        description: editingTask.description || '',
        status: editingTask.status || 'Not Started',
        start_date: editingTask.start_date || '',
        end_date: editingTask.end_date || '',
        due_date: editingTask.due_date || '',
        notes: editingTask.notes || '',
        assignee: editingTask.assignee || '',
        task_type: editingTask.task_type || ''
      });
    } else {
      setTaskData({
        description: '',
        status: 'Not Started',
        start_date: '',
        end_date: '',
        due_date: '',
        notes: '',
        assignee: '',
        task_type: ''
      });
    }
  }, [editingTask, isOpen]);

  const handleChange = (field, value) => {
    setTaskData((prev) => ({ ...prev, [field]: value }));
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

  const hasPresalesList = presalesResources && presalesResources.length > 0;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrapper">
            <FaTasks className="modal-icon" />
            <h3 className="modal-title">{editingTask ? 'Edit Task' : 'Create New Task'}</h3>
          </div>
          <button className="modal-close-button" onClick={onClose} aria-label="Close modal">
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-grid">
            <div className="form-group full-width">
              <label className="form-label">
                <FaTasks className="form-icon" />
                Task Description *
              </label>
              <input
                name="description"
                value={taskData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                className="form-input"
                placeholder="What needs to be accomplished?"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <FaUsers className="form-icon" />
                Assignee
              </label>
              {hasPresalesList ? (
                <select
                  name="assignee"
                  className="form-select"
                  value={taskData.assignee || ''}
                  onChange={(e) => handleChange('assignee', e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {presalesResources
                    .filter((r) => r.is_active !== false)
                    .map((r) => (
                      <option key={r.id} value={r.name}>
                        {r.name}{r.region ? ` (${r.region})` : ''}
                      </option>
                    ))}
                </select>
              ) : (
                <input
                  name="assignee"
                  value={taskData.assignee}
                  onChange={(e) => handleChange('assignee', e.target.value)}
                  className="form-input"
                  placeholder="Who owns this task?"
                />
              )}
            </div>

            <div className="form-group">
              <label className="form-label">
                <FaChartLine className="form-icon" />
                Status
              </label>
              <select
                name="status"
                value={taskData.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className="form-select"
              >
                {TASK_STATUSES.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                <FaInfo className="form-icon" />
                Task Type
              </label>
              {taskTypes && taskTypes.length > 0 ? (
                <select
                  name="task_type"
                  className="form-select"
                  value={taskData.task_type || ''}
                  onChange={(e) => handleChange('task_type', e.target.value)}
                >
                  <option value="">Select type</option>
                  {taskTypes.map((t) => (
                    <option key={t.id} value={t.name}>{t.name}</option>
                  ))}
                </select>
              ) : (
                <input
                  name="task_type"
                  className="form-input"
                  value={taskData.task_type || ''}
                  onChange={(e) => handleChange('task_type', e.target.value)}
                  placeholder="e.g. RFP, Demo, PoC"
                />
              )}
            </div>

            <div className="form-group">
              <label className="form-label">
                <FaCalendarAlt className="form-icon" />
                Start Date
              </label>
              <input
                name="start_date"
                type="date"
                value={taskData.start_date || ''}
                onChange={(e) => handleChange('start_date', e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <FaCalendarAlt className="form-icon" />
                End Date
              </label>
              <input
                name="end_date"
                type="date"
                value={taskData.end_date || ''}
                onChange={(e) => handleChange('end_date', e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <FaCalendarAlt className="form-icon" />
                Due Date
              </label>
              <input
                name="due_date"
                type="date"
                value={taskData.due_date || ''}
                onChange={(e) => handleChange('due_date', e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group full-width">
              <label className="form-label">
                <FaFileAlt className="form-icon" />
                Notes
              </label>
              <textarea
                name="notes"
                value={taskData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                rows="3"
                className="form-textarea"
                placeholder="Additional context or details..."
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

// ---------- Log Modal ----------
const LogModal = ({ isOpen, onClose, onSave, editingLog = null }) => {
  const [logEntry, setLogEntry] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLogEntry(editingLog ? (editingLog.entry || '') : '');
  }, [editingLog, isOpen]);

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
            <h3 className="modal-title">{editingLog ? 'Edit Log Entry' : 'Add Project Log Entry'}</h3>
          </div>
          <button className="modal-close-button" onClick={onClose} aria-label="Close modal">
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-grid">
            <div className="form-group full-width">
              <label className="form-label">
                <FaEdit className="form-icon" />
                Log Entry *
              </label>
              <textarea
                value={logEntry}
                onChange={(e) => setLogEntry(e.target.value)}
                rows="5"
                className="form-textarea"
                placeholder="Decisions, progress notes, meeting minutes, important updates..."
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
              <FaSave />
              {loading ? (editingLog ? 'Updating...' : 'Adding...') : (editingLog ? 'Update Entry' : 'Add Entry')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

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
        <span>Back to Home</span>
      </button>
    </div>
  </div>
);

const useProjectData = (projectId) => {
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('project_tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (err) {
      console.error('Error fetching tasks:', err);
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
    } catch (err) {
      console.error('Error fetching logs:', err);
    }
  };

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
    } catch (err) {
      console.error('Error fetching project:', err);
      setError('Failed to load project details: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) fetchProjectDetails();
  }, [projectId]);

  return { project, setProject, tasks, logs, loading, error, fetchTasks, fetchLogs };
};

function ProjectDetails() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const { project, setProject, tasks, logs, loading, error, fetchTasks, fetchLogs } =
    useProjectData(projectId);

  const [isEditing, setIsEditing] = useState(false);
  const [editProject, setEditProject] = useState({});
  const [saving, setSaving] = useState(false);

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [editingLog, setEditingLog] = useState(null);
  const [showCompleted, setShowCompleted] = useState(false);

  const [presalesResources, setPresalesResources] = useState([]);
  const [taskTypes, setTaskTypes] = useState([]);

  // --- Project Background (remarks) ---
  const [isEditingBackground, setIsEditingBackground] = useState(false);
  const [backgroundDraft, setBackgroundDraft] = useState('');
  const [savingBackground, setSavingBackground] = useState(false);

  useEffect(() => {
    if (project) {
      setEditProject(project);
      setBackgroundDraft(project.remarks || '');
    }
  }, [project]);

  useEffect(() => {
    const fetchPresalesResources = async () => {
      try {
        const { data, error } = await supabase
          .from('presales_resources')
          .select('id, name, email, region, is_active')
          .order('name', { ascending: true });

        if (error) {
          console.warn('Error loading presales_resources:', error.message);
          setPresalesResources([]);
          return;
        }

        setPresalesResources(data || []);
      } catch (err) {
        console.warn('Unexpected error loading presales_resources:', err);
        setPresalesResources([]);
      }
    };

    fetchPresalesResources();
  }, []);

  useEffect(() => {
    const fetchTaskTypes = async () => {
      try {
        const { data, error } = await supabase
          .from('task_types')
          .select('id, name, is_active, sort_order')
          .eq('is_active', true)
          .order('sort_order', { ascending: true });

        if (error) {
          console.warn('Error loading task_types:', error.message);
          setTaskTypes([]);
          return;
        }

        setTaskTypes(data || []);
      } catch (err) {
        console.warn('Unexpected error loading task_types:', err);
        setTaskTypes([]);
      }
    };

    fetchTaskTypes();
  }, []);

  const activeTasksCount = tasks.filter(
    (t) => !['Completed', 'Cancelled/On-hold'].includes(t.status)
  ).length;

  const completedTasksCount = tasks.filter((t) => t.status === 'Completed').length;

  const daysRemaining = (() => {
    if (!project?.due_date) return null;
    const today = new Date();
    const due = new Date(project.due_date);
    const diff = due - today;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
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

  const filteredTasks = showCompleted
    ? tasks
    : tasks.filter((t) => !['Completed', 'Cancelled/On-hold'].includes(t.status));

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
    const newValue = type === 'number' ? (value === '' ? null : Number(value)) : value;
    setEditProject((prev) => ({ ...prev, [name]: newValue }));
  };

  const handleSaveProject = async () => {
    try {
      setSaving(true);

      // Only update columns that exist in your schema
      const payload = {
        project_name: editProject.project_name || null,
        customer_name: editProject.customer_name || null,
        account_manager: editProject.account_manager || null,
        scope: editProject.scope || null,
        deal_value: editProject.deal_value ?? null,
        product: editProject.product || null,
        backup_presales: editProject.backup_presales || null,
        sales_stage: editProject.sales_stage || null,
        due_date: editProject.due_date || null,
        project_type: editProject.project_type || null,
        current_status: editProject.current_status || null,
        smartvista_modules: editProject.smartvista_modules || null,
        country: editProject.country || null,
        primary_presales: editProject.primary_presales || null,
      };

      const { data, error } = await supabase
        .from('projects')
        .update(payload)
        .eq('id', project.id)
        .select()
        .single();

      if (error) throw error;

      setProject(data);
      setIsEditing(false);
      alert('Project updated successfully!');
    } catch (err) {
      console.error('Error updating project:', err);
      alert('Error updating project: ' + err.message);
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
    } catch (err) {
      console.error('Error updating task status:', err);
      alert('Error updating task status: ' + err.message);
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
          .insert([{ ...taskData, project_id: projectId }]);

        if (error) throw error;
        alert('Task added successfully!');
      }

      setShowTaskModal(false);
      setEditingTask(null);
      await fetchTasks();
    } catch (err) {
      console.error('Error saving task:', err);
      alert('Error saving task: ' + err.message);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task? This action cannot be undone.')) return;

    try {
      const { error } = await supabase.from('project_tasks').delete().eq('id', taskId);
      if (error) throw error;
      alert('Task deleted successfully!');
      fetchTasks();
    } catch (err) {
      console.error('Error deleting task:', err);
      alert('Error deleting task: ' + err.message);
    }
  };

  const handleLogSave = async (logEntry) => {
    try {
      if (editingLog) {
        const { error } = await supabase
          .from('project_logs')
          .update({ entry: logEntry })
          .eq('id', editingLog.id);

        if (error) throw error;
        alert('Log updated successfully!');
      } else {
        const { error } = await supabase
          .from('project_logs')
          .insert([{ project_id: projectId, entry: logEntry }]);

        if (error) throw error;
        alert('Log added successfully!');
      }

      setShowLogModal(false);
      setEditingLog(null);
      fetchLogs();
    } catch (err) {
      console.error('Error saving log:', err);
      alert('Error saving log: ' + err.message);
    }
  };

  const handleDeleteLog = async (logId) => {
    if (!window.confirm('Are you sure you want to delete this log entry? This action cannot be undone.')) return;

    try {
      const { error } = await supabase.from('project_logs').delete().eq('id', logId);
      if (error) throw error;
      alert('Log deleted successfully!');
      fetchLogs();
    } catch (err) {
      console.error('Error deleting log:', err);
      alert('Error deleting log: ' + err.message);
    }
  };

  const navigateToCustomer = async () => {
    try {
      const { data } = await supabase
        .from('customers')
        .select('id')
        .eq('customer_name', project.customer_name)
        .single();

      if (data) navigate(`/customer/${data.id}`);
      else navigate('/');
    } catch (err) {
      console.error('Error finding customer:', err);
      navigate('/');
    }
  };

  // --- Background handlers (remarks) ---
  const handleEditBackground = () => {
    setBackgroundDraft(project?.remarks || '');
    setIsEditingBackground(true);
  };

  const handleCancelBackground = () => {
    setBackgroundDraft(project?.remarks || '');
    setIsEditingBackground(false);
  };

  const handleSaveBackground = async () => {
    try {
      setSavingBackground(true);

      const { data, error } = await supabase
        .from('projects')
        .update({ remarks: backgroundDraft })
        .eq('id', projectId)
        .select()
        .single();

      if (error) throw error;

      setProject(data);
      setIsEditingBackground(false);
    } catch (err) {
      console.error('Error saving project background:', err);
      alert('Failed to save project background: ' + err.message);
    } finally {
      setSavingBackground(false);
    }
  };

  if (!projectId) return <ErrorScreen error="No project ID in URL" onBack={() => navigate('/')} />;
  if (loading) return <LoadingScreen />;
  if (error || !project) return <ErrorScreen error={error} onBack={() => navigate('/')} />;

  return (
    <div className="project-details-container">
      {/* Page-level navigation (no Back to Dashboard button) */}
      <header className="navigation-header">
        <div className="nav-left">
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
              <h1 className="project-title">{project.project_name || 'Unnamed Project'}</h1>

              <div className="project-meta">
                <span className={`stage-badge ${getSalesStageClass(project.sales_stage)}`}>
                  {getSalesStageIcon(project.sales_stage)}
                  <span>{project.sales_stage || 'No Stage'}</span>
                </span>

                {project.deal_value !== null && project.deal_value !== undefined && (
                  <span className="deal-badge">
                    <FaDollarSign />
                    <span>{formatCurrency(project.deal_value)}</span>
                  </span>
                )}

                {project.due_date && (
                  <span className={`due-badge ${getDaysRemainingClass()}`}>
                    <FaCalendarAlt />
                    <span>{formatDate(project.due_date)} · {getDaysRemainingText()}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="main-content-grid">
        {/* Left Column */}
        <div className="main-column">
          {/* Project Details */}
          <section className="content-card">
            <div className="card-header">
              <div className="header-title">
                <FaInfo className="header-icon" />
                <h3>Project Details</h3>
              </div>
              <button
                className={`action-button secondary ${isEditing ? 'active' : ''}`}
                onClick={handleEditToggle}
              >
                {isEditing ? <FaTimes /> : <FaEdit />}
                <span>{isEditing ? 'Cancel' : 'Edit'}</span>
              </button>
            </div>

            <div className="card-content">
              {isEditing ? (
                <div className="project-edit-grid">
                  <div className="form-group">
                    <label className="form-label">
                      <FaBullseye className="form-icon" />
                      Project Name
                    </label>
                    <input
                      type="text"
                      name="project_name"
                      value={editProject.project_name || ''}
                      onChange={handleEditChange}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <FaUsers className="form-icon" />
                      Customer
                    </label>
                    <input
                      type="text"
                      name="customer_name"
                      value={editProject.customer_name || ''}
                      onChange={handleEditChange}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Account Manager
                    </label>
                    <input
                      type="text"
                      name="account_manager"
                      value={editProject.account_manager || ''}
                      onChange={handleEditChange}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Country
                    </label>
                    <input
                      type="text"
                      name="country"
                      value={editProject.country || ''}
                      onChange={handleEditChange}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <FaChartLine className="form-icon" />
                      Sales Stage
                    </label>
                    <select
                      name="sales_stage"
                      value={editProject.sales_stage || ''}
                      onChange={handleEditChange}
                      className="form-select"
                    >
                      <option value="">Select stage</option>
                      {SALES_STAGES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <FaDollarSign className="form-icon" />
                      Deal Value (USD)
                    </label>
                    <input
                      type="number"
                      name="deal_value"
                      value={editProject.deal_value ?? ''}
                      onChange={handleEditChange}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Product
                    </label>
                    <input
                      type="text"
                      name="product"
                      value={editProject.product || ''}
                      onChange={handleEditChange}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Primary Presales
                    </label>
                    <input
                      type="text"
                      name="primary_presales"
                      value={editProject.primary_presales || ''}
                      onChange={handleEditChange}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Backup Presales
                    </label>
                    <input
                      type="text"
                      name="backup_presales"
                      value={editProject.backup_presales || ''}
                      onChange={handleEditChange}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Due Date
                    </label>
                    <input
                      type="date"
                      name="due_date"
                      value={editProject.due_date || ''}
                      onChange={handleEditChange}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group full-width">
                    <label className="form-label">
                      Scope
                    </label>
                    <textarea
                      name="scope"
                      value={editProject.scope || ''}
                      onChange={handleEditChange}
                      rows="3"
                      className="form-textarea"
                    />
                  </div>

                  <div className="project-edit-actions">
                    <button
                      className="action-button secondary"
                      type="button"
                      onClick={handleEditToggle}
                      disabled={saving}
                    >
                      <FaTimes />
                      Cancel
                    </button>
                    <button
                      className="action-button primary"
                      type="button"
                      onClick={handleSaveProject}
                      disabled={saving}
                    >
                      <FaSave />
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="project-info-grid">
                  <div className="info-item">
                    <span className="info-label">Customer</span>
                    <span className="info-value">{project.customer_name || '-'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Account Manager</span>
                    <span className="info-value">{project.account_manager || '-'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Country</span>
                    <span className="info-value">{project.country || '-'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Sales Stage</span>
                    <span className={`info-value badge ${getSalesStageClass(project.sales_stage)}`}>
                      {getSalesStageIcon(project.sales_stage)}
                      {project.sales_stage || '-'}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Deal Value</span>
                    <span className="info-value">{formatCurrency(project.deal_value)}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Due Date</span>
                    <span className={`info-value ${getDaysRemainingClass()}`}>
                      {project.due_date ? formatDate(project.due_date) : '-'} · {getDaysRemainingText()}
                    </span>
                  </div>
                  <div className="info-item full-width">
                    <span className="info-label">Scope</span>
                    <span className="info-value">{project.scope || '-'}</span>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Tasks */}
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
                <button onClick={() => setShowTaskModal(true)} className="action-button primary">
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
                        <input
                          type="checkbox"
                          className="task-checkbox"
                          checked={task.status === 'Completed'}
                          onChange={() => handleTaskStatusChange(task.id, task.status)}
                          aria-label="Toggle task completion"
                        />
                      </div>

                      <div className="task-main-content">
                        <div className="task-header">
                          <h4 className="task-title">{task.description}</h4>
                          <div className={`task-status-badge ${getTaskStatusClass(task.status)}`}>
                            {getTaskStatusIcon(task.status)}
                            <span className="status-text">{task.status}</span>
                          </div>
                        </div>

                        <div className="task-meta-row">
                          {(task.start_date || task.end_date || task.due_date) && (
                            <div className="task-meta-item">
                              <FaCalendarAlt className="meta-icon" />
                              <span>
                                {task.start_date && task.end_date
                                  ? `${formatDate(task.start_date)} → ${formatDate(task.end_date)}`
                                  : task.due_date
                                  ? `Due ${formatDate(task.due_date)}`
                                  : task.start_date
                                  ? `Starts ${formatDate(task.start_date)}`
                                  : ''}
                              </span>
                            </div>
                          )}

                          {task.assignee && (
                            <div className="task-meta-item">
                              <FaUsers className="meta-icon" />
                              <span>{task.assignee}</span>
                            </div>
                          )}

                          {task.task_type && (
                            <div className="task-meta-item">
                              <FaInfo className="meta-icon" />
                              <span>{task.task_type}</span>
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
                            >
                              <FaEdit />
                            </button>
                            <button
                              onClick={() => handleDeleteTask(task.id)}
                              className="task-action-button delete"
                              title="Delete task"
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
                <div className="empty-state">
                  <div className="empty-icon-wrapper"><FaTasks /></div>
                  <h4 className="empty-title">{`No ${showCompleted ? '' : 'active '}tasks found`}</h4>
                  <p className="empty-description">
                    {showCompleted ? 'All tasks are completed.' : 'Create a task to start tracking progress.'}
                  </p>
                  <button onClick={() => setShowTaskModal(true)} className="action-button primary">
                    <FaPlus />
                    <span>Create Task</span>
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right Column */}
        <div className="side-column">
          {/* Project Background (remarks) */}
          <section className="content-card">
            <div className="card-header">
              <div className="header-title">
                <FaFileAlt className="header-icon" />
                <h3>Project Background</h3>
              </div>

              {!isEditingBackground ? (
                <button className="action-button secondary" onClick={handleEditBackground}>
                  <FaEdit />
                  <span>Edit</span>
                </button>
              ) : (
                <div className="header-actions">
                  <button
                    className="action-button secondary"
                    onClick={handleCancelBackground}
                    disabled={savingBackground}
                  >
                    <FaTimes />
                    <span>Cancel</span>
                  </button>
                  <button
                    className="action-button primary"
                    onClick={handleSaveBackground}
                    disabled={savingBackground}
                  >
                    <FaSave />
                    <span>{savingBackground ? 'Saving...' : 'Save'}</span>
                  </button>
                </div>
              )}
            </div>

            <div className="card-content">
              {!isEditingBackground ? (
                <div className="project-background-view">
                  {project.remarks?.trim() ? (
                    <p className="project-background-text">{project.remarks}</p>
                  ) : (
                    <div className="empty-state">
                      <div className="empty-icon-wrapper">
                        <FaFileAlt />
                      </div>
                      <h4 className="empty-title">No background yet</h4>
                      <p className="empty-description">
                        Add a short description of the project, context, scope notes, risks, and key decisions.
                      </p>
                      <button className="action-button primary" onClick={handleEditBackground}>
                        <FaPlus />
                        <span>Add Background</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="project-background-edit">
                  <textarea
                    className="form-textarea project-background-textarea"
                    value={backgroundDraft}
                    onChange={(e) => setBackgroundDraft(e.target.value)}
                    rows={10}
                    placeholder="Write the project background here..."
                  />
                </div>
              )}
            </div>
          </section>

          {/* Project Logs */}
          <section className="content-card">
            <div className="card-header">
              <div className="header-title">
                <FaBookOpen className="header-icon" />
                <h3>Project Logs</h3>
              </div>
              <button
                onClick={() => {
                  setEditingLog(null);
                  setShowLogModal(true);
                }}
                className="action-button primary"
              >
                <FaPlus />
                <span>Add Log</span>
              </button>
            </div>

            <div className="card-content">
              {logs && logs.length > 0 ? (
                <div className="log-list">
                  {logs.map((log) => (
                    <div key={log.id} className="log-item">
                      <div className="log-header">
                        <span className="log-date">{formatDate(log.created_at)}</span>
                        <div className="log-actions">
                          <button
                            className="task-action-button edit"
                            onClick={() => {
                              setEditingLog(log);
                              setShowLogModal(true);
                            }}
                            title="Edit log"
                          >
                            <FaEdit />
                          </button>
                          <button
                            className="task-action-button delete"
                            onClick={() => handleDeleteLog(log.id)}
                            title="Delete log"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </div>
                      <p className="log-text">{log.entry}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-icon-wrapper"><FaBookOpen /></div>
                  <h4 className="empty-title">No project logs yet</h4>
                  <p className="empty-description">Use logs to record key decisions, meeting notes, and updates.</p>
                  <button
                    onClick={() => {
                      setEditingLog(null);
                      setShowLogModal(true);
                    }}
                    className="action-button primary"
                  >
                    <FaPlus />
                    <span>Add First Log</span>
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      <TaskModal
        isOpen={showTaskModal}
        onClose={() => {
          setShowTaskModal(false);
          setEditingTask(null);
        }}
        onSave={handleTaskSaved}
        editingTask={editingTask}
        presalesResources={presalesResources}
        taskTypes={taskTypes}
      />

      <LogModal
        isOpen={showLogModal}
        onClose={() => {
          setShowLogModal(false);
          setEditingLog(null);
        }}
        onSave={handleLogSave}
        editingLog={editingLog}
      />
    </div>
  );
}

export default ProjectDetails;
