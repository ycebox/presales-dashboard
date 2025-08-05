import React, { useState, useEffect } from "react";
import { supabase } from './supabaseClient';
import {
  Calendar,
  AlertTriangle,
  Clock,
  Play,
  ArrowRight,
  Building2
} from "lucide-react";
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
          ["Not Started", "In Progress"].includes(task.status)
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
      case "In Progress": 
        return <Play size={10} className="status-icon in-progress" />;
      case "Not Started": 
        return <Clock size={10} className="status-icon open" />;
      default: 
        return null;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "No due date";
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return "Tomorrow";
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  const scrollToProject = (projectId) => {
    const el = document.getElementById(`project-${projectId}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const notStartedTasks = tasks.filter(t => t.status === "Not Started");
  const inProgressTasks = tasks.filter(t => t.status === "In Progress");

  const TaskCard = ({ task }) => (
    <div 
      key={task.id} 
      className={`task-card ${isOverdue(task.due_date) ? "overdue" : ""}`} 
      onClick={() => scrollToProject(task.project_id)}
    >
      <div className="task-header">
        <div className="task-title">{task.description}</div>
        <div className="project-name">
          <Building2 size={10} className="project-icon" />
          {task.customer_name}
        </div>
      </div>
      <div className="task-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
          {getStatusIcon(task.status)}
          <span style={{ fontSize: '0.65rem', color: '#64748b' }}>
            {task.status}
          </span>
        </div>
        <div className="due-date-container">
          <span className={`due-date ${isOverdue(task.due_date) ? "overdue" : ""}`}>
            <Calendar size={10} />
            {formatDate(task.due_date)}
          </span>
          <ArrowRight size={10} className="task-arrow" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="kanban-container">
      <header className="kanban-header">
        <h2>Today's Tasks</h2>
      </header>
      {isLoading ? (
        <p className="kanban-loading">Loading tasks...</p>
      ) : error ? (
        <div className="kanban-error">
          <AlertTriangle size={20} style={{ marginBottom: '0.5rem' }} />
          <p>{error}</p>
          <button onClick={fetchTasks}>Try Again</button>
        </div>
      ) : (
        <div className="kanban-board">
          <div className="kanban-column">
            <h3 className="column-title">Not Started</h3>
            {notStartedTasks.length > 0 ? (
              notStartedTasks.map(task => <TaskCard key={task.id} task={task} />)
            ) : (
              <div style={{ 
                textAlign: 'center', 
                color: '#cbd5e1', 
                fontSize: '0.75rem',
                fontWeight: '500',
                padding: '2rem 1rem',
                border: '2px dashed #e2e8f0',
                borderRadius: '8px',
                marginTop: '0.5rem'
              }}>
                No tasks to start
              </div>
            )}
          </div>

          <div className="kanban-column">
            <h3 className="column-title">In Progress</h3>
            {inProgressTasks.length > 0 ? (
              inProgressTasks.map(task => <TaskCard key={task.id} task={task} />)
            ) : (
              <div style={{ 
                textAlign: 'center', 
                color: '#cbd5e1', 
                fontSize: '0.75rem',
                fontWeight: '500',
                padding: '2rem 1rem',
                border: '2px dashed #e2e8f0',
                borderRadius: '8px',
                marginTop: '0.5rem'
              }}>
                No tasks in progress
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
