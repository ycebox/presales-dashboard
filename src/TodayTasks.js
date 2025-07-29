import React, { useState, useEffect } from "react";
import { supabase } from './supabaseClient';
import { 
  FaCalendarDay, 
  FaExclamationTriangle, 
  FaTasks, 
  FaClock, 
  FaPlay, 
  FaCheckCircle,
  FaArrowRight,
  FaUser,
  FaBuilding
} from "react-icons/fa";
import './TodayTasks.css';

export default function TodayTasks() {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const today = new Date().toISOString().split("T")[0];
      console.log("Fetching tasks for today and before:", today);

      // Get both project tasks and personal tasks for today and overdue
      const [projectTasksData, personalTasksData] = await Promise.all([
        supabase
          .from("project_tasks")
          .select("id, description, status, due_date, project_id, projects(customer_name)")
          .lte("due_date", today)
          .eq("is_archived", false)
          .order("due_date", { ascending: true }),
        supabase
          .from("personal_tasks")
          .select("id, description, status, due_date, priority")
          .lte("due_date", today)
          .eq("is_archived", false)
          .order("due_date", { ascending: true })
      ]);

      console.log("Project tasks raw data:", projectTasksData);
      console.log("Personal tasks raw data:", personalTasksData);

      let allTasks = [];

      // Add project tasks (no priority field)
      if (projectTasksData.data && projectTasksData.data.length > 0) {
        const projectTasks = projectTasksData.data
          .filter(task => !["Done", "Completed", "Cancelled/On-hold"].includes(task.status))
          .map(task => ({
            ...task,
            task_type: 'project',
            priority: 'Medium', // Default priority for project tasks
            customer_name: task.projects?.customer_name || `Project ${task.project_id}`
          }));
        allTasks = [...allTasks, ...projectTasks];
        console.log("Processed project tasks:", projectTasks);
      }

      // Add personal tasks (has priority field)
      if (personalTasksData.data && personalTasksData.data.length > 0) {
        const personalTasks = personalTasksData.data
          .filter(task => !["Done", "Completed", "Cancelled/On-hold"].includes(task.status))
          .map(task => ({
            ...task,
            task_type: 'personal',
            customer_name: 'Personal Task',
            project_id: null
          }));
        allTasks = [...allTasks, ...personalTasks];
        console.log("Processed personal tasks:", personalTasks);
      }

      console.log("All tasks before sorting:", allTasks);

      // Sort tasks: overdue first, then by priority, then by due date
      allTasks.sort((a, b) => {
        const aOverdue = a.due_date < today;
        const bOverdue = b.due_date < today;
        
        // Overdue tasks first
        if (aOverdue && !bOverdue) return -1;
        if (!aOverdue && bOverdue) return 1;
        
        // Then by priority
        const priorityOrder = { 'High': 3, 'Medium': 2, 'Low': 1 };
        const aPriority = priorityOrder[a.priority] || 2; // Default to Medium
        const bPriority = priorityOrder[b.priority] || 2; // Default to Medium
        if (aPriority !== bPriority) return bPriority - aPriority;
        
        // Finally by due date
        return a.due_date.localeCompare(b.due_date);
      });

      console.log("Final sorted tasks:", allTasks);
      setTasks(allTasks);

      if (projectTasksData.error) {
        console.error("Error loading project tasks:", projectTasksData.error);
        setError("Failed to load project tasks");
      }
      if (personalTasksData.error) {
        console.error("Error loading personal tasks:", personalTasksData.error);
        setError("Failed to load personal tasks");
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
      setError("Failed to load tasks");
    } finally {
      setIsLoading(false);
    }
  };

  const today = new Date().toISOString().split("T")[0];
  const isOverdue = (due) => due && due < today;
  const isToday = (due) => due === today;

  const overdueTasks = tasks.filter(t => isOverdue(t.due_date));
  const todayTasks = tasks.filter(t => isToday(t.due_date));

  const scrollToProject = (projectId, taskType) => {
    if (taskType === 'personal' || !projectId) {
      return;
    }
    const el = document.getElementById(`project-${projectId}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "In Progress": return <FaPlay className="status-icon in-progress" />;
      case "Open": return <FaClock className="status-icon open" />;
      case "Done": 
      case "Completed": return <FaCheckCircle className="status-icon completed" />;
      default: return <FaTasks className="status-icon default" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case "high": return "priority-high";
      case "medium": return "priority-medium";
      case "low": return "priority-low";
      default: return "priority-default";
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <div className="today-tasks-container">
      <div className="tasks-header">
        <div className="header-content">
          <div className="title-skeleton"></div>
          <div className="subtitle-skeleton"></div>
        </div>
      </div>
      <div className="tasks-list">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="task-item loading">
            <div className="task-content">
              <div className="loading-main">
                <div className="loading-icon"></div>
                <div className="loading-text"></div>
              </div>
              <div className="loading-details">
                <div className="loading-project"></div>
                <div className="loading-date"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Error state component
  const ErrorState = () => (
    <div className="today-tasks-container">
      <div className="tasks-header">
        <h2 className="tasks-title" id="tasks-heading">Today's Tasks</h2>
        <div className="error-message" role="alert">
          <FaExclamationTriangle className="error-icon" />
          <span>{error}</span>
        </div>
      </div>
      <div className="retry-section">
        <button 
          onClick={fetchTasks} 
          className="retry-button"
          aria-label="Retry loading tasks"
        >
          Try Again
        </button>
      </div>
    </div>
  );

  // Empty state component
  const EmptyState = () => (
    <div className="empty-state">
      <div className="empty-icon-wrapper">
        <FaCheckCircle className="empty-icon" aria-hidden="true" />
      </div>
      <h3 className="empty-title">All clear!</h3>
      <p className="empty-description">
        No urgent tasks for today. Great job staying on top of things!
      </p>
    </div>
  );

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return <ErrorState />;
  }

  return (
    <div className="today-tasks-container">
      {/* Clean Header */}
      <header className="tasks-header">
        <div className="header-content">
          <h2 className="tasks-title" id="tasks-heading">Today's Tasks</h2>
          <div className="task-summary" role="status" aria-live="polite">
            {overdueTasks.length > 0 && (
              <span className="summary-item overdue">
                <FaExclamationTriangle className="summary-icon" aria-hidden="true" />
                <span className="summary-text">
                  {overdueTasks.length} overdue
                </span>
              </span>
            )}
            {todayTasks.length > 0 && (
              <span className="summary-item today">
                <FaCalendarDay className="summary-icon" aria-hidden="true" />
                <span className="summary-text">
                  {todayTasks.length} due today
                </span>
              </span>
            )}
            {tasks.length === 0 && (
              <span className="summary-item clear">
                <span className="summary-text">All caught up! 🎉</span>
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Tasks List */}
      {tasks.length > 0 ? (
        <div className="tasks-list" role="region" aria-labelledby="tasks-heading">
          {/* Overdue Section */}
          {overdueTasks.length > 0 && (
            <section className="task-section">
              <div className="section-header overdue">
                <FaExclamationTriangle className="section-icon" aria-hidden="true" />
                <h3 className="section-title">Overdue ({overdueTasks.length})</h3>
              </div>
              {overdueTasks.map((task) => (
                <div
                  key={`overdue-${task.task_type}-${task.id}`}
                  className="task-item overdue"
                  onClick={() => scrollToProject(task.project_id, task.task_type)}
                  role="button"
                  tabIndex="0"
                  aria-label={`Overdue task: ${task.description}. ${task.task_type === 'project' ? 'Click to view project' : ''}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      scrollToProject(task.project_id, task.task_type);
                    }
                  }}
                >
                  <div className="task-content">
                    <div className="task-main">
                      <div className="task-status">
                        {getStatusIcon(task.status)}
                        <span className="task-description">{task.description}</span>
                      </div>
                      <div className="task-meta">
                        <span className={`priority-badge ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                      </div>
                    </div>
                    <div className="task-details">
                      <div className="task-project">
                        {task.task_type === 'personal' ? (
                          <>
                            <FaUser className="project-icon" aria-hidden="true" />
                            <span>Personal</span>
                          </>
                        ) : (
                          <>
                            <FaBuilding className="project-icon" aria-hidden="true" />
                            <span>{task.customer_name}</span>
                          </>
                        )}
                      </div>
                      <div className="task-due overdue">
                        Due {formatDate(task.due_date)}
                      </div>
                    </div>
                  </div>
                  {task.task_type === 'project' && (
                    <div className="task-action" aria-hidden="true">
                      <FaArrowRight className="action-icon" />
                    </div>
                  )}
                </div>
              ))}
            </section>
          )}

          {/* Today Section */}
          {todayTasks.length > 0 && (
            <section className="task-section">
              <div className="section-header today">
                <FaCalendarDay className="section-icon" aria-hidden="true" />
                <h3 className="section-title">Due Today ({todayTasks.length})</h3>
              </div>
              {todayTasks.map((task) => (
                <div
                  key={`today-${task.task_type}-${task.id}`}
                  className="task-item today"
                  onClick={() => scrollToProject(task.project_id, task.task_type)}
                  role="button"
                  tabIndex="0"
                  aria-label={`Task due today: ${task.description}. ${task.task_type === 'project' ? 'Click to view project' : ''}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      scrollToProject(task.project_id, task.task_type);
                    }
                  }}
                >
                  <div className="task-content">
                    <div className="task-main">
                      <div className="task-status">
                        {getStatusIcon(task.status)}
                        <span className="task-description">{task.description}</span>
                      </div>
                      <div className="task-meta">
                        <span className={`priority-badge ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                      </div>
                    </div>
                    <div className="task-details">
                      <div className="task-project">
                        {task.task_type === 'personal' ? (
                          <>
                            <FaUser className="project-icon" aria-hidden="true" />
                            <span>Personal</span>
                          </>
                        ) : (
                          <>
                            <FaBuilding className="project-icon" aria-hidden="true" />
                            <span>{task.customer_name}</span>
                          </>
                        )}
                      </div>
                      <div className="task-due today">
                        Due today
                      </div>
                    </div>
                  </div>
                  {task.task_type === 'project' && (
                    <div className="task-action" aria-hidden="true">
                      <FaArrowRight className="action-icon" />
                    </div>
                  )}
                </div>
              ))}
            </section>
          )}
        </div>
      ) : (
        <EmptyState />
      )}
    </div>
  );
}
