import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { FaPlus, FaEdit, FaSave, FaTimes } from 'react-icons/fa';
import './CustomerDetails.css';

function CustomerDetails() {
  const { customerId } = useParams();
  const [customer, setCustomer] = useState(null);
  const [projects, setProjects] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [projectForm, setProjectForm] = useState({
    scope: '',
    sales_stage: '',
    deal_value: ''
  });

  useEffect(() => {
    fetchCustomer();
    fetchProjects();
  }, [customerId]);

  const fetchCustomer = async () => {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single();
    if (error) console.error('Error fetching customer:', error);
    else setCustomer(data);
  };

  const fetchProjects = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('customer_id', customerId);
    if (error) console.error('Error fetching projects:', error);
    else setProjects(data);
  };

  const handleOpenModal = (project = null) => {
    if (project) {
      setEditingProject(project);
      setProjectForm({
        scope: project.scope || '',
        sales_stage: project.sales_stage || '',
        deal_value: project.deal_value || ''
      });
    } else {
      setEditingProject(null);
      setProjectForm({ scope: '', sales_stage: '', deal_value: '' });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingProject(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProjectForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveProject = async () => {
    const payload = {
      ...projectForm,
      customer_id: customerId
    };

    let result;
    if (editingProject) {
      result = await supabase
        .from('projects')
        .update(payload)
        .eq('id', editingProject.id)
        .select()
        .single();
    } else {
      result = await supabase
        .from('projects')
        .insert(payload)
        .select()
        .single();
    }

    if (result.error) {
      console.error('Error saving project:', result.error);
      return;
    }

    const saved = result.data;
    setProjects((prev) => {
      if (editingProject) {
        return prev.map((p) => (p.id === saved.id ? saved : p));
      } else {
        return [...prev, saved];
      }
    });

    handleCloseModal();
  };

  if (!customer) return <div>Loading customer...</div>;

  return (
    <div className="customer-details-container">
      <header className="customer-header">
        <h1 className="section-title">{customer.name}</h1>
        <p className="customer-country">{customer.country}</p>
      </header>

      <section className="projects-section">
        <div className="section-header">
          <h2 className="section-title">Project Portfolio</h2>
          <button className="action-button primary" onClick={() => handleOpenModal()}>
            <FaPlus /> Add Project
          </button>
        </div>

        <div className="projects-list">
          {projects.map((project) => (
            <div key={project.id} className="project-card">
              <div className="project-info">
                <h3>{project.scope}</h3>
                <p>Sales Stage: {project.sales_stage}</p>
                <p>Deal Value: {project.deal_value}</p>
              </div>
              <div className="project-actions">
                <button
                  className="project-action-btn edit"
                  title="Edit Project"
                  onClick={() => handleOpenModal(project)}
                >
                  <FaEdit />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{editingProject ? 'Edit Project' : 'Add Project'}</h3>
              <button className="icon-button" onClick={handleCloseModal}>
                <FaTimes />
              </button>
            </div>
            <div className="modal-body">
              <label>
                Scope:
                <input
                  type="text"
                  name="scope"
                  value={projectForm.scope}
                  onChange={handleInputChange}
                />
              </label>
              <label>
                Sales Stage:
                <input
                  type="text"
                  name="sales_stage"
                  value={projectForm.sales_stage}
                  onChange={handleInputChange}
                />
              </label>
              <label>
                Deal Value:
                <input
                  type="text"
                  name="deal_value"
                  value={projectForm.deal_value}
                  onChange={handleInputChange}
                />
              </label>
            </div>
            <div className="modal-footer">
              <button className="action-button primary" onClick={handleSaveProject}>
                <FaSave /> Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomerDetails;
