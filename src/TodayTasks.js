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
  FaFilter
} from "react-icons/fa";
import { 
  HiOutlineFire, 
  HiOutlineCalendar, 
  HiOutlineClipboardList,
  HiOutlineSparkles
} from "react-icons/hi";

export default function TodayTasks() {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'overdue', 'today'

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("project_tasks")
        .select("id, description, status, due_date, project_id, priority, projects(customer_name)")
        .lte("due_date", today)
        .eq("is_archived", false)
        .order("due_date", { ascending: true });

      if (!error) {
        const filtered = data.filter(
          (t) => !["Done", "Completed", "Cancelled/On-hold"].includes(t.status)
        );
        setTasks(filtered);
      } else {
        console.error("Error loading today's tasks:", error);
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const today = new Date().toISOString().split("T")[0];
  const isOverdue = (due) => due && due < today;
  const isToday = (due) => due === today;

  const openCount = tasks.filter((t) => t.status !== "Done").length;
  const doneCount = tasks.filter((t) => t.status === "Done").length;
  const overdueCount = tasks.filter((t) => isOverdue(t.due_date)).length;
  const todayCount = tasks.filter((t) => isToday(t.due_date)).length;

  const grouped = {
    overdue: tasks.filter((t) => isOverdue(t.due_date)),
    today: tasks.filter((t) => isToday(t.due_date)),
  };

  const filteredTasks = filter === 'all' ? 
    [...grouped.overdue, ...grouped.today] :
    grouped[filter] || [];

  const scrollToProject = (projectId) => {
    const el = document.getElementById(`project-${projectId}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "In Progress": return <FaPlay className="status-icon in-progress" />;
      case "Open": return <FaClock className="status-icon open" />;
      default: return <FaTasks className="status-icon default" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case "high": return "#ef4444";
      case "medium": return "#f59e0b";
      case "low": return "#10b981";
      default: return "#6b7280";
    }
  };

  const getTaskTypeGradient = (dueDate) => {
    if (isOverdue(dueDate)) {
      return "linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)";
    } else if (isToday(dueDate)) {
      return "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)";
    }
    return "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)";
  };

  const getTaskTypeBorder = (dueDate) => {
    if (isOverdue(dueDate)) return "#ef4444";
    if (isToday(dueDate)) return "#f59e0b";
    return "#0ea5e9";
  };

  const filterOptions = [
    { key: 'all', label: 'All Tasks', icon: <FaTasks />, count: filteredTasks.length },
    { key: 'overdue', label: 'Overdue', icon: <HiOutlineFire />, count: overdueCount },
    { key: 'today', label: 'Due Today', icon: <HiOutlineCalendar />, count: todayCount }
  ];

  if (isLoading) {
    return (
      <div className="today-tasks-container">
        <div className="tasks-header loading">
          <div className="header-icon-wrapper">
            <HiOutlineClipboardList className="header-icon" />
          </div>
          <div className="header-text">
            <h2 className="tasks-title">Today's Focus</h2>
            <p className="tasks-subtitle">Loading your priorities...</p>
          </div>
        </div>
        <div className="loading-content">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="task-card loading">
              <div className="loading-shimmer"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="today-tasks-container">
      {/* Enhanced Header */}
      <div className="tasks-header">
        <div className="header-icon-wrapper">
          <HiOutlineClipboardList className="header-icon" />
          {(overdueCount > 0 || todayCount > 0) && (
            <HiOutlineSparkles className="sparkle-icon" />
          )}
        </div>
        <div className="header-text">
          <h2 className="tasks-title">Today's Focus</h2>
          <p className="tasks-subtitle">
            {overdueCount > 0 ? `${overdueCount} overdue, ` : ''}
            {todayCount > 0 ? `${todayCount} due today` : 'All caught up!'}
          </p>
        </div>
        {tasks.length > 0 && (
          <div className="tasks-stats">
            <div className="stat-item">
              <span className="stat-value">{openCount}</span>
              <span className="stat-label">Open</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <span className="stat-value">{doneCount}</span>
              <span className="stat-label">Done</span>
            </div>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      {tasks.length > 0 && (
        <div className="filter-tabs">
          {filterOptions.map((option) => (
            <button
              key={option.key}
              className={`filter-tab ${filter === option.key ? 'active' : ''}`}
              onClick={() => setFilter(option.key)}
            >
              <span className="filter-icon">{option.icon}</span>
              <span className="filter-label">{option.label}</span>
              <span className="filter-count">{option.count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Tasks Grid */}
      {filteredTasks.length > 0 ? (
        <div className="tasks-grid">
          {filteredTasks.map((task, index) => (
            <div
              key={task.id}
              className={`task-card ${isOverdue(task.due_date) ? 'overdue' : isToday(task.due_date) ? 'today' : ''}`}
              onClick={() => scrollToProject(task.project_id)}
              style={{
                background: getTaskTypeGradient(task.due_date),
                borderLeftColor: getTaskTypeBorder(task.due_date),
                animationDelay: `${index * 0.1}s`
              }}
            >
              <div className="task-card-header">
                <div className="task-status">
                  {getStatusIcon(task.status)}
                  <span className="status-text">{task.status}</span>
                </div>
                {task.priority && (
                  <div 
                    className="priority-badge"
                    style={{ backgroundColor: getPriorityColor(task.priority) }}
                  >
                    {task.priority}
                  </div>
                )}
              </div>

              <div className="task-description">
                {task.description}
              </div>

              <div className="task-details">
                <div className="detail-row">
                  <span className="detail-label">Project:</span>
                  <span className="detail-value">
                    {task.projects?.customer_name || `Project ${task.project_id}`}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Due:</span>
                  <span className={`detail-value date ${isOverdue(task.due_date) ? 'overdue' : isToday(task.due_date) ? 'today' : ''}`}>
                    {isOverdue(task.due_date) && <FaExclamationTriangle className="date-icon" />}
                    {isToday(task.due_date) && <FaCalendarDay className="date-icon" />}
                    {new Date(task.due_date).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="task-action">
                <FaArrowRight className="action-icon" />
                <span>View Project</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">
            <FaCheckCircle />
          </div>
          <h3 className="empty-title">All Clear!</h3>
          <p className="empty-message">
            {filter === 'all' ? 
              "No urgent tasks for today. Great job staying on top of things!" :
              `No ${filter} tasks found.`
            }
          </p>
        </div>
      )}

      <style jsx>{`
        .today-tasks-container {
          padding: 1.5rem;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%);
          border-radius: 1rem;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(226, 232, 240, 0.5);
        }

        .tasks-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.5rem;
          position: relative;
        }

        .tasks-header.loading {
          margin-bottom: 1rem;
        }

        .header-icon-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 3rem;
          height: 3rem;
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          border-radius: 0.75rem;
          box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
        }

        .header-icon {
          font-size: 1.25rem;
          color: white;
        }

        .sparkle-icon {
          position: absolute;
          top: -0.25rem;
          right: -0.25rem;
          font-size: 0.75rem;
          color: #fbbf24;
          animation: sparkle 2s ease-in-out infinite;
        }

        .header-text {
          flex: 1;
        }

        .tasks-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0;
          letter-spacing: -0.025em;
        }

        .tasks-subtitle {
          font-size: 0.875rem;
          color: #64748b;
          margin: 0.25rem 0 0 0;
          font-weight: 500;
        }

        .tasks-stats {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: rgba(255, 255, 255, 0.8);
          padding: 0.75rem 1rem;
          border-radius: 0.75rem;
          border: 1px solid rgba(226, 232, 240, 0.5);
        }

        .stat-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.125rem;
        }

        .stat-value {
          font-size: 1.25rem;
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
        }

        .stat-divider {
          width: 1px;
          height: 2rem;
          background: rgba(226, 232, 240, 0.8);
        }

        .filter-tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
          background: rgba(248, 250, 252, 0.8);
          padding: 0.5rem;
          border-radius: 0.75rem;
          border: 1px solid rgba(226, 232, 240, 0.5);
        }

        .filter-tab {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.75rem;
          border: none;
          background: transparent;
          border-radius: 0.5rem;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 0.875rem;
          font-weight: 500;
          color: #64748b;
        }

        .filter-tab:hover {
          background: rgba(255, 255, 255, 0.8);
          color: #1e293b;
        }

        .filter-tab.active {
          background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
          color: white;
          box-shadow: 0 2px 8px rgba(14, 165, 233, 0.3);
        }

        .filter-icon {
          font-size: 1rem;
        }

        .filter-label {
          font-weight: 600;
        }

        .filter-count {
          background: rgba(0, 0, 0, 0.1);
          color: inherit;
          padding: 0.125rem 0.375rem;
          border-radius: 0.75rem;
          font-size: 0.75rem;
          font-weight: 700;
          min-width: 1.25rem;
          text-align: center;
        }

        .filter-tab.active .filter-count {
          background: rgba(255, 255, 255, 0.2);
        }

        .tasks-grid {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .task-card {
          background: white;
          border-radius: 0.75rem;
          padding: 1.25rem;
          border-left: 4px solid #0ea5e9;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          animation: slideInUp 0.5s ease-out forwards;
          opacity: 0;
          transform: translateY(20px);
          position: relative;
          overflow: hidden;
        }

        .task-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
        }

        .task-card.overdue {
          border-left-color: #ef4444;
        }

        .task-card.today {
          border-left-color: #f59e0b;
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

        .task-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.75rem;
        }

        .task-status {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .status-icon {
          font-size: 0.875rem;
        }

        .status-icon.in-progress {
          color: #0ea5e9;
        }

        .status-icon.open {
          color: #64748b;
        }

        .status-icon.default {
          color: #6b7280;
        }

        .status-text {
          font-size: 0.875rem;
          font-weight: 600;
          color: #475569;
        }

        .priority-badge {
          padding: 0.25rem 0.5rem;
          border-radius: 0.75rem;
          font-size: 0.75rem;
          font-weight: 700;
          color: white;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .task-description {
          font-size: 1rem;
          font-weight: 600;
          color: #1e293b;
          line-height: 1.5;
          margin-bottom: 1rem;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }

        .task-details {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .detail-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
        }

        .detail-label {
          font-weight: 600;
          color: #64748b;
          min-width: 4rem;
        }

        .detail-value {
          color: #475569;
          font-weight: 500;
        }

        .detail-value.date {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .detail-value.date.overdue {
          color: #dc2626;
          font-weight: 600;
        }

        .detail-value.date.today {
          color: #d97706;
          font-weight: 600;
        }

        .date-icon {
          font-size: 0.75rem;
        }

        .task-action {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #0ea5e9;
          font-size: 0.875rem;
          font-weight: 600;
          opacity: 0.8;
          transition: opacity 0.3s ease;
        }

        .task-card:hover .task-action {
          opacity: 1;
        }

        .action-icon {
          font-size: 0.75rem;
          transition: transform 0.3s ease;
        }

        .task-card:hover .action-icon {
          transform: translateX(2px);
        }

        .loading-content {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .task-card.loading {
          background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
          border: 1px solid #e2e8f0;
          min-height: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .loading-shimmer {
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.8), transparent);
          animation: shimmer 1.5s ease-in-out infinite;
        }

        .empty-state {
          text-align: center;
          padding: 3rem 1rem;
          color: #64748b;
        }

        .empty-icon {
          font-size: 3rem;
          color: #10b981;
          margin-bottom: 1rem;
        }

        .empty-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 0.5rem;
        }

        .empty-message {
          font-size: 0.875rem;
          line-height: 1.6;
          max-width: 300px;
          margin: 0 auto;
        }

        @keyframes slideInUp {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes sparkle {
          0%, 100% { transform: scale(1) rotate(0deg); opacity: 1; }
          50% { transform: scale(1.2) rotate(180deg); opacity: 0.8; }
        }

        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        @media (max-width: 768px) {
          .today-tasks-container {
            padding: 1rem;
          }

          .tasks-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.75rem;
          }

          .header-icon-wrapper {
            width: 2.5rem;
            height: 2.5rem;
          }

          .header-icon {
            font-size: 1rem;
          }

          .tasks-stats {
            align-self: stretch;
            justify-content: center;
          }

          .filter-tabs {
            flex-direction: column;
            gap: 0.25rem;
          }

          .filter-tab {
            justify-content: space-between;
            padding: 0.75rem;
          }

          .task-card {
            padding: 1rem;
          }

          .task-description {
            font-size: 0.9rem;
          }
        }
      `}</style>
    </div>
  );
}
