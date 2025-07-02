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
  const [selectedMeetingNote, setSelectedMeetingNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editForm, setEditForm] = useState({});
  const [showEditProjectModal, setShowEditProjectModal] = useState(false);
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
            <div className="project-header">
              <h2 className="customer-name">{project.customer_name}</h2>
              <span className="edit-link" onClick={() => setShowEditProjectModal(true)}>✏ Edit</span>
            </div>
            <div className="section-card">
              <h3>Project Details</h3>
              <p><strong>Country:</strong> {project.country}</p>
              <p><strong>Account Manager:</strong> {project.account_manager}</p>
              <p><strong>Sales Stage:</strong> {project.sales_stage}</p>
              <p><strong>Product:</strong> {project.product}</p>
              <p><strong>Scope:</strong> {project.scope}</p>
              <p><strong>Deal Value:</strong> {project.deal_value}</p>
              <p><strong>Backup Presales:</strong> {project.backup_presales}</p>
              <p><strong>Remarks:</strong> {project.remarks}</p>
            </div>
          </div>
        </div>

        {showEditProjectModal && (
          <div className="modal-overlay">
            <div className="modal" style={{ maxWidth: '800px' }}>
              <h3>Edit Project</h3>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const { error } = await supabase
                    .from('projects')
                    .update(editForm)
                    .eq('id', id);
                  if (!error) {
                    setShowEditProjectModal(false);
                    fetchProjectDetails();
                  }
                }}
                className="edit-form"
              >
                <label>Customer Name<input value={editForm.customer_name || ''} onChange={(e) => setEditForm({ ...editForm, customer_name: e.target.value })} /></label>
                <label>Country<input value={editForm.country || ''} onChange={(e) => setEditForm({ ...editForm, country: e.target.value })} /></label>
                <label>Account Manager<input value={editForm.account_manager || ''} onChange={(e) => setEditForm({ ...editForm, account_manager: e.target.value })} /></label>
                <label>Sales Stage<input value={editForm.sales_stage || ''} onChange={(e) => setEditForm({ ...editForm, sales_stage: e.target.value })} /></label>
                <label>Product<input value={editForm.product || ''} onChange={(e) => setEditForm({ ...editForm, product: e.target.value })} /></label>
                <label>Scope<input value={editForm.scope || ''} onChange={(e) => setEditForm({ ...editForm, scope: e.target.value })} /></label>
                <label>Deal Value<input value={editForm.deal_value || ''} onChange={(e) => setEditForm({ ...editForm, deal_value: e.target.value })} /></label>
                <label>Backup Presales<input value={editForm.backup_presales || ''} onChange={(e) => setEditForm({ ...editForm, backup_presales: e.target.value })} /></label>
                <label>Remarks<textarea value={editForm.remarks || ''} onChange={(e) => setEditForm({ ...editForm, remarks: e.target.value })} rows={3} /></label>
                <div className="modal-actions" style={{ marginTop: '1rem' }}>
                  <button type="submit"><FaSave /> Save</button>
                  <button type="button" onClick={() => setShowEditProjectModal(false)}><FaTimes /> Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default ProjectDetails;
