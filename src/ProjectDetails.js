// ProjectDetails.js - Edit and delete task support added

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
  const [showEditProjectModal, setShowEditProjectModal] = useState(false);
  const [newTask, setNewTask] = useState({ description: '', status: 'Not Started', due_date: '', notes: '' });
  const [editTaskId, setEditTaskId] = useState(null);
  const [editTaskForm, setEditTaskForm] = useState({ description: '', status: '', due_date: '', notes: '' });
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [newLogEntry, setNewLogEntry] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);

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

  const activeTasks = tasks.filter(t => !['Completed', 'Cancelled/On-hold'].includes(t.status));
  const completedTasks = tasks.filter(t => ['Completed', 'Cancelled/On-hold'].includes(t.status));


  export default ProjectDetails;
