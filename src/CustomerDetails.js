// src/CustomerDetails.js

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from './supabaseClient';
import './CustomerDetails.css';

import {
  FaBuilding,
  FaCalendarAlt,
  FaChartLine,
  FaEdit,
  FaEnvelope,
  FaExclamationTriangle,
  FaGlobeAsia,
  FaInfoCircle,
  FaMoneyBillWave,
  FaPlus,
  FaProjectDiagram,
  FaRegStickyNote,
  FaSave,
  FaTasks,
  FaTimes,
  FaTrash,
  FaUserTie,
  FaUsers,
} from 'react-icons/fa';

// IMPORTANT: Must match your DB constraint values exactly
const customerTypes = ['New', 'Existing', 'Internal Initiative'];

const parseStakeholderEntry = (entry) => {
  if (!entry) return { name: '', role: '', contact: '' };
  const parts = String(entry).split('|');
  return {
    name: (parts[0] || '').trim(),
    role: (parts[1] || '').trim(),
    contact: (parts[2] || '').trim(),
  };
};

const encodeStakeholderEntry = ({ name, role, contact }) => {
  return `${String(name || '').trim()} | ${String(role || '').trim()} | ${String(
    contact || ''
  ).trim()}`.trim();
};

const isUuid = (value) => {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value)
  );
};

const formatNumber = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  if (Number.isNaN(n)) return '—';
  return n.toLocaleString();
};

const formatCompact = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';

  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';

  if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`;
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(1).replace(/\.0$/, '')}K`;

  return n.toLocaleString();
};

// ---- Customer Status helpers (aligned with Projects.js) ----
const getCustomerStatus = (customerRow, statusList) => {
  const id = customerRow?.status_id;
  if (id === null || id === undefined || id === '') return null;
  return (statusList || []).find((s) => String(s.id) === String(id)) || null;
};

const getStatusBadgeClass = (codeOrLabel) => {
  const v = String(codeOrLabel || '').toLowerCase();
  if (!v) return 'status-none';

  if (v.includes('active')) return 'status-active';
  if (v.includes('prospect') || v.includes('lead')) return 'status-prospect';
  if (v.includes('hold') || v.includes('on_hold') || v.includes('on-hold')) return 'status-onhold';
  if (v.includes('dormant')) return 'status-dormant';
  if (v.includes('inactive') || v.includes('archiv')) return 'status-inactive';

  return 'status-none';
};
// -----------------------------------------------------------

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
                <FaInfoCircle className="form-icon" />
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

