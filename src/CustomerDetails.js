import React, { useState, useEffect } from 'react';
import { 
  Home, Users, Edit, Plus, Briefcase, Trash, Save, X,
  Building, Globe, Calendar, TrendingUp, CheckCircle,
  Clock, AlertTriangle, Mail, Phone, DollarSign, ListTodo,
  ArrowLeft, Filter, ArrowUpDown, Search
} from 'lucide-react';

// Mock data for demonstration
const mockCustomer = {
  id: 1,
  customer_name: "TechCorp Solutions",
  account_manager: "Sarah Johnson",
  country: "Singapore",
  company_size: "Large (201-1000)",
  year_first_closed: 2021,
  key_stakeholders: [
    {
      name: "Michael Chen",
      role: "CTO",
      email: "michael.chen@techcorp.com",
      phone: "+65 9123 4567"
    },
    {
      name: "Lisa Wang",
      role: "Project Manager",
      email: "lisa.wang@techcorp.com",
      phone: "+65 9234 5678"
    },
    {
      name: "David Kim",
      role: "VP Engineering",
      email: "david.kim@techcorp.com",
      phone: "+65 9345 6789"
    }
  ]
};

const mockProjects = [
  {
    id: 1,
    project_name: "Digital Transformation Initiative",
    account_manager: "Sarah Johnson",
    sales_stage: "Contracting",
    product: "Marketplace",
    deal_value: 750000,
    due_date: "2024-12-15",
    scope: "Complete digital transformation of legacy systems with modern cloud-based solutions."
  },
  {
    id: 2,
    project_name: "Smart City Infrastructure",
    account_manager: "Sarah Johnson",
    sales_stage: "Demo",
    product: "O-City",
    deal_value: 1200000,
    due_date: "2024-11-30",
    scope: "Implementation of smart city solutions for traffic management and public services."
  },
  {
    id: 3,
    project_name: "Payment Processing Upgrade",
    account_manager: "Sarah Johnson",
    sales_stage: "Closed-Won",
    product: "Processing",
    deal_value: 450000,
    due_date: "2024-10-01",
    scope: "Upgrade existing payment processing systems to handle increased transaction volume."
  }
];

const mockTasks = [
  {
    id: 1,
    description: "Prepare technical proposal for Digital Transformation",
    status: "In Progress",
    due_date: "2024-09-15",
    projects: { project_name: "Digital Transformation Initiative" }
  },
  {
    id: 2,
    description: "Schedule demo session with stakeholders",
    status: "Not Started",
    due_date: "2024-09-10",
    projects: { project_name: "Smart City Infrastructure" }
  },
  {
    id: 3,
    description: "Follow up on contract signing",
    status: "Completed",
    due_date: "2024-09-05",
    projects: { project_name: "Digital Transformation Initiative" }
  },
  {
    id: 4,
    description: "Conduct security assessment",
    status: "Not Started",
    due_date: "2024-09-20",
    projects: { project_name: "Smart City Infrastructure" }
  }
];

// Utility functions
const formatDate = (dateString) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const formatCurrency = (value) => {
  if (!value) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(parseFloat(value));
};

const getTaskDueStatus = (dueDate, status) => {
  if (!dueDate || ['Completed', 'Cancelled/On-hold'].includes(status)) return null;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  
  const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return 'overdue';
  if (diffDays === 0) return 'today';
  if (diffDays <= 3) return 'upcoming';
  return null;
};

