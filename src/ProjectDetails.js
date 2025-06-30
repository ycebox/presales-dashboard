import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from './supabaseClient';
import './ProjectDetails.css';
import { FaHome, FaTasks, FaBookOpen, FaEdit, FaSave, FaTimes, FaPlus, FaTrash } from 'react-icons/fa';

function ProjectDetails() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [editingProject, setEditingProject] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [newTask, setNewTask] = useState({ description: '', status: 'Not Started', due_date: '' });
  const [editTaskId, setEditTaskId] = useState(null);
  const [taskEditForm, setTaskEditForm] = useState({ description: '', status: '', due_date: '' });

  const [newLog, setNewLog] = useState('');
  const [editLogId, setEditLogId] = useState(null);
  const [editLogText, setEditLogText] = useState('');

  useEffect(() => {
    fetchProjectDetails();
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

  const handleProjectFieldChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const saveProjectDetails = async () => {
    const updated = { ...editForm };
    delete updated.id;
    delete updated.created_at;
    const { error } = await supabase.from('projects').update(updated).eq('id', id);
    if (!error) {
      setEditingProject(false);
      fetchProjectDetails();
    }
  };

  const handleTaskInput = (e) => {
    const { name, value } = e.target;
    setNewTask((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTask.description.trim()) return;
    const { error } = await supabase.from('project_tasks').insert([{
      description: newTask.description,
      status: newTask.status,
      due_date: newTask.due_date || null,
      project_id: id,
    }]);
    if (!error) {
      setNewTask({ description: '', status: 'Not Started', due_date: '' });
      fetchProjectDetails();
    }
  };

  const deleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    const { error } = await supabase.from('project_tasks').delete().eq('id', taskId);
    if (!error) fetchProjectDetails();
  };

  const groupTasks = (status) => tasks.filter((task) => task.status === status);

  const startEditTask = (task) => {
    setEditTaskId(task.id);
    setTaskEditForm({
      description: task.description,
      status: task.status,
      due_date: task.due_date ? task.due_date.split('T')[0] : '',
    });
  };

  const cancelEditTask = () => {
    setEditTaskId(null);
    setTaskEditForm({ description: '', status: '', due_date: '' });
  };

  const handleEditTaskChange = (e) => {
    const { name, value } = e.target;
    setTaskEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const saveEditTask = async () => {
    const payload = { ...taskEditForm, due_date: taskEditForm.due_date || null };
    const { error } = await supabase.from('project_tasks').update(payload).eq('id', editTaskId);
    if (!error) {
      setEditTaskId(null);
      fetchProjectDetails();
    }
  };

  const handleAddLog = async () => {
    if (!newLog.trim()) return;
    const { error } = await supabase.from('project_logs').insert([{ notes: newLog, project_id: id }]);
    if (!error) {
      setNewLog('');
      fetchProjectDetails();
    }
  };

  const startEditLog = (log) => {
    setEditLogId(log.id);
    setEditLogText(log.notes);
  };

  const cancelEditLog = () => {
    setEditLogId(null);
    setEditLogText('');
  };

  const saveEditLog = async (logId) => {
    if (!editLogText.trim()) return;
    const { error } = await supabase.from('project_logs').update({ notes: editLogText }).eq('id', logId);
    if (!error) {
      setEditLogId(null);
      setEditLogText('');
      fetchProjectDetails();
    }
  };

  const deleteLog = async (logId) => {
    if (!window.confirm('Are you sure you want to delete this log?')) return;
    const { error } = await supabase.from('project_logs').delete().eq('id', logId);
    if (!error) fetchProjectDetails();
  };

  if (loading) return <div className="loader">Loading project details...</div>;
  if (!project) return <div className="not-found">Project not found.</div>;

  const dropdownFields = {
    sales_stage: ['Closed-Cancelled/Hold', 'Closed-Lost', 'Closed-Won', 'Contracting', 'Demo', 'Discovery',
    'PoC', 'RFI', 'RFP', 'SoW'],
    product: ['Marketplace', 'O-City', 'Processing', 'SmartVista'],
    country: ["Australia", "Bangladesh", "Brunei", "Cambodia", "China", "Fiji", "India", "Indonesia", "Japan", "Laos", "Malaysia",
    "Myanmar", "Nepal", "New Zealand", "Pakistan", "Papua New Guinea", "Philippines", "Singapore", "Solomon Islands",
    "South Korea", "Sri Lanka", "Thailand", "Timor-Leste", "Tonga", "Vanuatu", "Vietnam"],
  };

  const renderInputField = (key, value, isEdit) => {
    const label = key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    const isDropdown = dropdownFields[key];
    return (
      <label key={key}>
        {label}
        {isEdit && isDropdown ? (
          <select name={key} value={value || ''} onChange={handleProjectFieldChange}>
            <option value="">Select</option>
            {dropdownFields[key].map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        ) : (
          <input name={key} value={value || ''} onChange={isEdit ? handleProjectFieldChange : undefined} readOnly={!isEdit} />
        )}
      </label>
    );
  };

  return (
    <div className="page-wrapper navy-theme">
      <div className="page-content wide">
        <div className="back-link-container">
          <Link to="/" className="back-btn">
            <FaHome /> Back to Dashboard
          </Link>
        </div>

        <div className="projectdetails-grid">
          <div className="project-card">
            <div className="project-header">
              <h2 className="highlight-name big-name center-text">{project.customer_name}</h2>
              {!editingProject && <button onClick={() => setEditingProject(true)}><FaEdit /> Edit</button>}
            </div>
            <div className="edit-form">
              {Object.entries(editForm).map(([key, value]) => (
                key !== 'id' && key !== 'created_at' && renderInputField(key, value, editingProject)
              ))}
              {editingProject && (
                <div className="form-actions">
                  <button onClick={saveProjectDetails}><FaSave /> Save</button>
                  <button onClick={() => setEditingProject(false)}><FaTimes /> Cancel</button>
                </div>
              )}
            </div>
          </div>

          <div className="section-card project-logs">
            <h3><FaBookOpen /> Project Logs</h3>
            <div className="log-form">
              <textarea rows={3} placeholder="Add a log entry..." value={newLog} onChange={(e) => setNewLog(e.target.value)} />
              <button onClick={handleAddLog}><FaPlus /> Add</button>
            </div>
            {logs.length > 0 ? (
              logs.map((log) => (
                <div key={log.id} className="log-entry">
                  {editLogId === log.id ? (
                    <>
                      <textarea rows={2} value={editLogText} onChange={(e) => setEditLogText(e.target.value)} />
                      <div>
                        <button onClick={() => saveEditLog(log.id)}><FaSave /></button>
                        <button onClick={cancelEditLog}><FaTimes /></button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p>{log.notes}</p>
                      <div>
                        <button onClick={() => startEditLog(log)}><FaEdit /></button>
                        <button onClick={() => deleteLog(log.id)}><FaTrash /></button>
                      </div>
                    </>
                  )}
                </div>
              ))
            ) : (
              <p>No logs available.</p>
            )}
          </div>
        </div>

        <div className="section-card" id="tasks">
          <h3><FaTasks /> Tasks</h3>
          <form onSubmit={handleAddTask} className="task-form">
            <input name="description" placeholder="Task Description" value={newTask.description} onChange={handleTaskInput} required />
            <select name="status" value={newTask.status} onChange={handleTaskInput}>
              <option value="Not Started">Not Started</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled/On-hold">Cancelled/On-hold</option>
            </select>
            <input type="date" name="due_date" value={newTask.due_date} onChange={handleTaskInput} />
            <button type="submit"><FaPlus /> Add</button>
          </form>
          {['Not Started', 'In Progress', 'Completed', 'Cancelled/On-hold'].map((status) => (
            <div key={status} className="task-group">
              <h4>{status}</h4>
              <div className="task-headers">
                <span>Description</span>
                <span>Due Date</span>
                <span>Actions</span>
              </div>
              <ul>
                {groupTasks(status).map((task) => (
                  <li key={task.id} className="task-row">
                    {editTaskId === task.id ? (
                      <>
                        <input name="description" value={taskEditForm.description} onChange={handleEditTaskChange} />
                        <input type="date" name="due_date" value={taskEditForm.due_date} onChange={handleEditTaskChange} />
                        <div>
                          <button onClick={saveEditTask}><FaSave /></button>
                          <button onClick={cancelEditTask}><FaTimes /></button>
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="task-desc">{task.description}</span>
                        <span className="task-date">{task.due_date ? task.due_date.split('T')[0] : '—'}</span>
                        <div className="task-actions">
                          <button onClick={() => startEditTask(task)}><FaEdit /></button>
                          <button onClick={() => deleteTask(task.id)}><FaTrash /></button>
                        </div>
                      </>
                    )}
                  </li>
                ))}
                {groupTasks(status).length === 0 && <li>No tasks.</li>}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ProjectDetails;
