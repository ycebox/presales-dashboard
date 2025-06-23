import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import './App.css';
import Projects from './Projects';
import TodayTasks from './TodayTasks';
import TaskSummaryDashboard from './TaskSummaryDashboard';
import ProjectDetailsPage from './ProjectDetailsPage'; // <-- new page

function App() {
  return (
    <Router>
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
          <Route path="/project/:id" element={<ProjectDetailsPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
