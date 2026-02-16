// ProjectDetails.js
// Updated to support:
// - projects table new columns: foreseen_closing_date, contract_signed_date, is_inactive, last_activity_at
// - project_activities table for activity history
// - v_projects_status view for computed inactive flag (is_inactive_computed)

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
  FaChevronRight,
  FaChevronDown,
  FaHistory,
} from "react-icons/fa";

// ---------- Helpers ----------
const safeLower = (v) => (v ?? "").toString().trim().toLowerCase();

const formatMoney = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return "-";
  return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

const asDateInput = (value) => {
  if (!value) return "";
  // Supabase date may come as "YYYY-MM-DD"
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
    // datetime-local wants "YYYY-MM-DDTHH:mm"
    const iso = d.toISOString();
    return iso.slice(0, 16);
  } catch {
    return "";
  }
};

const formatNiceDate = (value) => {
  if (!value) return "-";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return "-";
  }
};

const formatNiceDateTime = (value) => {
  if (!value) return "-";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "-";
  }
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

const computeHealth = ({ is_inactive, is_inactive_computed, sales_stage, current_status }) => {
  // Manual override wins
  if (is_inactive === true) return { label: "Inactive (manual)", cls: "health-red" };
  if (is_inactive_computed === true) return { label: "Inactive", cls: "health-red" };

  // fallback heuristics (in case view isn't used)
  if (stageIsClosedLike(sales_stage)) return { label: "Inactive", cls: "health-red" };
  if (safeLower(current_status).includes("inactive")) return { label: "Inactive", cls: "health-red" };

  return { label: "Active", cls: "health-green" };
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

  // Detect "child whose parent isn't in list" -> show as orphan
  const parentIds = new Set(parents.map((p) => p.id));
  Object.keys(childrenByParent).forEach((pid) => {
    if (!parentIds.has(pid)) {
      orphans.push(...childrenByParent[pid]);
      delete childrenByParent[pid];
    }
  });

  return { parents, childrenByParent, orphans };
};

