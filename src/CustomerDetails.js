// src/CustomerDetails.js

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { supabase } from './supabaseClient';
import './CustomerDetails.css';

import {
  ArrowLeft,
  Building2,
  Calendar,
  Check,
  ChevronDown,
  ClipboardCopy,
  Edit3,
  ExternalLink,
  Globe,
  Plus,
  Save,
  Trash2,
  Users,
  X,
  AlertTriangle,
  FileText,
  Briefcase,
  Target,
  BarChart3,
} from 'lucide-react';

import { useNavigate, useParams } from 'react-router-dom';

const todayISODate = () => new Date().toISOString();
const isValidUUID = (id) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(id || ''));

const safeStr = (v) => (v == null ? '' : String(v));
const safeLower = (v) => safeStr(v).toLowerCase();

const copyToClipboard = async (text) => {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    const el = document.createElement('textarea');
    el.value = text;
    el.setAttribute('readonly', '');
    el.style.position = 'absolute';
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

function Modal({ isOpen, onClose, title, children, footer }) {
  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div
      className="cd-modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="cd-modal">
        <div className="cd-modal-header">
          <div className="cd-modal-title">{title}</div>
          <button className="cd-icon-btn" onClick={onClose} title="Close">
            <X size={16} />
          </button>
        </div>

        <div className="cd-modal-body">{children}</div>

        {footer ? <div className="cd-modal-footer">{footer}</div> : null}
      </div>
    </div>,
    document.body
  );
}

const parseStakeholderEntry = (entry) => {
  const parts = String(entry).split('|');
  return {
    name: (parts[0] || '').trim(),
    role: (parts[1] || '').trim(),
    email: (parts[2] || '').trim(),
    phone: (parts[3] || '').trim(),
  };
};

const buildStakeholderEntry = ({ name, role, email, phone }) => {
  const n = (name || '').trim();
  const r = (role || '').trim();
  const e = (email || '').trim();
  const p = (phone || '').trim();
  return [n, r, e, p].join('|');
};

