import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Link } from 'react-router-dom';
import { FaFolderOpen } from 'react-icons/fa';
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
    if (!error) {
      setProjects(data);
    } else {
      console.error('Error fetching projects:', error.message);
    }
    setLoading(false);
  };

  return (
    <section className="projects-wrapper">
      <h2 className="projects-header"><FaFolderOpen style={{ marginRight: '8px' }} /> Presales Projects</h2>
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
    </section>
  );
}

export default Projects;
