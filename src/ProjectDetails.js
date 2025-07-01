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
  const [linkedMeetingMinutes, setLinkedMeetingMinutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editForm, setEditForm] = useState({});
  const [newTask, setNewTask] = useState({ description: '', status: 'Not Started', due_date: '', notes: '' });
  const [editTaskId, setEditTaskId] = useState(null);
  const [editTaskForm, setEditTaskForm] = useState({ description: '', status: '', due_date: '', notes: '' });
  const [showCompleted, setShowCompleted] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [newLogEntry, setNewLogEntry] = useState('');
  const [editLogId, setEditLogId] = useState(null);
  const [editLogEntry, setEditLogEntry] = useState('');

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

  const handleAddLog = async () => {
    if (!newLogEntry.trim()) return;
    const { error } = await supabase.from('project_logs').insert([{ project_id: id, entry: newLogEntry }]);
    if (!error) {
      setNewLogEntry('');
      setShowLogModal(false);
      fetchProjectDetails();
    }
  };

  const activeTasks = tasks.filter(t => !['Completed', 'Cancelled/On-hold'].includes(t.status));
  const completedTasks = tasks.filter(t => ['Completed', 'Cancelled/On-hold'].includes(t.status));

  if (loading) return <div className="loader">Loading project details...</div>;
  if (!project) return <div className="not-found">Project not found.</div>;

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
                    <td>{task.description}</td>
                    <td>{task.status}</td>
                    <td>{task.due_date}</td>
                    <td>{task.notes}</td>
                    <td><button><FaEdit /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="project-logs">
          <h3><FaBookOpen /> Project Logs</h3>
          <button onClick={() => setShowLogModal(true)}><FaPlus /> Add Log</button>
          <ul className="logs-list">
            {logs.map(log => (
              <li key={log.id}>{log.entry}</li>
            ))}
          </ul>
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
                    <button onClick={() => window.open(`/presales-dashboard/meeting-minutes?id=${note.id}`, '_blank')}><FaEye /> View</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
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
