import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';  // ✅ Include Link
import { supabase } from './supabaseClient';

function ProjectDetails() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProjectDetails() {
      setLoading(true);

      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();
      if (projectError) console.error('Error loading project:', projectError);

      const { data: taskData, error: taskError } = await supabase
        .from('project_tasks')
        .select('*')
        .eq('project_id', id);
      if (taskError) console.error('Error loading tasks:', taskError);

      const { data: logData, error: logError } = await supabase
        .from('project_logs')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: false });

      if (logError) {
        console.error('Error loading logs:', logError.message);
        setLogs([]);
      } else {
        setLogs(logData || []);
      }

      setProject(projectData);
      setTasks(taskData || []);
      setLoading(false);
    }

    fetchProjectDetails();
  }, [id]);

  if (loading) return <p>Loading project details...</p>;
  if (!project) return <p>Project not found.</p>;

  const groupTasks = (status) =>
    tasks.filter((task) => task.status === status);

  return (
    <div style={{ padding: '20px' }}>
      {/* ✅ Back to Dashboard Link */}
      <Link to="/" style={{ display: 'inline-block', marginBottom: '16px', textDecoration: 'none' }}>
        ⬅️ Back to Dashboard
      </Link>

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
