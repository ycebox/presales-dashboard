import React, { useState, useEffect } from "react";
import { supabase } from './supabaseClient';
import { FaTasks, FaCalendarDay, FaExclamationTriangle, FaCheckCircle, FaClock, FaChartLine } from 'react-icons/fa';
import { LuLayoutDashboard } from "react-icons/lu";

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
      color: "#64748b"
    },
    { 
      label: "Due Today", 
      value: taskSummary.today, 
      icon: <FaCalendarDay />, 
      color: "#f59e0b",
      urgent: taskSummary.today > 0
    },
    { 
      label: "Overdue", 
      value: taskSummary.overdue, 
      icon: <FaExclamationTriangle />, 
      color: "#ef4444",
      urgent: taskSummary.overdue > 0
    },
    { 
      label: "Completed", 
      value: taskSummary.done, 
      icon: <FaCheckCircle />, 
      color: "#10b981"
    },
    { 
      label: "In Progress", 
      value: taskSummary.inProgress, 
      icon: <FaClock />, 
      color: "#3b82f6"
    },
    { 
      label: "Completion", 
      value: `${taskSummary.completionRate}%`, 
      icon: <FaChartLine />, 
      color: "#8b5cf6"
    }
  ];

  if (isLoading) {
    return (
      <div className="task-summary-container">
        <div className="task-summary-header">
          <LuLayoutDashboard className="header-icon" />
          <div className="header-text">
            <h2 className="summary-title">Task Overview</h2>
            <p className="summary-subtitle">Loading...</p>
          </div>
        </div>
        <div className="summary-grid">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="summary-card loading">
              <div className="loading-content"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="task-summary-container">
      {/* Clean Header */}
      <div className="task-summary-header">
        <LuLayoutDashboard className="header-icon" />
        <div className="header-text">
          <h2 className="summary-title">Task Overview</h2>
          <p className="summary-subtitle">
            {taskSummary.overdue > 0 || taskSummary.today > 0 
              ? `${taskSummary.overdue + taskSummary.today} tasks need attention`
              : 'All tasks on track'
            }
          </p>
        </div>
      </div>

      {/* Minimalist Cards Grid */}
      <div className="summary-grid">
        {summaryCards.map((card, index) => (
          <div
            key={index}
            className={`summary-card ${card.urgent ? 'urgent' : ''}`}
          >
            <div className="card-icon" style={{ color: card.color }}>
              {card.icon}
            </div>
            <div className="card-content">
              <div className="card-value">{card.value}</div>
              <div className="card-label">{card.label}</div>
            </div>
            {card.urgent && <div className="urgent-dot"></div>}
          </div>
        ))}
      </div>

      {/* Alert Banner (only if needed) */}
      {(taskSummary.overdue > 0 || taskSummary.today > 0) && (
        <div className="alert-banner">
          <FaExclamationTriangle className="alert-icon" />
          <span>
            {taskSummary.overdue > 0 && `${taskSummary.overdue} overdue`}
            {taskSummary.overdue > 0 && taskSummary.today > 0 && ', '}
            {taskSummary.today > 0 && `${taskSummary.today} due today`}
          </span>
        </div>
      )}

      <style jsx>{`
        .task-summary-container {
          background: #ffffff;
          border-radius: 12px;
          padding: 1.5rem;
          border: 1px solid #f1f5f9;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .task-summary-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
        }

        .header-icon {
          font-size: 1.25rem;
          color: #64748b;
        }

        .header-text {
          flex: 1;
        }

        .summary-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0;
        }

        .summary-subtitle {
          font-size: 0.875rem;
          color: #64748b;
          margin: 0.25rem 0 0 0;
          font-weight: 500;
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
        }

        .summary-card {
          background: #fafafa;
          border: 1px solid #f3f4f6;
          border-radius: 8px;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          transition: all 0.2s ease;
          cursor: pointer;
          position: relative;
        }

        .summary-card:hover {
          background: #ffffff;
          border-color: #e5e7eb;
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }

        .summary-card.urgent {
          border-color: #fecaca;
          background: #fefefe;
        }

        .summary-card.urgent:hover {
          border-color: #f87171;
        }

        .card-icon {
          font-size: 1.25rem;
          margin-bottom: 0.75rem;
        }

        .card-content {
          width: 100%;
        }

        .card-value {
          font-size: 1.5rem;
          font-weight: 800;
          color: #1e293b;
          margin-bottom: 0.25rem;
          line-height: 1;
        }

        .card-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .urgent-dot {
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
          width: 0.5rem;
          height: 0.5rem;
          background: #ef4444;
          border-radius: 50%;
          animation: pulse 2s ease-in-out infinite;
        }

        .summary-card.loading {
          background: #f8fafc;
          border-color: #e2e8f0;
        }

        .loading-content {
          width: 100%;
          height: 60px;
          background: linear-gradient(90deg, #e2e8f0, #f1f5f9, #e2e8f0);
          background-size: 200% 100%;
          animation: shimmer 1.5s ease-in-out infinite;
          border-radius: 4px;
        }

        .alert-banner {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: #fef3c7;
          border: 1px solid #fbbf24;
          border-radius: 8px;
          padding: 0.75rem 1rem;
          margin-top: 1rem;
          font-size: 0.875rem;
          font-weight: 600;
          color: #92400e;
        }

        .alert-icon {
          font-size: 1rem;
          color: #f59e0b;
        }

        @keyframes pulse {
          0%, 100% { 
            opacity: 1; 
            transform: scale(1); 
          }
          50% { 
            opacity: 0.7; 
            transform: scale(1.1); 
          }
        }

        @keyframes shimmer {
          0% { 
            background-position: -200% 0; 
          }
          100% { 
            background-position: 200% 0; 
          }
        }

        @media (max-width: 768px) {
          .task-summary-container {
            padding: 1rem;
          }

          .summary-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 0.75rem;
          }
          
          .summary-card {
            padding: 0.75rem;
          }
          
          .card-value {
            font-size: 1.25rem;
          }
          
          .card-label {
            font-size: 0.625rem;
          }

          .card-icon {
            font-size: 1rem;
            margin-bottom: 0.5rem;
          }
        }

        @media (max-width: 480px) {
          .summary-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 0.5rem;
          }
          
          .summary-card {
            padding: 0.5rem;
          }
          
          .card-value {
            font-size: 1.125rem;
          }

          .summary-title {
            font-size: 1.125rem;
          }
        }
      `}</style>
    </div>
  );
}
