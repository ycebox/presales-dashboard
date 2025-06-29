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
                <div className="dashboard-grid-2col">
                  {/* Left Column */}
                  <div className="left-stack">
                    <TaskSummaryDashboard />
                    <TodayTasks />
                  </div>

                  {/* Right Column */}
                  <div className="right-projects">
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
