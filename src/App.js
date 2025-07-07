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
    // Check current session
    checkUser();

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

  const checkUser = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        console.error('Error checking user:', error);
      }
      setUser(user);
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const signInWithEmail = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      
      return { success: true, data };
    } catch (error) {
      console.error('Sign in error:', error);
      return { success: false, error: error.message };
    }
  };

  const signUpWithEmail = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password
      });
      
      if (error) throw error;
      
      return { success: true, data };
    } catch (error) {
      console.error('Sign up error:', error);
      return { success: false, error: error.message };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const createTestUser = async () => {
    const result = await signUpWithEmail('test@example.com', 'test123456');
    if (result.success) {
      alert('Test user created successfully!');
    } else if (result.error.includes('already registered')) {
      // Try to sign in instead
      const signInResult = await signInWithEmail('test@example.com', 'test123456');
      if (signInResult.success) {
        alert('Signed in with test user!');
      } else {
        alert('Error: ' + signInResult.error);
      }
    } else {
      alert('Error creating test user: ' + result.error);
    }
  };

  // Simple Login Component
  const LoginForm = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [authLoading, setAuthLoading] = useState(false);

    const handleSubmit = async (e) => {
      e.preventDefault();
      setAuthLoading(true);

      const result = isSignUp 
        ? await signUpWithEmail(email, password)
        : await signInWithEmail(email, password);

      if (!result.success) {
        alert(result.error);
      }
      
      setAuthLoading(false);
    };

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        padding: '2rem'
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          width: '100%',
          maxWidth: '400px'
        }}>
          <h1 style={{ 
            textAlign: 'center', 
            marginBottom: '2rem',
            color: '#1e293b'
          }}>
            📋 Presales Dashboard
          </h1>
          
          <form onSubmit={handleSubmit} style={{ marginBottom: '1rem' }}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem',
                fontWeight: '500',
                color: '#374151'
              }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '1rem'
                }}
                placeholder="Enter your email"
              />
            </div>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem',
                fontWeight: '500',
                color: '#374151'
              }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '1rem'
                }}
                placeholder="Enter your password"
              />
            </div>
            
            <button
              type="submit"
              disabled={authLoading}
              style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '500',
                cursor: authLoading ? 'not-allowed' : 'pointer',
                opacity: authLoading ? 0.6 : 1
              }}
            >
              {authLoading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Sign In')}
            </button>
          </form>
          
          <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              style={{
                background: 'none',
                border: 'none',
                color: '#3b82f6',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </button>
          </div>

          <div style={{ 
            borderTop: '1px solid #e5e7eb',
            paddingTop: '1rem',
            textAlign: 'center'
          }}>
            <p style={{ 
              fontSize: '0.9rem', 
              color: '#6b7280',
              marginBottom: '0.5rem'
            }}>
              For testing purposes:
            </p>
            <button
              onClick={createTestUser}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.9rem',
                cursor: 'pointer'
              }}
            >
              Create/Use Test Account
            </button>
          </div>
        </div>
      </div>
    );
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
        Loading...
      </div>
    );
  }

  // If not authenticated, show login form
  if (!user) {
    return <LoginForm />;
  }

  // If authenticated, show the main app
  return (
    <Router basename="/presales-dashboard">
      <div className="page-wrapper">
        <div className="project-container">
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem'
          }}>
            <h1 className="big-name">
              📋 Jonathan's "It's Fine, Everything's Fine" Dashboard
            </h1>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <span style={{
                fontSize: '0.9rem',
                color: '#6b7280'
              }}>
                Welcome, {user.email}
              </span>
              <button
                onClick={signOut}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                Sign Out
              </button>
            </div>
          </div>

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
