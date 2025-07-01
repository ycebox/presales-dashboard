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
  const [linkedMeetingMinutes, setLinkedMeetingMinutes] = useState([]); // ✅ Added
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
    fetchLinkedMeetingMinutes(); // ✅ Added
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

  // ✅ New function to get linked meeting notes
  async function fetchLinkedMeetingMinutes() {
    const { data, error } = await supabase
      .from('meeting_minutes')
      .select('*')
      .eq('project_id', id)
      .order('created_at', { ascending: false });

    if (!error) setLinkedMeetingMinutes(data || []);
  }

  // ... (no changes to the rest of your original code)

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

        {/* ... (everything else stays exactly the same) */}

        <div className="project-logs">
          <div className="log-header">
            <h3><FaBookOpen /> Project Logs</h3>
            <button onClick={() => setShowLogModal(true)}><FaPlus /> Add Log</button>
          </div>
          <ul className="logs-list">
            {logs.map(log => (
              <li key={log.id}>
                {editLogId === log.id ? (
                  <>
                    <textarea value={editLogEntry} onChange={(e) => setEditLogEntry(e.target.value)} rows="3" style={{ width: '100%' }} />
                    <div className="modal-actions" style={{ marginTop: '0.5rem' }}>
                      <button onClick={() => saveEditLog(log.id)}><FaSave /> Save</button>
                      <button onClick={cancelEditLog}><FaTimes /> Cancel</button>
                    </div>
                  </>
                ) : (
                  <>
                    {log.entry}
                    <div className="task-actions" style={{ marginTop: '0.25rem' }}>
                      <button onClick={() => startEditLog(log)}><FaEdit /></button>
                      <button onClick={() => deleteLog(log.id)}><FaTrash /></button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* ✅ New: Linked Meeting Minutes */}
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
                    <Link to={`/meeting-minutes?id=${note.id}`} target="_blank">
                      <button><FaEye /> View</button>
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* (no changes to modals or other sections) */}
      </div>
    </div>
  );
}

export default ProjectDetails;