// ---------- Activity Modal ----------
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

  const handleSubmit = async (e) => {
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

        <form onSubmit={handleSubmit} className="modal-body">
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

const ErrorState = ({ message, onBack }) => (
  <div className="project-details-container theme-light">
    <div className="error-state">
      <FaExclamationTriangle />
      <div>
        <h2>Something went wrong</h2>
        <p>{message || "Failed to load project."}</p>
        <button className="action-button secondary" onClick={onBack} type="button">
          <FaChevronRight />
          <span>Back</span>
        </button>
      </div>
    </div>
  </div>
);

// ---------- Data Hook ----------
const useProjectData = (projectId) => {
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [activities, setActivities] = useState([]);
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

  const fetchActivities = async () => {
    try {
      const { data, error: qErr } = await supabase
        .from("project_activities")
        .select("*")
        .eq("project_id", projectId)
        .order("activity_date", { ascending: false });

      if (qErr) throw qErr;
      setActivities(data || []);
    } catch (err) {
      console.error("Error fetching activities:", err);
    }
  };

  const fetchProjectDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      // Prefer view for computed status
      let data = null;
      let qErr = null;

      const viewResp = await supabase.from("v_projects_status").select("*").eq("id", projectId).single();
      data = viewResp.data;
      qErr = viewResp.error;

      // fallback to projects if view not available / permission issues
      if (qErr) {
        const fallbackResp = await supabase.from("projects").select("*").eq("id", projectId).single();
        if (fallbackResp.error) throw fallbackResp.error;
        data = fallbackResp.data;
      }

      setProject(data);
      await Promise.all([fetchTasks(), fetchActivities()]);
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

  return {
    project,
    setProject,
    tasks,
    activities,
    loading,
    error,
    fetchTasks,
    fetchActivities,
    refresh: fetchProjectDetails,
  };
};

function ProjectDetails() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const { project, setProject, tasks, activities, loading, error, fetchTasks, fetchActivities, refresh } =
    useProjectData(projectId);

  const [isEditing, setIsEditing] = useState(false);
  const [editProject, setEditProject] = useState({});
  const [saving, setSaving] = useState(false);

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const [showActivityModal, setShowActivityModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);

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

  const [countryOptions, setCountryOptions] = useState([]);
  const [accountManagerOptions, setAccountManagerOptions] = useState([]);
  const [salesStageOptions, setSalesStageOptions] = useState([]);

  const [expandedParents, setExpandedParents] = useState({});

  // Customer UUID lookup (so /customer/:customerId works)
  const [customerId, setCustomerId] = useState(null);

  // Load dropdown lists
  useEffect(() => {
    const loadLists = async () => {
      try {
        const [
          { data: pData, error: pErr },
          { data: tData, error: tErr },
          { data: mData, error: mErr },
          { data: cData, error: cErr },
          { data: aData, error: aErr },
          { data: sData, error: sErr },
        ] = await Promise.all([
          supabase.from("presales_resources").select("name").order("name"),
          supabase
            .from("task_types")
            .select("name, base_hours, buffer_pct, focus_hours_per_day, review_buffer_days, is_active, sort_order")
            .eq("is_active", true)
            .order("sort_order", { ascending: true })
            .order("name", { ascending: true }),
          supabase.from("smartvista_modules_catalog").select("name").order("name"),
          supabase.from("countries").select("name").order("name"),
          supabase.from("account_managers").select("id, name").order("name"),
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
        if (cErr) console.warn("countries load error:", cErr);
        if (aErr) console.warn("account_managers load error:", aErr);
        if (sErr) console.warn("sales_stages load error:", sErr);

        setPresalesResources((pData || []).map((x) => x.name).filter(Boolean));

        const types = (tData || []).map((x) => x.name).filter(Boolean);
        setTaskTypes(types);

        const defaults = {};
        (tData || []).forEach((row) => {
          if (!row?.name) return;
          defaults[row.name] = {
            base_hours: row.base_hours ?? null,
            buffer_pct: row.buffer_pct ?? null,
            focus_hours_per_day: row.focus_hours_per_day ?? null,
            review_buffer_days: row.review_buffer_days ?? null,
          };
        });
        setTaskTypeDefaultsMap(defaults);

        setModuleOptions((mData || []).map((x) => x.name).filter(Boolean));
        setCountryOptions((cData || []).map((x) => x.name).filter(Boolean));
        setAccountManagerOptions((aData || []).map((x) => x.name).filter(Boolean));
        setSalesStageOptions((sData || []).map((x) => x.name).filter(Boolean));
      } catch (e) {
        console.warn("List load error:", e);
      }
    };

    loadLists();
  }, []);

  // Customer ID lookup
  useEffect(() => {
    const sync = async () => {
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
    if (project?.customer_name) sync();
  }, [project?.customer_name]);

  // Keep SmartVista modules selection synced
  useEffect(() => {
    const raw = project?.smartvista_modules || "";
    const list = raw
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    setSelectedModules(list);
    setModulesDraft(list.join(", "));
  }, [project?.smartvista_modules]);

  // Task stats
  const taskStats = useMemo(() => {
    const list = tasks || [];
    const open = list.filter((t) => !isCompletedStatus(t.status));
    const completed = list.filter((t) => isCompletedStatus(t.status));
    const unassigned = open.filter((t) => !(t.assignee || "").trim());
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdue = open.filter((t) => {
      if (!t.due_date) return false;
      const d = new Date(t.due_date);
      d.setHours(0, 0, 0, 0);
      return d.getTime() < today.getTime();
    });

    const due7 = open.filter((t) => {
      if (!t.due_date) return false;
      const d = new Date(t.due_date);
      d.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 7;
    });

    return {
      open: open.length,
      completed: completed.length,
      overdue: overdue.length,
      due7: due7.length,
      unassigned: unassigned.length,
      total: list.length,
    };
  }, [tasks]);

  const { parents, childrenByParent, orphans } = useMemo(() => groupTasks(tasks), [tasks]);

  const visibleParents = useMemo(() => {
    if (showCompleted) return parents;
    return parents.filter((t) => !isCompletedStatus(t.status));
  }, [parents, showCompleted]);

  const visibleOrphans = useMemo(() => {
    if (showCompleted) return orphans;
    return orphans.filter((t) => !isCompletedStatus(t.status));
  }, [orphans, showCompleted]);

  const health = useMemo(() => {
    if (!project) return { label: "-", cls: "health-amber" };
    return computeHealth(project);
  }, [project]);

  const stageBadgeClass = useMemo(() => {
    const s = safeLower(project?.sales_stage);
    if (!s) return "stage-badge stage-active";
    if (stageIsClosedLike(project?.sales_stage)) return "metric-badge metric-muted";
    return "stage-badge stage-active";
  }, [project?.sales_stage]);

  // Editing
  const startEdit = () => {
    if (!project) return;
    setIsEditing(true);
    setEditProject({
      ...project,
      // normalize dates into YYYY-MM-DD for inputs
      foreseen_closing_date: asDateInput(project.foreseen_closing_date || project.due_date),
      contract_signed_date: asDateInput(project.contract_signed_date),
      last_activity_at: project.last_activity_at ? asDateTimeInput(project.last_activity_at) : "",
    });
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditProject({});
    setModulesOpen(false);
    setModuleSearch("");
  };

  const saveProject = async () => {
    if (!project) return;
    setSaving(true);
    try {
      const payload = {
        customer_name: editProject.customer_name ?? project.customer_name,
        account_manager: editProject.account_manager || null,
        scope: editProject.scope || null,
        deal_value: editProject.deal_value === "" ? null : editProject.deal_value ?? null,
        product: editProject.product || null,
        backup_presales: editProject.backup_presales || null,
        primary_presales: editProject.primary_presales || null,
        sales_stage: editProject.sales_stage || null,
        remarks: editProject.remarks || null,
        project_name: editProject.project_name || null,
        project_type: editProject.project_type || null,
        current_status: editProject.current_status || null,
        country: editProject.country || null,
        is_corporate: !!editProject.is_corporate,
        bid_manager_required: !!editProject.bid_manager_required,
        bid_manager: editProject.bid_manager || null,

        // New fields
        foreseen_closing_date: editProject.foreseen_closing_date || null,
        contract_signed_date: editProject.contract_signed_date || null,
        is_inactive: !!editProject.is_inactive,
        last_activity_at: editProject.last_activity_at ? new Date(editProject.last_activity_at).toISOString() : null,

        // keep old due_date in sync if you still use it elsewhere (optional)
        due_date: editProject.foreseen_closing_date || project.due_date || null,

        // smartvista_modules from selectedModules
        smartvista_modules: (selectedModules || []).join(", "),
      };

      const { error: qErr } = await supabase.from("projects").update(payload).eq("id", project.id);
      if (qErr) throw qErr;

      // Refresh so computed view fields update too
      await refresh();
      setIsEditing(false);
      setEditProject({});
    } catch (e) {
      console.error("Save project error:", e);
      alert(`Failed to save project: ${e?.message || "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  };

  // Tasks
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

  const saveTaskModal = async (payload) => {
    // TaskModal in your app likely handles insert/update itself; but keep this safe:
    // If your TaskModal expects onSave and does update, keep it consistent.
    // Here we assume TaskModal returns updated payload and we refresh tasks.
    await fetchTasks();
  };

  const deleteTask = async (taskId) => {
    if (!window.confirm("Delete this task?")) return;
    try {
      const { error: qErr } = await supabase.from("project_tasks").delete().eq("id", taskId);
      if (qErr) throw qErr;
      await fetchTasks();
    } catch (e) {
      console.error("Delete task error:", e);
      alert(`Failed to delete task: ${e?.message || "Unknown error"}`);
    }
  };

  const toggleExpandParent = (parentId) => {
    setExpandedParents((prev) => ({ ...prev, [parentId]: !prev[parentId] }));
  };

  // Activities
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

  const saveActivity = async (payload) => {
    if (!project) return;

    if (editingActivity?.id) {
      const { error: qErr } = await supabase.from("project_activities").update(payload).eq("id", editingActivity.id);
      if (qErr) throw qErr;
    } else {
      const { error: qErr } = await supabase.from("project_activities").insert({ ...payload, project_id: project.id });
      if (qErr) throw qErr;
    }

    // Update last_activity_at on project using the activity date
    try {
      const nextLast = payload.activity_date || new Date().toISOString();
      await supabase.from("projects").update({ last_activity_at: nextLast }).eq("id", project.id);
    } catch (e) {
      console.warn("last_activity_at update failed (non-blocking):", e);
    }

    await Promise.all([fetchActivities(), refresh()]);
  };

  const deleteActivity = async (activityId) => {
    if (!window.confirm("Delete this activity?")) return;
    try {
      const { error: qErr } = await supabase.from("project_activities").delete().eq("id", activityId);
      if (qErr) throw qErr;
      await fetchActivities();
    } catch (e) {
      console.error("Delete activity error:", e);
      alert(`Failed to delete activity: ${e?.message || "Unknown error"}`);
    }
  };

  // Modules filtering
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
      return Array.from(set);
    });
  };

  // Customer navigation
  const goToCustomer = () => {
    if (customerId) navigate(`/customer/${customerId}`);
    else alert("Customer record not found (customers table).");
  };

  // ---------- Render ----------
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onBack={() => navigate(-1)} />;
  if (!project) return <ErrorState message={"Project not found."} onBack={() => navigate(-1)} />;

  const inactiveComputed = project.is_inactive_computed === true;
  const inactiveManual = project.is_inactive === true;

  return (
    <div className="project-details-container theme-light">
      {/* Header / Hero */}
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
              {!isEditing ? (
                <button className="action-button secondary" type="button" onClick={startEdit}>
                  <FaEdit />
                  <span>Edit</span>
                </button>
              ) : (
                <>
                  <button className="action-button secondary" type="button" onClick={cancelEdit} disabled={saving}>
                    <FaTimes />
                    <span>Cancel</span>
                  </button>
                  <button className="action-button primary" type="button" onClick={saveProject} disabled={saving}>
                    <FaSave />
                    <span>{saving ? "Saving..." : "Save"}</span>
                  </button>
                </>
              )}
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

            <span className="deal-badge">
              <FaDollarSign />
              <span>{project.deal_value ? formatMoney(project.deal_value) : "No deal value"}</span>
            </span>

            <span className="metric-badge metric-neutral">
              <FaUsers />
              <span>Primary: {project.primary_presales || "—"}</span>
            </span>

            <span className="metric-badge metric-muted">
              <FaUsers />
              <span>Backup: {project.backup_presales || "—"}</span>
            </span>

            <span className="metric-badge metric-muted">
              <FaBullseye />
              <span>AM: {project.account_manager || "—"}</span>
            </span>

            <span className="metric-badge metric-neutral">
              <FaClock />
              <span>Foreseen: {formatNiceDate(project.foreseen_closing_date || project.due_date)}</span>
            </span>

            <span className="metric-badge metric-muted">
              <FaCalendarAlt />
              <span>Contract: {formatNiceDate(project.contract_signed_date)}</span>
            </span>

            <span className={`metric-badge ${taskStats.overdue ? "metric-danger" : taskStats.open ? "metric-warn" : "metric-muted"}`}>
              <FaTasks />
              <span>
                Tasks: {taskStats.open} open{taskStats.overdue ? ` • ${taskStats.overdue} overdue` : ""}
              </span>
            </span>

            {inactiveComputed ? (
              <span className="metric-badge metric-danger">
                <FaExclamationTriangle />
                <span>Inactive (computed)</span>
              </span>
            ) : null}

            {inactiveManual ? (
              <span className="metric-badge metric-danger">
                <FaExclamationTriangle />
                <span>Inactive (manual)</span>
              </span>
            ) : null}
          </div>

          <div className="overview-grid">
            <div className="overview-item">
              <div className="overview-label">Scope</div>
              <div className="overview-value">{project.scope || "—"}</div>
            </div>

            <div className="overview-item">
              <div className="overview-label">Product</div>
              <div className="overview-value">{project.product || "—"}</div>
            </div>

            <div className="overview-item">
              <div className="overview-label">Project type</div>
              <div className="overview-value">{project.project_type || "—"}</div>
            </div>

            <div className="overview-item">
              <div className="overview-label">Bid manager</div>
              <div className="overview-value">
                {project.bid_manager_required ? (
                  <span>
                    Required • <b>{project.bid_manager || "Not assigned"}</b>
                  </span>
                ) : (
                  "Not required"
                )}
              </div>
            </div>

            <div className="overview-item">
              <div className="overview-label">Last activity</div>
              <div className="overview-value">{formatNiceDateTime(project.last_activity_at)}</div>
            </div>

            <div className="overview-item">
              <div className="overview-label">Status (current_status)</div>
              <div className="overview-value">{project.current_status || "—"}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="main-content-grid">
        {/* Left/Main column */}
        <div className="main-column">
          {/* Project Details (edit) */}
          <div className="content-card">
            <div className="card-header">
              <div className="card-title">
                <FaInfo />
                <span>Project information</span>
              </div>
              <div className="inline-actions">
                <span className="pill">{project.id}</span>
              </div>
            </div>

            {!isEditing ? (
              <p className="muted">
                Tip: The key details are in the header. Click <b>Edit</b> if you want to update ownership, dates, stage,
                modules, etc.
              </p>
            ) : (
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
                  <label className="form-label">Customer name</label>
                  <input
                    className="form-input"
                    value={editProject.customer_name || ""}
                    onChange={(e) => setEditProject((p) => ({ ...p, customer_name: e.target.value }))}
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
                    {(countryOptions || []).map((c) => (
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
                    {(accountManagerOptions || []).map((a) => (
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
                    {(presalesResources || []).map((x) => (
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
                    {(presalesResources || []).map((x) => (
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
                    {(salesStageOptions || []).map((s) => (
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
                  <label className="form-label">Product</label>
                  <input
                    className="form-input"
                    value={editProject.product || ""}
                    onChange={(e) => setEditProject((p) => ({ ...p, product: e.target.value }))}
                  />
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

                <div className="form-group form-group-full">
                  <label className="form-label">Scope</label>
                  <textarea
                    className="form-textarea"
                    value={editProject.scope || ""}
                    onChange={(e) => setEditProject((p) => ({ ...p, scope: e.target.value }))}
                    placeholder="Scope summary..."
                  />
                </div>

                <div className="form-group form-group-full">
                  <label className="form-label">SmartVista modules</label>

                  <div className="modules-box">
                    <div className="modules-top">
                      <input
                        className="form-input"
                        value={modulesDraft}
                        onChange={(e) => setModulesDraft(e.target.value)}
                        placeholder="Comma-separated modules (auto sync to selection)"
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
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggleModule(m)}
                                  />
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
                              // sync typed draft -> selection
                              const list = (modulesDraft || "")
                                .split(",")
                                .map((x) => x.trim())
                                .filter(Boolean);
                              setSelectedModules(Array.from(new Set(list)));
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
                  <label className="form-label">Remarks</label>
                  <textarea
                    className="form-textarea"
                    value={editProject.remarks || ""}
                    onChange={(e) => setEditProject((p) => ({ ...p, remarks: e.target.value }))}
                    placeholder="Notes, risks, comments..."
                  />
                </div>
              </div>
            )}
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

            <div className="task-stats-row">
              <span className="metric-badge metric-neutral">Open: {taskStats.open}</span>
              <span className={`metric-badge ${taskStats.overdue ? "metric-danger" : "metric-muted"}`}>
                Overdue: {taskStats.overdue}
              </span>
              <span className={`metric-badge ${taskStats.due7 ? "metric-warn" : "metric-muted"}`}>
                Due 7d: {taskStats.due7}
              </span>
              <span className={`metric-badge ${taskStats.unassigned ? "metric-warn" : "metric-muted"}`}>
                Unassigned: {taskStats.unassigned}
              </span>
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
                              {t.priority ? (
                                <span>
                                  <FaExclamationTriangle /> {t.priority}
                                </span>
                              ) : null}
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

        {/* Right/Side column */}
        <div className="side-column">
          {/* Activity timeline */}
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

            <div className="muted" style={{ marginTop: 10 }}>
              Tip: activities update <b>last_activity_at</b> automatically.
            </div>
          </div>

          {/* Quick flags */}
          <div className="content-card">
            <div className="card-header">
              <div className="card-title">
                <FaBookOpen />
                <span>Quick flags</span>
              </div>
            </div>

            <div className="quick-flags">
              <div className="flag-row">
                <span className="flag-label">Inactive (computed)</span>
                <span className={`flag-value ${inactiveComputed ? "bad" : "good"}`}>
                  {inactiveComputed ? "Yes" : "No"}
                </span>
              </div>
              <div className="flag-row">
                <span className="flag-label">Inactive (manual override)</span>
                <span className={`flag-value ${inactiveManual ? "bad" : "good"}`}>
                  {inactiveManual ? "Yes" : "No"}
                </span>
              </div>
              <div className="flag-row">
                <span className="flag-label">Foreseen closing</span>
                <span className="flag-value">
                  {formatNiceDate(project.foreseen_closing_date || project.due_date)}
                </span>
              </div>
              <div className="flag-row">
                <span className="flag-label">Contract signed</span>
                <span className="flag-value">{formatNiceDate(project.contract_signed_date)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <TaskModal
        isOpen={showTaskModal}
        onClose={closeTaskModal}
        onSave={saveTaskModal}
        editingTask={editingTask}
        projectId={project.id}
        presalesResources={presalesResources}
        taskTypes={taskTypes}
        taskTypeDefaultsMap={taskTypeDefaultsMap}
      />

      <ActivityModal
        isOpen={showActivityModal}
        onClose={closeActivityModal}
        onSave={saveActivity}
        editingActivity={editingActivity}
      />
    </div>
  );
}

export default ProjectDetails;
