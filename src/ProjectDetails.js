// ProjectDetails.js
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";
import "./ProjectDetails.css";
import {
  FaTasks,
  FaBookOpen,
  FaEdit,
  FaSave,
  FaTimes,
  FaPlus,
  FaInfo,
  FaTrash,
  FaUsers,
  FaCalendarAlt,
  FaDollarSign,
  FaChartLine,
  FaCheckCircle,
  FaClock,
  FaExclamationTriangle,
  FaEye,
  FaEyeSlash,
  FaProjectDiagram,
  FaBullseye,
  FaRocket,
  FaFileAlt,
} from "react-icons/fa";

// ---------- Helpers ----------
const safeLower = (v) => (typeof v === "string" ? v.toLowerCase() : "");

const TASK_STATUSES = ["Not Started", "In Progress", "Completed", "Cancelled/On-hold"];

const formatDate = (dateString) => {
  if (!dateString) return "-";
  try {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "-";
  }
};

const formatCurrency = (value) => {
  if (value === null || value === undefined || value === "") return "-";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(Number(value));
  } catch {
    return value;
  }
};

const getSalesStageIcon = (stage) => {
  const s = safeLower(stage);
  if (s.includes("lead")) return <FaBullseye />;
  if (s.includes("opportunity")) return <FaRocket />;
  if (s.includes("proposal")) return <FaFileAlt />;
  if (s.includes("contract")) return <FaChartLine />;
  if (s.includes("done") || s.includes("closed-won")) return <FaCheckCircle />;
  return <FaBullseye />;
};

const getSalesStageClass = (stage) => {
  if (!stage) return "stage-active";
  const s = stage.toLowerCase();
  if (s.includes("closed-won")) return "stage-won";
  if (s.includes("closed-lost")) return "stage-lost";
  if (s.includes("closed-cancelled")) return "stage-cancelled";
  return "stage-active";
};

