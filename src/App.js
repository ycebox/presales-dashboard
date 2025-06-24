import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Projects from './Projects';
import TodayTasks from './TodayTasks';
import TaskSummaryDashboard from './TaskSummaryDashboard';
import ProjectDetails from './ProjectDetails';

function App() {
  return (
    <Router basename="/presales-dashboard">
      <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
        <h1>📋 My Presales Dashboard</h1>
        <Routes>
          <Route
            path="/"
            element={
              <>
                <TaskSummaryDashboard />
                <TodayTasks />
                <Projects />
              </>
            }
          />
          <Route path="/project/:id" element={<ProjectDetails />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
