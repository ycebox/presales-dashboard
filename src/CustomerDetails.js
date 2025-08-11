// CustomerDetails.js - Modern Minimalist Version
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import './CustomerDetails.css';
import {
  ArrowLeft, Edit3, Save, X, Plus, Building2, Users, MapPin, 
  Calendar, DollarSign, Briefcase, CheckCircle, Clock, AlertTriangle,
  Mail, Phone, Trash2, MoreHorizontal, TrendingUp, Target
} from 'lucide-react';

function CustomerDetails() {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Modal states
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showStakeholderModal, setShowStakeholderModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingStakeholder, setEditingStakeholder] = useState(null);
  const [editingStakeholderIndex, setEditingStakeholderIndex] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [editingProject, setEditingProject] = useState(null);
  
  // Inline editing states
  const [isEditing, setIsEditing] = useState(false);
  const [editCustomer, setEditCustomer] = useState({});
  const [saving, setSaving] = useState(false);
  
  // Filter states
  const [activeTab, setActiveTab] = useState('active');
  const [taskFilter, setTaskFilter] = useState('active');

  useEffect(() => {
    if (customerId) {
      fetchCustomerDetails();
    }
  }, [customerId]);

  useEffect(() => {
    if (customer?.customer_name) {
      fetchCustomerProjects();
      fetchCustomerTasks();
    }
  }, [customer]);

  const fetchCustomerDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();

      if (error) throw error;
      
      if (!data) {
        setError('Customer not found');
        return;
      }
      
      setCustomer(data);
      setEditCustomer(data);
    } catch (error) {
      console.error('Error fetching customer:', error);
      setError('Failed to load customer details: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerProjects = async () => {
    if (!customer?.customer_name) return;
    
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('customer_name', customer.customer_name)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching projects:', error);
        setProjects([]);
      } else {
        setProjects(data || []);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      setProjects([]);
    }
  };

  const fetchCustomerTasks = async () => {
    if (!customer?.customer_name) return;
    
    try {
      const { data: customerProjects, error: projectsError } = await supabase
        .from('projects')
        .select('id')
        .eq('customer_name', customer.customer_name);

      if (projectsError) {
        console.error('Error fetching customer projects for tasks:', projectsError);
        setTasks([]);
        return;
      }

      if (!customerProjects || customerProjects.length === 0) {
        setTasks([]);
        return;
      }

      const projectIds = customerProjects.map(p => p.id);

      const { data: customerTasks, error: tasksError } = await supabase
        .from('project_tasks')
        .select(`
          *,
          projects!inner(project_name, customer_name)
        `)
        .in('project_id', projectIds)
        .order('created_at', { ascending: false });

      if (tasksError) {
        console.error('Error fetching tasks:', tasksError);
        setTasks([]);
      } else {
        setTasks(customerTasks || []);
      }
    } catch (error) {
      console.error('Error fetching customer tasks:', error);
      setTasks([]);
    }
  };

  // Inline editing handlers
  const handleEditToggle = () => {
    if (isEditing) {
      setEditCustomer(customer);
      setIsEditing(false);
    } else {
      setIsEditing(true);
    }
  };

  const handleEditChange = (e) => {
    const { name, value, type } = e.target;
    
    if (name === 'key_stakeholders' || name === 'competitors') {
      const arrayValue = value.split(',').map(item => item.trim()).filter(item => item);
      setEditCustomer(prev => ({ ...prev, [name]: arrayValue }));
    } else if (type === 'number') {
      setEditCustomer(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    } else {
      setEditCustomer(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSaveCustomer = async () => {
    if (!customer?.id) {
      alert('Customer ID is required');
      return;
    }

    try {
      setSaving(true);
      
      const { data, error } = await supabase
        .from('customers')
        .update(editCustomer)
        .eq('id', customer.id)
        .select();
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        setCustomer(data[0]);
        setEditCustomer(data[0]);
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error updating customer:', error);
      alert('Error updating customer: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // Stakeholder handlers
  const handleAddStakeholder = () => {
    setEditingStakeholder(null);
    setEditingStakeholderIndex(null);
    setShowStakeholderModal(true);
  };

  const handleEditStakeholder = (stakeholder, index) => {
    setEditingStakeholder(stakeholder);
    setEditingStakeholderIndex(index);
    setShowStakeholderModal(true);
  };

  const handleStakeholderSaved = async (stakeholderInfo, editingIndex = null) => {
    try {
      const currentStakeholders = customer.key_stakeholders || [];
      let updatedStakeholders;

      if (editingIndex !== null) {
        updatedStakeholders = [...currentStakeholders];
        updatedStakeholders[editingIndex] = stakeholderInfo;
      } else {
        updatedStakeholders = [...currentStakeholders, stakeholderInfo];
      }
      
      const { data, error } = await supabase
        .from('customers')
        .update({ key_stakeholders: updatedStakeholders })
        .eq('id', customer.id)
        .select();
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        setCustomer(data[0]);
        setEditCustomer(data[0]);
      }
    } catch (error) {
      console.error('Error saving stakeholder:', error);
      alert('Error saving stakeholder: ' + error.message);
    }
  };

  const handleDeleteStakeholder = async (stakeholderIndex) => {
    if (!window.confirm('Are you sure you want to remove this stakeholder?')) return;
    
    try {
      const currentStakeholders = customer.key_stakeholders || [];
      const updatedStakeholders = currentStakeholders.filter((_, index) => index !== stakeholderIndex);
      
      const { data, error } = await supabase
        .from('customers')
        .update({ key_stakeholders: updatedStakeholders })
        .eq('id', customer.id)
        .select();
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        setCustomer(data[0]);
        setEditCustomer(data[0]);
      }
    } catch (error) {
      console.error('Error removing stakeholder:', error);
      alert('Error removing stakeholder: ' + error.message);
    }
  };

  // Project handlers
  const handleAddProject = () => {
    if (!customer?.customer_name) {
      alert('Customer information not loaded. Please refresh the page.');
      return;
    }
    setEditingProject(null);
    setShowProjectModal(true);
  };

  const handleEditProject = (project) => {
    setEditingProject(project);
    setShowProjectModal(true);
  };

  const handleProjectSaved = (projectData, isEdit = false) => {
    if (isEdit) {
      setProjects(prev => prev.map(p => 
        p.id === projectData.id ? projectData : p
      ));
    } else {
      setProjects(prev => [projectData, ...prev]);
    }
    setEditingProject(null);
  };

  const handleProjectClick = (projectId, projectName) => {
    if (projectId) {
      navigate(`/project/${projectId}`);
    } else {
      console.log('No project ID found for:', projectName);
      alert('Project details page is not yet available.');
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (!window.confirm('Are you sure you want to delete this project?')) return;
    
    try {
      const { error } = await supabase.from('projects').delete().eq('id', projectId);
      if (error) throw error;
      
      setProjects(prev => prev.filter(p => p.id !== projectId));
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Error deleting project: ' + error.message);
    }
  };

  // Task handlers
  const handleTaskStatusChange = async (taskId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'Completed' ? 'Not Started' : 'Completed';
      
      const { error } = await supabase
        .from('project_tasks')
        .update({ status: newStatus })
        .eq('id', taskId);

      if (error) throw error;
      
      await fetchCustomerTasks();
    } catch (error) {
      console.error('Error updating task status:', error);
      alert('Error updating task status: ' + error.message);
    }
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setShowTaskModal(true);
  };

  const handleTaskSaved = async (taskData) => {
    try {
      if (editingTask) {
        const { error } = await supabase
          .from('project_tasks')
          .update(taskData)
          .eq('id', editingTask.id);

        if (error) throw error;
      }

      setShowTaskModal(false);
      setEditingTask(null);
      await fetchCustomerTasks();
    } catch (error) {
      console.error('Error saving task:', error);
      alert('Error saving task: ' + error.message);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;

    try {
      const { error } = await supabase
        .from('project_tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
      
      await fetchCustomerTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Error deleting task: ' + error.message);
    }
  };

  // Helper functions
  const parseStakeholder = (stakeholder) => {
    if (typeof stakeholder === 'object' && stakeholder !== null) {
      return stakeholder;
    }
    
    if (typeof stakeholder === 'string') {
      try {
        const parsed = JSON.parse(stakeholder);
        if (typeof parsed === 'object' && parsed !== null) {
          return parsed;
        }
      } catch (e) {
        if (stakeholder.includes(' - ')) {
          const [name, role] = stakeholder.split(' - ');
          return { name, role, email: '', phone: '' };
        } else {
          return { name: stakeholder, role: 'Contact', email: '', phone: '' };
        }
      }
    }
    
    return { name: 'Unknown', role: 'Contact', email: '', phone: '' };
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return '-';
    }
  };

  const formatCurrency = (value) => {
    if (!value) return '-';
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(parseFloat(value));
    } catch (error) {
      return '-';
    }
  };

  const getFilteredProjects = () => {
    switch (activeTab) {
      case 'active':
        return projects.filter(p => !p.sales_stage?.toLowerCase().startsWith('closed'));
      case 'closed':
        return projects.filter(p => p.sales_stage?.toLowerCase().startsWith('closed'));
      case 'all':
      default:
        return projects;
    }
  };

  const getFilteredTasks = () => {
    if (taskFilter === 'all') {
      return tasks;
    }
    return tasks.filter(task => !['Completed', 'Cancelled/On-hold'].includes(task.status));
  };

  const getActiveProjectsCount = () => {
    return projects.filter(p => !p.sales_stage?.toLowerCase().startsWith('closed')).length;
  };

  const getActiveTasksCount = () => {
    return tasks.filter(task => !['Completed', 'Cancelled/On-hold'].includes(task.status)).length;
  };

  const getOverdueTasksCount = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return tasks.filter(task => {
      if (!task.due_date || ['Completed', 'Cancelled/On-hold'].includes(task.status)) return false;
      const dueDate = new Date(task.due_date);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate < today;
    }).length;
  };

  const getHealthScoreColor = (score) => {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-blue-600';
    if (score >= 4) return 'text-yellow-600';
    return 'text-red-600';
  };

  const asiaPacificCountries = [
    "Australia", "Bangladesh", "Brunei", "Cambodia", "China", "Fiji", "India", "Indonesia", 
    "Japan", "Laos", "Malaysia", "Myanmar", "Nepal", "New Zealand", "Pakistan", 
    "Papua New Guinea", "Philippines", "Singapore", "Solomon Islands", "South Korea", 
    "Sri Lanka", "Thailand", "Timor-Leste", "Tonga", "Vanuatu", "Vietnam"
  ].sort();

  const companySizes = [
    'Startup (1-10)', 'Small (11-50)', 'Medium (51-200)', 'Large (201-1000)', 'Enterprise (1000+)'
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mb-4"></div>
          <p className="text-gray-600">Loading customer details...</p>
        </div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-gray-600 mb-6">{error || 'Customer not found'}</p>
          <button onClick={() => navigate('/')} className="btn-primary">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const filteredProjects = getFilteredProjects();
  const filteredTasks = getFilteredTasks();
  const activeProjectsCount = getActiveProjectsCount();
  const activeTasksCount = getActiveTasksCount();
  const overdueTasksCount = getOverdueTasksCount();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button 
            onClick={() => navigate('/')} 
            className="btn-ghost mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {customer.customer_name}
              </h1>
              <div className="flex items-center gap-6 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {customer.country || 'Location not specified'}
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {customer.account_manager || 'No account manager'}
                </div>
                {customer.health_score && (
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    <span className={getHealthScoreColor(customer.health_score)}>
                      Health: {customer.health_score}/10
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {isEditing ? (
                <>
                  <button 
                    onClick={handleSaveCustomer} 
                    className="btn-primary"
                    disabled={saving}
                  >
                    <Save className="h-4 w-4" />
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button 
                    onClick={handleEditToggle} 
                    className="btn-secondary"
                    disabled={saving}
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </button>
                </>
              ) : (
                <button onClick={handleEditToggle} className="btn-secondary">
                  <Edit3 className="h-4 w-4" />
                  Edit
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="stats-card">
            <div className="flex items-center">
              <div className="stats-icon bg-blue-50 text-blue-600">
                <Briefcase className="h-5 w-5" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Projects</p>
                <p className="text-2xl font-bold text-gray-900">{activeProjectsCount}</p>
              </div>
            </div>
          </div>

          <div className="stats-card">
            <div className="flex items-center">
              <div className="stats-icon bg-green-50 text-green-600">
                <CheckCircle className="h-5 w-5" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Tasks</p>
                <p className="text-2xl font-bold text-gray-900">{activeTasksCount}</p>
              </div>
            </div>
          </div>

          <div className="stats-card">
            <div className="flex items-center">
              <div className={`stats-icon ${overdueTasksCount > 0 ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-600'}`}>
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Overdue</p>
                <p className="text-2xl font-bold text-gray-900">{overdueTasksCount}</p>
              </div>
            </div>
          </div>

          <div className="stats-card">
            <div className="flex items-center">
              <div className="stats-icon bg-purple-50 text-purple-600">
                <Target className="h-5 w-5" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Value</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(projects.reduce((sum, p) => sum + (p.deal_value || 0), 0))}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Customer Information */}
          <div className="lg:col-span-2 space-y-8">
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">
                  <Building2 className="h-5 w-5" />
                  Customer Information
                </h3>
              </div>
              
              <div className="card-content">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="form-group">
                    <label className="form-label">Customer Name</label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="customer_name"
                        value={editCustomer.customer_name || ''}
                        onChange={handleEditChange}
                        className="form-input"
                        required
                      />
                    ) : (
                      <p className="form-value">{customer.customer_name}</p>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Account Manager</label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="account_manager"
                        value={editCustomer.account_manager || ''}
                        onChange={handleEditChange}
                        className="form-input"
                        placeholder="Account manager name"
                      />
                    ) : (
                      <p className="form-value">{customer.account_manager || 'Not assigned'}</p>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Country</label>
                    {isEditing ? (
                      <select
                        name="country"
                        value={editCustomer.country || ''}
                        onChange={handleEditChange}
                        className="form-select"
                      >
                        <option value="">Select Country</option>
                        {asiaPacificCountries.map((c, i) => (
                          <option key={i} value={c}>{c}</option>
                        ))}
                      </select>
                    ) : (
                      <p className="form-value">{customer.country || 'Not specified'}</p>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Company Size</label>
                    {isEditing ? (
                      <select
                        name="company_size"
                        value={editCustomer.company_size || ''}
                        onChange={handleEditChange}
                        className="form-select"
                      >
                        <option value="">Select Size</option>
                        {companySizes.map((size, i) => (
                          <option key={i} value={size}>{size}</option>
                        ))}
                      </select>
                    ) : (
                      <p className="form-value">{customer.company_size || 'Not specified'}</p>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Customer Since</label>
                    {isEditing ? (
                      <input
                        type="number"
                        name="year_first_closed"
                        value={editCustomer.year_first_closed || ''}
                        onChange={handleEditChange}
                        className="form-input"
                        min="2000"
                        max={new Date().getFullYear()}
                        placeholder="e.g., 2022"
                      />
                    ) : (
                      <p className="form-value">{customer.year_first_closed || 'Not specified'}</p>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Health Score</label>
                    {isEditing ? (
                      <input
                        type="number"
                        name="health_score"
                        value={editCustomer.health_score || ''}
                        onChange={handleEditChange}
                        className="form-input"
                        min="1"
                        max="10"
                        placeholder="1-10"
                      />
                    ) : (
                      <p className={`form-value ${getHealthScoreColor(customer.health_score)}`}>
                        {customer.health_score ? `${customer.health_score}/10` : 'Not specified'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Projects Section */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">
                  <Briefcase className="h-5 w-5" />
                  Projects
                </h3>
                <button onClick={handleAddProject} className="btn-primary">
                  <Plus className="h-4 w-4" />
                  Add Project
                </button>
              </div>

              <div className="card-content">
                {/* Project Tabs */}
                <div className="tabs">
                  <button 
                    className={`tab ${activeTab === 'active' ? 'active' : ''}`}
                    onClick={() => setActiveTab('active')}
                  >
                    Active ({projects.filter(p => !p.sales_stage?.toLowerCase().startsWith('closed')).length})
                  </button>
                  <button 
                    className={`tab ${activeTab === 'closed' ? 'active' : ''}`}
                    onClick={() => setActiveTab('closed')}
                  >
                    Closed ({projects.filter(p => p.sales_stage?.toLowerCase().startsWith('closed')).length})
                  </button>
                  <button 
                    className={`tab ${activeTab === 'all' ? 'active' : ''}`}
                    onClick={() => setActiveTab('all')}
                  >
                    All ({projects.length})
                  </button>
                </div>

                {/* Projects List */}
                <div className="space-y-4">
                  {filteredProjects.length > 0 ? (
                    filteredProjects.map((project) => (
                      <div key={project.id} className="project-card">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <button
                              onClick={() => handleProjectClick(project.id, project.project_name)}
                              className="project-name"
                            >
                              {project.project_name || 'Unnamed Project'}
                            </button>
                            <div className="project-meta">
                              <span className={`project-stage stage-${project.sales_stage?.toLowerCase().replace(/[\s-]/g, '-')}`}>
                                {project.sales_stage || 'No Stage'}
                              </span>
                              <span className="project-value">
                                {formatCurrency(project.deal_value)}
                              </span>
                              <span className="project-date">
                                Due: {formatDate(project.due_date)}
                              </span>
                            </div>
                            {project.scope && (
                              <p className="project-scope">{project.scope}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => handleEditProject(project)}
                              className="btn-ghost-sm"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteProject(project.id)}
                              className="btn-ghost-sm text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="empty-state">
                      <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h4 className="text-lg font-medium text-gray-900 mb-2">No projects found</h4>
                      <p className="text-gray-600 mb-4">Start by creating your first project for this customer</p>
                      <button onClick={handleAddProject} className="btn-primary">
                        <Plus className="h-4 w-4" />
                        Add First Project
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-8">
            {/* Key Stakeholders */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">
                  <Users className="h-5 w-5" />
                  Key Stakeholders
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {customer.key_stakeholders?.length || 0}
                  </span>
                </h3>
                <button className="btn-secondary" onClick={handleAddStakeholder}>
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              
              <div className="card-content">
                <div className="space-y-3">
                  {customer.key_stakeholders && customer.key_stakeholders.length > 0 ? (
                    customer.key_stakeholders.map((stakeholder, index) => {
                      const parsedStakeholder = parseStakeholder(stakeholder);
                      const { name, role, email, phone } = parsedStakeholder;

                      return (
                        <div key={index} className="stakeholder-card">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center">
                              <div className="stakeholder-avatar">
                                {name?.charAt(0)?.toUpperCase() || 'S'}
                              </div>
                              <div className="ml-3">
                                <p className="text-sm font-medium text-gray-900">{name}</p>
                                <p className="text-xs text-gray-500">{role || 'Contact'}</p>
                                {email && (
                                  <a href={`mailto:${email}`} className="text-xs text-blue-600 hover:text-blue-800">
                                    {email}
                                  </a>
                                )}
                                {phone && (
                                  <a href={`tel:${phone}`} className="text-xs text-blue-600 hover:text-blue-800 block">
                                    {phone}
                                  </a>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button 
                                onClick={() => handleEditStakeholder(parsedStakeholder, index)}
                                className="btn-ghost-sm"
                              >
                                <Edit3 className="h-3 w-3" />
                              </button>
                              <button 
                                onClick={() => handleDeleteStakeholder(index)}
                                className="btn-ghost-sm text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="empty-state-sm">
                      <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 mb-3">No stakeholders added</p>
                      <button onClick={handleAddStakeholder} className="btn-secondary">
                        <Plus className="h-4 w-4" />
                        Add Contact
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Recent Tasks */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">
                  <CheckCircle className="h-5 w-5" />
                  Recent Tasks
                </h3>
                <div className="flex items-center gap-2">
                  <div className="task-filter">
                    <button 
                      className={`filter-btn ${taskFilter === 'active' ? 'active' : ''}`}
                      onClick={() => setTaskFilter('active')}
                    >
                      Active
                    </button>
                    <button 
                      className={`filter-btn ${taskFilter === 'all' ? 'active' : ''}`}
                      onClick={() => setTaskFilter('all')}
                    >
                      All
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="card-content">
                <div className="space-y-3">
                  {filteredTasks.length > 0 ? (
                    filteredTasks.slice(0, 6).map((task) => (
                      <div key={task.id} className="task-card">
                        <div className="flex items-start gap-3">
                          <input 
                            type="checkbox" 
                            className="task-checkbox"
                            checked={task.status === 'Completed'}
                            onChange={() => handleTaskStatusChange(task.id, task.status)}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {task.description}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`task-status ${task.status?.toLowerCase().replace(/[\s\/]/g, '-')}`}>
                                {task.status}
                              </span>
                              <span className="text-xs text-gray-500">
                                {task.projects?.project_name || 'Unknown Project'}
                              </span>
                            </div>
                            {task.due_date && (
                              <p className="text-xs text-gray-500 mt-1">
                                Due: {formatDate(task.due_date)}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <button 
                              onClick={() => handleEditTask(task)}
                              className="btn-ghost-sm"
                            >
                              <Edit3 className="h-3 w-3" />
                            </button>
                            <button 
                              onClick={() => handleDeleteTask(task.id)}
                              className="btn-ghost-sm text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="empty-state-sm">
                      <CheckCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">No {taskFilter === 'active' ? 'active ' : ''}tasks</p>
                      <p className="text-xs text-gray-500">Tasks are managed from project pages</p>
                    </div>
                  )}
                </div>
                
                {filteredTasks.length > 6 && (
                  <div className="mt-4 text-center">
                    <button className="btn-ghost">
                      View all {filteredTasks.length} tasks
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <StakeholderModal
        isOpen={showStakeholderModal}
        onClose={() => {
          setShowStakeholderModal(false);
          setEditingStakeholder(null);
          setEditingStakeholderIndex(null);
        }}
        onSave={handleStakeholderSaved}
        customerName={customer.customer_name}
        editingStakeholder={editingStakeholder}
        editingIndex={editingStakeholderIndex}
      />

      <ProjectModal
        isOpen={showProjectModal}
        onClose={() => {
          setShowProjectModal(false);
          setEditingProject(null);
        }}
        onSave={handleProjectSaved}
        customerName={customer.customer_name}
        editingProject={editingProject}
      />

      <TaskModal
        isOpen={showTaskModal}
        onClose={() => {
          setShowTaskModal(false);
          setEditingTask(null);
        }}
        onSave={handleTaskSaved}
        editingTask={editingTask}
      />
    </div>
  );
}

// Modal Components
function StakeholderModal({ isOpen, onClose, onSave, customerName, editingStakeholder = null, editingIndex = null }) {
  const [newStakeholder, setNewStakeholder] = useState({
    name: '',
    role: '',
    email: '',
    phone: ''
  });

  useEffect(() => {
    if (editingStakeholder) {
      setNewStakeholder({
        name: editingStakeholder.name || '',
        role: editingStakeholder.role || '',
        email: editingStakeholder.email || '',
        phone: editingStakeholder.phone || ''
      });
    } else {
      clearForm();
    }
  }, [editingStakeholder, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNewStakeholder(prev => ({ ...prev, [name]: value }));
  };

  const clearForm = () => {
    setNewStakeholder({
      name: '',
      role: '',
      email: '',
      phone: ''
    });
  };

  const handleClose = () => {
    clearForm();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!newStakeholder.name) {
      alert('Stakeholder name is required');
      return;
    }

    const stakeholderInfo = {
      name: newStakeholder.name,
      role: newStakeholder.role || '',
      email: newStakeholder.email || '',
      phone: newStakeholder.phone || ''
    };

    onSave(stakeholderInfo, editingIndex);
    clearForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{editingStakeholder ? 'Edit Stakeholder' : 'Add New Stakeholder'}</h3>
          <button className="modal-close-btn" onClick={handleClose}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="grid grid-cols-1 gap-4">
            <div className="form-group">
              <label className="form-label">Name *</label>
              <input 
                name="name" 
                value={newStakeholder.name} 
                onChange={handleChange}
                className="form-input"
                placeholder="Enter stakeholder name"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Role/Title</label>
              <input 
                name="role" 
                value={newStakeholder.role} 
                onChange={handleChange}
                className="form-input"
                placeholder="e.g., CTO, Project Manager"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email</label>
              <input 
                name="email" 
                type="email"
                value={newStakeholder.email} 
                onChange={handleChange}
                className="form-input"
                placeholder="email@company.com"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Phone</label>
              <input 
                name="phone" 
                type="tel"
                value={newStakeholder.phone} 
                onChange={handleChange}
                className="form-input"
                placeholder="+65 1234 5678"
              />
            </div>
          </div>
          
          <div className="modal-actions">
            <button type="button" onClick={handleClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              <Save className="h-4 w-4" />
              {editingStakeholder ? 'Update Stakeholder' : 'Add Stakeholder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ProjectModal({ isOpen, onClose, onSave, customerName, editingProject = null }) {
  const [projectData, setProjectData] = useState({
    customer_name: customerName || '',
    project_name: '',
    account_manager: '',
    scope: '',
    deal_value: '',
    product: '',
    backup_presales: '',
    sales_stage: '',
    remarks: '',
    due_date: '',
    project_type: ''
  });

  const products = ['Marketplace', 'O-City', 'Processing', 'SmartVista'].sort();
  const salesStages = [
    'Discovery', 'Demo', 'PoC', 'RFI', 'RFP', 'SoW', 
    'Contracting', 'Closed-Won', 'Closed-Lost', 'Closed-Cancelled/Hold'
  ];
  const projectTypes = ['RFP', 'CR'].sort();

  useEffect(() => {
    if (editingProject) {
      setProjectData({
        customer_name: editingProject.customer_name || customerName || '',
        project_name: editingProject.project_name || '',
        account_manager: editingProject.account_manager || '',
        scope: editingProject.scope || '',
        deal_value: editingProject.deal_value || '',
        product: editingProject.product || '',
        backup_presales: editingProject.backup_presales || '',
        sales_stage: editingProject.sales_stage || '',
        remarks: editingProject.remarks || '',
        due_date: editingProject.due_date || '',
        project_type: editingProject.project_type || ''
      });
    } else if (customerName) {
      setProjectData({
        customer_name: customerName,
        project_name: '',
        account_manager: '',
        scope: '',
        deal_value: '',
        product: '',
        backup_presales: '',
        sales_stage: '',
        remarks: '',
        due_date: '',
        project_type: ''
      });
    }
  }, [customerName, editingProject, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProjectData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!customerName && !projectData.customer_name) {
      alert('Customer name is required');
      return;
    }

    if (!projectData.project_name?.trim()) {
      alert('Project name is required');
      return;
    }

    if (!projectData.sales_stage) {
      alert('Sales stage is required');
      return;
    }

    if (!projectData.product) {
      alert('Product is required');
      return;
    }

    try {
      const submissionData = {
        customer_name: customerName || projectData.customer_name,
        project_name: projectData.project_name.trim(),
        account_manager: projectData.account_manager?.trim() || null,
        scope: projectData.scope?.trim() || null,
        deal_value: projectData.deal_value ? parseFloat(projectData.deal_value) : null,
        product: projectData.product,
        backup_presales: projectData.backup_presales?.trim() || null,
        sales_stage: projectData.sales_stage,
        remarks: projectData.remarks?.trim() || null,
        due_date: projectData.due_date || null,
        project_type: projectData.project_type || null
      };

      let result;
      
      if (editingProject) {
        const { data, error } = await supabase
          .from('projects')
          .update(submissionData)
          .eq('id', editingProject.id)
          .select();
        
        if (error) throw error;
        result = { data, isEdit: true };
      } else {
        submissionData.created_at = new Date().toISOString().split('T')[0];
        
        const { data, error } = await supabase
          .from('projects')
          .insert([submissionData])
          .select();
        
        if (error) throw error;
        result = { data, isEdit: false };
      }
      
      if (result.data && result.data.length > 0) {
        onSave(result.data[0], result.isEdit);
        onClose();
      }
    } catch (error) {
      console.error('Error saving project:', error);
      alert(`Error ${editingProject ? 'updating' : 'adding'} project: ${error.message}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            {editingProject 
              ? `Edit Project: ${editingProject.project_name || 'Unnamed Project'}` 
              : `Add New Project for ${customerName}`
            }
          </h3>
          <button className="modal-close-btn" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-group md:col-span-2">
              <label className="form-label">Project Name *</label>
              <input 
                name="project_name" 
                value={projectData.project_name} 
                onChange={handleChange}
                className="form-input"
                placeholder="Enter project name"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Account Manager</label>
              <input 
                name="account_manager" 
                value={projectData.account_manager} 
                onChange={handleChange}
                className="form-input"
                placeholder="Account manager name"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Sales Stage *</label>
              <select name="sales_stage" value={projectData.sales_stage} onChange={handleChange} className="form-select" required>
                <option value="">Select Stage</option>
                {salesStages.map((stage, i) => (
                  <option key={i} value={stage}>{stage}</option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label className="form-label">Product *</label>
              <select name="product" value={projectData.product} onChange={handleChange} className="form-select" required>
                <option value="">Select Product</option>
                {products.map((product, i) => (
                  <option key={i} value={product}>{product}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Project Type</label>
              <select name="project_type" value={projectData.project_type} onChange={handleChange} className="form-select">
                <option value="">Select Type</option>
                {projectTypes.map((type, i) => (
                  <option key={i} value={type}>{type}</option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label className="form-label">Deal Value</label>
              <input 
                name="deal_value" 
                type="number" 
                step="0.01"
                value={projectData.deal_value} 
                onChange={handleChange}
                className="form-input"
                placeholder="Enter deal value"
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Backup Presales</label>
              <input 
                name="backup_presales" 
                value={projectData.backup_presales} 
                onChange={handleChange}
                className="form-input"
                placeholder="Backup presales contact"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Expected Closing Date</label>
              <input 
                name="due_date" 
                type="date"
                value={projectData.due_date} 
                onChange={handleChange}
                className="form-input"
              />
            </div>
            
            <div className="form-group md:col-span-2">
              <label className="form-label">Scope</label>
              <textarea 
                name="scope" 
                value={projectData.scope} 
                onChange={handleChange}
                rows="3"
                className="form-textarea"
                placeholder="Project scope and objectives"
              />
            </div>
            
            <div className="form-group md:col-span-2">
              <label className="form-label">Remarks</label>
              <textarea 
                name="remarks" 
                value={projectData.remarks} 
                onChange={handleChange}
                rows="3"
                className="form-textarea"
                placeholder="Project remarks or notes"
              />
            </div>
          </div>
          
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              <Save className="h-4 w-4" />
              {editingProject ? 'Update Project' : 'Save Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TaskModal({ isOpen, onClose, onSave, editingTask = null }) {
  const [taskData, setTaskData] = useState({
    description: '',
    status: 'Not Started',
    due_date: '',
    notes: ''
  });

  useEffect(() => {
    if (editingTask) {
      setTaskData({
        description: editingTask.description || '',
        status: editingTask.status || 'Not Started',
        due_date: editingTask.due_date || '',
        notes: editingTask.notes || ''
      });
    } else {
      setTaskData({
        description: '',
        status: 'Not Started',
        due_date: '',
        notes: ''
      });
    }
  }, [editingTask, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setTaskData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!taskData.description.trim()) {
      alert('Task description is required');
      return;
    }
    onSave(taskData);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{editingTask ? 'Edit Task' : 'Add New Task'}</h3>
          <button className="modal-close-btn" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="grid grid-cols-1 gap-4">
            <div className="form-group">
              <label className="form-label">Task Description *</label>
              <input 
                name="description" 
                value={taskData.description} 
                onChange={handleChange}
                className="form-input"
                placeholder="Enter task description"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Status</label>
              <select name="status" value={taskData.status} onChange={handleChange} className="form-select">
                <option value="Not Started">Not Started</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled/On-hold">Cancelled/On-hold</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Due Date</label>
              <input 
                name="due_date" 
                type="date"
                value={taskData.due_date} 
                onChange={handleChange}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea 
                name="notes" 
                value={taskData.notes} 
                onChange={handleChange}
                rows="3"
                className="form-textarea"
                placeholder="Additional notes or details"
              />
            </div>
          </div>
          
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              <Save className="h-4 w-4" />
              {editingTask ? 'Update Task' : 'Add Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CustomerDetails;
