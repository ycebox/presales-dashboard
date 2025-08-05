import React, { useState, useEffect } from "react";
import { supabase } from './supabaseClient';
import {
  Calendar,
  AlertTriangle,
  Clock,
  Play,
  ArrowRight,
  Building2,
  MoreVertical,
  Check,
  Pause,
  RotateCcw
} from "lucide-react";
import './TodayTasks.css';

export default function TodayTasksKanban() {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [draggedTask, setDraggedTask] = useState(null);
  const [showDropdown, setShowDropdown] = useState(null);
  const [updatingTask, setUpdatingTask] = useState(null);

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

  const updateTaskStatus = async (taskId, newStatus) => {
    setUpdatingTask(taskId);
    try {
      const { error } = await supabase
        .from("project_tasks")
        .update({ status: newStatus })
        .eq("id", taskId);

      if (error) {
        console.error("Error updating task:", error);
        return false;
      }

      // Update local state
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === taskId ? { ...task, status: newStatus } : task
        )
      );
      
      setShowDropdown(null);
      return true;
    } catch (error) {
      console.error("Error updating task:", error);
      return false;
    } finally {
      setUpdatingTask(null);
    }
  };

  const handleDragStart = (e, task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault();
    
    if (!draggedTask || draggedTask.status === targetStatus) {
      setDraggedTask(null);
      return;
    }

    await updateTaskStatus(draggedTask.id, targetStatus);
    setDraggedTask(null);
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
  };

  const getStatusOptions = (currentStatus) => {
    const allStatuses = [
      { value: "Not Started", label: "Not Started", icon: Clock },
      { value: "In Progress", label: "In Progress", icon: Play },
      { value: "Completed", label: "Completed", icon: Check },
      { value: "On Hold", label: "On Hold", icon: Pause }
    ];
    
    return allStatuses.filter(status => status.value !== currentStatus);
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
      className={`task-card ${isOverdue(task.due_date) ? "overdue" : ""} ${updatingTask === task.id ? "updating" : ""}`}
      draggable
      onDragStart={(e) => handleDragStart(e, task)}
      onDragEnd={handleDragEnd}
      onClick={(e) => {
        if (!e.target.closest('.task-actions')) {
          scrollToProject(task.project_id);
        }
      }}
    >
      <div className="task-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div className="task-title">{task.description}</div>
          <div className="task-actions">
            <button
              className="task-menu-btn"
              onClick={(e) => {
                e.stopPropagation();
                setShowDropdown(showDropdown === task.id ? null : task.id);
              }}
              disabled={updatingTask === task.id}
            >
              <MoreVertical size={12} />
            </button>
            {showDropdown === task.id && (
              <div className="status-dropdown">
                {getStatusOptions(task.status).map((status) => {
                  const IconComponent = status.icon;
                  return (
                    <button
                      key={status.value}
                      className="status-option"
                      onClick={(e) => {
                        e.stopPropagation();
                        updateTaskStatus(task.id, status.value);
                      }}
                    >
                      <IconComponent size={10} />
                      {status.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
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
          <div 
            className="kanban-column"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, "Not Started")}
          >
            <h3 className="column-title">Not Started</h3>
            {notStartedTasks.length > 0 ? (
              notStartedTasks.map(task => <TaskCard key={task.id} task={task} />)
            ) : (
              <div className="empty-column">
                No tasks to start
              </div>
            )}
          </div>

          <div 
            className="kanban-column"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, "In Progress")}
          >
            <h3 className="column-title">In Progress</h3>
            {inProgressTasks.length > 0 ? (
              inProgressTasks.map(task => <TaskCard key={task.id} task={task} />)
            ) : (
              <div className="empty-column">
                No tasks in progress
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
