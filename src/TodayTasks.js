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
  RotateCcw,
  Clipboard,
  Plus
} from "lucide-react";
import './TodayTasks.css';

export default function TodayTasksKanban() {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [draggedTask, setDraggedTask] = useState(null);
  const [showDropdown, setShowDropdown] = useState(null);
  const [updatingTask, setUpdatingTask] = useState(null);
  const [completingTask, setCompletingTask] = useState(null);
  const [completedCount, setCompletedCount] = useState(0);
  const [showToast, setShowToast] = useState(null);

  // Add modal & new task states
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTask, setNewTask] = useState({
    description: "",
    due_date: "",
    status: "Not Started",
    project_id: ""
  });
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.task-actions')) {
        setShowDropdown(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
  if (showAddModal) {
    document.body.style.overflow = "hidden";
  } else {
    document.body.style.overflow = "auto";
  }
  return () => (document.body.style.overflow = "auto");
}, [showAddModal]);
  
  useEffect(() => {
    fetchTasks();
    fetchProjects();
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
        .filter(task => ["Not Started", "In Progress"].includes(task.status))
        .map(task => ({
          ...task,
          customer_name: task.projects?.customer_name || `Project ${task.project_id}`
        }));

      setTasks(filtered);

      const completedToday = data.filter(task => 
        task.status === "Completed" && task.due_date === today
      ).length;
      setCompletedCount(completedToday);

    } catch (error) {
      setError("Failed to load tasks");
    } finally {
      setIsLoading(false);
    }
  };

const fetchProjects = async () => {
  const { data, error } = await supabase
    .from("projects")
    .select("id, customer_name, project_name")
    .order("customer_name", { ascending: true });
  if (!error) setProjects(data);
};

  const today = new Date().toISOString().split("T")[0];
  const isOverdue = (due) => due && due < today;

  const getStatusIcon = (status) => {
    switch (status) {
      case "In Progress": return <Play size={10} className="status-icon in-progress" />;
      case "Not Started": return <Clock size={10} className="status-icon open" />;
      default: return null;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "No due date";
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (date.toDateString() === today.toDateString()) return "Today";
    else if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";
    else return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
  };

  const completeTask = async (task) => {
    setCompletingTask(task.id);
    try {
      const { error } = await supabase
        .from("project_tasks")
        .update({ status: "Completed" })
        .eq("id", task.id);
      if (error) return;

      setTimeout(() => {
        setTasks(prev => prev.filter(t => t.id !== task.id));
        setCompletedCount(prev => prev + 1);
      }, 300);

      setShowToast({ message: `"${task.description}" completed!`, type: 'success' });
      setTimeout(() => setShowToast(null), 3000);

    } catch (error) {
      console.error(error);
    } finally {
      setTimeout(() => setCompletingTask(null), 300);
    }
  };

  const updateTaskStatus = async (taskId, newStatus) => {
    setUpdatingTask(taskId);
    try {
      const { error } = await supabase
        .from("project_tasks")
        .update({ status: newStatus })
        .eq("id", taskId);
      if (error) return false;
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
      setShowDropdown(null);
      return true;
    } catch (error) {
      console.error(error);
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

  const handleDragEnd = () => setDraggedTask(null);

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

  const createNewProject = async () => {
    if (!newProjectName.trim()) return alert("Please enter a project name");
    const { data, error } = await supabase
      .from("projects")
      .insert([{ customer_name: newProjectName }])
      .select("id, customer_name")
      .single();
    if (error) {
      alert("Failed to create project");
      return;
    }
    setProjects(prev => [...prev, data]);
    setNewTask({ ...newTask, project_id: data.id });
    setNewProjectName("");
    setIsCreatingProject(false);
    setShowToast({ message: `Project "${data.customer_name}" created!`, type: "success" });
    setTimeout(() => setShowToast(null), 3000);
  };

  const addNewTask = async () => {
    if (!newTask.description || !newTask.project_id)
      return alert("Please fill all fields");

    const { data, error } = await supabase
      .from("project_tasks")
      .insert([newTask])
      .select("id, description, status, due_date, project_id, projects(customer_name)")
      .single();

    if (error) {
      alert("Failed to add task");
      return;
    }

    const addedTask = {
      ...data,
      customer_name: data.projects?.customer_name || "New Project"
    };
    setTasks(prev => [...prev, addedTask]);
    setShowAddModal(false);
    setNewTask({ description: "", due_date: "", status: "Not Started", project_id: "" });

    setShowToast({ message: `Task "${addedTask.description}" added!`, type: "success" });
    setTimeout(() => setShowToast(null), 3000);
  };

  const notStartedTasks = tasks.filter(t => t.status === "Not Started");
  const inProgressTasks = tasks.filter(t => t.status === "In Progress");

  const TaskCard = ({ task }) => (
    <div 
      key={task.id} 
      className={`task-card ${isOverdue(task.due_date) ? "overdue" : ""} ${updatingTask === task.id ? "updating" : ""} ${completingTask === task.id ? "completing" : ""}`}
      draggable={!completingTask}
      onDragStart={(e) => handleDragStart(e, task)}
      onDragEnd={handleDragEnd}
      onClick={(e) => {
        if (!e.target.closest('.task-actions') && !e.target.closest('.complete-btn')) {
          scrollToProject(task.project_id);
        }
      }}
    >
      <div className="task-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div className="task-title">{task.description}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <button
              className="complete-btn"
              onClick={(e) => { e.stopPropagation(); completeTask(task); }}
              disabled={completingTask === task.id || updatingTask === task.id}
              title="Mark as completed"
            >
              <Check size={12} />
            </button>
            <div className="task-actions">
              <button
                className="task-menu-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDropdown(showDropdown === task.id ? null : task.id);
                }}
                disabled={updatingTask === task.id || completingTask === task.id}
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
        </div>
        <div className="project-name">
          <Building2 size={10} className="project-icon" />
          {task.customer_name}
        </div>
      </div>
      <div className="task-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
          {getStatusIcon(task.status)}
          <span style={{ fontSize: '0.65rem', color: '#64748b' }}>{task.status}</span>
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Today's Tasks</h2>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            {completedCount > 0 && (
              <div className="completed-counter">
                <Check size={14} />
                <span>{completedCount} completed today</span>
              </div>
            )}
            <button className="confirm-btn add-task-btn" onClick={() => setShowAddModal(true)}>
  <Plus size={14} style={{ marginRight: "4px" }} /> Add Task
