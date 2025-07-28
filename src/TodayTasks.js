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
  FaFlag,
  FaCalendarAlt,
  FaFireAlt
} from "react-icons/fa";
import { 
  HiOutlineFire, 
  HiOutlineCalendar, 
  HiOutlineClipboardList,
  HiOutlineSparkles,
  HiOutlineLightningBolt
} from "react-icons/hi";

export default function TodayTasks() {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'overdue', 'today'

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];

      // Get both project tasks and personal tasks for today and overdue
      const [projectTasksData, personalTasksData] = await Promise.all([
        supabase
          .from("project_tasks")
          .select("id, description, status, due_date, project_id, priority, projects(customer_name)")
          .lte("due_date", today)
          .eq("is_archived", false)
          .not("status", "in", '("Done","Completed","Cancelled/On-hold")')
          .order("due_date", { ascending: true }),
        supabase
          .from("personal_tasks")
          .select("id, description, status, due_date, priority")
          .lte("due_date", today)
          .eq("is_archived", false)
          .not("status", "in", '("Done","Completed","Cancelled/On-hold")')
          .order("due_date", { ascending: true })
      ]);

      let allTasks = [];

      // Add project tasks
      if (projectTasksData.data) {
        allTasks = [...allTasks, ...projectTasksData.data.map(task => ({
          ...task,
          task_type: 'project',
          customer_name: task.projects?.customer_name || `Project ${task.project_id}`,
          urgency: calculateUrgency(task.due_date, task.priority)
        }))];
      }

      // Add personal tasks
      if (personalTasksData.data) {
        allTasks = [...allTasks, ...personalTasksData.data.map(task => ({
          ...task,
          task_type: 'personal',
          customer_name: 'Personal Task',
          project_id: null,
          urgency: calculateUrgency(task.due_date, task.priority)
        }))];
      }

      // Sort all tasks by urgency (overdue + high priority first)
      allTasks.sort((a, b) => {
        // First by urgency score (higher = more urgent)
        if (a.urgency !== b.urgency) {
          return b.urgency - a.urgency;
        }
        // Then by due date (earlier first)
        return a.due_date.localeCompare(b.due_date);
      });

      setTasks(allTasks);

      if (projectTasksData.error) {
        console.error("Error loading project tasks:", projectTasksData.error);
      }
      if (personalTasksData.error) {
        console.error("Error loading personal tasks:", personalTasksData.error);
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateUrgency = (dueDate, priority) => {
    const today = new Date().toISOString().split("T")[0];
    const isOverdue = dueDate < today;
    const isToday = dueDate === today;
    
    let urgencyScore = 0;
    
    // Base urgency on due date
    if (isOverdue) urgencyScore += 100;
    else if (isToday) urgencyScore += 50;
    
    // Add priority weight
    const priorityWeight = { 'High': 30, 'Medium': 20, 'Low': 10 };
    urgencyScore += priorityWeight[priority] || 10;
    
    // Add days overdue penalty
    if (isOverdue) {
      const daysDiff = Math.floor((new Date(today) - new Date(dueDate)) / (1000 * 60 * 60 * 24));
      urgencyScore += daysDiff * 5;
    }
    
    return urgencyScore;
  };

  const today = new Date().toISOString().split("T")[0];
  const isOverdue = (due) => due && due < today;
  const isToday = (due) => due === today;

  const overdueTasks = tasks.filter((t) => isOverdue(t.due_date));
  const todayTasks = tasks.filter((t) => isToday(t.due_date));
  const highPriorityTasks = tasks.filter((t) => t.priority === 'High');

  const getDisplayTasks = () => {
    switch (activeTab) {
      case 'overdue': return overdueTasks;
      case 'today': return todayTasks;
      default: return tasks;
    }
  };

  const scrollToProject = (projectId, taskType) => {
    if (taskType === 'personal' || !projectId) {
      // Could show a message or navigate to personal tasks section
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

  const getPriorityConfig = (priority) => {
    switch (priority?.toLowerCase()) {
      case "high": return { color: "#ef4444", bg: "rgba(239, 68, 68, 0.1)", icon: <FaFireAlt /> };
      case "medium": return { color: "#f59e0b", bg: "rgba(245, 158, 11, 0.1)", icon: <FaFlag /> };
      case "low": return { color: "#10b981", bg: "rgba(16, 185, 129, 0.1)", icon: <FaCalendarAlt /> };
      default: return { color: "#6b7280", bg: "rgba(107, 114, 128, 0.1)", icon: <FaTasks /> };
    }
  };

  const getTaskCardStyle = (task) => {
    if (isOverdue(task.due_date)) {
      return {
        background: "linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)",
        borderColor: "#ef4444",
        boxShadow: "0 4px 12px rgba(239, 68, 68, 0.15)"
      };
    } else if (isToday(task.due_date)) {
      return {
        background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
        borderColor: "#f59e0b",
        boxShadow: "0 4px 12px rgba(245, 158, 11, 0.15)"
      };
    }
    return {
      background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
      borderColor: "#e2e8f0",
      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)"
    };
  };

  const getDaysOverdue = (dueDate) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = today - due;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (isLoading) {
    return (
      <div className="today-tasks-container">
        <div className="tasks-header">
          <div className="header-content">
            <div className="header-icon-wrapper loading">
              <HiOutlineClipboardList className="header-icon" />
            </div>
            <div className="header-text">
              <h2 className="tasks-title">Today's Priorities</h2>
              <p className="tasks-subtitle">Loading your tasks...</p>
            </div>
          </div>
        </div>
        <div className="loading-content">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="task-card-skeleton">
              <div className="skeleton-header"></div>
              <div className="skeleton-content"></div>
              <div className="skeleton-footer"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="today-tasks-container">
      {/* Enhanced Header with Stats */}
      <div className="tasks-header">
        <div className="header-content">
          <div className="header-icon-wrapper">
            <HiOutlineClipboardList className="header-icon" />
            {(overdueTasks.length > 0 || todayTasks.length > 0) && (
              <div className="urgency-indicator">
                {overdueTasks.length > 0 ? (
                  <HiOutlineLightningBolt className="urgency-icon critical" />
                ) : (
                  <HiOutlineSparkles className="urgency-icon normal" />
                )}
              </div>
            )}
          </div>
          <div className="header-text">
            <h2 className="tasks-title">Today's Priorities</h2>
            <p className="tasks-subtitle">
              {overdueTasks.length > 0 && (
                <span className="urgent-text">
                  <FaExclamationTriangle /> {overdueTasks.length} overdue
                </span>
              )}
              {overdueTasks.length > 0 && todayTasks.length > 0 && <span className="separator">•</span>}
              {todayTasks.length > 0 && (
                <span className="today-text">
                  <FaCalendarDay /> {todayTasks.length} due today
                </span>
              )}
              {overdueTasks.length === 0 && todayTasks.length === 0 && (
                <span className="clear-text">All caught up! 🎉</span>
              )}
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        {tasks.length > 0 && (
          <div className="quick-stats">
            <div className="stat-card overdue">
              <div className="stat-number">{overdueTasks.length}</div>
              <div className="stat-label">Overdue</div>
            </div>
            <div className="stat-card today">
              <div className="stat-number">{todayTasks.length}</div>
              <div className="stat-label">Due Today</div>
            </div>
            <div className="stat-card priority">
              <div className="stat-number">{highPriorityTasks.length}</div>
              <div className="stat-label">High Priority</div>
            </div>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      {tasks.length > 0 && (
        <div className="tab-navigation">
          <button
            className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <HiOutlineClipboardList className="tab-icon" />
            <span>All ({tasks.length})</span>
          </button>
          <button
            className={`tab-button ${activeTab === 'overdue' ? 'active' : ''} ${overdueTasks.length > 0 ? 'has-items' : ''}`}
            onClick={() => setActiveTab('overdue')}
          >
            <HiOutlineFire className="tab-icon" />
            <span>Overdue ({overdueTasks.length})</span>
          </button>
          <button
            className={`tab-button ${activeTab === 'today' ? 'active' : ''} ${todayTasks.length > 0 ? 'has-items' : ''}`}
            onClick={() => setActiveTab('today')}
          >
            <HiOutlineCalendar className="tab-icon" />
            <span>Today ({todayTasks.length})</span>
          </button>
        </div>
      )}

      {/* Tasks List */}
      {getDisplayTasks().length > 0 ? (
        <div className="tasks-list">
          {getDisplayTasks().map((task, index) => {
            const priorityConfig = getPriorityConfig(task.priority);
            const cardStyle = getTaskCardStyle(task);
            const daysOverdue = isOverdue(task.due_date) ? getDaysOverdue(task.due_date) : 0;

            return (
              <div
                key={`${task.task_type}-${task.id}`}
                className={`task-card ${isOverdue(task.due_date) ? 'overdue' : ''} ${isToday(task.due_date) ? 'today' : ''}`}
                style={{
                  ...cardStyle,
                  animationDelay: `${index * 0.1}s`
                }}
                onClick={() => scrollToProject(task.project_id, task.task_type)}
              >
                {/* Urgency Indicator */}
                {task.urgency > 120 && (
                  <div className="urgency-badge critical">
                    <HiOutlineLightningBolt />
                    Critical
                  </div>
                )}

                {/* Task Header */}
                <div className="task-header">
                  <div className="task-status-group">
                    {getStatusIcon(task.status)}
                    <span className="status-text">{task.status}</span>
                  </div>
                  
                  <div className="task-meta">
                    {/* Priority Badge */}
                    <div 
                      className="priority-badge"
                      style={{ 
                        backgroundColor: priorityConfig.bg,
                        color: priorityConfig.color,
                        border: `1px solid ${priorityConfig.color}30`
                      }}
                    >
                      {priorityConfig.icon}
                      <span>{task.priority}</span>
                    </div>
                  </div>
                </div>

                {/* Task Description */}
                <div className="task-description">
                  {task.description}
                </div>

                {/* Task Details */}
                <div className="task-details">
                  <div className="detail-item">
                    <span className="detail-label">
                      {task.task_type === 'personal' ? 'Category:' : 'Project:'}
                    </span>
                    <span className="detail-value">{task.customer_name}</span>
                  </div>
                  
                  <div className="detail-item">
                    <span className="detail-label">Due Date:</span>
                    <div className={`due-date ${isOverdue(task.due_date) ? 'overdue' : isToday(task.due_date) ? 'today' : ''}`}>
                      {isOverdue(task.due_date) && (
                        <>
                          <FaExclamationTriangle className="date-icon" />
                          <span className="overdue-days">{daysOverdue} days overdue</span>
                        </>
                      )}
                      {isToday(task.due_date) && (
                        <>
                          <FaCalendarDay className="date-icon" />
                          <span>Due today</span>
                        </>
                      )}
                      <span className="date-text">
                        {new Date(task.due_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: new Date(task.due_date).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Task Action */}
                {task.task_type === 'project' && task.project_id ? (
                  <div className="task-action">
                    <FaArrowRight className="action-icon" />
                    <span>View in Project</span>
                  </div>
                ) : (
                  <div className="task-action personal">
                    <div className="personal-indicator">
                      <span>Personal Task</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">
            {activeTab === 'overdue' ? (
              <HiOutlineFire style={{ color: '#ef4444' }} />
            ) : activeTab === 'today' ? (
              <HiOutlineCalendar style={{ color: '#f59e0b' }} />
            ) : (
              <FaCheckCircle style={{ color: '#10b981' }} />
            )}
          </div>
          <h3 className="empty-title">
            {activeTab === 'overdue' ? 'No Overdue Tasks' : 
             activeTab === 'today' ? 'Nothing Due Today' : 
             'All Clear!'}
          </h3>
          <p className="empty-message">
            {activeTab === 'overdue' ? 
              "Great job staying on top of your deadlines!" :
              activeTab === 'today' ? 
              "You're all caught up for today. Time to plan ahead!" :
              "No urgent tasks requiring your attention right now."}
          </p>
        </div>
      )}

      <style jsx>{`
        .today-tasks-container {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%);
          border-radius: 1.25rem;
          padding: 2rem;
          backdrop-filter: blur(20px);
          border: 1px solid rgba(226, 232, 240, 0.3);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
        }

        .tasks-header {
          margin-bottom: 2rem;
        }

        .header-content {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          margin-bottom: 1.5rem;
        }

        .header-icon-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 3.5rem;
          height: 3.5rem;
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          border-radius: 1rem;
          box-shadow: 0 8px 20px rgba(59, 130, 246, 0.3);
        }

        .header-icon-wrapper.loading {
          animation: pulse 2s ease-in-out infinite;
        }

        .header-icon {
          font-size: 1.5rem;
          color: white;
        }

        .urgency-indicator {
          position: absolute;
          top: -0.375rem;
          right: -0.375rem;
          width: 1.5rem;
          height: 1.5rem;
          background: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }

        .urgency-icon {
          font-size: 0.875rem;
        }

        .urgency-icon.critical {
          color: #ef4444;
          animation: pulse 1.5s ease-in-out infinite;
        }

        .urgency-icon.normal {
          color: #f59e0b;
          animation: sparkle 2s ease-in-out infinite;
        }

        .header-text {
          flex: 1;
        }

        .tasks-title {
          font-size: 1.875rem;
          font-weight: 800;
          color: #1e293b;
          margin: 0;
          letter-spacing: -0.025em;
        }

        .tasks-subtitle {
          font-size: 1rem;
          color: #64748b;
          margin: 0.5rem 0 0 0;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .urgent-text {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          color: #dc2626;
          font-weight: 600;
        }

        .today-text {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          color: #d97706;
          font-weight: 600;
        }

        .clear-text {
          color: #059669;
          font-weight: 600;
        }

        .separator {
          color: #cbd5e1;
          font-weight: 400;
        }

        .quick-stats {
          display: flex;
          gap: 1rem;
        }

        .stat-card {
          background: white;
          padding: 1rem 1.25rem;
          border-radius: 0.875rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
          border: 1px solid rgba(226, 232, 240, 0.5);
          min-width: 5rem;
          text-align: center;
        }

        .stat-card.overdue {
          border-left: 3px solid #ef4444;
        }

        .stat-card.today {
          border-left: 3px solid #f59e0b;
        }

        .stat-card.priority {
          border-left: 3px solid #8b5cf6;
        }

        .stat-number {
          font-size: 1.75rem;
          font-weight: 800;
          color: #1e293b;
          line-height: 1;
        }

        .stat-label {
          font-size: 0.75rem;
          color: #64748b;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-top: 0.25rem;
        }

        .tab-navigation {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 2rem;
          background: rgba(248, 250, 252, 0.8);
          padding: 0.5rem;
          border-radius: 1rem;
          border: 1px solid rgba(226, 232, 240, 0.5);
        }

        .tab-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          border: none;
          background: transparent;
          border-radius: 0.75rem;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 0.875rem;
          font-weight: 600;
          color: #64748b;
          position: relative;
        }

        .tab-button:hover {
          background: rgba(255, 255, 255, 0.8);
          color: #1e293b;
        }

        .tab-button.active {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          color: white;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        .tab-button.has-items::after {
          content: '';
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
          width: 0.5rem;
          height: 0.5rem;
          background: #ef4444;
          border-radius: 50%;
          animation: pulse 2s ease-in-out infinite;
        }

        .tab-button.active.has-items::after {
          background: rgba(255, 255, 255, 0.8);
        }

        .tab-icon {
          font-size: 1rem;
        }

        .tasks-list {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .task-card {
          background: white;
          border-radius: 1rem;
          padding: 1.5rem;
          border: 1px solid #e2e8f0;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          animation: slideInUp 0.6s ease-out forwards;
          opacity: 0;
          transform: translateY(20px);
          position: relative;
          overflow: hidden;
        }

        .task-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12) !important;
        }

        .task-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(45deg, transparent 30%, rgba(255, 255, 255, 0.1) 50%, transparent 70%);
          opacity: 0;
          transition: opacity 0.3s ease;
          pointer-events: none;
        }

        .task-card:hover::before {
          opacity: 1;
        }

        .urgency-badge {
          position: absolute;
          top: 1rem;
          right: 1rem;
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: white;
          padding: 0.25rem 0.5rem;
          border-radius: 0.5rem;
          font-size: 0.75rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 0.25rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
        }

        .urgency-badge.critical {
          animation: pulse 2s ease-in-out infinite;
        }

        .task-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1rem;
        }

        .task-status-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .status-icon {
          font-size: 1rem;
        }

        .status-icon.in-progress {
          color: #0ea5e9;
        }

        .status-icon.open {
          color: #64748b;
        }

        .status-icon.completed {
          color: #10b981;
        }

        .status-icon.default {
          color: #6b7280;
        }

        .status-text {
          font-size: 0.875rem;
          font-weight: 600;
          color: #475569;
        }

        .task-meta {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .priority-badge {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.375rem 0.75rem;
          border-radius: 0.75rem;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .task-description {
          font-size: 1.125rem;
          font-weight: 600;
          color: #1e293b;
          line-height: 1.5;
          margin-bottom: 1.25rem;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }

        .task-details {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-bottom: 1.25rem;
        }

        .detail-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.875rem;
        }

        .detail-label {
          font-weight: 600;
          color: #64748b;
        }

        .detail-value {
          color: #475569;
          font-weight: 500;
        }

        .due-date {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          font-weight: 600;
        }

        .due-date.overdue {
          color: #dc2626;
        }

        .due-date.today {
          color: #d97706;
        }

        .date-icon {
          font-size: 0.75rem;
        }

        .overdue-days {
          background: rgba(239, 68, 68, 0.1);
          color: #dc2626;
          padding: 0.125rem 0.5rem;
          border-radius: 0.5rem;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .date-text {
          color: #64748b;
          font-weight: 500;
        }

        .task-action {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #3b82f6;
          font-size: 0.875rem;
          font-weight: 600;
          opacity: 0.7;
          transition: all 0.3s ease;
        }

        .task-card:hover .task-action {
          opacity: 1;
        }

        .action-icon {
          font-size: 0.75rem;
          transition: transform 0.3s ease;
        }

        .task-card:hover .action-icon {
          transform: translateX(3px);
        }

        .task-action.personal {
          justify-content: flex-end;
        }

        .personal-indicator {
          background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
          color: white;
          padding: 0.375rem 0.875rem;
          border-radius: 1rem;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          box-shadow: 0 2px 8px rgba(139, 92, 246, 0.3);
        }

        .loading-content {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .task-card-skeleton {
          background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
          border: 1px solid #e2e8f0;
          border-radius: 1rem;
          padding: 1.5rem;
          animation: pulse 2s ease-in-out infinite;
        }

        .skeleton-header {
          height: 1.5rem;
          background: linear-gradient(90deg, #cbd5e1, #e2e8f0, #cbd5e1);
          background-size: 200% 100%;
          animation: shimmer 2s ease-in-out infinite;
          border-radius: 0.5rem;
          margin-bottom: 1rem;
        }

        .skeleton-content {
          height: 4rem;
          background: linear-gradient(90deg, #cbd5e1, #e2e8f0, #cbd5e1);
          background-size: 200% 100%;
          animation: shimmer 2s ease-in-out infinite;
          border-radius: 0.5rem;
          margin-bottom: 1rem;
        }

        .skeleton-footer {
          height: 1rem;
          background: linear-gradient(90deg, #cbd5e1, #e2e8f0, #cbd5e1);
          background-size: 200% 100%;
          animation: shimmer 2s ease-in-out infinite;
          border-radius: 0.5rem;
          width: 60%;
        }

        .empty-state {
          text-align: center;
          padding: 4rem 2rem;
          color: #64748b;
        }

        .empty-icon {
          font-size: 4rem;
          margin-bottom: 1.5rem;
          opacity: 0.8;
        }

        .empty-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 0.75rem;
        }

        .empty-message {
          font-size: 1rem;
          line-height: 1.6;
          max-width: 400px;
          margin: 0 auto;
          color: #64748b;
        }

        @keyframes slideInUp {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulse {
          0%, 100% { 
            opacity: 1; 
            transform: scale(1); 
          }
          50% { 
            opacity: 0.8; 
            transform: scale(1.05); 
          }
        }

        @keyframes sparkle {
          0%, 100% { 
            transform: scale(1) rotate(0deg); 
            opacity: 1; 
          }
          50% { 
            transform: scale(1.2) rotate(180deg); 
            opacity: 0.8; 
          }
        }

        @keyframes shimmer {
          0% { 
            background-position: -200% 0; 
          }
          100% { 
            background-position: 200% 0; 
          }
        }

        /* Mobile Responsive */
        @media (max-width: 768px) {
          .today-tasks-container {
            padding: 1.5rem;
            border-radius: 1rem;
          }

          .header-content {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }

          .header-icon-wrapper {
            width: 3rem;
            height: 3rem;
          }

          .header-icon {
            font-size: 1.25rem;
          }

          .tasks-title {
            font-size: 1.5rem;
          }

          .tasks-subtitle {
            font-size: 0.875rem;
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }

          .quick-stats {
            flex-direction: row;
            justify-content: space-between;
            width: 100%;
          }

          .stat-card {
            flex: 1;
            min-width: auto;
          }

          .tab-navigation {
            flex-direction: column;
            gap: 0.25rem;
          }

          .tab-button {
            justify-content: space-between;
            padding: 1rem;
          }

          .task-card {
            padding: 1.25rem;
          }

          .task-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.75rem;
          }

          .task-meta {
            align-self: flex-end;
          }

          .urgency-badge {
            position: relative;
            top: auto;
            right: auto;
            align-self: flex-start;
          }

          .task-description {
            font-size: 1rem;
          }

          .detail-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.25rem;
          }

          .due-date {
            align-self: flex-end;
          }

          .empty-state {
            padding: 3rem 1rem;
          }

          .empty-icon {
            font-size: 3rem;
          }

          .empty-title {
            font-size: 1.25rem;
          }

          .empty-message {
            font-size: 0.875rem;
          }
        }

        /* Reduced Motion */
        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }

        /* High Contrast Mode */
        @media (prefers-contrast: high) {
          .today-tasks-container {
            background: white;
            border: 2px solid #000;
          }

          .task-card {
            background: white;
            border: 1px solid #000;
          }

          .tasks-title {
            color: #000;
          }
        }

        /* Dark Mode Support */
        @media (prefers-color-scheme: dark) {
          .today-tasks-container {
            background: linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%);
            border-color: rgba(51, 65, 85, 0.3);
          }

          .tasks-title {
            color: #f1f5f9;
          }

          .tasks-subtitle {
            color: #94a3b8;
          }

          .task-card {
            background: rgba(30, 41, 59, 0.8);
            border-color: rgba(51, 65, 85, 0.5);
          }

          .task-description {
            color: #e2e8f0;
          }

          .detail-label {
            color: #94a3b8;
          }

          .detail-value {
            color: #cbd5e1;
          }

          .stat-card {
            background: rgba(30, 41, 59, 0.8);
            border-color: rgba(51, 65, 85, 0.5);
          }

          .stat-number {
            color: #f1f5f9;
          }

          .tab-navigation {
            background: rgba(15, 23, 42, 0.8);
            border-color: rgba(51, 65, 85, 0.5);
          }

          .tab-button {
            color: #94a3b8;
          }

          .tab-button:hover {
            background: rgba(51, 65, 85, 0.5);
            color: #f1f5f9;
          }

          .empty-title {
            color: #f1f5f9;
          }

          .empty-message {
            color: #94a3b8;
          }
        }
      `}</style>
    </div>
  );
}
