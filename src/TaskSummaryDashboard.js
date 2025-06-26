import React, { useState, useEffect } from "react";
import { supabase } from './supabaseClient';
import { FaTasks, FaCalendarDay, FaExclamationCircle, FaCheck } from 'react-icons/fa';
import { LuLayoutDashboard } from "react-icons/lu";
import './ProjectDetails.css'; // reuse section-card and font styles

export default function TaskSummaryDashboard() {
  const [taskSummary, setTaskSummary] = useState({
    total: 0,
    today: 0,
    overdue: 0,
    done: 0
  });

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    const today = new Date().toISOString().split("T")[0];

    const [projectTasks, personalTasks] = await Promise.all([
      supabase.from("project_tasks").select("*"),
      supabase.from("personal_tasks").select("*")
    ]);

    const allTasks = [...(projectTasks.data || []), ...(personalTasks.data || [])]
      .filter(t => !t.is_archived);

    const todayCount = allTasks.filter(t => t.due_date === today && t.status !== "Done").length;
    const overdueCount = allTasks.filter(t => t.due_date && t.due_date < today && t.status !== "Done").length;
    const doneCount = allTasks.filter(t => t.status === "Done").length;

    setTaskSummary({
      total: allTasks.length,
      today: todayCount,
      overdue: overdueCount,
      done: doneCount
    });
  };

  const summaryCards = [
    { label: "Total Tasks", value: taskSummary.total, icon: <FaTasks />, bg: "#bbc2c9" },
    { label: "Due Today", value: taskSummary.today, icon: <FaCalendarDay />, bg: "#d1d8db" },
    { label: "Overdue", value: taskSummary.overdue, icon: <FaExclamationCircle />, bg: "#e6e9ea" },
    { label: "Done", value: taskSummary.done, icon: <FaCheck />, bg: "#f3f5f6" },
  ];

  return (
    <div className="section-card">
      <h2 style={{ fontSize: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem", color: "#1e293b" }}>
        <LuLayoutDashboard /> Task Summary Dashboard
      </h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
        {summaryCards.map((card, index) => (
          <div
            key={index}
            style={{
              backgroundColor: card.bg,
              borderRadius: "12px",
              padding: "1.2rem",
              minWidth: "160px",
              flex: "1",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              boxShadow: "0 4px 8px rgba(0,0,0,0.04)",
              fontWeight: "600",
              fontSize: "1rem"
            }}
          >
            <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>{card.icon}</div>
            <div>{card.label}</div>
            <div style={{ fontSize: "1.25rem", marginTop: "0.25rem", color: "#1e293b" }}>
              {card.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
