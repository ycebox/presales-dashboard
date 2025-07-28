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

export default function TodayTasks() {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    setIsLoading(true);
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
      case "In Progress": return <FaPlay className="text-blue-500" />;
      case "Open": return <FaClock className="text-gray-500" />;
      case "Done": 
      case "Completed": return <FaCheckCircle className="text-green-500" />;
      default: return <FaTasks className="text-gray-400" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case "high": return "text-red-600 bg-red-50 border-red-200";
      case "medium": return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "low": return "text-green-600 bg-green-50 border-green-200";
      default: return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="today-tasks-container">
        <div className="tasks-header">
          <h2 className="tasks-title">Today's Tasks</h2>
          <p className="text-gray-500">Loading tasks...</p>
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="task-skeleton">
              <div className="skeleton-line w-3/4"></div>
              <div className="skeleton-line w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="today-tasks-container">
      {/* Header */}
      <div className="tasks-header">
        <h2 className="tasks-title">Today's Tasks</h2>
        <div className="task-summary">
          {overdueTasks.length > 0 && (
            <span className="summary-item overdue">
              <FaExclamationTriangle className="w-4 h-4" />
              {overdueTasks.length} overdue
            </span>
          )}
          {todayTasks.length > 0 && (
            <span className="summary-item today">
              <FaCalendarDay className="w-4 h-4" />
              {todayTasks.length} due today
            </span>
          )}
          {tasks.length === 0 && (
            <span className="summary-item clear">
              All caught up! 🎉
            </span>
          )}
        </div>
      </div>

      {/* Tasks List */}
      {tasks.length > 0 ? (
        <div className="tasks-list">
          {/* Overdue Section */}
          {overdueTasks.length > 0 && (
            <>
              <div className="section-header overdue">
                <FaExclamationTriangle className="w-4 h-4" />
                <span>Overdue ({overdueTasks.length})</span>
              </div>
              {overdueTasks.map((task) => (
                <div
                  key={`overdue-${task.task_type}-${task.id}`}
                  className="task-item overdue"
                  onClick={() => scrollToProject(task.project_id, task.task_type)}
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
                          <><FaUser className="w-3 h-3" /> Personal</>
                        ) : (
                          <><FaBuilding className="w-3 h-3" /> {task.customer_name}</>
                        )}
                      </div>
                      <div className="task-due overdue">
                        Due {formatDate(task.due_date)}
                      </div>
                    </div>
                  </div>
                  {task.task_type === 'project' && (
                    <div className="task-action">
                      <FaArrowRight className="w-3 h-3" />
                    </div>
                  )}
                </div>
              ))}
            </>
          )}

          {/* Today Section */}
          {todayTasks.length > 0 && (
            <>
              <div className="section-header today">
                <FaCalendarDay className="w-4 h-4" />
                <span>Due Today ({todayTasks.length})</span>
              </div>
              {todayTasks.map((task) => (
                <div
                  key={`today-${task.task_type}-${task.id}`}
                  className="task-item today"
                  onClick={() => scrollToProject(task.project_id, task.task_type)}
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
                          <><FaUser className="w-3 h-3" /> Personal</>
                        ) : (
                          <><FaBuilding className="w-3 h-3" /> {task.customer_name}</>
                        )}
                      </div>
                      <div className="task-due today">
                        Due today
                      </div>
                    </div>
                  </div>
                  {task.task_type === 'project' && (
                    <div className="task-action">
                      <FaArrowRight className="w-3 h-3" />
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      ) : (
        <div className="empty-state">
          <FaCheckCircle className="empty-icon" />
          <h3>All clear!</h3>
          <p>No urgent tasks for today. Great job staying on top of things!</p>
        </div>
      )}

      <style jsx>{`
        .today-tasks-container {
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          border: 1px solid #e5e7eb;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .tasks-header {
          margin-bottom: 1.5rem;
        }

        .tasks-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #111827;
          margin: 0 0 0.5rem 0;
        }

        .task-summary {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .summary-item {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          font-size: 0.875rem;
          font-weight: 600;
        }

        .summary-item.overdue {
          color: #dc2626;
        }

        .summary-item.today {
          color: #d97706;
        }

        .summary-item.clear {
          color: #059669;
        }

        .section-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin: 1.5rem 0 0.75rem 0;
          padding-bottom: 0.5rem;
          border-bottom: 2px solid;
        }

        .section-header.overdue {
          color: #dc2626;
          border-color: #dc2626;
        }

        .section-header.today {
          color: #d97706;
          border-color: #d97706;
        }

        .section-header:first-child {
          margin-top: 0;
        }

        .tasks-list {
          display: flex;
          flex-direction: column;
        }

        .task-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem;
          border: 1px solid #f3f4f6;
          border-radius: 8px;
          margin-bottom: 0.75rem;
          cursor: pointer;
          transition: all 0.2s ease;
          background: #fafafa;
        }

        .task-item:hover {
          border-color: #e5e7eb;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          background: #ffffff;
        }

        .task-item.overdue {
          border-left: 3px solid #ef4444;
          background: #fefefe;
        }

        .task-item.today {
          border-left: 3px solid #f59e0b;
          background: #fefefe;
        }

        .task-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .task-main {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .task-status {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .task-description {
          font-weight: 600;
          color: #111827;
          font-size: 0.95rem;
        }

        .task-meta {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .priority-badge {
          padding: 0.25rem 0.5rem;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border: 1px solid;
        }

        .task-details {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.875rem;
          color: #6b7280;
        }

        .task-project {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          font-weight: 500;
        }

        .task-due {
          font-weight: 600;
        }

        .task-due.overdue {
          color: #dc2626;
        }

        .task-due.today {
          color: #d97706;
        }

        .task-action {
          display: flex;
          align-items: center;
          color: #6b7280;
          margin-left: 1rem;
          opacity: 0.6;
          transition: all 0.2s ease;
        }

        .task-item:hover .task-action {
          opacity: 1;
          color: #374151;
          transform: translateX(2px);
        }

        .task-skeleton {
          padding: 1rem;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          margin-bottom: 0.75rem;
          background: #f9fafb;
        }

        .skeleton-line {
          height: 1rem;
          background: #e5e7eb;
          border-radius: 4px;
          margin-bottom: 0.5rem;
          animation: pulse 2s ease-in-out infinite;
        }

        .empty-state {
          text-align: center;
          padding: 3rem 1rem;
          color: #6b7280;
        }

        .empty-icon {
          font-size: 3rem;
          color: #10b981;
          margin-bottom: 1rem;
        }

        .empty-state h3 {
          font-size: 1.25rem;
          font-weight: 600;
          color: #111827;
          margin-bottom: 0.5rem;
        }

        .empty-state p {
          font-size: 0.875rem;
          line-height: 1.6;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        /* Utilities */
        .w-3 { width: 0.75rem; }
        .h-3 { height: 0.75rem; }
        .w-4 { width: 1rem; }
        .h-4 { height: 1rem; }
        .text-blue-500 { color: #3b82f6; }
        .text-gray-500 { color: #6b7280; }
        .text-green-500 { color: #10b981; }
        .text-gray-400 { color: #9ca3af; }
        .text-red-600 { color: #dc2626; }
        .text-yellow-600 { color: #d97706; }
        .text-green-600 { color: #059669; }
        .text-gray-600 { color: #4b5563; }
        .bg-red-50 { background-color: #fef2f2; }
        .bg-yellow-50 { background-color: #fffbeb; }
        .bg-green-50 { background-color: #f0fdf4; }
        .bg-gray-50 { background-color: #f9fafb; }
        .border-red-200 { border-color: #fecaca; }
        .border-yellow-200 { border-color: #fde68a; }
        .border-green-200 { border-color: #bbf7d0; }
        .border-gray-200 { border-color: #e5e7eb; }

        @media (max-width: 768px) {
          .today-tasks-container {
            padding: 1rem;
          }

          .task-item {
            padding: 0.75rem;
          }

          .task-main {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }

          .task-meta {
            align-self: flex-end;
          }

          .task-details {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.25rem;
          }

          .task-action {
            margin-left: 0.5rem;
          }
        }
      `}</style>
    </div>
  );
}
