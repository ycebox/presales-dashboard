import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Projects from './Projects';
import TodayTasks from './TodayTasks';
import TaskSummaryDashboard from './TaskSummaryDashboard';
import ProjectDetails from './ProjectDetails';
import MeetingMinutes from './MeetingMinutes'; // ✅ Already imported

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
            <Route path="/meeting-minutes" element={<MeetingMinutes />} />
            <Route path="/meeting-minutes/*" element={<MeetingMinutes />} /> {/* ✅ Add this line */}
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
