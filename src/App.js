import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { supabase } from './supabaseClient';
import Projects from './Projects';
import TodayTasks from './TodayTasks';
import TaskSummaryDashboard from './TaskSummaryDashboard';
import ProjectDetails from './ProjectDetails';
import CustomerDetails from './CustomerDetails';
import MeetingMinutes from './MeetingMinutes';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Auto-authenticate on app load
    autoAuthenticate();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth event:', event);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription?.unsubscribe();
  }, []);

  const autoAuthenticate = async () => {
    try {
      // First check if there's an existing session
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (user) {
        console.log('Existing user found:', user.email);
        setUser(user);
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
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '1.2rem'
      }}>
        Initializing dashboard...
      </div>
    );
  }

  return (
    <Router basename="/presales-dashboard">
      <div className="page-wrapper">
        <div className="project-container">
          <h1 className="big-name" style={{ marginBottom: '1.5rem' }}>
            📋 Jonathan's "It's Fine, Everything's Fine" Dashboard
          </h1>

          <Routes>
            {/* Main Dashboard Route */}
            <Route
              path="/"
              element={
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr minmax(0, 2fr)',
                    gap: '5rem',
                    alignItems: 'flex-start',
                    width: '100%',
                  }}
                >
                  {/* LEFT COLUMN */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1.5rem',
                    }}
                  >
                    <div className="section-card">
                      <TaskSummaryDashboard />
                    </div>
                    <div className="section-card">
                      <TodayTasks />
                    </div>
                    <div className="section-card">
                      <MeetingMinutes />
                    </div>
                  </div>

                  {/* RIGHT COLUMN */}
                  <div
                    className="section-card"
                    style={{
                      overflowY: 'auto',
                      maxHeight: '80vh',
                      borderLeft: '1px solid #e2e8f0',
                      paddingLeft: '1rem',
                    }}
                  >
                    <Projects />
                  </div>
                </div>
              }
            />
            
            {/* Individual Project Details */}
            <Route path="/project/:id" element={<ProjectDetails />} />
            
            {/* Customer Details Route */}
            <Route path="/customer/:customerId" element={<CustomerDetails />} />
            
            {/* Meeting Minutes Routes */}
            <Route path="/meeting-minutes" element={<MeetingMinutes />} />
            <Route path="/meeting-minutes/*" element={<MeetingMinutes />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
