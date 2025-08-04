// App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { supabase } from './supabaseClient';
import Projects from './Projects';
import TodayTasks from './TodayTasks';
import TaskSummaryDashboard from './TaskSummaryDashboard';
import ProjectDetails from './ProjectDetails';
import CustomerDetails from './CustomerDetails';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    autoAuthenticate();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth event:', event);
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => subscription?.unsubscribe();
  }, []);

  const autoAuthenticate = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        console.log('Existing user found:', user.email);
        setUser(user);
        setLoading(false);
        return;
      }
      console.log('No existing user, creating automatic session...');
      const defaultEmail = 'admin@presales.com';
      const defaultPassword = 'presales123';
      let { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: defaultEmail,
        password: defaultPassword
      });
      if (signInError && signInError.message.includes('Invalid login credentials')) {
        console.log('Default user not found, creating one...');
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: defaultEmail,
          password: defaultPassword
        });
        if (signUpError) {
          console.error('Could not create default user:', signUpError);
        } else {
          console.log('Default user created and signed in');
          setUser(signUpData.user);
        }
      } else if (!signInError) {
        console.log('Signed in with default user');
        setUser(data.user);
      } else {
        console.error('Authentication error:', signInError);
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
                  <div className="dashboard-top">
                    <div className="widget-card summary-widget">
                      <TaskSummaryDashboard />
                    </div>
                  </div>

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
