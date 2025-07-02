// ProjectDetails.js - With UI/UX polish: improved hierarchy, badges, buttons, readability, modern project details layout

import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from './supabaseClient';
import './ProjectDetails.css';
import {
  FaHome, FaTasks, FaBookOpen, FaEdit, FaSave, FaTimes,
  FaPlus, FaTrash, FaEye, FaChevronDown, FaChevronUp
} from 'react-icons/fa';

function ProjectDetails() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [logs, setLogs] = useState([]);
  const [linkedMeetingMinutes, setLinkedMeetingMinutes] = useState([]);
  const [selectedMeetingNote, setSelectedMeetingNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editForm, setEditForm] = useState({});
  const [showEditProjectModal, setShowEditProjectModal] = useState(false);
  const [newTask, setNewTask] = useState({ description: '', status: 'Not Started', due_date: '', notes: '' });
  const [editTaskId, setEditTaskId] = useState(null);
  const [editTaskForm, setEditTaskForm] = useState({ description: '', status: '', due_date: '', notes: '' });
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [newLogEntry, setNewLogEntry] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);

  useEffect(() => {
    fetchProjectDetails();
    fetchLinkedMeetingMinutes();
  }, [id]);

  async function fetchProjectDetails() {
    setLoading(true);
    const { data: projectData } = await supabase.from('projects').select('*').eq('id', id).single();
    const { data: taskData } = await supabase.from('project_tasks').select('*').eq('project_id', id);
    const { data: logData } = await supabase
      .from('project_logs')
      .select('*')
      .eq('project_id', id)
      .order('created_at', { ascending: false });

    setProject(projectData);
    setEditForm(projectData || {});
    setTasks(taskData || []);
    setLogs(logData || []);
    setLoading(false);
  }

  async function fetchLinkedMeetingMinutes() {
    const { data, error } = await supabase
      .from('meeting_minutes')
      .select('*')
      .eq('project_id', id)
      .order('created_at', { ascending: false });
    if (!error) setLinkedMeetingMinutes(data || []);
  }

  const handleTaskInput = (e) => {
    const { name, value } = e.target;
    setNewTask((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditTaskInput = (e) => {
    const { name, value } = e.target;
    setEditTaskForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTask.description.trim()) return;
    const { error } = await supabase.from('project_tasks').insert([{ ...newTask, project_id: id }]);
    if (!error) {
      setNewTask({ description: '', status: 'Not Started', due_date: '', notes: '' });
      setShowTaskModal(false);
      fetchProjectDetails();
    }
  };

  const handleEditTask = (task) => {
    setEditTaskId(task.id);
    setEditTaskForm(task);
    setShowTaskModal(true);
  };

  const handleUpdateTask = async (e) => {
    e.preventDefault();
    const { error } = await supabase
      .from('project_tasks')
      .update(editTaskForm)
      .eq('id', editTaskId);
    if (!error) {
      setEditTaskId(null);
      setShowTaskModal(false);
      fetchProjectDetails();
    }
  };

  const handleDeleteTask = async (taskId) => {
    const { error } = await supabase.from('project_tasks').delete().eq('id', taskId);
    if (!error) {
      fetchProjectDetails();
    }
  };

  const activeTasks = tasks.filter(t => !['Completed', 'Cancelled/On-hold'].includes(t.status));
  const completedTasks = tasks.filter(t => ['Completed', 'Cancelled/On-hold'].includes(t.status));

  if (loading) return <div className="loader">Loading project details...</div>;
  if (!project) return <div className="not-found">Project not found.</div>;

  return (
    <div className="page-wrapper">
      <div className="page-content wide">
        <div className="back-link-container">
          <Link to="/" className="back-btn">
            <FaHome /> Back to Dashboard
          </Link>
        </div>

        <div className="project-layout">
          <div className="project-left">
            <div className="project-header">
              <h2 className="customer-name highlight-name">{project.customer_name}</h2>
              <span className="edit-link" onClick={() => setShowEditProjectModal(true)}><FaEdit /> Edit</span>
            </div>
            <div className="section-card">
              <h3>Project Details</h3>
              <div className="edit-form">
                <label>
                  Country
                  <input type="text" value={project.country || ''} readOnly />
                </label>
                <label>
                  Account Manager
                  <input type="text" value={project.account_manager || ''} readOnly />
                </label>
                <label>
                  Sales Stage
                  <input type="text" value={project.sales_stage || ''} readOnly />
                </label>
                <label>
                  Product
                  <input type="text" value={project.product || ''} readOnly />
                </label>
                <label>
                  Scope
                  <input type="text" value={project.scope || ''} readOnly />
                </label>
                <label>
                  Deal Value
                  <input type="text" value={project.deal_value || ''} readOnly />
                </label>
                <label>
                  Backup Presales
                  <input type="text" value={project.backup_presales || ''} readOnly />
                </label>
                <label style={{ gridColumn: '1 / -1' }}>
                  Remarks
                  <textarea rows="3" value={project.remarks || ''} readOnly />
                </label>
              </div>
            </div>
          </div>

          <div className="project-middle">
            <div className="project-logs">
              <h3><FaBookOpen /> Project Logs</h3>
              <button onClick={() => setShowLogModal(true)} className="flat-readonly"><FaPlus /> Add Log</button>
              <ul className="logs-list">
                {logs.map(log => (
                  <li key={log.id}>{log.entry}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="project-tasks">
          <h3><FaTasks /> Tasks</h3>
          <div className="form-actions">
            <button onClick={() => setShowTaskModal(true)}><FaPlus /> Add Task</button>
            <button className="toggle-completed-btn" onClick={() => setShowCompleted(prev => !prev)}>
              {showCompleted ? <><FaChevronUp /> Hide Completed</> : <><FaChevronDown /> Show Completed</>}
            </button>
          </div>
          <div className="task-group">
            <div className="task-headers">
              <span>Task</span>
              <span>Status</span>
              <span>Due Date</span>
              <span>Notes</span>
              <span>Actions</span>
            </div>
            {[...activeTasks, ...(showCompleted ? completedTasks : [])].map(task => (
              <div className="task-row" key={task.id}>
                <div className="task-desc">{task.description}</div>
                <div className="task-status">
                  <span className={`status-badge ${task.status.replace(/\s+/g, '-').toLowerCase()}`}>{task.status}</span>
                </div>
                <div className="task-date">{task.due_date}</div>
                <div className="task-notes">{task.notes}</div>
                <div className="task-actions">
                  <button onClick={() => handleEditTask(task)}><FaEdit /></button>
                  <button onClick={() => handleDeleteTask(task.id)}><FaTrash /></button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="meeting-minutes-section">
          <h3><FaBookOpen /> Linked Meeting Minutes</h3>
          {linkedMeetingMinutes.length === 0 ? (
            <p style={{ fontStyle: 'italic' }}>No meeting minutes linked to this project.</p>
          ) : (
            <ul className="logs-list">
              {linkedMeetingMinutes.map(note => (
                <li key={note.id}>
                  <strong>{note.title}</strong>
                  <div className="task-actions" style={{ marginTop: '0.25rem' }}>
                    <button onClick={() => setSelectedMeetingNote(note)}><FaEye /> View</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {showTaskModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>{editTaskId ? 'Edit Task' : 'Add Task'}</h3>
            <form onSubmit={editTaskId ? handleUpdateTask : handleAddTask} className="task-form">
              <input name="description" placeholder="Task Description" value={(editTaskId ? editTaskForm.description : newTask.description)} onChange={editTaskId ? handleEditTaskInput : handleTaskInput} required />
              <select name="status" value={(editTaskId ? editTaskForm.status : newTask.status)} onChange={editTaskId ? handleEditTaskInput : handleTaskInput}>
                <option value="Not Started">Not Started</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled/On-hold">Cancelled/On-hold</option>
              </select>
              <input type="date" name="due_date" value={(editTaskId ? editTaskForm.due_date : newTask.due_date)} onChange={editTaskId ? handleEditTaskInput : handleTaskInput} />
              <input name="notes" placeholder="Notes" value={(editTaskId ? editTaskForm.notes : newTask.notes)} onChange={editTaskId ? handleEditTaskInput : handleTaskInput} />
              <div className="modal-actions">
                <button type="submit"><FaSave /> Save</button>
                <button type="button" onClick={() => { setShowTaskModal(false); setEditTaskId(null); }}><FaTimes /> Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProjectDetails;
