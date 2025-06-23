import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import supabase from './supabaseClient';

function ProjectDetail() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [logs, setLogs] = useState([]);
  const [newLog, setNewLog] = useState('');

  useEffect(() => {
    fetchProject();
    fetchTasks();
    fetchLogs();
  }, [id]);

  const fetchProject = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();
    if (!error) setProject(data);
  };

  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from('project_tasks')
      .select('*')
      .eq('project_id', id);
    if (!error) setTasks(data);
  };

  const fetchLogs = async () => {
    const { data } = await supabase
      .from('project_logs')
      .select('*')
      .eq('project_id', id)
      .order('created_at', { ascending: false });
    setLogs(data);
  };

  const handleLogSubmit = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('project_logs').insert([
      {
        project_id: id,
        comment: newLog,
      },
    ]);
    if (!error) {
      setNewLog('');
      fetchLogs();
    }
  };

  const groupedTasks = {
    'Not Started': [],
    'In Progress': [],
    Completed: [],
  };

  tasks.forEach((task) => {
    if (groupedTasks[task.status]) {
      groupedTasks[task.status].push(task);
    }
  });

  return (
    <div className="project-detail">
      <Link to="/">← Back to Dashboard</Link>
      <h2>Project Details</h2>

      {project && (
        <div className="project-info">
          <p><strong>Customer:</strong> {project.customer_name}</p>
          <p><strong>Country:</strong> {project.country}</p>
          <p><strong>Account Manager:</strong> {project.account_manager}</p>
          <p><strong>Scope:</strong> {project.scope}</p>
          <p><strong>Deal Value:</strong> {project.deal_value}</p>
          <p><strong>Sales Stage:</strong> {project.sales_stage}</p>
          <p><strong>Product:</strong> {project.product}</p>
          <p><strong>Backup Presales:</strong> {project.backup_presales}</p>
          <p><strong>Remarks:</strong> {project.remarks}</p>
        </div>
      )}

      <h3>Project Tasks</h3>
      <div className="task-board">
        {Object.keys(groupedTasks).map((status) => (
          <div key={status} className="task-group">
            <h4>{status}</h4>
            {groupedTasks[status].length === 0 && <p>No tasks</p>}
            <ul>
              {groupedTasks[status].map((task) => (
                <li key={task.id}>{task.title} (Due: {task.due_date})</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <h3>Project Logs / Comments</h3>
      <form onSubmit={handleLogSubmit}>
        <textarea
          rows="3"
          placeholder="Write your comment here..."
          value={newLog}
          onChange={(e) => setNewLog(e.target.value)}
          required
        />
        <button type="submit">Add Log</button>
      </form>
      <ul>
        {logs.map((log) => (
          <li key={log.id}>{log.comment} — <em>{new Date(log.created_at).toLocaleString()}</em></li>
        ))}
      </ul>
    </div>
  );
}

export default ProjectDetail;
