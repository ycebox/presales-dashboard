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
                <div style={{ overflowX: 'auto' }}>
                  <div className="dashboard-grid-2col">
                    {/* LEFT COLUMN */}
                    <div className="left-stack">
                      <div className="section-card">
                        <TaskSummaryDashboard />
                      </div>
                      <div className="section-card">
                        <TodayTasks />
                      </div>
                    </div>

                    {/* RIGHT COLUMN */}
                    <div className="right-projects section-card">
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
