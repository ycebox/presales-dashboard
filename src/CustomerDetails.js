// CustomerDetails.js - Enhanced with Account Manager dropdown + Status
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import './CustomerDetails.css';
import {
  FaHome, FaUsers, FaEdit, FaPlus, FaBriefcase, FaTrash, FaSave, FaTimes,
  FaBuilding, FaGlobe, FaIndustry, FaCalendarAlt, FaChartLine, FaCheckCircle,
  FaClock, FaExclamationTriangle, FaEnvelope, FaPhone, FaDollarSign, FaTasks
} from 'react-icons/fa';

// ... StakeholderModal, ProjectModal, TaskModal (unchanged from previous version) ...

// (To save space here: keep your existing StakeholderModal, ProjectModal, TaskModal code exactly as in the last working file)

function CustomerDetails() {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showStakeholderModal, setShowStakeholderModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingStakeholder, setEditingStakeholder] = useState(null);
  const [editingStakeholderIndex, setEditingStakeholderIndex] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [editingProject, setEditingProject] = useState(null);
  
  // Inline editing states
  const [isEditing, setIsEditing] = useState(false);
  const [editCustomer, setEditCustomer] = useState({});
  const [saving, setSaving] = useState(false);
  
  // Project filtering state
  const [activeTab, setActiveTab] = useState('active');
  
  // Task filtering state
  const [taskFilter, setTaskFilter] = useState('active');

  // Customer status lookup
  const [statusOptions, setStatusOptions] = useState([]);
  const [loadingStatuses, setLoadingStatuses] = useState(false);

  // Account managers lookup
  const [accountManagers, setAccountManagers] = useState([]);
  const [loadingAccountManagers, setLoadingAccountManagers] = useState(false);

  useEffect(() => {
    if (customerId) {
      fetchCustomerDetails();
    }
  }, [customerId]);

  useEffect(() => {
    if (customer?.customer_name) {
      fetchCustomerProjects();
      fetchCustomerTasks();
    }
  }, [customer]);

  // Load statuses
  useEffect(() => {
    const fetchStatuses = async () => {
      try {
        setLoadingStatuses(true);
        const { data, error } = await supabase
          .from('customer_statuses')
          .select('id, code, label')
          .order('id', { ascending: true });

        if (error) {
          console.error('Error loading customer statuses:', error);
          setStatusOptions([]);
        } else {
          setStatusOptions(data || []);
        }
      } catch (err) {
        console.error('Unexpected error loading customer statuses:', err);
        setStatusOptions([]);
      } finally {
        setLoadingStatuses(false);
      }
    };

    fetchStatuses();
  }, []);

  // Load account managers
  useEffect(() => {
    const fetchAccountManagers = async () => {
      try {
        setLoadingAccountManagers(true);
        const { data, error } = await supabase
          .from('account_managers')
          .select('id, name, email, region')
          .order('name', { ascending: true });

        if (error) {
          console.error('Error loading account managers:', error);
          setAccountManagers([]);
        } else {
          setAccountManagers(data || []);
        }
      } catch (err) {
        console.error('Unexpected error loading account managers:', err);
        setAccountManagers([]);
      } finally {
        setLoadingAccountManagers(false);
      }
    };

    fetchAccountManagers();
  }, []);

  const fetchCustomerDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();

      if (error) throw error;
      
      if (!data) {
        setError('Customer not found');
        return;
      }
      
      setCustomer(data);
      setEditCustomer(data);
    } catch (error) {
      console.error('Error fetching customer:', error);
      setError('Failed to load customer details: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // ... keep fetchCustomerProjects, fetchCustomerTasks, task handlers, stakeholder handlers, project handlers, helpers ...

  // Helper: map status to label and color class
  const getStatusFromId = (statusId) => {
    if (!statusId || !statusOptions || statusOptions.length === 0) return null;
    return statusOptions.find((s) => s.id === statusId) || null;
  };

  const getStatusBadgeClass = (statusCodeOrLabel) => {
    const value = (statusCodeOrLabel || '').toString().toLowerCase();
    if (!value) return 'status-badge status-unknown';

    if (value.includes('active')) return 'status-badge status-active';
    if (value.includes('prospect')) return 'status-badge status-prospect';
    if (value.includes('hold')) return 'status-badge status-onhold';
    if (value.includes('dormant')) return 'status-badge status-dormant';
    if (value.includes('inactive')) return 'status-badge status-inactive';

    return 'status-badge status-unknown';
  };

  // ... formatDate, formatCurrency, project/task filtering helpers, etc. all same as previous version ...

  const asiaPacificCountries = [
    "Australia", "Bangladesh", "Brunei", "Cambodia", "China", "Fiji", "India", "Indonesia", "Japan", "Laos", "Malaysia",
    "Myanmar", "Nepal", "New Zealand", "Pakistan", "Papua New Guinea", "Philippines", "Singapore", "Solomon Islands",
    "South Korea", "Sri Lanka", "Thailand", "Timor-Leste", "Tonga", "Vanuatu", "Vietnam"
  ].sort();

  const industryVerticals = [
    'Banking', 'Financial Services', 'Insurance', 'Government', 'Healthcare', 'Education', 
    'Retail', 'Manufacturing', 'Telecommunications', 'Energy & Utilities', 'Transportation', 'Other'
  ].sort();

  const companySizes = [
    'Startup (1-10)', 'Small (11-50)', 'Medium (51-200)', 'Large (201-1000)', 'Enterprise (1000+)'
  ];

  if (loading) {
    return (
      <div className="page-wrapper">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading customer details...</p>
        </div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="page-wrapper">
        <div className="error-state">
          <FaExclamationTriangle className="error-icon" />
          <h2>Oops! Something went wrong</h2>
          <p>{error || 'Customer not found'}</p>
          <button onClick={() => navigate('/')} className="btn-primary">
            <FaHome /> Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentStatusObj = getStatusFromId(customer.status_id);
  const currentStatusLabel = currentStatusObj?.label || 'Status Not Set';
  const currentStatusClass = getStatusBadgeClass(currentStatusObj?.code || currentStatusObj?.label);

  const filteredProjects = /* your existing getFilteredProjects() result */;
  const filteredTasks = /* your existing getFilteredTasks() result */;

  return (
    <div className="page-wrapper">
      <div className="page-content">
        {/* Navigation */}
        <button onClick={() => navigate('/')} className="nav-btn primary">
          <FaHome />
          Dashboard
        </button>

        {/* Customer Header */}
        <div className="customer-header">
          <div className="customer-title-section">
            <h1 className="customer-title">
              {customer.customer_name}
            </h1>
            <div className="customer-subtitle">
              <span className="location-badge">
                <FaGlobe />
                {customer.country || 'Location Not Set'}
              </span>

              {/* Status badge in header */}
              <span className={currentStatusClass}>
                <span className="status-dot-pill" />
                {loadingStatuses ? 'Loading status…' : currentStatusLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="main-content">
          {/* Left Column */}
          <div className="left-column">
            {/* Customer Information */}
            <div className="section-card">
              <div className="section-header">
                <div className="section-title">
                  <FaBuilding className="section-icon" />
                  <h3>Customer Information</h3>
                </div>
                <div className="section-actions">
                  {isEditing ? (
                    <>
                      <button 
                        onClick={handleSaveCustomer} 
                        className="btn-success"
                        disabled={saving}
                      >
                        <FaSave />
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                      <button 
                        onClick={handleEditToggle} 
                        className="btn-secondary"
                        disabled={saving}
                      >
                        <FaTimes />
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button onClick={handleEditToggle} className="btn-primary">
                      <FaEdit />
                      Edit
                    </button>
                  )}
                </div>
              </div>

              {isEditing && (
                <div className="edit-banner">
                  <FaEdit />
                  <span>Editing mode - Make your changes and click Save</span>
                </div>
              )}

              <div className="section-content">
                <div className="customer-info-grid">
                  <div className="info-item">
                    <label className="info-label">
                      <FaBuilding />
                      Customer Name
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="customer_name"
                        value={editCustomer.customer_name || ''}
                        onChange={handleEditChange}
                        className="info-input"
                        required
                      />
                    ) : (
                      <div className="info-value">{customer.customer_name}</div>
                    )}
                  </div>

                  {/* Account Manager dropdown */}
                  <div className="info-item">
                    <label className="info-label">
                      <FaUsers />
                      Account Manager
                    </label>
                    {isEditing ? (
                      accountManagers.length > 0 ? (
                        <select
                          name="account_manager"
                          value={editCustomer.account_manager || ''}
                          onChange={handleEditChange}
                          className="info-select"
                          disabled={loadingAccountManagers}
                        >
                          <option value="">
                            {loadingAccountManagers ? 'Loading…' : 'Select Account Manager'}
                          </option>
                          {accountManagers.map((m) => (
                            <option key={m.id} value={m.name}>
                              {m.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          name="account_manager"
                          value={editCustomer.account_manager || ''}
                          onChange={handleEditChange}
                          className="info-input"
                          placeholder="Account manager name"
                        />
                      )
                    ) : (
                      <div className="info-value">{customer.account_manager || 'Not assigned'}</div>
                    )}
                  </div>

                  {/* Country */}
                  <div className="info-item">
                    <label className="info-label">
                      <FaGlobe />
                      Country
                    </label>
                    {isEditing ? (
                      <select
                        name="country"
                        value={editCustomer.country || ''}
                        onChange={handleEditChange}
                        className="info-select"
                      >
                        <option value="">Select Country</option>
                        {asiaPacificCountries.map((c, i) => (
                          <option key={i} value={c}>{c}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="info-value">{customer.country || 'Not specified'}</div>
                    )}
                  </div>

                  {/* Customer Status */}
                  <div className="info-item">
                    <label className="info-label">
                      <FaChartLine />
                      Customer Status
                    </label>
                    {isEditing ? (
                      <select
                        name="status_id"
                        value={editCustomer.status_id || ''}
                        onChange={(e) =>
                          setEditCustomer(prev => ({
                            ...prev,
                            status_id: e.target.value ? Number(e.target.value) : null,
                          }))
                        }
                        className="info-select"
                        disabled={loadingStatuses}
                      >
                        <option value="">
                          {loadingStatuses ? 'Loading statuses…' : 'Select Status'}
                        </option>
                        {statusOptions.map((status) => (
                          <option key={status.id} value={status.id}>
                            {status.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="info-value">
                        <span className={currentStatusClass}>
                          <span className="status-dot-pill" />
                          {currentStatusLabel}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Company Size */}
                  <div className="info-item">
                    <label className="info-label">
                      <FaUsers />
                      Company Size
                    </label>
                    {isEditing ? (
                      <select
                        name="company_size"
                        value={editCustomer.company_size || ''}
                        onChange={handleEditChange}
                        className="info-select"
                      >
                        <option value="">Select Size</option>
                        {companySizes.map((size, i) => (
                          <option key={i} value={size}>{size}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="info-value">{customer.company_size || 'Not specified'}</div>
                    )}
                  </div>

                  {/* Customer Since */}
                  <div className="info-item">
                    <label className="info-label">
                      <FaCalendarAlt />
                      Customer Since
                    </label>
                    {isEditing ? (
                      <input
                        type="number"
                        name="year_first_closed"
                        value={editCustomer.year_first_closed || ''}
                        onChange={handleEditChange}
                        className="info-input"
                        min="2000"
                        max={new Date().getFullYear()}
                        placeholder="e.g., 2022"
                      />
                    ) : (
                      <div className="info-value">{customer.year_first_closed || 'Not specified'}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* rest of left column: Key Stakeholders, Projects section (same as before) */}
          </div>

          {/* Right Column: Task overview / tasks list (same as before) */}
        </div>
      </div>

      {/* Modals (Stakeholder, Project, Task) same as before */}
    </div>
  );
}

export default CustomerDetails;
