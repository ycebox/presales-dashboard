import React, { useState, useEffect } from "react";
import supabase from "./supabaseClient";

export default function PersonalTodo() {
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
      .from("personal_tasks")
      .select("*")
      .eq("is_archived", false)
      .order("created_at", { ascending: true });

    if (!error) setTasks(data);
    else console.error("Fetch error:", error);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNewTask((prev) => ({ ...prev, [name]: value }));
  };

  const handleAdd = async () => {
    if (!newTask.title.trim()) return;

    const { error } = await supabase.from("personal_tasks").insert([
      {
        ...newTask,
        due_date: newTask.due_date || null,
        is_archived: false
      }
    ]);

    if (!error) {
      setNewTask({ title: "", description: "", due_date: "", status: "Open" });
      fetchTasks();
    }
  };

  const handleStatusChange = async (id, status) => {
    const { error } = await supabase
      .from("personal_tasks")
      .update({ status })
      .eq("id", id);

    if (!error) fetchTasks();
  };

  const handleArchive = async (id) => {
    const { error } = await supabase
      .from("personal_tasks")
      .update({ is_archived: true })
      .eq("id", id);

    if (!error) fetchTasks();
  };

  const handleDelete = async (id) => {
    const { error } = await supabase
      .from("personal_tasks")
      .delete()
      .eq("id", id);

    if (!error) fetchTasks();
  };

  const getColor = (status) => {
    switch (status) {
      case "Open": return "green";
      case "In Progress": return "orange";
      case "Blocked": return "red";
      case "Done": return "gray";
      default: return "black";
    }
  };

  const today = new Date().toISOString().split("T")[0];
  const overdue = tasks.filter(t => t.due_date && t.due_date < today && t.status !== "Done");
  const todayDue = tasks.filter(t => t.due_date === today && t.status !== "Done");
  const doneTasks = tasks.filter(t => t.status === "Done");
  const other = tasks.filter(t => !overdue.includes(t) && !todayDue.includes(t) && !doneTasks.includes(t));

  const renderTasks = (title, list, color) => (
    <div style={{ marginBottom: "20px" }}>
      <h4 style={{ color }}>{title} ({list.length})</h4>
      {list.length === 0 ? <p style={{ fontSize: "0.9rem", color: "#666" }}>No tasks</p> : (
        <ul>
          {list.map((t) => (
            <li key={t.id} style={{ marginBottom: "15px", padding: "10px", border: "1px solid #eee" }}>
              <strong>{t.title}</strong><br />
              {t.description && <div>Description: {t.description}</div>}
              {t.due_date && <div>Due: {t.due_date}</div>}
              <div style={{ marginTop: "5px" }}>
                <span style={{ color: getColor(t.status), fontWeight: "bold" }}>● {t.status}</span>{" "}
                <select value={t.status} onChange={(e) => handleStatusChange(t.id, e.target.value)} style={{ marginLeft: "10px" }}>
                  <option>Open</option>
                  <option>In Progress</option>
                  <option>Blocked</option>
                  <option>Done</option>
                </select>
                <button onClick={() => handleArchive(t.id)} style={{ marginLeft: "10px" }}>Archive</button>
                <button onClick={() => handleDelete(t.id)} style={{ marginLeft: "5px", color: "red" }}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <section style={{ padding: "20px", border: "1px solid #ccc", marginTop: "20px" }}>
      <h2>📝 Personal To-Do List</h2>

      <div style={{ marginBottom: "10px" }}>
        <input
          name="title"
          placeholder="Task Title"
          value={newTask.title}
          onChange={handleChange}
          style={{ marginRight: "10px", padding: "5px" }}
        />
        <input
          name="description"
          placeholder="Description"
          value={newTask.description}
          onChange={handleChange}
          style={{ marginRight: "10px", padding: "5px" }}
        />
        <input
          name="due_date"
          type="date"
          value={newTask.due_date}
          onChange={handleChange}
          style={{ marginRight: "10px", padding: "5px" }}
        />
        <select name="status" value={newTask.status} onChange={handleChange} style={{ marginRight: "10px" }}>
          <option>Open</option>
          <option>In Progress</option>
          <option>Blocked</option>
          <option>Done</option>
        </select>
        <button onClick={handleAdd}>Add Task</button>
      </div>

      {renderTasks("🔴 Overdue", overdue, "red")}
      {renderTasks("🟡 Due Today", todayDue, "orange")}
      {renderTasks("✅ Done", doneTasks, "gray")}
      {renderTasks("📋 Other", other, "black")}
    </section>
  );
}
