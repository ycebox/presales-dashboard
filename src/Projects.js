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
    if (error) {
      console.error('Error fetching projects:', error.message);
    } else {
      setProjects(data);
    }
    setLoading(false);
  };

  return (
    <div className="projects-container">
      <h2 className="projects-title"><FaFolderOpen style={{ marginRight: '8px' }} /> Presales Projects</h2>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="projects-grid">
          {projects.map((project) => (
            <Link to={`/project/${project.id}`} key={project.id} className="project-card">
              <h3>{project.customer_name}</h3>
              <p><strong>Country:</strong> {project.country}</p>
              <p><strong>Account Manager:</strong> {project.account_manager}</p>
              <p><strong>Sales Stage:</strong> {project.sales_stage}</p>
              <p><strong>Product:</strong> {project.product}</p>
              <p><strong>Scope:</strong> {project.scope}</p>
              <p><strong>Backup:</strong> {project.backup_presales}</p>
              <p><strong>Remarks:</strong> {project.remarks}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default Projects;
