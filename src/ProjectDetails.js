
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import './ProjectDetails.css';
import {
  FaHome, FaTasks, FaBookOpen, FaEdit, FaSave, FaTimes,
  FaPlus, FaInfo, FaTrash, FaUsers, FaCalendarAlt, FaDollarSign,
  FaChartLine, FaCheckCircle, FaClock, FaExclamationTriangle,
  FaArrowLeft, FaEye, FaEyeSlash, FaProjectDiagram, FaBullseye,
  FaRocket, FaLightbulb, FaFileAlt
} from 'react-icons/fa';

const formatDate = (dateString) => {
  if (!dateString) return '-';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return '-';
  }
};

function ProjectDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [editProject, setEditProject] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [logs, setLogs] = useState([]);
  const [newLog, setNewLog] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [showLogModal, setShowLogModal] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: proj } = await supabase.from('projects').select('*').eq('id', id).single();
      setProject(proj);
      setEditProject(proj);
      fetchTasks();
      fetchLogs();
    })();
  }, [id]);

  const fetchTasks = async () => {
    const { data } = await supabase.from('project_tasks').select('*').eq('project_id', id).order('created_at', { ascending: false });
    setTasks(data);
  };

  const fetchLogs = async () => {
    const { data } = await supabase.from('project_logs').select('*').eq('project_id', id).order('created_at', { ascending: false });
    setLogs(data);
  };

  const handleSaveProject = async () => {
    setSaving(true);
    await supabase.from('projects').update(editProject).eq('id', id);
    setProject(editProject);
    setIsEditing(false);
    setSaving(false);
  };

  const handleTaskStatusChange = async (taskId, currentStatus) => {
    const newStatus = currentStatus === 'Completed' ? 'Not Started' : 'Completed';
    await supabase.from('project_tasks').update({ status: newStatus }).eq('id', taskId);
    fetchTasks();
  };

  const handleDeleteTask = async (taskId) => {
    if (window.confirm('Delete this task?')) {
      await supabase.from('project_tasks').delete().eq('id', taskId);
      fetchTasks();
    }
  };

  const handleAddLog = async () => {
    if (!newLog.trim()) return;
    await supabase.from('project_logs').insert([{ project_id: id, entry: newLog }]);
    setNewLog('');
    fetchLogs();
    setShowLogModal(false);
  };

  const handleDeleteLog = async (logId) => {
    if (window.confirm('Delete this log?')) {
      await supabase.from('project_logs').delete().eq('id', logId);
      fetchLogs();
    }
  };

  return (
    <div className="project-details-container">
      <section className="content-card">
        <div className="card-header">
          <div className="header-title"><FaInfo className="header-icon" /><h3>Project Information</h3></div>
          <div className="header-actions">
            {isEditing ? (<>
              <button onClick={handleSaveProject} className="action-button success" disabled={saving}><FaSave /> Save</button>
              <button onClick={() => setIsEditing(false)} className="action-button secondary"><FaTimes /> Cancel</button>
            </>) : (
              <button onClick={() => setIsEditing(true)} className="action-button primary"><FaEdit /> Edit</button>
            )}
          </div>
        </div>
        <div className="card-content">
          {isEditing ? (<>
            <input name="customer_name" value={editProject.customer_name} onChange={(e) => setEditProject({ ...editProject, customer_name: e.target.value })} />
            <input name="sales_stage" value={editProject.sales_stage} onChange={(e) => setEditProject({ ...editProject, sales_stage: e.target.value })} />
            <input name="product" value={editProject.product} onChange={(e) => setEditProject({ ...editProject, product: e.target.value })} />
            <input name="due_date" type="date" value={editProject.due_date} onChange={(e) => setEditProject({ ...editProject, due_date: e.target.value })} />
            <input name="deal_value" value={editProject.deal_value} onChange={(e) => setEditProject({ ...editProject, deal_value: e.target.value })} />
          </>) : (<>
            <p><strong>Customer:</strong> {project.customer_name}</p>
            <p><strong>Sales Stage:</strong> {project.sales_stage}</p>
            <p><strong>Product:</strong> {project.product}</p>
            <p><strong>Due Date:</strong> {formatDate(project.due_date)}</p>
            <p><strong>Deal Value:</strong> ${project.deal_value}</p>
          </>)}
        </div>
      </section>

      <section className="content-card">
        <div className="card-header">
          <div className="header-title"><FaBookOpen className="header-icon" /><h3>Project Logs</h3></div>
          <div className="header-actions">
            <button onClick={() => setShowLogModal(true)} className="action-button primary"><FaPlus /></button>
          </div>
        </div>
        <div className="card-content">
          {logs.length > 0 ? logs.map(log => (
            <div key={log.id} className="log-item">
              <p>{log.entry}</p>
              <small>{formatDate(log.created_at)}</small>
              <button onClick={() => handleDeleteLog(log.id)}><FaTrash /></button>
            </div>
          )) : <p>No logs yet.</p>}
        </div>
      </section>

      <section className="content-card">
        <div className="card-header">
          <div className="header-title"><FaTasks className="header-icon" /><h3>Tasks</h3></div>
          <div className="header-actions">
            <button onClick={() => setShowTaskModal(true)} className="action-button primary"><FaPlus /> New Task</button>
          </div>
        </div>
        <div className="card-content">
          {tasks.map(task => (
            <div key={task.id} className={`task-item`}>
              <div className="task-checkbox-wrapper">
                <input type="checkbox" checked={task.status === 'Completed'} onChange={() => handleTaskStatusChange(task.id, task.status)} />
              </div>
              <div className="task-main-content">
                <h4>{task.description}</h4>
              </div>
              <button onClick={() => handleDeleteTask(task.id)}><FaTrash /></button>
            </div>
          ))}
        </div>
      </section>

      {showTaskModal && (
        <div className="modal-backdrop" onClick={() => { setShowTaskModal(false); setEditingTask(null); }}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingTask ? 'Edit Task' : 'New Task'}</h3>
              <button onClick={() => { setShowTaskModal(false); setEditingTask(null); }}><FaTimes /></button>
            </div>
            <div className="modal-form">
              <input placeholder="Task Description" value={editingTask?.description || ''} onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })} />
              <button onClick={async () => {
                if (!editingTask?.description) return;
                if (editingTask.id) {
                  await supabase.from('project_tasks').update(editingTask).eq('id', editingTask.id);
                } else {
                  await supabase.from('project_tasks').insert([{ ...editingTask, project_id: id }]);
                }
                setShowTaskModal(false); setEditingTask(null); fetchTasks();
              }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {showLogModal && (
        <div className="modal-backdrop" onClick={() => setShowLogModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Log Entry</h3>
              <button onClick={() => setShowLogModal(false)}><FaTimes /></button>
            </div>
            <div className="modal-form">
              <textarea value={newLog} onChange={(e) => setNewLog(e.target.value)} />
              <button onClick={handleAddLog}>Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProjectDetails;
