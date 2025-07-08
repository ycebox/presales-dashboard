// ProjectDetails.js - Enhanced version aligned with CustomerDetails UI/UX
import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import './ProjectDetails.css';
import {
  FaHome, FaTasks, FaBookOpen, FaEdit, FaSave, FaTimes,
  FaPlus, FaInfo, FaTrash, FaEye, FaChevronDown, FaChevronUp, FaUsers
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
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <h3>{editingTask ? 'Edit Task' : 'Add New Task'}</h3>
        <form onSubmit={handleSubmit} className="modern-form">
          <label style={{ gridColumn: 'span 2' }}>
            Task Description *
            <input 
              name="description" 
              value={taskData.description} 
              onChange={handleChange}
              placeholder="Enter task description"
              required
            />
          </label>

          <label>
            Status
            <select name="status" value={taskData.status} onChange={handleChange}>
              <option value="Not Started">Not Started</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled/On-hold">Cancelled/On-hold</option>
            </select>
          </label>

          <label>
            Due Date
            <input 
              name="due_date" 
              type="date"
              value={taskData.due_date} 
              onChange={handleChange}
            />
          </label>

          <label style={{ gridColumn: 'span 2' }}>
            Notes
            <textarea 
              name="notes" 
              value={taskData.notes} 
              onChange={handleChange}
              rows="3"
              placeholder="Additional notes or details"
            />
          </label>
          
          <div className="modal-actions">
            <button type="button" onClick={onClose}>Cancel</button>
            <button type="submit">{editingTask ? 'Update Task' : 'Add Task'}</button>
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
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <h3>Add Project Log</h3>
        <form onSubmit={handleSubmit} className="modern-form">
          <label style={{ gridColumn: 'span 2' }}>
            Log Entry *
            <textarea 
              value={logEntry} 
              onChange={(e) => setLogEntry(e.target.value)}
              rows="4"
              placeholder="Enter log entry details..."
              required
            />
          </label>
          
          <div className="modal-actions">
            <button type="button" onClick={onClose}>Cancel</button>
            <button type="submit">Add Log</button>
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
  const [linkedMeetingMinutes, setLinkedMeetingMinutes] = useState([]);
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
  const [selectedMeetingNote, setSelectedMeetingNote] = useState(null);

  const salesStageOptions = ['Closed-Cancelled/Hold', 'Closed-Lost', 'Closed-Won', 'Contracting', 'Demo', 'Discovery', 'PoC', 'RFI', 'RFP', 'SoW'];
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
        fetchLogs(),
        fetchLinkedMeetingMinutes()
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

  const fetchLinkedMeetingMinutes = async () => {
    try {
      const { data, error } = await supabase
        .from('meeting_minutes')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLinkedMeetingMinutes(data || []);
    } catch (error) {
      console.error('Error fetching meeting minutes:', error);
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

  // Task status update handler
  const handleTaskStatusChange = async (taskId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'Completed' ? 'Not Started' : 'Completed';
      
      const { error } = await supabase
        .from('project_tasks')
        .update({ status: newStatus })
        .eq('id', taskId);

      if (error) throw error;
      
      // Refresh tasks to show updated status
      await fetchTasks();
    } catch (error) {
      console.error('Error updating task status:', error);
      alert('Error updating task status: ' + error.message);
    }
  };

  // Task handlers
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
        // Update existing task
        const { error } = await supabase
          .from('project_tasks')
          .update(taskData)
          .eq('id', editingTask.id);

        if (error) throw error;
        alert('Task updated successfully!');
      } else {
        // Add new task - make sure we have the project_id
        const taskWithProject = {
          ...taskData,
          project_id: id // Make sure project_id is included
        };
        
        console.log('Adding task with data:', taskWithProject);
        
        const { error } = await supabase
          .from('project_tasks')
          .insert([taskWithProject]);

        if (error) {
          console.error('Error adding task:', error);
          throw error;
        }
        
        alert('Task added successfully!');
      }

      setShowTaskModal(false);
      setEditingTask(null);
      await fetchTasks(); // Refresh tasks
    } catch (error) {
      console.error('Error saving task:', error);
      // More specific error messages
      if (error.message.includes('column') && error.message.includes('does not exist')) {
        alert('Database schema error: Some fields may not exist in your project_tasks table. Please check the console for details.');
      } else if (error.message.includes('violates')) {
        alert('Data validation error: Please check all required fields and try again.');
      } else {
        alert('Error saving task: ' + error.message);
      }
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

  const getTaskStatusClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'status-completed';
      case 'in progress': return 'status-in-progress';
      case 'not started': return 'status-not-started';
      case 'cancelled/on-hold': return 'status-cancelled';
      default: return 'status-not-started';
    }
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
    if (!project?.due_date) return '-';
    const today = new Date();
    const dueDate = new Date(project.due_date);
    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  if (loading) {
    return (
      <div className="page-wrapper">
        <div className="loading-state">Loading project details...</div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="page-wrapper">
        <div className="error-state">
          <p>{error || 'Project not found'}</p>
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
        {/* Navigation Buttons */}
        <div className="navigation-buttons">
          <button onClick={() => navigate('/')} className="back-btn">
            <FaHome /> Back to Dashboard
          </button>
          {project.customer_name && (
            <button 
              onClick={() => {
                // Find customer by name since we might not have customer_id
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
                      // Fallback to dashboard if customer not found
                      navigate('/');
                    }
                  } catch (error) {
                    console.error('Error finding customer:', error);
                    navigate('/');
                  }
                };
                findAndNavigateToCustomer();
              }} 
              className="back-to-customer-btn"
              style={{ 
                height: '40px',
                minHeight: '40px',
                fontSize: '14px',
                padding: '8px 16px'
              }}
            >
              <FaUsers /> Back to {project.customer_name}
            </button>
          )}
        </div>

        {/* Project Header */}
        <div className="project-header">
          <h1 className="project-name" style={{ fontSize: '2.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>
            {project.project_name || 'Unnamed Project'}
          </h1>
          <div className="project-breadcrumb" style={{ fontSize: '1rem', color: '#6b7280' }}>
            Project in <Link to="#" onClick={(e) => {
              e.preventDefault();
              // Same navigation logic as the button above
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
            }} className="customer-link">
              {project.customer_name}
            </Link>
          </div>
        </div>

        {/* Project Overview */}
        <div className="project-overview">
          <div className="overview-card">
            <div className="overview-content">
              <div className="metric-item">
                <div className="metric-value">{getActiveTasksCount()}</div>
                <div className="metric-label">Active Tasks</div>
                <div className="metric-trend trend-up">↗ {getCompletedTasksCount()} completed</div>
              </div>
              <div className="metric-item">
                <div className="metric-value">{getProgressPercentage()}%</div>
                <div className="metric-label">Progress</div>
                <div className="metric-trend trend-up">↗ On track</div>
              </div>
              <div className="metric-item">
                <div className="metric-value">{getDaysRemaining()}</div>
                <div className="metric-label">Days Remaining</div>
                <div className="metric-trend">📅 Due {formatDate(project.due_date)}</div>
              </div>
              <div className="metric-item">
                <div className="metric-value">{formatCurrency(project.deal_value)}</div>
                <div className="metric-label">Deal Value</div>
                <div className="metric-trend">💰 {project.sales_stage}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="main-content">
          {/* Left Column */}
          <div className="left-column">
            {/* Project Details */}
            <div className="section-card">
              <div className="section-header">
                <h3>
                  <FaInfo /> Project Details
                </h3>
                <div className="edit-controls">
                  {isEditing ? (
                    <>
                      <button 
                        onClick={handleSaveProject} 
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
                      <FaEdit /> Edit Project
                    </button>
                  )}
                </div>
              </div>

              {isEditing && (
                <div className="editing-indicator">
                  📝 Currently editing - Click Save to confirm changes or Cancel to discard
                </div>
              )}

              <div className="project-details-content">
                <div className="project-details-grid">
                  <div className="info-item">
                    <div className="info-label">Sales Stage</div>
                    {isEditing ? (
                      <select
                        name="sales_stage"
                        value={editProject.sales_stage || ''}
                        onChange={handleEditChange}
                        className="inline-edit-select"
                      >
                        <option value="">Select Stage</option>
                        {salesStageOptions.map((stage, i) => (
                          <option key={i} value={stage}>{stage}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="info-value">{project.sales_stage || 'Not specified'}</div>
                    )}
                  </div>

                  <div className="info-item">
                    <div className="info-label">Product</div>
                    {isEditing ? (
                      <select
                        name="product"
                        value={editProject.product || ''}
                        onChange={handleEditChange}
                        className="inline-edit-select"
                      >
                        <option value="">Select Product</option>
                        {productOptions.map((product, i) => (
                          <option key={i} value={product}>{product}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="info-value">{project.product || 'Not specified'}</div>
                    )}
                  </div>

                  <div className="info-item">
                    <div className="info-label">Account Manager</div>
                    {isEditing ? (
                      <input
                        type="text"
                        name="account_manager"
                        value={editProject.account_manager || ''}
                        onChange={handleEditChange}
                        className="inline-edit-input"
                        placeholder="Account manager name"
                      />
                    ) : (
                      <div className="info-value">{project.account_manager || 'Not assigned'}</div>
                    )}
                  </div>

                  <div className="info-item">
                    <div className="info-label">Due Date</div>
                    {isEditing ? (
                      <input
                        type="date"
                        name="due_date"
                        value={editProject.due_date || ''}
                        onChange={handleEditChange}
                        className="inline-edit-input"
                      />
                    ) : (
                      <div className="info-value">{formatDate(project.due_date)}</div>
                    )}
                  </div>

                  <div className="info-item">
                    <div className="info-label">Deal Value</div>
                    {isEditing ? (
                      <input
                        type="number"
                        name="deal_value"
                        value={editProject.deal_value || ''}
                        onChange={handleEditChange}
                        className="inline-edit-input"
                        placeholder="Deal value"
                      />
                    ) : (
                      <div className="info-value">{formatCurrency(project.deal_value)}</div>
                    )}
                  </div>

                  <div className="info-item">
                    <div className="info-label">Backup Presales</div>
                    {isEditing ? (
                      <input
                        type="text"
                        name="backup_presales"
                        value={editProject.backup_presales || ''}
                        onChange={handleEditChange}
                        className="inline-edit-input"
                        placeholder="Backup presales contact"
                      />
                    ) : (
                      <div className="info-value">{project.backup_presales || 'Not assigned'}</div>
                    )}
                  </div>
                </div>

                <div style={{ marginTop: '20px' }}>
                  <div className="info-label">Scope</div>
                  {isEditing ? (
                    <textarea
                      name="scope"
                      value={editProject.scope || ''}
                      onChange={handleEditChange}
                      className="inline-edit-textarea"
                      rows="3"
                      placeholder="Project scope and objectives"
                      style={{ marginTop: '8px' }}
                    />
                  ) : (
                    <div className="info-value" style={{ marginTop: '8px', lineHeight: '1.5' }}>
                      {project.scope || 'No scope defined'}
                    </div>
                  )}
                </div>

                {(project.remarks || isEditing) && (
                  <div style={{ marginTop: '20px' }}>
                    <div className="info-label">Remarks</div>
                    {isEditing ? (
                      <textarea
                        name="remarks"
                        value={editProject.remarks || ''}
                        onChange={handleEditChange}
                        className="inline-edit-textarea"
                        rows="3"
                        placeholder="Project remarks or notes"
                        style={{ marginTop: '8px' }}
                      />
                    ) : (
                      <div className="info-value" style={{ marginTop: '8px', lineHeight: '1.5' }}>
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
                <h3>
                  <FaTasks /> Project Tasks
                </h3>
                <div className="section-controls">
                  <button onClick={handleAddTask} className="add-btn">
                    <FaPlus /> Add Task
                  </button>
                  <button 
                    className="toggle-btn"
                    onClick={() => setShowCompleted(!showCompleted)}
                  >
                    {showCompleted ? <FaChevronUp /> : <FaChevronDown />}
                    {showCompleted ? 'Hide Completed' : 'Show Completed'}
                  </button>
                </div>
              </div>

              <div className="task-list">
                {getFilteredTasks().length > 0 ? (
                  getFilteredTasks().map((task) => (
                    <div key={task.id} className="task-item">
                      <input 
                        type="checkbox" 
                        className="task-checkbox"
                        checked={task.status === 'Completed'}
                        onChange={() => handleTaskStatusChange(task.id, task.status)}
                      />
                      <div className="task-content">
                        <div className="task-name">{task.description}</div>
                        <div className="task-meta">
                          {task.due_date && `Due: ${formatDate(task.due_date)}`}
                          {task.due_date && task.status && ' • '}
                          <span className={`task-status ${getTaskStatusClass(task.status)}`}>
                            {task.status}
                          </span>
                        </div>
                        {task.notes && <div className="task-notes">{task.notes}</div>}
                      </div>
                      <div className="task-actions">
                        <button 
                          onClick={() => handleEditTask(task)}
                          className="edit-task-btn"
                          title="Edit task"
                        >
                          <FaEdit />
                        </button>
                        <button 
                          onClick={() => handleDeleteTask(task.id)}
                          className="delete-task-btn"
                          title="Delete task"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">
                    <FaTasks />
                    <p>No {showCompleted ? '' : 'active '}tasks found</p>
                    <button onClick={handleAddTask} className="add-first-btn">
                      Add your first task
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="right-column">
            {/* Project Log */}
            <div className="section-card">
              <div className="section-header">
                <h3>
                  <FaBookOpen /> Project Log
                </h3>
                <button onClick={handleAddLog} className="add-btn">
                  <FaPlus /> Add Log
                </button>
              </div>

              <div className="log-list">
                {logs.length > 0 ? (
                  logs.map((log) => (
                    <div key={log.id} className="log-item">
                      <div className="log-content">
                        <div className="log-entry">{log.entry}</div>
                        <div className="log-date">{formatDate(log.created_at)}</div>
                      </div>
                      <button 
                        onClick={() => handleDeleteLog(log.id)}
                        className="delete-log-btn"
                        title="Delete log entry"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">
                    <FaBookOpen />
                    <p>No log entries yet</p>
                    <button onClick={handleAddLog} className="add-first-btn">
                      Add your first log entry
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Meeting Minutes */}
            {linkedMeetingMinutes.length > 0 && (
              <div className="section-card">
                <div className="section-header">
                  <h3>
                    <FaBookOpen /> Linked Meeting Minutes
                  </h3>
                </div>

                <div className="meeting-list">
                  {linkedMeetingMinutes.map((meeting) => (
                    <div key={meeting.id} className="meeting-item">
                      <div className="meeting-content">
                        <div className="meeting-title">{meeting.title || 'Untitled Meeting'}</div>
                        <div className="meeting-date">{formatDate(meeting.meeting_date)}</div>
                        {meeting.participants && (
                          <div className="meeting-participants">
                            Participants: {meeting.participants}
                          </div>
                        )}
                      </div>
                      <button 
                        onClick={() => setSelectedMeetingNote(meeting)}
                        className="view-meeting-btn"
                        title="View meeting details"
                      >
                        <FaEye />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Task Modal */}
        <TaskModal
          isOpen={showTaskModal}
          onClose={() => {
            setShowTaskModal(false);
            setEditingTask(null);
          }}
          onSave={handleTaskSaved}
          editingTask={editingTask}
        />

        {/* Log Modal */}
        <LogModal
          isOpen={showLogModal}
          onClose={() => setShowLogModal(false)}
          onSave={handleLogSaved}
        />

        {/* Meeting Note Modal */}
        {selectedMeetingNote && (
          <div className="modal-backdrop" onClick={() => setSelectedMeetingNote(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
              <div className="modal-header">
                <h3>{selectedMeetingNote.title || 'Meeting Notes'}</h3>
                <button 
                  onClick={() => setSelectedMeetingNote(null)}
                  className="close-modal-btn"
                >
                  <FaTimes />
                </button>
              </div>
              <div className="modal-body">
                <div className="meeting-detail-grid">
                  <div><strong>Date:</strong> {formatDate(selectedMeetingNote.meeting_date)}</div>
                  <div><strong>Participants:</strong> {selectedMeetingNote.participants || 'Not specified'}</div>
                </div>
                {selectedMeetingNote.agenda && (
                  <div style={{ marginTop: '20px' }}>
                    <strong>Agenda:</strong>
                    <div style={{ marginTop: '8px', whiteSpace: 'pre-wrap' }}>
                      {selectedMeetingNote.agenda}
                    </div>
                  </div>
                )}
                {selectedMeetingNote.notes && (
                  <div style={{ marginTop: '20px' }}>
                    <strong>Notes:</strong>
                    <div style={{ marginTop: '8px', whiteSpace: 'pre-wrap' }}>
                      {selectedMeetingNote.notes}
                    </div>
                  </div>
                )}
                {selectedMeetingNote.action_items && (
                  <div style={{ marginTop: '20px' }}>
                    <strong>Action Items:</strong>
                    <div style={{ marginTop: '8px', whiteSpace: 'pre-wrap' }}>
                      {selectedMeetingNote.action_items}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProjectDetails;
