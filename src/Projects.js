import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Link } from 'react-router-dom';
import { FaFolderOpen, FaPlus } from 'react-icons/fa';
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
    product: '',
    scope: '',
    backup_presales: '',
    remarks: ''
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
        product: '',
        scope: '',
        backup_presales: '',
        remarks: ''
      });
      fetchProjects();
    }
  };

  return (
    <section className="projects-wrapper">
      <div className="projects-header-row">
        <h2 className="projects-header"><FaFolderOpen style={{ marginRight: '8px' }} /> Presales Projects</h2>
        <button className="add-btn" onClick={() => setShowModal(true)}><FaPlus /> Add Project</button>
      </div>

      <div className="filters">
        <select name="country" value={filters.country} onChange={handleFilterChange}>
          <option value="">All Countries</option>
          {[...new Set(projects.map(p => p.country))].map((c, i) => <option key={i} value={c}>{c}</option>)}
        </select>
        <select name="account_manager" value={filters.account_manager} onChange={handleFilterChange}>
          <option value="">All AMs</option>
          {[...new Set(projects.map(p => p.account_manager))].map((c, i) => <option key={i} value={c}>{c}</option>)}
        </select>
        <select name="sales_stage" value={filters.sales_stage} onChange={handleFilterChange}>
          <option value="">All Stages</option>
          {[...new Set(projects.map(p => p.sales_stage))].map((c, i) => <option key={i} value={c}>{c}</option>)}
        </select>
        <select name="product" value={filters.product} onChange={handleFilterChange}>
          <option value="">All Products</option>
          {[...new Set(projects.map(p => p.product))].map((c, i) => <option key={i} value={c}>{c}</option>)}
        </select>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="table-container">
          <table className="modern-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Country</th>
                <th>Account Manager</th>
                <th>Sales Stage</th>
                <th>Product</th>
                <th>Scope</th>
                <th>Backup</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id}>
                  <td>
                    <Link to={`/project/${project.id}`} className="project-link">
                      {project.customer_name}
                    </Link>
                  </td>
                  <td>{project.country}</td>
                  <td>{project.account_manager}</td>
                  <td>{project.sales_stage}</td>
                  <td>{project.product}</td>
                  <td>{project.scope}</td>
                  <td>{project.backup_presales}</td>
                  <td>{project.remarks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h3>Add New Project</h3>
            <form onSubmit={handleAddProject}>
              {Object.entries(newProject).map(([key, value]) => (
                <label key={key}>
                  {key.replace(/_/g, ' ')}
                  <input name={key} value={value} onChange={handleNewProjectChange} />
                </label>
              ))}
              <button type="submit">Save</button>
              <button type="button" onClick={() => setShowModal(false)}>Cancel</button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

export default Projects;
