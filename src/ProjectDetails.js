// ProjectDetails.js  (updated: Sales Stage dropdown values loaded from DB "sales_stages")
// Based on your latest uploaded ProjectDetails (3).js, updated to read sales stages from Supabase.

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";
import "./ProjectDetails.css";
import TaskModal from "./TaskModal";
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
  FaChevronRight,
  FaChevronDown,
} from "react-icons/fa";

// ---------- Helpers ----------
const safeLower = (v) => (typeof v === "string" ? v.toLowerCase() : "");

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

const toModulesArray = (value) => {
  if (!value) return [];
  return String(value)
    .split(/[,\n;]+/g)
    .map((x) => x.trim())
    .filter(Boolean);
};

const isStageClosedOrDone = (stage) => {
  const s = safeLower(stage);
  if (!s) return false;
  return (
    s.includes("done") ||
    s.includes("closed-won") ||
    s.includes("closed-lost") ||
    s.includes("closed-cancelled")
  );
};

const isTaskDoneOrHold = (status) => ["Completed", "Cancelled/On-hold"].includes(status || "");

const normalizeStatusKey = (s) => safeLower(s).replaceAll(" ", "-").replaceAll("/", "-");

// Fallback in case table is empty / not yet created
const DEFAULT_SALES_STAGES = ["Lead", "Opportunity", "Proposal", "Contracting", "Done"];

