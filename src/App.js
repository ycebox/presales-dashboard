import React from 'react';
import './App.css';
import Projects from './Projects';
import TodayTasks from './TodayTasks';
import PersonalTodo from './PersonalTodo';
import TaskSummaryDashboard from './TaskSummaryDashboard';

function App() {
  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>📋 My Presales Dashboard</h1>
      <TaskSummaryDashboard />
      {/* Today's task summary */}
      <TodayTasks />

      {/* Projects and task tracking per project */}
      <Projects />
      <PersonalTodo />
    </div>
  );
}

export default App;
