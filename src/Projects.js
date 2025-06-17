import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import AddProjectForm from './AddProjectForm';
import './Projects.css';

function Projects() {
  const [projects, setProjects] = useState([]);
  const [showAddProject, setShowAddProject] = useState(false);
  const [filter, setFilter] = useState('');

  const fetchProjects = async () => {
    const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching projects:', error);
    } else {
      setProjects(data);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleFilterChange = (e) => {
    setFilter(e.target.value.toLowerCase());
  };

  const filteredProjects = projects.filter((proj) =>
    proj.customer_name?.toLowerCase().includes(filter) ||
    proj.country?.toLowerCase().includes(filter) ||
    proj.account_manager?.toLowerCase().includes(filter)
  );

  return (
    <div className="projects-container">
      <div className="header">
        <h2>Projects</h2>
        <button onClick={() => setShowAddProject(true)}>Add Project</button>
      </div>

      <input
        type="text"
        placeholder="Search by customer, country, or AM"
        onChange={handleFilterChange}
        className="filter-input"
      />

      <table>
        <thead>
          <tr>
            <th>Customer</th>
            <th>Country</th>
            <th>Account Manager</th>
            <th>Sales Stage</th>
            <th>Product</th>
            <th>Deal Value</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredProjects.map((project) => (
            <tr key={project.id}>
              <td>{project.customer_name}</td>
              <td>{project.country}</td>
              <td>{project.account_manager}</td>
              <td>{project.sales_stage}</td>
              <td>{project.product}</td>
              <td>{project.deal_value}</td>
              <td>
                {/* Edit or archive actions go here */}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showAddProject && (
        <AddProjectForm
          onClose={() => setShowAddProject(false)}
          onProjectAdded={fetchProjects}
        />
      )}
    </div>
  );
}

export default Projects;