const ProjectModal = ({ isOpen, onClose, onSave }) => {
  const [form, setForm] = useState({
    project_name: '',
    scope: '',
    sales_stage: 'Opportunity',
    deal_value: '',
    product: '',
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
        due_date: form.due_date || null,
      });
      setSaving(false);
      onClose();
      setForm({
        project_name: '',
        scope: '',
        sales_stage: 'Opportunity',
        deal_value: '',
        product: '',
        due_date: '',
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
              {saving ? 'Saving...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const MetricsModal = ({ isOpen, onClose, onSave, initial }) => {
  const [form, setForm] = useState({
    atms: '',
    debit_cards: '',
    credit_cards: '',
    pos_terminals: '',
    merchants: '',
    tx_per_day: '',
    active_cards: '',
    digital_users: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setSaving(false);
    setForm({
      atms: initial?.atms ?? '',
      debit_cards: initial?.debit_cards ?? '',
      credit_cards: initial?.credit_cards ?? '',
      pos_terminals: initial?.pos_terminals ?? '',
      merchants: initial?.merchants ?? '',
      tx_per_day: initial?.tx_per_day ?? '',
      active_cards: initial?.active_cards ?? '',
      digital_users: initial?.digital_users ?? '',
    });
  }, [isOpen, initial]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const toIntOrNull = (v) => {
    const s = String(v ?? '').trim();
    if (!s) return null;
    const n = Number(s);
    if (!Number.isFinite(n)) return null;
    return Math.trunc(n);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await onSave({
        atms: toIntOrNull(form.atms),
        debit_cards: toIntOrNull(form.debit_cards),
        credit_cards: toIntOrNull(form.credit_cards),
        pos_terminals: toIntOrNull(form.pos_terminals),
        merchants: toIntOrNull(form.merchants),
        tx_per_day: toIntOrNull(form.tx_per_day),
        active_cards: toIntOrNull(form.active_cards),
        digital_users: toIntOrNull(form.digital_users),
      });
      setSaving(false);
      onClose();
    } catch (err) {
      setSaving(false);
      alert('Failed to save metrics: ' + (err.message || 'Unknown error'));
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal-container" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrapper">
            <FaChartLine className="modal-icon" />
            <h2 className="modal-title">Edit Customer Metrics</h2>
          </div>
          <button className="modal-close-button" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Number of ATMs</label>
              <input className="form-input" name="atms" value={form.atms} onChange={handleChange} />
            </div>

            <div className="form-group">
              <label className="form-label">Debit cards</label>
              <input
                className="form-input"
                name="debit_cards"
                value={form.debit_cards}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Credit cards</label>
              <input
                className="form-input"
                name="credit_cards"
                value={form.credit_cards}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">POS terminals</label>
              <input
                className="form-input"
                name="pos_terminals"
                value={form.pos_terminals}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Merchants</label>
              <input
                className="form-input"
                name="merchants"
                value={form.merchants}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Transactions / day</label>
              <input
                className="form-input"
                name="tx_per_day"
                value={form.tx_per_day}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Active cards</label>
              <input
                className="form-input"
                name="active_cards"
                value={form.active_cards}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Digital users</label>
              <input
                className="form-input"
                name="digital_users"
                value={form.digital_users}
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
              {saving ? 'Saving...' : 'Save Metrics'}
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

  const customerId = params.id || params.customerId;

  const [customer, setCustomer] = useState(null);
  const [editCustomer, setEditCustomer] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);

  const [statusOptions, setStatusOptions] = useState([]);

  // dropdown options pulled from DB
  const [countryOptions, setCountryOptions] = useState([]); // countries.name
  const [accountManagerOptions, setAccountManagerOptions] = useState([]); // account_managers (id, name)

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showStakeholdersModal, setShowStakeholdersModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);

  const [showCompletedProjects, setShowCompletedProjects] = useState(false);
  const [deletingProjectId, setDeletingProjectId] = useState(null);

  const [projectSort, setProjectSort] = useState('stage');

  const [companyProfileDraft, setCompanyProfileDraft] = useState('');
  const [savingCompanyProfile, setSavingCompanyProfile] = useState(false);

  const [metrics, setMetrics] = useState(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [showMetricsModal, setShowMetricsModal] = useState(false);

  const isValidCustomerId = useMemo(() => isUuid(customerId), [customerId]);

  const todayISODate = () => new Date().toISOString().slice(0, 10);

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

  const getProjectStage = (p) => String(p?.sales_stage || p?.current_status || '').trim();

  const isProjectCompleted = (stage) => {
    const s = String(stage || '').trim().toLowerCase();
    if (!s) return false;
    if (s === 'done') return true;
    if (s.includes('completed')) return true;
    if (s.startsWith('closed')) return true;
    if (s.includes('closed')) return true;
    return false;
  };

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

  const copyToClipboard = async (text) => {
    const t = String(text || '').trim();
    if (!t) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(t);
        return true;
      }
    } catch (e) {}
    try {
      const el = document.createElement('textarea');
      el.value = t;
      el.style.position = 'fixed';
      el.style.left = '-9999px';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      return true;
    } catch (e) {
      return false;
    }
  };

  const fetchCustomer = async () => {
    try {
      setLoading(true);
      setError('');

      if (!isValidCustomerId) {
        setCustomer(null);
        setEditCustomer(null);
        setCompanyProfileDraft('');
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
      setCompanyProfileDraft(data?.notes || '');
    } catch (err) {
      console.error('Error fetching customer:', err);
      setError(err.message || 'Failed to load customer');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerMetrics = async () => {
    if (!isValidCustomerId) return;
    try {
      setMetricsLoading(true);
      const { data, error: mErr } = await supabase
        .from('customer_metrics')
        .select('*')
        .eq('customer_id', customerId)
        .maybeSingle();

      if (mErr) throw mErr;
      setMetrics(data || null);
    } catch (err) {
      console.error('Error fetching customer metrics:', err);
      setMetrics(null);
    } finally {
      setMetricsLoading(false);
    }
  };

  const saveCustomerMetrics = async (payload) => {
    if (!isValidCustomerId) return;

    const upsertPayload = {
      customer_id: customerId,
      ...payload,
    };

    const { error: upErr } = await supabase
      .from('customer_metrics')
      .upsert(upsertPayload, { onConflict: 'customer_id' });

    if (upErr) throw upErr;

    await fetchCustomerMetrics();
    alert('Metrics saved.');
  };

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
        .order('id', { ascending: true });

      if (error) throw error;
      setStatusOptions(data || []);
    } catch (err) {
      console.error('Error fetching status options:', err);
    }
  };

  const fetchCountries = async () => {
    try {
      const { data, error } = await supabase
        .from('countries')
        .select('name')
        .order('name', { ascending: true });

      if (error) throw error;
      setCountryOptions((data || []).map((x) => x.name).filter(Boolean));
    } catch (err) {
      console.error('Error fetching countries:', err);
      setCountryOptions([]);
    }
  };

  const fetchAccountManagers = async () => {
    try {
      const { data, error } = await supabase
        .from('account_managers')
        .select('id,name')
        .order('name', { ascending: true });

      if (error) throw error;
      setAccountManagerOptions(data || []);
    } catch (err) {
      console.error('Error fetching account managers:', err);
      setAccountManagerOptions([]);
    }
  };

  useEffect(() => {
    fetchCustomer();
    fetchStatusOptions();
    fetchCustomerMetrics();
    fetchCountries();
    fetchAccountManagers();
  }, [customerId, isValidCustomerId]);

  useEffect(() => {
    if (!customer?.customer_name) return;
    fetchProjects(customer.customer_name);
  }, [customer?.customer_name]);

  useEffect(() => {
    fetchTasks(projects);
  }, [projects]);

  const parsedStakeholders = useMemo(() => {
    if (!customer?.key_stakeholders) return [];
    const list = Array.isArray(customer.key_stakeholders) ? customer.key_stakeholders : [];
    return list.map(parseStakeholderEntry).filter((s) => s.name || s.role || s.contact);
  }, [customer]);

  const visibleTasks = useMemo(() => {
    return (tasks || []).filter(
      (t) => String(t.status || '').trim().toLowerCase() !== 'completed'
    );
  }, [tasks]);

  const projectOpenTaskCount = useMemo(() => {
    const map = {};
    for (const t of visibleTasks) {
      const pid = String(t.project_id || '');
      if (!pid) continue;
      map[pid] = (map[pid] || 0) + 1;
    }
    return map;
  }, [visibleTasks]);

  const dealInsight = useMemo(() => {
    const active = (projects || []).filter((p) => !isProjectCompleted(getProjectStage(p)));

    if (!active.length) {
      return {
        primary: null,
        attention: 'none',
        attentionLabel: '—',
        overdueCount: 0,
        reason: '',
      };
    }

    const sorted = [...active].sort((a, b) => {
      const sr = getStageRank(getProjectStage(b)) - getStageRank(getProjectStage(a));
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
    const rank = getStageRank(getProjectStage(primary));

    if (overdueCount > 0) attention = 'red';
    else if (rank >= 55) attention = 'red';
    else if (rank >= 40) attention = 'amber';
    else attention = 'green';

    const attentionLabel =
      attention === 'red' ? 'High' : attention === 'amber' ? 'Medium' : 'Low';

    let reason = '';
    if (overdueCount > 0) reason = `${overdueCount} overdue task${overdueCount > 1 ? 's' : ''}`;
    else if (rank >= 55) reason = 'late-stage deal';
    else if (rank >= 40) reason = 'active opportunity';

    return { primary, attention, attentionLabel, overdueCount, reason };
  }, [projects, tasks]);

  const visibleProjects = useMemo(() => {
    let list = projects || [];

    if (!showCompletedProjects) {
      list = list.filter((p) => !isProjectCompleted(getProjectStage(p)));
    }

    const withSort = [...list];

    if (projectSort === 'value') {
      withSort.sort((a, b) => (Number(b.deal_value) || 0) - (Number(a.deal_value) || 0));
    } else if (projectSort === 'due') {
      withSort.sort((a, b) => {
        const ad = a.due_date ? new Date(a.due_date).getTime() : Number.POSITIVE_INFINITY;
        const bd = b.due_date ? new Date(b.due_date).getTime() : Number.POSITIVE_INFINITY;
        return ad - bd;
      });
    } else {
      withSort.sort((a, b) => {
        const sr = getStageRank(getProjectStage(b)) - getStageRank(getProjectStage(a));
        if (sr !== 0) return sr;
        return (Number(b.deal_value) || 0) - (Number(a.deal_value) || 0);
      });
    }

    return withSort;
  }, [projects, showCompletedProjects, projectSort]);

  const tasksGrouped = useMemo(() => {
    const overdue = [];
    const dueSoon = [];
    const later = [];

    for (const t of visibleTasks) {
      if (t.due_date && isOverdue(t.due_date)) overdue.push(t);
      else if (t.due_date && isDueSoon(t.due_date, 7)) dueSoon.push(t);
      else later.push(t);
    }

    const sortByDue = (a, b) => {
      const ad = a.due_date ? new Date(a.due_date).getTime() : Number.POSITIVE_INFINITY;
      const bd = b.due_date ? new Date(b.due_date).getTime() : Number.POSITIVE_INFINITY;
      return ad - bd;
    };

    overdue.sort(sortByDue);
    dueSoon.sort(sortByDue);
    later.sort(sortByDue);

    return { overdue, dueSoon, later };
  }, [visibleTasks]);

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

    const activeProjects = (projects || []).filter(
      (p) => !isProjectCompleted(getProjectStage(p))
    ).length;

    const openTasks = visibleTasks;
    const overdueCount = openTasks.filter((t) => isOverdue(t.due_date)).length;

    const totalPipeline = (projects || []).reduce((sum, p) => {
      if (!p.deal_value) return sum;
      return sum + Number(p.deal_value);
    }, 0);

    return {
      totalProjects,
      activeProjects,
      openTasksCount: openTasks.length,
      overdueCount,
      totalPipeline,
    };
  }, [projects, visibleTasks]);

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
          status_id:
            editCustomer.status_id === '' || editCustomer.status_id == null
              ? null
              : Number(editCustomer.status_id),
          notes: editCustomer.notes ?? null,
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
        status_id:
          editCustomer.status_id === '' || editCustomer.status_id == null
            ? null
            : Number(editCustomer.status_id),
        notes: editCustomer.notes ?? null,
      };

      setCustomer(updatedCustomer);
      setEditCustomer(updatedCustomer);
      setIsEditing(false);

      setCompanyProfileDraft(updatedCustomer.notes || '');

      await fetchProjects(newName);

      alert('Customer updated successfully');
    } catch (err) {
      console.error('Error updating customer:', err);
      alert('Failed to update customer: ' + err.message);
    }
  };

  const handleSaveStakeholders = async (encodedArray) => {
    try {
      const { error: sErr } = await supabase
        .from('customers')
        .update({ key_stakeholders: encodedArray })
        .eq('id', customerId);

      if (sErr) throw sErr;

      setCustomer((prev) => ({ ...prev, key_stakeholders: encodedArray }));
      alert('Stakeholders updated successfully');
      setShowStakeholdersModal(false);
    } catch (err) {
      console.error('Error saving stakeholders:', err);
      alert('Failed to update stakeholders: ' + err.message);
    }
  };

  const handleCreateTask = async (payload) => {
    const { error: tErr } = await supabase.from('project_tasks').insert([
      {
        project_id: payload.project_id,
        description: payload.description,
        status: payload.status || 'Not Started',
        priority: payload.priority || 'Normal',
        due_date: payload.due_date || null,
      },
    ]);

    if (tErr) throw tErr;
    await fetchTasks(projects);
  };

  const handleCreateProject = async (payload) => {
    const insertPayload = {
      ...payload,
      customer_name: customer.customer_name,
      account_manager: customer.account_manager || null,
      country: customer.country || null,
      created_at: todayISODate(),
    };

    const { error: pErr } = await supabase.from('projects').insert([insertPayload]);
    if (pErr) throw pErr;

    await fetchProjects(customer.customer_name);
  };

  const handleSaveCompanyProfile = async () => {
    try {
      setSavingCompanyProfile(true);

      const nextNotes = String(companyProfileDraft || '');

      const { error: nErr } = await supabase
        .from('customers')
        .update({ notes: nextNotes })
        .eq('id', customerId);

      if (nErr) throw nErr;

      setCustomer((prev) => ({ ...prev, notes: nextNotes }));
      setEditCustomer((prev) => (prev ? { ...prev, notes: nextNotes } : prev));
      alert('Company profile saved.');
    } catch (err) {
      console.error('Error saving company profile:', err);
      alert('Failed to save company profile: ' + err.message);
    } finally {
      setSavingCompanyProfile(false);
    }
  };

  const handleDeleteProject = async (project) => {
    if (!project?.id) return;

    const projectId = String(project.id);
    const name = project.project_name || 'this project';
    const taskCount = projectOpenTaskCount[projectId] || 0;

    let ok = window.confirm(
      `Delete "${name}"?\n\nThis will also delete ALL tasks under this project. This cannot be undone.`
    );
    if (!ok) return;

    if (taskCount > 0) {
      const typed = window.prompt(
        `This project has ${taskCount} open task(s).\n\nType DELETE to confirm:`
      );
      if (String(typed || '').trim().toUpperCase() !== 'DELETE') {
        alert('Delete cancelled.');
        return;
      }
    }

    try {
      setDeletingProjectId(project.id);

      const { error: taskDelErr } = await supabase
        .from('project_tasks')
        .delete()
        .eq('project_id', project.id);

      if (taskDelErr) throw taskDelErr;

      const { error: projDelErr } = await supabase.from('projects').delete().eq('id', project.id);
      if (projDelErr) throw projDelErr;

      await fetchProjects(customer.customer_name);
      alert('Project deleted.');
    } catch (err) {
      console.error('Error deleting project:', err);
      alert('Failed to delete project: ' + (err.message || 'Unknown error'));
    } finally {
      setDeletingProjectId(null);
    }
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

  const statusObj = getCustomerStatus(customer, statusOptions);
  const statusLabel = statusObj?.label || statusObj?.status_name || 'Not Set';
  const statusClass = getStatusBadgeClass(
    statusObj?.code || statusObj?.label || statusObj?.status_name
  );

  const lastUpdatedDisplay = formatDate(customer.updated_at || customer.created_at);

  const customerSnapshotItems = [
    {
      label: 'Total Pipeline',
      value: formatCurrency(summary.totalPipeline),
    },
    {
      label: 'Active Projects',
      value: formatNumber(summary.activeProjects),
    },
    {
      label: 'Open Tasks',
      value: formatNumber(summary.openTasksCount),
    },
    {
      label: 'Overdue Tasks',
      value: formatNumber(summary.overdueCount),
    },
    {
      label: 'ATMs',
      value: metricsLoading ? '…' : formatCompact(metrics?.atms),
    },
    {
      label: 'Active Cards',
      value: metricsLoading ? '…' : formatCompact(metrics?.active_cards),
    },
    {
      label: 'Tx / Day',
      value: metricsLoading ? '…' : formatCompact(metrics?.tx_per_day),
    },
    {
      label: 'Digital Users',
      value: metricsLoading ? '…' : formatCompact(metrics?.digital_users),
    },
  ];

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
                  {dealInsight.reason ? ` • ${dealInsight.reason}` : ''}
                </span>
              )}
            </div>

            <div className="customer-chips-row">
              <span className="customer-chip">
                <FaProjectDiagram /> Active projects: <b>{summary.activeProjects}</b>
              </span>
              <span className="customer-chip">
                <FaExclamationTriangle /> Overdue tasks: <b>{summary.overdueCount}</b>
              </span>
              <span className="customer-chip">
                <FaMoneyBillWave /> Pipeline: <b>{formatCurrency(summary.totalPipeline)}</b>
              </span>
              <span className="customer-chip">
                <FaCalendarAlt /> Updated: <b>{lastUpdatedDisplay || '—'}</b>
              </span>
            </div>
          </div>
        </div>

        <div className="customer-header-actions">
          <button className="btn-secondary" onClick={() => navigate(-1)}>
            <FaTimes />
            Back
          </button>

          <button className="btn-secondary" onClick={() => setShowProjectModal(true)}>
            <FaPlus />
            Add Project
          </button>
          <button className="btn-secondary" onClick={() => setShowTaskModal(true)}>
            <FaPlus />
            Add Task
          </button>
          <button className="btn-secondary" onClick={() => setShowStakeholdersModal(true)}>
            <FaPlus />
            Stakeholder
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

      <main className="customer-main-layout">
        {/* LEFT COLUMN */}
        <div className="customer-main-left">
          {/* CUSTOMER INFORMATION */}
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
                    {countryOptions.map((c) => (
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
                  <select
                    className="info-input"
                    value={editCustomer.account_manager || ''}
                    onChange={(e) =>
                      setEditCustomer((prev) => ({ ...prev, account_manager: e.target.value }))
                    }
                  >
                    <option value="">Select</option>
                    {accountManagerOptions.map((am) => (
                      <option key={am.id} value={am.name}>
                        {am.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="info-value">{customer.account_manager || '—'}</div>
                )}
              </div>

              <div className="info-item">
                <label>Customer Status</label>
                {isEditing ? (
                  <select
                    name="status_id"
                    className="info-input"
                    value={
                      editCustomer.status_id === null || editCustomer.status_id === undefined
                        ? ''
                        : String(editCustomer.status_id)
                    }
                    onChange={(e) =>
                      setEditCustomer((prev) => ({
                        ...prev,
                        status_id: e.target.value,
                      }))
                    }
                  >
                    <option value="">Not Set</option>
                    {statusOptions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label || s.status_name || s.name || `Status ${s.id}`}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="status-pill">
                    <span className={statusClass}>{statusLabel}</span>
                  </div>
                )}
              </div>

              <div className="info-item" style={{ gridColumn: '1 / -1' }}>
                <label>Company Profile</label>
                {isEditing ? (
                  <textarea
                    className="info-textarea"
                    value={editCustomer.notes || ''}
                    onChange={(e) =>
                      setEditCustomer((prev) => ({ ...prev, notes: e.target.value }))
                    }
                    placeholder="Short background / key context about the customer..."
                    rows={5}
                  />
                ) : (
                  <div className="info-value">{customer.notes ? customer.notes : '—'}</div>
                )}
              </div>
            </div>
          </section>

          {/* KEY STAKEHOLDERS */}
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
                              <button
                                type="button"
                                className="stakeholder-contact-btn"
                                title="Click to copy"
                                onClick={async () => {
                                  const ok = await copyToClipboard(s.contact);
                                  if (ok) alert('Copied to clipboard');
                                }}
                              >
                                <FaEnvelope />
                                <span>{s.contact}</span>
                              </button>
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

          {/* PROJECTS / OPPORTUNITIES */}
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

            <div className="project-controls-row">
              <div className="project-controls-left">
                <label className="control-label">
                  Sort
                  <select
                    className="control-select"
                    value={projectSort}
                    onChange={(e) => setProjectSort(e.target.value)}
                  >
                    <option value="stage">Stage</option>
                    <option value="value">Deal value</option>
                    <option value="due">Due date</option>
                  </select>
                </label>

                <label className="control-toggle">
                  <input
                    type="checkbox"
                    checked={showCompletedProjects}
                    onChange={(e) => setShowCompletedProjects(e.target.checked)}
                  />
                  Show completed
                </label>
              </div>
            </div>

            {visibleProjects.length === 0 ? (
              <div className="empty-state small">
                <p>No projects found for this customer yet.</p>
              </div>
            ) : (
              <div className="project-list">
                {visibleProjects.map((p) => {
                  const stage = getProjectStage(p);
                  const due = p.due_date ? formatDate(p.due_date) : '';
                  const openCount = projectOpenTaskCount[String(p.id)] || 0;
                  const isPrimary = dealInsight.primary && String(dealInsight.primary.id) === String(p.id);

                  return (
                    <div
                      key={p.id}
                      className={`project-item ${isPrimary ? 'project-primary' : ''}`}
                      onClick={() => {
                        // optional: navigate to ProjectDetails page if you have it
                        // navigate(`/project/${p.id}`)
                      }}
                    >
                      <div className="project-main">
                        <h3>
                          <span>{p.project_name || '(Unnamed Project)'}</span>
                          {isPrimary ? <span className="project-primary-badge">Primary</span> : null}
                        </h3>

                        {p.scope ? <p className="project-scope">{p.scope}</p> : null}

                        <div className="project-mini-row">
                          {stage ? <span className="project-stage-badge">{stage}</span> : null}
                          <span className="project-taskcount-badge">
                            <FaTasks /> {openCount} open
                          </span>
                          {due ? (
                            <span className="project-due-badge">
                              <FaCalendarAlt /> {due}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className="project-details">
                        <div className="project-value">
                          <FaMoneyBillWave />
                          {formatCurrency(p.deal_value)}
                        </div>

                        <button
                          className="btn-icon"
                          title="Delete project"
                          disabled={deletingProjectId === p.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteProject(p);
                          }}
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* NOTES */}
          <section className="section-card notes-section">
            <div className="section-header">
              <div className="section-title">
                <FaRegStickyNote />
                <h2>My Notes</h2>
              </div>
              <div className="section-actions">
                <button
                  className="btn-primary"
                  onClick={handleSaveCompanyProfile}
                  disabled={savingCompanyProfile}
                >
                  <FaSave />
                  {savingCompanyProfile ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>

            <textarea
              className="notes-textarea"
              value={companyProfileDraft}
              onChange={(e) => setCompanyProfileDraft(e.target.value)}
              placeholder="Write notes about the customer, meetings, next steps, risks..."
            />
          </section>
        </div>

        {/* RIGHT COLUMN */}
        <div className="customer-main-right">
          {/* SNAPSHOT */}
          <section className="section-card snapshot-section">
            <div className="section-header">
              <div className="section-title">
                <FaChartLine />
                <h2>Customer Snapshot</h2>
              </div>
              <div className="section-actions">
                <button className="btn-secondary" onClick={() => setShowMetricsModal(true)}>
                  <FaEdit />
                  Edit metrics
                </button>
              </div>
            </div>

            <div className="snapshot-grid">
              {customerSnapshotItems.map((it) => (
                <div className="snapshot-item" key={it.label}>
                  <div className="snapshot-label">{it.label}</div>
                  <div className="snapshot-value">{it.value}</div>
                </div>
              ))}
            </div>
          </section>

          {/* RECENT ACTIVITY */}
          <section className="section-card recent-activity-section">
            <div className="section-header">
              <div className="section-title">
                <FaCalendarAlt />
                <h2>Recent Activity</h2>
              </div>
            </div>

            <div className="recent-activity-list">
              <div className="recent-activity-row">
                <div className="recent-activity-label">Last updated</div>
                <div className="recent-activity-value">{lastUpdatedDisplay || '—'}</div>
              </div>

              <div className="recent-activity-row">
                <div className="recent-activity-label">Latest project</div>
                <div className="recent-activity-value">
                  {recentActivity.lastProject?.project_name || '—'}
                </div>
              </div>

              <div className="recent-activity-row">
                <div className="recent-activity-label">Latest task</div>
                <div className="recent-activity-value">
                  {recentActivity.lastTask?.description || recentActivity.lastTask?.title || '—'}
                </div>
              </div>
            </div>

            <div className="recent-activity-hint">
              Tip: Use <span className="kbd">E</span> to edit, <span className="kbd">T</span> to add a task, <span className="kbd">A</span> to add stakeholder.
            </div>
          </section>

          {/* TASKS */}
          <section className="section-card tasks-section">
            <div className="section-header">
              <div className="section-title">
                <FaTasks />
                <h2>Open Tasks</h2>
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
                <p>No open tasks found for this customer.</p>
              </div>
            ) : (
              <div className="tasks-grouped">
                {tasksGrouped.overdue.length > 0 && (
                  <div className="task-group">
                    <div className="task-group-header">
                      <h3>Overdue</h3>
                      <span className="task-count-badge">{tasksGrouped.overdue.length}</span>
                    </div>
                    <ul className="project-task-list">
                      {tasksGrouped.overdue.map((t) => (
                        <li key={t.id} className="task-item due-overdue">
                          <div className="task-main">
                            <div className="task-desc">{t.description || t.title}</div>
                            <div className="task-subrow">
                              <button
                                className="task-project-link"
                                onClick={() => {
                                  // optional: navigate to the project
                                }}
                              >
                                <FaProjectDiagram />
                                {projects.find((p) => String(p.id) === String(t.project_id))
                                  ?.project_name || 'Project'}
                              </button>
                              {t.due_date ? (
                                <div className="task-due">
                                  <FaCalendarAlt />
                                  {formatDate(t.due_date)}
                                  <span className="task-due-mini">(Overdue)</span>
                                </div>
                              ) : null}
                            </div>
                          </div>
                          <div className="task-meta">
                            <span className="task-status-badge">{t.status || '—'}</span>
                            <span className="task-priority-badge">{t.priority || 'Normal'}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {tasksGrouped.dueSoon.length > 0 && (
                  <div className="task-group">
                    <div className="task-group-header">
                      <h3>Due Soon</h3>
                      <span className="task-count-badge">{tasksGrouped.dueSoon.length}</span>
                    </div>
                    <ul className="project-task-list">
                      {tasksGrouped.dueSoon.map((t) => (
                        <li key={t.id} className="task-item due-soon">
                          <div className="task-main">
                            <div className="task-desc">{t.description || t.title}</div>
                            <div className="task-subrow">
                              <button className="task-project-link">
                                <FaProjectDiagram />
                                {projects.find((p) => String(p.id) === String(t.project_id))
                                  ?.project_name || 'Project'}
                              </button>
                              {t.due_date ? (
                                <div className="task-due">
                                  <FaCalendarAlt />
                                  {formatDate(t.due_date)}
                                </div>
                              ) : null}
                            </div>
                          </div>
                          <div className="task-meta">
                            <span className="task-status-badge">{t.status || '—'}</span>
                            <span className="task-priority-badge">{t.priority || 'Normal'}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {tasksGrouped.later.length > 0 && (
                  <div className="task-group">
                    <div className="task-group-header">
                      <h3>Later</h3>
                      <span className="task-count-badge">{tasksGrouped.later.length}</span>
                    </div>
                    <ul className="project-task-list">
                      {tasksGrouped.later.map((t) => (
                        <li key={t.id} className="task-item">
                          <div className="task-main">
                            <div className="task-desc">{t.description || t.title}</div>
                            <div className="task-subrow">
                              <button className="task-project-link">
                                <FaProjectDiagram />
                                {projects.find((p) => String(p.id) === String(t.project_id))
                                  ?.project_name || 'Project'}
                              </button>
                              {t.due_date ? (
                                <div className="task-due">
                                  <FaCalendarAlt />
                                  {formatDate(t.due_date)}
                                </div>
                              ) : null}
                            </div>
                          </div>
                          <div className="task-meta">
                            <span className="task-status-badge">{t.status || '—'}</span>
                            <span className="task-priority-badge">{t.priority || 'Normal'}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </main>

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

      <MetricsModal
        isOpen={showMetricsModal}
        onClose={() => setShowMetricsModal(false)}
        onSave={saveCustomerMetrics}
        initial={metrics}
      />
    </div>
  );
};

export default CustomerDetails;
