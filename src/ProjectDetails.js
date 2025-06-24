import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from './supabaseClient';

function ProjectDetails() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [newTask, setNewTask] = useState({ description: '', status: 'Not Started', due_date: '' });
  const [editTaskId, setEditTaskId] = useState(null);
  const [editForm, setEditForm] = useState({ description: '', status: '', due_date: '' });

  const [isEditingProject, setIsEditingProject] = useState(false);
  const [editProjectForm, setEditProjectForm] = useState({});

  const [newLog, setNewLog] = useState('');
  const [editLogId, setEditLogId] = useState(null);
  const [editLogMessage, setEditLogMessage] = useState('');

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
    setEditProjectForm(projectData);
    setTasks(taskData || []);
    setLogs(logData || []);
    setLoading(false);
  }

  const groupTasks = (status) => tasks.filter((task) => task.status === status);

  const handleTaskInput = (e) => {
    const { name, value } = e.target;
    setNewTask((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTask.description.trim()) return;

    const { error } = await supabase.from('project_tasks').insert([
      {
        description: newTask.description,
        status: newTask.status,
        due_date: newTask.due_date || null,
        project_id: id,
      },
    ]);

    if (error) {
      console.error('Error adding task:', error.message);
    } else {
      setNewTask({ description: '', status: 'Not Started', due_date: '' });
      fetchProjectDetails();
    }
  };

  const startEdit = (task) => {
    setEditTaskId(task.id);
    setEditForm({
      description: task.description,
      status: task.status,
      due_date: task.due_date ? task.due_date.split('T')[0] : '',
    });
  };

  const cancelEdit = () => {
    setEditTaskId(null);
    setEditForm({ description: '', status: '', due_date: '' });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const saveEdit = async () => {
    const { error } = await supabase.from('project_tasks').update(editForm).eq('id', editTaskId);

    if (error) {
      console.error('Error updating task:', error.message);
    } else {
      setEditTaskId(null);
      setEditForm({ description: '', status: '', due_date: '' });
      fetchProjectDetails();
    }
  };

  const handleProjectChange = (e) => {
    const { name, value } = e.target;
    setEditProjectForm((prev) => ({ ...prev, [name]: value }));
  };

  const saveProjectEdit = async () => {
    const { error } = await supabase.from('projects').update(editProjectForm).eq('id', id);
    if (error) {
      console.error('Error updating project:', error.message);
    } else {
      setIsEditingProject(false);
      fetchProjectDetails();
    }
  };

  const handleAddLog = async () => {
    if (!newLog.trim()) return;
    const { error } = await supabase.from('project_logs').insert([
      { message: newLog, project_id: id },
    ]);
    if (error) console.error('Error adding log:', error.message);
    else {
      setNewLog('');
      fetchProjectDetails();
    }
  };

  const handleEditLog = async (logId) => {
    const { error } = await supabase.from('project_logs').update({ message: editLogMessage }).eq('id', logId);
    if (error) console.error('Error editing log:', error.message);
    else {
      setEditLogId(null);
      setEditLogMessage('');
      fetchProjectDetails();
    }
  };

  if (loading) return <p>Loading project details...</p>;
  if (!project) return <p>Project not found.</p>;

  return (
    <div style={{ padding: '20px' }}>
      <h2>🔍 Project Details</h2>
      <Link to="/">⬅️ Back to Dashboard</Link>

      {!isEditingProject ? (
        <>
          <p><strong>Customer Name:</strong> {project.customer_name}</p>
          <p><strong>Country:</strong> {project.country}</p>
          <p><strong>Account Manager:</strong> {project.account_manager}</p>
          <p><strong>Sales Stage:</strong> {project.sales_stage}</p>
          <p><strong>Product:</strong> {project.product}</p>
          <p><strong>Deal Value:</strong> {project.deal_value}</p>
          <p><strong>Scope:</strong> {project.scope}</p>
          <p><strong>Backup Presales:</strong> {project.backup_presales}</p>
          <p><strong>Remarks:</strong> {project.remarks}</p>
          <button onClick={() => setIsEditingProject(true)}>✏️ Edit Project</button>
        </>
      ) : (
        <>
          {Object.keys(editProjectForm).map((key) => (
            <div key={key}>
              <label><strong>{key.replace(/_/g, ' ')}:</strong></label>
              <input name={key} value={editProjectForm[key] || ''} onChange={handleProjectChange} />
            </div>
          ))}
          <button onClick={saveProjectEdit}>💾 Save</button>
          <button onClick={() => setIsEditingProject(false)}>✖ Cancel</button>
        </>
      )}

      <h3>📝 Tasks</h3>
      <form onSubmit={handleAddTask} style={{ marginBottom: '20px' }}>
        <input
          name="description"
          placeholder="Task Description"
          value={newTask.description}
          onChange={handleTaskInput}
          required
        />
        <select name="status" value={newTask.status} onChange={handleTaskInput}>
          <option value="Not Started">Not Started</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled/On-hold">Cancelled/On-hold</option>
        </select>
        <input type="date" name="due_date" value={newTask.due_date} onChange={handleTaskInput} />
        <button type="submit">+ Add Task</button>
      </form>

      {['Not Started', 'In Progress', 'Completed', 'Cancelled/On-hold'].map((status) => (
        <div key={status}>
          <h4>{status}</h4>
          <ul>
            {groupTasks(status).map((task) => (
              <li key={task.id}>
                {editTaskId === task.id ? (
                  <>
                    <input
                      name="description"
                      value={editForm.description}
                      onChange={handleEditChange}
                    />
                    <select name="status" value={editForm.status} onChange={handleEditChange}>
                      <option value="Not Started">Not Started</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled/On-hold">Cancelled/On-hold</option>
                    </select>
                    <input
                      type="date"
                      name="due_date"
                      value={editForm.due_date}
                      onChange={handleEditChange}
                    />
                    <button onClick={saveEdit}>💾 Save</button>
                    <button onClick={cancelEdit}>✖ Cancel</button>
                  </>
                ) : (
                  <>
                    {task.description} {task.due_date ? `(Due: ${task.due_date.split('T')[0]})` : ''}
                    <button onClick={() => startEdit(task)} style={{ marginLeft: '10px' }}>✏️ Edit</button>
                  </>
                )}
              </li>
            ))}
            {groupTasks(status).length === 0 && <li>No tasks.</li>}
          </ul>
        </div>
      ))}

      <h3>📚 Project Logs</h3>
      <textarea
        rows="2"
        placeholder="Add log message..."
        value={newLog}
        onChange={(e) => setNewLog(e.target.value)}
      />
      <br />
      <button onClick={handleAddLog}>➕ Add Log</button>

      {Array.isArray(logs) && logs.length > 0 ? (
        logs.map((log) => (
          <div key={log.id} style={{ borderBottom: '1px solid #ccc', marginBottom: '8px' }}>
            {editLogId === log.id ? (
              <>
                <textarea
                  value={editLogMessage}
                  onChange={(e) => setEditLogMessage(e.target.value)}
                />
                <br />
                <button onClick={() => handleEditLog(log.id)}>💾 Save</button>
                <button onClick={() => setEditLogId(null)}>✖ Cancel</button>
              </>
            ) : (
              <>
                <p>{log.message}</p>
                <small>{new Date(log.created_at).toLocaleString()}</small>
                <br />
                <button onClick={() => { setEditLogId(log.id); setEditLogMessage(log.message); }}>
                  ✏️ Edit
                </button>
              </>
            )}
          </div>
        ))
      ) : (
        <p>No logs available.</p>
      )}
    </div>
  );
}

export default ProjectDetails;
