import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import supabase from './supabaseClient';

function ProjectDetails() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProjectDetails() {
      setLoading(true);

      const { data: projectData } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

      const { data: taskData } = await supabase
        .from('project_tasks')
        .select('*')
        .eq('project_id', id);

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

    fetchProjectDetails();
  }, [id]);

  if (loading) return <p>Loading project details...</p>;

  if (!project) return <p>Project not found.</p>;

  // Group tasks by status
  const groupTasks = (status) =>
    tasks.filter((task) => task.status === status);

  return (
    <div style={{ padding: '20px' }}>
      <h2>🔍 {project.customer_name} - Project Details</h2>
      <p><strong>Country:</strong> {project.country}</p>
      <p><strong>Account Manager:</strong> {project.account_manager}</p>
      <p><strong>Sales Stage:</strong> {project.sales_stage}</p>
      <p><strong>Product:</strong> {project.product}</p>
      <p><strong>Deal Value:</strong> {project.deal_value}</p>
      <p><strong>Scope:</strong> {project.scope}</p>
      <p><strong>Backup Presales:</strong> {project.backup_presales}</p>
      <p><strong>Remarks:</strong> {project.remarks}</p>

      <h3>📝 Tasks</h3>
      {['Not Started', 'In Progress', 'Completed'].map((status) => (
        <div key={status}>
          <h4>{status}</h4>
          <ul>
            {groupTasks(status).map((task) => (
              <li key={task.id}>{task.title}</li>
            ))}
            {groupTasks(status).length === 0 && <li>No tasks.</li>}
          </ul>
        </div>
      ))}

      <h3>📚 Project Logs</h3>
      {logs && logs.length > 0 ? (
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
