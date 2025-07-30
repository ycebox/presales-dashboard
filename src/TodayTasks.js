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
      const { data, error } = await supabase
        .from("project_tasks")
        .select("id, description, status, due_date, project_id, projects(customer_name)")
        .lte("due_date", today)
        .eq("is_archived", false)
        .order("due_date", { ascending: true });

      if (error) {
        console.error("Error loading project tasks:", error);
        setError("Failed to load project tasks");
        return;
      }

      const filtered = data.filter(
        task => !["Done", "Completed", "Cancelled/On-hold"].includes(task.status)
      ).map(task => ({
        ...task,
        customer_name: task.projects?.customer_name || `Project ${task.project_id}`,
        priority: 'Medium' // default since project tasks have no priority field
      }));

      setTasks(filtered);
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

  const scrollToProject = (projectId) => {
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

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (isLoading) {
    return <div className="today-tasks-container">Loading tasks...</div>;
  }

  if (error) {
    return (
      <div className="today-tasks-container error">
        <FaExclamationTriangle />
        <p>{error}</p>
        <button onClick={fetchTasks}>Try Again</button>
      </div>
    );
  }

  return (
    <div className="today-tasks-container">
      <header className="tasks-header">
        <h2 className="section-title">Today's Tasks</h2>
        <div className="task-summary">
          {overdueTasks.length > 0 && (
            <span className="summary-item overdue">
              <FaExclamationTriangle className="summary-icon" />
              {overdueTasks.length} overdue
            </span>
          )}
          {todayTasks.length > 0 && (
            <span className="summary-item today">
              <FaCalendarDay className="summary-icon" />
              {todayTasks.length} due today
            </span>
          )}
          {tasks.length === 0 && <span>All caught up 🎉</span>}
        </div>
      </header>

      {(overdueTasks.length > 0 || todayTasks.length > 0) ? (
        <div className="tasks-list">
          {overdueTasks.length > 0 && (
            <section className="task-section">
              <div className="section-header overdue">
                <FaExclamationTriangle className="section-icon" />
                <h3 className="section-title">Overdue ({overdueTasks.length})</h3>
              </div>
              {overdueTasks.map(task => (
                <div
                  key={task.id}
                  className="task-item overdue"
                  onClick={() => scrollToProject(task.project_id)}
                  role="button"
                >
                  <div className="task-content">
                    <div className="task-status">
                      {getStatusIcon(task.status)}
                      <span>{task.description}</span>
                    </div>
                    <div className="task-meta">
                      <FaBuilding className="project-icon" />
                      <span>{task.customer_name}</span>
                      <span className="task-due">Due {formatDate(task.due_date)}</span>
                    </div>
                  </div>
                  <FaArrowRight className="action-icon" />
                </div>
              ))}
            </section>
          )}

          {todayTasks.length > 0 && (
            <section className="task-section">
              <div className="section-header today">
                <FaCalendarDay className="section-icon" />
                <h3 className="section-title">Due Today ({todayTasks.length})</h3>
              </div>
              {todayTasks.map(task => (
                <div
                  key={task.id}
                  className="task-item today"
                  onClick={() => scrollToProject(task.project_id)}
                  role="button"
                >
                  <div className="task-content">
                    <div className="task-status">
                      {getStatusIcon(task.status)}
                      <span>{task.description}</span>
                    </div>
                    <div className="task-meta">
                      <FaBuilding className="project-icon" />
                      <span>{task.customer_name}</span>
                      <span className="task-due">Due today</span>
                    </div>
                  </div>
                  <FaArrowRight className="action-icon" />
                </div>
              ))}
            </section>
          )}
        </div>
      ) : (
        <div className="empty-state">
          <FaCheckCircle className="empty-icon" />
          <p>No tasks due today or overdue. Well done!</p>
        </div>
      )}
    </div>
  );
}