// ---------- Log Modal ----------
const LogModal = ({ isOpen, onClose, onSave, editingLog = null }) => {
  const [logText, setLogText] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) setLogText(editingLog?.notes || "");
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
      <button onClick={onBack} className="action-button primary" type="button">
        <span>Back</span>
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
      const { data, error: qErr } = await supabase
        .from("project_tasks")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (qErr) throw qErr;
      setTasks(data || []);
    } catch (err) {
      console.error("Error fetching tasks:", err);
    }
  };

  const fetchLogs = async () => {
    try {
      const { data, error: qErr } = await supabase
        .from("project_logs")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (qErr) throw qErr;
      setLogs(data || []);
    } catch (err) {
      console.error("Error fetching logs:", err);
    }
  };

  const fetchProjectDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: qErr } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (qErr) throw qErr;

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

  const { project, setProject, tasks, logs, loading, error, fetchTasks, fetchLogs } =
    useProjectData(projectId);

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
  const [taskTypeDefaultsMap, setTaskTypeDefaultsMap] = useState({});

  // ✅ Sales stages from DB
  const [salesStageOptions, setSalesStageOptions] = useState(DEFAULT_SALES_STAGES);

  // Bid manager load info
  const [bidManagerLoad, setBidManagerLoad] = useState(null);
  const [bidManagerLoadError, setBidManagerLoadError] = useState(null);

  // expanding parent groups
  const [expandedParents, setExpandedParents] = useState({});

  // Customer UUID lookup (so /customer/:customerId works)
  const [customerId, setCustomerId] = useState(null);

  useEffect(() => {
    const loadLists = async () => {
      try {
        const [
          { data: pData, error: pErr },
          { data: tData, error: tErr },
          { data: mData, error: mErr },
          { data: sData, error: sErr },
        ] = await Promise.all([
          supabase.from("presales_resources").select("name").order("name"),
          supabase
            .from("task_types")
            .select(
              "name, base_hours, buffer_pct, focus_hours_per_day, review_buffer_days, is_active, sort_order"
            )
            .eq("is_active", true)
            .order("sort_order", { ascending: true })
            .order("name", { ascending: true }),
          supabase.from("smartvista_modules_catalog").select("name").order("name"),

          // ✅ load sales stages from DB
          supabase
            .from("sales_stages")
            .select("name, sort_order, is_active")
            .eq("is_active", true)
            .order("sort_order", { ascending: true })
            .order("name", { ascending: true }),
        ]);

        if (pErr) console.warn("presales_resources load error:", pErr);
        if (tErr) console.warn("task_types load error:", tErr);
        if (mErr) console.warn("smartvista_modules_catalog load error:", mErr);
        if (sErr) console.warn("sales_stages load error:", sErr);

        setPresalesResources((pData || []).map((x) => x.name).filter(Boolean));

        const typeNames = (tData || []).map((x) => x.name).filter(Boolean);
        setTaskTypes(typeNames);

        const map = {};
        (tData || []).forEach((row) => {
          if (!row?.name) return;
          map[row.name] = {
            base_hours: row.base_hours ?? 4,
            buffer_pct: row.buffer_pct ?? 0.25,
            focus_hours_per_day: row.focus_hours_per_day ?? 3,
            review_buffer_days: row.review_buffer_days ?? 0,
          };
        });
        setTaskTypeDefaultsMap(map);

        setModuleOptions((mData || []).map((x) => x.name).filter(Boolean));

        // ✅ apply DB stages if available, else keep fallback
        const dbStages = (sData || []).map((x) => x.name).filter(Boolean);
        if (dbStages.length > 0) setSalesStageOptions(dbStages);
      } catch (e) {
        console.warn("Failed loading dropdown lists:", e);
      }
    };

    loadLists();
  }, []);

  // Customer ID lookup based on project.customer_name
  useEffect(() => {
    const lookupCustomerId = async () => {
      setCustomerId(null);
      const name = (project?.customer_name || "").trim();
      if (!name) return;

      try {
        const { data, error: qErr } = await supabase
          .from("customers")
          .select("id, customer_name")
          .eq("is_archived", false)
          .eq("customer_name", name)
          .maybeSingle();

        if (qErr) throw qErr;
        setCustomerId(data?.id || null);
      } catch (e) {
        console.warn("Customer ID lookup failed:", e);
        setCustomerId(null);
      }
    };

    lookupCustomerId();
  }, [project?.customer_name]);

  // Load bid manager "active projects count"
  useEffect(() => {
    const loadBidManagerLoad = async () => {
      setBidManagerLoad(null);
      setBidManagerLoadError(null);

      const bm = (project?.bid_manager || "").trim();
      const required = !!project?.bid_manager_required;

      if (!bm || !required) return;

      try {
        const { data, error: qErr } = await supabase
          .from("projects")
          .select("id, sales_stage, bid_manager, bid_manager_required")
          .eq("bid_manager_required", true)
          .eq("bid_manager", bm);

        if (qErr) throw qErr;

        const list = data || [];
        const active = list.filter((p) => !isStageClosedOrDone(p.sales_stage)).length;

        setBidManagerLoad({
          bid_manager: bm,
          total: list.length,
          active,
        });
      } catch (e) {
        console.warn("Failed to load bid manager load:", e);
        setBidManagerLoadError("Failed to compute bid manager load.");
      }
    };

    loadBidManagerLoad();
  }, [project?.bid_manager, project?.bid_manager_required, project?.id]);

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
    const isProjectDueSoon =
      projectDue ? projectDue <= addDays(today, 14) && projectDue >= today : false;

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
        bid_manager_required: !!project.bid_manager_required,
        bid_manager: project.bid_manager || "",
      });

      const initialModules = toModulesArray(project.smartvista_modules);
      setSelectedModules(initialModules);
      setModulesDraft(initialModules.join(", "));
    }
  }, [project]);

  // Group tasks into parent/children
  const { groupedParents, childrenByParent } = useMemo(() => {
    const list = Array.isArray(tasks) ? tasks : [];
    const childrenMap = {};
    const parents = [];

    list.forEach((t) => {
      const pid = t?.parent_task_id;
      if (pid) {
        if (!childrenMap[pid]) childrenMap[pid] = [];
        childrenMap[pid].push(t);
      } else {
        parents.push(t);
      }
    });

    parents.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

    Object.keys(childrenMap).forEach((pid) => {
      childrenMap[pid].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    });

    return {
      groupedParents: parents,
      childrenByParent: childrenMap,
    };
  }, [tasks]);

  // Expand state initialize
  useEffect(() => {
    setExpandedParents((prev) => {
      const next = { ...prev };
      groupedParents.forEach((p) => {
        const hasKids = (childrenByParent[p.id] || []).length > 0;
        if (hasKids && typeof next[p.id] === "undefined") next[p.id] = true;
      });
      return next;
    });
  }, [groupedParents, childrenByParent]);

  const activeTasksCount = tasks.filter((t) => !isTaskDoneOrHold(t.status)).length;
  const completedTasksCount = tasks.filter((t) => (t.status || "") === "Completed").length;

  const isVisible = (t) => (showCompleted ? true : !isTaskDoneOrHold(t.status));

  const filteredParentList = useMemo(() => {
    return groupedParents.filter(isVisible);
  }, [groupedParents, showCompleted]);

  const getParentProgress = (parentId) => {
    const kids = (childrenByParent[parentId] || []).filter(isVisible);
    const total = kids.length;
    if (!total) return { done: 0, total: 0, pct: 0 };
    const done = kids.filter((k) => (k.status || "") === "Completed").length;
    const pct = Math.round((done / total) * 100);
    return { done, total, pct };
  };

  // Parent task options for TaskModal
  const parentTaskOptions = useMemo(() => {
    return groupedParents
      .map((p) => ({ id: p.id, description: p.description || "(Untitled task)" }))
      .filter((x) => x.id);
  }, [groupedParents]);

  const healthMeta = useMemo(() => {
    const h = projectMonitor.health;
    if (h === "RED")
      return { label: "At Risk", className: "health-red", Icon: FaExclamationTriangle };
    if (h === "AMBER") return { label: "Watch", className: "health-amber", Icon: FaClock };
    return { label: "Healthy", className: "health-green", Icon: FaCheckCircle };
  }, [projectMonitor.health]);

  const handleEditToggle = () => {
    if (isEditing) {
      setEditProject({
        ...project,
        is_corporate: !!project?.is_corporate,
        bid_manager_required: !!project?.bid_manager_required,
        bid_manager: project?.bid_manager || "",
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
      if (name === "bid_manager_required") {
        setEditProject((prev) => ({
          ...prev,
          bid_manager_required: !!checked,
          bid_manager: checked ? prev.bid_manager || "" : "",
        }));
        return;
      }

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
      const requiresBM = !!editProject.bid_manager_required;
      const bmValue = requiresBM ? (editProject.bid_manager || "").trim() : "";

      const payload = {
        project_name: editProject.project_name || "",
        customer_name: editProject.customer_name || "",
        account_manager: editProject.account_manager || "",
        country: editProject.country || "",
        scope: editProject.scope || "",
        deal_value: editProject.deal_value === "" ? null : editProject.deal_value,

        // ✅ DB-backed dropdown value
        sales_stage: editProject.sales_stage || "",

        due_date: editProject.due_date || null,
        smartvista_modules: (modulesDraft || "").trim() || null,
        next_key_activity: editProject.next_key_activity || "",
        remarks: editProject.remarks || "",
        primary_presales: (editProject.primary_presales || "").trim() || null,
        backup_presales: (editProject.backup_presales || "").trim() || null,
        is_corporate: !!editProject.is_corporate,
        bid_manager_required: requiresBM,
        bid_manager: bmValue ? bmValue : null,
      };

      const { error: qErr } = await supabase.from("projects").update(payload).eq("id", project.id);
      if (qErr) throw qErr;

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

  const toggleParentExpand = (parentId) => {
    setExpandedParents((prev) => ({ ...prev, [parentId]: !prev[parentId] }));
  };

  const deleteTask = async (taskId) => {
    const hasKids = (childrenByParent[taskId] || []).length > 0;

    const msg = hasKids
      ? "This is a parent task with sub-tasks. Deleting it will NOT delete sub-tasks. Sub-tasks will become top-level tasks.\n\nContinue?"
      : "Delete this task?";

    if (!window.confirm(msg)) return;

    try {
      const { error: qErr } = await supabase.from("project_tasks").delete().eq("id", taskId);
      if (qErr) throw qErr;
      await fetchTasks();
    } catch (err) {
      console.error("Delete task error:", err);
      alert(`Failed to delete task: ${err?.message || "Unknown error"}`);
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

  const deleteLog = async (logId) => {
    if (!window.confirm("Delete this log entry?")) return;
    try {
      const { error: qErr } = await supabase.from("project_logs").delete().eq("id", logId);
      if (qErr) throw qErr;
      await fetchLogs();
    } catch (err) {
      console.error("Delete log error:", err);
      alert(`Failed to delete log: ${err?.message || "Unknown error"}`);
    }
  };

  const openCustomer = () => {
    const name = (project?.customer_name || "").trim();
    if (!name) return;

    if (!customerId) {
      alert(
        "I can’t open the CustomerDetails page because I can’t find this customer in the customers table.\n\n" +
          `Customer name: ${name}`
      );
      return;
    }

    navigate(`/customer/${customerId}`);
  };

  if (loading) return <LoadingState />;
  if (error || !project) return <ErrorState error={error} onBack={() => navigate(-1)} />;

  const isReadOnly = !isEditing;
  const viewOrEdit = isEditing ? editProject : project;

  // When editing a task, detect if it has children so TaskModal can lock hours
  const editingHasChildren =
    !!editingTask?.id && (childrenByParent[editingTask.id] || []).length > 0;

  return (
    <div className="project-details-container theme-light">
      <section className="project-header">
        <div className="project-hero">
          <div className="project-title-content">
            <div className="project-hero-row">
              <div className="project-hero-right hero-consolidated">
                <div className="hero-main-row">
                  <div className="hero-title-block">
                    <div className="hero-title-line">
                      <h1 className="project-title">{project.project_name || "Unnamed Project"}</h1>
                    </div>

                    <button
                      className="hero-customer-link"
                      onClick={openCustomer}
                      type="button"
                      title={customerId ? "Open customer" : "Customer not found in customers table"}
                    >
                      <FaUsers className="subtitle-icon" />
                      <span className="project-customer-text">
                        {project.customer_name || "No customer"}
                      </span>
                    </button>

                    <div className="hero-metrics-block">
                      <div className="hero-badges">
                        <span className={`stage-badge ${getSalesStageClass(project.sales_stage)}`}>
                          {getSalesStageIcon(project.sales_stage)}
                          <span>{project.sales_stage || "No Stage"}</span>
                        </span>

                        <span className={`health-badge ${healthMeta.className}`}>
                          <healthMeta.Icon />
                          <span>{healthMeta.label}</span>
                        </span>

                        {project.is_corporate ? (
                          <span className="metric-badge metric-muted">
                            <FaUsers />
                            <span>Corporate</span>
                          </span>
                        ) : null}

                        <span
                          className={`metric-badge ${
                            projectMonitor.overdueCount > 0 ? "metric-danger" : "metric-muted"
                          }`}
                        >
                          <FaExclamationTriangle />
                          <span>Overdue: {projectMonitor.overdueCount}</span>
                        </span>

                        <span
                          className={`metric-badge ${
                            projectMonitor.dueNext7Count > 0 ? "metric-warn" : "metric-muted"
                          }`}
                        >
                          <FaClock />
                          <span>Next 7d: {projectMonitor.dueNext7Count}</span>
                        </span>

                        <span
                          className={`metric-badge ${
                            projectMonitor.unassignedCount > 0 ? "metric-neutral" : "metric-muted"
                          }`}
                        >
                          <FaUsers />
                          <span>Unassigned: {projectMonitor.unassignedCount}</span>
                        </span>

                        <span className="metric-badge metric-muted">
                          <FaFileAlt />
                          <span>
                            Last update:{" "}
                            {projectMonitor.lastLogDate ? formatDate(projectMonitor.lastLogDate) : "-"}
                          </span>
                        </span>

                        {project.bid_manager_required ? (
                          <span className="metric-badge metric-muted" title="Bid manager assignment">
                            <FaUsers />
                            <span>Bid: {project.bid_manager ? project.bid_manager : "Unassigned"}</span>
                          </span>
                        ) : null}

                        {project.bid_manager_required && project.bid_manager ? (
                          <span
                            className="metric-badge metric-muted"
                            title={
                              bidManagerLoadError
                                ? bidManagerLoadError
                                : "Active projects assigned to this bid manager"
                            }
                          >
                            <FaTasks />
                            <span>
                              BM load:{" "}
                              {bidManagerLoad
                                ? `${bidManagerLoad.active} active`
                                : bidManagerLoadError
                                ? "N/A"
                                : "…"}
                            </span>
                          </span>
                        ) : null}

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
                {/* project-stage-row removed */}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="main-content-grid">
        <div className="main-column">
          {/* Project Details */}
          <section className="content-card">
            <div className="card-header">
              <div className="card-title">
                <FaInfo />
                <span>Project Details</span>
              </div>

              <div className="inline-actions">
                {!isEditing ? (
                  <button className="action-button secondary" onClick={handleEditToggle} type="button">
                    <FaEdit />
                    <span>Edit Project</span>
                  </button>
                ) : (
                  <>
                    <button
                      className="action-button secondary"
                      onClick={handleEditToggle}
                      disabled={saving}
                      type="button"
                    >
                      <FaTimes />
                      <span>Cancel</span>
                    </button>

                    <button
                      className="action-button primary"
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

              {/* Bid manager section */}
              <div className="form-group form-group-full">
                <label className="form-label" style={{ marginBottom: 8 }}>
                  Bid Manager
                </label>

                <label className="checkbox-row" style={{ marginBottom: 10 }}>
                  <input
                    type="checkbox"
                    name="bid_manager_required"
                    checked={!!viewOrEdit.bid_manager_required}
                    onChange={isReadOnly ? undefined : handleEditChange}
                    disabled={isReadOnly}
                  />
                  Requires bid manager
                </label>

                <div className="hint-text" style={{ marginBottom: 8 }}>
                  If enabled, you can assign a bid manager so you can track involvement and load.
                </div>

                <input
                  type="text"
                  name="bid_manager"
                  value={viewOrEdit.bid_manager || ""}
                  onChange={isReadOnly ? undefined : handleEditChange}
                  className="form-input"
                  placeholder="Enter bid manager name (e.g. Juan Dela Cruz)"
                  readOnly={isReadOnly}
                  disabled={isReadOnly || !viewOrEdit.bid_manager_required}
                />

                {!isEditing && viewOrEdit.bid_manager_required && viewOrEdit.bid_manager ? (
                  <div className="hint-text" style={{ marginTop: 8 }}>
                    Current BM load:{" "}
                    {bidManagerLoad
                      ? `${bidManagerLoad.active} active project(s)`
                      : bidManagerLoadError
                      ? "N/A"
                      : "…"}
                  </div>
                ) : null}
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

              {/* ✅ Sales Stage as DB-backed dropdown */}
              <div className="form-group">
                <label className="form-label">
                  <FaChartLine className="form-icon" />
                  Sales Stage
                </label>
                <select
                  className="form-input"
                  name="sales_stage"
                  value={viewOrEdit.sales_stage || ""}
                  onChange={isReadOnly ? undefined : handleEditChange}
                  disabled={isReadOnly}
                >
                  <option value="">-</option>
                  {salesStageOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
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
                        <span className="modules-trigger-text">{selectedModules.length} selected</span>
                      ) : (
                        <span className="modules-trigger-placeholder">Select modules…</span>
                      )}
                      <span className={`modules-caret ${modulesOpen ? "open" : ""}`}>▾</span>
                    </button>

                    {modulesOpen ? (
                      <div className="modules-select-menu">
                        <div className="modules-search-row">
                          <input
                            className="form-input modules-search"
                            value={moduleSearch}
                            onChange={(e) => setModuleSearch(e.target.value)}
                            placeholder="Search or type to add…"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                addCustomModule(moduleSearch);
                              }
                            }}
                          />
                          <button
                            type="button"
                            className="action-button secondary modules-add-btn"
                            onClick={() => addCustomModule(moduleSearch)}
                            disabled={!moduleSearch.trim()}
                          >
                            Add
                          </button>
                        </div>

                        <div className="modules-options">
                          {(moduleOptions || [])
                            .filter((m) => {
                              const q = moduleSearch.trim().toLowerCase();
                              if (!q) return true;
                              return String(m).toLowerCase().includes(q);
                            })
                            .map((m) => {
                              const name = String(m);
                              const checked = selectedModules.includes(name);
                              return (
                                <label key={name} className="modules-option">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggleModule(name)}
                                  />
                                  <span>{name}</span>
                                </label>
                              );
                            })}
                        </div>

                        {moduleOptions.length === 0 ? (
                          <div className="modules-empty">No modules loaded from database.</div>
                        ) : null}
                      </div>
                    ) : null}

                    {selectedModules.length > 0 ? (
                      <div className="chip-row modules-chip-row">
                        {selectedModules.map((m) => (
                          <span key={m} className="chip">
                            {m}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="muted">-</div>
                    )}

                    <div className="hint-text">
                      Saved as a comma-separated list. You can also type and click Add to include a
                      custom entry.
                    </div>
                  </div>
                ) : (
                  <>
                    {toModulesArray(project.smartvista_modules).length > 0 ? (
                      <div className="chip-row">
                        {toModulesArray(project.smartvista_modules).map((m) => (
                          <span key={m} className="chip">
                            {m}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="muted">-</div>
                    )}
                  </>
                )}
              </div>

              <div className="form-group form-group-full">
                <label className="form-label">Next Key Activity</label>
                <input
                  type="text"
                  name="next_key_activity"
                  className="form-input"
                  value={viewOrEdit.next_key_activity || ""}
                  onChange={isReadOnly ? undefined : handleEditChange}
                  placeholder="e.g. RFP due on Jan 15, Meeting on Jan 10, Demo on Jan 12"
                  readOnly={isReadOnly}
                  disabled={isReadOnly}
                />
              </div>

              <div className="form-group form-group-full">
                <label className="form-label">Project Background</label>
                <textarea
                  name="remarks"
                  value={viewOrEdit.remarks || ""}
                  onChange={isReadOnly ? undefined : handleEditChange}
                  className="form-textarea"
                  placeholder="Capture project context, timeline, constraints, dependencies, etc."
                  readOnly={isReadOnly}
                  disabled={isReadOnly}
                />
              </div>

              <div className="form-group form-group-full">
                <label className="form-label">Scope</label>
                <textarea
                  name="scope"
                  value={viewOrEdit.scope || ""}
                  onChange={isReadOnly ? undefined : handleEditChange}
                  className="form-textarea"
                  readOnly={isReadOnly}
                  disabled={isReadOnly}
                />
              </div>
            </div>
          </section>
        </div>

        <div className="side-column">
          {/* Tasks */}
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
                <button
                  className="filter-button"
                  onClick={() => setShowCompleted((p) => !p)}
                  type="button"
                >
                  {showCompleted ? <FaEyeSlash /> : <FaEye />}
                  <span>{showCompleted ? "Hide Done" : "Show All"}</span>
                </button>

                <button className="action-button primary" onClick={openAddTask} type="button">
                  <FaPlus />
                  <span>Add</span>
                </button>
              </div>
            </div>

            <div className="list">
              {filteredParentList.length === 0 ? (
                <div className="empty-state">
                  <p>No tasks yet.</p>
                </div>
              ) : (
                filteredParentList.map((t) => {
                  const kidsAll = childrenByParent[t.id] || [];
                  const kidsVisible = kidsAll.filter(isVisible);

                  const hasChildren = kidsAll.length > 0;
                  const isExpanded = !!expandedParents[t.id];
                  const prog = hasChildren ? getParentProgress(t.id) : null;

                  return (
                    <div key={t.id} className={`list-group ${hasChildren ? "has-children" : ""}`}>
                      <div className={`list-item ${t.status === "Completed" ? "is-done" : ""}`}>
                        <div
                          className="list-item-main"
                          onClick={() => openEditTask(t)}
                          role="button"
                          tabIndex={0}
                        >
                          <div className="list-item-top">
                            {hasChildren ? (
                              <button
                                type="button"
                                className="icon-button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleParentExpand(t.id);
                                }}
                                aria-label={isExpanded ? "Collapse" : "Expand"}
                                title={isExpanded ? "Collapse" : "Expand"}
                                style={{ marginRight: 6 }}
                              >
                                {isExpanded ? <FaChevronDown /> : <FaChevronRight />}
                              </button>
                            ) : null}

                            <span className={`status-tag status-${normalizeStatusKey(t.status)}`}>
                              {t.status}
                            </span>

                            {t.task_type && <span className="type-tag">{t.task_type}</span>}
                            {t.priority && <span className="type-tag">{t.priority}</span>}

                            {!hasChildren &&
                              t.estimated_hours !== null &&
                              t.estimated_hours !== undefined &&
                              t.estimated_hours !== "" && (
                                <span className="type-tag">{t.estimated_hours}h</span>
                              )}

                            {hasChildren ? (
                              <span className="type-tag" title={`${prog.done}/${prog.total} completed`}>
                                {prog.done}/{prog.total} done
                              </span>
                            ) : null}
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
                          <button
                            className="icon-button danger"
                            onClick={() => deleteTask(t.id)}
                            aria-label="Delete task"
                            type="button"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </div>

                      {hasChildren && isExpanded ? (
                        <div className="subtask-list">
                          {kidsVisible.length === 0 ? (
                            <div className="empty-state" style={{ paddingLeft: 18 }}>
                              <p>No visible sub-tasks.</p>
                            </div>
                          ) : (
                            kidsVisible.map((k) => (
                              <div
                                key={k.id}
                                className={`list-item is-subtask ${
                                  k.status === "Completed" ? "is-done" : ""
                                }`}
                              >
                                <div
                                  className="list-item-main"
                                  onClick={() => openEditTask(k)}
                                  role="button"
                                  tabIndex={0}
                                >
                                  <div className="list-item-top">
                                    <span className={`status-tag status-${normalizeStatusKey(k.status)}`}>
                                      {k.status}
                                    </span>
                                    {k.task_type && <span className="type-tag">{k.task_type}</span>}
                                    {k.priority && <span className="type-tag">{k.priority}</span>}
                                    {k.estimated_hours !== null &&
                                      k.estimated_hours !== undefined &&
                                      k.estimated_hours !== "" && (
                                        <span className="type-tag">{k.estimated_hours}h</span>
                                      )}
                                  </div>

                                  <div className="list-item-title">{k.description}</div>

                                  <div className="list-item-meta">
                                    <span>
                                      <FaUsers /> {k.assignee || "Unassigned"}
                                    </span>
                                    <span>
                                      <FaCalendarAlt /> {formatDate(k.due_date)}
                                    </span>
                                  </div>

                                  {k.notes && <div className="list-item-notes">{k.notes}</div>}
                                </div>

                                <div className="list-item-actions">
                                  <button
                                    className="icon-button danger"
                                    onClick={() => deleteTask(k.id)}
                                    aria-label="Delete task"
                                    type="button"
                                  >
                                    <FaTrash />
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* Logs */}
          <section className="content-card">
            <div className="card-header">
              <div className="card-title">
                <FaBookOpen />
                <span>Project Logs</span>
              </div>

              <button className="action-button primary" onClick={openAddLog} type="button">
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
                      <div className="list-item-notes">{l.notes}</div>
                    </div>

                    <div className="list-item-actions">
                      <button
                        className="icon-button danger"
                        onClick={() => deleteLog(l.id)}
                        aria-label="Delete log"
                        type="button"
                      >
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
        onClose={() => {
          setShowTaskModal(false);
          setEditingTask(null);
        }}
        onSave={async (taskData) => {
          if (!project?.id) return;

          const isEditingNow = !!editingTask?.id;
          const hasChildren = isEditingNow && (childrenByParent[editingTask.id] || []).length > 0;

          const payload = { ...taskData };
          if (hasChildren) payload.estimated_hours = null;

          if (isEditingNow) {
            const { error: qErr } = await supabase
              .from("project_tasks")
              .update(payload)
              .eq("id", editingTask.id);
            if (qErr) throw qErr;
          } else {
            const { error: qErr } = await supabase
              .from("project_tasks")
              .insert({ ...payload, project_id: project.id });
            if (qErr) throw qErr;
          }

          await fetchTasks();
        }}
        editingTask={editingTask}
        presalesResources={presalesResources}
        taskTypes={taskTypes}
        taskTypeDefaultsMap={taskTypeDefaultsMap}
        parentTaskOptions={parentTaskOptions}
        editingHasChildren={editingHasChildren}
      />

      <LogModal
        isOpen={showLogModal}
        onClose={() => {
          setShowLogModal(false);
          setEditingLog(null);
        }}
        onSave={async (notes) => {
          if (!project?.id) return;

          if (editingLog?.id) {
            const { error: qErr } = await supabase
              .from("project_logs")
              .update({ notes })
              .eq("id", editingLog.id);
            if (qErr) throw qErr;
          } else {
            const { error: qErr } = await supabase
              .from("project_logs")
              .insert({ project_id: project.id, notes });
            if (qErr) throw qErr;
          }

          await fetchLogs();
        }}
        editingLog={editingLog}
      />
    </div>
  );
}

export default ProjectDetails;
