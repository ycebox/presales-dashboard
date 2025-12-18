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
  FaSave,
  FaTimes,
  FaExclamationTriangle,
  FaInfoCircle,
  FaEnvelope,
  FaRegStickyNote,
} from 'react-icons/fa';

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

// Parse a single "Name | Role | Contact" string
const parseStakeholderEntry = (entry) => {
  if (!entry) return { name: '', role: '', contact: '' };
  const parts = String(entry).split('|');
  return {
    name: (parts[0] || '').trim(),
    role: (parts[1] || '').trim(),
    contact: (parts[2] || '').trim(),
  };
};

// Convert structured stakeholder to "Name | Role | Contact"
const encodeStakeholderEntry = ({ name, role, contact }) => {
  return `${String(name || '').trim()} | ${String(role || '').trim()} | ${String(
    contact || ''
  ).trim()}`.trim();
};

const StakeholdersModal = ({ isOpen, onClose, onSave, existingStakeholders }) => {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    if (!isOpen) return;

    const parsed = Array.isArray(existingStakeholders)
      ? existingStakeholders.map(parseStakeholderEntry)
      : [];

    setRows(parsed.length ? parsed : [{ name: '', role: '', contact: '' }]);
  }, [isOpen, existingStakeholders]);

  if (!isOpen) return null;

  const updateRow = (index, field, value) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  };

  const addRow = () => setRows((prev) => [...prev, { name: '', role: '', contact: '' }]);
  const removeRow = (index) => setRows((prev) => prev.filter((_, i) => i !== index));

  const handleSave = () => {
    const cleaned = rows
      .map((r) => ({
        name: String(r.name || '').trim(),
        role: String(r.role || '').trim(),
        contact: String(r.contact || '').trim(),
      }))
      .filter((r) => r.name || r.role || r.contact)
      .map(encodeStakeholderEntry);

    onSave(cleaned);
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal-container" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrapper">
            <FaUsers className="modal-icon" />
            <h2 className="modal-title">Key Stakeholders</h2>
          </div>
          <button className="modal-close-button" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <form className="modal-form" onSubmit={(e) => e.preventDefault()}>
          <div className="stakeholder-rows">
            <div className="stakeholder-rows-header">
              <span>Name</span>
              <span>Role</span>
              <span>Contact</span>
              <span />
            </div>

            {rows.map((r, index) => (
              <div className="stakeholder-row" key={index}>
                <input
                  className="form-input"
                  value={r.name}
                  onChange={(e) => updateRow(index, 'name', e.target.value)}
                  placeholder="e.g. Juan Dela Cruz"
                />
                <input
                  className="form-input"
                  value={r.role}
                  onChange={(e) => updateRow(index, 'role', e.target.value)}
                  placeholder="e.g. Head of Cards"
                />
                <input
                  className="form-input"
                  value={r.contact}
                  onChange={(e) => updateRow(index, 'contact', e.target.value)}
                  placeholder="email / phone"
                />
                <button
                  type="button"
                  className="btn-icon"
                  onClick={() => removeRow(index)}
                  title="Remove"
                >
                  <FaTimes />
                </button>
              </div>
            ))}

            <button type="button" className="btn-secondary inline" onClick={addRow}>
              <FaPlus />
              Add another
            </button>
          </div>

          <div className="modal-actions">
            <button type="button" className="button-cancel" onClick={onClose}>
              <FaTimes />
              Cancel
            </button>
            <button type="button" className="button-submit" onClick={handleSave}>
              <FaSave />
              Save Stakeholders
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

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
    if (!isOpen) return;
    setSaving(false);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.project_id || !String(form.description || '').trim()) {
      alert('Please select a project and enter a task description.');
      return;
    }

    try {
      setSaving(true);
      await onSave({
        ...form,
        description: String(form.description || '').trim(),
        due_date: form.due_date || null,
      });
      setSaving(false);
      onClose();
      setForm({
        project_id: '',
        description: '',
        status: 'Not Started',
        priority: 'Normal',
        due_date: '',
      });
    } catch (err) {
      setSaving(false);
      alert('Failed to create task: ' + err.message);
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal-container" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrapper">
            <FaTasks className="modal-icon" />
            <h2 className="modal-title">Add Task</h2>
          </div>
          <button className="modal-close-button" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group full-width">
              <label className="form-label">
                <FaProjectDiagram className="form-icon" />
                Project *
              </label>
              <select
                className="form-input"
                name="project_id"
                value={form.project_id}
                onChange={handleChange}
              >
                <option value="">Select project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.project_name || '(Unnamed Project)'}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group full-width">
              <label className="form-label">
                <FaTasks className="form-icon" />
                Task Description *
              </label>
              <input
                className="form-input"
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="e.g. Prepare proposal deck"
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <FaFlag className="form-icon" />
                Status
              </label>
              <select
                className="form-input"
                name="status"
                value={form.status}
                onChange={handleChange}
              >
                <option>Not Started</option>
                <option>In Progress</option>
                <option>Completed</option>
                <option>On Hold</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                <FaExclamationTriangle className="form-icon" />
                Priority
              </label>
              <select
                className="form-input"
                name="priority"
                value={form.priority}
                onChange={handleChange}
              >
                <option>Low</option>
                <option>Normal</option>
                <option>High</option>
              </select>
            </div>

            <div className="form-group full-width">
              <label className="form-label">
                <FaCalendarAlt className="form-icon" />
                Due date
              </label>
              <input
                className="form-input"
                type="date"
                name="due_date"
                value={form.due_date}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="button-cancel" onClick={onClose}>
              <FaTimes />
              Cancel
            </button>
            <button type="submit" className="button-submit" disabled={saving}>
              <FaSave />
              {saving ? 'Saving...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Projects table links via customer_name
const ProjectModal = ({ isOpen, onClose, onSave }) => {
  const [form, setForm] = useState({
    project_name: '',
    scope: '',
    sales_stage: 'Opportunity',
    deal_value: '',
    product: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setSaving(false);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!String(form.project_name || '').trim()) {
      alert('Project name is required.');
      return;
    }

    try {
      setSaving(true);
      await onSave({
        project_name: String(form.project_name || '').trim(),
        scope: String(form.scope || '').trim() || null,
        sales_stage: form.sales_stage || null,
        deal_value: form.deal_value ? Number(form.deal_value) : null,
        product: String(form.product || '').trim() || null,
      });
      setSaving(false);
      onClose();
      setForm({
        project_name: '',
        scope: '',
        sales_stage: 'Opportunity',
        deal_value: '',
        product: '',
      });
    } catch (err) {
      setSaving(false);
      alert('Failed to create project: ' + err.message);
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal-container" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrapper">
            <FaProjectDiagram className="modal-icon" />
            <h2 className="modal-title">Add Project</h2>
          </div>
          <button className="modal-close-button" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group full-width">
              <label className="form-label">
                <FaProjectDiagram className="form-icon" />
                Project name *
              </label>
              <input
                className="form-input"
                name="project_name"
                value={form.project_name}
                onChange={handleChange}
                placeholder="e.g. Debit CMS Replacement"
              />
            </div>

            <div className="form-group full-width">
              <label className="form-label">
                <FaInfoCircle className="form-icon" />
                Scope
              </label>
              <textarea
                className="form-textarea"
                name="scope"
                value={form.scope}
                onChange={handleChange}
                placeholder="Short scope notes"
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <FaChartLine className="form-icon" />
                Sales stage
              </label>
              <select
                className="form-input"
                name="sales_stage"
                value={form.sales_stage}
                onChange={handleChange}
              >
                <option>Lead</option>
                <option>Opportunity</option>
                <option>Proposal</option>
                <option>Contracting</option>
                <option>Done</option>
                <option>Closed - Won</option>
                <option>Closed - Lost</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                <FaMoneyBillWave className="form-icon" />
                Deal value
              </label>
              <input
                className="form-input"
                name="deal_value"
                value={form.deal_value}
                onChange={handleChange}
                placeholder="e.g. 250000"
              />
            </div>

            <div className="form-group full-width">
              <label className="form-label">
                <FaInfoCircle className="form-icon" />
                Product
              </label>
              <input
                className="form-input"
                name="product"
                value={form.product}
                onChange={handleChange}
                placeholder="e.g. SmartVista CMS"
              />
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="button-cancel" onClick={onClose}>
              <FaTimes />
              Cancel
            </button>
            <button type="submit" className="button-submit" disabled={saving}>
              <FaSave />
              {saving ? 'Saving...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const CustomerDetails = () => {
  const params = useParams();
  const navigate = useNavigate();

  // supports /customer/:id or /customer/:customerId
  const customerId = params.id || params.customerId;

  const [customer, setCustomer] = useState(null);
  const [editCustomer, setEditCustomer] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);

  const [statusOptions, setStatusOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showStakeholdersModal, setShowStakeholdersModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);

  const isValidCustomerId = useMemo(() => {
    if (!customerId) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      String(customerId)
    );
  }, [customerId]);

  const formatCurrency = (amount) => {
    const n = Number(amount);
    if (!amount || Number.isNaN(n)) return '$0';
    return n.toLocaleString(undefined, {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    });
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return '';
    const d = new Date(dateValue);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    });
  };

  const todayISODate = () => new Date().toISOString().slice(0, 10);

  const fetchCustomer = async () => {
    try {
      setLoading(true);
      setError('');

      if (!isValidCustomerId) {
        setCustomer(null);
        setEditCustomer(null);
        setError('Invalid or missing customer ID in the URL.');
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();

      if (fetchError) throw fetchError;

      setCustomer(data);
      setEditCustomer(data);
    } catch (err) {
      console.error('Error fetching customer:', err);
      setError(err.message || 'Failed to load customer');
    } finally {
      setLoading(false);
    }
  };

  // projects table links via customer_name
  const fetchProjects = async (customerName) => {
    try {
      if (!customerName) {
        setProjects([]);
        return;
      }

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('customer_name', customerName)
        .order('due_date', { ascending: true, nullsFirst: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (err) {
      console.error('Error fetching projects:', err);
    }
  };

  const fetchTasks = async (projectList) => {
    if (!projectList || projectList.length === 0) {
      setTasks([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('project_tasks')
        .select('*')
        .in('project_id', projectList.map((p) => p.id))
        .order('due_date', { ascending: true });

      if (error) throw error;
      setTasks(data || []);
    } catch (err) {
      console.error('Error fetching tasks:', err);
    }
  };

  const fetchStatusOptions = async () => {
    try {
      const { data, error } = await supabase
        .from('customer_statuses')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setStatusOptions(data || []);
    } catch (err) {
      console.error('Error fetching status options:', err);
    }
  };

  useEffect(() => {
    fetchCustomer();
    fetchStatusOptions();
  }, [customerId, isValidCustomerId]);

  useEffect(() => {
    if (!customer?.customer_name) return;
    fetchProjects(customer.customer_name);
  }, [customer?.customer_name]);

  useEffect(() => {
    fetchTasks(projects);
  }, [projects]);

  const getStatusLabel = (statusId) => {
    if (!statusId) return '';
    const found = statusOptions.find((s) => String(s.id) === String(statusId));
    return found ? found.status_name : '';
  };

  const getStatusClass = (statusLabel) => {
    const s = String(statusLabel || '').toLowerCase();
    if (s.includes('active')) return 'status-active';
    if (s.includes('prospect')) return 'status-prospect';
    if (s.includes('hold')) return 'status-onhold';
    if (s.includes('dormant')) return 'status-dormant';
    if (s.includes('inactive')) return 'status-inactive';
    return 'status-none';
  };

  const parsedStakeholders = useMemo(() => {
    if (!customer?.key_stakeholders) return [];
    const list = Array.isArray(customer.key_stakeholders) ? customer.key_stakeholders : [];
    return list.map(parseStakeholderEntry).filter((s) => s.name || s.role || s.contact);
  }, [customer]);

  // --- Date helpers for due indicators ---
  const todayStart = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const isOverdue = (dueDate) => {
    if (!dueDate) return false;
    const due = new Date(dueDate);
    if (Number.isNaN(due.getTime())) return false;
    due.setHours(0, 0, 0, 0);
    return due < todayStart();
  };

  const isDueSoon = (dueDate, days = 7) => {
    if (!dueDate) return false;
    const due = new Date(dueDate);
    if (Number.isNaN(due.getTime())) return false;
    due.setHours(0, 0, 0, 0);
    const start = todayStart();
    const soon = new Date(start);
    soon.setDate(soon.getDate() + days);
    return due >= start && due <= soon;
  };

  // === NEW: define what "completed project" means for UI ===
  const isProjectCompleted = (stage) => {
    const s = String(stage || '').trim().toLowerCase();
    if (!s) return false;
    if (s === 'done') return true;
    if (s.startsWith('closed')) return true; // Closed - Won / Closed - Lost / etc.
    if (s.includes('closed')) return true;
    return false;
  };

  // Active deal logic (used for health strip / primary deal selection)
  const isDealActive = (stage) => !isProjectCompleted(stage);

  const getStageRank = (stage) => {
    const s = String(stage || '').toLowerCase();
    const rank = [
      { k: 'contract', r: 60 },
      { k: 'sow', r: 55 },
      { k: 'rfp', r: 50 },
      { k: 'proposal', r: 45 },
      { k: 'opportunity', r: 40 },
      { k: 'lead', r: 30 },
    ];
    for (const it of rank) {
      if (s.includes(it.k)) return it.r;
    }
    return 10;
  };

  // === NEW: hide completed projects from the UI list ===
  const visibleProjects = useMemo(() => {
    return (projects || []).filter((p) => !isProjectCompleted(p.sales_stage));
  }, [projects]);

  // === NEW: hide completed tasks from the UI list ===
  const visibleTasks = useMemo(() => {
    return (tasks || []).filter(
      (t) => String(t.status || '').trim().toLowerCase() !== 'completed'
    );
  }, [tasks]);

  // Primary active deal + attention (still based on active deals only)
  const dealInsight = useMemo(() => {
    const active = (projects || []).filter((p) => isDealActive(p.sales_stage));

    if (!active.length) {
      return { primary: null, attention: 'none', attentionLabel: '—', overdueCount: 0 };
    }

    const sorted = [...active].sort((a, b) => {
      const sr = getStageRank(b.sales_stage) - getStageRank(a.sales_stage);
      if (sr !== 0) return sr;

      const vr = (Number(b.deal_value) || 0) - (Number(a.deal_value) || 0);
      if (vr !== 0) return vr;

      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });

    const primary = sorted[0];

    const projectTasks = (tasks || []).filter((t) => String(t.project_id) === String(primary.id));
    const openTasks = projectTasks.filter(
      (t) => String(t.status || '').trim().toLowerCase() !== 'completed'
    );
    const overdueCount = openTasks.filter((t) => isOverdue(t.due_date)).length;

    let attention = 'green';
    const rank = getStageRank(primary.sales_stage);

    if (overdueCount > 0) attention = 'red';
    else if (rank >= 55) attention = 'red';
    else if (rank >= 40) attention = 'amber';
    else attention = 'green';

    const attentionLabel =
      attention === 'red' ? 'High' : attention === 'amber' ? 'Medium' : 'Low';

    return { primary, attention, attentionLabel, overdueCount };
  }, [projects, tasks]);

  const recentActivity = useMemo(() => {
    const lastProject = [...(projects || [])]
      .filter((p) => p.created_at)
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))[0];

    const lastTask = [...(tasks || [])]
      .filter((t) => t.updated_at || t.created_at)
      .sort(
        (a, b) =>
          new Date(b.updated_at || b.created_at || 0) -
          new Date(a.updated_at || a.created_at || 0)
      )[0];

    const lastCustomer = customer?.updated_at || customer?.created_at ? customer : null;
    return { lastProject, lastTask, lastCustomer };
  }, [projects, tasks, customer]);

  const summary = useMemo(() => {
    const totalProjects = projects.length;
    const activeProjects = (projects || []).filter((p) => !isProjectCompleted(p.sales_stage)).length;

    const closedWon = (projects || []).filter((p) =>
      String(p.sales_stage || '').toLowerCase().includes('won')
    ).length;

    const openTasks = (tasks || []).filter(
      (t) => String(t.status || '').trim().toLowerCase() !== 'completed'
    );
    const highPriorityOpen = openTasks.filter((t) => t.priority === 'High').length;

    const totalPipeline = (projects || []).reduce((sum, p) => {
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

  const handleUpdateCustomer = async () => {
    try {
      const newName = String(editCustomer?.customer_name || '').trim();
      if (!newName) {
        alert('Customer name is required.');
        return;
      }

      const oldName = customer?.customer_name || '';

      const { error: updateError } = await supabase
        .from('customers')
        .update({
          customer_name: newName,
          account_manager: editCustomer.account_manager || null,
          country: editCustomer.country || null,
          customer_type: editCustomer.customer_type || null,
          status_id: editCustomer.status_id || null,
          primary_presales: editCustomer.primary_presales || null,
        })
        .eq('id', customerId);

      if (updateError) throw updateError;

      if (oldName && newName && oldName !== newName) {
        const { error: projErr } = await supabase
          .from('projects')
          .update({ customer_name: newName })
          .eq('customer_name', oldName);

        if (projErr) {
          console.error('Failed to update projects customer_name:', projErr);
          alert(
            'Customer updated, but project links were not updated. Please rename projects.customer_name manually in Supabase.'
          );
        }
      }

      const updatedCustomer = {
        ...customer,
        customer_name: newName,
        account_manager: editCustomer.account_manager || null,
        country: editCustomer.country || null,
        customer_type: editCustomer.customer_type || null,
        status_id: editCustomer.status_id || null,
        primary_presales: editCustomer.primary_presales || null,
      };

      setCustomer(updatedCustomer);
      setEditCustomer(updatedCustomer);
      setIsEditing(false);

      await fetchProjects(newName);

      alert('Customer updated successfully');
    } catch (err) {
      console.error('Error updating customer:', err);
      alert('Failed to update customer: ' + err.message);
    }
  };

  const handleSaveStakeholders = async (encodedArray) => {
    try {
      const { error } = await supabase
        .from('customers')
        .update({ key_stakeholders: encodedArray })
        .eq('id', customerId);

      if (error) throw error;

      setCustomer((prev) => ({ ...prev, key_stakeholders: encodedArray }));

      alert('Stakeholders updated successfully');
      setShowStakeholdersModal(false);
    } catch (err) {
      console.error('Error saving stakeholders:', err);
      alert('Failed to update stakeholders: ' + err.message);
    }
  };

  const handleCreateTask = async (payload) => {
    const { error } = await supabase.from('project_tasks').insert([
      {
        project_id: payload.project_id,
        description: payload.description,
        status: payload.status || 'Not Started',
        priority: payload.priority || 'Normal',
        due_date: payload.due_date || null,
      },
    ]);

    if (error) throw error;
    await fetchTasks(projects);
  };

  const handleCreateProject = async (payload) => {
    const insertPayload = {
      ...payload,
      customer_name: customer.customer_name,
      account_manager: customer.account_manager || null,
      country: customer.country || null,
      primary_presales: customer.primary_presales || null,
      created_at: todayISODate(),
    };

    const { error } = await supabase.from('projects').insert([insertPayload]);
    if (error) throw error;

    await fetchProjects(customer.customer_name);
  };

  useEffect(() => {
    const handler = (e) => {
      const tag = e.target?.tagName ? e.target.tagName.toLowerCase() : '';
      const isTyping =
        tag === 'input' || tag === 'textarea' || tag === 'select' || e.target?.isContentEditable;
      if (isTyping) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const k = String(e.key || '').toLowerCase();
      if (k === 'e') setIsEditing(true);
      if (k === 'a') setShowStakeholdersModal(true);
      if (k === 't') setShowTaskModal(true);
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  if (loading) {
    return (
      <div className="customer-details-container">
        <div className="loading-state">
          <div className="loading-spinner" />
          <div className="loading-text">Loading customer details...</div>
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
          <h2 className="error-title">Could not load customer</h2>
          <p className="error-message">{error || 'Customer not found'}</p>
          <button className="btn-secondary" onClick={() => navigate(-1)}>
            <FaTimes />
            Back
          </button>
        </div>
      </div>
    );
  }

  const statusLabel = getStatusLabel(customer.status_id);
  const statusClass = getStatusClass(statusLabel);

  return (
    <div className="customer-details-container">
      <header className="customer-header">
        <div className="customer-header-main">
          <div className="customer-header-text">
            <h1 className="customer-title">{customer.customer_name || 'Customer'}</h1>
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
              {dealInsight.primary && (
                <span className={`customer-subtitle attention-subtitle ${dealInsight.attention}`}>
                  <FaExclamationTriangle />
                  Attention: {dealInsight.attentionLabel}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="customer-header-actions">
          <button className="btn-secondary" onClick={() => navigate(-1)}>
            <FaTimes />
            Back
          </button>

          {!isEditing ? (
            <button className="btn-primary" onClick={() => setIsEditing(true)}>
              <FaEdit />
              Edit
            </button>
          ) : (
            <>
              <button
                className="btn-secondary"
                onClick={() => {
                  setEditCustomer(customer);
                  setIsEditing(false);
                }}
              >
                <FaTimes />
                Cancel
              </button>
              <button className="btn-primary" onClick={handleUpdateCustomer}>
                <FaSave />
                Save
              </button>
            </>
          )}
        </div>
      </header>

      {/* Health strip */}
      <section className="section-card health-strip">
        <div className="health-grid">
          <div className="health-item">
            <div className="health-label">Active deal</div>
            {dealInsight.primary ? (
              <button
                type="button"
                className="health-link"
                onClick={() => navigate(`/project/${dealInsight.primary.id}`)}
              >
                {dealInsight.primary.project_name}
                {dealInsight.primary.sales_stage ? ` • ${dealInsight.primary.sales_stage}` : ''}
              </button>
            ) : (
              <div className="health-value muted">No active deal</div>
            )}
          </div>

          <div className="health-item">
            <div className="health-label">Attention</div>
            {dealInsight.primary ? (
              <span className={`attention-pill ${dealInsight.attention}`}>
                <span className="attention-dot" />
                {dealInsight.attentionLabel}
                {dealInsight.overdueCount > 0 ? ` • ${dealInsight.overdueCount} overdue` : ''}
              </span>
            ) : (
              <div className="health-value muted">—</div>
            )}
          </div>

          <div className="health-item">
            <div className="health-label">Primary presales</div>
            <div className="health-value">{customer.primary_presales || '—'}</div>
          </div>

          <div className="health-item">
            <div className="health-label">Account manager</div>
            <div className="health-value">{customer.account_manager || '—'}</div>
          </div>
        </div>
      </section>

      <main className="customer-main-layout">
        <div className="customer-main-left">
          {/* Customer Info */}
          <section className="section-card customer-info-section">
            <div className="section-header">
              <div className="section-title">
                <FaInfoCircle />
                <h2>Customer Information</h2>
              </div>
            </div>

            <div className="customer-info-grid">
              <div className="info-item">
                <label>Customer name</label>
                {isEditing ? (
                  <input
                    className="info-input"
                    value={editCustomer.customer_name || ''}
                    onChange={(e) =>
                      setEditCustomer((prev) => ({ ...prev, customer_name: e.target.value }))
                    }
                  />
                ) : (
                  <div className="info-value main-name">{customer.customer_name || '—'}</div>
                )}
              </div>

              <div className="info-item">
                <label>Customer type</label>
                {isEditing ? (
                  <select
                    className="info-input"
                    value={editCustomer.customer_type || ''}
                    onChange={(e) =>
                      setEditCustomer((prev) => ({ ...prev, customer_type: e.target.value }))
                    }
                  >
                    <option value="">Select</option>
                    {customerTypes.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="info-value">{customer.customer_type || '—'}</div>
                )}
              </div>

              <div className="info-item">
                <label>Country</label>
                {isEditing ? (
                  <select
                    className="info-input"
                    value={editCustomer.country || ''}
                    onChange={(e) =>
                      setEditCustomer((prev) => ({ ...prev, country: e.target.value }))
                    }
                  >
                    <option value="">Select</option>
                    {asiaPacificCountries.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="info-value">{customer.country || '—'}</div>
                )}
              </div>

              <div className="info-item">
                <label>Account manager</label>
                {isEditing ? (
                  <input
                    className="info-input"
                    value={editCustomer.account_manager || ''}
                    onChange={(e) =>
                      setEditCustomer((prev) => ({ ...prev, account_manager: e.target.value }))
                    }
                  />
                ) : (
                  <div className="info-value">{customer.account_manager || '—'}</div>
                )}
              </div>

              <div className="info-item">
                <label>Primary presales</label>
                {isEditing ? (
                  <input
                    className="info-input"
                    value={editCustomer.primary_presales || ''}
                    onChange={(e) =>
                      setEditCustomer((prev) => ({ ...prev, primary_presales: e.target.value }))
                    }
                    placeholder="e.g. Jonathan"
                  />
                ) : (
                  <div className="info-value">{customer.primary_presales || '—'}</div>
                )}
              </div>

              <div className="info-item">
                <label>Customer Status</label>
                {isEditing ? (
                  <select
                    name="status_id"
                    className="info-input"
                    value={editCustomer.status_id ? String(editCustomer.status_id) : ''}
                    onChange={(e) =>
                      setEditCustomer((prev) => ({
                        ...prev,
                        status_id: e.target.value ? Number(e.target.value) : null,
                      }))
                    }
                  >
                    <option value="">Select</option>
                    {statusOptions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.status_name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="status-pill">
                    <span className={statusClass}>{statusLabel || '—'}</span>
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
              <div className="section-actions">
                <button className="icon-btn" onClick={() => setShowStakeholdersModal(true)}>
                  <FaEdit />
                </button>
              </div>
            </div>

            {parsedStakeholders.length === 0 ? (
              <div className="empty-state small">
                <p>No stakeholders recorded yet. Add key contacts for this account.</p>
              </div>
            ) : (
              <div className="stakeholder-list">
                {parsedStakeholders.map((s, index) => {
                  const initial = s.name?.trim().charAt(0) || '?';
                  return (
                    <div key={index} className="stakeholder-item">
                      <div className="stakeholder-main">
                        <div className="stakeholder-avatar">{initial}</div>
                        <div className="stakeholder-info">
                          <div className="stakeholder-name-row">
                            <h3>{s.name || '—'}</h3>
                            {s.role ? <span className="stakeholder-role">{s.role}</span> : null}
                          </div>

                          <div className="stakeholder-contact">
                            {s.contact ? (
                              <>
                                <FaEnvelope />
                                <span>{s.contact}</span>
                              </>
                            ) : (
                              <span className="muted">No contact details</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="stakeholder-actions" />
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Projects */}
          <section className="section-card projects-section">
            <div className="section-header">
              <div className="section-title">
                <FaProjectDiagram />
                <h2>Projects / Opportunities</h2>
              </div>
              <div className="section-actions">
                <button className="btn-secondary" onClick={() => setShowProjectModal(true)}>
                  <FaPlus />
                  Add Project
                </button>
              </div>
            </div>

            {visibleProjects.length === 0 ? (
              <div className="empty-state small">
                <p>No active opportunities to show. (Done/Closed projects are hidden.)</p>
              </div>
            ) : (
              <div className="project-list">
                {visibleProjects.map((p) => {
                  const isPrimary =
                    dealInsight.primary && String(dealInsight.primary.id) === String(p.id);

                  return (
                    <div
                      key={p.id}
                      className={`project-item ${isPrimary ? 'project-primary' : ''}`}
                      onClick={() => navigate(`/project/${p.id}`)}
                      title={isPrimary ? 'Primary deal' : 'Open project'}
                    >
                      <div className="project-main">
                        <h3>
                          {p.project_name || '(Unnamed Project)'}
                          {isPrimary ? <span className="project-primary-badge">Primary</span> : null}
                        </h3>
                        {p.scope ? <p className="project-scope">{p.scope}</p> : null}
                      </div>

                      <div className="project-details">
                        <div className="project-meta">
                          <span className="project-meta-item">
                            <FaChartLine />
                            {p.sales_stage || '—'}
                          </span>
                          {p.product ? (
                            <span className="project-meta-item">
                              <FaInfoCircle />
                              {p.product}
                            </span>
                          ) : null}
                        </div>

                        <div className="project-value">
                          <FaMoneyBillWave />
                          {formatCurrency(p.deal_value)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Right column */}
        <aside className="customer-main-right">
          {/* Snapshot */}
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
                <span className="snapshot-value">{summary.totalProjects}</span>
              </div>
              <div className="snapshot-item">
                <span className="snapshot-label">Active opportunities</span>
                <span className="snapshot-value">{summary.activeProjects}</span>
              </div>
              <div className="snapshot-item">
                <span className="snapshot-label">Closed / won</span>
                <span className="snapshot-value">{summary.closedWon}</span>
              </div>
              <div className="snapshot-item">
                <span className="snapshot-label">Open tasks</span>
                <span className="snapshot-value">{summary.openTasksCount}</span>
              </div>
              <div className="snapshot-item">
                <span className="snapshot-label">High priority tasks</span>
                <span className="snapshot-value">{summary.highPriorityOpen}</span>
              </div>
              <div className="snapshot-item">
                <span className="snapshot-label">Total pipeline</span>
                <span className="snapshot-value">{formatCurrency(summary.totalPipeline)}</span>
              </div>
            </div>
          </section>

          {/* Recent activity */}
          <section className="section-card recent-activity-section">
            <div className="section-header">
              <div className="section-title">
                <FaRegStickyNote />
                <h2>Recent Activity</h2>
              </div>
            </div>

            <div className="recent-activity-list">
              <div className="recent-activity-row">
                <span className="recent-activity-label">Last project added</span>
                <span className="recent-activity-value">
                  {recentActivity.lastProject
                    ? `${recentActivity.lastProject.project_name || 'Project'} • ${formatDate(
                        recentActivity.lastProject.created_at
                      )}`
                    : '—'}
                </span>
              </div>

              <div className="recent-activity-row">
                <span className="recent-activity-label">Last task update</span>
                <span className="recent-activity-value">
                  {recentActivity.lastTask
                    ? `${recentActivity.lastTask.description || 'Task'} • ${formatDate(
                        recentActivity.lastTask.updated_at || recentActivity.lastTask.created_at
                      )}`
                    : '—'}
                </span>
              </div>

              <div className="recent-activity-row">
                <span className="recent-activity-label">Last customer update</span>
                <span className="recent-activity-value">
                  {recentActivity.lastCustomer
                    ? formatDate(
                        recentActivity.lastCustomer.updated_at ||
                          recentActivity.lastCustomer.created_at
                      )
                    : '—'}
                </span>
              </div>
            </div>

            <div className="recent-activity-hint">
              Tip: press <span className="kbd">E</span> to edit, <span className="kbd">A</span> for
              stakeholders, <span className="kbd">T</span> to add a task.
            </div>
          </section>

          {/* Tasks */}
          <section className="section-card tasks-section">
            <div className="section-header">
              <div className="section-title">
                <FaTasks />
                <h2>Tasks (by project)</h2>
              </div>
              <div className="section-actions">
                <button className="btn-secondary" onClick={() => setShowTaskModal(true)}>
                  <FaPlus />
                  Add Task
                </button>
              </div>
            </div>

            {visibleTasks.length === 0 ? (
              <div className="empty-state small">
                <p>No open tasks to show. (Completed tasks are hidden.)</p>
              </div>
            ) : (
              <div className="customer-tasks-list">
                {visibleProjects.map((p) => {
                  const projectTasks = visibleTasks.filter(
                    (t) => String(t.project_id) === String(p.id)
                  );
                  if (!projectTasks.length) return null;

                  return (
                    <div key={p.id} className="customer-project-task-group">
                      <div className="customer-project-task-header">
                        <h3 onClick={() => navigate(`/project/${p.id}`)}>
                          {p.project_name || '(Unnamed Project)'}
                        </h3>
                        <span className="task-count-badge">
                          {projectTasks.length} task{projectTasks.length > 1 ? 's' : ''}
                        </span>
                      </div>

                      <ul className="project-task-list">
                        {projectTasks.map((t) => (
                          <li
                            key={t.id}
                            className={`task-item status-${String(t.status || '')
                              .toLowerCase()
                              .replace(/\s/g, '-')}

                              ${
                                isOverdue(t.due_date)
                                  ? 'due-overdue'
                                  : isDueSoon(t.due_date, 7)
                                  ? 'due-soon'
                                  : ''
                              }`}
                          >
                            <div className="task-main">
                              <div className="task-desc">{t.description}</div>
                              {t.due_date && (
                                <span className="task-due">
                                  <FaCalendarAlt />
                                  {formatDate(t.due_date)}
                                </span>
                              )}
                            </div>

                            <div className="task-meta">
                              <span
                                className={`task-status-badge status-${String(t.status || '')
                                  .toLowerCase()
                                  .replace(/\s/g, '-')}`}
                              >
                                {t.status || 'Not Started'}
                              </span>
                              <span
                                className={`task-priority-badge priority-${String(t.priority || '')
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
        </aside>
      </main>

      {/* Modals */}
      <TaskModal
        isOpen={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        onSave={handleCreateTask}
        projects={projects}
      />

      <ProjectModal
        isOpen={showProjectModal}
        onClose={() => setShowProjectModal(false)}
        onSave={handleCreateProject}
      />

      <StakeholdersModal
        isOpen={showStakeholdersModal}
        onClose={() => setShowStakeholdersModal(false)}
        onSave={handleSaveStakeholders}
        existingStakeholders={customer.key_stakeholders || []}
      />
    </div>
  );
};

export default CustomerDetails;
