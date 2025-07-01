import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from './supabaseClient';
import './ProjectDetails.css';
import {
  FaHome, FaTasks, FaBookOpen, FaEdit, FaSave, FaTimes,
  FaPlus, FaTrash, FaEye, FaEyeSlash
} from 'react-icons/fa';
import 'react-quill/dist/quill.snow.css';

function ProjectDetails() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [logs, setLogs] = useState([]);
  const [linkedMeetingMinutes, setLinkedMeetingMinutes] = useState([]);
  const [selectedMeetingNote, setSelectedMeetingNote] = useState(null);
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
          {tasks.map(task => (
            <div key={task.id} className="task-item">
              <p><strong>{task.description}</strong></p>
              <p>Status: {task.status}</p>
              <p>Due: {task.due_date}</p>
              <p>Notes: {task.notes}</p>
            </div>
          ))}
        </div>

        <div className="project-logs">
          <h3><FaBookOpen /> Project Logs</h3>
          <ul>
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
                    <button onClick={() => setSelectedMeetingNote(note)}><FaEye /> View</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {selectedMeetingNote && (
          <div className="modal-overlay">
            <div className="modal" style={{ maxWidth: '800px', width: '90%' }}>
              <h3>{selectedMeetingNote.title}</h3>
              <div
                className="meeting-note-content"
                style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '1rem' }}
                dangerouslySetInnerHTML={{ __html: selectedMeetingNote.content }}
              />
              <div className="modal-actions">
                <button onClick={() => setSelectedMeetingNote(null)}><FaTimes /> Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProjectDetails;
