// ProjectDetails.js - Fully working version with inline editing, tasks, logs, and meeting minutes + enhanced log UI

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
  const [newLogEntry, setNewLogEntry] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);
  const [editingLogId, setEditingLogId] = useState(null);
  const [editingLogValue, setEditingLogValue] = useState('');

  const countryOptions = ["Australia", "Bangladesh", "Brunei", "Cambodia", "China", "Fiji", "India", "Indonesia", "Japan", "Laos", "Malaysia", "Myanmar", "Nepal", "New Zealand", "Pakistan", "Papua New Guinea", "Philippines", "Singapore", "Solomon Islands", "South Korea", "Sri Lanka", "Thailand", "Timor-Leste", "Tonga", "Vanuatu", "Vietnam"];
  const salesStageOptions = ['Closed-Cancelled/Hold', 'Closed-Lost', 'Closed-Won', 'Contracting', 'Demo', 'Discovery', 'PoC', 'RFI', 'RFP', 'SoW'];
  const productOptions = ['Marketplace', 'O-City', 'Processing', 'SmartVista'];

  useEffect(() => {
    fetchProjectDetails();
    fetchLinkedMeetingMinutes();
  }, [id]);

  async function fetchProjectDetails() {
    setLoading(true);
    const { data: projectData } = await supabase.from('projects').select('*').eq('id', id).single();
    const { data: taskData } = await supabase.from('project_tasks').select('*').eq('project_id', id);
    const { data: logData } = await supabase.from('project_logs').select('*').eq('project_id', id).order('created_at', { ascending: false });

    setProject(projectData);
    setEditForm(projectData || {});
    setTasks(taskData || []);
    setLogs(logData || []);
    setLoading(false);
  }

  async function fetchLinkedMeetingMinutes() {
    const { data, error } = await supabase.from('meeting_minutes').select('*').eq('project_id', id).order('created_at', { ascending: false });
    if (!error) setLinkedMeetingMinutes(data || []);
  }

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveProject = async () => {
    const { error } = await supabase.from('projects').update(editForm).eq('id', id);
    if (!error) {
      setIsEditingDetails(false);
      fetchProjectDetails();
    }
  };

  const handleCancelEdit = () => {
    setIsEditingDetails(false);
    setEditForm(project);
  };

  const handleAddLog = async () => {
    if (!newLogEntry.trim()) return;
    const { error } = await supabase.from('project_logs').insert([{ project_id: id, entry: newLogEntry }]);
    if (!error) {
      setNewLogEntry('');
      fetchProjectDetails();
    }
  };

  const handleEditLog = (log) => {
    setEditingLogId(log.id);
    setEditingLogValue(log.entry);
  };

  const handleSaveLog = async () => {
    const { error } = await supabase.from('project_logs').update({ entry: editingLogValue }).eq('id', editingLogId);
    if (!error) {
      setEditingLogId(null);
      setEditingLogValue('');
      fetchProjectDetails();
    }
  };

  const handleCancelLogEdit = () => {
    setEditingLogId(null);
    setEditingLogValue('');
  };

  const handleDeleteLog = async (logId) => {
    const { error } = await supabase.from('project_logs').delete().eq('id', logId);
    if (!error) fetchProjectDetails();
  };

  const activeTasks = tasks.filter(t => !['Completed', 'Cancelled/On-hold'].includes(t.status));
  const completedTasks = tasks.filter(t => ['Completed', 'Cancelled/On-hold'].includes(t.status));

  if (loading) return <div className="loader">Loading project details...</div>;
  if (!project) return <div className="not-found">Project not found.</div>;

  return (
    <div className="project-logs">
      <h3><FaBookOpen /> Project Logs</h3>
      <div className="form-actions">
        <input
          type="text"
          placeholder="Describe progress, blockers, or decisions..."
          value={newLogEntry}
          onChange={(e) => setNewLogEntry(e.target.value)}
        />
        <button onClick={handleAddLog}><FaPlus /> Add Log</button>
      </div>
      {logs.length === 0 ? (
        <p style={{ fontStyle: 'italic' }}>No project logs yet. Use the form above to add one.</p>
      ) : (
        <ul className="logs-list">
          {logs.map(log => (
            <li key={log.id} className="log-entry">
              {editingLogId === log.id ? (
                <>
                  <textarea
                    value={editingLogValue}
                    onChange={(e) => setEditingLogValue(e.target.value)}
                    className="log-edit-textarea"
                    rows="3"
                  />
                  <div className="log-actions">
                    <button onClick={handleSaveLog}><FaSave /> Save</button>
                    <button onClick={handleCancelLogEdit}><FaTimes /> Cancel</button>
                  </div>
                </>
              ) : (
                <div className="log-view">
                  <span>{log.entry}</span>
                  <div className="task-actions">
                    <button onClick={() => handleEditLog(log)}><FaEdit /></button>
                    <button onClick={() => handleDeleteLog(log.id)}><FaTrash /></button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ProjectDetails;
