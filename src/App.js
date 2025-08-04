// App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import enUS from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';

import { supabase } from './supabaseClient';
import Projects from './Projects';
import TodayTasks from './TodayTasks';
import ProjectDetails from './ProjectDetails';
import CustomerDetails from './CustomerDetails';
import './App.css';

const locales = {
  'en-US': enUS,
};
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [calendarTasks, setCalendarTasks] = useState([]);

  useEffect(() => {
    autoAuthenticate();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => subscription?.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      fetchCalendarTasks();
    }
  }, [user]);

  const fetchCalendarTasks = async () => {
    const { data, error } = await supabase
      .from('project_tasks')
      .select('description, due_date');

    if (!error && data) {
      const formatted = data
        .filter(t => t.due_date)
        .map(t => ({
          title: t.description,
          start: new Date(t.due_date),
          end: new Date(t.due_date),
        }));
      setCalendarTasks(formatted);
    }
  };

  const autoAuthenticate = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        setLoading(false);
        return;
      }

      const defaultEmail = 'admin@presales.com';
      const defaultPassword = 'presales123';
      let { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: defaultEmail,
        password: defaultPassword
      });

      if (signInError && signInError.message.includes('Invalid login credentials')) {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: defaultEmail,
          password: defaultPassword
        });
        if (!signUpError) {
          setUser(signUpData.user);
        }
      } else if (!signInError) {
        setUser(data.user);
      }
    } catch (error) {
      console.error('Auto-authentication failed:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p className="loading-text">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <Router basename="/presales-dashboard">
      <div className="app-wrapper">
        <div className="main-container">
          <header className="dashboard-header">
            <div className="header-content">
              <div className="header-info">
                <h1 className="section-title">Jonathan's Command Center</h1>
                <p className="dashboard-subtitle">The Procrastinator's Paradise</p>
              </div>
              <div className="header-status">
                <div className="status-indicator"></div>
                <span className="status-text">Online</span>
              </div>
            </div>
          </header>

          <Routes>
            <Route
              path="/"
              element={
                <main className="dashboard-main">
                  {/* Weekly Calendar View */}
                  <div className="calendar-widget widget-card">
                    <BigCalendar
                      localizer={localizer}
                      events={calendarTasks}
                      startAccessor="start"
                      endAccessor="end"
                      views={['week']}
                      defaultView="week"
                      style={{ height: 450 }}
                      onSelectEvent={(event) => alert(event.title)}
                    />
                  </div>

                  {/* Two-column layout below */}
                  <div className="dashboard-bottom">
                    <div className="dashboard-left">
                      <div className="widget-card tasks-widget">
                        <TodayTasks />
                      </div>
                    </div>
                    <div className="dashboard-right">
                      <div className="widget-card projects-widget">
                        <Projects />
                      </div>
                    </div>
                  </div>
                </main>
              }
            />
            <Route path="/project/:id" element={<ProjectDetails />} />
            <Route path="/customer/:customerId" element={<CustomerDetails />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
