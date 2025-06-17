import React, { useState, useEffect } from "react";
import { supabase } from './supabaseClient';

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

  const cardStyle = {
    display: "inline-block",
    padding: "10px 20px",
    margin: "10px",
    borderRadius: "8px",
    color: "white",
    fontWeight: "bold",
    width: "160px",
    textAlign: "center"
  };

  return (
    <section style={{ padding: "20px", border: "1px solid #ccc", marginTop: "20px" }}>
      <h2>📊 Task Summary Dashboard</h2>
      <div style={{ display: "flex", flexWrap: "wrap" }}>
        <div style={{ ...cardStyle, backgroundColor: "#007bff" }}>
          Total Tasks<br />
          {taskSummary.total}
        </div>
        <div style={{ ...cardStyle, backgroundColor: "orange" }}>
          Due Today<br />
          {taskSummary.today}
        </div>
        <div style={{ ...cardStyle, backgroundColor: "red" }}>
          Overdue<br />
          {taskSummary.overdue}
        </div>
        <div style={{ ...cardStyle, backgroundColor: "gray" }}>
          Done<br />
          {taskSummary.done}
        </div>
      </div>
    </section>
  );
}
