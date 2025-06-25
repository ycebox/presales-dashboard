import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from './supabaseClient';

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
    if (error) console.error('Error updating project:', error.message);
    else {
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
    const { error } = await supabase.from('project_tasks').insert([
      {
        description: newTask.description,
        status: newTask.status,
        due_date: newTask.due_date || null,
        project_id: id,
      },
    ]);
    if (error) console.error('Error adding task:', error.message);
    else {
      setNewTask({ description: '', status: 'Not Started', due_date: '' });
      fetchProjectDetails();
    }
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
    const payload = {
      ...taskEditForm,
      due_date: taskEditForm.due_date || null,
    };
    const { error } = await supabase.from('project_tasks').update(payload).eq('id', editTaskId);
    if (error) console.error('Error updating task:', error.message);
    else {
      setEditTaskId(null);
      fetchProjectDetails();
    }
  };

  const handleAddLog = async () => {
    if (!newLog.trim()) return;
    const { error } = await supabase.from('project_logs').insert([{ notes: newLog, project_id: id }]);
    if (error) console.error('Error adding log:', error.message);
    else {
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
    if (error) console.error('Error editing log:', error.message);
    else {
      setEditLogId(null);
      setEditLogText('');
      fetchProjectDetails();
    }
  };

  const deleteLog = async (logId) => {
    const confirm = window.confirm('Are you sure you want to delete this log?');
    if (!confirm) return;
    const { error } = await supabase.from('project_logs').delete().eq('id', logId);
    if (error) console.error('Error deleting log:', error.message);
    else fetchProjectDetails();
  };

  if (loading) return <p>Loading project details...</p>;
  if (!project) return <p>Project not found.</p>;

  return (
    <div style={{ padding: '20px' }}>
      <h2>🔍 {project.customer_name} - Project Details</h2>
      <Link to="/">⬅️ Back to Dashboard</Link>

      {/* Edit Project Section */}
      {editingProject ? (
        <div style={{ marginTop: '10px' }}>
          {Object.entries(editForm).map(([key, value]) =>
            key !== 'id' && key !== 'created_at' ? (
              <div key={key}>
                <label>
                  <strong>{key.replace(/_/g, ' ')}:</strong>{' '}
                  <input
                    name={key}
                    value={value || ''}
                    onChange={handleProjectFieldChange}
                    style={{ marginBottom: '8px', width: '100%' }}
                  />
                </label>
              </div>
            ) : null
          )}
          <button onClick={saveProjectDetails}>💾 Save</button>
          <button onClick={() => setEditingProject(false)}>✖ Cancel</button>
        </div>
      ) : (
        <>
          <p><strong>Country:</strong> {project.country}</p>
          <p><strong>Account Manager:</strong> {project.account_manager}</p>
          <p><strong>Sales Stage:</strong> {project.sales_stage}</p>
          <p><strong>Product:</strong> {project.product}</p>
          <p><strong>Deal Value:</strong> {project.deal_value}</p>
          <p><strong>Scope:</strong> {project.scope}</p>
          <p><strong>Backup Presales:</strong> {project.backup_presales}</p>
          <p><strong>Remarks:</strong> {project.remarks}</p>
          <button onClick={() => setEditingProject(true)}>✏️ Edit Project Details</button>
        </>
      )}

      {/* Tasks Section */}
      <h3>📝 Tasks</h3>
      <form onSubmit={handleAddTask} style={{ marginBottom: '20px' }}>
        <input name="description" placeholder="Task Description" value={newTask.description} onChange={handleTaskInput} required />
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
                    <input name="description" value={taskEditForm.description} onChange={handleEditTaskChange} />
                    <select name="status" value={taskEditForm.status} onChange={handleEditTaskChange}>
                      <option value="Not Started">Not Started</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled/On-hold">Cancelled/On-hold</option>
                    </select>
                    <input type="date" name="due_date" value={taskEditForm.due_date} onChange={handleEditTaskChange} />
                    <button onClick={saveEditTask}>💾 Save</button>
                    <button onClick={cancelEditTask}>✖ Cancel</button>
                  </>
                ) : (
                  <>
                    {task.description} {task.due_date ? `(Due: ${task.due_date.split('T')[0]})` : ''}
                    <button onClick={() => startEditTask(task)} style={{ marginLeft: '10px' }}>✏️ Edit</button>
                  </>
                )}
              </li>
            ))}
            {groupTasks(status).length === 0 && <li>No tasks.</li>}
          </ul>
        </div>
      ))}

      {/* Logs Section */}
      {/* Logs */}
<h3>📚 Project Logs</h3>
<textarea
  rows={3}
  placeholder="Add a log entry..."
  value={newLog}
  onChange={(e) => setNewLog(e.target.value)}
  style={{ width: '100%', marginBottom: '10px' }}
/>
<button type="button" onClick={handleAddLog}>➕ Add Log</button>

{logs.length > 0 ? (
  logs.map((log) => (
    <div key={log.id} style={{ borderBottom: '1px solid #ccc', marginTop: '10px' }}>
      {editLogId === log.id ? (
        <>
          <textarea
            rows={2}
            value={editLogText}
            onChange={(e) => setEditLogText(e.target.value)}
            style={{ width: '100%' }}
          />
          <div style={{ marginTop: '5px' }}>
            <button type="button" onClick={() => saveEditLog(log.id)}>💾 Save</button>
            <button type="button" onClick={cancelEditLog} style={{ marginLeft: '5px' }}>✖ Cancel</button>
          </div>
        </>
      ) : (
        <>
          <p>{log.notes}</p>
          <div>
            <button type="button" onClick={() => startEditLog(log)}>✏️ Edit</button>
            <button type="button" onClick={() => deleteLog(log.id)} style={{ marginLeft: '5px' }}>🗑️ Delete</button>
          </div>
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
