import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Link } from 'react-router-dom';
import './Projects.css';

function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('customer_name', { ascending: true });
    if (error) {
      console.error('Error fetching projects:', error.message);
    } else {
      setProjects(data);
    }
    setLoading(false);
  };

  return (
    <div>
      <h2>Presales Projects</h2>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <table className="projects-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Country</th>
              <th>Account Manager</th>
              <th>Sales Stage</th>
              <th>Product</th>
              <th>Deal Value</th>
              <th>Scope</th>
              <th>Backup Presales</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr key={project.id}>
                <td>
                  <Link to={`/project/${project.id}`}>
                    {project.customer_name}
                  </Link>
                </td>
                <td>{project.country}</td>
                <td>{project.account_manager}</td>
                <td>{project.sales_stage}</td>
                <td>{project.product}</td>
                <td>{project.deal_value}</td>
                <td>{project.scope}</td>
                <td>{project.backup_presales}</td>
                <td>{project.remarks}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default Projects;
