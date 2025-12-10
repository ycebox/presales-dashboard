// src/CustomerDetails.js

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import './CustomerDetails.css';

import {
  FaUserTie,
  FaBuilding,
  FaGlobeAsia,
  FaTasks,
  FaUsers,
  FaProjectDiagram,
  FaCalendarAlt,
  FaFlag,
  FaMoneyBillWave,
  FaChartLine,
  FaPlus,
  FaEdit,
  FaTrash,
  FaSave,
  FaTimes,
  FaExclamationTriangle,
  FaInfoCircle,
  FaEnvelope,
  FaPhoneAlt,
  FaRegStickyNote,
} from 'react-icons/fa';

// Simple helpers
const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString('en-SG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const formatCurrency = (value) => {
  if (!value && value !== 0) return '-';
  return Number(value).toLocaleString('en-US', {
    maximumFractionDigits: 0,
  });
};

// Static helpers
const asiaPacificCountries = [
  'Singapore',
  'Philippines',
  'Thailand',
  'Vietnam',
  'Malaysia',
  'Indonesia',
  'India',
  'Australia',
  'New Zealand',
  'Hong Kong',
  'Taiwan',
  'Japan',
  'South Korea',
  'China',
];

const customerTypes = ['Existing', 'New', 'Internal Initiative'];

