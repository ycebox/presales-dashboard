import React, { useEffect, useMemo, useState } from "react";
import { FaTasks, FaTimes, FaInfo, FaCheckCircle, FaSave } from "react-icons/fa";
import "./TaskModal.css";

// Keep these aligned with your DB values
const TASK_STATUSES = ["Not Started", "In Progress", "Completed", "Cancelled/On-hold"];
const TASK_PRIORITIES = ["High", "Normal", "Low"];

// ✅ Prevent rendering objects in <option>
const normalizeToStrings = (arr) => {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((x) => {
      if (x === null || x === undefined) return "";
      if (typeof x === "string") return x;
      if (typeof x === "number") return String(x);

      // common shapes from DB rows
      return x.name || x.label || x.value || x.title || x.text || "";
    })
    .map((s) => String(s).trim())
    .filter(Boolean);
};

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

// ---- Date helpers (working days) ----
const pad2 = (n) => String(n).padStart(2, "0");
const toISODate = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const parseISODate = (s) => {
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
};

const isWeekend = (d) => {
  const day = d.getDay();
  return day === 0 || day === 6;
};

const nextWorkingDay = (fromDate = new Date()) => {
  const d = new Date(fromDate);
  d.setHours(0, 0, 0, 0);
  while (isWeekend(d)) d.setDate(d.getDate() + 1);
  return d;
};

const addWorkingDays = (start, daysToAdd) => {
  const d = new Date(start);
  d.setHours(0, 0, 0, 0);
  let remaining = Math.max(0, Number(daysToAdd) || 0);
  while (remaining > 0) {
    d.setDate(d.getDate() + 1);
    if (!isWeekend(d)) remaining -= 1;
  }
  return d;
};

const subtractWorkingDays = (end, daysToSub) => {
  const d = new Date(end);
  d.setHours(0, 0, 0, 0);
  let remaining = Math.max(0, Number(daysToSub) || 0);
  while (remaining > 0) {
    d.setDate(d.getDate() - 1);
    if (!isWeekend(d)) remaining -= 1;
  }
  return d;
};

const roundToHalf = (x) => {
  const n = Number(x);
  if (Number.isNaN(n)) return null;
  return Math.round(n * 2) / 2;
};

/**
 * Shared TaskModal used by:
 * - ProjectDetails (task list edit/add)
 * - PresalesOverview (kanban task edit)
 *
 * Enhancements:
 * - Parent task / Sub-task support via parent_task_id
 * - Parent task grouping mode (no estimated hours)
 *
 * Optional props:
 * - parentTaskOptions: [{ id, description }]
 * - editingHasChildren: boolean
 * - disableParentSelection: boolean
 */