function CustomerDetails() {
  const [customer] = useState(mockCustomer);
  const [projects] = useState(mockProjects);
  const [tasks] = useState(mockTasks);
  const [activeTab, setActiveTab] = useState('active');
  const [taskFilter, setTaskFilter] = useState('active');
  const [isEditing, setIsEditing] = useState(false);

  // Project filtering
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

  // Task filtering
  const getFilteredTasks = () => {
    if (taskFilter === 'all') {
      return tasks;
    }
    return tasks.filter(task => !['Completed', 'Cancelled/On-hold'].includes(task.status));
  };

  // Stats calculations
  const getActiveProjectsCount = () => {
    return projects.filter(p => !p.sales_stage?.toLowerCase().startsWith('closed')).length;
  };

  const getClosedProjectsCount = () => {
    return projects.filter(p => p.sales_stage?.toLowerCase().startsWith('closed')).length;
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

  const getTaskStatusClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'status-completed';
      case 'in progress': return 'status-in-progress';
      case 'not started': return 'status-not-started';
      case 'cancelled/on-hold': return 'status-cancelled';
      default: return 'status-not-started';
    }
  };

  const getTaskStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return <CheckCircle />;
      case 'in progress': return <Clock />;
      case 'cancelled/on-hold': return <AlertTriangle />;
      default: return <Clock />;
    }
  };

  const filteredProjects = getFilteredProjects();
  const filteredTasks = getFilteredTasks();
  const pendingTasksCount = getActiveTasksCount();
  const overdueTasksCount = getOverdueTasksCount();

  return (
    <div className="page-wrapper">
      <div className="page-content">
        {/* Navigation */}
        <button className="nav-btn">
          <ArrowLeft />
          Back to Dashboard
        </button>

        {/* Customer Header */}
        <div className="customer-header">
          <div className="customer-title-section">
            <h1 className="customer-title">
              {customer.customer_name}
            </h1>
            <div className="customer-subtitle">
              <span className="location-badge">
                <Globe />
                {customer.country || 'Location Not Set'}
              </span>
            </div>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="overview-grid">
          <div className="overview-card primary">
            <div className="card-content">
              <div className="card-value">{getActiveProjectsCount()}</div>
              <div className="card-label">Active Projects</div>
              <div className="card-trend">
                <TrendingUp />
                {getClosedProjectsCount()} completed
              </div>
            </div>
          </div>

          <div className="overview-card success">
            <div className="card-content">
              <div className="card-value">{pendingTasksCount}</div>
              <div className="card-label">Pending Tasks</div>
              <div className="card-trend">
                <Calendar />
                {tasks.filter(t => getTaskDueStatus(t.due_date, t.status) === 'today').length} due today
              </div>
            </div>
          </div>

          <div className={`overview-card ${overdueTasksCount > 0 ? 'urgent' : 'normal'}`}>
            <div className="card-content">
              <div className="card-value">{overdueTasksCount}</div>
              <div className="card-label">Overdue Items</div>
              <div className="card-trend">
                {overdueTasksCount > 0 ? (
                  <>
                    <AlertTriangle />
                    Needs attention
                  </>
                ) : (
                  <>
                    <CheckCircle />
                    All current
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="main-content">
          {/* Left Column */}
          <div className="left-column">
            {/* Customer Information */}
            <div className="section-card">
              <div className="section-header">
                <div className="section-title">
                  <Building className="section-icon" />
                  <h3>Customer Information</h3>
                </div>
                <div className="section-actions">
                  <button 
                    onClick={() => setIsEditing(!isEditing)} 
                    className="btn-primary"
                  >
                    <Edit />
                    {isEditing ? 'Cancel' : 'Edit'}
                  </button>
                </div>
              </div>

              <div className="section-content">
                <div className="customer-info-grid">
                  <div className="info-item">
                    <label className="info-label">
                      <Building />
                      Customer Name
                    </label>
                    <div className="info-value">{customer.customer_name}</div>
                  </div>

                  <div className="info-item">
                    <label className="info-label">
                      <Users />
                      Account Manager
                    </label>
                    <div className="info-value">{customer.account_manager || 'Not assigned'}</div>
                  </div>

                  <div className="info-item">
                    <label className="info-label">
                      <Globe />
                      Country
                    </label>
                    <div className="info-value">{customer.country || 'Not specified'}</div>
                  </div>

                  <div className="info-item">
                    <label className="info-label">
                      <Users />
                      Company Size
                    </label>
                    <div className="info-value">{customer.company_size || 'Not specified'}</div>
                  </div>

                  <div className="info-item">
                    <label className="info-label">
                      <Calendar />
                      Customer Since
                    </label>
                    <div className="info-value">{customer.year_first_closed || 'Not specified'}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Key Stakeholders */}
            <div className="section-card">
              <div className="section-header">
                <div className="section-title">
                  <Users className="section-icon" />
                  <h3>Key Stakeholders</h3>
                  <span className="stakeholder-counter">
                    {customer.key_stakeholders?.length || 0}
                  </span>
                </div>
                <div className="section-actions">
                  <button className="btn-primary">
                    <Plus />
                    Add Contact
                  </button>
                </div>
              </div>
              <div className="section-content">
                <div className="stakeholder-grid">
                  {customer.key_stakeholders && customer.key_stakeholders.length > 0 ? (
                    customer.key_stakeholders.map((stakeholder, index) => (
                      <div key={index} className="stakeholder-card">
                        <div className="stakeholder-header">
                          <div className="stakeholder-avatar">
                            <Users />
                          </div>
                          <div className="stakeholder-actions">
                            <button 
                              className="stakeholder-action-btn edit"
                              title="Edit stakeholder"
                            >
                              <Edit />
                            </button>
                            <button 
                              className="stakeholder-action-btn delete"
                              title="Remove stakeholder"
                            >
                              <Trash />
                            </button>
                          </div>
                        </div>
                        <div className="stakeholder-content">
                          <div className="stakeholder-name">{stakeholder.name}</div>
                          <div className="stakeholder-role">{stakeholder.role || 'Contact'}</div>
                          {stakeholder.email && (
                            <div className="stakeholder-contact">
                              <Mail />
                              <a href={`mailto:${stakeholder.email}`} className="stakeholder-email">
                                {stakeholder.email}
                              </a>
                            </div>
                          )}
                          {stakeholder.phone && (
                            <div className="stakeholder-contact">
                              <Phone />
                              <a href={`tel:${stakeholder.phone}`} className="stakeholder-phone">
                                {stakeholder.phone}
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="empty-state">
                      <div className="empty-icon">
                        <Users />
                      </div>
                      <h4>No stakeholders added</h4>
                      <p>Add key contacts to manage relationships effectively</p>
                      <button className="btn-primary">
                        <Plus />
                        Add First Contact
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Projects Section */}
            <div className="section-card">
              <div className="section-header">
                <div className="section-title">
                  <Briefcase className="section-icon" />
                  <h3>Projects Portfolio</h3>
                </div>
                <div className="section-actions">
                  <button className="btn-primary">
                    <Plus />
                    Add Project
                  </button>
                </div>
              </div>

              <div className="projects-tabs">
                <button 
                  className={`tab-button ${activeTab === 'active' ? 'active' : ''}`}
                  onClick={() => setActiveTab('active')}
                >
                  <TrendingUp />
                  Active Projects ({getActiveProjectsCount()})
                </button>
                <button 
                  className={`tab-button ${activeTab === 'closed' ? 'active' : ''}`}
                  onClick={() => setActiveTab('closed')}
                >
                  <CheckCircle />
                  Closed Projects ({getClosedProjectsCount()})
                </button>
                <button 
                  className={`tab-button ${activeTab === 'all' ? 'active' : ''}`}
                  onClick={() => setActiveTab('all')}
                >
                  <Briefcase />
                  All Projects ({projects.length})
                </button>
              </div>

              <div className="section-content">
                {filteredProjects.length > 0 ? (
                  <div className="project-list">
                    {filteredProjects.map((project) => (
                      <div key={project.id} className="project-item">
                        <div className="project-header">
                          <button className="project-name">
                            <Briefcase />
                            {project.project_name}
                          </button>
                          <span className={`project-stage stage-${project.sales_stage?.toLowerCase().replace(/[\s-]/g, '-')}`}>
                            {project.sales_stage}
                          </span>
                        </div>
                        <div className="project-details">
                          <div className="project-meta">
                            <span className="project-meta-item">
                              <Calendar />
                              Due: {formatDate(project.due_date)}
                            </span>
                            <span className="project-meta-item">
                              <Users />
                              AM: {project.account_manager || 'Not assigned'}
                            </span>
                          </div>
                          <div className="project-value">
                            <DollarSign />
                            {formatCurrency(project.deal_value)}
                          </div>
                        </div>
                        {project.scope && (
                          <div className="project-scope">
                            {project.scope}
                          </div>
                        )}
                        <div className="project-actions">
                          <button 
                            className="project-action-btn edit"
                            title="Edit project"
                          >
                            <Edit />
                          </button>
                          <button 
                            className="project-action-btn delete"
                            title="Delete project"
                          >
                            <Trash />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <div className="empty-icon">
                      <Briefcase />
                    </div>
                    <h4>No projects found</h4>
                    <p>Start by creating your first project for this customer</p>
                    <button className="btn-primary">
                      <Plus />
                      Add First Project
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="right-column">
            {/* Task Summary Analytics */}
            <div className="section-card">
              <div className="section-header">
                <div className="section-title">
                  <TrendingUp className="section-icon" />
                  <h3>Task Overview</h3>
                </div>
              </div>
              <div className="section-content">
                <div className="task-analytics-grid">
                  <div className="analytics-item">
                    <div className="analytics-icon completed">
                      <CheckCircle />
                    </div>
                    <div className="analytics-content">
                      <div className="analytics-value">{tasks.filter(t => t.status === 'Completed').length}</div>
                      <div className="analytics-label">Completed</div>
                    </div>
                  </div>
                  
                  <div className="analytics-item">
                    <div className="analytics-icon active">
                      <Clock />
                    </div>
                    <div className="analytics-content">
                      <div className="analytics-value">{getActiveTasksCount()}</div>
                      <div className="analytics-label">Active</div>
                    </div>
                  </div>
                  
                  <div className="analytics-item">
                    <div className="analytics-icon overdue">
                      <AlertTriangle />
                    </div>
                    <div className="analytics-content">
                      <div className="analytics-value">{overdueTasksCount}</div>
                      <div className="analytics-label">Overdue</div>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                {tasks.length > 0 && (
                  <div className="progress-section">
                    <div className="progress-header">
                      <span className="progress-label">Overall Progress</span>
                      <span className="progress-percentage">
                        {Math.round((tasks.filter(t => t.status === 'Completed').length / tasks.length) * 100)}%
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ 
                          width: `${Math.round((tasks.filter(t => t.status === 'Completed').length / tasks.length) * 100)}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Active Tasks */}
            <div className="section-card">
              <div className="section-header">
                <div className="section-title">
                  <ListTodo className="section-icon" />
                  <h3>Active Tasks</h3>
                </div>
                <div className="filter-toggle">
                  <button 
                    className={taskFilter === 'active' ? 'active' : ''}
                    onClick={() => setTaskFilter('active')}
                  >
                    Active
                  </button>
                  <button 
                    className={taskFilter === 'all' ? 'active' : ''}
                    onClick={() => setTaskFilter('all')}
                  >
                    All
                  </button>
                </div>
              </div>
              <div className="section-content">
                {filteredTasks.length > 0 ? (
                  <div className="task-list compact">
                    {filteredTasks.slice(0, 8).map((task) => (
                      <div key={task.id} className="task-item compact">
                        <div className="task-main-content">
                          <div className="task-header">
                            <input 
                              type="checkbox" 
                              className="task-checkbox"
                              checked={task.status === 'Completed'}
                              onChange={() => {}}
                            />
                            <div className="task-title">{task.description}</div>
                            <div className="task-status-badge">
                              {getTaskStatusIcon(task.status)}
                              <span className={getTaskStatusClass(task.status)}>
                                {task.status}
                              </span>
                            </div>
                          </div>
                          <div className="task-meta">
                            <span className="task-project">
                              <Briefcase />
                              {task.projects?.project_name || 'Unknown Project'}
                            </span>
                            {task.due_date && (
                              <span className={`task-due due-${getTaskDueStatus(task.due_date, task.status) || 'normal'}`}>
                                <Calendar />
                                Due {formatDate(task.due_date)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="task-actions">
                          <button 
                            className="task-action-btn edit"
                            title="Edit task"
                          >
                            <Edit />
                          </button>
                          <button 
                            className="task-action-btn delete"
                            title="Delete task"
                          >
                            <Trash />
                          </button>
                        </div>
                      </div>
                    ))}
                    {filteredTasks.length > 8 && (
                      <div className="task-view-more">
                        <button className="btn-secondary compact">
                          View All {filteredTasks.length} Tasks
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="empty-state compact">
                    <div className="empty-icon">
                      <ListTodo />
                    </div>
                    <h4>No {taskFilter === 'active' ? 'active ' : ''}tasks</h4>
                    <p>Tasks are managed from individual project pages</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CustomerDetails;
