import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from './supabaseClient';
import './ProjectDetails.css';
import {
  FaHome, FaTasks, FaBookOpen, FaEdit, FaSave, FaTimes,
  FaPlus, FaTrash, FaEye, FaEyeSlash
} from 'react-icons/fa';

function ProjectDetails() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingProject, setEditingProject] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [newTask, setNewTask] = useState({ description: '', status: 'Not Started', due_date: '', notes: '' });
  const [editTaskId, setEditTaskId] = useState(null);
  const [editTaskForm, setEditTaskForm] = useState({ description: '', status: '', due_date: '', notes: '' });
  const [showCompleted, setShowCompleted] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [newLogEntry, setNewLogEntry] = useState('');

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

  const handleTaskInput = (e) => {
    const { name, value } = e.target;
    setNewTask((prev) => ({ ...prev, [name]: value }));
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

  const startEditTask = (task) => {
    setEditTaskId(task.id);
    setEditTaskForm({
      description: task.description,
      status: task.status,
      due_date: task.due_date ? task.due_date.split('T')[0] : '',
      notes: task.notes || ''
    });
  };

  const handleEditTaskChange = (e) => {
    const { name, value } = e.target;
    setEditTaskForm((prev) => ({ ...prev, [name]: value }));
  };

  const cancelEditTask = () => {
    setEditTaskId(null);
    setEditTaskForm({ description: '', status: '', due_date: '', notes: '' });
  };

  const saveEditTask = async (taskId) => {
    if (!taskId) return;
    const payload = {
      description: editTaskForm.description,
      status: editTaskForm.status,
      due_date: editTaskForm.due_date || null,
      notes: editTaskForm.notes
    };
    const { error } = await supabase.from('project_tasks').update(payload).match({ id: taskId });
    if (!error) {
      setEditTaskId(null);
      fetchProjectDetails();
    }
  };

  const deleteTask = async (taskId) => {
    if (!window.confirm('Delete this task?')) return;
    const { error } = await supabase.from('project_tasks').delete().eq('id', taskId);
    if (!error) fetchProjectDetails();
  };

  const handleAddLog = async () => {
    if (!newLogEntry.trim()) return;
    const { error } = await supabase.from('project_logs').insert([{ project_id: id, entry: newLogEntry }]);
    if (!error) {
      setNewLogEntry('');
      setShowLogModal(false);
      fetchProjectDetails();
    }
  };

  if (loading) return <div className="loader">Loading project details...</div>;
  if (!project) return <div className="not-found">Project not found.</div>;

  const activeTasks = tasks.filter(t => !['Completed', 'Cancelled/On-hold'].includes(t.status));
  const completedTasks = tasks.filter(t => ['Completed', 'Cancelled/On-hold'].includes(t.status));

  return (
    <div className="page-wrapper navy-theme">
      <div className="page-content wide">
        <div className="back-link-container">
          <Link to="/" className="back-btn">
            <FaHome /> Back to Dashboard
          </Link>
        </div>

        <div className="project-layout">
          <div className="project-left">
            <h3><FaBookOpen /> Project Details</h3>
            <p><strong>Customer:</strong> {project.customer_name}</p>
            <p><strong>Country:</strong> {project.country}</p>
            <p><strong>Account Manager:</strong> {project.account_manager}</p>
            <p><strong>Sales Stage:</strong> {project.sales_stage}</p>
            <p><strong>Product:</strong> {project.product}</p>
            <p><strong>Scope:</strong> {project.scope}</p>
            <p><strong>Deal Value:</strong> {project.deal_value}</p>
            <p><strong>Backup Presales:</strong> {project.backup_presales}</p>
            <p><strong>Remarks:</strong> {project.remarks}</p>
          </div>

          <div className="project-middle">
            <h3><FaTasks /> Tasks</h3>
            <button onClick={() => setShowTaskModal(true)}><FaPlus /> Add Task</button>
            <table className="task-table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Status</th>
                  <th>Due Date</th>
                  <th>Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeTasks.map(task => (
                  <tr key={task.id}>
                    {editTaskId === task.id ? (
                      <>
                        <td><input name="description" value={editTaskForm.description} onChange={handleEditTaskChange} /></td>
                        <td>
                          <select name="status" value={editTaskForm.status} onChange={handleEditTaskChange}>
                            <option value="Not Started">Not Started</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Completed">Completed</option>
                            <option value="Cancelled/On-hold">Cancelled/On-hold</option>
                          </select>
                        </td>
                        <td><input type="date" name="due_date" value={editTaskForm.due_date} onChange={handleEditTaskChange} /></td>
                        <td><input name="notes" value={editTaskForm.notes} onChange={handleEditTaskChange} /></td>
                        <td>
                          <button onClick={() => saveEditTask(task.id)}><FaSave /></button>
                          <button onClick={cancelEditTask}><FaTimes /></button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>{task.description}</td>
                        <td>{task.status}</td>
                        <td>{task.due_date ? task.due_date.split('T')[0] : '—'}</td>
                        <td>{task.notes}</td>
                        <td>
                          <button onClick={() => startEditTask(task)}><FaEdit /></button>
                          <button onClick={() => deleteTask(task.id)}><FaTrash /></button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>

            <button className="toggle-completed" onClick={() => setShowCompleted(!showCompleted)}>
              {showCompleted ? <><FaEyeSlash /> Hide Completed</> : <><FaEye /> Show Completed</>}
            </button>

            {showCompleted && (
              <table className="task-table completed">
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Status</th>
                    <th>Due Date</th>
                    <th>Notes</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {completedTasks.map(task => (
                    <tr key={task.id}>
                      <td>{task.description}</td>
                      <td>{task.status}</td>
                      <td>{task.due_date ? task.due_date.split('T')[0] : '—'}</td>
                      <td>{task.notes}</td>
                      <td>
                        <button onClick={() => deleteTask(task.id)}><FaTrash /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="project-logs">
          <div className="log-header">
            <h3><FaBookOpen /> Project Logs</h3>
            <button onClick={() => setShowLogModal(true)}><FaPlus /> Add Log</button>
          </div>
          <ul className="logs-list">
            {logs.map(log => (
              <li key={log.id}>
                <strong>{new Date(log.created_at).toLocaleString()}:</strong> {log.entry}
              </li>
            ))}
          </ul>
        </div>

        {showTaskModal && (
          <div className="modal-overlay">
            <div className="modal">
              <h3>Add New Task</h3>
              <form onSubmit={handleAddTask} className="task-form">
                <input name="description" placeholder="Task Description" value={newTask.description} onChange={handleTaskInput} required />
                <select name="status" value={newTask.status} onChange={handleTaskInput}>
                  <option value="Not Started">Not Started</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled/On-hold">Cancelled/On-hold</option>
                </select>
                <input type="date" name="due_date" value={newTask.due_date} onChange={handleTaskInput} />
                <input name="notes" placeholder="Notes" value={newTask.notes} onChange={handleTaskInput} />
                <div className="modal-actions">
                  <button type="submit"><FaSave /> Save</button>
                  <button type="button" onClick={() => setShowTaskModal(false)}><FaTimes /> Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showLogModal && (
          <div className="modal-overlay">
            <div className="modal">
              <h3>Add Log Entry</h3>
              <textarea value={newLogEntry} onChange={(e) => setNewLogEntry(e.target.value)} rows="4" placeholder="Type your log entry here..."></textarea>
              <div className="modal-actions">
                <button onClick={handleAddLog}><FaSave /> Save</button>
                <button onClick={() => setShowLogModal(false)}><FaTimes /> Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProjectDetails;
