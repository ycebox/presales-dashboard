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
  const [connectionStatus, setConnectionStatus] = useState('connecting');

  useEffect(() => {
    // Auto-authenticate on app load
    autoAuthenticate();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth event:', event);
        setUser(session?.user ?? null);
        setConnectionStatus(session?.user ? 'online' : 'offline');
        setLoading(false);
      }
    );

    return () => subscription?.unsubscribe();
  }, []);

  const autoAuthenticate = async () => {
    try {
      setConnectionStatus('connecting');
      
      // First check if there's an existing session
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (user) {
        console.log('Existing user found:', user.email);
        setUser(user);
        setConnectionStatus('online');
        setLoading(false);
        return;
      }

      console.log('No existing user, creating automatic session...');
      
      // Try to sign in with a default user
      const defaultEmail = 'admin@presales.com';
      const defaultPassword = 'presales123';
      
      let { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: defaultEmail,
        password: defaultPassword
      });
      
      if (signInError && signInError.message.includes('Invalid login credentials')) {
        console.log('Default user not found, creating one...');
        
        // Create the default user
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: defaultEmail,
          password: defaultPassword
        });
        
        if (signUpError) {
          console.error('Could not create default user:', signUpError);
          setConnectionStatus('error');
        } else {
          console.log('Default user created and signed in');
          setUser(signUpData.user);
          setConnectionStatus('online');
        }
      } else if (!signInError) {
        console.log('Signed in with default user');
        setUser(data.user);
        setConnectionStatus('online');
      } else {
        console.error('Authentication error:', signInError);
        setConnectionStatus('error');
      }
    } catch (error) {
      console.error('Auto-authentication failed:', error);
      setConnectionStatus('error');
    } finally {
      setLoading(false);
    }
  };

  // Enhanced loading component with better UX
  const LoadingScreen = () => (
    <div className="loading-container" role="status" aria-live="polite">
      <div className="loading-spinner" aria-hidden="true"></div>
      <p className="loading-text">Loading dashboard...</p>
    </div>
  );

  // Enhanced header component with better semantic structure
  const DashboardHeader = () => (
    <header className="dashboard-header" role="banner">
      <div className="header-content">
        <div className="header-info">
          <h1 className="dashboard-title">Jonathan's Command Center</h1>
          <p className="dashboard-subtitle">The Procrastinator's Paradise</p>
        </div>
        <div 
          className="header-status" 
          role="status" 
          aria-label={`Connection status: ${connectionStatus}`}
        >
          <div 
            className="status-indicator" 
            aria-hidden="true"
            data-status={connectionStatus}
          ></div>
          <span className="status-text">
            {connectionStatus === 'online' ? 'Online' : 
             connectionStatus === 'connecting' ? 'Connecting...' : 
             connectionStatus === 'error' ? 'Connection Error' : 'Offline'}
          </span>
        </div>
      </div>
    </header>
  );

  // Main dashboard layout component
  const DashboardLayout = () => (
    <main className="dashboard-main" role="main">
      {/* TOP ROW - Task Summary */}
      <section className="dashboard-top" aria-labelledby="summary-heading">
        <div className="widget-card summary-widget">
          <TaskSummaryDashboard />
        </div>
      </section>

      {/* BOTTOM ROW - Tasks & Projects */}
      <section className="dashboard-bottom">
        <div className="dashboard-left">
          <div className="widget-card tasks-widget" role="region" aria-labelledby="tasks-heading">
            <TodayTasks />
          </div>
        </div>
        
        <div className="dashboard-right">
          <div className="widget-card projects-widget" role="region" aria-labelledby="projects-heading">
            <Projects />
          </div>
        </div>
      </section>
    </main>
  );

  // Error boundary for better error handling
  const ErrorFallback = ({ error }) => (
    <div className="loading-container" role="alert">
      <div className="error-icon" aria-hidden="true">⚠️</div>
      <p className="loading-text">Something went wrong</p>
      <button 
        onClick={() => window.location.reload()} 
        className="retry-button"
        style={{
          marginTop: 'var(--space-4)',
          padding: 'var(--space-2) var(--space-4)',
          background: 'var(--color-primary)',
          color: 'white',
          border: 'none',
          borderRadius: 'var(--radius-base)',
          cursor: 'pointer',
          fontSize: 'var(--font-size-sm)',
          fontWeight: '500'
        }}
      >
        Retry
      </button>
    </div>
  );

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Router basename="/presales-dashboard">
      <div className="app-wrapper">
        <div className="main-container">
          <DashboardHeader />

          <Routes>
            {/* Main Dashboard Route */}
            <Route
              path="/"
              element={<DashboardLayout />}
            />
            
            {/* Individual Project Details */}
            <Route 
              path="/project/:id" 
              element={
                <div className="widget-card" style={{ padding: 0 }}>
                  <ProjectDetails />
                </div>
              } 
            />
            
            {/* Customer Details Route */}
            <Route 
              path="/customer/:customerId" 
              element={
                <div className="widget-card" style={{ padding: 0 }}>
                  <CustomerDetails />
                </div>
              } 
            />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
