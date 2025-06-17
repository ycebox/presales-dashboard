import React, { useState, useEffect } from "react";
import { supabase } from './supabaseClient';

export default function ProjectTasks({ projectId }) {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    due_date: "",
    status: "Open"
  });

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from("project_tasks")
      .select("*")
      .eq("project_id", projectId)
      .eq("is_archived", false)
      .order("created_at", { ascending: true });

    if (!error) setTasks(data);
    else console.error("Error loading tasks:", error);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNewTask((prev) => ({ ...prev, [name]: value }));
  };

  const handleAdd = async () => {
    if (!newTask.title.trim()) return;

    const { error } = await supabase.from("project_tasks").insert([
      {
        project_id: projectId,
        title: newTask.title,
        description: newTask.description,
        due_date: newTask.due_date || null,
        status: newTask.status,
        is_archived: false
      }
    ]);

    if (!error) {
      setNewTask({
        title: "",
        description: "",
        due_date: "",
        status: "Open"
      });
      fetchTasks();
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    const { error } = await supabase
      .from("project_tasks")
      .update({ status: newStatus })
      .eq("id", taskId);
    if (!error) fetchTasks();
  };

  const handleDelete = async (taskId) => {
    const { error } = await supabase.from("project_tasks").delete().eq("id", taskId);
    if (!error) fetchTasks();
  };

  const handleArchive = async (taskId) => {
    const { error } = await supabase
      .from("project_tasks")
      .update({ is_archived: true })
      .eq("id", taskId);
    if (!error) fetchTasks();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Open": return "green";
      case "In Progress": return "orange";
      case "Blocked": return "red";
      case "Done": return "gray";
      default: return "black";
    }
  };

  const getDueLabel = (dueDate, status) => {
    if (!dueDate || status === "Done") return null;

    const today = new Date().toISOString().split("T")[0];
    if (dueDate === today) return "🟡 Due Today";
    if (dueDate < today) return "🔴 Overdue";
    return null;
  };

  const groupTasksByStatus = () => {
    const groups = {
      "Open": [],
      "In Progress": [],
      "Blocked": [],
      "Done": []
    };
    tasks.forEach((task) => {
      if (groups[task.status]) groups[task.status].push(task);
    });
    return groups;
  };

  const grouped = groupTasksByStatus();

  return (
    <div style={{ marginTop: "10px", marginBottom: "20px" }}>
      <h4>Tasks</h4>

      {/* Add Task Form */}
      <div style={{ marginBottom: "10px" }}>
        <input
          placeholder="Task Title"
          name="title"
          value={newTask.title}
          onChange={handleChange}
          style={{ padding: "5px", marginRight: "5px", width: "160px" }}
        />
        <input
          placeholder="Description"
          name="description"
          value={newTask.description}
          onChange={handleChange}
          style={{ padding: "5px", marginRight: "5px", width: "160px" }}
        />
        <input
          type="date"
          name="due_date"
          value={newTask.due_date}
          onChange={handleChange}
          style={{ padding: "5px", marginRight: "5px" }}
        />
        <select
          name="status"
          value={newTask.status}
          onChange={handleChange}
          style={{ padding: "5px", marginRight: "5px" }}
        >
          <option>Open</option>
          <option>In Progress</option>
          <option>Blocked</option>
          <option>Done</option>
        </select>
        <button onClick={handleAdd}>Add Task</button>
      </div>

      {/* Grouped Task Lists */}
      {Object.entries(grouped).map(([status, taskList]) => (
        <div key={status} style={{ marginTop: "20px" }}>
          <h5 style={{ color: getStatusColor(status) }}>
            ● {status} ({taskList.length})
          </h5>
          {taskList.length === 0 && <p style={{ fontSize: "0.9rem", color: "#666" }}>No tasks</p>}
          <ul style={{ marginTop: "5px" }}>
            {taskList.map((t) => (
              <li key={t.id} style={{ marginBottom: "15px" }}>
                <strong>{t.title}</strong><br />
                {t.description && <div>Description: {t.description}</div>}
                {t.due_date && <div>Due: {t.due_date}</div>}
                {getDueLabel(t.due_date, t.status) && (
                  <span style={{ color: "red", fontSize: "0.85rem" }}>
                    {getDueLabel(t.due_date, t.status)}
                  </span>
                )}
                <div>
                  <span style={{ color: getStatusColor(t.status), fontWeight: "bold" }}>
                    ● {t.status}
                  </span>{" "}
                  <select
                    value={t.status}
                    onChange={(e) => handleStatusChange(t.id, e.target.value)}
                    style={{ marginLeft: "10px" }}
                  >
                    <option>Open</option>
                    <option>In Progress</option>
                    <option>Blocked</option>
                    <option>Done</option>
                  </select>
                  <button onClick={() => handleArchive(t.id)} style={{ marginLeft: "10px" }}>
                    Archive
                  </button>
                  <button onClick={() => handleDelete(t.id)} style={{ marginLeft: "5px", color: "red" }}>
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
