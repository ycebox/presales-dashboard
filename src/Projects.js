import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Link } from 'react-router-dom';
import { FaFolderOpen, FaPlus, FaTrash } from 'react-icons/fa';
import './Projects.css';

function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    country: '',
    account_manager: '',
    sales_stage: '',
    product: ''
  });
  const [showModal, setShowModal] = useState(false);
  const [newProject, setNewProject] = useState({
    customer_name: '',
    country: '',
    account_manager: '',
    sales_stage: '',
    product: ''
  });

  useEffect(() => {
    fetchProjects();
  }, [filters]);

  const fetchProjects = async () => {
    setLoading(true);
    let query = supabase.from('projects').select('*');
    Object.entries(filters).forEach(([key, value]) => {
      if (value) query = query.eq(key, value);
    });

    const { data, error } = await query.order('customer_name', { ascending: true });
    if (!error) {
      setProjects(data);
    } else {
      console.error('Error fetching projects:', error.message);
    }
    setLoading(false);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleNewProjectChange = (e) => {
    const { name, value } = e.target;
    setNewProject((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddProject = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('projects').insert([newProject]);
    if (!error) {
      setShowModal(false);
      setNewProject({
        customer_name: '',
        country: '',
        account_manager: '',
        sales_stage: '',
        product: ''
      });
      fetchProjects();
    } else {
      console.error('Error adding project:', error.message);
    }
  };

  const handleDeleteProject = async (id) => {
    if (!window.confirm('Are you sure you want to delete this project?')) return;
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (!error) fetchProjects();
    else console.error('Delete error:', error.message);
  };

  const asiaPacificCountries = [
    'Australia', 'New Zealand', 'Fiji', 'Papua New Guinea', 'Samoa', 'Tonga',
    'Singapore', 'Malaysia', 'Indonesia', 'Thailand', 'Philippines', 'Vietnam',
    'Cambodia', 'Laos', 'Myanmar', 'Brunei', 'India', 'Sri Lanka', 'Bangladesh'
  ];

  const products = ['SmartVista', 'Processing', 'O-City', 'Marketplace'];

  const salesStages = [
    'Discovery', 'RFI', 'RFP', 'SoW', 'Demo', 'PoC',
    'Contracting', 'Closed-Won', 'Closed-Lost', 'Closed-Cancelled/Hold'
  ];

  return (
    <section className="projects-wrapper">
      <div className="projects-header-row">
        <h2 className="projects-header">
          <FaFolderOpen style={{ marginRight: '8px' }} /> Presales Projects
        </h2>
        <button className="add-btn" style={{ backgroundColor: '#a6b2d9' }} onClick={() => setShowModal(true)}>
          <FaPlus /> Add Project
        </button>
      </div>

      <div className="filters updated-filters">
        <label>
          Country
          <select name="country" value={filters.country} onChange={handleFilterChange}>
            <option value="">All Countries</option>
            {asiaPacificCountries.map((c, i) => (
              <option key={i} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          Account Manager
          <select name="account_manager" value={filters.account_manager} onChange={handleFilterChange}>
            <option value="">All AMs</option>
            {[...new Set(projects.map(p => p.account_manager))].map((c, i) => (
              <option key={i} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          Sales Stage
          <select name="sales_stage" value={filters.sales_stage} onChange={handleFilterChange}>
            <option value="">All Stages</option>
            {salesStages.map((s, i) => (
              <option key={i} value={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          Product
          <select name="product" value={filters.product} onChange={handleFilterChange}>
            <option value="">All Products</option>
            {products.map((p, i) => (
              <option key={i} value={p}>{p}</option>
            ))}
          </select>
        </label>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="table-scroll-wrapper">
          <div className="table-container">
            <table className="modern-table" style={{ fontSize: '1rem', tableLayout: 'fixed', width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: '20%' }}>Customer</th>
                  <th style={{ width: '20%' }}>Country</th>
                  <th style={{ width: '20%' }}>Account Manager</th>
                  <th style={{ width: '20%' }}>Sales Stage</th>
                  <th style={{ width: '15%' }}>Product</th>
                  <th style={{ width: '5%' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project.id} id={`project-${project.id}`}>
                    <td>
                      <Link to={`/project/${project.id}`} className="project-link">
                        {project.customer_name}
                      </Link>
                    </td>
                    <td>{project.country}</td>
                    <td>{project.account_manager}</td>
                    <td>{project.sales_stage}</td>
                    <td>{project.product}</td>
                    <td>
                      <button className="delete-btn" onClick={() => handleDeleteProject(project.id)}>
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h3>Add New Project</h3>
            <form onSubmit={handleAddProject} className="modern-form">
              <label>
                Customer Name
                <input name="customer_name" value={newProject.customer_name} onChange={handleNewProjectChange} required />
              </label>
              <label>
                Country
                <select name="country" value={newProject.country} onChange={handleNewProjectChange} required>
                  <option value="">Select Country</option>
                  {asiaPacificCountries.map((c, i) => (
                    <option key={i} value={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label>
                Account Manager
                <input name="account_manager" value={newProject.account_manager} onChange={handleNewProjectChange} required />
              </label>
              <label>
                Sales Stage
                <select name="sales_stage" value={newProject.sales_stage} onChange={handleNewProjectChange} required>
                  <option value="">Select Stage</option>
                  {salesStages.map((s, i) => (
                    <option key={i} value={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label>
                Product
                <select name="product" value={newProject.product} onChange={handleNewProjectChange} required>
                  <option value="">Select Product</option>
                  {products.map((p, i) => (
                    <option key={i} value={p}>{p}</option>
                  ))}
                </select>
              </label>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

export default Projects;
