import React, { useState, useEffect } from "react";
import { supabase } from './supabaseClient';
import { FaTasks, FaCalendarDay, FaExclamationTriangle, FaCheckCircle, FaClock, FaChartLine } from 'react-icons/fa';
import { LuLayoutDashboard, LuTrendingUp } from "react-icons/lu";
import { HiOutlineSparkles } from "react-icons/hi";

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
      gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      iconColor: "#667eea",
      description: "All active tasks"
    },
    { 
      label: "Due Today", 
      value: taskSummary.today, 
      icon: <FaCalendarDay />, 
      gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
      iconColor: "#f093fb",
      description: "Tasks due today",
      urgent: taskSummary.today > 0
    },
    { 
      label: "Overdue", 
      value: taskSummary.overdue, 
      icon: <FaExclamationTriangle />, 
      gradient: "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)",
      iconColor: "#ff6b6b",
      description: "Past due tasks",
      urgent: taskSummary.overdue > 0
    },
    { 
      label: "Completed", 
      value: taskSummary.done, 
      icon: <FaCheckCircle />, 
      gradient: "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)",
      iconColor: "#51cf66",
      description: "Tasks finished"
    },
    { 
      label: "In Progress", 
      value: taskSummary.inProgress, 
      icon: <FaClock />, 
      gradient: "linear-gradient(135deg, #d299c2 0%, #fef9d7 100%)",
      iconColor: "#fab005",
      description: "Currently working"
    },
    { 
      label: "Completion", 
      value: `${taskSummary.completionRate}%`, 
      icon: <FaChartLine />, 
      gradient: "linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)",
      iconColor: "#339af0",
      description: "Overall progress"
    }
  ];

  if (isLoading) {
    return (
      <div className="task-summary-container">
        <div className="task-summary-header">
          <LuLayoutDashboard className="header-icon" />
          <div className="header-text">
            <h2 className="summary-title">Task Overview</h2>
            <p className="summary-subtitle">Loading your task insights...</p>
          </div>
        </div>
        <div className="loading-grid">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="summary-card loading">
              <div className="loading-shimmer"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="task-summary-container">
      {/* Enhanced Header */}
      <div className="task-summary-header">
        <div className="header-icon-wrapper">
          <LuLayoutDashboard className="header-icon" />
          <HiOutlineSparkles className="sparkle-icon" />
        </div>
        <div className="header-text">
          <h2 className="summary-title">Task Overview</h2>
          <p className="summary-subtitle">Your productivity at a glance</p>
        </div>
        {taskSummary.completionRate >= 80 && (
          <div className="achievement-badge">
            <LuTrendingUp />
            <span>Great Progress!</span>
          </div>
        )}
      </div>

      {/* Summary Cards Grid */}
      <div className="summary-grid">
        {summaryCards.map((card, index) => (
          <div
            key={index}
            className={`summary-card ${card.urgent ? 'urgent' : ''}`}
            style={{
              background: card.gradient,
              animationDelay: `${index * 0.1}s`
            }}
          >
            <div className="card-content">
              <div className="card-header">
                <div 
                  className="card-icon"
                  style={{ color: card.iconColor }}
                >
                  {card.icon}
                </div>
                {card.urgent && (
                  <div className="urgent-pulse"></div>
                )}
              </div>
              
              <div className="card-body">
                <div className="card-value">{card.value}</div>
                <div className="card-label">{card.label}</div>
                <div className="card-description">{card.description}</div>
              </div>
            </div>
            
            <div className="card-overlay"></div>
          </div>
        ))}
      </div>

      {/* Quick Insights */}
      {(taskSummary.overdue > 0 || taskSummary.today > 0) && (
        <div className="quick-insights">
          <div className="insight-header">
            <FaExclamationTriangle className="insight-icon" />
            <span>Action Required</span>
          </div>
          <div className="insight-content">
            {taskSummary.overdue > 0 && (
              <span className="insight-item overdue">
                {taskSummary.overdue} overdue task{taskSummary.overdue !== 1 ? 's' : ''}
              </span>
            )}
            {taskSummary.today > 0 && (
              <span className="insight-item today">
                {taskSummary.today} due today
              </span>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .task-summary-container {
          padding: 1.5rem;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%);
          border-radius: 1rem;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(226, 232, 240, 0.5);
        }

        .task-summary-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.5rem;
          position: relative;
        }

        .header-icon-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 3rem;
          height: 3rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 0.75rem;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        .header-icon {
          font-size: 1.25rem;
          color: white;
        }

        .sparkle-icon {
          position: absolute;
          top: -0.25rem;
          right: -0.25rem;
          font-size: 0.75rem;
          color: #fbbf24;
          animation: sparkle 2s ease-in-out infinite;
        }

        .header-text {
          flex: 1;
        }

        .summary-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0;
          letter-spacing: -0.025em;
        }

        .summary-subtitle {
          font-size: 0.875rem;
          color: #64748b;
          margin: 0.25rem 0 0 0;
          font-weight: 500;
        }

        .achievement-badge {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 2rem;
          font-size: 0.875rem;
          font-weight: 600;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
          animation: slideIn 0.5s ease-out;
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .summary-card {
          position: relative;
          border-radius: 0.75rem;
          padding: 1rem;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          overflow: hidden;
          animation: fadeInUp 0.6s ease-out forwards;
          opacity: 0;
          transform: translateY(20px);
          min-height: 110px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .summary-card:hover {
          transform: translateY(-4px) scale(1.02);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
        }

        .summary-card.urgent {
          animation: urgentPulse 2s ease-in-out infinite;
        }

        .card-content {
          position: relative;
          z-index: 2;
        }

        .card-header {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 0.5rem;
          position: relative;
        }

        .card-icon {
          font-size: 1.25rem;
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
        }

        .urgent-pulse {
          position: absolute;
          top: -0.25rem;
          right: -0.25rem;
          width: 0.375rem;
          height: 0.375rem;
          background: #ef4444;
          border-radius: 50%;
          animation: pulse 1.5s ease-in-out infinite;
        }

        .card-body {
          text-align: center;
        }

        .card-value {
          font-size: 1.5rem;
          font-weight: 800;
          color: white;
          margin-bottom: 0.125rem;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          font-family: 'Inter', sans-serif;
          line-height: 1;
        }

        .card-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.9);
          margin-bottom: 0.125rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          line-height: 1;
        }

        .card-description {
          font-size: 0.625rem;
          color: rgba(255, 255, 255, 0.7);
          font-weight: 500;
          line-height: 1;
        }

        .card-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(45deg, transparent 30%, rgba(255, 255, 255, 0.1) 50%, transparent 70%);
          opacity: 0;
          transition: opacity 0.3s ease;
          pointer-events: none;
        }

        .summary-card:hover .card-overlay {
          opacity: 1;
        }

        .loading-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.75rem;
        }

        .summary-card.loading {
          background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
          border: 1px solid #e2e8f0;
          min-height: 110px;
        }

        .loading-shimmer {
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.8), transparent);
          animation: shimmer 1.5s ease-in-out infinite;
        }

        .quick-insights {
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          border: 1px solid #f59e0b;
          border-radius: 0.75rem;
          padding: 1rem;
          margin-top: 1rem;
        }

        .insight-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 600;
          color: #92400e;
          margin-bottom: 0.5rem;
          font-size: 0.875rem;
        }

        .insight-icon {
          font-size: 1rem;
        }

        .insight-content {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
        }

        .insight-item {
          background: rgba(255, 255, 255, 0.8);
          padding: 0.375rem 0.75rem;
          border-radius: 1rem;
          font-size: 0.75rem;
          font-weight: 600;
          border: 1px solid rgba(245, 158, 11, 0.3);
        }

        .insight-item.overdue {
          color: #dc2626;
          background: rgba(254, 226, 226, 0.8);
          border-color: rgba(220, 38, 38, 0.3);
        }

        .insight-item.today {
          color: #7c2d12;
        }

        @keyframes fadeInUp {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes sparkle {
          0%, 100% { transform: scale(1) rotate(0deg); opacity: 1; }
          50% { transform: scale(1.2) rotate(180deg); opacity: 0.8; }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.2); }
        }

        @keyframes urgentPulse {
          0%, 100% { box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); }
          50% { box-shadow: 0 8px 24px rgba(239, 68, 68, 0.3); }
        }

        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        @media (max-width: 768px) {
          .summary-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 0.5rem;
          }
          
          .task-summary-container {
            padding: 1rem;
          }
          
          .card-value {
            font-size: 1.25rem;
          }
          
          .card-label {
            font-size: 0.625rem;
          }
          
          .card-description {
            font-size: 0.5rem;
          }
          
          .achievement-badge {
            display: none;
          }
          
          .summary-card {
            min-height: 90px;
            padding: 0.75rem;
          }
        }

        @media (max-width: 480px) {
          .summary-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 0.5rem;
          }
          
          .summary-card {
            min-height: 80px;
            padding: 0.5rem;
          }
          
          .card-value {
            font-size: 1.125rem;
          }
        }
      `}</style>
    </div>
  );
}
