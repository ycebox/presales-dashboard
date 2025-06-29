import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Projects from './Projects';
import TodayTasks from './TodayTasks';
import TaskSummaryDashboard from './TaskSummaryDashboard';
import ProjectDetails from './ProjectDetails';

function App() {
  return (
    <Router basename="/presales-dashboard">
      <div className="page-wrapper">
        <div className="project-container">
          <h1 className="big-name" style={{ marginBottom: '1.5rem' }}>
            📋 Jonathan's "It's Fine, Everything's Fine" Dashboard
          </h1>

          <Routes>
            <Route
              path="/"
              element={
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    width: '100%',
                    flexWrap: 'nowrap',
                  }}
                >
                  {/* LEFT COLUMN */}
                  <div
                    style={{
                      flex: 1,
                      minWidth: '300px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1.5rem',
                      marginRight: '2rem', // ensures spacing between columns
                    }}
                  >
                    <div className="section-card">
                      <TaskSummaryDashboard />
                    </div>
                    <div className="section-card">
                      <TodayTasks />
                    </div>
                  </div>

                  {/* RIGHT COLUMN — REMOVE CARD WRAPPER HERE */}
                  <div
                    style={{
                      flex: 2,
                      overflowY: 'auto',
                      maxHeight: '80vh',
                      paddingLeft: '1rem',
                      borderLeft: '1px solid #e2e8f0',
                      minWidth: '400px',
                    }}
                  >
                    <Projects />
                  </div>
                </div>
              }
            />
            <Route