</button>
          </div>
        </div>
      </header>

      {/* Toast Notification */}
      {showToast && (
        <div className={`toast toast-${showToast.type}`}>
          <Check size={16} />
          {showToast.message}
        </div>
      )}

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
          <div className="kanban-column" onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, "Not Started")}>
            <h3 className="column-title">Not Started</h3>
            {notStartedTasks.length > 0 ? (
              notStartedTasks.map(task => <TaskCard key={task.id} task={task} />)
            ) : (
              <div className="empty-column">No tasks to start</div>
            )}
          </div>

          <div className="kanban-column" onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, "In Progress")}>
            <h3 className="column-title">In Progress</h3>
            {inProgressTasks.length > 0 ? (
              inProgressTasks.map(task => <TaskCard key={task.id} task={task} />)
            ) : (
              <div className="empty-column">No tasks in progress</div>
            )}
          </div>
        </div>
      )}

      {/* Modern Add Task Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal modern">
            <h3 className="modal-title">Add New Task</h3>

            <div className="modal-section">
              <h4><Clipboard size={14} /> Task Info</h4>
              <input
                type="text"
                placeholder="Task description"
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              />
              <div className="input-group">
                <Calendar size={14} />
                <input
                  type="date"
                  value={newTask.due_date}
                  onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                />
              </div>
            </div>

            <div className="modal-section">
              <h4><Building2 size={14} /> Project Link</h4>
              {!isCreatingProject ? (
                <select
                  value={newTask.project_id}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "new") {
                      setIsCreatingProject(true);
                      setNewTask({ ...newTask, project_id: "" });
                    } else {
                      setNewTask({ ...newTask, project_id: value });
                    }
                  }}
                >
                  <option value="">Select Project</option>
                {projects.map(p => (
  <option key={p.id} value={p.id}>
    {p.customer_name} – {p.project_name || "(No project name)"}
  </option>
))}
                </select>
              ) : (
                <div className="new-project-field">
                  <input
                    type="text"
                    placeholder="Enter new project name"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                  />
                  <div className="modal-inline-actions">
                    <button onClick={() => setIsCreatingProject(false)} className="cancel-small-btn">Cancel</button>
                    <button onClick={createNewProject} className="confirm-small-btn">Save</button>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button className="confirm-btn" onClick={addNewTask}>Save Task</button>
              <button className="cancel-btn" onClick={() => setShowAddModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