export default function TaskModal({
  isOpen,
  onClose,
  onSave,
  editingTask = null,
  presalesResources = [],
  taskTypes = [],
  taskTypeDefaultsMap = {},

  parentTaskOptions = [],
  editingHasChildren = false,
  disableParentSelection = false,
}) {
  // ✅ Normalize dropdown options once
  const presalesOptions = useMemo(() => normalizeToStrings(presalesResources), [presalesResources]);
  const taskTypeOptions = useMemo(() => normalizeToStrings(taskTypes), [taskTypes]);

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
    parent_task_id: "",
  });

  const [isParentTask, setIsParentTask] = useState(false);
  const [loading, setLoading] = useState(false);
  const [originalTaskType, setOriginalTaskType] = useState("");

  const isLockedAsParentContainer = !!editingTask?.id && !!editingHasChildren;
  const isSubTask = !!String(taskData.parent_task_id || "").trim();
  const isParentContainer = isLockedAsParentContainer || !!isParentTask;

  useEffect(() => {
    if (!isOpen) return;

    if (editingTask) {
      const original = (editingTask.task_type || "").trim();
      setOriginalTaskType(original);

      const existingParentId = editingTask.parent_task_id || "";

      setIsParentTask(false);

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
        parent_task_id: existingParentId || "",
      });

      if (editingHasChildren) setIsParentTask(true);
    } else {
      setOriginalTaskType("");
      setIsParentTask(false);
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
        parent_task_id: "",
      });
    }
  }, [editingTask, isOpen, editingHasChildren]);

  const handleChange = (field, value) => setTaskData((prev) => ({ ...prev, [field]: value }));

  const handleToggleParentTask = (checked) => {
    if (isLockedAsParentContainer && !checked) return;

    setIsParentTask(checked);
    setTaskData((prev) => ({
      ...prev,
      parent_task_id: checked ? "" : prev.parent_task_id,
      estimated_hours: checked ? "" : prev.estimated_hours,
    }));
  };

  const handleParentSelection = (parentId) => {
    if (disableParentSelection || isLockedAsParentContainer) return;

    const v = parentId || "";
    setTaskData((prev) => ({ ...prev, parent_task_id: v }));
    if (v) setIsParentTask(false);
  };

  const suggestedPlan = useMemo(() => {
    if (isParentContainer) return null;

    const t = (taskData.task_type || "").trim();
    if (!t) return null;

    const def = taskTypeDefaultsMap?.[t];
    if (!def) return { missing: true, task_type: t };

    const base = Number(def.base_hours);
    const buffer = Number(def.buffer_pct);
    const focusPerDay = Number(def.focus_hours_per_day);
    const reviewDays = Number(def.review_buffer_days || 0);

    if ([base, buffer, focusPerDay].some((n) => Number.isNaN(n))) {
      return { invalid: true, task_type: t };
    }

    const totalHours = roundToHalf(base * (1 + buffer));
    const focus = focusPerDay > 0 ? focusPerDay : 3;
    const workDays = Math.max(1, Math.ceil((totalHours || 0) / focus));
    const totalDaysWithReview = workDays + Math.max(0, reviewDays);

    const due = parseISODate(taskData.due_date);
    let start;
    let end;

    if (due) {
      end = due;
      start = subtractWorkingDays(end, Math.max(0, totalDaysWithReview - 1));
    } else {
      start = nextWorkingDay(new Date());
      end = addWorkingDays(start, Math.max(0, totalDaysWithReview - 1));
    }

    return {
      task_type: t,
      base_hours: base,
      buffer_pct: buffer,
      focus_hours_per_day: focus,
      review_buffer_days: Math.max(0, reviewDays),
      suggested_hours: totalHours,
      work_days: workDays,
      total_days: totalDaysWithReview,
      suggested_start_date: toISODate(start),
      suggested_end_date: toISODate(end),
      planned_from_due_date: !!due,
    };
  }, [taskData.task_type, taskData.due_date, taskTypeDefaultsMap, isParentContainer]);

  // ✅ IMPORTANT: keep this useMemo ABOVE any early return (fixes hook order #310)
  const filteredParentOptions = useMemo(() => {
    const selfId = editingTask?.id;
    const list = Array.isArray(parentTaskOptions) ? parentTaskOptions : [];
    return list.filter((t) => {
      if (!t) return false;
      if (!t.id) return false;
      if (selfId && t.id === selfId) return false;
      return true;
    });
  }, [parentTaskOptions, editingTask?.id]);

  const hasExistingPlanValues = () => {
    const hasHours = String(taskData.estimated_hours || "").trim() !== "";
    const hasStart = String(taskData.start_date || "").trim() !== "";
    const hasEnd = String(taskData.end_date || "").trim() !== "";
    return hasHours || hasStart || hasEnd;
  };

  const applySuggestion = () => {
    if (!suggestedPlan || suggestedPlan.missing || suggestedPlan.invalid) return;
    if (isParentContainer) return;

    const isEditing = !!editingTask?.id;
    const typeChanged = isEditing && (taskData.task_type || "").trim() !== (originalTaskType || "").trim();

    if (isEditing && hasExistingPlanValues()) {
      const msg = typeChanged
        ? "Re-apply suggested plan based on the new Task Type? This will overwrite Estimated Hours, Start Date, and End Date."
        : "Re-apply suggested plan? This will overwrite Estimated Hours, Start Date, and End Date.";
      const ok = window.confirm(msg);
      if (!ok) return;

      setTaskData((prev) => ({
        ...prev,
        estimated_hours: String(suggestedPlan.suggested_hours ?? ""),
        start_date: suggestedPlan.suggested_start_date || "",
        end_date: suggestedPlan.suggested_end_date || "",
      }));
      return;
    }

    setTaskData((prev) => ({
      ...prev,
      estimated_hours: prev.estimated_hours !== "" ? prev.estimated_hours : String(suggestedPlan.suggested_hours ?? ""),
      start_date: prev.start_date || suggestedPlan.suggested_start_date || "",
      end_date: prev.end_date || suggestedPlan.suggested_end_date || "",
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!taskData.description.trim()) {
      alert("Task description is required");
      return;
    }

    const shouldForceNoHours = isParentContainer;

    setLoading(true);
    try {
      const normalized = {
        ...taskData,
        parent_task_id: String(taskData.parent_task_id || "").trim() === "" ? null : taskData.parent_task_id,
        estimated_hours:
          shouldForceNoHours || taskData.estimated_hours === "" || taskData.estimated_hours == null
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

  // ✅ early return only after all hooks are defined
  if (!isOpen) return null;

  const isEditing = !!editingTask?.id;
  const typeChanged = isEditing && (taskData.task_type || "").trim() !== (originalTaskType || "").trim();

  return (
    <div
      className="task-modal-backdrop"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="task-modal" onMouseDown={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="task-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="task-modal-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <FaTasks />
              <span>{editingTask ? "Edit Task" : "Add Task"}</span>
            </div>
          </div>

          <button className="task-modal-close" onClick={onClose} aria-label="Close" type="button">
            <FaTimes />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="task-modal-body">
          <div className="task-form-grid">
            {/* Parent task / Subtask controls */}
            <div className="task-form-group full">
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <label style={{ display: "inline-flex", gap: 8, alignItems: "center", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={isParentTask || isLockedAsParentContainer}
                    onChange={(e) => handleToggleParentTask(e.target.checked)}
                    disabled={isLockedAsParentContainer}
                  />
                  <span className="task-form-label" style={{ margin: 0 }}>
                    This is a parent task (grouping only)
                  </span>
                </label>

                {isLockedAsParentContainer ? (
                  <span className="task-hint">(This task has sub-tasks, so Estimated Hours is locked to none.)</span>
                ) : null}
              </div>

              <div style={{ marginTop: 10 }}>
                <label className="task-form-label">Parent Task (optional)</label>
                <select
                  className="task-select"
                  value={taskData.parent_task_id || ""}
                  onChange={(e) => handleParentSelection(e.target.value)}
                  disabled={disableParentSelection || isParentContainer}
                  title={
                    isParentContainer ? "Parent tasks cannot be placed under another parent." : "Link this task as a sub-task."
                  }
                >
                  <option value="">None (top-level task)</option>
                  {filteredParentOptions.map((t) => (
                    <option key={t.id} value={t.id}>
                      {String(t.description || "(Untitled task)")}
                    </option>
                  ))}
                </select>

                {isParentContainer ? (
                  <div className="task-hint" style={{ marginTop: 6 }}>
                    Parent tasks can’t be linked under another parent.
                  </div>
                ) : isSubTask ? (
                  <div className="task-hint" style={{ marginTop: 6 }}>
                    This task is a sub-task. It will count normally in workload and availability.
                  </div>
                ) : null}
              </div>
            </div>

            <div className="task-form-group">
              <label className="task-form-label">Description</label>
              <input
                className="task-input"
                value={taskData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="Enter task description"
              />
            </div>

            <div className="task-form-group">
              <label className="task-form-label">Status</label>
              <select
                className="task-select"
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

            <div className="task-form-group">
              <label className="task-form-label">Priority</label>
              <select
                className="task-select"
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

            <div className="task-form-group">
              <label className="task-form-label">Estimated Hours</label>
              <input
                type="number"
                min="0"
                step="0.5"
                className="task-input"
                value={taskData.estimated_hours}
                onChange={(e) => handleChange("estimated_hours", e.target.value)}
                placeholder={isParentContainer ? "Not applicable for parent tasks" : "e.g. 4"}
                disabled={isParentContainer}
                title={isParentContainer ? "Parent tasks are grouping-only and should not have estimated hours." : ""}
              />
              {isParentContainer ? (
                <div className="task-hint" style={{ marginTop: 6 }}>
                  Parent tasks don’t carry estimated hours. Use sub-tasks to track workload.
                </div>
              ) : null}
            </div>

            <div className="task-form-group">
              <label className="task-form-label">Assignee</label>
              <select
                className="task-select"
                value={taskData.assignee}
                onChange={(e) => handleChange("assignee", e.target.value)}
              >
                <option value="">Unassigned</option>
                {presalesOptions.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div className="task-form-group">
              <label className="task-form-label">Task Type</label>
              <select
                className="task-select"
                value={taskData.task_type}
                onChange={(e) => handleChange("task_type", e.target.value)}
              >
                <option value="">Select type</option>
                {taskTypeOptions.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Suggested plan */}
            <div className="task-form-group full">
              <div className="subtask-info" style={{ background: "rgba(15, 23, 42, 0.03)", borderColor: "rgba(15, 23, 42, 0.12)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 800, color: "#0f172a" }}>
                    <FaInfo />
                    <span>Suggested plan</span>
                    {isEditing && typeChanged ? (
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#64748b" }}>(Task Type changed)</span>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    className="task-btn secondary"
                    onClick={applySuggestion}
                    disabled={isParentContainer || !suggestedPlan || suggestedPlan.missing || suggestedPlan.invalid}
                    title={isParentContainer ? "Suggested plan is disabled for parent tasks." : "Apply Estimated Hours + Start/End"}
                  >
                    <FaCheckCircle />
                    <span>{isEditing ? "Re-apply suggestion" : "Apply suggestion"}</span>
                  </button>
                </div>

                <div style={{ marginTop: 10, fontSize: 12 }}>
                  {isParentContainer ? (
                    <div className="task-hint">
                      Parent tasks are grouping-only. Create sub-tasks to apply suggested hours and dates.
                    </div>
                  ) : !taskData.task_type ? (
                    <div className="task-hint">Select a Task Type to see recommended hours and dates.</div>
                  ) : suggestedPlan?.missing ? (
                    <div className="task-warning">
                      No defaults found for <b>{suggestedPlan.task_type}</b>. Fill base/buffer/focus columns in <b>task_types</b>.
                    </div>
                  ) : suggestedPlan?.invalid ? (
                    <div className="task-warning">
                      Defaults for <b>{suggestedPlan.task_type}</b> look invalid (check base/buffer/focus values).
                    </div>
                  ) : (
                    <div style={{ display: "grid", gap: 8 }}>
                      <div>
                        <b>Hours:</b> {suggestedPlan.suggested_hours}h{" "}
                        <span className="task-hint">
                          (base {suggestedPlan.base_hours}h + {(suggestedPlan.buffer_pct * 100).toFixed(0)}% buffer)
                        </span>
                      </div>

                      <div>
                        <b>Assumption:</b> {suggestedPlan.focus_hours_per_day}h/day focus{" "}
                        <span className="task-hint">
                          → {suggestedPlan.work_days} working day{suggestedPlan.work_days > 1 ? "s" : ""}
                          {suggestedPlan.review_buffer_days > 0
                            ? ` + ${suggestedPlan.review_buffer_days} review day${suggestedPlan.review_buffer_days > 1 ? "s" : ""}`
                            : ""}
                        </span>
                      </div>

                      <div>
                        <b>Start:</b> {formatDate(suggestedPlan.suggested_start_date)}
                      </div>

                      <div>
                        <b>End / Commit:</b> {formatDate(suggestedPlan.suggested_end_date)}
                      </div>

                      <div className="task-hint">
                        {suggestedPlan.planned_from_due_date
                          ? "Planned backward from Due Date."
                          : "Planned forward from next working day."}{" "}
                        You can still override any fields.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="task-form-group">
              <label className="task-form-label">Start Date</label>
              <input
                type="date"
                className="task-input"
                value={taskData.start_date || ""}
                onChange={(e) => handleChange("start_date", e.target.value)}
              />
            </div>

            <div className="task-form-group">
              <label className="task-form-label">End Date</label>
              <input
                type="date"
                className="task-input"
                value={taskData.end_date || ""}
                onChange={(e) => handleChange("end_date", e.target.value)}
              />
            </div>

            <div className="task-form-group">
              <label className="task-form-label">Due Date</label>
              <input
                type="date"
                className="task-input"
                value={taskData.due_date || ""}
                onChange={(e) => handleChange("due_date", e.target.value)}
              />
            </div>

            <div className="task-form-group full">
              <label className="task-form-label">Notes</label>
              <textarea
                className="task-textarea"
                value={taskData.notes || ""}
                onChange={(e) => handleChange("notes", e.target.value)}
                placeholder="Add notes / context"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="task-modal-footer">
            <button type="button" className="task-btn secondary" onClick={onClose}>
              <FaTimes />
              <span>Cancel</span>
            </button>
            <button type="submit" className="task-btn primary" disabled={loading}>
              <FaSave />
              <span>{loading ? "Saving..." : "Save Task"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
