// ProjectDetails.js
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
const DEFAULT_TASK_HOURS = 4;
const SMARTVISTA_MODULES = [
  'SVFE - Switch',
  'SVFE - ATM',
  'SVBO - CMS',
  'SVBO - Merchant',
  'SVFM',
  'SVCG',
  'SVIP',
  'SVCSP',
  'EPG',
  'ACS',
  'Digital Banking',
  'Merchant Portal'
];

const SALES_STAGES = [
  'Discovery', 'Demo', 'PoC', 'RFI', 'RFP', 'SoW', 
  'Contracting', 'Closed-Won', 'Closed-Lost', 'Closed-Cancelled/Hold'
];

const PRODUCTS = ['Marketplace', 'O-City', 'Processing', 'SmartVista'];

const TASK_STATUSES = ['Not Started', 'In Progress', 'Completed', 'Cancelled/On-hold'];

// Utility Functions
const normalizeModulesArray = (modules) => {
  if (!modules) return [];
  if (Array.isArray(modules)) return modules;

  if (typeof modules === 'string') {
    try {
      const parsedModules = JSON.parse(modules);
      if (Array.isArray(parsedModules)) return parsedModules;
    } catch (e) {
      return [modules];
    }
  }
  return [];
};

const getStatusClass = (status) => {
  if (!status) return 'status-not-specified';
  const statusLower = status.toLowerCase();
  if (statusLower.includes('complet')) return 'status-completed';
  if (statusLower.includes('progress') || statusLower.includes('active') || statusLower.includes('working')) return 'status-in-progress';
  if (statusLower.includes('plan')) return 'status-planning';
  if (statusLower.includes('hold') || statusLower.includes('pause')) return 'status-on-hold';
  if (statusLower.includes('cancel')) return 'status-cancelled';
  if (statusLower.includes('delay')) return 'status-delayed';
  if (statusLower.includes('review')) return 'status-under-review';
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

// ---------- Task Modal (with dropdown + start/end dates + estimated hours) ----------
const TaskModal = ({
  isOpen,
  onClose,
  onSave,
  editingTask = null,
  presalesResources = [],
  tasks = [],
}) => {
  const [taskData, setTaskData] = useState({
    description: '',
    status: 'Not Started',
    start_date: '',
    end_date: '',
    due_date: '',
    notes: '',
    assignee: '',
    estimated_hours: '',
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
  estimated_hours:
    typeof editingTask.estimated_hours === 'number'
      ? editingTask.estimated_hours
      : '',
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
        estimated_hours: DEFAULT_TASK_HOURS
      });
    }
  }, [editingTask, isOpen]);

  const handleChange = (field, value) => {
    if (field === 'estimated_hours') {
      const num = parseFloat(value);
      setTaskData((prev) => ({
        ...prev,
        estimated_hours: Number.isNaN(num) ? '' : num,
      }));
    } else {
      setTaskData((prev) => ({ ...prev, [field]: value }));
    }
  };

    const parseLocalDate = (value) => {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const getDateRangeFromTaskData = () => {
    const startStr = taskData.start_date || taskData.due_date || taskData.end_date;
    const endStr = taskData.end_date || taskData.due_date || taskData.start_date;

    const start = parseLocalDate(startStr);
    const end = parseLocalDate(endStr);

    if (!start && !end) return [];
    const s = start || end;
    const e = end || start;
    if (!s || !e || e.getTime() < s.getTime()) return [];

    const days = [];
    const cur = new Date(s);
    const endMid = new Date(e);
    while (cur.getTime() <= endMid.getTime()) {
      days.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return days;
  };

  const isTaskOnDayLocal = (task, day) => {
    const d = new Date(day);
    d.setHours(0, 0, 0, 0);

    const startStr = task.start_date || task.due_date || task.end_date;
    const endStr = task.end_date || task.due_date || task.start_date;

    const start = parseLocalDate(startStr);
    const end = parseLocalDate(endStr);

    if (!start && !end) return false;
    const s = start || end;
    const e = end || start;
    return d.getTime() >= s.getTime() && d.getTime() <= e.getTime();
  };

  const buildCapacityHint = () => {
    // Need assignee + at least one date
    if (
      !taskData.assignee ||
      (!taskData.start_date && !taskData.end_date && !taskData.due_date)
    ) {
      return 'Select an assignee and at least one date to see capacity impact.';
    }

    const presales = (presalesResources || []).find(
      (p) => (p.name || p.email) === taskData.assignee
    );
    if (!presales) {
      return 'No capacity settings found for this presales yet.';
    }

    const dailyCapacity =
      typeof presales.daily_capacity_hours === 'number' &&
      !Number.isNaN(presales.daily_capacity_hours)
        ? presales.daily_capacity_hours
        : 8;

    const maxTasksPerDay =
      Number.isInteger(presales.max_tasks_per_day) && presales.max_tasks_per_day > 0
        ? presales.max_tasks_per_day
        : 3;

    const days = getDateRangeFromTaskData();
    if (!days.length) {
      return 'Select a valid date range to check capacity.';
    }

    const totalNewHours =
      typeof taskData.estimated_hours === 'number' && !Number.isNaN(taskData.estimated_hours)
        ? taskData.estimated_hours
        : DEFAULT_TASK_HOURS;

    const perDayNewHours = totalNewHours / days.length;

    let worstUtil = 0;
    let worstTasks = 0;
    let worstDate = null;

    days.forEach((day) => {
      const existingTasks = (tasks || []).filter((t) => {
        if (editingTask && t.id === editingTask.id) return false;
        if (t.assignee !== taskData.assignee) return false;
        if (['Completed', 'Done', 'Cancelled/On-hold'].includes(t.status)) return false;
        return isTaskOnDayLocal(t, day);
      });

      const existingHours = existingTasks.reduce((sum, t) => {
        const h =
          typeof t.estimated_hours === 'number' && !Number.isNaN(t.estimated_hours)
            ? t.estimated_hours
            : DEFAULT_TASK_HOURS;
        return sum + h;
      }, 0);

      const totalHours = existingHours + perDayNewHours;
      const tasksCount = existingTasks.length + 1;
      const util = dailyCapacity ? (totalHours / dailyCapacity) * 100 : 0;

      if (
        util > worstUtil ||
        tasksCount > worstTasks
      ) {
        worstUtil = util;
        worstTasks = tasksCount;
        worstDate = day;
      }
    });

    if (!worstDate) {
      return 'No other tasks found on these dates for this presales.';
    }

    const dateLabel = worstDate.toLocaleDateString('en-SG', {
      day: '2-digit',
      month: 'short',
    });

    let prefix = 'OK load';
    if (worstUtil > 120 || worstTasks > maxTasksPerDay) {
      prefix = 'Over capacity';
    } else if (worstUtil >= 90) {
      prefix = 'Near capacity';
    } else if (worstUtil <= 40) {
      prefix = 'Light load';
    }

    const roundedUtil = Math.round(worstUtil);

    return `${prefix} on ${dateLabel}: ~${roundedUtil}% load, ${worstTasks} task(s) (limit ${maxTasksPerDay}).`;
  };

  const capacityHint = buildCapacityHint();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!taskData.description.trim()) {
      alert('Task description is required');
      return;
    }

    // Optional checking: if only one of start/end is set
    if ((taskData.start_date && !taskData.end_date) || (!taskData.start_date && taskData.end_date)) {
      const ok = window.confirm('You only set one of start/end date. Continue?');
      if (!ok) return;
    }

    const est = parseFloat(taskData.estimated_hours);
    if (isNaN(est) || est <= 0) {
      alert('Please enter a valid estimated hours value greater than 0');
      return;
    }

    setLoading(true);
    try {
      await onSave({
        ...taskData,
        estimated_hours: est
      });
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
            {/* Description */}
            <div className="form-group full-width">
              <label htmlFor="task-description" className="form-label">
                <FaTasks className="form-icon" />
                Task Description *
              </label>
              <input 
                id="task-description"
                name="description" 
                value={taskData.description} 
                onChange={(e) => handleChange('description', e.target.value)}
                className="form-input"
                placeholder="What needs to be accomplished?"
                required
              />
            </div>

            {/* Assignee dropdown */}
            <div className="form-group">
              <label htmlFor="task-assignee" className="form-label">
                <FaUsers className="form-icon" />
                Assignee
              </label>

              {hasPresalesList ? (
                <select
                  id="task-assignee"
                  name="assignee"
                  className="form-select"
                  value={taskData.assignee || ''}
                  onChange={(e) => handleChange('assignee', e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {presalesResources
                    .filter(r => r.is_active !== false)
                    .map((r) => (
                      <option key={r.id} value={r.name}>
                        {r.name}{r.region ? ` (${r.region})` : ''}
                      </option>
                    ))}
                </select>
              ) : (
                <input
                  id="task-assignee"
                  name="assignee"
                  value={taskData.assignee}
                  onChange={(e) => handleChange('assignee', e.target.value)}
                  className="form-input"
                  placeholder="Who owns this task? (e.g. Jonathan, JP)"
                />
              )}
            </div>

            {/* Status */}
            <div className="form-group">
              <label htmlFor="task-status" className="form-label">
                <FaChartLine className="form-icon" />
                Status
              </label>
              <select 
                id="task-status"
                name="status" 
                value={taskData.status} 
                onChange={(e) => handleChange('status', e.target.value)}
                className="form-select"
              >
                {TASK_STATUSES.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            {/* Estimated hours */}
            <div className="form-group">
              <label htmlFor="task-estimated-hours" className="form-label">
                <FaClock className="form-icon" />
                Estimated Hours
              </label>
              <input
                id="task-estimated-hours"
                name="estimated_hours"
                type="number"
                min="0.5"
                max="8"
                step="0.5"
                value={taskData.estimated_hours}
                onChange={(e) => handleChange('estimated_hours', e.target.value)}
                className="form-input"
                placeholder="e.g. 2"
              />
            </div>
{/* Capacity hint */}
<div className="form-group full-width">
  <div
    style={{
      fontSize: '12px',
      opacity: 0.85,
      display: 'flex',
      gap: 6,
      alignItems: 'center'
    }}
  >
    <FaInfo />
    <span>{capacityHint}</span>
  </div>
</div>
            {/* Start / End date */}
            <div className="form-group">
              <label htmlFor="task-start-date" className="form-label">
                <FaCalendarAlt className="form-icon" />
                Start Date
              </label>
              <input 
                id="task-start-date"
                name="start_date" 
                type="date"
                value={taskData.start_date || ''}
                onChange={(e) => handleChange('start_date', e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="task-end-date" className="form-label">
                <FaCalendarAlt className="form-icon" />
                End Date
              </label>
              <input 
                id="task-end-date"
                name="end_date" 
                type="date"
                value={taskData.end_date || ''}
                onChange={(e) => handleChange('end_date', e.target.value)}
                className="form-input"
              />
            </div>

            {/* Due date (still used for upcoming deadlines widget) */}
            <div className="form-group">
              <label htmlFor="task-due-date" className="form-label">
                <FaCalendarAlt className="form-icon" />
                Due Date
              </label>
              <input 
                id="task-due-date"
                name="due_date" 
                type="date"
                value={taskData.due_date || ''}
                onChange={(e) => handleChange('due_date', e.target.value)}
                className="form-input"
              />
            </div>

            {/* Notes */}
            <div className="form-group full-width">
              <label htmlFor="task-notes" className="form-label">
                <FaFileAlt className="form-icon" />
                Notes
              </label>
              <textarea 
                id="task-notes"
                name="notes" 
                value={taskData.notes} 
                onChange={(e) => handleChange('notes', e.target.value)}
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

// ---------- LogModal & other components stay the same ----------
const LogModal = ({ isOpen, onClose, onSave, editingLog = null }) => {
  const [logEntry, setLogEntry] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingLog) {
      setLogEntry(editingLog.entry || '');
    } else {
      setLogEntry('');
    }
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
            <h3 className="modal-title">
              {editingLog ? 'Edit Log Entry' : 'Add Project Log Entry'}
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
              <FaSave />
              {loading ? (editingLog ? 'Updating...' : 'Adding...') : (editingLog ? 'Update Entry' : 'Add Entry')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// EmptyState, LoadingScreen, ErrorScreen stay the same...
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

// Custom Hook for Project Data (unchanged)
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

// ---------- Main Component ----------
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
  const [editingLog, setEditingLog] = useState(null);

  // NEW: presales resources for assignee dropdown
  const [presalesResources, setPresalesResources] = useState([]);

  useEffect(() => {
    if (project) {
      setEditProject({
        ...project,
        smartvista_modules: normalizeModulesArray(project.smartvista_modules)
      });
    }
  }, [project]);

  useEffect(() => {
    const fetchPresalesResources = async () => {
      try {
  const { data, error } = await supabase
  .from('presales_resources')
  .select(
    'id, name, email, region, is_active, daily_capacity_hours, target_hours, max_tasks_per_day'
  )
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

  // Event handlers (project save, task save, etc.)
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
    const est = taskData.estimated_hours != null ? Number(taskData.estimated_hours) : null;

    try {
      if (editingTask) {
        const { error } = await supabase
          .from('project_tasks')
          .update({
            ...taskData,
            estimated_hours: est
          })
          .eq('id', editingTask.id);

        if (error) throw error;
        alert('Task updated successfully!');
      } else {
        const { error } = await supabase
          .from('project_tasks')
          .insert([{
            ...taskData,
            estimated_hours: est,
            project_id: id
          }]);

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

  const handleLogEdit = async (logEntry) => {
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
          .insert([{ project_id: id, entry: logEntry }]);

        if (error) throw error;
        alert('Log added successfully!');
      }

      setShowLogModal(false);
      setEditingLog(null);
      fetchLogs();
    } catch (error) {
      console.error('Error saving log:', error);
      alert('Error saving log: ' + error.message);
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

  // Render
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
          {/* ... (unchanged content of project info section – same as last version) ... */}

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
                  {filteredTasks.map((task) => {
                    const estHours = task.estimated_hours != null
                      ? parseFloat(task.estimated_hours)
                      : null;
                    const estHoursValid = !isNaN(estHours) && estHours > 0;

                    return (
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
                            {/* Date info */}
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

                            {/* Assignee */}
                            {task.assignee && (
                              <div className="task-meta-item">
                                <FaUsers className="meta-icon" />
                                <span>Assigned to {task.assignee}</span>
                              </div>
                            )}

                            {/* Estimated hours */}
                            {estHoursValid && (
                              <div className="task-meta-item">
                                <FaClock className="meta-icon" />
                                <span>Est. {estHours % 1 === 0 ? estHours.toFixed(0) : estHours.toFixed(1)}h</span>
                              </div>
                            )}

                            {/* Actions */}
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
                    );
                  })}
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

        {/* Right sidebar (progress, activity log) stays same as your last version */}
        {/* ... */}
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
        presalesResources={presalesResources}
        tasks={tasks}
      />
      <LogModal
        isOpen={showLogModal}
        onClose={() => {
          setShowLogModal(false);
          setEditingLog(null);
        }}
        onSave={handleLogEdit}
        editingLog={editingLog}
      />
    </div>
  );
}

export default ProjectDetails;
