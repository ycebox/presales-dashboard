// src/CustomerDetails.js

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { supabase } from './supabaseClient';
import './CustomerDetails.css';

import {
  Calendar,
  ClipboardCopy,
  Edit3,
  Mail,
  Phone,
  Plus,
  Save,
  Trash2,
  X,
  AlertTriangle,
  BarChart3,
} from 'lucide-react';

import { useNavigate, useParams } from 'react-router-dom';

const todayISODate = () => new Date().toISOString();
const isValidUUID = (id) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(id || '')
  );

const safeStr = (v) => (v == null ? '' : String(v));

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

// Stakeholder encoding format:
// NEW: name | role | email | phone
// Backward compatible with OLD: name | role | contact
const looksLikeEmail = (v) => {
  const s = String(v || '').trim();
  return !!s && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
};

const parseStakeholderEntry = (entry) => {
  if (!entry) return { name: '', role: '', email: '', phone: '' };

  const parts = String(entry)
    .split('|')
    .map((p) => (p ?? '').trim());

  if (parts.length === 3) {
    const contact = parts[2] || '';
    return {
      name: parts[0] || '',
      role: parts[1] || '',
      email: looksLikeEmail(contact) ? contact : '',
      phone: looksLikeEmail(contact) ? '' : contact,
    };
  }

  return {
    name: parts[0] || '',
    role: parts[1] || '',
    email: parts[2] || '',
    phone: parts[3] || '',
  };
};

const encodeStakeholderEntry = ({ name, role, email, phone }) => {
  return `${String(name || '').trim()} | ${String(role || '').trim()} | ${String(
    email || ''
  ).trim()} | ${String(phone || '').trim()}`.trim();
};

const customerTypes = ['New', 'Existing', 'Internal Initiative'];

// Status logic (same idea as Projects.js)
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

const toIntOrNull = (v) => {
  const s = String(v ?? '').trim();
  if (!s) return null;
  const n = Number(s);
  if (Number.isNaN(n)) return null;
  return Math.trunc(n);
};

