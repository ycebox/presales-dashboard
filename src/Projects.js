// src/Projects.js
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Trash2,
  User,
  UserPlus,
  Globe,
  Search,
  X,
  Edit3,
  Check,
  AlertTriangle,
  Briefcase
} from 'lucide-react';
import './Projects.css';

/**
 * Modal OUTSIDE Projects() so inputs won't lose focus on re-render.
 */
function Modal({ onClose, children }) {
  return ReactDOM.createPortal(
    <div
      className="modal-overlay"
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className="modal-content">{children}</div>
    </div>,
    document.body
  );
}

function Projects({ embedded = false }) {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [customerStatuses, setCustomerStatuses] = useState([]);
  const [countries, setCountries] = useState([]);
  const [accountManagers, setAccountManagers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    country: '',
    account_manager: '',
    customer_type: '',
    status_id: ''
  });

  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [toast, setToast] = useState(null);

  const [newCustomer, setNewCustomer] = useState({
    customer_name: '',
    account_manager: '',
    country: '',
    customer_type: 'New',
    key_stakeholders: [],
    notes: '',
    status_id: ''
  });

  const [dealsSummary, setDealsSummary] = useState({
    activeCount: 0,
    byStage: {}
  });

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3200);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const statusRes = await supabase
          .from('customer_statuses')
          .select('*')
          .order('id', { ascending: true });

        if (statusRes.error) throw statusRes.error;
        setCustomerStatuses(statusRes.data || []);

        const countriesRes = await supabase
          .from('countries')
          .select('name')
          .order('name', { ascending: true });

        if (countriesRes.error) throw countriesRes.error;
        setCountries((countriesRes.data || []).map((c) => c.name));

        const amRes = await supabase
          .from('account_managers')
          .select('name')
          .order('name', { ascending: true });

        if (amRes.error) throw amRes.error;
        setAccountManagers((amRes.data || []).map((a) => a.name));

        const customersRes = await supabase
          .from('customers')
          .select('*')
          .eq('is_archived', false)
          .order('customer_name', { ascending: true });

        if (customersRes.error) throw customersRes.error;
        setCustomers(customersRes.data || []);
      } catch (err) {
        console.error(err);
        setError('Failed to load customers.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const fetchDealsSummary = async () => {
      try {
        const { data } = await supabase.from('projects').select('id, sales_stage');
        if (!data) return;

        const activeProjects = data.filter((p) => {
          const s = String(p.sales_stage || '').toLowerCase();
          return s && !s.includes('done') && !s.includes('closed');
        });

        const byStage = {};
        activeProjects.forEach((p) => {
          const s = p.sales_stage || 'Unspecified';
          byStage[s] = (byStage[s] || 0) + 1;
        });

        setDealsSummary({
          activeCount: activeProjects.length,
          byStage
        });
      } catch {
        setDealsSummary({ activeCount: 0, byStage: {} });
      }
    };

    fetchDealsSummary();
  }, []);

  const filteredCustomers = useMemo(() => {
    let list = [...customers];

    if (searchTerm.trim()) {
      const t = searchTerm.toLowerCase();
      list = list.filter((c) => {
        const n = String(c.customer_name || '').toLowerCase();
        const a = String(c.account_manager || '').toLowerCase();
        const co = String(c.country || '').toLowerCase();
        return n.includes(t) || a.includes(t) || co.includes(t);
      });
    }

    if (filters.country) {
      list = list.filter((c) => c.country === filters.country);
    }
    if (filters.account_manager) {
      list = list.filter((c) => c.account_manager === filters.account_manager);
    }
    if (filters.customer_type) {
      list = list.filter((c) => c.customer_type === filters.customer_type);
    }
    if (filters.status_id) {
      list = list.filter((c) => String(c.status_id) === String(filters.status_id));
    }

    return list;
  }, [customers, searchTerm, filters]);

  const getCustomerStatus = (customer) => {
    return customerStatuses.find((s) => String(s.id) === String(customer.status_id));
  };

  const openCustomer = (customer) => {
    navigate(`/customer/${customer.id}`);
  };

  const deleteCustomer = async (customer) => {
    if (!window.confirm(`Archive customer "${customer.customer_name}"?`)) return;

    await supabase
      .from('customers')
      .update({ is_archived: true })
      .eq('id', customer.id);

    setCustomers((prev) => prev.filter((c) => c.id !== customer.id));
    showToast('Customer archived');
  };

  return (
    <div className="projects-container">
      {toast && (
        <div className={`toast ${toast.type === 'error' ? 'toast-error' : ''}`}>
          {toast.message}
        </div>
      )}

      <div className="projects-inner">
        <header className="projects-header">
          <h2>Customer Portfolio</h2>
          <button className="action-button primary" onClick={() => setShowCustomerModal(true)}>
            <UserPlus size={12} /> Add Customer
          </button>
        </header>

        <section className="filters-section">
          <div className="search-wrapper">
            <Search size={14} />
            <input
              className="search-input"
              placeholder="Search customers (name, AM, country)…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button className="icon-btn" onClick={() => setSearchTerm('')}>
                <X size={14} />
              </button>
            )}
          </div>
        </section>

        <section className="table-section">
          <div className="table-wrapper">
            <table className="customers-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Country</th>
                  <th>Account Manager</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th className="th-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((c) => {
                  const status = getCustomerStatus(c);
                  return (
                    <tr key={c.id}>
                      <td>
                        <button className="link-btn" onClick={() => openCustomer(c)}>
                          {c.customer_name}
                        </button>
                      </td>
                      <td>{c.country || '—'}</td>
                      <td>{c.account_manager || '—'}</td>
                      <td>{c.customer_type || '—'}</td>
                      <td>{status?.label || 'Not Set'}</td>
                      <td className="cell-actions">
                        <button className="icon-btn">
                          <Edit3 size={14} />
                        </button>
                        <button className="icon-btn danger" onClick={() => deleteCustomer(c)}>
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Projects;
