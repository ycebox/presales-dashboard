import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Projects from './Projects';
import TodayTasks from './TodayTasks';
import TaskSummaryDashboard from './TaskSummaryDashboard';
import ProjectDetails from './ProjectDetails';
import MeetingMinutes from './MeetingMinutes'; // ✅ New import

function App() {
  return (
    <Router basename="/presales-dashboard">
      <div className="page-wrapper">
        <div className="project-container">
          <h1 className="big-name" style={{ marginBottom: '1.5rem' }}>
            📋 Jonathan's "It's Fine, Everything's Fine" Dashboard
          </h1>

          {/* ✅ Link to Meeting Minutes Page */}
          <div style={{ marginBottom: '1rem' }}>
            <a
              href="/presales-dashboard/meeting-minutes"
              style={{
                background: '#2b6cb0',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                textDecoration: 'none',
                fontWeight: 'bold',
              }}
            >
              📄 Meeting Minutes
            </a>
          </div>

          <Routes>
            <Route
              path="/"
              element={
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr minmax(0, 2fr)',
                    gap: '5rem',
                    alignItems: 'flex-start',
                    width: '100%',
                  }}
                >
                  {/* LEFT COLUMN */}
                  <div
                    style={{
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
                    <div className="section-card">
                      <MeetingMinutes /> {/* ✅ Placed below TodayTasks */}
                    </div>
                  </div>

                  {/* RIGHT COLUMN */}
                  <div
                    className="section-card"
                    style={{
                      overflowY: 'auto',
                      maxHeight: '80vh',
                      borderLeft: '1px solid #e2e8f0',
                      paddingLeft: '1rem',
                    }}
                  >
                    <Projects />
                  </div>
                </div>
              }
            />
            <Route path="/project/:id" element={<ProjectDetails />} />
            <Route path="/meeting-minutes/:id" element={<MeetingMinutes />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