const CustomerDetails = () => {
  const { id, customerId } = useParams();
  const navigate = useNavigate();

  const resolvedCustomerId = id || customerId;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [customer, setCustomer] = useState(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editCustomer, setEditCustomer] = useState(null);

  const [statusOptions, setStatusOptions] = useState([]);
  const [countryOptions, setCountryOptions] = useState([]);
  const [accountManagerOptions, setAccountManagerOptions] = useState([]);

  const [projects, setProjects] = useState([]);

  const [showStakeholdersModal, setShowStakeholdersModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showMetricsModal, setShowMetricsModal] = useState(false);

  const [showCompletedProjects, setShowCompletedProjects] = useState(false);
  const [projectSort, setProjectSort] = useState('stage');

  const [metrics, setMetrics] = useState(null);
  const [metricsLoading, setMetricsLoading] = useState(false);

  // ✅ separate drafts:
  // - notesDraft -> customers.notes (My Notes)
  // - companyProfileDraft -> customers.company_profile (Company Profile)
  const [notesDraft, setNotesDraft] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  const [metricsDraft, setMetricsDraft] = useState({
    atms: '',
    debit_cards: '',
    credit_cards: '',
    pos_terminals: '',
    merchants: '',
    tx_per_day: '',
  });
  const [savingMetrics, setSavingMetrics] = useState(false);

  const [deletingProjectId, setDeletingProjectId] = useState(null);

  const isValidCustomerId = useMemo(() => isValidUUID(resolvedCustomerId), [resolvedCustomerId]);

  const goToProjectDetails = (projectId) => {
    if (!projectId) return;
    navigate(`/project/${projectId}`);
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

  const formatCurrency = (amount) => {
    const n = Number(amount);
    if (amount == null || amount === '' || Number.isNaN(n)) return '$0';
    return n.toLocaleString(undefined, {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    });
  };

  const formatNumber = (value) => {
    const n = Number(value);
    if (value === null || value === undefined || value === '' || Number.isNaN(n)) return '—';
    return n.toLocaleString();
  };

  const formatCompact = (value) => {
    const n = Number(value);
    if (value === null || value === undefined || value === '' || Number.isNaN(n)) return '—';
    return n.toLocaleString(undefined, { notation: 'compact', maximumFractionDigits: 1 });
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

  const syncMetricsDraftFromRecord = useCallback((rec) => {
    setMetricsDraft({
      atms: rec?.atms ?? '',
      debit_cards: rec?.debit_cards ?? '',
      credit_cards: rec?.credit_cards ?? '',
      pos_terminals: rec?.pos_terminals ?? '',
      merchants: rec?.merchants ?? '',
      tx_per_day: rec?.tx_per_day ?? '',
    });
  }, []);

  const fetchCustomer = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      if (!isValidCustomerId) {
        setCustomer(null);
        setEditCustomer(null);
        setNotesDraft('');
        setError('Invalid or missing customer ID in the URL.');
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', resolvedCustomerId)
        .single();

      if (fetchError) throw fetchError;

      setCustomer(data);
      setEditCustomer(data);

      // ✅ notesDraft uses customers.notes
      setNotesDraft(data?.notes || '');
    } catch (err) {
      console.error('Error fetching customer:', err);
      setError(err.message || 'Failed to load customer');
    } finally {
      setLoading(false);
    }
  }, [isValidCustomerId, resolvedCustomerId]);

  const fetchStatusOptions = useCallback(async () => {
    try {
      const { data, error: sErr } = await supabase
        .from('customer_statuses')
        .select('*')
        .order('id', { ascending: true });

      if (sErr) throw sErr;
      setStatusOptions(data || []);
    } catch (err) {
      console.error('Error fetching status options:', err);
      setStatusOptions([]);
    }
  }, []);

  const fetchCountries = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('countries').select('name').order('name');
      if (error) throw error;
      setCountryOptions((data || []).map((x) => x.name).filter(Boolean));
    } catch (err) {
      console.error('Error fetching countries:', err);
      setCountryOptions([]);
    }
  }, []);

  const fetchAccountManagers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('account_managers')
        .select('id,name')
        .order('name');

      if (error) throw error;
      setAccountManagerOptions(data || []);
    } catch (err) {
      console.error('Error fetching account managers:', err);
      setAccountManagerOptions([]);
    }
  }, []);

  const fetchCustomerMetrics = useCallback(async () => {
    if (!isValidCustomerId) return;
    try {
      setMetricsLoading(true);

      const { data, error: mErr } = await supabase
        .from('customer_metrics')
        .select('*')
        .eq('customer_id', resolvedCustomerId)
        .maybeSingle();

      if (mErr) throw mErr;

      setMetrics(data || null);
      syncMetricsDraftFromRecord(data || null);
    } catch (err) {
      console.error('Error fetching customer metrics:', err);
      setMetrics(null);
      syncMetricsDraftFromRecord(null);
    } finally {
      setMetricsLoading(false);
    }
  }, [isValidCustomerId, resolvedCustomerId, syncMetricsDraftFromRecord]);

  const fetchProjects = useCallback(async (customerName) => {
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
      setProjects([]);
    }
  }, []);

  useEffect(() => {
    fetchCustomer();
    fetchStatusOptions();
    fetchCountries();
    fetchAccountManagers();
    fetchCustomerMetrics();
  }, [fetchCustomer, fetchStatusOptions, fetchCountries, fetchAccountManagers, fetchCustomerMetrics]);

  useEffect(() => {
    if (!customer?.customer_name) return;
    fetchProjects(customer.customer_name);
  }, [customer?.customer_name, fetchProjects]);

  const parsedStakeholders = useMemo(() => {
    if (!customer?.key_stakeholders) return [];
    const list = Array.isArray(customer.key_stakeholders) ? customer.key_stakeholders : [];
    return list
      .map(parseStakeholderEntry)
      .filter((s) => s.name || s.role || s.email || s.phone);
  }, [customer]);

  const dealInsight = useMemo(() => {
    const active = (projects || []).filter((p) => !isProjectCompleted(getProjectStage(p)));

    if (!active.length) {
      return {
        primary: null,
        attention: 'none',
        attentionLabel: '—',
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

    let attention = 'green';
    const rank = getStageRank(getProjectStage(primary));

    if (rank >= 55) attention = 'red';
    else if (rank >= 40) attention = 'amber';
    else attention = 'green';

    const attentionLabel =
      attention === 'red' ? 'High' : attention === 'amber' ? 'Medium' : 'Low';

    let reason = '';
    if (rank >= 55) reason = 'late-stage deal';
    else if (rank >= 40) reason = 'active opportunity';

    return { primary, attention, attentionLabel, reason };
  }, [projects]);

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

  const summary = useMemo(() => {
    const activeProjects = (projects || []).filter((p) => !isProjectCompleted(getProjectStage(p)))
      .length;

    const totalPipeline = (projects || []).reduce((sum, p) => {
      if (!p.deal_value) return sum;
      return sum + Number(p.deal_value);
    }, 0);

    return {
      activeProjects,
      totalPipeline,
    };
  }, [projects]);

  const handleUpdateCustomer = async () => {
    try {
      const newName = safeStr(editCustomer?.customer_name).trim();
      if (!newName) {
        alert('Customer name is required.');
        return;
      }

      const oldName = customer?.customer_name || '';

      const { error: updateError } = await supabase
        .from('customers')
        .update({
          customer_name: newName,
          account_manager: editCustomer?.account_manager || null,
          country: editCustomer?.country || null,
          customer_type: editCustomer?.customer_type || null,
          status_id:
            editCustomer?.status_id === '' || editCustomer?.status_id == null
              ? null
              : Number(editCustomer.status_id),

          // ✅ Company profile now from company_profile column
          company_profile: editCustomer?.company_profile ?? null,
        })
        .eq('id', resolvedCustomerId);

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
        account_manager: editCustomer?.account_manager || null,
        country: editCustomer?.country || null,
        customer_type: editCustomer?.customer_type || null,
        status_id:
          editCustomer?.status_id === '' || editCustomer?.status_id == null
            ? null
            : Number(editCustomer.status_id),

        company_profile: editCustomer?.company_profile ?? null,
      };

      setCustomer(updatedCustomer);
      setEditCustomer(updatedCustomer);
      setIsEditing(false);

      await fetchProjects(newName);

      alert('Customer updated successfully');
    } catch (err) {
      console.error('Error updating customer:', err);
      alert('Failed to update customer: ' + (err.message || 'Unknown error'));
    }
  };

  // ✅ Save "My Notes" -> customers.notes
  const handleSaveNotes = async () => {
    try {
      setSavingNotes(true);

      const nextNotes = safeStr(notesDraft);

      const { error: nErr } = await supabase
        .from('customers')
        .update({ notes: nextNotes })
        .eq('id', resolvedCustomerId);

      if (nErr) throw nErr;

      setCustomer((prev) => ({ ...prev, notes: nextNotes }));
      alert('Notes saved.');
    } catch (err) {
      console.error('Error saving notes:', err);
      alert('Failed to save notes: ' + (err.message || 'Unknown error'));
    } finally {
      setSavingNotes(false);
    }
  };

  // ✅ Save metrics -> customer_metrics (upsert)
  const handleSaveMetrics = async () => {
    try {
      setSavingMetrics(true);

      const payload = {
        customer_id: resolvedCustomerId,
        atms: toIntOrNull(metricsDraft.atms),
        debit_cards: toIntOrNull(metricsDraft.debit_cards),
        credit_cards: toIntOrNull(metricsDraft.credit_cards),
        pos_terminals: toIntOrNull(metricsDraft.pos_terminals),
        merchants: toIntOrNull(metricsDraft.merchants),
        tx_per_day: toIntOrNull(metricsDraft.tx_per_day),
        updated_at: todayISODate(),
      };

      const { error: upErr } = await supabase
        .from('customer_metrics')
        .upsert(payload, { onConflict: 'customer_id' });

      if (upErr) throw upErr;

      await fetchCustomerMetrics();
      alert('Customer snapshot updated.');
      setShowMetricsModal(false);
    } catch (err) {
      console.error('Error saving metrics:', err);
      alert('Failed to save metrics: ' + (err.message || 'Unknown error'));
    } finally {
      setSavingMetrics(false);
    }
  };

  const handleRemoveStakeholder = async (indexToRemove) => {
    try {
      const current = Array.isArray(customer?.key_stakeholders) ? [...customer.key_stakeholders] : [];
      const next = current.filter((_, idx) => idx !== indexToRemove);

      const { error: sErr } = await supabase
        .from('customers')
        .update({ key_stakeholders: next })
        .eq('id', resolvedCustomerId);

      if (sErr) throw sErr;

      setCustomer((prev) => ({ ...prev, key_stakeholders: next }));
    } catch (err) {
      console.error('Error removing stakeholder:', err);
      alert('Failed to remove stakeholder: ' + (err.message || 'Unknown error'));
    }
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

  const handleDeleteProject = async (project) => {
    if (!project?.id) return;

    const name = project.project_name || 'this project';

    const ok = window.confirm(
      `Delete "${name}"?\n\nThis will delete the project record. This cannot be undone.`
    );
    if (!ok) return;

    try {
      setDeletingProjectId(project.id);

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

  // keyboard shortcuts
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
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ----------- Modals (Stakeholders / Project) -----------
  const StakeholdersModal = ({ isOpen, onClose }) => {
    const [rows, setRows] = useState([]);

    useEffect(() => {
      if (!isOpen) return;
      const parsed = Array.isArray(customer?.key_stakeholders)
        ? customer.key_stakeholders.map(parseStakeholderEntry)
        : [];
      setRows(parsed.length ? parsed : [{ name: '', role: '', email: '', phone: '' }]);
    }, [isOpen]);

    if (!isOpen) return null;

    const updateRow = (index, field, value) => {
      setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
    };

    const addRow = () => setRows((prev) => [...prev, { name: '', role: '', email: '', phone: '' }]);
    const removeRow = (index) => setRows((prev) => prev.filter((_, i) => i !== index));

    const handleSave = async () => {
      try {
        const cleaned = rows
          .map((r) => ({
            name: safeStr(r.name).trim(),
            role: safeStr(r.role).trim(),
            email: safeStr(r.email).trim(),
            phone: safeStr(r.phone).trim(),
          }))
          .filter((r) => r.name || r.role || r.email || r.phone)
          .map(encodeStakeholderEntry);

        const { error: sErr } = await supabase
          .from('customers')
          .update({ key_stakeholders: cleaned })
          .eq('id', resolvedCustomerId);

        if (sErr) throw sErr;

        setCustomer((prev) => ({ ...prev, key_stakeholders: cleaned }));
        onClose();
        alert('Stakeholders updated successfully');
      } catch (err) {
        console.error('Error saving stakeholders:', err);
        alert('Failed to update stakeholders: ' + (err.message || 'Unknown error'));
      }
    };

    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Key Stakeholders"
        footer={
          <>
            <button className="action-button ghost" onClick={onClose}>
              Cancel
            </button>
            <button className="action-button primary" onClick={handleSave}>
              <Save size={14} />
              Save
            </button>
          </>
        }
      >
        <div className="cd-form-grid">
          <div className="cd-form-row cd-stakeholder-header">
            <div>Name</div>
            <div>Role</div>
            <div>Email</div>
            <div>Phone</div>
            <div />
          </div>

          {rows.map((r, idx) => (
            <div className="cd-form-row cd-stakeholder-row" key={idx}>
              <input
                className="cd-input"
                value={r.name}
                onChange={(e) => updateRow(idx, 'name', e.target.value)}
                placeholder="Contact name"
              />
              <input
                className="cd-input"
                value={r.role}
                onChange={(e) => updateRow(idx, 'role', e.target.value)}
                placeholder="Role"
              />
              <input
                className="cd-input"
                value={r.email}
                onChange={(e) => updateRow(idx, 'email', e.target.value)}
                placeholder="Email"
              />
              <input
                className="cd-input"
                value={r.phone}
                onChange={(e) => updateRow(idx, 'phone', e.target.value)}
                placeholder="Phone"
              />
              <button className="cd-icon-btn danger" onClick={() => removeRow(idx)} title="Remove row">
                <Trash2 size={14} />
              </button>
            </div>
          ))}

          <button className="action-button" onClick={addRow}>
            <Plus size={14} />
            Add another
          </button>
        </div>
      </Modal>
    );
  };

  const ProjectModal = ({ isOpen, onClose }) => {
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

    const handleSubmit = async () => {
      if (!safeStr(form.project_name).trim()) {
        alert('Project name is required.');
        return;
      }

      try {
        setSaving(true);
        await handleCreateProject({
          project_name: safeStr(form.project_name).trim(),
          scope: safeStr(form.scope).trim() || null,
          sales_stage: form.sales_stage || null,
          deal_value: form.deal_value ? Number(form.deal_value) : null,
          product: safeStr(form.product).trim() || null,
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
        alert('Failed to create project: ' + (err.message || 'Unknown error'));
      }
    };

    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Add Project"
        footer={
          <>
            <button className="action-button ghost" onClick={onClose}>
              Cancel
            </button>
            <button className="action-button primary" onClick={handleSubmit} disabled={saving}>
              <Save size={14} />
              {saving ? 'Saving...' : 'Create'}
            </button>
          </>
        }
      >
        <div className="cd-form-grid">
          <label className="cd-label">Project name *</label>
          <input
            className="cd-input"
            value={form.project_name}
            onChange={(e) => setForm((p) => ({ ...p, project_name: e.target.value }))}
            placeholder="e.g. Debit CMS Replacement"
          />

          <label className="cd-label">Scope</label>
          <textarea
            className="cd-textarea"
            value={form.scope}
            onChange={(e) => setForm((p) => ({ ...p, scope: e.target.value }))}
            placeholder="Short scope notes"
            rows={4}
          />

          <div className="cd-form-cols">
            <div>
              <label className="cd-label">Sales stage</label>
              <select
                className="cd-input"
                value={form.sales_stage}
                onChange={(e) => setForm((p) => ({ ...p, sales_stage: e.target.value }))}
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

            <div>
              <label className="cd-label">Deal value</label>
              <input
                className="cd-input"
                value={form.deal_value}
                onChange={(e) => setForm((p) => ({ ...p, deal_value: e.target.value }))}
                placeholder="e.g. 250000"
              />
            </div>
          </div>

          <label className="cd-label">Product</label>
          <input
            className="cd-input"
            value={form.product}
            onChange={(e) => setForm((p) => ({ ...p, product: e.target.value }))}
            placeholder="e.g. SmartVista CMS"
          />

          <label className="cd-label">Due date</label>
          <input
            className="cd-input"
            type="date"
            value={form.due_date}
            onChange={(e) => setForm((p) => ({ ...p, due_date: e.target.value }))}
          />
        </div>
      </Modal>
    );
  };
  // ------------------------------------------------------------

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
            <AlertTriangle size={20} />
          </div>
          <h2 className="error-title">Could not load customer</h2>
          <p className="error-message">{error || 'Customer not found'}</p>
        </div>
      </div>
    );
  }

  const statusObj = getCustomerStatus(customer, statusOptions);
  const statusLabel = statusObj?.label || statusObj?.status_name || statusObj?.name || 'Not Set';
  const statusClass = getStatusBadgeClass(
    statusObj?.code || statusObj?.label || statusObj?.status_name || statusObj?.name
  );

  const lastUpdatedDisplay = formatDate(customer.updated_at || customer.created_at);

  return (
    <div className="customer-details-container">
      {/* Header */}
      <div className="cd-header">
        <div className="cd-header-main">
          <div className="cd-title">{customer.customer_name || 'Customer'}</div>

          <div className="cd-subtitle">
            <span className="cd-sub-pill">
              <Calendar size={14} /> Updated: {lastUpdatedDisplay || '—'}
            </span>

            {(() => {
              const active = (projects || []).filter((p) => !isProjectCompleted(getProjectStage(p)));
              if (!active.length) return null;

              const sorted = [...active].sort((a, b) => {
                const sr = getStageRank(getProjectStage(b)) - getStageRank(getProjectStage(a));
                if (sr !== 0) return sr;
                const vr = (Number(b.deal_value) || 0) - (Number(a.deal_value) || 0);
                if (vr !== 0) return vr;
                return new Date(b.created_at || 0) - new Date(a.created_at || 0);
              });

              const primary = sorted[0];
              const rank = getStageRank(getProjectStage(primary));
              const attention = rank >= 55 ? 'red' : rank >= 40 ? 'amber' : 'green';
              const attentionLabel = attention === 'red' ? 'High' : attention === 'amber' ? 'Medium' : 'Low';
              const reason = rank >= 55 ? 'late-stage deal' : rank >= 40 ? 'active opportunity' : '';

              return (
                <span className={`cd-attn-pill ${attention}`}>
                  <AlertTriangle size={14} /> Attention: {attentionLabel}
                  {reason ? ` • ${reason}` : ''}
                </span>
              );
            })()}
          </div>
        </div>
      </div>

      <div className="cd-grid">
        {/* Left column */}
        <div className="cd-col">
          {/* Customer Info */}
          <div className="section-card">
            <div className="section-header">
              <div>
                <h2>Customer Information</h2>
                <p className="section-subtitle">Basic details and ownership.</p>
              </div>

              <div className="section-actions">
                {!isEditing ? (
                  <button className="action-button primary" onClick={() => setIsEditing(true)}>
                    <Edit3 size={14} />
                    Edit
                  </button>
                ) : (
                  <>
                    <button
                      className="action-button ghost"
                      onClick={() => {
                        setEditCustomer(customer);
                        setIsEditing(false);
                      }}
                    >
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

            <div className="customer-info-grid">
              <div className="info-item">
                <label>Customer name</label>
                {isEditing ? (
                  <input
                    className="info-input"
                    value={editCustomer?.customer_name || ''}
                    onChange={(e) =>
                      setEditCustomer((prev) => ({ ...prev, customer_name: e.target.value }))
                    }
                  />
                ) : (
                  <div className="info-value">{customer.customer_name || '—'}</div>
                )}
              </div>

              <div className="info-item">
                <label>Customer type</label>
                {isEditing ? (
                  <select
                    className="info-input"
                    value={editCustomer?.customer_type || ''}
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
                    value={editCustomer?.country || ''}
                    onChange={(e) => setEditCustomer((prev) => ({ ...prev, country: e.target.value }))}
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
                    value={editCustomer?.account_manager || ''}
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
                <label>Customer status</label>
                {isEditing ? (
                  <select
                    className="info-input"
                    value={
                      editCustomer?.status_id === null || editCustomer?.status_id === undefined
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
                  <div className="info-value">
                    <span className={`cd-status-pill ${statusClass}`}>{statusLabel}</span>
                  </div>
                )}
              </div>

              {/* ✅ Company Profile now uses company_profile column */}
              <div className="info-item" style={{ gridColumn: '1 / -1' }}>
                <label>Company Profile</label>
                {isEditing ? (
                  <textarea
                    className="info-textarea"
                    value={editCustomer?.company_profile || ''}
                    onChange={(e) =>
                      setEditCustomer((prev) => ({ ...prev, company_profile: e.target.value }))
                    }
                    placeholder="Company background, business, context..."
                    rows={5}
                  />
                ) : (
                  <div className="info-value">{customer?.company_profile || '—'}</div>
                )}
              </div>
            </div>
          </div>

          {/* Key Stakeholders */}
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
                {parsedStakeholders.map((s, index) => (
                  <div key={index} className="stakeholder-simple">
                    <div className="stakeholder-simple-grid">
                      <div className="stake-row">
                        <div className="stake-label">Contact Name</div>
                        <div className="stake-value">{s.name || '—'}</div>
                      </div>

                      {s.role ? (
                        <div className="stake-row">
                          <div className="stake-label">Role</div>
                          <div className="stake-value">{s.role}</div>
                        </div>
                      ) : null}

                      {s.email ? (
                        <div className="stake-row">
                          <div className="stake-label">Email</div>
                          <div className="stake-value">{s.email}</div>
                        </div>
                      ) : null}

                      {s.phone ? (
                        <div className="stake-row">
                          <div className="stake-label">Mobile</div>
                          <div className="stake-value">{s.phone}</div>
                        </div>
                      ) : null}
                    </div>

                    <div className="stakeholder-actions">
                      {s.email ? (
                        <button
                          type="button"
                          className="stakeholder-icon-btn"
                          title="Copy email"
                          onClick={async () => {
                            const ok = await copyToClipboard(s.email);
                            if (ok) alert('Email copied');
                          }}
                        >
                          <Mail size={16} />
                        </button>
                      ) : null}

                      {s.phone ? (
                        <button
                          type="button"
                          className="stakeholder-icon-btn"
                          title="Copy phone"
                          onClick={async () => {
                            const ok = await copyToClipboard(s.phone);
                            if (ok) alert('Phone copied');
                          }}
                        >
                          <Phone size={16} />
                        </button>
                      ) : null}

                      <button
                        className="stakeholder-icon-btn danger"
                        onClick={() => handleRemoveStakeholder(index)}
                        title="Remove stakeholder"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ✅ My Notes -> customers.notes */}
          <div className="section-card">
            <div className="section-header">
              <div>
                <h2>My Notes</h2>
                <p className="section-subtitle">Your working notes about meetings and next steps.</p>
              </div>

              <button
                className="action-button primary"
                onClick={handleSaveNotes}
                disabled={savingNotes}
              >
                <Save size={14} />
                {savingNotes ? 'Saving...' : 'Save'}
              </button>
            </div>

            <textarea
              className="notes-textarea"
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              placeholder="Write notes about the customer, meetings, next steps, risks..."
            />
          </div>
        </div>

        {/* Right column */}
        <div className="cd-col">
          {/* Snapshot */}
          <div className="section-card">
            <div className="section-header">
              <div>
                <h2>Customer Snapshot</h2>
                <p className="section-subtitle">Quick view of pipeline and footprint.</p>
              </div>

              {/* ✅ View -> Edit */}
              <button
                className="action-button"
                onClick={() => {
                  syncMetricsDraftFromRecord(metrics);
                  setShowMetricsModal(true);
                }}
              >
                <Edit3 size={14} />
                Edit
              </button>
            </div>

            <div className="snapshot-grid">
              {[
                { label: 'Total Pipeline', value: formatCurrency(summary.totalPipeline) },
                { label: 'Active Projects', value: String(summary.activeProjects) },
                { label: 'Number of ATMs', value: formatCompact(metrics?.atms) },
                { label: 'Debit Cards', value: formatCompact(metrics?.debit_cards) },
                { label: 'Credit Cards', value: formatCompact(metrics?.credit_cards) },
                { label: 'POS Terminals', value: formatCompact(metrics?.pos_terminals) },
                { label: 'Merchants', value: formatCompact(metrics?.merchants) },
                { label: 'Txn per Day', value: formatCompact(metrics?.tx_per_day) },
              ].map((it) => (
                <div className="snapshot-item" key={it.label}>
                  <div className="snapshot-label">{it.label}</div>
                  <div className="snapshot-value">{it.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Projects */}
          <div className="section-card">
            <div className="section-header">
              <div>
                <h2>Projects / Opportunities</h2>
                <p className="section-subtitle">Deals and initiatives linked to this customer.</p>
              </div>

              <button className="action-button primary" onClick={() => setShowProjectModal(true)}>
                <Plus size={14} />
                Add project
              </button>
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

                  return (
                    <div key={p.id} className="project-item">
                      <div className="project-main">
                        <h3>
                          <button
                            type="button"
                            className="cd-link-btn"
                            onClick={() => goToProjectDetails(p.id)}
                            title="Open project details"
                          >
                            {p.project_name || '(Unnamed Project)'}
                          </button>
                        </h3>

                        {p.scope ? <p className="project-scope">{p.scope}</p> : null}

                        <div className="project-mini-row">
                          {stage ? <span className="project-stage-badge">{stage}</span> : null}
                          {due ? (
                            <span className="project-due-badge">
                              <Calendar size={14} /> {due}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className="project-details">
                        <div className="project-value">
                          <BarChart3 size={14} />
                          {formatCurrency(p.deal_value)}
                        </div>

                        <button
                          className="cd-icon-btn danger"
                          title="Delete project"
                          disabled={deletingProjectId === p.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteProject(p);
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <StakeholdersModal
        isOpen={showStakeholdersModal}
        onClose={() => setShowStakeholdersModal(false)}
      />
      <ProjectModal isOpen={showProjectModal} onClose={() => setShowProjectModal(false)} />

      {/* ✅ Editable Metrics Modal */}
      <Modal
        isOpen={showMetricsModal}
        onClose={() => setShowMetricsModal(false)}
        title="Edit Customer Snapshot"
        footer={
          <>
            <button className="action-button ghost" onClick={() => setShowMetricsModal(false)}>
              Cancel
            </button>
            <button className="action-button" onClick={fetchCustomerMetrics} disabled={metricsLoading}>
              <ClipboardCopy size={14} />
              Refresh
            </button>
            <button className="action-button primary" onClick={handleSaveMetrics} disabled={savingMetrics}>
              <Save size={14} />
              {savingMetrics ? 'Saving...' : 'Save'}
            </button>
          </>
        }
      >
        <div className="cd-metrics-grid">
          <div className="cd-metric">
            <div className="cd-metric-label">Total Pipeline</div>
            <div className="cd-metric-value">
              {projects && projects.length ? formatCurrency(summary.totalPipeline) : '$0'}
            </div>
          </div>
          <div className="cd-metric">
            <div className="cd-metric-label">Active Projects</div>
            <div className="cd-metric-value">{summary.activeProjects}</div>
          </div>

          <div className="cd-metric">
            <div className="cd-metric-label">ATMs</div>
            <input
              className="cd-input"
              value={metricsDraft.atms}
              onChange={(e) => setMetricsDraft((p) => ({ ...p, atms: e.target.value }))}
              placeholder="e.g. 120"
            />
          </div>

          <div className="cd-metric">
            <div className="cd-metric-label">Debit Cards</div>
            <input
              className="cd-input"
              value={metricsDraft.debit_cards}
              onChange={(e) => setMetricsDraft((p) => ({ ...p, debit_cards: e.target.value }))}
              placeholder="e.g. 500000"
            />
          </div>

          <div className="cd-metric">
            <div className="cd-metric-label">Credit Cards</div>
            <input
              className="cd-input"
              value={metricsDraft.credit_cards}
              onChange={(e) => setMetricsDraft((p) => ({ ...p, credit_cards: e.target.value }))}
              placeholder="e.g. 200000"
            />
          </div>

          <div className="cd-metric">
            <div className="cd-metric-label">POS Terminals</div>
            <input
              className="cd-input"
              value={metricsDraft.pos_terminals}
              onChange={(e) => setMetricsDraft((p) => ({ ...p, pos_terminals: e.target.value }))}
              placeholder="e.g. 15000"
            />
          </div>

          <div className="cd-metric">
            <div className="cd-metric-label">Merchants</div>
            <input
              className="cd-input"
              value={metricsDraft.merchants}
              onChange={(e) => setMetricsDraft((p) => ({ ...p, merchants: e.target.value }))}
              placeholder="e.g. 8000"
            />
          </div>

          <div className="cd-metric">
            <div className="cd-metric-label">Txn / Day</div>
            <input
              className="cd-input"
              value={metricsDraft.tx_per_day}
              onChange={(e) => setMetricsDraft((p) => ({ ...p, tx_per_day: e.target.value }))}
              placeholder="e.g. 250000"
            />
          </div>

          <div className="cd-metric">
            <div className="cd-metric-label">Record</div>
            <div className="cd-metric-value">
              {metricsLoading ? 'Loading…' : metrics ? 'Loaded' : 'Not set yet'}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CustomerDetails;
