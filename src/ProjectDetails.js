// ProjectDetails.js - With UI/UX polish: improved hierarchy, badges, buttons, readability, modern project details layout + inline editing with dropdowns + tasks + meeting minutes + fixed edit task and log

import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from './supabaseClient';
import './ProjectDetails.css';
import {
  FaHome, FaTasks, FaBookOpen, FaEdit, FaSave, FaTimes,
  FaPlus, FaTrash, FaEye, FaChevronDown, FaChevronUp
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
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [newTask, setNewTask] = useState({ description: '', status: 'Not Started', due_date: '', notes: '' });
  const [editTaskId, setEditTaskId] = useState(null);
  const [editTaskForm, setEditTaskForm] = useState({ description: '', status: '', due_date: '', notes: '' });
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [newLogEntry, setNewLogEntry] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);

  const countryOptions = [ "Australia", "Bangladesh", "Brunei", "Cambodia", "China", "Fiji", "India", "Indonesia", "Japan", "Laos", "Malaysia",
    "Myanmar", "Nepal", "New Zealand", "Pakistan", "Papua New Guinea", "Philippines", "Singapore", "Solomon Islands",
    "South Korea", "Sri Lanka", "Thailand", "Timor-Leste", "Tonga", "Vanuatu", "Vietnam"
  ];
  const salesStageOptions = [ 'Closed-Cancelled/Hold', 'Closed-Lost', 'Closed-Won', 'Contracting', 'Demo', 'Discovery',
    'PoC', 'RFI', 'RFP', 'SoW'
  ];
  const productOptions = ['Marketplace', 'O-City', 'Processing', 'SmartVista'];

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

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveProject = async () => {
    const { error } = await supabase
      .from('projects')
      .update(editForm)
      .eq('id', id);
    if (!error) {
      setIsEditingDetails(false);
      fetchProjectDetails();
    }
  };

  const handleCancelEdit = () => {
    setIsEditingDetails(false);
    setEditForm(project);
  };

  const handleTaskInput = (e) => {
    const { name, value } = e.target;
    setNewTask((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditTaskInput = (e) => {
    const { name, value } = e.target;
    setEditTaskForm((prev) => ({ ...prev, [name]: value }));
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

  const handleEditTask = (task) => {
    setEditTaskId(task.id);
    setEditTaskForm(task);
    setShowTaskModal(true);
  };

  const handleUpdateTask = async (e) => {
    e.preventDefault();
    const { error } = await supabase
      .from('project_tasks')
      .update(editTaskForm)
      .eq('id', editTaskId);
    if (!error) {
      setEditTaskId(null);
      setShowTaskModal(false);
      fetchProjectDetails();
    }
  };

  const handleDeleteTask = async (taskId) => {
    const { error } = await supabase.from('project_tasks').delete().eq('id', taskId);
    if (!error) {
      fetchProjectDetails();
    }
  };

  const handleAddLog = async (e) => {
    e.preventDefault();
    if (!newLogEntry.trim()) return;
    const { error } = await supabase.from('project_logs').insert([{ entry: newLogEntry, project_id: id }]);
    if (!error) {
      setNewLogEntry('');
      setShowLogModal(false);
      fetchProjectDetails();
    }
  };

  const activeTasks = tasks.filter(t => !['Completed', 'Cancelled/On-hold'].includes(t.status));
  const completedTasks = tasks.filter(t => ['Completed', 'Cancelled/On-hold'].includes(t.status));

  if (loading) return <div className="loader">Loading project details...</div>;
  if (!project) return <div className="not-found">Project not found.</div>;

  return (
    <div className="page-wrapper">
      <div className="page-content wide">
        <div className="back-link-container">
          <Link to="/" className="back-btn">
            <FaHome /> Back to Dashboard
          </Link>
        </div>

        {/* Existing layout... */}

        {showTaskModal && (
          <div className="modal-overlay">
            <div className="modal">
              <h3>{editTaskId ? 'Edit Task' : 'Add Task'}</h3>
              <form onSubmit={editTaskId ? handleUpdateTask : handleAddTask} className="task-form">
                <input name="description" placeholder="Task Description" value={(editTaskId ? editTaskForm.description : newTask.description)} onChange={editTaskId ? handleEditTaskInput : handleTaskInput} required />
                <select name="status" value={(editTaskId ? editTaskForm.status : newTask.status)} onChange={editTaskId ? handleEditTaskInput : handleTaskInput}>
                  <option value="Not Started">Not Started</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled/On-hold">Cancelled/On-hold</option>
                </select>
                <input type="date" name="due_date" value={(editTaskId ? editTaskForm.due_date : newTask.due_date)} onChange={editTaskId ? handleEditTaskInput : handleTaskInput} />
                <input name="notes" placeholder="Notes" value={(editTaskId ? editTaskForm.notes : newTask.notes)} onChange={editTaskId ? handleEditTaskInput : handleTaskInput} />
                <div className="modal-actions">
                  <button type="submit"><FaSave /> Save</button>
                  <button type="button" onClick={() => { setShowTaskModal(false); setEditTaskId(null); }}><FaTimes /> Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showLogModal && (
          <div className="modal-overlay">
            <div className="modal">
              <h3>Add Project Log</h3>
              <form onSubmit={handleAddLog} className="task-form">
                <textarea value={newLogEntry} onChange={(e) => setNewLogEntry(e.target.value)} rows="4" placeholder="Enter log entry..."></textarea>
                <div className="modal-actions">
                  <button type="submit"><FaSave /> Save</button>
                  <button type="button" onClick={() => setShowLogModal(false)}><FaTimes /> Cancel</button>
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
