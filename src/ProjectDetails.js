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
      fetchProjectDetails();
    }
  };

  const handleEditProjectChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const saveProjectChanges = async () => {
    const { error } = await supabase.from('projects').update(editForm).eq('id', id);
    if (!error) {
      setEditingProject(false);
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

        <div className="section-card">
          <h3><FaBookOpen /> Project Details</h3>
          {editingProject ? (
            <div className="project-edit-form">
              <input name="customer_name" value={editForm.customer_name} onChange={handleEditProjectChange} placeholder="Customer Name" />
              <input name="customer_country" value={editForm.customer_country} onChange={handleEditProjectChange} placeholder="Country" />
              <input name="account_manager" value={editForm.account_manager} onChange={handleEditProjectChange} placeholder="Account Manager" />
              <input name="sales_stage" value={editForm.sales_stage} onChange={handleEditProjectChange} placeholder="Sales Stage" />
              <input name="deal_value" value={editForm.deal_value} onChange={handleEditProjectChange} placeholder="Deal Value" />
              <input name="product" value={editForm.product} onChange={handleEditProjectChange} placeholder="Product" />
              <input name="scope" value={editForm.scope} onChange={handleEditProjectChange} placeholder="Scope" />
              <input name="backup_presales" value={editForm.backup_presales} onChange={handleEditProjectChange} placeholder="Backup Presales" />
              <input name="remarks" value={editForm.remarks} onChange={handleEditProjectChange} placeholder="Remarks" />
              <button onClick={saveProjectChanges}><FaSave /> Save</button>
              <button onClick={() => setEditingProject(false)}><FaTimes /> Cancel</button>
            </div>
          ) : (
            <div className="project-details-view">
              <p><strong>Customer:</strong> {project.customer_name}</p>
              <p><strong>Country:</strong> {project.customer_country}</p>
              <p><strong>Account Manager:</strong> {project.account_manager}</p>
              <p><strong>Sales Stage:</strong> {project.sales_stage}</p>
              <p><strong>Deal Value:</strong> {project.deal_value}</p>
              <p><strong>Product:</strong> {project.product}</p>
              <p><strong>Scope:</strong> {project.scope}</p>
              <p><strong>Backup Presales:</strong> {project.backup_presales}</p>
              <p><strong>Remarks:</strong> {project.remarks}</p>
              <button onClick={() => setEditingProject(true)}><FaEdit /> Edit Project</button>
            </div>
          )}
        </div>

        <div className="section-card">
          <h3><FaBookOpen /> Project Logs</h3>
          <ul className="log-list">
            {logs.map((log, index) => (
              <li key={index}>
                <span className="log-date">{new Date(log.created_at).toLocaleString()}</span> - {log.entry}
              </li>
            ))}
          </ul>
        </div>

        <div className="section-card">
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
            <input name="notes" placeholder="Notes" value={newTask.notes} onChange={handleTaskInput} />
            <button type="submit"><FaPlus /> Add</button>
          </form>

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
    </div>
  );
}

export default ProjectDetails;
