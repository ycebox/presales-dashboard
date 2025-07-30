import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { FaPlus, FaTrash, FaEdit } from 'react-icons/fa';
import './CustomerDetails.css';

function CustomerDetails() {
  const { customerId } = useParams();
  const [customer, setCustomer] = useState(null);
  const [projects, setProjects] = useState([]);
  const [statusFilter, setStatusFilter] = useState('All');
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [newProject, setNewProject] = useState({
    customer_name: '',
    scope: '',
    sales_stage: '',
    deal_value: ''
  });
  const [editingProject, setEditingProject] = useState(null);

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

    if (error) {
      console.error('Error fetching customer:', error);
    } else {
      setCustomer(data);
    }
  };

  const fetchProjects = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('customer_id', customerId);

    if (error) {
      console.error('Error fetching projects:', error);
    } else {
      setProjects(data);
    }
  };

  const handleOpenProjectModal = (project = null) => {
    if (!customer?.customer_name) {
      alert('Customer information not loaded. Please refresh the page.');
      return;
    }

    if (project) {
      setEditingProject(project);
      setNewProject({
        customer_name: project.customer_name,
        scope: project.scope,
        sales_stage: project.sales_stage,
        deal_value: project.deal_value
      });
    } else {
      setEditingProject(null);
      setNewProject({
        customer_name: customer.customer_name,
        scope: '',
        sales_stage: '',
        deal_value: ''
      });
    }

    setShowProjectModal(true);
  };

  const handleCloseModal = () => {
    setShowProjectModal(false);
    setNewProject({ customer_name: '', scope: '', sales_stage: '', deal_value: '' });
    setEditingProject(null);
  };

  const handleSaveProject = async (e) => {
    e.preventDefault();

    const projectData = {
      ...newProject,
      customer_id: customerId
    };

    try {
      let result;
      if (editingProject) {
        result = await supabase
          .from('projects')
          .update(projectData)
          .eq('id', editingProject.id)
          .select()
          .single();
      } else {
        result = await supabase
          .from('projects')
          .insert(projectData)
          .select()
          .single();
      }

      if (result.error) throw result.error;

      const savedProject = result.data;

      if (editingProject) {
        setProjects((prev) =>
          prev.map((p) => (p.id === savedProject.id ? savedProject : p))
        );
      } else {
        setProjects((prev) => [...prev, savedProject]);
      }

      handleCloseModal();
    } catch (error) {
      console.error('Error saving project:', error.message);
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (!window.confirm('Are you sure you want to delete this project?')) return;

    const { error } = await supabase.from('projects').delete().eq('id', projectId);

    if (error) {
      console.error('Error deleting project:', error);
    } else {
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
    }
  };

  const filteredProjects =
    statusFilter === 'All'
      ? projects
      : projects.filter((p) => p.sales_stage === statusFilter);

  return (
    <div className="customer-details-container">
      <header className="customer-header">
        <h1 className="section-title">{customer?.name || 'Customer'}</h1>
        <p className="customer-country">{customer?.country || ''}</p>
      </header>

      <section className="projects-section">
        <div className="section-header">
          <h2 className="section-title">Project Portfolio</h2>
          <div className="project-actions-inline">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="status-filter"
            >
              <option value="All">All Stages</option>
              <option value="Lead">Lead</option>
              <option value="Opportunity">Opportunity</option>
              <option value="Proposal">Proposal</option>
              <option value="Contracting">Contracting</option>
              <option value="Done">Done</option>
            </select>
            <button className="action-button primary" onClick={() => handleOpenProjectModal()}>
              <FaPlus /> Add Project
            </button>
          </div>
        </div>

        <div className="projects-list">
          {filteredProjects.map((project) => (
            <div key={project.id} className="project-card">
              <div className="project-info">
                <h3>{project.scope}</h3>
                <p>Sales Stage: {project.sales_stage}</p>
                <p>Deal Value: {project.deal_value}</p>
              </div>
              <div className="project-actions">
                <button
                  className="project-action-btn edit"
                  onClick={() => handleOpenProjectModal(project)}
                  title="Edit project"
                >
                  <FaEdit />
                </button>
                <button
                  className="project-action-btn delete"
                  onClick={() => handleDeleteProject(project.id)}
                  title="Delete project"
                >
                  <FaTrash />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {showProjectModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <form onSubmit={handleSaveProject}>
              <div className="modal-header">
                <h3>{editingProject ? 'Edit Project' : 'Add Project'}</h3>
                <button className="icon-button" type="button" onClick={handleCloseModal}>
                  <FaTimes />
                </button>
              </div>
              <div className="modal-body">
                <label>
                  Scope:
                  <input
                    type="text"
                    name="scope"
                    value={newProject.scope}
                    onChange={(e) =>
                      setNewProject((prev) => ({ ...prev, scope: e.target.value }))
                    }
                    required
                  />
                </label>
                <label>
                  Sales Stage:
                  <input
                    type="text"
                    name="sales_stage"
                    value={newProject.sales_stage}
                    onChange={(e) =>
                      setNewProject((prev) => ({ ...prev, sales_stage: e.target.value }))
                    }
                    required
                  />
                </label>
                <label>
                  Deal Value:
                  <input
                    type="text"
                    name="deal_value"
                    value={newProject.deal_value}
                    onChange={(e) =>
                      setNewProject((prev) => ({ ...prev, deal_value: e.target.value }))
                    }
                    required
                  />
                </label>
              </div>
              <div className="modal-footer">
                <button type="submit" className="action-button primary">
                  Save
                </button>
                <button type="button" className="action-button" onClick={handleCloseModal}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomerDetails;
