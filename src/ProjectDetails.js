import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from './supabaseClient';
import './ProjectDetails.css';
import { FaArrowLeft, FaEdit, FaSave, FaTimes, FaPlus, FaTrash, FaCheck } from 'react-icons/fa';

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
    const { data: logData } = await supabase.from('project_logs').select('*').eq('project_id', id).order('created_at', { ascending: false });

    setProject(projectData);
    setEditForm(projectData || {});
    setTasks(taskData || []);
    setLogs(logData || []);
    setLoading(false);
  }

  const groupTasks = (status) => tasks.filter((task) => task.status === status);

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
    const { error } = await supabase.from('project_tasks').insert([{ ...newTask, project_id: id }]);
    if (!error) {
      setNewTask({ description: '', status: 'Not Started', due_date: '' });
      fetchProjectDetails();
    }
  };

  const startEditTask = (task) => {
    setEditTaskId(task.id);
    setTaskEditForm({
      description: task.description,
      status: task.status,
      due_date: task.due_date ? task.due_date.split('T')[0] : ''
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
    const { error } = await supabase.from('project_tasks').update({ ...taskEditForm }).eq('id', editTaskId);
    if (!error) {
      setEditTaskId(null);
      fetchProjectDetails();
    }
  };

  const deleteTask = async (taskId) => {
    const { error } = await supabase.from('project_tasks').delete().eq('id', taskId);
    if (!error) fetchProjectDetails();
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
    const { error } = await supabase.from('project_logs').delete().eq('id', logId);
    if (!error) fetchProjectDetails();
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="project-page">
      <div className="header-bar">
        <Link to="/" className="back-link"><FaArrowLeft /> Back to Dashboard</Link>
      </div>

      <div className="project-layout">
        <div className="project-overview">
          <h2>Project Overview</h2>
          <p><strong>Customer:</strong> {project.customer_name}</p>
          <p><strong>Country:</strong> {project.country}</p>
          <p><strong>Product:</strong> {project.product}</p>
          <p><strong>Sales Stage:</strong> {project.sales_stage}</p>
        </div>

        <div className="task-summary">
          <h2>Task Summary</h2>
          <p>{tasks.length} Total</p>
          <p>{groupTasks('Not Started').length} Not Started</p>
          <p>{groupTasks('In Progress').length} In Progress</p>
          <p>{groupTasks('Completed').length} Completed</p>
        </div>
      </div>

      <div className="task-section">
        <h3>Tasks</h3>
        <form onSubmit={handleAddTask} className="task-form">
          <input name="description" value={newTask.description} onChange={handleTaskInput} placeholder="Task description" />
          <select name="status" value={newTask.status} onChange={handleTaskInput}>
            <option value="Not Started">Not Started</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>
          <input type="date" name="due_date" value={newTask.due_date} onChange={handleTaskInput} />
          <button type="submit"><FaPlus /></button>
        </form>

        <ul className="task-list">
          {tasks.map(task => (
            <li key={task.id}>
              {editTaskId === task.id ? (
                <>
                  <input name="description" value={taskEditForm.description} onChange={handleEditTaskChange} />
                  <input type="date" name="due_date" value={taskEditForm.due_date} onChange={handleEditTaskChange} />
                  <button onClick={saveEditTask}><FaSave /></button>
                  <button onClick={cancelEditTask}><FaTimes /></button>
                </>
              ) : (
                <>
                  <span>{task.description} ({task.status})</span>
                  <button onClick={() => startEditTask(task)}><FaEdit /></button>
                  <button onClick={() => deleteTask(task.id)}><FaTrash /></button>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="log-section">
        <h3>Project Logs</h3>
        <textarea value={newLog} onChange={(e) => setNewLog(e.target.value)} placeholder="Add log..."></textarea>
        <button onClick={handleAddLog}><FaPlus /></button>

        {logs.map(log => (
          <div key={log.id} className="log-entry">
            {editLogId === log.id ? (
              <>
                <textarea value={editLogText} onChange={(e) => setEditLogText(e.target.value)}></textarea>
                <button onClick={() => saveEditLog(log.id)}><FaSave /></button>
                <button onClick={cancelEditLog}><FaTimes /></button>
              </>
            ) : (
              <>
                <p>{log.notes}</p>
                <button onClick={() => startEditLog(log)}><FaEdit /></button>
                <button onClick={() => deleteLog(log.id)}><FaTrash /></button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default ProjectDetails;
