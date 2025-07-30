import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from './supabaseClient';
import ProjectModal from './ProjectModal';
import { FaPlus, FaEdit } from 'react-icons/fa';
import './CustomerDetails.css';

function CustomerDetails() {
  const { customerId } = useParams();
  const [customer, setCustomer] = useState(null);
  const [projects, setProjects] = useState([]);
  const [showProjectModal, setShowProjectModal] = useState(false);
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

  const handleAddProject = () => {
    setEditingProject(null);
    setShowProjectModal(true);
  };

  const handleEditProject = (project) => {
    setEditingProject(project);
    setShowProjectModal(true);
  };

  const handleProjectSaved = (newProject) => {
    if (editingProject) {
      // Editing existing project
      setProjects((prev) =>
        prev.map((p) => (p.id === newProject.id ? newProject : p))
      );
    } else {
      // Adding new project
      setProjects((prev) => [...prev, newProject]);
    }
    setShowProjectModal(false);
    setEditingProject(null);
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
          <button className="action-button primary" onClick={handleAddProject}>
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
                  onClick={() => handleEditProject(project)}
                >
                  <FaEdit />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {showProjectModal && (
        <ProjectModal
          customerId={customerId}
          existingProject={editingProject}
          onSave={handleProjectSaved}
          onClose={() => {
            setShowProjectModal(false);
            setEditingProject(null);
          }}
        />
      )}
    </div>
  );
}

export default CustomerDetails;
