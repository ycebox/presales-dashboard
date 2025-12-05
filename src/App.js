// App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { supabase } from './supabaseClient';
import Projects from './Projects';
import ProjectDetails from './ProjectDetails';
import CustomerDetails from './CustomerDetails';
import PresalesOverview from './PresalesOverview';
import ReportsDashboard from './ReportsDashboard';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    autoAuthenticate();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => subscription?.unsubscribe();
  }, []);

  const autoAuthenticate = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setUser(user);
        setLoading(false);
        return;
      }

      const defaultEmail = 'admin@presales.com';
      const defaultPassword = 'presales123';

      let { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: defaultEmail,
        password: defaultPassword,
      });

      if (signInError && signInError.message.includes('Invalid login credentials')) {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: defaultEmail,
          password: defaultPassword,
        });

        if (!signUpError) setUser(signUpData.user);
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

          {/* ---------- HEADER ---------- */}
          <header className="dashboard-header">
            <div className="header-content">

              {/* Left side title */}
              <div className="header-info">
                <h1 className="section-title">Jonathan&apos;s Command Center</h1>
                <p className="dashboard-subtitle">The Procrastinator&apos;s Paradise</p>
              </div>

              {/* Right side: status + links */}
              <div className="header-status">
                <div className="status-indicator"></div>
                <span className="status-text">Online</span>

                <Link
                  to="/presales-overview"
                  className="presales-nav-link"
                  style={{
                    marginLeft: '16px',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    background: '#2563eb',
                    color: 'white',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    textDecoration: 'none',
                    transition: '0.2s',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseOver={(e) => (e.target.style.opacity = '0.85')}
                  onMouseOut={(e) => (e.target.style.opacity = '1')}
                >
                  Presales Overview
                </Link>

                <Link
                  to="/reports"
                  className="presales-nav-link"
                  style={{
                    marginLeft: '8px',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    background: 'transparent',
                    color: '#e5e7eb',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    textDecoration: 'none',
                    border: '1px solid rgba(148, 163, 184, 0.5)',
                    transition: '0.2s',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseOver={(e) => {
                    e.target.style.background = 'rgba(15, 23, 42, 0.9)';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.background = 'transparent';
                  }}
                >
                  Reports
                </Link>
              </div>
            </div>
          </header>
          {/* ---------- END HEADER ---------- */}

          <Routes>
            {/* Main page — Projects only */}
            <Route
              path="/"
              element={
                <main className="dashboard-main">
                  <div className="dashboard-bottom">
                    <div className="widget-card projects-widget">
                      <Projects />
                    </div>
                  </div>
                </main>
              }
            />

            {/* Presales Overview */}
            <Route path="/presales-overview" element={<PresalesOverview />} />

            {/* Reports Dashboard */}
            <Route path="/reports" element={<ReportsDashboard />} />

            {/* Details */}
            <Route path="/project/:id" element={<ProjectDetails />} />
            <Route path="/customer/:customerId" element={<CustomerDetails />} />
          </Routes>

        </div>
      </div>
    </Router>
  );
}

export default App;
