// CustomerDetails.js - Fixed version without projects relationship
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import './CustomerDetails.css';
import {
  FaHome, FaUsers, FaEdit
} from 'react-icons/fa';

function CustomerDetails() {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (customerId) {
      fetchCustomerDetails();
    }
  }, [customerId]);

  const fetchCustomerDetails = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();

      if (error) throw error;
      setCustomer(data);
    } catch (error) {
      console.error('Error fetching customer:', error);
      setError('Failed to load customer details');
    } finally {
      setLoading(false);
    }
  };

  const handleEditCustomer = () => {
    console.log('Edit customer:', customerId);
    alert('Edit customer functionality coming soon!');
  };

  const getHealthScoreColor = (score) => {
    if (score >= 8) return '#10b981';
    if (score >= 6) return '#f59e0b';
    return '#ef4444';
  };

  const getComplexityClass = (complexity) => {
    switch (complexity?.toLowerCase()) {
      case 'high': return 'complexity-high';
      case 'medium': return 'complexity-medium';
      case 'low': return 'complexity-low';
      default: return 'complexity-medium';
    }
  };

  const getRelationshipClass = (strength) => {
    switch (strength?.toLowerCase()) {
      case 'strong': return 'relationship-strong';
      case 'medium': return 'relationship-medium';
      case 'weak': return 'relationship-weak';
      default: return 'relationship-medium';
    }
  };

  if (loading) {
    return (
      <div className="page-wrapper">
        <div className="loading-state">Loading customer details...</div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="page-wrapper">
        <div className="error-state">
          <p>{error || 'Customer not found'}</p>
          <button onClick={() => navigate('/')} className="back-btn">
            <FaHome /> Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <div className="page-content">
        {/* Back Button */}
        <button onClick={() => navigate('/')} className="back-btn">
          <FaHome /> Back to Dashboard
        </button>

        {/* Customer Header */}
        <div className="customer-header">
          <h1 className="customer-name">{customer.customer_name}</h1>
          <div className="health-indicator">
            <div 
              className="health-dot"
              style={{ backgroundColor: getHealthScoreColor(customer.health_score) }}
            ></div>
            <span className="health-text">
              Health: {customer.health_score || 'N/A'}/10
            </span>
          </div>
        </div>

        {/* Customer Information Section */}
        <div className="section-card">
          <div className="section-header">
            <h3>
              <FaUsers /> Customer Information
            </h3>
            <button onClick={handleEditCustomer} className="edit-btn">
              <FaEdit /> Edit Customer
            </button>
          </div>

          <div className="customer-info-grid">
            {/* Left Column */}
            <div className="info-column">
              <div className="info-field">
                <label>Account Manager</label>
                <div className="field-value">{customer.account_manager || 'Not assigned'}</div>
              </div>
              <div className="info-field">
                <label>Country</label>
                <div className="field-value">{customer.country || 'Not specified'}</div>
              </div>
              <div className="info-field">
                <label>Industry Vertical</label>
                <div className="field-value">{customer.industry_vertical || 'Not specified'}</div>
              </div>
              <div className="info-field">
                <label>Customer Type</label>
                <div className={`field-value ${customer.customer_type === 'Existing' ? 'existing-customer' : 'new-customer'}`}>
                  {customer.customer_type || 'New'} Customer
                  {customer.customer_type === 'Existing' && customer.year_first_closed && (
                    <span className="year-info"> (since {customer.year_first_closed})</span>
                  )}
                </div>
              </div>
              <div className="info-field">
                <label>Company Size</label>
                <div className="field-value">{customer.company_size || 'Not specified'}</div>
              </div>
              <div className="info-field">
                <label>Annual Revenue</label>
                <div className="field-value">{customer.annual_revenue || 'Not specified'}</div>
              </div>
            </div>

            {/* Right Column */}
            <div className="info-column">
              <div className="info-field">
                <label>Technical Complexity</label>
                <div className={`field-value ${getComplexityClass(customer.technical_complexity)}`}>
                  {customer.technical_complexity || 'Medium'}
                </div>
              </div>
              <div className="info-field">
                <label>Relationship Strength</label>
                <div className={`field-value ${getRelationshipClass(customer.relationship_strength)}`}>
                  {customer.relationship_strength || 'Medium'}
                </div>
              </div>
              <div className="info-field">
                <label>Key Stakeholders</label>
                <div className="stakeholders-list">
                  {customer.key_stakeholders && customer.key_stakeholders.length > 0 ? (
                    customer.key_stakeholders.map((stakeholder, index) => (
                      <div key={index} className="stakeholder-item">
                        • {stakeholder}
                      </div>
                    ))
                  ) : (
                    <div className="no-data">No stakeholders listed</div>
                  )}
                </div>
              </div>
              <div className="info-field">
                <label>Main Competitors</label>
                <div className="competitors-list">
                  {customer.competitors && customer.competitors.length > 0 ? (
                    customer.competitors.map((competitor, index) => (
                      <span key={index} className="competitor-tag">
                        {competitor}
                      </span>
                    ))
                  ) : (
                    <div className="no-data">No competitors listed</div>
                  )}
                </div>
              </div>
              <div className="info-field">
                <label>Notes</label>
                <div className="field-value">
                  {customer.notes || 'No notes available'}
                </div>
              </div>
            </div>
          </div>

          {/* Customer Assessment Summary */}
          <div className="assessment-summary">
            <h4>Customer Assessment</h4>
            <div className="assessment-grid">
              <div className="assessment-item">
                <span className="assessment-label">Complexity</span>
                <div className={`assessment-value ${getComplexityClass(customer.technical_complexity)}`}>
                  {customer.technical_complexity || 'Medium'}
                </div>
              </div>
              <div className="assessment-item">
                <span className="assessment-label">Relationship</span>
                <div className={`assessment-value ${getRelationshipClass(customer.relationship_strength)}`}>
                  {customer.relationship_strength || 'Medium'}
                </div>
              </div>
              <div className="assessment-item">
                <span className="assessment-label">Health Score</span>
                <div className="assessment-value" style={{ color: getHealthScoreColor(customer.health_score) }}>
                  {customer.health_score || 'N/A'}/10
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Future Projects Section - Commented out until relationship is fixed */}
        {/* 
        <div className="section-card">
          <div className="section-header">
            <h3>Projects</h3>
            <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>
              Projects functionality coming soon...
            </div>
          </div>
        </div>
        */}
      </div>
    </div>
  );
}

export default CustomerDetails;
