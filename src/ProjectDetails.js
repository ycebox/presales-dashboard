// ProjectDetails.js - Fully working version with inline editing, tasks, logs, and meeting minutes

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
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [newTask, setNewTask] = useState({ description: '', status: 'Not Started', due_date: '', notes: '' });
  const [editTaskId, setEditTaskId] = useState(null);
  const [editTaskForm, setEditTaskForm] = useState({ description: '', status: '', due_date: '', notes: '' });
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [newLogEntry, setNewLogEntry] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);

  const countryOptions = ["Australia", "Bangladesh", "Brunei", "Cambodia", "China", "Fiji", "India", "Indonesia", "Japan", "Laos", "Malaysia", "Myanmar", "Nepal", "New Zealand", "Pakistan", "Papua New Guinea", "Philippines", "Singapore", "Solomon Islands", "South Korea", "Sri Lanka", "Thailand", "Timor-Leste", "Tonga", "Vanuatu", "Vietnam"];
  const salesStageOptions = ['Closed-Cancelled/Hold', 'Closed-Lost', 'Closed-Won', 'Contracting', 'Demo', 'Discovery', 'PoC', 'RFI', 'RFP', 'SoW'];
  const productOptions = ['Marketplace', 'O-City', 'Processing', 'SmartVista'];

  useEffect(() => {
    fetchProjectDetails();
    fetchLinkedMeetingMinutes();
  }, [id]);

  async function fetchProjectDetails() {
    setLoading(true);
    const { data: projectData } = await supabase.from('projects').select('*').eq('id', id).single();
    const { data: taskData } = await supabase.from('project_tasks').select('*').eq('project_id', id);
    const { data: logData } = await supabase.from('project_logs').select('*').eq('project_id', id).order('created_at', { ascending: false });

    setProject(projectData);
    setEditForm(projectData || {});
    setTasks(taskData || []);
    setLogs(logData || []);
    setLoading(false);
  }

  async function fetchLinkedMeetingMinutes() {
    const { data, error } = await supabase.from('meeting_minutes').select('*').eq('project_id', id).order('created_at', { ascending: false });
    if (!error) setLinkedMeetingMinutes(data || []);
  }

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveProject = async () => {
    const { error } = await supabase.from('projects').update(editForm).eq('id', id);
    if (!error) {
      setIsEditingDetails(false);
      fetchProjectDetails();
    }
  };

  const handleCancelEdit = () => {
    setIsEditingDetails(false);
    setEditForm(project);
  };

  const handleTaskInput = (e) => {
    const { name, value } = e.target;
    setNewTask(prev => ({ ...prev, [name]: value }));
  };

  const handleEditTaskInput = (e) => {
    const { name, value } = e.target;
    setEditTaskForm(prev => ({ ...prev, [name]: value }));
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
    const { error } = await supabase.from('project_tasks').update(editTaskForm).eq('id', editTaskId);
    if (!error) {
      setEditTaskId(null);
      setShowTaskModal(false);
      fetchProjectDetails();
    }
  };

  const handleDeleteTask = async (taskId) => {
    const { error } = await supabase.from('project_tasks').delete().eq('id', taskId);
    if (!error) fetchProjectDetails();
  };

  const handleAddLog = async () => {
    if (!newLogEntry.trim()) return;
    const { error } = await supabase.from('project_logs').insert([{ project_id: id, entry: newLogEntry }]);
    if (!error) {
      setNewLogEntry('');
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
          <Link to="/" className="back-btn"><FaHome /> Back to Dashboard</Link>
        </div>

        <div className="project-layout">
          <div className="project-left">
            <div className="project-header">
              <h2 className="customer-name highlight-name">{editForm.customer_name}</h2>
              <div className="form-actions">
                {isEditingDetails ? (
                  <>
                    <button onClick={handleSaveProject}><FaSave /> Save</button>
                    <button onClick={handleCancelEdit}><FaTimes /> Cancel</button>
                  </>
                ) : (
                  <span className="edit-link" onClick={() => setIsEditingDetails(true)}><FaEdit /> Edit</span>
                )}
              </div>
            </div>
            <div className="section-card">
              <h3>Project Details</h3>
              <div className="edit-form">
                <label>Country
                  {isEditingDetails ? (
                    <select name="country" value={editForm.country || ''} onChange={handleEditFormChange} className="dropdown">
                      {countryOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  ) : (
                    <input type="text" value={editForm.country || ''} readOnly className="readonly" />
                  )}
                </label>
                <label>Account Manager
                  <input name="account_manager" value={editForm.account_manager || ''} onChange={handleEditFormChange} readOnly={!isEditingDetails} className={!isEditingDetails ? 'readonly' : ''} />
                </label>
                <label>Sales Stage
                  {isEditingDetails ? (
                    <select name="sales_stage" value={editForm.sales_stage || ''} onChange={handleEditFormChange} className="dropdown">
                      {salesStageOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  ) : (
                    <input type="text" value={editForm.sales_stage || ''} readOnly className="readonly" />
                  )}
                </label>
                <label>Product
                  {isEditingDetails ? (
                    <select name="product" value={editForm.product || ''} onChange={handleEditFormChange} className="dropdown">
                      {productOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  ) : (
                    <input type="text" value={editForm.product || ''} readOnly className="readonly" />
                  )}
                </label>
                <label>Scope
                  <input name="scope" value={editForm.scope || ''} onChange={handleEditFormChange} readOnly={!isEditingDetails} className={!isEditingDetails ? 'readonly' : ''} />
                </label>
                <label>Deal Value
                  <input name="deal_value" value={editForm.deal_value || ''} onChange={handleEditFormChange} readOnly={!isEditingDetails} className={!isEditingDetails ? 'readonly' : ''} />
                </label>
                <label>Backup Presales
                  <input name="backup_presales" value={editForm.backup_presales || ''} onChange={handleEditFormChange} readOnly={!isEditingDetails} className={!isEditingDetails ? 'readonly' : ''} />
                </label>
                <label style={{ gridColumn: '1 / -1' }}>Remarks
                  <textarea name="remarks" rows="3" value={editForm.remarks || ''} onChange={handleEditFormChange} readOnly={!isEditingDetails} className={!isEditingDetails ? 'readonly' : ''} />
                </label>
              </div>
            </div>
          </div>

          <div className="project-middle">
            <div className="project-logs">
              <h3><FaBookOpen /> Project Logs</h3>
              <div className="form-actions">
                <input type="text" placeholder="New log entry..." value={newLogEntry} onChange={(e) => setNewLogEntry(e.target.value)} />
                <button onClick={handleAddLog}><FaPlus /> Add Log</button>
              </div>
              <ul className="logs-list">
                {logs.map(log => <li key={log.id}>{log.entry}</li>)}
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

            {activeTasks.map(task => (
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

            {showCompleted && (
              <>
                {completedTasks.filter(task => task.status === 'Completed').length > 0 && (
                  <>
                    <h4>Completed Tasks</h4>
                    {completedTasks.filter(task => task.status === 'Completed').map(task => (
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
                  </>
                )}
                {completedTasks.filter(task => task.status === 'Cancelled/On-hold').length > 0 && (
                  <>
                    <h4>On-hold / Cancelled Tasks</h4>
                    {completedTasks.filter(task => task.status === 'Cancelled/On-hold').map(task => (
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
                  </>
                )}
              </>
            )}
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
    </div>
  );
}

export default ProjectDetails;
