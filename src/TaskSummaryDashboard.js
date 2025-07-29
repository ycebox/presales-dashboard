import React, { useState, useEffect } from "react";
import { supabase } from './supabaseClient';
import { 
  FaTasks, 
  FaCalendarDay, 
  FaExclamationTriangle, 
  FaCheckCircle, 
  FaClock, 
  FaChartLine 
} from 'react-icons/fa';
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
      icon: <FaTasks />, 
      color: "var(--color-gray-600)",
      bgColor: "var(--color-gray-100)"
    },
    { 
      label: "Due Today", 
      value: taskSummary.today, 
      icon: <FaCalendarDay />, 
      color: "var(--color-warning)",
      bgColor: "rgba(245, 158, 11, 0.1)",
      urgent: taskSummary.today > 0
    },
    { 
      label: "Overdue", 
      value: taskSummary.overdue, 
      icon: <FaExclamationTriangle />, 
      color: "var(--color-danger)",
      bgColor: "rgba(239, 68, 68, 0.1)",
      urgent: taskSummary.overdue > 0
    },
    { 
      label: "Completed", 
      value: taskSummary.done, 
      icon: <FaCheckCircle />, 
      color: "var(--color-success)",
      bgColor: "rgba(16, 185, 129, 0.1)"
    },
    { 
      label: "In Progress", 
      value: taskSummary.inProgress, 
      icon: <FaClock />, 
      color: "var(--color-primary)",
      bgColor: "var(--color-primary-subtle)"
    },
    { 
      label: "Completion", 
      value: `${taskSummary.completionRate}%`, 
      icon: <FaChartLine />, 
      color: "#8b5cf6",
      bgColor: "rgba(139, 92, 246, 0.1)"
    }
  ];

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <div className="task-summary-container">
      <div className="task-summary-header">
        <div className="header-icon-skeleton"></div>
        <div className="header-text">
          <div className="title-skeleton"></div>
          <div className="subtitle-skeleton"></div>
        </div>
      </div>
      <div className="summary-grid">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="summary-card loading">
            <div className="loading-icon"></div>
            <div className="loading-value"></div>
            <div className="loading-label"></div>
          </div>
        ))}
      </div>
    </div>
  );

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  const hasUrgentTasks = taskSummary.overdue > 0 || taskSummary.today > 0;

  return (
    <div className="task-summary-container">
      {/* Clean Minimalist Header */}
      <header className="task-summary-header">
        <div className="header-icon-wrapper">
          <LuLayoutDashboard className="header-icon" aria-hidden="true" />
        </div>
        <div className="header-text">
          <h2 className="summary-title" id="summary-heading">Task Overview</h2>
          <p className="summary-subtitle" role="status" aria-live="polite">
            {hasUrgentTasks
              ? `${taskSummary.overdue + taskSummary.today} tasks need attention`
              : 'All tasks on track'
            }
          </p>
        </div>
      </header>

      {/* Minimalist Cards Grid */}
      <div 
        className="summary-grid" 
        role="region" 
        aria-labelledby="summary-heading"
      >
        {summaryCards.map((card, index) => (
          <div
            key={index}
            className={`summary-card ${card.urgent ? 'urgent' : ''}`}
            role="button"
            tabIndex="0"
            aria-label={`${card.label}: ${card.value}${card.urgent ? ' - Requires attention' : ''}`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                // Add click handler here if needed
              }
            }}
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
              <div className="card-value" aria-hidden="true">
                {card.value}
              </div>
              <div className="card-label">
                {card.label}
              </div>
            </div>
            
            {card.urgent && (
              <div 
                className="urgent-indicator" 
                aria-label="Urgent"
                role="status"
              ></div>
            )}
          </div>
        ))}
      </div>

      {/* Subtle Alert Banner */}
      {hasUrgentTasks && (
        <div className="alert-banner" role="alert">
          <div className="alert-icon-wrapper">
            <FaExclamationTriangle className="alert-icon" aria-hidden="true" />
          </div>
          <div className="alert-content">
            <span className="alert-text">
              {taskSummary.overdue > 0 && (
                <span className="alert-item overdue">
                  {taskSummary.overdue} overdue
                </span>
              )}
              {taskSummary.overdue > 0 && taskSummary.today > 0 && (
                <span className="alert-separator"> • </span>
              )}
              {taskSummary.today > 0 && (
                <span className="alert-item today">
                  {taskSummary.today} due today
                </span>
              )}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
