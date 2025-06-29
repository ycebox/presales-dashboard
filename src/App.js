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
                    }}
                  >
                    <div className="section-card">
                      <TaskSummaryDashboard />
                    </div>
                    <div className="section-card">
                      <TodayTasks />
                    </div>
                  </div>

                  {/* SPACER */}
                  <div style={{ width: '2rem' }} /> {/* 👈 Forces gap visually */}

                  {/* RIGHT COLUMN WRAPPER */}
                  <div style={{ flex: 2 }}>
                    <div
                      className="section-card"
                      style={{
                        overflowY: 'auto',
                        maxHeight: '80vh',
                        borderLeft: '1px solid #e2e8f0',
                        paddingLeft: '1rem',
                        minWidth: '400px',
                      }}
                    >
                      <Projects />
                    </div>
                  </div>
                </div>
              }
            />
            <Route path="/project/:id" element={<ProjectDetails />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
