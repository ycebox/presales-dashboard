import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "./supabaseClient";
import "./ProjectDetails.css";
import TaskModal from "./TaskModal";
import {
  FaCalendarAlt,
  FaCheckCircle,
  FaChevronDown,
  FaChevronRight,
  FaClock,
  FaDollarSign,
  FaEdit,
  FaExclamationTriangle,
  FaEye,
  FaEyeSlash,
  FaHistory,
  FaInfo,
  FaPlus,
  FaSave,
  FaTasks,
  FaTimes,
  FaTrash,
  FaUsers,
  FaChartLine,
} from "react-icons/fa";

/* ---------------- Helpers ---------------- */
const safeLower = (v) => (v ?? "").toString().trim().toLowerCase();

const asDateInput = (value) => {
  if (!value) return "";
  if (typeof value === "string" && value.length >= 10) return value.slice(0, 10);
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
  } catch {
    return "";
  }
};

const asDateTimeInput = (value) => {
  if (!value) return "";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 16);
  } catch {
    return "";
  }
};

const formatNiceDate = (value) => {
  if (!value) return "—";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return "—";
  }
};

const formatNiceDateTime = (value) => {
  if (!value) return "—";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
};

const formatMoney = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

const isCompletedStatus = (status) => {
  const s = safeLower(status);
  return s === "completed" || s === "done" || s === "closed";
};

const getStatusClass = (status) => {
  const s = safeLower(status);
  if (s.includes("progress")) return "status-in-progress";
  if (s.includes("not started") || s === "open" || s === "new") return "status-not-started";
  if (isCompletedStatus(s)) return "status-completed";
  if (s.includes("cancel") || s.includes("hold")) return "status-cancelled-on-hold";
  return "status-not-started";
};

const normalizeStage = (stage) => safeLower(stage).replace(/\s+/g, "-");

const stageIsClosedLike = (stage) => {
  const s = normalizeStage(stage);
  return ["closed-lost", "close-won", "closed-won", "cancelled", "canceled", "done"].includes(s);
};

