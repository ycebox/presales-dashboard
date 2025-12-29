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
  FaBullseye,
  FaRocket,
  FaFileAlt,
} from "react-icons/fa";

// ---------- Helpers ----------
const safeLower = (v) => (typeof v === "string" ? v.toLowerCase() : "");

const TASK_STATUSES = ["Not Started", "In Progress", "Completed", "Cancelled/On-hold"];
const TASK_PRIORITIES = ["High", "Normal", "Low"];

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

// smartvista_modules is VARCHAR in your schema, treat it as comma-separated
const toModulesArray = (value) => {
  if (!value) return [];
  return String(value)
    .split(/[,\n;]+/g)
    .map((x) => x.trim())
    .filter(Boolean);
};

// ---------- Task Modal ----------
const TaskModal = ({
  isOpen,
  onClose,
  onSave,
  editingTask = null,
  presalesResources = [],
  taskTypes = [],
}) => {
  const [taskData, setTaskData] = useState({
    description: "",
    status: "Not Started",
    priority: "Normal",
    estimated_hours: "",
    start_date: "",
    end_date: "",
    due_date: "",
    notes: "",
    assignee: "",
    task_type: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    if (editingTask) {
      setTaskData({
        description: editingTask.description || "",
        status: editingTask.status || "Not Started",
        priority: editingTask.priority || "Normal",
        estimated_hours:
          editingTask.estimated_hours === null || editingTask.estimated_hours === undefined
            ? ""
            : String(editingTask.estimated_hours),
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
        priority: "Normal",
        estimated_hours: "",
        start_date: "",
        end_date: "",
        due_date: "",
        notes: "",
        assignee: "",
        task_type: "",
      });
    }
  }, [editingTask, isOpen]);

  const handleChange = (field, value) => setTaskData((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!taskData.description.trim()) {
      alert("Task description is required");
      return;
    }

    setLoading(true);
    try {
      const normalized = {
        ...taskData,
        estimated_hours:
          taskData.estimated_hours === "" ||
          taskData.estimated_hours === null ||
          taskData.estimated_hours === undefined
            ? null
            : Number(taskData.estimated_hours),
      };

      if (normalized.estimated_hours !== null) {
        if (Number.isNaN(normalized.estimated_hours) || normalized.estimated_hours < 0) {
          alert("Estimated hours must be a valid number (0 or higher).");
          setLoading(false);
          return;
        }
      }

      await onSave(normalized);
      onClose();
    } catch (err) {
      console.error("Task save error:", err);
      alert(`Failed to save task: ${err?.message || "Unknown error"}`);
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
          <button className="icon-button" onClick={onClose} aria-label="Close" type="button">
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-grid">
            <div className="form-group form-group-full">
              <label className="form-label">Description</label>
              <input
                className="form-input"
                value={taskData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="What needs to be done?"
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
              <label className="form-label">Priority</label>
              <select
                className="form-input"
                value={taskData.priority}
                onChange={(e) => handleChange("priority", e.target.value)}
              >
                {TASK_PRIORITIES.map((p) => (
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
                <option value="">-</option>
                {taskTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
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
                <option value="">-</option>
                {presalesResources.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Estimated Hours</label>
              <input
                className="form-input"
                type="number"
                value={taskData.estimated_hours}
                onChange={(e) => handleChange("estimated_hours", e.target.value)}
                placeholder="e.g. 4"
                min="0"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Start Date</label>
              <input
                className="form-input"
                type="date"
                value={taskData.start_date}
                onChange={(e) => handleChange("start_date", e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">End Date</label>
              <input
                className="form-input"
                type="date"
                value={taskData.end_date}
                onChange={(e) => handleChange("end_date", e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Due Date</label>
              <input
                className="form-input"
                type="date"
                value={taskData.due_date}
                onChange={(e) => handleChange("due_date", e.target.value)}
              />
            </div>

            <div className="form-group form-group-full">
              <label className="form-label">Notes</label>
              <textarea
                className="form-input"
                rows={3}
                value={taskData.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                placeholder="Optional notes…"
              />
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
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
  const [logData, setLogData] = useState({ title: "", content: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (editingLog) {
      setLogData({
        title: editingLog.title || "",
        content: editingLog.content || "",
      });
    } else {
      setLogData({ title: "", content: "" });
    }
  }, [editingLog, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!logData.title.trim()) {
      alert("Log title is required");
      return;
    }
    setLoading(true);
    try {
      await onSave({ ...logData });
      onClose();
    } catch (err) {
      console.error("Log save error:", err);
      alert(`Failed to save log: ${err?.message || "Unknown error"}`);
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
          <button className="icon-button" onClick={onClose} aria-label="Close" type="button">
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-grid">
            <div className="form-group form-group-full">
              <label className="form-label">Title</label>
              <input
                className="form-input"
                value={logData.title}
                onChange={(e) => setLogData((p) => ({ ...p, title: e.target.value }))}
                placeholder="e.g. Workshop notes"
              />
            </div>

            <div className="form-group form-group-full">
              <label className="form-label">Content</label>
              <textarea
                className="form-input"
                rows={6}
                value={logData.content}
                onChange={(e) => setLogData((p) => ({ ...p, content: e.target.value }))}
                placeholder="Write your notes…"
              />
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <FaSave />
              <span>{loading ? "Saving..." : "Save Log"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ---------- Data Hook ----------
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

  const [modulesDraft, setModulesDraft] = useState("");

  // SmartVista Modules catalog (multi-select)
  const [moduleOptions, setModuleOptions] = useState([]);
  const [selectedModules, setSelectedModules] = useState([]);
  const [modulesOpen, setModulesOpen] = useState(false);
  const [moduleSearch, setModuleSearch] = useState("");

  // dropdown options
  const [presalesResources, setPresalesResources] = useState([]);
  const [taskTypes, setTaskTypes] = useState([]);

  useEffect(() => {
    const loadLists = async () => {
      try {
        const [
          { data: pData, error: pErr },
          { data: tData, error: tErr },
          { data: mData, error: mErr },
        ] = await Promise.all([
          supabase.from("presales_resources").select("name").order("name"),
          supabase.from("task_types").select("name").order("name"),
          supabase.from("smartvista_modules_catalog").select("name").order("name"),
        ]);

        if (pErr) console.warn("presales_resources load error:", pErr);
        if (tErr) console.warn("task_types load error:", tErr);
        if (mErr) console.warn("smartvista_modules_catalog load error:", mErr);

        setPresalesResources((pData || []).map((x) => x.name).filter(Boolean));
        setTaskTypes((tData || []).map((x) => x.name).filter(Boolean));
        setModuleOptions((mData || []).map((x) => x.name).filter(Boolean));
      } catch (e) {
        console.warn("Failed loading dropdown lists:", e);
      }
    };

    loadLists();
  }, []);

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
    else if (
      isProjectDueSoon ||
      dueNext7Count > 0 ||
      (daysSinceLastLog !== null && daysSinceLastLog > 14)
    )
      health = "AMBER";

    return { overdueCount, dueNext7Count, unassignedCount, lastLogDate, daysSinceLastLog, health };
  }, [project, tasks, logs]);

  useEffect(() => {
    if (project) {
      setEditProject({
        ...project,
        is_corporate: !!project.is_corporate,
      });

      const initialModules = toModulesArray(project.smartvista_modules);
      setSelectedModules(initialModules);
      setModulesDraft(initialModules.join(", "));
    }
  }, [project]);

  const activeTasksCount = tasks.filter((t) => !["Completed", "Cancelled/On-hold"].includes(t.status)).length;
  const completedTasksCount = tasks.filter((t) => t.status === "Completed").length;

  const filteredTasks = showCompleted
    ? tasks
    : tasks.filter((t) => !["Completed", "Cancelled/On-hold"].includes(t.status));

  const healthMeta = useMemo(() => {
    const h = projectMonitor.health;
    if (h === "RED") return { label: "At Risk", className: "health-red", Icon: FaExclamationTriangle };
    if (h === "AMBER") return { label: "Watch", className: "health-amber", Icon: FaClock };
    return { label: "Healthy", className: "health-green", Icon: FaCheckCircle };
  }, [projectMonitor.health]);

  const handleEditToggle = () => {
    if (isEditing) {
      setEditProject({
        ...project,
        is_corporate: !!project?.is_corporate,
      });

      const initialModules = toModulesArray(project?.smartvista_modules);
      setSelectedModules(initialModules);
      setModulesDraft(initialModules.join(", "));
      setModulesOpen(false);
      setModuleSearch("");

      setIsEditing(false);
    } else {
      setIsEditing(true);
    }
  };

  const handleEditChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (type === "checkbox") {
      setEditProject((prev) => ({ ...prev, [name]: !!checked }));
      return;
    }

    setEditProject((prev) => ({
      ...prev,
      [name]: type === "number" ? (value === "" ? "" : Number(value)) : value,
    }));
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

        smartvista_modules: (modulesDraft || "").trim() || null,

        next_key_activity: editProject.next_key_activity || "",
        remarks: editProject.remarks || "",

        primary_presales: (editProject.primary_presales || "").trim() || null,
        backup_presales: (editProject.backup_presales || "").trim() || null,
        bid_manager: (editProject.bid_manager || "").trim() || null,
        is_corporate: !!editProject.is_corporate,
      };

      const { error } = await supabase.from("projects").update(payload).eq("id", project.id);
      if (error) throw error;

      setProject((prev) => ({ ...prev, ...payload }));
      setIsEditing(false);
    } catch (err) {
      console.error("Error saving project:", err);
      alert(`Failed to save project changes: ${err?.message || "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  };

  // ---- SmartVista Modules multi-select helpers ----
  const updateSelectedModules = (next) => {
    const unique = Array.from(new Set((next || []).map((x) => String(x).trim()).filter(Boolean)));
    unique.sort((a, b) => a.localeCompare(b));
    setSelectedModules(unique);
    setModulesDraft(unique.join(", "));
  };

  const toggleModule = (name) => {
    const n = String(name || "").trim();
    if (!n) return;
    if (selectedModules.includes(n)) {
      updateSelectedModules(selectedModules.filter((x) => x !== n));
    } else {
      updateSelectedModules([...selectedModules, n]);
    }
  };

  const addCustomModule = (name) => {
    const n = String(name || "").trim();
    if (!n) return;
    if (!selectedModules.includes(n)) updateSelectedModules([...selectedModules, n]);
    setModuleSearch("");
  };

  useEffect(() => {
    if (!modulesOpen) return;

    const onMouseDown = (e) => {
      if (!e.target.closest(".modules-select")) setModulesOpen(false);
    };

    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [modulesOpen, selectedModules]);

  const openAddTask = () => {
    setEditingTask(null);
    setShowTaskModal(true);
  };

  const openEditTask = (task) => {
    setEditingTask(task);
    setShowTaskModal(true);
  };

  const deleteTask = async (taskId) => {
    if (!window.confirm("Delete this task?")) return;
    try {
      const { error } = await supabase.from("project_tasks").delete().eq("id", taskId);
      if (error) throw error;
      await fetchTasks();
    } catch (err) {
      console.error("Delete task error:", err);
      alert(`Failed to delete task: ${err?.message || "Unknown error"}`);
    }
  };

  const saveTask = async (taskPayload) => {
    if (!project?.id) return;

    if (editingTask?.id) {
      const { error } = await supabase.from("project_tasks").update(taskPayload).eq("id", editingTask.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("project_tasks").insert([{ ...taskPayload, project_id: project.id }]);
      if (error) throw error;
    }
    await fetchTasks();
  };

  const openAddLog = () => {
    setEditingLog(null);
    setShowLogModal(true);
  };

  const openEditLog = (log) => {
    setEditingLog(log);
    setShowLogModal(true);
  };

  const deleteLog = async (logId) => {
    if (!window.confirm("Delete this log?")) return;
    try {
      const { error } = await supabase.from("project_logs").delete().eq("id", logId);
      if (error) throw error;
      await fetchLogs();
    } catch (err) {
      console.error("Delete log error:", err);
      alert(`Failed to delete log: ${err?.message || "Unknown error"}`);
    }
  };

  const saveLog = async (logPayload) => {
    if (!project?.id) return;

    if (editingLog?.id) {
      const { error } = await supabase.from("project_logs").update(logPayload).eq("id", editingLog.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("project_logs").insert([{ ...logPayload, project_id: project.id }]);
      if (error) throw error;
    }
    await fetchLogs();
  };

  const viewOrEdit = isEditing ? editProject : project || {};
  const isReadOnly = !isEditing;

  if (loading) {
    return (
      <div className="page-wrap">
        <div className="page-title-row">
          <button className="btn btn-secondary" type="button" onClick={() => navigate(-1)}>
            <FaTimes />
            <span>Back</span>
          </button>
          <h1 className="page-title">Project Details</h1>
        </div>

        <div className="panel">
          <div className="panel-body">
            <p className="muted">Loading project…</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="page-wrap">
        <div className="page-title-row">
          <button className="btn btn-secondary" type="button" onClick={() => navigate(-1)}>
            <FaTimes />
            <span>Back</span>
          </button>
          <h1 className="page-title">Project Details</h1>
        </div>

        <div className="panel">
          <div className="panel-body">
            <p className="muted">{error || "Project not found"}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrap">
      <div className="page-title-row">
        <button className="btn btn-secondary" type="button" onClick={() => navigate(-1)}>
          <FaTimes />
          <span>Back</span>
        </button>

        <div className="page-title-wrap">
          <h1 className="page-title">{project.project_name || "Project"}</h1>
          <div className="subtitle-row">
            <div className={`stage-pill ${getSalesStageClass(project.sales_stage)}`}>
              <span className="stage-icon">{getSalesStageIcon(project.sales_stage)}</span>
              <span>{project.sales_stage || "Active"}</span>
            </div>

            <div className={`health-pill ${healthMeta.className}`}>
              <healthMeta.Icon />
              <span>{healthMeta.label}</span>
            </div>

            <div className="subtitle-item">
              <FaUsers />
              <span className="subtitle-label">Customer:</span>
              <span className="subtitle-value">{project.customer_name || "-"}</span>
            </div>

            <div className="subtitle-item">
              <FaCalendarAlt />
              <span className="subtitle-label">Due:</span>
              <span className="subtitle-value">{formatDate(project.due_date)}</span>
            </div>

            <div className="subtitle-item">
              <FaDollarSign />
              <span className="subtitle-label">Value:</span>
              <span className="subtitle-value">{formatCurrency(project.deal_value)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="layout-grid">
        {/* Left Column: Details */}
        <div className="col-left">
          <div className="panel">
            <div className="panel-header">
              <div className="panel-title">
                <FaInfo />
                <span>Project Info</span>
              </div>

              <div className="panel-actions">
                {!isEditing ? (
                  <button className="btn btn-primary" onClick={handleEditToggle} type="button">
                    <FaEdit />
                    <span>Edit Project</span>
                  </button>
                ) : (
                  <>
                    <button
                      className="btn btn-secondary"
                      onClick={handleEditToggle}
                      disabled={saving}
                      type="button"
                    >
                      <FaTimes />
                      <span>Cancel</span>
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={saveProjectEdits}
                      disabled={saving}
                      type="button"
                    >
                      <FaSave />
                      <span>{saving ? "Saving..." : "Save"}</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className={`project-edit-grid ${isReadOnly ? "is-readonly" : ""}`}>
              <div className="form-group">
                <label className="form-label">
                  <FaBullseye className="form-icon" />
                  Project Name
                </label>
                <input
                  type="text"
                  name="project_name"
                  value={viewOrEdit.project_name || ""}
                  onChange={isReadOnly ? undefined : handleEditChange}
                  className="form-input"
                  readOnly={isReadOnly}
                  disabled={isReadOnly}
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
                  value={viewOrEdit.customer_name || ""}
                  onChange={isReadOnly ? undefined : handleEditChange}
                  className="form-input"
                  readOnly={isReadOnly}
                  disabled={isReadOnly}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Account Manager</label>
                <input
                  type="text"
                  name="account_manager"
                  value={viewOrEdit.account_manager || ""}
                  onChange={isReadOnly ? undefined : handleEditChange}
                  className="form-input"
                  readOnly={isReadOnly}
                  disabled={isReadOnly}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Country</label>
                <input
                  type="text"
                  name="country"
                  value={viewOrEdit.country || ""}
                  onChange={isReadOnly ? undefined : handleEditChange}
                  className="form-input"
                  readOnly={isReadOnly}
                  disabled={isReadOnly}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Primary Presales</label>
                <select
                  className="form-input"
                  name="primary_presales"
                  value={viewOrEdit.primary_presales || ""}
                  onChange={isReadOnly ? undefined : handleEditChange}
                  disabled={isReadOnly}
                >
                  <option value="">-</option>
                  {presalesResources.map((p) => (
                    <option key={`pp-${p}`} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Backup Presales</label>
                <select
                  className="form-input"
                  name="backup_presales"
                  value={viewOrEdit.backup_presales || ""}
                  onChange={isReadOnly ? undefined : handleEditChange}
                  disabled={isReadOnly}
                >
                  <option value="">-</option>
                  {presalesResources.map((p) => (
                    <option key={`bp-${p}`} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              {/* ✅ NEW FIELD */}
              <div className="form-group">
                <label className="form-label">Bid Manager</label>
                <input
                  type="text"
                  name="bid_manager"
                  value={viewOrEdit.bid_manager || ""}
                  onChange={isReadOnly ? undefined : handleEditChange}
                  className="form-input"
                  readOnly={isReadOnly}
                  disabled={isReadOnly}
                  placeholder="Enter bid manager name"
                />
              </div>

              <div className="form-group form-group-full">
                <label className="form-label" style={{ marginBottom: 8 }}>
                  Corporate
                </label>
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    name="is_corporate"
                    checked={!!viewOrEdit.is_corporate}
                    onChange={isReadOnly ? undefined : handleEditChange}
                    disabled={isReadOnly}
                  />
                  Corporate project
                </label>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <FaChartLine className="form-icon" />
                  Sales Stage
                </label>
                <input
                  type="text"
                  name="sales_stage"
                  value={viewOrEdit.sales_stage || ""}
                  onChange={isReadOnly ? undefined : handleEditChange}
                  className="form-input"
                  readOnly={isReadOnly}
                  disabled={isReadOnly}
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
                  value={viewOrEdit.deal_value ?? ""}
                  onChange={isReadOnly ? undefined : handleEditChange}
                  className="form-input"
                  readOnly={isReadOnly}
                  disabled={isReadOnly}
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
                  value={viewOrEdit.due_date || ""}
                  onChange={isReadOnly ? undefined : handleEditChange}
                  className="form-input"
                  readOnly={isReadOnly}
                  disabled={isReadOnly}
                />
              </div>

              <div className="form-group form-group-full">
                <label className="form-label">SmartVista Modules</label>

                {isEditing ? (
                  <div className="modules-select">
                    <button
                      type="button"
                      className="form-input modules-select-trigger"
                      onClick={() => setModulesOpen((v) => !v)}
                    >
                      {selectedModules.length > 0 ? (
                        <span className="modules-selected">
                          {selectedModules.slice(0, 3).join(", ")}
                          {selectedModules.length > 3 ? ` +${selectedModules.length - 3} more` : ""}
                        </span>
                      ) : (
                        <span className="muted">Select modules…</span>
                      )}
                      <span className="modules-caret">{modulesOpen ? <FaEyeSlash /> : <FaEye />}</span>
                    </button>

                    {modulesOpen && (
                      <div className="modules-dropdown">
                        <div className="modules-search">
                          <input
                            className="form-input"
                            value={moduleSearch}
                            onChange={(e) => setModuleSearch(e.target.value)}
                            placeholder="Search or type to add…"
                          />
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => addCustomModule(moduleSearch)}
                            disabled={!moduleSearch.trim()}
                          >
                            <FaPlus />
                            <span>Add</span>
                          </button>
                        </div>

                        <div className="modules-list">
                          {(moduleOptions || [])
                            .filter((m) => safeLower(m).includes(safeLower(moduleSearch)))
                            .slice(0, 80)
                            .map((m) => (
                              <label key={m} className="modules-item">
                                <input
                                  type="checkbox"
                                  checked={selectedModules.includes(m)}
                                  onChange={() => toggleModule(m)}
                                />
                                <span>{m}</span>
                              </label>
                            ))}
                        </div>

                        <div className="modules-footer">
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => {
                              updateSelectedModules([]);
                              setModulesOpen(false);
                            }}
                          >
                            Clear
                          </button>
                          <button type="button" className="btn btn-primary" onClick={() => setModulesOpen(false)}>
                            Done
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="readonly-box">
                    {toModulesArray(viewOrEdit.smartvista_modules).length > 0
                      ? toModulesArray(viewOrEdit.smartvista_modules).join(", ")
                      : "-"}
                  </div>
                )}
              </div>

              <div className="form-group form-group-full">
                <label className="form-label">Scope</label>
                <textarea
                  name="scope"
                  value={viewOrEdit.scope || ""}
                  onChange={isReadOnly ? undefined : handleEditChange}
                  className="form-input"
                  readOnly={isReadOnly}
                  disabled={isReadOnly}
                  rows={4}
                />
              </div>

              <div className="form-group form-group-full">
                <label className="form-label">Next Key Activity</label>
                <textarea
                  name="next_key_activity"
                  value={viewOrEdit.next_key_activity || ""}
                  onChange={isReadOnly ? undefined : handleEditChange}
                  className="form-input"
                  readOnly={isReadOnly}
                  disabled={isReadOnly}
                  rows={3}
                />
              </div>

              <div className="form-group form-group-full">
                <label className="form-label">Remarks</label>
                <textarea
                  name="remarks"
                  value={viewOrEdit.remarks || ""}
                  onChange={isReadOnly ? undefined : handleEditChange}
                  className="form-input"
                  readOnly={isReadOnly}
                  disabled={isReadOnly}
                  rows={4}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Tasks */}
        <div className="col-right">
          <div className="panel">
            <div className="panel-header">
              <div className="panel-title">
                <FaTasks />
                <span>Tasks</span>
              </div>

              <div className="panel-actions">
                <button className="btn btn-secondary" type="button" onClick={() => setShowCompleted((v) => !v)}>
                  {showCompleted ? <FaEyeSlash /> : <FaEye />}
                  <span>{showCompleted ? "Hide Completed" : "Show Completed"}</span>
                </button>

                <button className="btn btn-primary" type="button" onClick={openAddTask}>
                  <FaPlus />
                  <span>Add Task</span>
                </button>
              </div>
            </div>

            <div className="panel-body">
              <div className="kpi-row">
                <div className="kpi">
                  <div className="kpi-label">Open</div>
                  <div className="kpi-value">{activeTasksCount}</div>
                </div>
                <div className="kpi">
                  <div className="kpi-label">Completed</div>
                  <div className="kpi-value">{completedTasksCount}</div>
                </div>
                <div className="kpi">
                  <div className="kpi-label">Overdue</div>
                  <div className="kpi-value">{projectMonitor.overdueCount}</div>
                </div>
                <div className="kpi">
                  <div className="kpi-label">Unassigned</div>
                  <div className="kpi-value">{projectMonitor.unassignedCount}</div>
                </div>
              </div>

              {filteredTasks.length === 0 ? (
                <div className="empty-state">
                  <p className="muted">No tasks yet.</p>
                </div>
              ) : (
                <div className="task-list">
                  {filteredTasks.map((t) => (
                    <div key={t.id} className="task-item">
                      <div className="task-top">
                        <div className="task-title">{t.description}</div>
                        <div className="task-actions">
                          <button className="icon-button" onClick={() => openEditTask(t)} type="button">
                            <FaEdit />
                          </button>
                          <button className="icon-button danger" onClick={() => deleteTask(t.id)} type="button">
                            <FaTrash />
                          </button>
                        </div>
                      </div>

                      <div className="task-meta">
                        <span className={`badge status-${safeLower(t.status).replace(/[^a-z]+/g, "-")}`}>
                          {t.status || "-"}
                        </span>
                        <span className={`badge prio-${safeLower(t.priority)}`}>{t.priority || "-"}</span>
                        <span className="meta-item">
                          <FaUsers /> {t.assignee || "-"}
                        </span>
                        <span className="meta-item">
                          <FaCalendarAlt /> Due: {formatDate(t.due_date)}
                        </span>
                        {t.task_type ? (
                          <span className="meta-item">
                            <FaBullseye /> {t.task_type}
                          </span>
                        ) : null}
                      </div>

                      {t.notes ? <div className="task-notes">{t.notes}</div> : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Logs */}
          <div className="panel">
            <div className="panel-header">
              <div className="panel-title">
                <FaBookOpen />
                <span>Project Logs</span>
              </div>

              <div className="panel-actions">
                <button className="btn btn-primary" type="button" onClick={openAddLog}>
                  <FaPlus />
                  <span>Add Log</span>
                </button>
              </div>
            </div>

            <div className="panel-body">
              {logs.length === 0 ? (
                <div className="empty-state">
                  <p className="muted">No logs yet.</p>
                </div>
              ) : (
                <div className="log-list">
                  {logs.map((l) => (
                    <div key={l.id} className="log-item">
                      <div className="log-top">
                        <div className="log-title">{l.title}</div>
                        <div className="log-actions">
                          <button className="icon-button" onClick={() => openEditLog(l)} type="button">
                            <FaEdit />
                          </button>
                          <button className="icon-button danger" onClick={() => deleteLog(l.id)} type="button">
                            <FaTrash />
                          </button>
                        </div>
                      </div>
                      <div className="log-meta">
                        <span className="muted">{formatDate(l.created_at)}</span>
                      </div>
                      {l.content ? <div className="log-content">{l.content}</div> : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
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
