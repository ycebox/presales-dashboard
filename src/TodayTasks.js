import React, { useState, useEffect } from "react";
import { supabase } from './supabaseClient';
import {
  FaCalendarDay,
  FaExclamationTriangle,
  FaClock,
  FaPlay,
  FaArrowRight,
  FaBuilding
} from "react-icons/fa";
import './TodayTasks.css';

export default function TodayTasksKanban() {
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
        .eq("is_archived", false)
        .order("due_date", { ascending: true });

      if (error) {
        setError("Failed to load project tasks");
        return;
      }

      const filtered = data
        .filter(task =>
          ["Open", "In Progress"].includes(task.status)
        )
        .map(task => ({
          ...task,
          customer_name: task.projects?.customer_name || `Project ${task.project_id}`
        }));

      setTasks(filtered);
    } catch (error) {
      setError("Failed to load tasks");
    } finally {
      setIsLoading(false);
    }
  };

  const today = new Date().toISOString().split("T")[0];
  const isOverdue = (due) => due && due < today;

  const getStatusIcon = (status) => {
    switch (status) {
      case "In Progress": return <FaPlay className="status-icon in-progress" />;
      case "Open": return <FaClock className="status-icon open" />;
      default: return null;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const scrollToProject = (projectId) => {
    const el = document.getElementById(`project-${projectId}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const openTasks = tasks.filter(t => t.status === "Open");
  const inProgressTasks = tasks.filter(t => t.status === "In Progress");

  return (
    <div className="kanban-container">
      <header className="kanban-header">
        <h2>Today's Tasks</h2>
      </header>
      {isLoading ? (
        <p className="kanban-loading">Loading tasks...</p>
      ) : error ? (
        <div className="kanban-error">
          <FaExclamationTriangle />
          <p>{error}</p>
          <button onClick={fetchTasks}>Try Again</button>
        </div>
      ) : (
        <div className="kanban-board">
          <div className="kanban-column">
            <h3 className="column-title">Open</h3>
            {openTasks.map(task => (
              <div key={task.id} className={`task-card ${isOverdue(task.due_date) ? "overdue" : ""}`} onClick={() => scrollToProject(task.project_id)}>
                <div className="task-header">
                  {getStatusIcon(task.status)}
                  <span className="task-title">{task.description}</span>
                </div>
                <div className="task-footer">
                  <FaBuilding className="project-icon" />
                  <span className="project-name">{task.customer_name}</span>
                  <span className={`due-date ${isOverdue(task.due_date) ? "overdue" : ""}`}>
                    Due {formatDate(task.due_date)}
                  </span>
                  <FaArrowRight className="task-arrow" />
                </div>
              </div>
            ))}
          </div>

          <div className="kanban-column">
            <h3 className="column-title">In Progress</h3>
            {inProgressTasks.map(task => (
              <div key={task.id} className={`task-card ${isOverdue(task.due_date) ? "overdue" : ""}`} onClick={() => scrollToProject(task.project_id)}>
                <div className="task-header">
                  {getStatusIcon(task.status)}
                  <span className="task-title">{task.description}</span>
                </div>
                <div className="task-footer">
                  <FaBuilding className="project-icon" />
                  <span className="project-name">{task.customer_name}</span>
                  <span className={`due-date ${isOverdue(task.due_date) ? "overdue" : ""}`}>
                    Due {formatDate(task.due_date)}
                  </span>
                  <FaArrowRight className="task-arrow" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
