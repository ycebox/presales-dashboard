// ProjectDetails.js - With UI/UX polish: improved hierarchy, badges, buttons, readability, modern project details layout + inline editing with dropdowns

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

        <div className="project-layout">
          <div className="project-left">
            <div className="project-header">
              <h2 className="customer-name highlight-name">{editForm.customer_name}</h2>
              <div className="form-actions">
                {isEditingDetails ? (
                  <>
                    <button onClick={handleSaveProject}><FaSave /> Save</button>
                    <button onClick={handleCancelEdit}><FaTimes /> Cancel</button>
                  </>
                ) : (
                  <span className="edit-link" onClick={() => setIsEditingDetails(true)}><FaEdit /> Edit</span>
                )}
              </div>
            </div>
            <div className="section-card">
              <h3>Project Details</h3>
              <div className="edit-form">
                <label>
                  Country
                  {isEditingDetails ? (
                    <select name="country" value={editForm.country || ''} onChange={handleEditFormChange} className="dropdown">
                      {countryOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  ) : (
                    <input type="text" value={editForm.country || ''} readOnly className="readonly" />
                  )}
                </label>
                <label>
                  Account Manager
                  <input type="text" name="account_manager" value={editForm.account_manager || ''} onChange={handleEditFormChange} readOnly={!isEditingDetails} className={!isEditingDetails ? 'readonly' : ''} />
                </label>
                <label>
                  Sales Stage
                  {isEditingDetails ? (
                    <select name="sales_stage" value={editForm.sales_stage || ''} onChange={handleEditFormChange} className="dropdown">
                      {salesStageOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  ) : (
                    <input type="text" value={editForm.sales_stage || ''} readOnly className="readonly" />
                  )}
                </label>
                <label>
                  Product
                  {isEditingDetails ? (
                    <select name="product" value={editForm.product || ''} onChange={handleEditFormChange} className="dropdown">
                      {productOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  ) : (
                    <input type="text" value={editForm.product || ''} readOnly className="readonly" />
                  )}
                </label>
                <label>
                  Scope
                  <input type="text" name="scope" value={editForm.scope || ''} onChange={handleEditFormChange} readOnly={!isEditingDetails} className={!isEditingDetails ? 'readonly' : ''} />
                </label>
                <label>
                  Deal Value
                  <input type="text" name="deal_value" value={editForm.deal_value || ''} onChange={handleEditFormChange} readOnly={!isEditingDetails} className={!isEditingDetails ? 'readonly' : ''} />
                </label>
                <label>
                  Backup Presales
                  <input type="text" name="backup_presales" value={editForm.backup_presales || ''} onChange={handleEditFormChange} readOnly={!isEditingDetails} className={!isEditingDetails ? 'readonly' : ''} />
                </label>
                <label style={{ gridColumn: '1 / -1' }}>
                  Remarks
                  <textarea name="remarks" rows="3" value={editForm.remarks || ''} onChange={handleEditFormChange} readOnly={!isEditingDetails} className={!isEditingDetails ? 'readonly' : ''} />
                </label>
              </div>
            </div>
          </div>

          <div className="project-middle">
            <div className="project-logs">
              <h3><FaBookOpen /> Project Logs</h3>
              <button onClick={() => setShowLogModal(true)} className="flat-readonly"><FaPlus /> Add Log</button>
              <ul className="logs-list">
                {logs.map(log => (
                  <li key={log.id}>{log.entry}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProjectDetails;
