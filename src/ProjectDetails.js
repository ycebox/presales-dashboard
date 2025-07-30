import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from './supabaseClient';
import './ProjectDetails.css';
import {
  FaEdit,
  FaSave,
  FaTimes,
  FaPlus,
  FaTrash,
  FaRegStickyNote
} from 'react-icons/fa';

function ProjectDetails() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [logs, setLogs] = useState([]);
  const [editForm, setEditForm] = useState({});
  const [editingProject, setEditingProject] = useState(false);
  const [newTask, setNewTask] = useState({ description: '', status: 'Not Started' });

  useEffect(() => {
    fetchProject();
    fetchTasks();
    fetchLogs();
  }, [id]);

  const fetchProject = async () => {
    const { data } = await supabase.from('projects').select('*').eq('id', id).single();
    setProject(data);
    setEditForm(data);
  };

  const fetchTasks = async () => {
    const { data } = await supabase.from('project_tasks').select('*').eq('project_id', id).order('due_date');
    setTasks(data || []);
  };

  const fetchLogs = async () => {
    const { data } = await supabase.from('project_logs').select('*').eq('project_id', id).order('created_at', { ascending: false });
    setLogs(data || []);
  };

  const handleProjectSave = async () => {
    await supabase.from('projects').update(editForm).eq('id', id);
    setEditingProject(false);
    fetchProject();
  };

  const handleTaskAdd = async () => {
    if (!newTask.description) return;
    await supabase.from('project_tasks').insert([{ ...newTask, project_id: id }]);
    setNewTask({ description: '', status: 'Not Started' });
    fetchTasks();
  };

  const handleTaskDelete = async (taskId) => {
    await supabase.from('project_tasks').delete().eq('id', taskId);
    fetchTasks();
  };

  if (!project) return <div className="loading-text">Loading project...</div>;

  return (
    <div className="project-details-container">
      <header className="project-header">
        <div className="header-left">
          <h1 className="section-title">{project.customer_name}</h1>
          <p className="project-subtitle">{project.scope}</p>
        </div>
        <div className="header-actions">
          {editingProject ? (
            <>
              <button className="icon-button" onClick={handleProjectSave}><FaSave size={16} /></button>
              <button className="icon-button" onClick={() => setEditingProject(false)}><FaTimes size={16} /></button>
            </>
          ) : (
            <button className="icon-button" onClick={() => setEditingProject(true)}><FaEdit size={16} /></button>
          )}
        </div>
      </header>

      <section className="overview-card">
        {editingProject ? (
          <div className="form-grid">
            <div className="form-group">
              <label>Country</label>
              <input
                type="text"
                value={editForm.customer_country}
                onChange={e => setEditForm({ ...editForm, customer_country: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Account Manager</label>
              <input
                type="text"
                value={editForm.account_manager}
                onChange={e => setEditForm({ ...editForm, account_manager: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Sales Stage</label>
              <input
                type="text"
                value={editForm.sales_stage}
                onChange={e => setEditForm({ ...editForm, sales_stage: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Deal Value</label>
              <input
                type="text"
                value={editForm.deal_value}
                onChange={e => setEditForm({ ...editForm, deal_value: e.target.value })}
              />
            </div>
          </div>
        ) : (
          <ul className="project-info">
            <li><strong>Country:</strong> {project.customer_country}</li>
            <li><strong>Account Manager:</strong> {project.account_manager}</li>
            <li><strong>Sales Stage:</strong> {project.sales_stage}</li>
            <li><strong>Deal Value:</strong> {project.deal_value}</li>
          </ul>
        )}
      </section>

      <section className="tasks-section">
        <h2 className="section-title">Project Tasks</h2>
        <div className="task-add-row">
          <input
            type="text"
            placeholder="Add a new task..."
            value={newTask.description}
            onChange={e => setNewTask({ ...newTask, description: e.target.value })}
          />
          <button className="icon-button" onClick={handleTaskAdd}><FaPlus size={16} /></button>
        </div>
        <ul className="task-list">
          {tasks.map(task => (
            <li key={task.id} className="task-item">
              <span>{task.description}</span>
              <button className="delete-button" onClick={() => handleTaskDelete(task.id)}>
                <FaTrash size={14} />
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="logs-section">
        <h2 className="section-title">Project Logs</h2>
        <ul className="logs-list">
          {logs.map(log => (
            <li key={log.id}>
              <span className="log-date">{new Date(log.created_at).toLocaleDateString()}</span>
              <p className="log-text">{log.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="meeting-section">
        <h2 className="section-title">Meeting Notes</h2>
        <div className="meeting-placeholder">
          <FaRegStickyNote size={20} />
          <p>No meeting notes linked yet.</p>
        </div>
      </section>
    </div>
  );
}

export default ProjectDetails;