// ---------- Task Modal ----------
const TaskModal = ({ isOpen, onClose, onSave, editingTask = null, presalesResources = [], taskTypes = [] }) => {
  const [taskData, setTaskData] = useState({
    description: "",
    status: "Not Started",
    start_date: "",
    end_date: "",
    due_date: "",
    notes: "",
    assignee: "",
    task_type: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (editingTask) {
        setTaskData({
          description: editingTask.description || "",
          status: editingTask.status || "Not Started",
          start_date: editingTask.start_date || "",
          end_date: editingTask.end_date || "",
          due_date: editingTask.due_date || "",
          notes: editingTask.notes || "",
          assignee: editingTask.assignee || "",
          task_type: editingTask.task_type || "",
        });
      } else {
        setTaskData({
          description: "",
          status: "Not Started",
          start_date: "",
          end_date: "",
          due_date: "",
          notes: "",
          assignee: "",
          task_type: "",
        });
      }
    }
  }, [editingTask, isOpen]);

  const handleChange = (field, value) => {
    setTaskData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!taskData.description.trim()) {
      alert("Task description is required");
      return;
    }
    setLoading(true);

    try {
      await onSave(taskData);
      onClose();
    } catch (err) {
      console.error("Task save error:", err);
      alert("Failed to save task. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">
            <FaTasks />
            <span>{editingTask ? "Edit Task" : "Add Task"}</span>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Description</label>
              <input
                className="form-input"
                value={taskData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="Enter task description"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Status</label>
              <select
                className="form-input"
                value={taskData.status}
                onChange={(e) => handleChange("status", e.target.value)}
              >
                {TASK_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Assignee</label>
              <select
                className="form-input"
                value={taskData.assignee}
                onChange={(e) => handleChange("assignee", e.target.value)}
              >
                <option value="">Unassigned</option>
                {(presalesResources || []).map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Task Type</label>
              <select
                className="form-input"
                value={taskData.task_type}
                onChange={(e) => handleChange("task_type", e.target.value)}
              >
                <option value="">Select type</option>
                {(taskTypes || []).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Start Date</label>
              <input
                type="date"
                className="form-input"
                value={taskData.start_date || ""}
                onChange={(e) => handleChange("start_date", e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">End Date</label>
              <input
                type="date"
                className="form-input"
                value={taskData.end_date || ""}
                onChange={(e) => handleChange("end_date", e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Due Date</label>
              <input
                type="date"
                className="form-input"
                value={taskData.due_date || ""}
                onChange={(e) => handleChange("due_date", e.target.value)}
              />
            </div>

            <div className="form-group form-group-full">
              <label className="form-label">Notes</label>
              <textarea
                className="form-textarea"
                value={taskData.notes || ""}
                onChange={(e) => handleChange("notes", e.target.value)}
                placeholder="Add notes / context"
              />
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="action-button secondary" onClick={onClose}>
              <FaTimes />
              <span>Cancel</span>
            </button>
            <button type="submit" className="action-button primary" disabled={loading}>
              <FaSave />
              <span>{loading ? "Saving..." : "Save Task"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ---------- Log Modal ----------
const LogModal = ({ isOpen, onClose, onSave, editingLog = null }) => {
  const [logText, setLogText] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLogText(editingLog?.notes || "");
    }
  }, [editingLog, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!logText.trim()) {
      alert("Log notes are required");
      return;
    }
    setLoading(true);

    try {
      await onSave(logText);
      onClose();
    } catch (err) {
      console.error("Log save error:", err);
      alert("Failed to save log. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">
            <FaBookOpen />
            <span>{editingLog ? "Edit Log" : "Add Log"}</span>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea
              className="form-textarea"
              value={logText}
              onChange={(e) => setLogText(e.target.value)}
              placeholder="Add progress update, decisions, meeting notes, etc."
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="action-button secondary" onClick={onClose}>
              <FaTimes />
              <span>Cancel</span>
            </button>
            <button type="submit" className="action-button primary" disabled={loading}>
              <FaSave />
              <span>{loading ? "Saving..." : "Save Log"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ---------- Loading/Error ----------
const LoadingState = () => (
  <div className="project-details-container theme-light">
    <div className="loading-state">
      <div className="spinner" />
      <div className="loading-text">
        <h2>Loading project...</h2>
        <p>Please wait a moment.</p>
      </div>
    </div>
  </div>
);

const ErrorState = ({ error, onBack }) => (
  <div className="project-details-container theme-light">
    <div className="error-state">
      <div className="error-icon-wrapper">
        <FaExclamationTriangle className="error-icon" />
      </div>
      <h2 className="error-title">Something went wrong</h2>
      <p className="error-message">{error || "Project not found"}</p>
      <button onClick={onBack} className="action-button primary">
        <span>Back to Home</span>
      </button>
    </div>
  </div>
);

const useProjectData = (projectId) => {
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from("project_tasks")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (err) {
      console.error("Error fetching tasks:", err);
    }
  };

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from("project_logs")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error("Error fetching logs:", err);
    }
  };

  const fetchProjectDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.from("projects").select("*").eq("id", projectId).single();
      if (error) throw error;

      setProject(data);
      await Promise.all([fetchTasks(), fetchLogs()]);
    } catch (err) {
      console.error("Error fetching project:", err);
      setError(err.message || "Failed to load project");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) fetchProjectDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  return { project, setProject, tasks, logs, loading, error, fetchTasks, fetchLogs };
};

function ProjectDetails() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const { project, setProject, tasks, logs, loading, error, fetchTasks, fetchLogs } = useProjectData(projectId);

  const [isEditing, setIsEditing] = useState(false);
  const [editProject, setEditProject] = useState({});
  const [saving, setSaving] = useState(false);

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [editingLog, setEditingLog] = useState(null);
  const [showCompleted, setShowCompleted] = useState(false);

  // ---------- Monitoring: health + counters ----------
  const projectMonitor = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const addDays = (base, days) => {
      const d = new Date(base);
      d.setDate(d.getDate() + days);
      d.setHours(0, 0, 0, 0);
      return d;
    };

    const parseDate = (value) => {
      if (!value) return null;
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return null;
      d.setHours(0, 0, 0, 0);
      return d;
    };

    const isOpenTask = (t) => t?.status !== "Completed" && t?.status !== "Cancelled/On-hold";

    const openTasks = (tasks || []).filter(isOpenTask);

    const overdueCount = openTasks.filter((t) => {
      const due = parseDate(t?.due_date);
      return due && due < today;
    }).length;

    const dueNext7Count = openTasks.filter((t) => {
      const due = parseDate(t?.due_date);
      if (!due) return false;
      const limit = addDays(today, 7);
      return due >= today && due <= limit;
    }).length;

    const unassignedCount = openTasks.filter((t) => {
      const a = (t?.assignee || "").trim();
      return !a;
    }).length;

    const lastLogDate = (() => {
      const dates = (logs || [])
        .map((l) => (l?.created_at ? new Date(l.created_at) : null))
        .filter((d) => d && !Number.isNaN(d.getTime()))
        .sort((a, b) => b.getTime() - a.getTime());
      return dates[0] || null;
    })();

    const daysSinceLastLog = lastLogDate
      ? Math.floor((new Date().getTime() - lastLogDate.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    const projectDue = parseDate(project?.due_date);
    const isProjectOverdue = projectDue ? projectDue < today : false;
    const isProjectDueSoon = projectDue ? projectDue <= addDays(today, 14) && projectDue >= today : false;

    let health = "GREEN";
    if (isProjectOverdue || overdueCount > 0) health = "RED";
    else if (isProjectDueSoon || dueNext7Count > 0 || (daysSinceLastLog !== null && daysSinceLastLog > 14)) health = "AMBER";

    return {
      overdueCount,
      dueNext7Count,
      unassignedCount,
      lastLogDate,
      daysSinceLastLog,
      health,
      isProjectOverdue,
      isProjectDueSoon,
    };
  }, [project, tasks, logs]);

  const [presalesResources, setPresalesResources] = useState([]);
  const [taskTypes, setTaskTypes] = useState([]);

  const [isEditingBackground, setIsEditingBackground] = useState(false);
  const [backgroundDraft, setBackgroundDraft] = useState("");
  const [savingBackground, setSavingBackground] = useState(false);

  useEffect(() => {
    if (project) {
      setEditProject(project);
      setBackgroundDraft(project.remarks || "");
    }
  }, [project]);

  useEffect(() => {
    const fetchPresalesResources = async () => {
      try {
        const { data, error } = await supabase.from("presales_resources").select("name").order("name");
        if (error) throw error;
        setPresalesResources((data || []).map((d) => d.name).filter(Boolean));
      } catch (err) {
        console.warn("Failed to fetch presales resources:", err);
        setPresalesResources([]);
      }
    };

    const fetchTaskTypes = async () => {
      try {
        const { data, error } = await supabase.from("task_types").select("name").order("name");
        if (error) throw error;
        setTaskTypes((data || []).map((d) => d.name).filter(Boolean));
      } catch (err) {
        console.warn("Failed to fetch task types:", err);
        setTaskTypes([]);
      }
    };

    fetchPresalesResources();
    fetchTaskTypes();
  }, []);

  const handleBack = () => navigate(-1);

  const activeTasksCount = tasks.filter((t) => !["Completed", "Cancelled/On-hold"].includes(t.status)).length;
  const completedTasksCount = tasks.filter((t) => t.status === "Completed").length;

  const filteredTasks = showCompleted ? tasks : tasks.filter((t) => !["Completed", "Cancelled/On-hold"].includes(t.status));

  const healthMeta = useMemo(() => {
    const h = projectMonitor.health;
    if (h === "RED") {
      return { label: "At Risk", className: "health-red", Icon: FaExclamationTriangle };
    }
    if (h === "AMBER") {
      return { label: "Watch", className: "health-amber", Icon: FaClock };
    }
    return { label: "Healthy", className: "health-green", Icon: FaCheckCircle };
  }, [projectMonitor.health]);

  const handleEditToggle = () => {
    if (isEditing) {
      setEditProject(project);
      setIsEditing(false);
    } else {
      setIsEditing(true);
    }
  };

  const handleEditChange = (e) => {
    const { name, value, type } = e.target;
    setEditProject((prev) => ({ ...prev, [name]: type === "number" ? Number(value) : value }));
  };

  const saveProjectEdits = async () => {
    if (!project?.id) return;
    setSaving(true);
    try {
      const payload = {
        project_name: editProject.project_name || "",
        customer_name: editProject.customer_name || "",
        account_manager: editProject.account_manager || "",
        country: editProject.country || "",
        scope: editProject.scope || "",
        deal_value: editProject.deal_value === "" ? null : editProject.deal_value,
        sales_stage: editProject.sales_stage || "",
        due_date: editProject.due_date || null,
      };

      const { error } = await supabase.from("projects").update(payload).eq("id", project.id);
      if (error) throw error;

      setProject((prev) => ({ ...prev, ...payload }));
      setIsEditing(false);
    } catch (err) {
      console.error("Error saving project:", err);
      alert("Failed to save project changes.");
    } finally {
      setSaving(false);
    }
  };

  const saveBackground = async () => {
    if (!project?.id) return;
    setSavingBackground(true);
    try {
      const { error } = await supabase.from("projects").update({ remarks: backgroundDraft || "" }).eq("id", project.id);
      if (error) throw error;

      setProject((prev) => ({ ...prev, remarks: backgroundDraft || "" }));
      setIsEditingBackground(false);
    } catch (err) {
      console.error("Error saving background:", err);
      alert("Failed to save background.");
    } finally {
      setSavingBackground(false);
    }
  };

  const openAddTask = () => {
    setEditingTask(null);
    setShowTaskModal(true);
  };

  const openEditTask = (task) => {
    setEditingTask(task);
    setShowTaskModal(true);
  };

  const saveTask = async (taskData) => {
    if (!project?.id) return;
    if (editingTask?.id) {
      const { error } = await supabase.from("project_tasks").update(taskData).eq("id", editingTask.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("project_tasks").insert({ ...taskData, project_id: project.id });
      if (error) throw error;
    }
    await fetchTasks();
  };

  const deleteTask = async (taskId) => {
    if (!window.confirm("Delete this task?")) return;
    try {
      const { error } = await supabase.from("project_tasks").delete().eq("id", taskId);
      if (error) throw error;
      await fetchTasks();
    } catch (err) {
      console.error("Delete task error:", err);
      alert("Failed to delete task.");
    }
  };

  const openAddLog = () => {
    setEditingLog(null);
    setShowLogModal(true);
  };

  const openEditLog = (log) => {
    setEditingLog(log);
    setShowLogModal(true);
  };

  const saveLog = async (notes) => {
    if (!project?.id) return;
    if (editingLog?.id) {
      const { error } = await supabase.from("project_logs").update({ notes }).eq("id", editingLog.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("project_logs").insert({ project_id: project.id, notes });
      if (error) throw error;
    }
    await fetchLogs();
  };

  const deleteLog = async (logId) => {
    if (!window.confirm("Delete this log entry?")) return;
    try {
      const { error } = await supabase.from("project_logs").delete().eq("id", logId);
      if (error) throw error;
      await fetchLogs();
    } catch (err) {
      console.error("Delete log error:", err);
      alert("Failed to delete log.");
    }
  };

  const openCustomer = () => {
    if (!project?.customer_name) return;
    navigate(`/customer/${encodeURIComponent(project.customer_name)}`);
  };

  if (loading) return <LoadingState />;
  if (error || !project) return <ErrorState error={error} onBack={handleBack} />;

  return (
    <div className="project-details-container theme-light">
      <header className="top-bar">
        <button className="icon-link" onClick={handleBack}>
          <FaTimes />
          <span>Back</span>
        </button>

        <div className="top-bar-actions">
          <button className="action-button secondary" onClick={handleEditToggle}>
            <FaEdit />
            <span>{isEditing ? "Cancel Edit" : "Edit Project"}</span>
          </button>

          {project?.customer_name && (
            <button className="action-button secondary" onClick={openCustomer}>
              <FaUsers />
              <span>{project.customer_name}</span>
            </button>
          )}
        </div>
      </header>

      <section className="project-header">
        <div className="project-hero">
          <div className="project-title-section">
            <div className="project-icon-wrapper">
              <FaProjectDiagram className="project-icon" />
            </div>

            <div className="project-title-content">
              <div className="project-hero-row">
                <div className="project-hero-left">
                  <h1 className="project-title">{project.project_name || "Unnamed Project"}</h1>

                  <div className="project-customer-row">
                    <FaUsers className="subtitle-icon" />
                    <span className="project-customer-text">{project.customer_name || "No customer"}</span>
                  </div>

                  <div className="project-stage-row">
                    <span className={`stage-badge ${getSalesStageClass(project.sales_stage)}`}>
                      {getSalesStageIcon(project.sales_stage)}
                      <span>{project.sales_stage || "No Stage"}</span>
                    </span>
                  </div>
                </div>

                <div className="project-hero-right">
                  <div className="hero-badges">
                    <span className={`health-badge ${healthMeta.className}`}>
                      <healthMeta.Icon />
                      <span>{healthMeta.label}</span>
                    </span>

                    <span className={`metric-badge ${projectMonitor.overdueCount > 0 ? "metric-danger" : "metric-muted"}`}>
                      <FaExclamationTriangle />
                      <span>Overdue: {projectMonitor.overdueCount}</span>
                    </span>

                    <span className={`metric-badge ${projectMonitor.dueNext7Count > 0 ? "metric-warn" : "metric-muted"}`}>
                      <FaClock />
                      <span>Next 7d: {projectMonitor.dueNext7Count}</span>
                    </span>

                    <span className={`metric-badge ${projectMonitor.unassignedCount > 0 ? "metric-neutral" : "metric-muted"}`}>
                      <FaUsers />
                      <span>Unassigned: {projectMonitor.unassignedCount}</span>
                    </span>

                    <span className="metric-badge metric-muted">
                      <FaFileAlt />
                      <span>Last update: {projectMonitor.lastLogDate ? formatDate(projectMonitor.lastLogDate) : "-"}</span>
                    </span>
                  </div>

                  {project.deal_value !== null && project.deal_value !== undefined && (
                    <span className="deal-badge">
                      <FaDollarSign />
                      <span>{formatCurrency(project.deal_value)}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="main-content-grid">
        <div className="main-column">
          <section className="content-card">
            <div className="card-header">
              <div className="card-title">
                <FaInfo />
                <span>Project Details</span>
              </div>

              {isEditing && (
                <button className="action-button primary" onClick={saveProjectEdits} disabled={saving}>
                  <FaSave />
                  <span>{saving ? "Saving..." : "Save Changes"}</span>
                </button>
              )}
            </div>

            {!isEditing ? (
              <div className="details-grid">
                <div className="detail-item">
                  <span className="detail-label">Account Manager</span>
                  <span className="detail-value">{project.account_manager || "-"}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Country</span>
                  <span className="detail-value">{project.country || "-"}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Due Date</span>
                  <span className="detail-value">{formatDate(project.due_date)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Deal Value</span>
                  <span className="detail-value">{formatCurrency(project.deal_value)}</span>
                </div>

                <div className="detail-item detail-item-full">
                  <span className="detail-label">Scope</span>
                  <span className="detail-value">{project.scope || "-"}</span>
                </div>
              </div>
            ) : (
              <>
                <div className="project-edit-grid">
                  <div className="form-group">
                    <label className="form-label">
                      <FaBullseye className="form-icon" />
                      Project Name
                    </label>
                    <input
                      type="text"
                      name="project_name"
                      value={editProject.project_name || ""}
                      onChange={handleEditChange}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <FaUsers className="form-icon" />
                      Customer
                    </label>
                    <input
                      type="text"
                      name="customer_name"
                      value={editProject.customer_name || ""}
                      onChange={handleEditChange}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Account Manager</label>
                    <input
                      type="text"
                      name="account_manager"
                      value={editProject.account_manager || ""}
                      onChange={handleEditChange}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Country</label>
                    <input
                      type="text"
                      name="country"
                      value={editProject.country || ""}
                      onChange={handleEditChange}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <FaChartLine className="form-icon" />
                      Sales Stage
                    </label>
                    <input
                      type="text"
                      name="sales_stage"
                      value={editProject.sales_stage || ""}
                      onChange={handleEditChange}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <FaDollarSign className="form-icon" />
                      Deal Value (USD)
                    </label>
                    <input
                      type="number"
                      name="deal_value"
                      value={editProject.deal_value ?? ""}
                      onChange={handleEditChange}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <FaCalendarAlt className="form-icon" />
                      Due Date
                    </label>
                    <input
                      type="date"
                      name="due_date"
                      value={editProject.due_date || ""}
                      onChange={handleEditChange}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group form-group-full">
                    <label className="form-label">Scope</label>
                    <textarea
                      name="scope"
                      value={editProject.scope || ""}
                      onChange={handleEditChange}
                      className="form-textarea"
                    />
                  </div>
                </div>

                <div className="project-edit-actions">
                  <button className="action-button secondary" onClick={handleEditToggle} disabled={saving}>
                    <FaTimes />
                    <span>Cancel</span>
                  </button>
                  <button className="action-button primary" onClick={saveProjectEdits} disabled={saving}>
                    <FaSave />
                    <span>{saving ? "Saving..." : "Save"}</span>
                  </button>
                </div>
              </>
            )}
          </section>

          <section className="content-card">
            <div className="card-header">
              <div className="card-title">
                <FaInfo />
                <span>Customer Background</span>
              </div>

              {!isEditingBackground ? (
                <button className="action-button secondary" onClick={() => setIsEditingBackground(true)}>
                  <FaEdit />
                  <span>Edit</span>
                </button>
              ) : (
                <div className="inline-actions">
                  <button className="action-button secondary" onClick={() => { setBackgroundDraft(project.remarks || ""); setIsEditingBackground(false); }} disabled={savingBackground}>
                    <FaTimes />
                    <span>Cancel</span>
                  </button>
                  <button className="action-button primary" onClick={saveBackground} disabled={savingBackground}>
                    <FaSave />
                    <span>{savingBackground ? "Saving..." : "Save"}</span>
                  </button>
                </div>
              )}
            </div>

            {!isEditingBackground ? (
              <div className="notes-box">
                {project.remarks ? <p className="notes-text">{project.remarks}</p> : <p className="muted">No background yet.</p>}
              </div>
            ) : (
              <textarea
                className="notes-editor"
                value={backgroundDraft}
                onChange={(e) => setBackgroundDraft(e.target.value)}
                placeholder="Capture customer basics and background, their business, context, etc."
              />
            )}
          </section>
        </div>

        <div className="side-column">
          <section className="content-card">
            <div className="card-header">
              <div className="card-title">
                <FaTasks />
                <span>Tasks</span>
                <span className="pill">
                  {activeTasksCount} Active / {completedTasksCount} Done
                </span>
              </div>

              <div className="inline-actions">
                <button className="filter-button" onClick={() => setShowCompleted((p) => !p)}>
                  {showCompleted ? <FaEyeSlash /> : <FaEye />}
                  <span>{showCompleted ? "Hide Done" : "Show All"}</span>
                </button>

                <button className="action-button primary" onClick={openAddTask}>
                  <FaPlus />
                  <span>Add</span>
                </button>
              </div>
            </div>

            <div className="list">
              {filteredTasks.length === 0 ? (
                <div className="empty-state">
                  <p>No tasks yet.</p>
                </div>
              ) : (
                filteredTasks.map((t) => (
                  <div key={t.id} className={`list-item ${t.status === "Completed" ? "is-done" : ""}`}>
                    <div className="list-item-main" onClick={() => openEditTask(t)} role="button" tabIndex={0}>
                      <div className="list-item-top">
                        <span className={`status-tag status-${safeLower(t.status).replaceAll(" ", "-").replaceAll("/", "-")}`}>
                          {t.status}
                        </span>
                        {t.task_type && <span className="type-tag">{t.task_type}</span>}
                      </div>

                      <div className="list-item-title">{t.description}</div>

                      <div className="list-item-meta">
                        <span>
                          <FaUsers /> {t.assignee || "Unassigned"}
                        </span>
                        <span>
                          <FaCalendarAlt /> {formatDate(t.due_date)}
                        </span>
                      </div>

                      {t.notes && <div className="list-item-notes">{t.notes}</div>}
                    </div>

                    <div className="list-item-actions">
                      <button className="icon-button danger" onClick={() => deleteTask(t.id)} aria-label="Delete task">
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="content-card">
            <div className="card-header">
              <div className="card-title">
                <FaBookOpen />
                <span>Project Logs</span>
              </div>

              <button className="action-button primary" onClick={openAddLog}>
                <FaPlus />
                <span>Add</span>
              </button>
            </div>

            <div className="list">
              {logs.length === 0 ? (
                <div className="empty-state">
                  <p>No logs yet.</p>
                </div>
              ) : (
                logs.map((l) => (
                  <div key={l.id} className="list-item">
                    <div className="list-item-main" onClick={() => openEditLog(l)} role="button" tabIndex={0}>
                      <div className="list-item-top">
                        <span className="muted">
                          <FaCalendarAlt /> {formatDate(l.created_at)}
                        </span>
                      </div>
                      <div className="list-item-notes">{l.notes}</div>
                    </div>

                    <div className="list-item-actions">
                      <button className="icon-button danger" onClick={() => deleteLog(l.id)} aria-label="Delete log">
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>

      <TaskModal
        isOpen={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        onSave={saveTask}
        editingTask={editingTask}
        presalesResources={presalesResources}
        taskTypes={taskTypes}
      />

      <LogModal
        isOpen={showLogModal}
        onClose={() => setShowLogModal(false)}
        onSave={saveLog}
        editingLog={editingLog}
      />
    </div>
  );
}

export default ProjectDetails;
