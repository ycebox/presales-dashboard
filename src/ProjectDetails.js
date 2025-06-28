import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from './supabaseClient';
import './ProjectDetails.css';
import { FaHome, FaTasks, FaBookOpen, FaEdit, FaSave, FaTimes, FaPlus, FaTrash } from 'react-icons/fa';

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
    const { error } = await supabase.from('project_tasks').insert([{
      description: newTask.description,
      status: newTask.status,
      due_date: newTask.due_date || null,
      project_id: id,
    }]);
    if (!error) {
      setNewTask({ description: '', status: 'Not Started', due_date: '' });
      fetchProjectDetails();
    }
  };

  const deleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    const { error } = await supabase.from('project_tasks').delete().eq('id', taskId);
    if (!error) fetchProjectDetails();
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
    const payload = { ...taskEditForm, due_date: taskEditForm.due_date || null };
    const { error } = await supabase.from('project_tasks').update(payload).eq('id', editTaskId);
    if (!error) {
      setEditTaskId(null);
      fetchProjectDetails();
    }
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
    if (!window.confirm('Are you sure you want to delete this log?')) return;
    const { error } = await supabase.from('project_logs').delete().eq('id', logId);
    if (!error) fetchProjectDetails();
  };

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

        <div className="project-container">
          <div className="project-card">
            <div className="project-header">
              <h2 className="highlight-name big-name center-text">{project.customer_name}</h2>
              {!editingProject && <button onClick={() => setEditingProject(true)}><FaEdit /> Edit</button>}
            </div>

            <div className="edit-form flat-style">
              {Object.entries(editForm).map(([key, value]) => (
                key !== 'id' && key !== 'created_at' && (
                  <label key={key} className="flat-label">
                    <span className="field-label">{key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}</span>
                    <input
                      name={key}
                      value={value || ''}
                      onChange={editingProject ? handleProjectFieldChange : undefined}
                      readOnly={!editingProject}
                      className={editingProject ? '' : 'read-only'}
                    />
                  </label>
                )
              ))}

              {editingProject && (
                <div className="form-actions">
                  <button onClick={saveProjectDetails}><FaSave /> Save</button>
                  <button onClick={() => setEditingProject(false)}><FaTimes /> Cancel</button>
                </div>
              )}
            </div>
          </div>

          <!-- tasks and logs remain unchanged -->

        </div>
      </div>
    </div>
  );
}

export default ProjectDetails;
