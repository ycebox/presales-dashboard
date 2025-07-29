import React, { useState, useEffect } from "react";
import { supabase } from './supabaseClient';
import {
  CalendarDays, AlarmClock, CheckCircle, ListChecks, BarChart3,  LoaderCircle
} from 'lucide-react';
import { LuLayoutDashboard } from "react-icons/lu";
import './TaskSummaryDashboard.css';

export default function TaskSummaryDashboard() {
  const [taskSummary, setTaskSummary] = useState({
    total: 0,
    today: 0,
    overdue: 0,
    done: 0,
    inProgress: 0,
    completionRate: 0
  });

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    setIsLoading(true);
    try {
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
      const inProgressCount = allTasks.filter(t => t.status === "In Progress").length;
      const completionRate = allTasks.length > 0 ? Math.round((doneCount / allTasks.length) * 100) : 0;

      setTaskSummary({
        total: allTasks.length,
        today: todayCount,
        overdue: overdueCount,
        done: doneCount,
        inProgress: inProgressCount,
        completionRate
      });
    } catch (error) {
      console.error('Error fetching task summary:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const summaryCards = [
    {
      label: "Total Tasks",
      value: taskSummary.total,
      icon: <ListChecks size={18} strokeWidth={1.5} />,
      color: "var(--color-gray-600)",
      bgColor: "var(--color-gray-100)"
    },
    {
      label: "Due Today",
      value: taskSummary.today,
      icon: <CalendarDays size={18} strokeWidth={1.5} />,
      color: "var(--color-warning)",
      bgColor: "rgba(245, 158, 11, 0.1)",
      urgent: taskSummary.today > 0
    },
    {
      label: "Overdue",
      value: taskSummary.overdue,
      icon: <AlarmClock size={18} strokeWidth={1.5} />,
      color: "var(--color-danger)",
      bgColor: "rgba(239, 68, 68, 0.1)",
      urgent: taskSummary.overdue > 0
    },
    {
      label: "Completed",
      value: taskSummary.done,
      icon: <CheckCircle size={18} strokeWidth={1.5} />,
      color: "var(--color-success)",
      bgColor: "rgba(16, 185, 129, 0.1)"
    },
    {
      label: "In Progress",
      value: taskSummary.inProgress,
      icon: <LoaderCircle size={18} strokeWidth={1.5} />,
      color: "var(--color-primary)",
      bgColor: "var(--color-primary-subtle)"
    },
    {
      label: "Completion",
      value: `${taskSummary.completionRate}%`,
      icon: <BarChart3 size={18} strokeWidth={1.5} />,
      color: "#8b5cf6",
      bgColor: "rgba(139, 92, 246, 0.1)"
    }
  ];

  if (isLoading) return <div className="task-summary-container">Loading...</div>;

  const hasUrgentTasks = taskSummary.overdue > 0 || taskSummary.today > 0;

  return (
    <div className="task-summary-container">
      <header className="task-summary-header">
        <div className="header-icon-wrapper">
          <LuLayoutDashboard className="header-icon" aria-hidden="true" />
        </div>
        <div className="header-text">
          <h2 className="summary-title section-title" id="summary-heading">Task Overview</h2>
          <p className="summary-subtitle" role="status" aria-live="polite">
            {hasUrgentTasks
              ? `${taskSummary.overdue + taskSummary.today} tasks need attention`
              : 'All tasks on track'}
          </p>
        </div>
      </header>

      <div className="summary-grid" role="region" aria-labelledby="summary-heading">
        {summaryCards.map((card, index) => (
          <div
            key={index}
            className={`summary-card ${card.urgent ? 'urgent' : ''}`}
            role="button"
            tabIndex="0"
          >
            <div
              className="card-icon-wrapper"
              style={{
                backgroundColor: card.bgColor,
                borderColor: card.color + '20'
              }}
            >
              <div className="card-icon" style={{ color: card.color }}>
                {card.icon}
              </div>
            </div>

            <div className="card-content">
              <div className="card-value">{card.value}</div>
              <div className="card-label">{card.label}</div>
            </div>

            {card.urgent && (
              <div className="urgent-indicator" aria-label="Urgent" role="status"></div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
