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
                    gap: '3rem', // ⬅️ Stronger horizontal spacing
                    alignItems: 'flex-start',
                    width: '100%',
                    flexWrap: 'nowrap',
                  }}
                >
                  {/* LEFT COLUMN */}
                  <div
                    style={{
                      flex: 1.2,
                      minWidth: '300px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1.5rem',
                    }}
                  >
                    <div className="section-card" style={{ padding: '1.5rem' }}>
                      <TaskSummaryDashboard />
                    </div>
                    <div className="section-card" style={{ padding: '1.5rem' }}>
                      <TodayTasks />
                    </div>
                  </div>

                  {/* RIGHT COLUMN */}
                  <div
                    className="section-card"
                    style={{
                      flex: 1.8,
                      overflowY: 'auto',
                      maxHeight: '80vh',
                      padding: '1.5rem',
                      borderLeft: '2px solid #e2e8f0',
                      background: '#ffffff',
                      borderRadius: '12px',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                      minWidth: '400px',
                    }}
                  >
                    <Projects />
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