// ----- Stakeholder Modal -----
const StakeholderModal = ({
  isOpen,
  onClose,
  onSave,
  editingStakeholder,
}) => {
  const [form, setForm] = useState({
    name: '',
    role: '',
    email: '',
    phone: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingStakeholder) {
      setForm({
        name: editingStakeholder.name || '',
        role: editingStakeholder.role || '',
        email: editingStakeholder.email || '',
        phone: editingStakeholder.phone || '',
        notes: editingStakeholder.notes || '',
      });
    } else {
      setForm({
        name: '',
        role: '',
        email: '',
        phone: '',
        notes: '',
      });
    }
  }, [editingStakeholder, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      alert('Name is required');
      return;
    }
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrapper">
            <FaUsers className="modal-icon" />
            <h3 className="modal-title">
              {editingStakeholder ? 'Edit Stakeholder' : 'Add Stakeholder'}
            </h3>
          </div>
          <button
            className="modal-close-button"
            onClick={onClose}
            aria-label="Close modal"
          >
            <FaTimes />
          </button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">
                <FaUserTie className="form-icon" />
                Name *
              </label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                className="form-input"
                placeholder="e.g., Head of Cards"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <FaBuilding className="form-icon" />
                Role / Position
              </label>
              <input
                type="text"
                name="role"
                value={form.role}
                onChange={handleChange}
                className="form-input"
                placeholder="e.g., CIO, Product Owner"
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <FaEnvelope className="form-icon" />
                Email
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className="form-input"
                placeholder="name@customer.com"
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <FaPhoneAlt className="form-icon" />
                Phone
              </label>
              <input
                type="text"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                className="form-input"
                placeholder="+65 ..."
              />
            </div>

            <div className="form-group full-width">
              <label className="form-label">
                <FaRegStickyNote className="form-icon" />
                Notes
              </label>
              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                className="form-textarea"
                placeholder="Relationship notes, influence, decision role..."
                rows={3}
              />
            </div>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="button-cancel"
              onClick={onClose}
              disabled={saving}
            >
              <FaTimes />
              Cancel
            </button>
            <button type="submit" className="button-submit" disabled={saving}>
              <FaSave />
              {saving
                ? editingStakeholder
                  ? 'Updating...'
                  : 'Saving...'
                : editingStakeholder
                ? 'Update Stakeholder'
                : 'Add Stakeholder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ----- Task Modal -----
const TaskModal = ({ isOpen, onClose, onSave, projects }) => {
  const [form, setForm] = useState({
    project_id: '',
    description: '',
    status: 'Not Started',
    priority: 'Normal',
    due_date: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setForm({
        project_id: '',
        description: '',
        status: 'Not Started',
        priority: 'Normal',
        due_date: '',
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.project_id || !form.description.trim()) {
      alert('Project and description are required');
      return;
    }
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrapper">
            <FaTasks className="modal-icon" />
            <h3 className="modal-title">Add Project Task</h3>
          </div>
          <button
            className="modal-close-button"
            onClick={onClose}
            aria-label="Close modal"
          >
            <FaTimes />
          </button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">
                <FaProjectDiagram className="form-icon" />
                Project *
              </label>
              <select
                name="project_id"
                value={form.project_id}
                onChange={handleChange}
                className="form-input"
                required
              >
                <option value="">Select project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.project_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group full-width">
              <label className="form-label">
                <FaTasks className="form-icon" />
                Task Description *
              </label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                className="form-textarea"
                rows={3}
                placeholder="Discovery workshop, sizing, proposal, demo preparation..."
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <FaFlag className="form-icon" />
                Status
              </label>
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className="form-input"
              >
                <option value="Not Started">Not Started</option>
                <option value="In Progress">In Progress</option>
                <option value="Blocked">Blocked</option>
                <option value="Completed">Completed</option>
                <option value="On Hold">On Hold</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                <FaChartLine className="form-icon" />
                Priority
              </label>
              <select
                name="priority"
                value={form.priority}
                onChange={handleChange}
                className="form-input"
              >
                <option value="High">High</option>
                <option value="Normal">Normal</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                <FaCalendarAlt className="form-icon" />
                Due Date
              </label>
              <input
                type="date"
                name="due_date"
                value={form.due_date}
                onChange={handleChange}
                className="form-input"
              />
            </div>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="button-cancel"
              onClick={onClose}
              disabled={saving}
            >
              <FaTimes />
              Cancel
            </button>
            <button type="submit" className="button-submit" disabled={saving}>
              <FaSave />
              {saving ? 'Saving...' : 'Add Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ----- Main Component -----
const CustomerDetails = () => {
  const { customerId } = useParams();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState(null);
  const [projects, setProjects] = useState([]);
  const [stakeholders, setStakeholders] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [statusOptions, setStatusOptions] = useState([]);
  const [accountManagers, setAccountManagers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadingStatuses, setLoadingStatuses] = useState(false);
  const [error, setError] = useState(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editCustomer, setEditCustomer] = useState({});

  const [showStakeholderModal, setShowStakeholderModal] = useState(false);
  const [editingStakeholder, setEditingStakeholder] = useState(null);

  const [showTaskModal, setShowTaskModal] = useState(false);

  // Fetch data
  const fetchCustomer = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();

      if (error) throw error;
      setCustomer(data);
      setEditCustomer(data);
    } catch (err) {
      console.error('Error fetching customer:', err);
      setError('Failed to load customer: ' + err.message);
    }
  };

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('customer_name', customer?.customer_name || '')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (err) {
      console.error('Error fetching projects:', err);
    }
  };

  const fetchStakeholders = async () => {
    try {
      const { data, error } = await supabase
        .from('customer_stakeholders')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setStakeholders(data || []);
    } catch (err) {
      console.error('Error fetching stakeholders:', err);
    }
  };

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('project_tasks')
        .select('*')
        .in(
          'project_id',
          projects.length > 0 ? projects.map((p) => p.id) : [-1]
        )
        .order('due_date', { ascending: true });

      if (error) throw error;
      setTasks(data || []);
    } catch (err) {
      console.error('Error fetching tasks:', err);
    }
  };

  const fetchStatusOptions = async () => {
    try {
      setLoadingStatuses(true);
      const { data, error } = await supabase
        .from('customer_status')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setStatusOptions(data || []);
    } catch (err) {
      console.error('Error fetching customer statuses:', err);
    } finally {
      setLoadingStatuses(false);
    }
  };

  const fetchAccountManagers = async () => {
    try {
      const { data, error } = await supabase
        .from('account_managers')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setAccountManagers(data || []);
    } catch (err) {
      console.error('Error fetching account managers:', err);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        await Promise.all([fetchStatusOptions(), fetchAccountManagers()]);
        await fetchCustomer();
      } finally {
        setLoading(false);
      }
    };
    if (customerId) {
      load();
    }
  }, [customerId]);

  useEffect(() => {
    if (customer && customer.customer_name) {
      fetchProjects();
      fetchStakeholders();
    }
  }, [customer?.customer_name]);

  useEffect(() => {
    if (projects.length > 0) {
      fetchTasks();
    } else {
      setTasks([]);
    }
  }, [projects]);

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditCustomer((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSaveCustomer = async () => {
    if (!editCustomer.customer_name?.trim()) {
      alert('Customer name is required');
      return;
    }

    try {
      const { error } = await supabase
        .from('customers')
        .update({
          customer_name: editCustomer.customer_name,
          account_manager: editCustomer.account_manager || null,
          country: editCustomer.country || null,
          customer_type: editCustomer.customer_type || null,
          status_id: editCustomer.status_id || null,
        })
        .eq('id', customerId);

      if (error) throw error;
      setCustomer((prev) => ({
        ...prev,
        customer_name: editCustomer.customer_name,
        account_manager: editCustomer.account_manager || null,
        country: editCustomer.country || null,
        customer_type: editCustomer.customer_type || null,
        status_id: editCustomer.status_id || null,
      }));
      setIsEditing(false);
      alert('Customer updated successfully');
    } catch (err) {
      console.error('Error updating customer:', err);
      alert('Failed to update customer: ' + err.message);
    }
  };

  const handleAddOrUpdateStakeholder = async (formValues) => {
    try {
      if (editingStakeholder) {
        const { error } = await supabase
          .from('customer_stakeholders')
          .update(formValues)
          .eq('id', editingStakeholder.id);

        if (error) throw error;
        alert('Stakeholder updated');
      } else {
        const { error } = await supabase
          .from('customer_stakeholders')
          .insert([{ ...formValues, customer_id: customerId }]);

        if (error) throw error;
        alert('Stakeholder added');
      }

      setShowStakeholderModal(false);
      setEditingStakeholder(null);
      fetchStakeholders();
    } catch (err) {
      console.error('Error saving stakeholder:', err);
      alert('Error saving stakeholder: ' + err.message);
    }
  };

  const handleDeleteStakeholder = async (id) => {
    if (
      !window.confirm(
        'Are you sure you want to delete this stakeholder? This cannot be undone.'
      )
    ) {
      return;
    }
    try {
      const { error } = await supabase
        .from('customer_stakeholders')
        .delete()
        .eq('id', id);

      if (error) throw error;
      alert('Stakeholder deleted');
      fetchStakeholders();
    } catch (err) {
      console.error('Error deleting stakeholder:', err);
      alert('Error deleting stakeholder: ' + err.message);
    }
  };

  const handleCreateTask = async (formValues) => {
    try {
      const { error } = await supabase.from('project_tasks').insert([
        {
          project_id: formValues.project_id,
          description: formValues.description,
          status: formValues.status,
          priority: formValues.priority,
          due_date: formValues.due_date || null,
        },
      ]);

      if (error) throw error;
      alert('Task added successfully');
      setShowTaskModal(false);
      fetchTasks();
    } catch (err) {
      console.error('Error adding task:', err);
      alert('Error adding task: ' + err.message);
    }
  };

  const summary = useMemo(() => {
    const totalProjects = projects.length;
    const activeProjects = projects.filter(
      (p) => p.sales_stage !== 'Done' && p.sales_stage !== 'Lost'
    ).length;
    const closedWon = projects.filter((p) => p.sales_stage === 'Done').length;

    const openTasks = tasks.filter(
      (t) => t.status !== 'Completed' && t.status !== 'Cancelled'
    );
    const highPriorityOpen = openTasks.filter(
      (t) => t.priority === 'High'
    ).length;

    const totalPipeline = projects.reduce((sum, p) => {
      if (!p.deal_value) return sum;
      return sum + Number(p.deal_value);
    }, 0);

    return {
      totalProjects,
      activeProjects,
      closedWon,
      openTasksCount: openTasks.length,
      highPriorityOpen,
      totalPipeline,
    };
  }, [projects, tasks]);

  if (loading) {
    return (
      <div className="customer-details-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading customer details...</p>
        </div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="customer-details-container">
        <div className="error-state">
          <div className="error-icon-wrapper">
            <FaExclamationTriangle className="error-icon" />
          </div>
          <h2 className="error-title">Something went wrong</h2>
          <p className="error-message">{error || 'Customer not found'}</p>
          <button
            className="action-button primary"
            onClick={() => navigate('/')}
          >
            <FaChartLine />
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const currentStatus =
    customer.status_id &&
    statusOptions.find((s) => s.id === customer.status_id);

  return (
    <div className="customer-details-container">
      {/* Header */}
      <header className="customer-header">
        <div className="customer-header-main">
          <div className="customer-avatar">
            <span>{customer.customer_name?.charAt(0) || 'C'}</span>
          </div>
          <div className="customer-header-text">
            <h1 className="customer-title">
              {customer.customer_name || 'Customer'}
            </h1>
            <div className="customer-subtitle-row">
              <span className="customer-subtitle">
                <FaBuilding />
                {customer.customer_type || 'Customer'}
              </span>
              {customer.country && (
                <span className="customer-subtitle">
                  <FaGlobeAsia />
                  {customer.country}
                </span>
              )}
              {customer.account_manager && (
                <span className="customer-subtitle">
                  <FaUserTie />
                  AM: {customer.account_manager}
                </span>
              )}
            </div>
          </div>
        </div>

       
      </header>

      <main className="customer-main-layout">
        <div className="customer-main-left">
          {/* Customer Information */}
          <section className="section-card customer-info-section">
            <div className="section-header">
              <div className="section-title">
                <FaBuilding />
                <h2>Customer Information</h2>
              </div>
              <div className="section-actions">
                <button
                  className={`btn-secondary ${isEditing ? 'active' : ''}`}
                  onClick={() => {
                    if (isEditing) {
                      setEditCustomer(customer);
                    }
                    setIsEditing(!isEditing);
                  }}
                >
                  <FaEdit />
                  {isEditing ? 'Cancel' : 'Edit'}
                </button>
                {isEditing && (
                  <button
                    className="btn-primary"
                    onClick={handleSaveCustomer}
                    disabled={loadingStatuses}
                  >
                    <FaSave />
                    Save Changes
                  </button>
                )}
              </div>
            </div>

            <div className="customer-info-grid">
              {/* Customer Name */}
              <div className="info-item">
                <label>Customer Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    name="customer_name"
                    value={editCustomer.customer_name || ''}
                    onChange={handleEditChange}
                    className="info-input"
                  />
                ) : (
                  <div className="info-value main-name">
                    {customer.customer_name}
                  </div>
                )}
              </div>

              {/* Account Manager */}
              <div className="info-item">
                <label>Account Manager</label>
                {isEditing ? (
                  <select
                    name="account_manager"
                    value={editCustomer.account_manager || ''}
                    onChange={handleEditChange}
                    className="info-input"
                  >
                    <option value="">Select account manager</option>
                    {accountManagers.map((am) => (
                      <option key={am.id} value={am.name}>
                        {am.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="info-value">
                    {customer.account_manager || 'Not assigned'}
                  </div>
                )}
              </div>

              {/* Country */}
              <div className="info-item">
                <label>Country</label>
                {isEditing ? (
                  <select
                    name="country"
                    value={editCustomer.country || ''}
                    onChange={handleEditChange}
                    className="info-input"
                  >
                    <option value="">Select country</option>
                    {asiaPacificCountries.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="info-value">
                    {customer.country || 'Not set'}
                  </div>
                )}
              </div>

              {/* Customer Type */}
              <div className="info-item">
                <label>Customer Type</label>
                {isEditing ? (
                  <select
                    name="customer_type"
                    value={editCustomer.customer_type || ''}
                    onChange={handleEditChange}
                    className="info-input"
                  >
                    <option value="">Select type</option>
                    {customerTypes.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="info-value">
                    {customer.customer_type || 'Not set'}
                  </div>
                )}
              </div>

              {/* Customer Status */}
              <div className="info-item">
                <label>Customer Status</label>
                {isEditing ? (
                  <select
                    name="status_id"
                    value={
                      editCustomer.status_id
                        ? String(editCustomer.status_id)
                        : ''
                    }
                    onChange={(e) =>
                      setEditCustomer((prev) => ({
                        ...prev,
                        status_id: e.target.value
                          ? Number(e.target.value)
                          : null,
                      }))
                    }
                    className="info-input"
                    disabled={loadingStatuses}
                  >
                    <option value="">Select status</option>
                    {statusOptions.map((status) => (
                      <option key={status.id} value={status.id}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="info-value status-pill">
                    {currentStatus ? (
                      <span
                        className={`status-${String(
                          currentStatus.code || ''
                        )
                          .toLowerCase()
                          .replace(/\s/g, '-')}`}
                      >
                        {currentStatus.label}
                      </span>
                    ) : (
                      <span className="status-none">Not set</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Stakeholders */}
          <section className="section-card stakeholders-section">
            <div className="section-header">
              <div className="section-title">
                <FaUsers />
                <h2>Key Stakeholders</h2>
              </div>
              <button
                className="btn-secondary"
                onClick={() => {
                  setEditingStakeholder(null);
                  setShowStakeholderModal(true);
                }}
              >
                <FaPlus />
                Add Stakeholder
              </button>
            </div>

            {stakeholders.length === 0 ? (
              <div className="empty-state small">
                <p>
                  No stakeholders recorded yet. Add the key people you interact
                  with at this customer.
                </p>
              </div>
            ) : (
              <div className="stakeholder-list">
                {stakeholders.map((s) => (
                  <div key={s.id} className="stakeholder-item">
                    <div className="stakeholder-main">
                      <div className="stakeholder-avatar">
                        <span>{s.name?.charAt(0) || '?'}</span>
                      </div>
                      <div>
                        <div className="stakeholder-name-row">
                          <h3>{s.name}</h3>
                          {s.role && (
                            <span className="stakeholder-role">
                              {s.role}
                            </span>
                          )}
                        </div>
                        <div className="stakeholder-contact">
                          {s.email && (
                            <span>
                              <FaEnvelope /> {s.email}
                            </span>
                          )}
                          {s.phone && (
                            <span>
                              <FaPhoneAlt /> {s.phone}
                            </span>
                          )}
                        </div>
                        {s.notes && (
                          <p className="stakeholder-notes">{s.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="stakeholder-actions">
                      <button
                        className="icon-btn"
                        onClick={() => {
                          setEditingStakeholder(s);
                          setShowStakeholderModal(true);
                        }}
                      >
                        <FaEdit />
                      </button>
                      <button
                        className="icon-btn icon-btn-danger"
                        onClick={() => handleDeleteStakeholder(s.id)}
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Projects & Opportunities */}
          <section className="section-card projects-section">
            <div className="section-header">
              <div className="section-title">
                <FaProjectDiagram />
                <h2>Projects & Opportunities</h2>
              </div>
              <button
                className="btn-primary"
                onClick={() => navigate('/')}
              >
                <FaPlus />
                Add Project (from main)
              </button>
            </div>

            {projects.length === 0 ? (
              <div className="empty-state small">
                <p>
                  No projects linked yet. Add a project from the main dashboard
                  and link it to this customer name.
                </p>
              </div>
            ) : (
              <div className="project-list">
                {projects.map((p) => (
                  <div
                    key={p.id}
                    className="project-item"
                    onClick={() => navigate(`/project/${p.id}`)}
                  >
                    <div className="project-main">
                      <h3>{p.project_name || 'Untitled project'}</h3>
                      <p className="project-scope">
                        {p.scope || 'No scope defined yet.'}
                      </p>
                    </div>

                    <div className="project-details">
                      <div className="project-meta">
                        <div className="project-meta-item">
                          <FaFlag />
                          <span>{p.sales_stage || 'N/A'}</span>
                        </div>
                        <div className="project-meta-item">
                          <FaCalendarAlt />
                          <span>Created: {formatDate(p.created_at)}</span>
                        </div>
                      </div>
                      <div className="project-value">
                        <FaMoneyBillWave />
                        <span>{formatCurrency(p.deal_value)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right column - Snapshot & Tasks */}
        <aside className="customer-main-right">
          <section className="section-card snapshot-section">
            <div className="section-header">
              <div className="section-title">
                <FaChartLine />
                <h2>Customer Snapshot</h2>
              </div>
            </div>
            <div className="snapshot-grid">
              <div className="snapshot-item">
                <span className="snapshot-label">Total projects</span>
                <span className="snapshot-value">
                  {summary.totalProjects}
                </span>
              </div>
              <div className="snapshot-item">
                <span className="snapshot-label">Active opportunities</span>
                <span className="snapshot-value">
                  {summary.activeProjects}
                </span>
              </div>
              <div className="snapshot-item">
                <span className="snapshot-label">Closed / won</span>
                <span className="snapshot-value">
                  {summary.closedWon}
                </span>
              </div>
              <div className="snapshot-item">
                <span className="snapshot-label">Open tasks</span>
                <span className="snapshot-value">
                  {summary.openTasksCount}
                </span>
              </div>
              <div className="snapshot-item">
                <span className="snapshot-label">High priority tasks</span>
                <span className="snapshot-value">
                  {summary.highPriorityOpen}
                </span>
              </div>
              <div className="snapshot-item">
                <span className="snapshot-label">Total pipeline</span>
                <span className="snapshot-value">
                  {formatCurrency(summary.totalPipeline)}
                </span>
              </div>
            </div>
          </section>

          <section className="section-card tasks-section">
            <div className="section-header">
              <div className="section-title">
                <FaTasks />
                <h2>Tasks by Project</h2>
              </div>
            </div>

            {tasks.length === 0 ? (
              <div className="empty-state small">
                <p>No tasks yet for this customer.</p>
              </div>
            ) : (
              <div className="customer-tasks-list">
                {projects.map((p) => {
                  const projectTasks = tasks.filter(
                    (t) => t.project_id === p.id
                  );
                  if (projectTasks.length === 0) return null;

                  return (
                    <div key={p.id} className="customer-project-task-group">
                      <div className="customer-project-task-header">
                        <h3 onClick={() => navigate(`/project/${p.id}`)}>
                          {p.project_name}
                        </h3>
                        <span className="task-count-badge">
                          {projectTasks.length} task
                          {projectTasks.length > 1 ? 's' : ''}
                        </span>
                      </div>
                      <ul className="project-task-list">
                        {projectTasks.map((t) => (
                          <li
                            key={t.id}
                            className={`task-item status-${(t.status || '')
                              .toLowerCase()
                              .replace(/\s/g, '-')}`}
                          >
                            <div className="task-main">
                              <span className="task-desc">
                                {t.description}
                              </span>
                              {t.due_date && (
                                <span className="task-due">
                                  <FaCalendarAlt />
                                  {formatDate(t.due_date)}
                                </span>
                              )}
                            </div>
                            <div className="task-meta">
                              <span
                                className={`task-status-badge status-${(t.status || '')
                                  .toLowerCase()
                                  .replace(/\s/g, '-')}`}
                              >
                                {t.status || 'Not Started'}
                              </span>
                              <span
                                className={`task-priority-badge priority-${(t.priority || '')
                                  .toLowerCase()}`}
                              >
                                {t.priority || 'Normal'}
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="section-card info-section">
            <div className="section-header">
              <div className="section-title">
                <FaInfoCircle />
                <h2>Notes</h2>
              </div>
            </div>
            <p className="info-text">
              Use the project pages to maintain detailed logs, meeting minutes
              and technical notes. This view is meant to give you a quick
              customer-level snapshot before calls or reviews.
            </p>
          </section>
        </aside>
      </main>

      {/* Modals */}
      <StakeholderModal
        isOpen={showStakeholderModal}
        onClose={() => {
          setShowStakeholderModal(false);
          setEditingStakeholder(null);
        }}
        onSave={handleAddOrUpdateStakeholder}
        editingStakeholder={editingStakeholder}
      />

      <TaskModal
        isOpen={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        onSave={handleCreateTask}
        projects={projects}
      />
    </div>
  );
};

export default CustomerDetails;
