import React, { useState, useEffect } from "react";
import supabase from "./supabaseClient";

export default function TodayTasks() {
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("project_tasks")
      .select("id, title, status, due_date, project_id, projects(title)")
      .lte("due_date", today)
      .eq("is_archived", false)
      .order("due_date", { ascending: true });

    if (!error) setTasks(data);
    else console.error("Error loading today's tasks:", error);
  };

  const today = new Date().toISOString().split("T")[0];
  const isOverdue = (due) => due && due < today;
  const isToday = (due) => due === today;

  const openCount = tasks.filter((t) => t.status === "Open").length;
  const doneCount = tasks.filter((t) => t.status === "Done").length;

  const grouped = {
    overdue: tasks.filter((t) => isOverdue(t.due_date)),
    today: tasks.filter((t) => isToday(t.due_date)),
  };

  const scrollToProject = (projectId) => {
    const el = document.getElementById(`project-${projectId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const getCardColor = (status) => {
    switch (status) {
      case "Open": return "#e0fce0";
      case "In Progress": return "#fff5cc";
      case "Blocked": return "#ffe6e6";
      case "Done": return "#f0f0f0";
      default: return "#ffffff";
    }
  };

  return (
    <section style={{ padding: "10px", border: "1px solid #ccc", marginBottom: "20px" }}>
      <h3>📌 Today + Overdue Tasks</h3>
      <p style={{ fontSize: "0.9rem" }}>
        Total: {tasks.length} | Open: {openCount} | Done: {doneCount}
      </p>

      {["overdue", "today"].map((groupKey) => (
        grouped[groupKey].length > 0 && (
          <div key={groupKey}>
            <h4 style={{ color: groupKey === "overdue" ? "red" : "orange" }}>
              {groupKey === "overdue" ? "🔴 Overdue" : "🟡 Due Today"}
            </h4>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
              {grouped[groupKey].map((t) => (
                <div
                  key={t.id}
                  onClick={() => scrollToProject(t.project_id)}
                  style={{
                    background: getCardColor(t.status),
                    border: "1px solid #aaa",
                    padding: "10px",
                    borderRadius: "8px",
                    width: "220px",
                    cursor: "pointer",
                    boxShadow: "1px 1px 5px rgba(0,0,0,0.1)"
                  }}
                >
                  <strong>{t.title}</strong><br />
                  <span style={{ fontSize: "0.85rem" }}>
                    Project: {t.projects?.title || t.project_id}
                  </span><br />
                  <span style={{ fontSize: "0.8rem", color: "#666" }}>
                    Status: {t.status}<br />
                    Due: {t.due_date}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )
      ))}
    </section>
  );
}
