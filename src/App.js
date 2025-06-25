import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Projects from './Projects';
import TodayTasks from './TodayTasks';
import TaskSummaryDashboard from './TaskSummaryDashboard';
import ProjectDetails from './ProjectDetails';
import './ProjectDetails.css';
import { FaHome } from 'react-icons/fa';

function App() {
  return (
    <Router basename="/presales-dashboard">
      <div className="page-wrapper navy-theme">
        <div className="page-content">
          <div className="sidebar">
            <h2>SmartVista</h2>
            <nav>
              <a href="/"><FaHome /> Dashboard</a>
            </nav>
          </div>

          <div className="project-container">
            <Routes>
              <Route
                path="/"
                element={
                  <>
                    <h1 className="big-name">📋 Jonathan's "It's Fine, Everything's Fine" Dashboard</h1>
                    <TaskSummaryDashboard />
                    <TodayTasks />
                    <Projects />
                  </>
                }
              />
              <Route path="/project/:id" element={<ProjectDetails />} />
            </Routes>
          </div>
        </div>
      </div>
    </Router>
  );
}

export default App;