const parseModules = (raw) =>
  (raw || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

const truncateText = (text, max = 140) => {
  const t = (text || "").toString().trim();
  if (!t) return "—";
  if (t.length <= max) return t;
  return t.slice(0, max).trim() + "...";
};

const groupTasks = (tasks) => {
  const parents = [];
  const childrenByParent = {};
  const orphans = [];

  (tasks || []).forEach((t) => {
    if (t.parent_task_id) {
      if (!childrenByParent[t.parent_task_id]) childrenByParent[t.parent_task_id] = [];
      childrenByParent[t.parent_task_id].push(t);
    } else {
      parents.push(t);
    }
  });

  parents.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
  Object.keys(childrenByParent).forEach((k) => {
    childrenByParent[k].sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
  });

  const parentIds = new Set(parents.map((p) => p.id));
  Object.keys(childrenByParent).forEach((pid) => {
    if (!parentIds.has(pid)) {
      orphans.push(...childrenByParent[pid]);
      delete childrenByParent[pid];
    }
  });

  return { parents, childrenByParent, orphans };
};

/* ---------------- NEW: Computed Inactive (client-side) ----------------
   Rule:
   - Inactive if NO open tasks
   - OR if last movement is older than 60 days
   "Movement" = latest of:
     - project.last_activity_at
     - latest OPEN task updated_at / created_at (fallback)
     - latest activity activity_date (fallback)
----------------------------------------------------------------------- */
const INACTIVE_DAYS_THRESHOLD = 60;

const safeDate = (v) => {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d;
};

const daysSince = (v) => {
  const d = safeDate(v);
  if (!d) return null;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
};

const getLatestFromList = (dateValues) => {
  const dates = (dateValues || []).map(safeDate).filter(Boolean);
  if (!dates.length) return null;
  return new Date(Math.max(...dates.map((d) => d.getTime())));
};

const computeInactiveClient = (project, tasks, activities) => {
  const openTasks = (tasks || []).filter((t) => !isCompletedStatus(t?.status));
  if (openTasks.length === 0) return true;

  const projectLast = safeDate(project?.last_activity_at);

  const latestOpenTaskMove = getLatestFromList(
    openTasks.map((t) => t?.updated_at || t?.created_at || t?.due_date || t?.start_date || t?.end_date)
  );

  const latestActivityMove = getLatestFromList((activities || []).map((a) => a?.activity_date));

  const lastMovementAt = getLatestFromList([projectLast, latestOpenTaskMove, latestActivityMove]);
  if (!lastMovementAt) return true;

  const ds = daysSince(lastMovementAt);
  if (ds === null) return true;

  return ds > INACTIVE_DAYS_THRESHOLD;
};
/* ------------------------------------------------------------------- */

/* ---------------- Activity Modal ---------------- */
const ActivityModal = ({ isOpen, onClose, onSave, editingActivity }) => {
  const [activityDate, setActivityDate] = useState("");
  const [activityType, setActivityType] = useState("");
  const [notes, setNotes] = useState("");
  const [createdBy, setCreatedBy] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setActivityDate(
      editingActivity?.activity_date ? asDateTimeInput(editingActivity.activity_date) : asDateTimeInput(new Date())
    );
    setActivityType(editingActivity?.activity_type || "");
    setNotes(editingActivity?.notes || "");
    setCreatedBy(editingActivity?.created_by || "");
  }, [isOpen, editingActivity]);

  const submit = async (e) => {
    e.preventDefault();
    if (!notes.trim()) {
      alert("Notes are required.");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        activity_date: activityDate ? new Date(activityDate).toISOString() : new Date().toISOString(),
        activity_type: activityType || null,
        notes: notes.trim(),
        created_by: createdBy || null,
      });
      onClose();
    } catch (err) {
      console.error("Activity save error:", err);
      alert(`Failed to save activity: ${err?.message || "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">
            <FaHistory />
            <span>{editingActivity ? "Edit Activity" : "Add Activity"}</span>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close" type="button">
            <FaTimes />
          </button>
        </div>

        <form className="modal-body" onSubmit={submit}>
          <div className="project-edit-grid">
            <div className="form-group">
              <label className="form-label">Activity date</label>
              <input
                className="form-input"
                type="datetime-local"
                value={activityDate}
                onChange={(e) => setActivityDate(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Activity type</label>
              <input
                className="form-input"
                value={activityType}
                onChange={(e) => setActivityType(e.target.value)}
                placeholder="Call / Demo / Workshop / RFP / Internal..."
              />
            </div>

            <div className="form-group">
              <label className="form-label">Created by (optional)</label>
              <input
                className="form-input"
                value={createdBy}
                onChange={(e) => setCreatedBy(e.target.value)}
                placeholder="Name or email"
              />
            </div>

            <div className="form-group form-group-full">
              <label className="form-label">Notes</label>
              <textarea
                className="form-textarea"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Progress update, decisions, blockers, next steps..."
              />
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="action-button secondary" onClick={onClose}>
              <FaTimes />
              <span>Cancel</span>
            </button>
            <button type="submit" className="action-button primary" disabled={saving}>
              <FaSave />
              <span>{saving ? "Saving..." : "Save Activity"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ---------------- Page States ---------------- */
const LoadingState = () => (
  <div className="project-details-container">
    <div className="loading-state">
      <div className="spinner" />
      <div className="loading-text">
        <h2>Loading project...</h2>
        <p>Please wait a moment.</p>
      </div>
    </div>
  </div>
);

const ErrorState = ({ message, onBack }) => (
  <div className="project-details-container">
    <div className="error-state">
      <FaExclamationTriangle />
      <div>
        <h2>Something went wrong</h2>
        <p>{message || "Failed to load project."}</p>
        <button className="action-button secondary" onClick={onBack} type="button">
          <span>Back</span>
        </button>
      </div>
    </div>
  </div>
);

/* ---------------- Main Component ---------------- */
export default function ProjectDetails() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // Project info edit mode
  const [isEditingProject, setIsEditingProject] = useState(false);
  const [editProject, setEditProject] = useState({});
  const [savingProject, setSavingProject] = useState(false);

  // Task modal
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [expandedParents, setExpandedParents] = useState({});

  // Activity modal
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);

  // Dropdown options
  const [presalesResources, setPresalesResources] = useState([]);
  const [taskTypes, setTaskTypes] = useState([]);
  const [taskTypeDefaultsMap, setTaskTypeDefaultsMap] = useState({});
  const [countryOptions, setCountryOptions] = useState([]);
  const [accountManagerOptions, setAccountManagerOptions] = useState([]);
  const [salesStageOptions, setSalesStageOptions] = useState([]);
  const [moduleOptions, setModuleOptions] = useState([]);

  // Modules editor state
  const [modulesOpen, setModulesOpen] = useState(false);
  const [moduleSearch, setModuleSearch] = useState("");
  const [selectedModules, setSelectedModules] = useState([]);
  const [modulesDraft, setModulesDraft] = useState("");

  // Customer id lookup
  const [customerId, setCustomerId] = useState(null);

  /* ---------- Load dropdown lists ---------- */
  useEffect(() => {
    const loadLists = async () => {
      try {
        const [pRes, tRes, mRes, cRes, aRes, sRes] = await Promise.all([
          supabase.from("presales_resources").select("name").order("name"),
          supabase
            .from("task_types")
            .select("name, base_hours, buffer_pct, focus_hours_per_day, review_buffer_days, is_active, sort_order")
            .eq("is_active", true)
            .order("sort_order", { ascending: true })
            .order("name", { ascending: true }),
          supabase.from("smartvista_modules_catalog").select("name").order("name"),
          supabase.from("countries").select("name").order("name"),
          supabase.from("account_managers").select("name").order("name"),
          supabase
            .from("sales_stages")
            .select("name, sort_order, is_active")
            .eq("is_active", true)
            .order("sort_order", { ascending: true })
            .order("name", { ascending: true }),
        ]);

        if (!pRes.error) setPresalesResources((pRes.data || []).map((x) => x.name).filter(Boolean));
        if (!mRes.error) setModuleOptions((mRes.data || []).map((x) => x.name).filter(Boolean));
        if (!cRes.error) setCountryOptions((cRes.data || []).map((x) => x.name).filter(Boolean));
        if (!aRes.error) setAccountManagerOptions((aRes.data || []).map((x) => x.name).filter(Boolean));
        if (!sRes.error) setSalesStageOptions((sRes.data || []).map((x) => x.name).filter(Boolean));

        if (!tRes.error) {
          const types = (tRes.data || []).map((x) => x.name).filter(Boolean);
          setTaskTypes(types);

          const defaults = {};
          (tRes.data || []).forEach((row) => {
            if (!row?.name) return;
            defaults[row.name] = {
              base_hours: row.base_hours ?? null,
              buffer_pct: row.buffer_pct ?? null,
              focus_hours_per_day: row.focus_hours_per_day ?? null,
              review_buffer_days: row.review_buffer_days ?? null,
            };
          });
          setTaskTypeDefaultsMap(defaults);
        }
      } catch (e) {
        console.warn("List load error:", e);
      }
    };
    loadLists();
  }, []);

  /* ---------- Fetchers ---------- */
  const fetchTasks = useCallback(async () => {
    if (!projectId) return;
    try {
      const { data, error } = await supabase
        .from("project_tasks")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (e) {
      console.error("Fetch tasks error:", e);
    }
  }, [projectId]);

  const fetchActivities = useCallback(async () => {
    if (!projectId) return;
    try {
      const { data, error } = await supabase
        .from("project_activities")
        .select("*")
        .eq("project_id", projectId)
        .order("activity_date", { ascending: false });

      if (error) throw error;
      setActivities(data || []);
    } catch (e) {
      console.error("Fetch activities error:", e);
    }
  }, [projectId]);

  const fetchProject = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setLoadError(null);

    try {
      // Prefer view for computed status, fallback to projects
      const viewResp = await supabase.from("v_projects_status").select("*").eq("id", projectId).single();
      if (!viewResp.error) {
        setProject(viewResp.data);
      } else {
        const baseResp = await supabase.from("projects").select("*").eq("id", projectId).single();
        if (baseResp.error) throw baseResp.error;
        setProject(baseResp.data);
      }

      await Promise.all([fetchTasks(), fetchActivities()]);
    } catch (e) {
      console.error("Fetch project error:", e);
      setLoadError(e?.message || "Failed to load project.");
    } finally {
      setLoading(false);
    }
  }, [projectId, fetchTasks, fetchActivities]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  /* ---------- Touch last_activity_at when tasks change ---------- */
  const touchProjectLastActivity = useCallback(
    async (isoWhen = null) => {
      if (!projectId) return;
      try {
        const when = isoWhen || new Date().toISOString();
        const { error } = await supabase.from("projects").update({ last_activity_at: when }).eq("id", projectId);
        if (error) throw error;
      } catch (e) {
        console.warn("last_activity_at touch failed:", e);
      }
    },
    [projectId]
  );

  /* ---------- Sync customer id ---------- */
  useEffect(() => {
    const syncCustomer = async () => {
      setCustomerId(null);
      const name = (project?.customer_name || "").trim();
      if (!name) return;

      try {
        const { data, error } = await supabase
          .from("customers")
          .select("id, customer_name")
          .eq("is_archived", false)
          .eq("customer_name", name)
          .maybeSingle();

        if (error) throw error;
        setCustomerId(data?.id || null);
      } catch (e) {
        console.warn("Customer lookup error:", e);
      }
    };

    if (project?.customer_name) syncCustomer();
  }, [project?.customer_name]);

  /* ---------- Sync modules state ---------- */
  useEffect(() => {
    const list = parseModules(project?.smartvista_modules);
    setSelectedModules(list);
    setModulesDraft(list.join(", "));
  }, [project?.smartvista_modules]);

  /* ---------- Derived: tasks grouping & stats ---------- */
  const { parents, childrenByParent, orphans } = useMemo(() => groupTasks(tasks), [tasks]);

  const taskStats = useMemo(() => {
    const list = tasks || [];
    const open = list.filter((t) => !isCompletedStatus(t.status));
    const completed = list.filter((t) => isCompletedStatus(t.status));

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdue = open.filter((t) => {
      if (!t.due_date) return false;
      const d = new Date(t.due_date);
      d.setHours(0, 0, 0, 0);
      return d.getTime() < today.getTime();
    });

    return {
      open: open.length,
      overdue: overdue.length,
      completed: completed.length,
      total: list.length,
    };
  }, [tasks]);

  const latestActivity = useMemo(() => {
    if (!activities || activities.length === 0) return null;
    return activities[0];
  }, [activities]);

  const visibleParents = useMemo(() => {
    if (showCompleted) return parents;
    return parents.filter((t) => !isCompletedStatus(t.status));
  }, [parents, showCompleted]);

  const visibleOrphans = useMemo(() => {
    if (showCompleted) return orphans;
    return orphans.filter((t) => !isCompletedStatus(t.status));
  }, [orphans, showCompleted]);

  // ✅ NEW: computed inactive (client)
  const inactiveComputedClient = useMemo(() => {
    if (!project) return false;
    // If stage is closed-like, treat as inactive as well (keeps your old behavior)
    if (stageIsClosedLike(project.sales_stage)) return true;
    return computeInactiveClient(project, tasks, activities);
  }, [project, tasks, activities]);

  // ✅ NEW: health badge uses manual override first, then computed
  const health = useMemo(() => {
    if (!project) return { label: "—", cls: "health-amber" };
    if (project.is_inactive === true) return { label: "Inactive (manual)", cls: "health-red" };
    if (inactiveComputedClient === true) return { label: "Inactive", cls: "health-red" };
    if (safeLower(project.current_status).includes("inactive")) return { label: "Inactive", cls: "health-red" };
    return { label: "Active", cls: "health-green" };
  }, [project, inactiveComputedClient]);

  const stageBadgeClass = useMemo(() => {
    if (!project?.sales_stage) return "stage-badge stage-active";
    if (stageIsClosedLike(project.sales_stage)) return "metric-badge metric-muted";
    return "stage-badge stage-active";
  }, [project?.sales_stage]);

  /* ---------- Project info: edit mode ---------- */
  const startEditProject = () => {
    if (!project) return;
    setIsEditingProject(true);
    setModulesOpen(false);
    setModuleSearch("");

    const foreseen = project.foreseen_closing_date || project.due_date;

    setEditProject({
      ...project,
      foreseen_closing_date: asDateInput(foreseen),
      contract_signed_date: asDateInput(project.contract_signed_date),
      last_activity_at: project.last_activity_at ? asDateTimeInput(project.last_activity_at) : "",
      deal_value: project.deal_value ?? "",
    });
  };

  const cancelEditProject = () => {
    setIsEditingProject(false);
    setEditProject({});
    setModulesOpen(false);
    setModuleSearch("");
  };

  const saveProject = async () => {
    if (!project) return;
    setSavingProject(true);

    try {
      const payload = {
        customer_name: editProject.customer_name ?? project.customer_name,
        project_name: editProject.project_name || null,
        country: editProject.country || null,
        account_manager: editProject.account_manager || null,
        primary_presales: editProject.primary_presales || null,
        backup_presales: editProject.backup_presales || null,
        sales_stage: editProject.sales_stage || null,
        current_status: editProject.current_status || null,
        product: editProject.product || null,
        project_type: editProject.project_type || null,
        scope: editProject.scope || null,
        remarks: editProject.remarks || null,
        smartvista_modules: (selectedModules || []).join(", "),
        deal_value: editProject.deal_value === "" ? null : Number(editProject.deal_value),
        foreseen_closing_date: editProject.foreseen_closing_date || null,
        contract_signed_date: editProject.contract_signed_date || null,
        is_inactive: !!editProject.is_inactive,
        last_activity_at: editProject.last_activity_at ? new Date(editProject.last_activity_at).toISOString() : null,

        // keep due_date aligned (since you still have it in schema)
        due_date: editProject.foreseen_closing_date || project.due_date || null,

        bid_manager_required: !!editProject.bid_manager_required,
        bid_manager: editProject.bid_manager || null,

        // keep next_key_activity + current_status editable via this section
        next_key_activity: editProject.next_key_activity || null,
      };

      const { error } = await supabase.from("projects").update(payload).eq("id", project.id);
      if (error) throw error;

      await fetchProject();
      setIsEditingProject(false);
      setEditProject({});
    } catch (e) {
      console.error("Save project error:", e);
      alert(`Failed to save project: ${e?.message || "Unknown error"}`);
    } finally {
      setSavingProject(false);
    }
  };

  /* ---------- Modules picker ---------- */
  const filteredModules = useMemo(() => {
    const q = safeLower(moduleSearch);
    if (!q) return moduleOptions;
    return (moduleOptions || []).filter((m) => safeLower(m).includes(q));
  }, [moduleOptions, moduleSearch]);

  const toggleModule = (name) => {
    setSelectedModules((prev) => {
      const set = new Set(prev || []);
      if (set.has(name)) set.delete(name);
      else set.add(name);
      const next = Array.from(set);
      setModulesDraft(next.join(", "));
      return next;
    });
  };

  /* ---------- Customer navigation ---------- */
  const goToCustomer = () => {
    if (customerId) navigate(`/customer/${customerId}`);
    else alert("Customer record not found in customers table.");
  };

  /* ---------- Tasks: open modal ---------- */
  const openNewTask = () => {
    setEditingTask(null);
    setShowTaskModal(true);
  };

  const openEditTask = (task) => {
    setEditingTask(task);
    setShowTaskModal(true);
  };

  const closeTaskModal = () => {
    setShowTaskModal(false);
    setEditingTask(null);
  };

  // Build parent task options (top-level tasks only)
  const parentTaskOptions = useMemo(() => {
    return (parents || []).map((t) => ({
      value: t.id,
      label: t.description || "(Untitled task)",
    }));
  }, [parents]);

  const editingHasChildren = useMemo(() => {
    if (!editingTask?.id) return false;
    return (childrenByParent[editingTask.id] || []).length > 0;
  }, [editingTask, childrenByParent]);

  const onSaveTask = async (normalized) => {
    try {
      if (!project?.id) throw new Error("Project not loaded.");

      const payload = {
        project_id: project.id,
        description: normalized.description ?? null,
        status: normalized.status ?? "",
        due_date: normalized.due_date || null,
        notes: normalized.notes ?? null,
        assignee: normalized.assignee ?? null,
        start_date: normalized.start_date || null,
        end_date: normalized.end_date || null,
        estimated_hours:
          normalized.estimated_hours === "" || normalized.estimated_hours == null
            ? null
            : Number(normalized.estimated_hours),
        priority: normalized.priority ?? null,
        task_type: normalized.task_type ?? null,
        actual_hours:
          normalized.actual_hours === "" || normalized.actual_hours == null ? null : Number(normalized.actual_hours),
        parent_task_id: normalized.parent_task_id || null,
        is_archived: normalized.is_archived ?? false,
      };

      const nowIso = new Date().toISOString();

      if (editingTask?.id) {
        const { error } = await supabase.from("project_tasks").update(payload).eq("id", editingTask.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("project_tasks").insert(payload);
        if (error) throw error;
      }

      // ✅ Update last_activity_at when task is created/updated/status/assigned
      await touchProjectLastActivity(nowIso);

      await Promise.all([fetchTasks(), fetchProject()]);
    } catch (e) {
      console.error("Task save error:", e);
      alert(`Failed to save task: ${e?.message || "Unknown error"}`);
      throw e;
    }
  };

  const deleteTask = async (taskId) => {
    if (!window.confirm("Delete this task?")) return;
    try {
      const { error } = await supabase.from("project_tasks").delete().eq("id", taskId);
      if (error) throw error;

      await touchProjectLastActivity(new Date().toISOString());
      await Promise.all([fetchTasks(), fetchProject()]);
    } catch (e) {
      console.error("Delete task error:", e);
      alert(`Failed to delete task: ${e?.message || "Unknown error"}`);
    }
  };

  const toggleExpandParent = (parentId) => {
    setExpandedParents((prev) => ({ ...prev, [parentId]: !prev[parentId] }));
  };

  /* ---------- Activities ---------- */
  const openNewActivity = () => {
    setEditingActivity(null);
    setShowActivityModal(true);
  };

  const openEditActivity = (a) => {
    setEditingActivity(a);
    setShowActivityModal(true);
  };

  const closeActivityModal = () => {
    setShowActivityModal(false);
    setEditingActivity(null);
  };

  const onSaveActivity = async (payload) => {
    if (!project?.id) return;

    if (editingActivity?.id) {
      const { error } = await supabase.from("project_activities").update(payload).eq("id", editingActivity.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("project_activities")
        .insert({ ...payload, project_id: project.id });
      if (error) throw error;
    }

    // update last_activity_at from activity date
    try {
      const nextLast = payload.activity_date || new Date().toISOString();
      await supabase.from("projects").update({ last_activity_at: nextLast }).eq("id", project.id);
    } catch (e) {
      console.warn("last_activity_at update failed:", e);
    }

    await Promise.all([fetchActivities(), fetchProject()]);
  };

  const deleteActivity = async (activityId) => {
    if (!window.confirm("Delete this activity?")) return;
    try {
      const { error } = await supabase.from("project_activities").delete().eq("id", activityId);
      if (error) throw error;
      await fetchActivities();
      await fetchProject();
    } catch (e) {
      console.error("Delete activity error:", e);
      alert(`Failed to delete activity: ${e?.message || "Unknown error"}`);
    }
  };

  /* ---------- Render guards ---------- */
  if (loading) return <LoadingState />;
  if (loadError) return <ErrorState message={loadError} onBack={() => navigate(-1)} />;
  if (!project) return <ErrorState message={"Project not found."} onBack={() => navigate(-1)} />;

  const foreseen = project.foreseen_closing_date || project.due_date;

  // ✅ Use client computed inactive (what you asked for)
  const inactiveComputed = inactiveComputedClient === true;
  const inactiveManual = project.is_inactive === true;

  const modulesList = parseModules(project.smartvista_modules);

  /* ---------- Read-only project info view ---------- */
  const ProjectInfoReadOnly = () => (
    <div className="info-grid">
      <div className="info-block">
        <div className="info-title">Ownership</div>
        <div className="info-row">
          <div className="info-label">Primary presales</div>
          <div className="info-value">{project.primary_presales || "—"}</div>
        </div>
        <div className="info-row">
          <div className="info-label">Backup presales</div>
          <div className="info-value">{project.backup_presales || "—"}</div>
        </div>
        <div className="info-row">
          <div className="info-label">Account manager</div>
          <div className="info-value">{project.account_manager || "—"}</div>
        </div>
        <div className="info-row">
          <div className="info-label">Bid manager</div>
          <div className="info-value">
            {project.bid_manager_required ? `Required • ${project.bid_manager || "Not assigned"}` : "Not required"}
          </div>
        </div>
      </div>

      <div className="info-block">
        <div className="info-title">Commercial & timeline</div>
        <div className="info-row">
          <div className="info-label">Deal value</div>
          <div className="info-value">{project.deal_value != null ? formatMoney(project.deal_value) : "—"}</div>
        </div>
        <div className="info-row">
          <div className="info-label">Foreseen closing</div>
          <div className="info-value">{formatNiceDate(foreseen)}</div>
        </div>
        <div className="info-row">
          <div className="info-label">Contract signed</div>
          <div className="info-value">{formatNiceDate(project.contract_signed_date)}</div>
        </div>
        <div className="info-row">
          <div className="info-label">Last activity</div>
          <div className="info-value">{formatNiceDateTime(project.last_activity_at)}</div>
        </div>
        <div className="info-row">
          <div className="info-label">Inactive</div>
          <div className="info-value">
            <span className={`flag-pill ${inactiveComputed ? "bad" : "good"}`}>
              Computed: {inactiveComputed ? "Yes" : "No"}
            </span>
            <span className={`flag-pill ${inactiveManual ? "bad" : "good"}`}>
              Manual: {inactiveManual ? "Yes" : "No"}
            </span>
          </div>
        </div>
      </div>

      <div className="info-block">
        <div className="info-title">Project info</div>
        <div className="info-row">
          <div className="info-label">Customer</div>
          <div className="info-value">{project.customer_name}</div>
        </div>
        <div className="info-row">
          <div className="info-label">Country</div>
          <div className="info-value">{project.country || "—"}</div>
        </div>
        <div className="info-row">
          <div className="info-label">Project type</div>
          <div className="info-value">{project.project_type || "—"}</div>
        </div>
        <div className="info-row">
          <div className="info-label">Product</div>
          <div className="info-value">{project.product || "—"}</div>
        </div>

        <div className="info-row info-row-full">
          <div className="info-label">Modules</div>
          <div className="info-value">
            {modulesList.length ? (
              <div className="tag-wrap">
                {modulesList.map((m) => (
                  <span key={m} className="tag">
                    {m}
                  </span>
                ))}
              </div>
            ) : (
              "—"
            )}
          </div>
        </div>

        <div className="info-row info-row-full">
          <div className="info-label">Scope</div>
          <div className="info-value info-text">{project.scope || "—"}</div>
        </div>

        <div className="info-row info-row-full">
          <div className="info-label">Remarks</div>
          <div className="info-value info-text">{project.remarks || "—"}</div>
        </div>
      </div>
    </div>
  );

  /* ---------- Edit project info view ---------- */
  const ProjectInfoEdit = () => (
    <div className="project-edit-grid">
      <div className="form-group">
        <label className="form-label">Project name</label>
        <input
          className="form-input"
          value={editProject.project_name || ""}
          onChange={(e) => setEditProject((p) => ({ ...p, project_name: e.target.value }))}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Country</label>
        <select
          className="form-input"
          value={editProject.country || ""}
          onChange={(e) => setEditProject((p) => ({ ...p, country: e.target.value }))}
        >
          <option value="">—</option>
          {countryOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">Account manager</label>
        <select
          className="form-input"
          value={editProject.account_manager || ""}
          onChange={(e) => setEditProject((p) => ({ ...p, account_manager: e.target.value }))}
        >
          <option value="">—</option>
          {accountManagerOptions.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">Primary presales</label>
        <select
          className="form-input"
          value={editProject.primary_presales || ""}
          onChange={(e) => setEditProject((p) => ({ ...p, primary_presales: e.target.value }))}
        >
          <option value="">—</option>
          {presalesResources.map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">Backup presales</label>
        <select
          className="form-input"
          value={editProject.backup_presales || ""}
          onChange={(e) => setEditProject((p) => ({ ...p, backup_presales: e.target.value }))}
        >
          <option value="">—</option>
          {presalesResources.map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">Sales stage</label>
        <select
          className="form-input"
          value={editProject.sales_stage || ""}
          onChange={(e) => setEditProject((p) => ({ ...p, sales_stage: e.target.value }))}
        >
          <option value="">—</option>
          {salesStageOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">Current status</label>
        <input
          className="form-input"
          value={editProject.current_status || ""}
          onChange={(e) => setEditProject((p) => ({ ...p, current_status: e.target.value }))}
          placeholder="What’s currently going on?"
        />
      </div>

      <div className="form-group">
        <label className="form-label">Next key activity</label>
        <input
          className="form-input"
          value={editProject.next_key_activity || ""}
          onChange={(e) => setEditProject((p) => ({ ...p, next_key_activity: e.target.value }))}
          placeholder="Next step"
        />
      </div>

      <div className="form-group">
        <label className="form-label">Deal value</label>
        <input
          className="form-input"
          type="number"
          value={editProject.deal_value ?? ""}
          onChange={(e) => setEditProject((p) => ({ ...p, deal_value: e.target.value }))}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Foreseen closing date</label>
        <input
          className="form-input"
          type="date"
          value={editProject.foreseen_closing_date || ""}
          onChange={(e) => setEditProject((p) => ({ ...p, foreseen_closing_date: e.target.value }))}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Contract signed date</label>
        <input
          className="form-input"
          type="date"
          value={editProject.contract_signed_date || ""}
          onChange={(e) => setEditProject((p) => ({ ...p, contract_signed_date: e.target.value }))}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Last activity (timestamp)</label>
        <input
          className="form-input"
          type="datetime-local"
          value={editProject.last_activity_at || ""}
          onChange={(e) => setEditProject((p) => ({ ...p, last_activity_at: e.target.value }))}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Inactive (manual override)</label>
        <select
          className="form-input"
          value={editProject.is_inactive ? "yes" : "no"}
          onChange={(e) => setEditProject((p) => ({ ...p, is_inactive: e.target.value === "yes" }))}
        >
          <option value="no">No</option>
          <option value="yes">Yes</option>
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">Project type</label>
        <input
          className="form-input"
          value={editProject.project_type || ""}
          onChange={(e) => setEditProject((p) => ({ ...p, project_type: e.target.value }))}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Product</label>
        <input
          className="form-input"
          value={editProject.product || ""}
          onChange={(e) => setEditProject((p) => ({ ...p, product: e.target.value }))}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Bid manager required</label>
        <select
          className="form-input"
          value={editProject.bid_manager_required ? "yes" : "no"}
          onChange={(e) => setEditProject((p) => ({ ...p, bid_manager_required: e.target.value === "yes" }))}
        >
          <option value="no">No</option>
          <option value="yes">Yes</option>
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">Bid manager</label>
        <input
          className="form-input"
          value={editProject.bid_manager || ""}
          onChange={(e) => setEditProject((p) => ({ ...p, bid_manager: e.target.value }))}
          placeholder="Name"
        />
      </div>

      <div className="form-group form-group-full">
        <label className="form-label">SmartVista modules</label>
        <div className="modules-box">
          <div className="modules-top">
            <input
              className="form-input"
              value={modulesDraft}
              onChange={(e) => {
                setModulesDraft(e.target.value);
              }}
              placeholder="Comma-separated modules"
            />
            <button
              type="button"
              className="filter-button"
              onClick={() => setModulesOpen((v) => !v)}
              title="Open module selector"
            >
              {modulesOpen ? <FaChevronDown /> : <FaChevronRight />}
              <span>Select</span>
            </button>
          </div>

          {modulesOpen ? (
            <div className="modules-panel">
              <input
                className="form-input"
                value={moduleSearch}
                onChange={(e) => setModuleSearch(e.target.value)}
                placeholder="Search modules..."
              />

              <div className="modules-list">
                {filteredModules.length === 0 ? (
                  <div className="empty-state">No matching modules.</div>
                ) : (
                  filteredModules.map((m) => {
                    const checked = selectedModules.includes(m);
                    return (
                      <label key={m} className={`module-row ${checked ? "checked" : ""}`}>
                        <input type="checkbox" checked={checked} onChange={() => toggleModule(m)} />
                        <span>{m}</span>
                      </label>
                    );
                  })
                )}
              </div>

              <div className="modules-actions">
                <button
                  type="button"
                  className="action-button secondary"
                  onClick={() => {
                    const list = (modulesDraft || "")
                      .split(",")
                      .map((x) => x.trim())
                      .filter(Boolean);
                    const next = Array.from(new Set(list));
                    setSelectedModules(next);
                    setModulesDraft(next.join(", "));
                  }}
                >
                  <FaSave />
                  <span>Sync from text</span>
                </button>

                <button
                  type="button"
                  className="action-button secondary"
                  onClick={() => {
                    setSelectedModules([]);
                    setModulesDraft("");
                  }}
                >
                  <FaTimes />
                  <span>Clear</span>
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="form-group form-group-full">
        <label className="form-label">Scope</label>
        <textarea
          className="form-textarea"
          value={editProject.scope || ""}
          onChange={(e) => setEditProject((p) => ({ ...p, scope: e.target.value }))}
        />
      </div>

      <div className="form-group form-group-full">
        <label className="form-label">Remarks</label>
        <textarea
          className="form-textarea"
          value={editProject.remarks || ""}
          onChange={(e) => setEditProject((p) => ({ ...p, remarks: e.target.value }))}
        />
      </div>
    </div>
  );

  /* ---------------- UI ---------------- */
  return (
    <div className="project-details-container">
      {/* Header (minimal) */}
      <div className="project-header">
        <div className="project-hero">
          <div className="hero-title-line">
            <div>
              <h1 className="project-title">{project.project_name || "(Unnamed Project)"}</h1>

              <button className="hero-customer-link" type="button" onClick={goToCustomer} title="Open customer details">
                <FaInfo />
                <span>{project.customer_name}</span>
                <span className="pill">{project.country || "No country"}</span>
              </button>
            </div>

            <div className="inline-actions">
              <button className="action-button secondary" type="button" onClick={() => navigate(-1)}>
                <span>Back</span>
              </button>
            </div>
          </div>

          <div className="hero-badges">
            <span className={stageBadgeClass}>
              <FaChartLine />
              <span>{project.sales_stage || "No stage"}</span>
            </span>

            <span className={`health-badge ${health.cls}`}>
              <FaCheckCircle />
              <span>{health.label}</span>
            </span>

            <span className="metric-badge metric-neutral">
              <FaUsers />
              <span>{project.primary_presales || "Primary: —"}</span>
            </span>

            <span className="metric-badge metric-neutral">
              <FaCalendarAlt />
              <span>Foreseen: {formatNiceDate(foreseen)}</span>
            </span>

            <span className="metric-badge metric-muted">
              <FaCalendarAlt />
              <span>Contract: {formatNiceDate(project.contract_signed_date)}</span>
            </span>

            <span className={`metric-badge ${taskStats.overdue ? "metric-danger" : "metric-warn"}`}>
              <FaTasks />
              <span>
                Tasks: {taskStats.open} open{taskStats.overdue ? ` • ${taskStats.overdue} overdue` : ""}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="main-content-grid">
        {/* Main column */}
        <div className="main-column">
          {/* Project Information */}
          <div className="content-card">
            <div className="card-header">
              <div className="card-title">
                <FaInfo />
                <span>Project information</span>
              </div>

              <div className="inline-actions">
                {!isEditingProject ? (
                  <button className="action-button secondary" type="button" onClick={startEditProject}>
                    <FaEdit />
                    <span>Edit</span>
                  </button>
                ) : (
                  <>
                    <button
                      className="action-button secondary"
                      type="button"
                      onClick={cancelEditProject}
                      disabled={savingProject}
                    >
                      <FaTimes />
                      <span>Cancel</span>
                    </button>
                    <button className="action-button primary" type="button" onClick={saveProject} disabled={savingProject}>
                      <FaSave />
                      <span>{savingProject ? "Saving..." : "Save"}</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {!isEditingProject ? <ProjectInfoReadOnly /> : <ProjectInfoEdit />}
          </div>

          {/* Tasks */}
          <div className="content-card">
            <div className="card-header">
              <div className="card-title">
                <FaTasks />
                <span>
                  Tasks <span className="pill">{taskStats.total}</span>
                </span>
              </div>

              <div className="inline-actions">
                <button className="filter-button" type="button" onClick={() => setShowCompleted((v) => !v)}>
                  {showCompleted ? <FaEyeSlash /> : <FaEye />}
                  <span>{showCompleted ? "Hide completed" : "Show completed"}</span>
                </button>

                <button className="action-button primary" type="button" onClick={openNewTask}>
                  <FaPlus />
                  <span>Add task</span>
                </button>
              </div>
            </div>

            <div className="list">
              {visibleParents.length === 0 && visibleOrphans.length === 0 ? (
                <div className="empty-state">No tasks to display.</div>
              ) : (
                <>
                  {visibleParents.map((t) => {
                    const expanded = !!expandedParents[t.id];
                    const children = (childrenByParent[t.id] || []).filter((x) =>
                      showCompleted ? true : !isCompletedStatus(x.status)
                    );
                    const hasChildren = children.length > 0;

                    return (
                      <div className="list-group" key={t.id}>
                        <div className={`list-item ${isCompletedStatus(t.status) ? "is-done" : ""}`}>
                          <div className="list-item-main" onClick={() => openEditTask(t)} role="button" tabIndex={0}>
                            <div className="list-item-top">
                              {hasChildren ? (
                                <button
                                  type="button"
                                  className="filter-button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleExpandParent(t.id);
                                  }}
                                  title="Expand subtasks"
                                >
                                  {expanded ? <FaChevronDown /> : <FaChevronRight />}
                                  <span>Subtasks</span>
                                </button>
                              ) : null}

                              <span className={`status-tag ${getStatusClass(t.status)}`}>{t.status || "—"}</span>
                              {t.task_type ? <span className="type-tag">{t.task_type}</span> : null}
                            </div>

                            <div className="list-item-title">{t.description || "(Untitled task)"}</div>

                            <div className="list-item-meta">
                              <span>
                                <FaUsers /> {t.assignee || "Unassigned"}
                              </span>
                              <span>
                                <FaCalendarAlt /> Due: {formatNiceDate(t.due_date)}
                              </span>
                            </div>

                            {t.notes ? <div className="list-item-notes">{t.notes}</div> : null}
                          </div>

                          <div className="list-item-actions">
                            <button className="icon-button" type="button" onClick={() => openEditTask(t)} title="Edit">
                              <FaEdit />
                            </button>
                            <button
                              className="icon-button danger"
                              type="button"
                              onClick={() => deleteTask(t.id)}
                              title="Delete"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </div>

                        {hasChildren && expanded ? (
                          <div className="subtask-list">
                            {children.map((st) => (
                              <div
                                className={`list-item is-subtask ${isCompletedStatus(st.status) ? "is-done" : ""}`}
                                key={st.id}
                              >
                                <div className="list-item-main" onClick={() => openEditTask(st)} role="button" tabIndex={0}>
                                  <div className="list-item-top">
                                    <span className={`status-tag ${getStatusClass(st.status)}`}>{st.status || "—"}</span>
                                    {st.task_type ? <span className="type-tag">{st.task_type}</span> : null}
                                  </div>

                                  <div className="list-item-title">{st.description || "(Untitled subtask)"}</div>
                                  <div className="list-item-meta">
                                    <span>
                                      <FaUsers /> {st.assignee || "Unassigned"}
                                    </span>
                                    <span>
                                      <FaCalendarAlt /> Due: {formatNiceDate(st.due_date)}
                                    </span>
                                  </div>

                                  {st.notes ? <div className="list-item-notes">{st.notes}</div> : null}
                                </div>

                                <div className="list-item-actions">
                                  <button className="icon-button" type="button" onClick={() => openEditTask(st)} title="Edit">
                                    <FaEdit />
                                  </button>
                                  <button
                                    className="icon-button danger"
                                    type="button"
                                    onClick={() => deleteTask(st.id)}
                                    title="Delete"
                                  >
                                    <FaTrash />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}

                  {visibleOrphans.length ? (
                    <>
                      <div className="divider-line" />
                      <div className="muted" style={{ fontWeight: 900 }}>
                        Orphan subtasks (parent not found)
                      </div>

                      {visibleOrphans.map((t) => (
                        <div className={`list-item is-subtask ${isCompletedStatus(t.status) ? "is-done" : ""}`} key={t.id}>
                          <div className="list-item-main" onClick={() => openEditTask(t)} role="button" tabIndex={0}>
                            <div className="list-item-top">
                              <span className={`status-tag ${getStatusClass(t.status)}`}>{t.status || "—"}</span>
                              {t.task_type ? <span className="type-tag">{t.task_type}</span> : null}
                            </div>
                            <div className="list-item-title">{t.description || "(Untitled task)"}</div>
                            <div className="list-item-meta">
                              <span>
                                <FaUsers /> {t.assignee || "Unassigned"}
                              </span>
                              <span>
                                <FaCalendarAlt /> Due: {formatNiceDate(t.due_date)}
                              </span>
                            </div>
                            {t.notes ? <div className="list-item-notes">{t.notes}</div> : null}
                          </div>

                          <div className="list-item-actions">
                            <button className="icon-button" type="button" onClick={() => openEditTask(t)} title="Edit">
                              <FaEdit />
                            </button>
                            <button className="icon-button danger" type="button" onClick={() => deleteTask(t.id)} title="Delete">
                              <FaTrash />
                            </button>
                          </div>
                        </div>
                      ))}
                    </>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Side column */}
        <div className="side-column">
          {/* Current snapshot */}
          <div className="content-card">
            <div className="card-header">
              <div className="card-title">
                <FaInfo />
                <span>Current snapshot</span>
              </div>
            </div>

            <div className="snapshot-panel">
              <div className="snapshot-row">
                <span className="snapshot-label">Current status</span>
                <span className="snapshot-value">{project.current_status || "—"}</span>
              </div>

              <div className="snapshot-row">
                <span className="snapshot-label">Next key activity</span>
                <span className="snapshot-value">{project.next_key_activity || "—"}</span>
              </div>

              <div className="snapshot-row">
                <span className="snapshot-label">Workload</span>
                <span className="snapshot-value">
                  {taskStats.open} open{taskStats.overdue ? ` • ${taskStats.overdue} overdue` : ""}
                </span>
              </div>

              <div className="snapshot-row">
                <span className="snapshot-label">Last activity</span>
                <span className="snapshot-value">{formatNiceDateTime(project.last_activity_at)}</span>
              </div>

              <div className="snapshot-divider" />

              <div className="snapshot-subtitle">Latest log</div>
              {!latestActivity ? (
                <div className="snapshot-empty">No activity logged yet.</div>
              ) : (
                <div className="snapshot-log">
                  <div className="snapshot-log-top">
                    <span className="snapshot-log-type">{latestActivity.activity_type || "Activity"}</span>
                    <span className="snapshot-log-date">{formatNiceDateTime(latestActivity.activity_date)}</span>
                  </div>
                  <div className="snapshot-log-notes">{truncateText(latestActivity.notes, 180)}</div>
                </div>
              )}
            </div>
          </div>

          {/* Activity history */}
          <div className="content-card">
            <div className="card-header">
              <div className="card-title">
                <FaHistory />
                <span>
                  Activity history <span className="pill">{activities?.length || 0}</span>
                </span>
              </div>
              <div className="inline-actions">
                <button className="action-button primary" type="button" onClick={openNewActivity}>
                  <FaPlus />
                  <span>Add</span>
                </button>
              </div>
            </div>

            <div className="activity-timeline">
              {!activities || activities.length === 0 ? (
                <div className="empty-state">No activities yet. Add one to start tracking history.</div>
              ) : (
                activities.map((a) => (
                  <div className="activity-item" key={a.id}>
                    <div className="activity-left">
                      <div className="activity-dot" />
                      <div className="activity-line" />
                    </div>

                    <div className="activity-content">
                      <div className="activity-top">
                        <div className="activity-title">
                          <span className="activity-type">{a.activity_type || "Activity"}</span>
                          <span className="activity-date">{formatNiceDateTime(a.activity_date)}</span>
                        </div>

                        <div className="activity-actions">
                          <button className="icon-button" type="button" title="Edit" onClick={() => openEditActivity(a)}>
                            <FaEdit />
                          </button>
                          <button
                            className="icon-button danger"
                            type="button"
                            title="Delete"
                            onClick={() => deleteActivity(a.id)}
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </div>

                      {a.created_by ? <div className="activity-by">By: {a.created_by}</div> : null}
                      <div className="activity-notes">{a.notes || "—"}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick flags (small) */}
          <div className="content-card">
            <div className="card-header">
              <div className="card-title">
                <FaClock />
                <span>Quick flags</span>
              </div>
            </div>

            <div className="quick-flags">
              <div className="flag-row">
                <span className="flag-label">Computed inactive</span>
                <span className={`flag-value ${inactiveComputed ? "bad" : "good"}`}>
                  {inactiveComputed ? "Yes" : "No"}
                </span>
              </div>
              <div className="flag-row">
                <span className="flag-label">Manual inactive</span>
                <span className={`flag-value ${inactiveManual ? "bad" : "good"}`}>
                  {inactiveManual ? "Yes" : "No"}
                </span>
              </div>
              <div className="flag-row">
                <span className="flag-label">Last activity</span>
                <span className="flag-value">{formatNiceDateTime(project.last_activity_at)}</span>
              </div>
              <div className="flag-row">
                <span className="flag-label">Rule</span>
                <span className="flag-value">
                  No open tasks OR no movement &gt; {INACTIVE_DAYS_THRESHOLD} days
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Task modal */}
      <TaskModal
        isOpen={showTaskModal}
        onClose={closeTaskModal}
        onSave={onSaveTask}
        editingTask={editingTask}
        projectId={project.id}
        presalesResources={presalesResources}
        taskTypes={taskTypes}
        taskTypeDefaultsMap={taskTypeDefaultsMap}
        parentTaskOptions={parentTaskOptions}
        editingHasChildren={editingHasChildren}
      />

      {/* Activity modal */}
      <ActivityModal
        isOpen={showActivityModal}
        onClose={closeActivityModal}
        onSave={onSaveActivity}
        editingActivity={editingActivity}
      />
    </div>
  );
}
