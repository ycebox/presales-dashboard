import React, { useState, useEffect } from "react";
import { supabase } from './supabaseClient';
import { FaCalendarDay, FaExclamationCircle, FaTasks } from "react-icons/fa";

export default function TodayTasks() {
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("project_tasks")
      .select("id, description, status, due_date, project_id, projects(customer_name)")
      .lte("due_date", today)
      .eq("is_archived", false)
      .order("due_date", { ascending: true });

    if (!error) {
      const filtered = data.filter(
        (t) => !["Done", "Completed", "Cancelled/On-hold"].includes(t.status)
      );
      setTasks(filtered);
    } else {
      console.error("Error loading today's tasks:", error);
    }
  };

  const today = new Date().toISOString().split("T")[0];
  const isOverdue = (due) => due && due < today;
  const isToday = (due) => due === today;

  const openCount = tasks.filter((t) => t.status !== "Done").length;
  const doneCount = tasks.filter((t) => t.status === "Done").length;

  const grouped = {
    overdue: tasks.filter((t) => isOverdue(t.due_date)),
    today: tasks.filter((t) => isToday(t.due_date)),
  };

  const scrollToProject = (projectId) => {
    const el = document.getElementById(`project-${projectId}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const getCardColor = (status) => {
    switch (status) {
      case "In Progress": return "#e6e9ea";
      case "Open": return "#d1d8db";
      default: return "#bbc2c9";
    }
  };

  return (
    <>
      <h2 style={{ display: "flex", alignItems: "center", fontSize: "1.3rem", gap: "10px", marginBottom: "12px" }}>
        <FaTasks /> Today + Overdue Tasks
      </h2>
      <p style={{ fontSize: "0.9rem", color: "#475569", marginBottom: "16px" }}>
        Total: {tasks.length} | Open: {openCount} | Done: {doneCount}
      </p>

      {["overdue", "today"].map((groupKey) => (
        grouped[groupKey].length > 0 && (
          <div key={groupKey} style={{ marginBottom: "24px" }}>
            <h4 style={{
              color: groupKey === "overdue" ? "#dc2626" : "#ea580c",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "1.05rem"
            }}>
              {groupKey === "overdue" ? <FaExclamationCircle /> : <FaCalendarDay />}
              {groupKey === "overdue" ? "Overdue Tasks" : "Due Today"}
            </h4>

            <div
              className="task-cards-wrapper"
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "1rem",
                marginTop: "10px"
              }}
            >
              {grouped[groupKey].map((t) => (
                <div
                  key={t.id}
                  onClick={() => scrollToProject(t.project_id)}
                  style={{
                    background: getCardColor(t.status),
                    padding: "14px",
                    borderRadius: "10px",
                    flex: "1 1 250px",
                    maxWidth: "280px",
                    cursor: "pointer",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
                    borderLeft: `4px solid ${groupKey === "overdue" ? "#dc2626" : "#f59e0b"}`,
                    boxSizing: "border-box"
                  }}
                >
                  <div className="task-card-text" style={{
                    fontWeight: 600,
                    fontSize: "0.95rem",
                    marginBottom: "6px",
                    wordWrap: "break-word",
                    overflowWrap: "break-word",
                    whiteSpace: "normal",
                    lineHeight: "1.4"
                  }}>
                    {t.description}
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "#475569" }}>
                    <strong>Project:</strong> {t.projects?.customer_name || t.project_id}<br />
                    <strong>Status:</strong> {t.status}<br />
                    <strong>Due:</strong> {t.due_date}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      ))}
    </>
  );
}
