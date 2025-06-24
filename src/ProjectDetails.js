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
    const updateData = {
      ...editForm,
      due_date: editForm.due_date === '' ? null : editForm.due_date,
    };

    const { error } = await supabase
      .from('project_tasks')
      .update(updateData)
      .eq('id', editTaskId);

    if (error) {
      console.error('Error updating task:', error.message);
    } else {
      setEditTaskId(null);
      setEditForm({ description: '', status: '', due_date: '' });
      fetchProjectDetails();
    }
  };

  const taskStatuses = ['Not Started', 'In Progress', 'Completed', 'Cancelled / On-hold'];

  if (loading) return <p>Loading project details...</p>;
  if (!project) return <p>Project not found.</p>;

  return (
    <div style={{ padding: '20px' }}>
      <h2>🔍 {project.customer_name} - Project Details</h2>
      <Link to="/">⬅️ Back to Dashboard</Link>
      <p><strong>Country:</strong> {project.country}</p>
      <p><strong>Account Manager:</strong> {project.account_manager}</p>
      <p><strong>Sales Stage:</strong> {project.sales_stage}</p>
      <p><strong>Product:</strong> {project.product}</p>
      <p><strong>Deal Value:</strong> {project.deal_value}</p>
      <p><strong>Scope:</strong> {project.scope}</p>
      <p><strong>Backup Presales:</strong> {project.backup_presales}</p>
      <p><strong>Remarks:</strong> {project.remarks}</p>

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
          {taskStatuses.map((status) => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
        <input type="date" name="due_date" value={newTask.due_date} onChange={handleTaskInput} />
        <button type="submit">+ Add Task</button>
      </form>

      {taskStatuses.map((status) => (
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
                      {taskStatuses.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
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
                    <button onClick={() => startEdit(task)} style={{ marginLeft: '10px' }}>
                      ✏️ Edit
                    </button>
                  </>
                )}
              </li>
            ))}
            {groupTasks(status).length === 0 && <li>No tasks.</li>}
          </ul>
        </div>
      ))}

      <h3>📚 Project Logs</h3>
      {Array.isArray(logs) && logs.length > 0 ? (
        logs.map((log) => (
          <div key={log.id} style={{ borderBottom: '1px solid #ccc', marginBottom: '8px' }}>
            <p>{log.message}</p>
            <small>{new Date(log.created_at).toLocaleString()}</small>
          </div>
        ))
      ) : (
        <p>No logs available.</p>
      )}
    </div>
  );
}

export default ProjectDetails;
