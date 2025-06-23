import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import Projects from './Projects';
import TodayTasks from './TodayTasks';
// import PersonalTodo from './PersonalTodo';
import TaskSummaryDashboard from './TaskSummaryDashboard';
import ProjectDetail from './ProjectDetail'; // <-- newly added

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
                {/* <PersonalTodo /> */}
              </>
            }
          />
          <Route path="/project/:id" element={<ProjectDetail />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