const CustomerDetails = () => {
  const { id: customerId } = useParams();
  const navigate = useNavigate();

  const isValidCustomerId = useMemo(() => isValidUUID(customerId), [customerId]);

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
  const [showMetricsModal, setShowMetricsModal] = useState(false);

  const [newStakeholder, setNewStakeholder] = useState({ name: '', role: '', email: '', phone: '' });

  const [newTask, setNewTask] = useState({
    description: '',
    status: 'Not Started',
    priority: 'Normal',
    due_date: '',
    notes: '',
    project_id: '',
  });

  const [newProject, setNewProject] = useState({
    project_name: '',
    country: '',
    account_manager: '',
    sales_stage: 'Lead',
    scope: '',
    deal_value: '',
    product: '',
    backup_presales: '',
    remarks: '',
  });

  const [countries, setCountries] = useState([]);
  const [accountManagers, setAccountManagers] = useState([]);

  const [notesDraft, setNotesDraft] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  const [copied, setCopied] = useState(false);

  const fetchStatusOptions = async () => {
    try {
      const { data, error: sErr } = await supabase.from('customer_statuses').select('*').order('id');
      if (sErr) throw sErr;

      const normalized = (data || []).map((s) => ({
        id: s.id,
        status_name: s.label || s.status_name || s.code || `Status ${s.id}`,
        code: s.code || '',
        label: s.label || '',
      }));

      setStatusOptions(normalized);
    } catch (err) {
      console.error('Error loading status options:', err);
    }
  };

  const fetchMasterData = async () => {
    try {
      const [countriesRes, amRes] = await Promise.all([
        supabase.from('countries').select('name').order('name', { ascending: true }),
        supabase.from('account_managers').select('id, name').order('name', { ascending: true }),
      ]);

      if (countriesRes.error) throw countriesRes.error;
      if (amRes.error) throw amRes.error;

      setCountries((countriesRes.data || []).map((x) => x.name));
      setAccountManagers((amRes.data || []).map((x) => x.name));
    } catch (err) {
      console.error('Error loading master data:', err);
    }
  };

  const fetchProjects = async (customerName) => {
    try {
      if (!customerName) {
        setProjects([]);
        return;
      }

      const { data, error: pErr } = await supabase
        .from('projects')
        .select('*')
        .eq('customer_name', customerName)
        .order('created_at', { ascending: false });

      if (pErr) throw pErr;
      setProjects(data || []);
    } catch (err) {
      console.error('Error fetching projects:', err);
      setProjects([]);
    }
  };

  const fetchTasks = async (projectsList) => {
    try {
      const ids = (projectsList || []).map((p) => p.id).filter(Boolean);
      if (!ids.length) {
        setTasks([]);
        return;
      }

      const { data, error: tErr } = await supabase
        .from('project_tasks')
        .select('*')
        .in('project_id', ids)
        .order('due_date', { ascending: true });

      if (tErr) throw tErr;

      setTasks(data || []);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setTasks([]);
    }
  };

  const fetchCustomer = async () => {
    try {
      setLoading(true);
      setError('');

      if (!isValidCustomerId) {
        setCustomer(null);
        setEditCustomer(null);
        setProjects([]);
        setTasks([]);
        setError('Invalid customer ID.');
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
      setNotesDraft(data?.notes || '');

      await fetchProjects(data?.customer_name);
    } catch (err) {
      console.error('Error fetching customer:', err);
      setError(err.message || 'Failed to load customer');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatusOptions();
    fetchMasterData();
    fetchCustomer();
 
  }, [customerId]);

  useEffect(() => {
    fetchTasks(projects);
    
  }, [projects]);

  // Hotkeys
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

  const statusMeta = useMemo(() => {
    const rawId = customer?.status_id;
    const found = statusOptions.find((s) => String(s.id) === String(rawId));
    const label = found?.status_name || found?.label || '';

    const code = safeLower(found?.code || found?.label || found?.status_name);
    let cls = 'pill-neutral';
    if (code.includes('active')) cls = 'pill-active';
    else if (code.includes('risk')) cls = 'pill-risk';
    else if (code.includes('hold')) cls = 'pill-hold';
    else if (code.includes('prospect')) cls = 'pill-prospect';

    return { label, cls };
  }, [customer?.status_id, statusOptions]);

  const snapshot = useMemo(() => {
    const totalDeals = projects.length;
    const activeDeals = projects.filter((p) => {
      const stage = safeLower(p.sales_stage);
      if (!stage) return true;
      if (stage.startsWith('closed')) return false;
      if (stage === 'done') return false;
      if (stage.includes('completed')) return false;
      return true;
    }).length;

    const taskTotal = tasks.length;
    const overdue = tasks.filter((t) => t.due_date && new Date(t.due_date) < new Date() && safeLower(t.status) !== 'completed').length;

    const next7 = tasks.filter((t) => {
      if (!t.due_date) return false;
      const due = new Date(t.due_date);
      const now = new Date();
      const in7 = new Date();
      in7.setDate(in7.getDate() + 7);
      return due >= now && due <= in7 && safeLower(t.status) !== 'completed';
    }).length;

    return {
      activeDeals,
      totalDeals,
      taskTotal,
      overdue,
      next7,
    };
  }, [projects, tasks]);

  const groupedTasks = useMemo(() => {
    const groups = {
      Overdue: [],
      'Due Soon': [],
      'In Progress': [],
      'Not Started': [],
      Completed: [],
      Others: [],
    };

    const now = new Date();
    const in7 = new Date();
    in7.setDate(in7.getDate() + 7);

    (tasks || []).forEach((t) => {
      const st = safeLower(t.status);
      const due = t.due_date ? new Date(t.due_date) : null;

      if (st === 'completed') {
        groups.Completed.push(t);
        return;
      }

      if (due && due < now) {
        groups.Overdue.push(t);
        return;
      }

      if (due && due >= now && due <= in7) {
        groups['Due Soon'].push(t);
        return;
      }

      if (st === 'in progress') groups['In Progress'].push(t);
      else if (st === 'not started') groups['Not Started'].push(t);
      else groups.Others.push(t);
    });

    return groups;
  }, [tasks]);

  const parsedStakeholders = useMemo(() => {
    const list = customer?.key_stakeholders || [];
    return list.map(parseStakeholderEntry).filter((x) => x.name);
  }, [customer?.key_stakeholders]);

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
          notes: editCustomer.notes || null,
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
            'Customer updated, but project links were not updated. Please rename customer in projects if needed.'
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
        notes: editCustomer.notes || null,
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

  const handleArchiveCustomer = async () => {
    try {
      const ok = window.confirm('Archive this customer?');
      if (!ok) return;

      const { error: aErr } = await supabase
        .from('customers')
        .update({ is_archived: true })
        .eq('id', customerId);

      if (aErr) throw aErr;

      alert('Customer archived');
      navigate('/projects');
    } catch (err) {
      console.error('Error archiving customer:', err);
      alert('Failed to archive customer: ' + err.message);
    }
  };

  const handleAddStakeholder = async () => {
    try {
      const name = String(newStakeholder.name || '').trim();
      if (!name) {
        alert('Name is required.');
        return;
      }

      const current = customer?.key_stakeholders || [];
      const entry = buildStakeholderEntry(newStakeholder);
      const updated = [...current, entry];

      const { error: sErr } = await supabase
        .from('customers')
        .update({ key_stakeholders: updated })
        .eq('id', customerId);

      if (sErr) throw sErr;

      setCustomer((prev) => ({ ...prev, key_stakeholders: updated }));
      setNewStakeholder({ name: '', role: '', email: '', phone: '' });
      setShowStakeholdersModal(false);
    } catch (err) {
      console.error('Error adding stakeholder:', err);
      alert('Failed to add stakeholder: ' + err.message);
    }
  };

  const handleRemoveStakeholder = async (indexToRemove) => {
    try {
      const current = customer?.key_stakeholders || [];
      const updated = current.filter((_, i) => i !== indexToRemove);

      const { error: sErr } = await supabase
        .from('customers')
        .update({ key_stakeholders: updated })
        .eq('id', customerId);

      if (sErr) throw sErr;

      setCustomer((prev) => ({ ...prev, key_stakeholders: updated }));
    } catch (err) {
      console.error('Error removing stakeholder:', err);
      alert('Failed to remove stakeholder: ' + err.message);
    }
  };

  const handleAddTask = async () => {
    try {
      if (!newTask.project_id) {
        alert('Please select a project');
        return;
      }

      if (!String(newTask.description || '').trim()) {
        alert('Task description is required.');
        return;
      }

      const payload = {
        project_id: newTask.project_id,
        description: String(newTask.description || '').trim(),
        status: newTask.status || 'Not Started',
        priority: newTask.priority || 'Normal',
        due_date: newTask.due_date || null,
        notes: newTask.notes || null,
      };

      const { error: tErr } = await supabase.from('project_tasks').insert([payload]);
      if (tErr) throw tErr;

      setShowTaskModal(false);
      setNewTask({
        description: '',
        status: 'Not Started',
        priority: 'Normal',
        due_date: '',
        notes: '',
        project_id: '',
      });

      await fetchTasks(projects);
    } catch (err) {
      console.error('Error adding task:', err);
      alert('Failed to add task: ' + err.message);
    }
  };

  const handleCreateProject = async () => {
    try {
      if (!String(newProject.project_name || '').trim()) {
        alert('Project name is required.');
        return;
      }

      const insertPayload = {
        customer_name: customer.customer_name,
        project_name: String(newProject.project_name || '').trim(),
        country: newProject.country || customer.country || null,
        account_manager: newProject.account_manager || customer.account_manager || null,
        sales_stage: newProject.sales_stage || 'Lead',
        scope: newProject.scope || null,
        deal_value: newProject.deal_value ? Number(newProject.deal_value) : null,
        product: newProject.product || null,
        backup_presales: newProject.backup_presales || null,
        remarks: newProject.remarks || null,
        created_at: todayISODate(),
      };

      const { error: pErr } = await supabase.from('projects').insert([insertPayload]);
      if (pErr) throw pErr;

      setShowProjectModal(false);
      setNewProject({
        project_name: '',
        country: '',
        account_manager: '',
        sales_stage: 'Lead',
        scope: '',
        deal_value: '',
        product: '',
        backup_presales: '',
        remarks: '',
      });

      await fetchProjects(customer.customer_name);
    } catch (err) {
      console.error('Error creating project:', err);
      alert('Failed to create project: ' + err.message);
    }
  };

  const handleSaveNotes = async () => {
    try {
      setSavingNotes(true);
      const { error: nErr } = await supabase
        .from('customers')
        .update({ notes: String(notesDraft || '') })
        .eq('id', customerId);

      if (nErr) throw nErr;

      setCustomer((prev) => ({ ...prev, notes: String(notesDraft || '') }));
      setEditCustomer((prev) => ({ ...(prev || {}), notes: String(notesDraft || '') }));
    } catch (err) {
      console.error('Error saving notes:', err);
      alert('Failed to save notes: ' + err.message);
    } finally {
      setSavingNotes(false);
    }
  };

  const handleCopyId = async () => {
    const ok = await copyToClipboard(String(customerId || ''));
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    }
  };

  const goBack = () => navigate(-1);

  const statusLabel = statusMeta.label;
  const statusClass = statusMeta.cls;

  if (loading) {
    return (
      <div className="customer-details-container">
        <div className="loading-state">
          <div className="loading-spinner" />
          <div className="loading-text">Loading customer…</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="customer-details-container">
        <div className="error-state">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="customer-details-container">
        <div className="empty-state">
          <h3>Customer not found</h3>
          <button className="action-button secondary" onClick={() => navigate('/projects')}>
            <ArrowLeft size={14} />
            Back to Customers
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="customer-details-container">
      <div className="customer-details-inner">
        <div className="customer-header">
          <button className="back-button" onClick={goBack}>
            <ArrowLeft size={16} />
            Back
          </button>

          <div className="customer-title">
            <div className="customer-name-row">
              <h1>{customer.customer_name}</h1>
              <button className="copy-id-btn" onClick={handleCopyId} title="Copy customer ID">
                <ClipboardCopy size={14} />
                {copied ? 'Copied' : 'Copy ID'}
              </button>
            </div>

            <div className="customer-subtitle-row">
              <span className="subtitle-chip">
                <Building2 size={14} />
                {customer.customer_type || '—'}
              </span>
              <span className="subtitle-chip">
                <Globe size={14} />
                {customer.country || '—'}
              </span>
              <span className="subtitle-chip">
                <Users size={14} />
                {customer.account_manager || '—'}
              </span>
              <span className="subtitle-chip">
                <Target size={14} />
                <span className={statusClass}>{statusLabel || '—'}</span>
              </span>
            </div>
          </div>

          <div className="customer-header-actions">
            {!isEditing ? (
              <>
                <button className="action-button secondary" onClick={() => setIsEditing(true)}>
                  <Edit3 size={14} />
                  Edit
                </button>
                <button className="action-button danger" onClick={handleArchiveCustomer}>
                  <Trash2 size={14} />
                  Archive
                </button>
              </>
            ) : (
              <>
                <button className="action-button secondary" onClick={() => setIsEditing(false)}>
                  <X size={14} />
                  Cancel
                </button>
                <button className="action-button primary" onClick={handleUpdateCustomer}>
                  <Save size={14} />
                  Save
                </button>
              </>
            )}
          </div>
        </div>

        {/* Snapshot */}
        <div className="snapshot-strip">
          <div className="snapshot-card" onClick={() => setShowMetricsModal(true)} role="button" tabIndex={0}>
            <div className="snapshot-label">
              <Briefcase size={14} />
              Active deals
            </div>
            <div className="snapshot-value">{snapshot.activeDeals}</div>
          </div>

          <div className="snapshot-card" onClick={() => setShowMetricsModal(true)} role="button" tabIndex={0}>
            <div className="snapshot-label">
              <Target size={14} />
              Total deals
            </div>
            <div className="snapshot-value">{snapshot.totalDeals}</div>
          </div>

          <div className="snapshot-card" onClick={() => setShowMetricsModal(true)} role="button" tabIndex={0}>
            <div className="snapshot-label">
              <FileText size={14} />
              Total tasks
            </div>
            <div className="snapshot-value">{snapshot.taskTotal}</div>
          </div>

          <div className="snapshot-card" onClick={() => setShowMetricsModal(true)} role="button" tabIndex={0}>
            <div className="snapshot-label">
              <AlertTriangle size={14} />
              Overdue
            </div>
            <div className="snapshot-value">{snapshot.overdue}</div>
          </div>

          <div className="snapshot-card" onClick={() => setShowMetricsModal(true)} role="button" tabIndex={0}>
            <div className="snapshot-label">
              <Calendar size={14} />
              Due next 7 days
            </div>
            <div className="snapshot-value">{snapshot.next7}</div>
          </div>
        </div>

        <div className="customer-sections">
          {/* Customer Information */}
          <div className="section-card">
            <div className="section-header">
              <div>
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
                  <div className="info-value">{customer.customer_name}</div>
                )}
              </div>

              <div className="info-item">
                <label>Country</label>
                {isEditing ? (
                  <select
                    className="info-input"
                    value={editCustomer.country || ''}
                    onChange={(e) => setEditCustomer((prev) => ({ ...prev, country: e.target.value }))}
                  >
                    <option value="">Select</option>
                    {countries.map((c) => (
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
                    {accountManagers.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="info-value">{customer.account_manager || '—'}</div>
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
                    <option value="New">New</option>
                    <option value="Existing">Existing</option>
                    <option value="Internal Initiative">Internal Initiative</option>
                  </select>
                ) : (
                  <div className="info-value">{customer.customer_type || '—'}</div>
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

              {/* ✅ Notes added in Customer Information (Primary Presales removed) */}
              <div className="info-item" style={{ gridColumn: '1 / -1' }}>
                <label>Notes</label>
                {isEditing ? (
                  <textarea
                    className="info-textarea"
                    value={editCustomer?.notes || ''}
                    onChange={(e) => setEditCustomer((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder="Short customer context, key points, next steps…"
                  />
                ) : (
                  <div className="info-value">{customer?.notes || '—'}</div>
                )}
              </div>
            </div>
          </div>

          {/* Stakeholders */}
          <div className="section-card">
            <div className="section-header">
              <div>
                <h2>Key Stakeholders</h2>
                <p className="section-subtitle">People you should keep close for this account.</p>
              </div>

              <button className="action-button primary" onClick={() => setShowStakeholdersModal(true)}>
                <Plus size={14} />
                Add stakeholder
              </button>
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
                            {s.role ? <span className="stakeholder-pill">{s.role}</span> : null}
                          </div>

                          <div className="stakeholder-meta">
                            {s.email ? (
                              <a className="stakeholder-link" href={`mailto:${s.email}`}>
                                {s.email}
                              </a>
                            ) : null}
                            {s.phone ? <span className="stakeholder-phone">{s.phone}</span> : null}
                          </div>
                        </div>
                      </div>

                      <button
                        className="cd-icon-btn danger"
                        onClick={() => handleRemoveStakeholder(index)}
                        title="Remove stakeholder"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Projects */}
          <div className="section-card">
            <div className="section-header">
              <div>
                <h2>Projects</h2>
                <p className="section-subtitle">Deals and initiatives linked to this customer.</p>
              </div>

              <button className="action-button primary" onClick={() => setShowProjectModal(true)}>
                <Plus size={14} />
                Add project
              </button>
            </div>

            {projects.length === 0 ? (
              <div className="empty-state small">
                <p>No projects yet.</p>
              </div>
            ) : (
              <div className="projects-list">
                {projects.map((p) => (
                  <div key={p.id} className="project-row">
                    <div className="project-main">
                      <div className="project-title">
                        <span className="project-name">{p.project_name || '—'}</span>
                        <span className="project-stage">{p.sales_stage || '—'}</span>
                      </div>
                      <div className="project-meta">
                        <span className="meta-chip">
                          <Globe size={14} />
                          {p.country || '—'}
                        </span>
                        <span className="meta-chip">
                          <Users size={14} />
                          {p.account_manager || '—'}
                        </span>
                        {p.deal_value != null ? (
                          <span className="meta-chip">
                            <BarChart3 size={14} />
                            {Number(p.deal_value).toLocaleString()}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <button
                      className="action-link"
                      onClick={() => navigate(`/project/${p.id}`)}
                      title="Open project"
                    >
                      Open <ExternalLink size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tasks */}
          <div className="section-card">
            <div className="section-header">
              <div>
                <h2>Tasks</h2>
                <p className="section-subtitle">Tasks across all customer projects.</p>
              </div>

              <button className="action-button primary" onClick={() => setShowTaskModal(true)}>
                <Plus size={14} />
                Add task
              </button>
            </div>

            <div className="task-groups">
              {Object.entries(groupedTasks).map(([groupName, list]) => {
                if (!list.length) return null;

                return (
                  <div key={groupName} className="task-group">
                    <div className="task-group-header">
                      <h3>{groupName}</h3>
                      <span className="count-pill">{list.length}</span>
                    </div>

                    <div className="task-list">
                      {list.map((t) => {
                        const proj = projects.find((p) => p.id === t.project_id);
                        return (
                          <div key={t.id} className="task-row">
                            <div className="task-main">
                              <div className="task-title">{t.description || '—'}</div>
                              <div className="task-meta">
                                {proj?.project_name ? (
                                  <span className="meta-chip">
                                    <Briefcase size={14} />
                                    {proj.project_name}
                                  </span>
                                ) : null}
                                {t.due_date ? (
                                  <span className="meta-chip">
                                    <Calendar size={14} />
                                    {new Date(t.due_date).toLocaleDateString()}
                                  </span>
                                ) : null}
                                {t.priority ? <span className="meta-chip">{t.priority}</span> : null}
                              </div>
                            </div>

                            <span className="task-status">{t.status || '—'}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {tasks.length === 0 ? (
                <div className="empty-state small">
                  <p>No tasks found for this customer yet.</p>
                </div>
              ) : null}
            </div>
          </div>

          {/* Notes panel (kept) */}
          <div className="section-card">
            <div className="section-header">
              <div>
                <h2>Notes</h2>
                <p className="section-subtitle">Quick notes, next steps, reminders.</p>
              </div>

              <button className="action-button primary" onClick={handleSaveNotes} disabled={savingNotes}>
                {savingNotes ? (
                  <>
                    <ChevronDown size={14} />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    Save
                  </>
                )}
              </button>
            </div>

            <textarea
              className="notes-textarea"
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              placeholder="Write anything here..."
            />
          </div>
        </div>
      </div>

      {/* Stakeholder Modal */}
      <Modal
        isOpen={showStakeholdersModal}
        onClose={() => setShowStakeholdersModal(false)}
        title="Add Stakeholder"
        footer={
          <>
            <button className="action-button secondary" onClick={() => setShowStakeholdersModal(false)}>
              Cancel
            </button>
            <button className="action-button primary" onClick={handleAddStakeholder}>
              <Plus size={14} />
              Add
            </button>
          </>
        }
      >
        <div className="cd-form-grid">
          <div className="cd-form-field">
            <label>Name *</label>
            <input
              value={newStakeholder.name}
              onChange={(e) => setNewStakeholder((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g., Ana Cruz"
            />
          </div>

          <div className="cd-form-field">
            <label>Role</label>
            <input
              value={newStakeholder.role}
              onChange={(e) => setNewStakeholder((p) => ({ ...p, role: e.target.value }))}
              placeholder="e.g., Head of Cards"
            />
          </div>

          <div className="cd-form-field">
            <label>Email</label>
            <input
              value={newStakeholder.email}
              onChange={(e) => setNewStakeholder((p) => ({ ...p, email: e.target.value }))}
              placeholder="name@company.com"
            />
          </div>

          <div className="cd-form-field">
            <label>Phone</label>
            <input
              value={newStakeholder.phone}
              onChange={(e) => setNewStakeholder((p) => ({ ...p, phone: e.target.value }))}
              placeholder="+63..."
            />
          </div>
        </div>
      </Modal>

      {/* Task Modal */}
      <Modal
        isOpen={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        title="Add Task"
        footer={
          <>
            <button className="action-button secondary" onClick={() => setShowTaskModal(false)}>
              Cancel
            </button>
            <button className="action-button primary" onClick={handleAddTask}>
              <Plus size={14} />
              Add
            </button>
          </>
        }
      >
        <div className="cd-form-grid">
          <div className="cd-form-field" style={{ gridColumn: '1 / -1' }}>
            <label>Description *</label>
            <input
              value={newTask.description}
              onChange={(e) => setNewTask((p) => ({ ...p, description: e.target.value }))}
              placeholder="e.g., Prepare deck for workshop"
            />
          </div>

          <div className="cd-form-field">
            <label>Project *</label>
            <select
              value={newTask.project_id}
              onChange={(e) => setNewTask((p) => ({ ...p, project_id: e.target.value }))}
            >
              <option value="">Select</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.project_name}
                </option>
              ))}
            </select>
          </div>

          <div className="cd-form-field">
            <label>Status</label>
            <select value={newTask.status} onChange={(e) => setNewTask((p) => ({ ...p, status: e.target.value }))}>
              <option value="Not Started">Not Started</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="On Hold">On Hold</option>
            </select>
          </div>

          <div className="cd-form-field">
            <label>Priority</label>
            <select
              value={newTask.priority}
              onChange={(e) => setNewTask((p) => ({ ...p, priority: e.target.value }))}
            >
              <option value="Low">Low</option>
              <option value="Normal">Normal</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>

          <div className="cd-form-field">
            <label>Due date</label>
            <input
              type="date"
              value={newTask.due_date}
              onChange={(e) => setNewTask((p) => ({ ...p, due_date: e.target.value }))}
            />
          </div>

          <div className="cd-form-field" style={{ gridColumn: '1 / -1' }}>
            <label>Notes</label>
            <textarea
              value={newTask.notes}
              onChange={(e) => setNewTask((p) => ({ ...p, notes: e.target.value }))}
              placeholder="Optional..."
            />
          </div>
        </div>
      </Modal>

      {/* Project Modal */}
      <Modal
        isOpen={showProjectModal}
        onClose={() => setShowProjectModal(false)}
        title="Add Project"
        footer={
          <>
            <button className="action-button secondary" onClick={() => setShowProjectModal(false)}>
              Cancel
            </button>
            <button className="action-button primary" onClick={handleCreateProject}>
              <Plus size={14} />
              Create
            </button>
          </>
        }
      >
        <div className="cd-form-grid">
          <div className="cd-form-field" style={{ gridColumn: '1 / -1' }}>
            <label>Project name *</label>
            <input
              value={newProject.project_name}
              onChange={(e) => setNewProject((p) => ({ ...p, project_name: e.target.value }))}
              placeholder="e.g., DCMS RFP"
            />
          </div>

          <div className="cd-form-field">
            <label>Country</label>
            <select
              value={newProject.country}
              onChange={(e) => setNewProject((p) => ({ ...p, country: e.target.value }))}
            >
              <option value="">Select</option>
              {countries.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="cd-form-field">
            <label>Account manager</label>
            <select
              value={newProject.account_manager}
              onChange={(e) => setNewProject((p) => ({ ...p, account_manager: e.target.value }))}
            >
              <option value="">Select</option>
              {accountManagers.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          <div className="cd-form-field">
            <label>Sales stage</label>
            <select
              value={newProject.sales_stage}
              onChange={(e) => setNewProject((p) => ({ ...p, sales_stage: e.target.value }))}
            >
              <option value="Lead">Lead</option>
              <option value="Opportunity">Opportunity</option>
              <option value="Proposal">Proposal</option>
              <option value="Contracting">Contracting</option>
              <option value="Done">Done</option>
            </select>
          </div>

          <div className="cd-form-field">
            <label>Deal value</label>
            <input
              type="number"
              value={newProject.deal_value}
              onChange={(e) => setNewProject((p) => ({ ...p, deal_value: e.target.value }))}
              placeholder="Optional"
            />
          </div>

          <div className="cd-form-field" style={{ gridColumn: '1 / -1' }}>
            <label>Scope</label>
            <textarea
              value={newProject.scope}
              onChange={(e) => setNewProject((p) => ({ ...p, scope: e.target.value }))}
              placeholder="Optional..."
            />
          </div>

          <div className="cd-form-field" style={{ gridColumn: '1 / -1' }}>
            <label>Remarks</label>
            <textarea
              value={newProject.remarks}
              onChange={(e) => setNewProject((p) => ({ ...p, remarks: e.target.value }))}
              placeholder="Optional..."
            />
          </div>
        </div>
      </Modal>

      {/* Metrics Modal */}
      <Modal
        isOpen={showMetricsModal}
        onClose={() => setShowMetricsModal(false)}
        title="Customer Snapshot"
        footer={
          <button className="action-button primary" onClick={() => setShowMetricsModal(false)}>
            Close
          </button>
        }
      >
        <div className="cd-metrics-grid">
          <div className="cd-metric">
            <div className="cd-metric-label">Active deals</div>
            <div className="cd-metric-value">{snapshot.activeDeals}</div>
          </div>
          <div className="cd-metric">
            <div className="cd-metric-label">Total deals</div>
            <div className="cd-metric-value">{snapshot.totalDeals}</div>
          </div>
          <div className="cd-metric">
            <div className="cd-metric-label">Total tasks</div>
            <div className="cd-metric-value">{snapshot.taskTotal}</div>
          </div>
          <div className="cd-metric">
            <div className="cd-metric-label">Overdue tasks</div>
            <div className="cd-metric-value">{snapshot.overdue}</div>
          </div>
          <div className="cd-metric">
            <div className="cd-metric-label">Due next 7 days</div>
            <div className="cd-metric-value">{snapshot.next7}</div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CustomerDetails;
