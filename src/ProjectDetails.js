import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import './ProjectDetails.css';
import {
  FaArrowLeft, FaUsers, FaChartLine, FaInfo, FaEdit,
  FaSave, FaTimes, FaDollarSign, FaCalendarAlt
} from 'react-icons/fa';

function ProjectDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editProject, setEditProject] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchProject = async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();
      if (!error) {
        setProject(data);
        setEditProject(data);
      }
    };
    fetchProject();
  }, [id]);

  const handleEditToggle = () => setIsEditing(prev => !prev);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditProject(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    const { data, error } = await supabase
      .from('projects')
      .update(editProject)
      .eq('id', id)
      .select();
    if (!error && data.length > 0) {
      setProject(data[0]);
      setEditProject(data[0]);
      setIsEditing(false);
    } else {
      alert('Error saving project: ' + error?.message);
    }
    setSaving(false);
  };

  if (!project) return <div className="project-details-container">Loading...</div>;

  return (
    <div className="project-details-container">
      {/* Navigation Header */}
      <header className="navigation-header">
        <button onClick={() => navigate('/')} className="nav-button primary">
          <FaArrowLeft /> Back to Dashboard
        </button>
        <h1 className="project-title">{project.project_name}</h1>
      </header>

      {/* Main Content */}
      <div className="main-content-grid">
        <div className="main-column">
          <section className="content-card">
            <div className="card-header">
              <div className="header-title">
                <FaInfo className="header-icon" />
                <h3>Project Details</h3>
              </div>
              <div className="header-actions">
                {isEditing ? (
                  <>
                    <button className="action-button success" onClick={handleSave} disabled={saving}>
                      <FaSave /> {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button className="action-button secondary" onClick={handleEditToggle} disabled={saving}>
                      <FaTimes /> Cancel
                    </button>
                  </>
                ) : (
                  <button className="action-button primary" onClick={handleEditToggle}>
                    <FaEdit /> Edit
                  </button>
                )}
              </div>
            </div>

            <div className="card-content">
              <div className="detail-item">
                <label className="detail-label"><FaUsers /> Customer</label>
                <div className="detail-value">{project.customer_name}</div>
              </div>

              <div className="detail-item">
                <label className="detail-label"><FaChartLine /> Sales Stage</label>
                {isEditing ? (
                  <input className="detail-input" name="sales_stage" value={editProject.sales_stage || ''} onChange={handleChange} />
                ) : (
                  <div className="detail-value">{project.sales_stage}</div>
                )}
              </div>

              <div className="detail-item">
                <label className="detail-label"><FaInfo /> Status</label>
                {isEditing ? (
                  <input className="detail-input" name="status" value={editProject.status || ''} onChange={handleChange} />
                ) : (
                  <div className="detail-value">{project.status || 'Not specified'}</div>
                )}
              </div>

              <div className="detail-item">
                <label className="detail-label"><FaDollarSign /> Deal Value</label>
                {isEditing ? (
                  <input className="detail-input" name="deal_value" value={editProject.deal_value || ''} onChange={handleChange} />
                ) : (
                  <div className="detail-value">{project.deal_value}</div>
                )}
              </div>

              <div className="detail-item">
                <label className="detail-label"><FaCalendarAlt /> Due Date</label>
                {isEditing ? (
                  <input type="date" className="detail-input" name="due_date" value={editProject.due_date || ''} onChange={handleChange} />
                ) : (
                  <div className="detail-value">{project.due_date}</div>
                )}
              </div>

              <div className="detail-item">
                <label className="detail-label"><FaEdit /> Remarks</label>
                {isEditing ? (
                  <textarea className="detail-textarea" name="remarks" value={editProject.remarks || ''} onChange={handleChange} />
                ) : (
                  <div className="detail-value">{project.remarks}</div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default ProjectDetails;
