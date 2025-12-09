// src/CustomerDetails.js
import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import {
  FaProjectDiagram,
  FaEdit,
  FaSave,
  FaTimes,
  FaUserTie,
} from 'react-icons/fa';
import './CustomerDetails.css';

function CustomerDetails() {
  const { customerId } = useParams();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState(null);
  const [editCustomer, setEditCustomer] = useState(null);
  const [isEditingCustomerInfo, setIsEditingCustomerInfo] = useState(false);

  const [statusOptions, setStatusOptions] = useState([]);
  const [accountManagers, setAccountManagers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // ---------- LOAD CUSTOMER + LOOKUPS ----------
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [custRes, statusRes, amRes] = await Promise.all([
          supabase
            .from('customers')
            .select('*')
            .eq('id', customerId)
            .single(),
          supabase.from('customer_statuses').select('*'),
          supabase.from('account_managers').select('*'),
        ]);

        if (custRes.error) throw custRes.error;
        setCustomer(custRes.data || null);
        setEditCustomer(custRes.data || null);

        if (!statusRes.error && statusRes.data) {
          setStatusOptions(statusRes.data);
        }

        if (!amRes.error && amRes.data) {
          setAccountManagers(amRes.data);
        }
      } catch (err) {
        console.error('Error loading customer details:', err);
        setError('Failed to load customer details.');
      } finally {
        setLoading(false);
      }
    };

    if (customerId) loadData();
  }, [customerId]);

  // ---------- HELPERS ----------
  const getStatusFromId = (statusId) => {
    if (!statusId || !statusOptions || statusOptions.length === 0) return null;
    return (
      statusOptions.find((s) => String(s.id) === String(statusId)) || null
    );
  };

  const getStatusBadgeClass = (codeOrLabel) => {
    if (!codeOrLabel) return 'status-badge status-unknown';

    const val = String(codeOrLabel).toLowerCase();

    if (val.includes('active')) return 'status-badge status-active';
    if (val.includes('prospect')) return 'status-badge status-prospect';
    if (val.includes('hold')) return 'status-badge status-onhold';
    if (val.includes('dormant')) return 'status-badge status-dormant';
    if (val.includes('inactive') || val.includes('lost')) {
      return 'status-badge status-inactive';
    }
    return 'status-badge status-unknown';
  };

  const formatFieldLabel = (key) => {
    // human-friendly labels for known fields, fall back to key
    const map = {
      customer_name: 'Customer name',
      account_manager: 'Account manager',
      primary_presales: 'Primary presales',
      country: 'Country / location',
      customer_type: 'Customer type',
      status_id: 'Status',
      company_size: 'Company size',
      priority: 'Priority',
      segment: 'Segment',
      year_first_closed: 'Year of first closed deal',
      notes: 'Notes',
      created_at: 'Created at',
      updated_at: 'Updated at',
    };
    return map[key] || key.replace(/_/g, ' ');
  };

  const isSystemField = (key) => {
    // fields we usually don't render in the simple grid
    return key === 'id';
  };

  // Build a list of fields to show, starting from actual keys present
  const customerFields = useMemo(() => {
    if (!customer) return [];

    const keys = Object.keys(customer);

    // Always keep a nice order for common fields
    const preferredOrder = [
      'customer_name',
      'account_manager',
      'primary_presales',
      'country',
      'customer_type',
      'status_id',
      'company_size',
      'segment',
      'priority',
      'year_first_closed',
      'notes',
    ];

    const ordered = [];

    preferredOrder.forEach((k) => {
      if (keys.includes(k) && !isSystemField(k)) {
        ordered.push(k);
      }
    });

    // Add any remaining keys (excluding system ones) at the end
    keys.forEach((k) => {
      if (!isSystemField(k) && !ordered.includes(k)) {
        ordered.push(k);
      }
    });

    return ordered;
  }, [customer]);

  const handleEditCustomerInfo = () => {
    if (!customer) return;
    setEditCustomer({ ...customer });
    setIsEditingCustomerInfo(true);
  };

  const handleCancelEditCustomerInfo = () => {
    setEditCustomer(customer);
    setIsEditingCustomerInfo(false);
  };

  const handleCustomerInfoChange = (e) => {
    const { name, value } = e.target;
    setEditCustomer((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSaveCustomer = async () => {
    if (!editCustomer || !customer) return;

    setSaving(true);
    setError(null);

    try {
      const payload = { ...editCustomer };

      // Never send id back in update payload
      delete payload.id;

      const { data, error: updateError } = await supabase
        .from('customers')
        .update(payload)
        .eq('id', customer.id)
        .select('*')
        .single();

      if (updateError) {
        console.error('Error updating customer:', updateError);
        setError('Failed to save customer information.');
      } else {
        setCustomer(data);
        setEditCustomer(data);
        setIsEditingCustomerInfo(false);
      }
    } catch (err) {
      console.error('Unexpected error updating customer:', err);
      setError('Unexpected error while saving customer.');
    } finally {
      setSaving(false);
    }
  };

  const renderFieldValue = (key, value) => {
    if (key === 'status_id') {
      const statusObj = getStatusFromId(value);
      const label = statusObj?.label || 'Not set';
      const cls = getStatusBadgeClass(statusObj?.code || label);
      return (
        <span className={cls}>
          <span className="status-dot-pill" />
          {label}
        </span>
      );
    }

    if (key === 'notes') {
      return (
        <p className="info-value-multiline">
          {value && String(value).trim().length > 0
            ? value
            : 'No notes added yet'}
        </p>
      );
    }

    if (key === 'year_first_closed') {
      return (
        <p className="info-value">
          {value ? `First closed deal in ${value}` : 'First deal year not set'}
        </p>
      );
    }

    if (key === 'created_at' || key === 'updated_at') {
      if (!value) return <p className="info-value">Not set</p>;
      const d = new Date(value);
      return (
        <p className="info-value">
          {d.toLocaleString('en-SG', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      );
    }

    return (
      <p className="info-value">
        {value && String(value).trim().length > 0 ? String(value) : 'Not set'}
      </p>
    );
  };

  const renderFieldEditor = (key, value) => {
    if (key === 'status_id') {
      return (
        <select
          name="status_id"
          value={value || ''}
          onChange={handleCustomerInfoChange}
          className="info-input"
        >
          <option value="">Select status</option>
          {statusOptions.map((status) => (
            <option key={status.id} value={status.id}>
              {status.label || status.code || status.name || status.id}
            </option>
          ))}
        </select>
      );
    }

    if (key === 'account_manager') {
      return (
        <select
          name="account_manager"
          value={value || ''}
          onChange={handleCustomerInfoChange}
          className="info-input"
        >
          <option value="">Select account manager</option>
          {accountManagers.map((am) => {
            const label =
              am.name || am.full_name || am.display_name || am.email || 'AM';
            return (
              <option key={am.id} value={label}>
                {label}
              </option>
            );
          })}
        </select>
      );
    }

    if (key === 'customer_type') {
      return (
        <select
          name="customer_type"
          value={value || ''}
          onChange={handleCustomerInfoChange}
          className="info-input"
        >
          <option value="">Select type</option>
          <option value="Existing">Existing</option>
          <option value="New">New</option>
          <option value="Internal Initiative">Internal Initiative</option>
        </select>
      );
    }

    if (key === 'company_size') {
      const sizes = [
        'Small',
        'Medium',
        'Large',
        'Tier 1',
        'Tier 2',
        'Tier 3',
      ];
      return (
        <select
          name="company_size"
          value={value || ''}
          onChange={handleCustomerInfoChange}
          className="info-input"
        >
          <option value="">Select company size</option>
          {sizes.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      );
    }

    if (key === 'year_first_closed') {
      return (
        <input
          type="number"
          name="year_first_closed"
          value={value || ''}
          onChange={handleCustomerInfoChange}
          className="info-input"
          placeholder="e.g. 2021"
        />
      );
    }

    if (key === 'notes') {
      return (
        <textarea
          name="notes"
          value={value || ''}
          onChange={handleCustomerInfoChange}
          className="info-textarea"
          placeholder="Key context, history, or important notes about this customer."
        />
      );
    }

    if (key === 'created_at' || key === 'updated_at') {
      // usually not editable
      return (
        <input
          type="text"
          value={value || ''}
          disabled
          className="info-input readonly"
        />
      );
    }

    return (
      <input
        type="text"
        name={key}
        value={value || ''}
        onChange={handleCustomerInfoChange}
        className="info-input"
      />
    );
  };

  // ---------- RENDER ----------
  if (loading) {
    return (
      <div className="page-wrapper">
        <div className="page-content">
          <div className="presales-loading">
            <div className="presales-spinner" />
            <p>Loading customer details…</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="page-wrapper">
        <div className="page-content">
          <div className="presales-error">
            <p>{error || 'Customer not found.'}</p>
          </div>
        </div>
      </div>
    );
  }

  const currentStatus = getStatusFromId(customer.status_id);
  const currentStatusClass = getStatusBadgeClass(
    currentStatus?.code || currentStatus?.label
  );

  return (
    <div className="page-wrapper">
      <div className="page-content customer-details-page">
        {/* HEADER */}
        <div className="customer-header">
          <div className="customer-header-main">
            <h1>{customer.customer_name || 'Customer Details'}</h1>
            <p className="customer-subtitle">
              {customer.country || 'No country set'} •{' '}
              {customer.customer_type || 'No type set'}
            </p>
          </div>

          <div className="customer-header-actions">
            <button
              className="btn btn-secondary"
              onClick={() => navigate('/projects')}
            >
              <FaProjectDiagram /> View all projects
            </button>
          </div>
        </div>

        {/* GRID LAYOUT */}
        <div className="main-content">
          {/* LEFT COLUMN */}
          <div className="left-column">
            {/* CUSTOMER INFO CARD */}
            <section className="section-card">
              <div className="section-header">
                <h3>Customer Information</h3>
                <div className="section-actions">
                  {isEditingCustomerInfo ? (
                    <>
                      <button
                        className="btn btn-primary"
                        onClick={handleSaveCustomer}
                        disabled={saving}
                      >
                        <FaSave /> {saving ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={handleCancelEditCustomerInfo}
                        disabled={saving}
                      >
                        <FaTimes /> Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      className="btn btn-secondary"
                      onClick={handleEditCustomerInfo}
                    >
                      <FaEdit /> Edit
                    </button>
                  )}
                </div>
              </div>

              <div className="customer-overview-row">
                <div className="customer-avatar-lg">
                  <span>
                    {(customer.customer_name || 'C')
                      .charAt(0)
                      .toUpperCase()}
                  </span>
                </div>
                <div>
                  <div className="customer-name-row">
                    <h2>{customer.customer_name || 'Customer name not set'}</h2>
                  </div>
                  <div className="customer-meta-row">
                    <span className="customer-meta-pill">
                      <FaUserTie size={12} />
                      {customer.account_manager || 'No AM set'}
                    </span>
                    {currentStatus && !isEditingCustomerInfo && (
                      <span className={currentStatusClass}>
                        <span className="status-dot-pill" />
                        {currentStatus.label || currentStatus.code}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="customer-info-grid">
                {customerFields.map((key) => (
                  <div key={key} className="info-item">
                    <p className="info-label">{formatFieldLabel(key)}</p>
                    {isEditingCustomerInfo
                      ? renderFieldEditor(key, editCustomer?.[key])
                      : renderFieldValue(key, customer[key])}
                  </div>
                ))}
              </div>

              {error && (
                <p className="inline-error">
                  {error}
                </p>
              )}
            </section>

            {/* You can add back other sections here later:
                - Stakeholders
                - Project portfolio
                - etc.
             */}
          </div>

          {/* RIGHT COLUMN (placeholder for now) */}
          <div className="right-column">
            <section className="section-card">
              <div className="section-header">
                <h3>Customer summary</h3>
              </div>
              <div className="section-content">
                <p className="info-value-multiline">
                  This area can be used for customer-specific metrics like:
                </p>
                <ul className="small-list">
                  <li>Number of projects with this customer</li>
                  <li>Current pipeline value for this customer</li>
                  <li>Recent tasks or activities</li>
                </ul>
                <p className="info-value-multiline">
                  We can wire this later once you confirm what you want to see
                  here.
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CustomerDetails;
