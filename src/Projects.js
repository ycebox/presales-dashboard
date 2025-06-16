import React, { useState, useEffect } from 'react';
import supabase from './supabaseClient';
import ProjectTasks from './ProjectTasks';
import { saveAs } from 'file-saver';

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [filters, setFilters] = useState({
    country: 'All',
    account_manager: 'All',
    sales_stage: 'All',
  });
  const [editProjectId, setEditProjectId] = useState(null);
  const [editedData, setEditedData] = useState({});

  const salesStageOptions = [
    'Lead',
    'Opportunity',
    'Proposal',
    'Contracting',
    'Done',
  ];
  const asiaPacificCountries = [
    'Australia',
    'Bangladesh',
    'Brunei',
    'Cambodia',
    'China',
    'Fiji',
    'Hong Kong',
    'India',
    'Indonesia',
    'Japan',
    'Laos',
    'Malaysia',
    'Maldives',
    'Myanmar',
    'Nepal',
    'New Zealand',
    'Pakistan',
    'Papua New Guinea',
    'Philippines',
    'Singapore',
    'South Korea',
    'Sri Lanka',
    'Taiwan',
    'Thailand',
    'Timor-Leste',
    'Tonga',
    'Vanuatu',
    'Vietnam',
  ];

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error) setProjects(data);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const filteredProjects = projects.filter((p) => {
    return (
      (filters.country === 'All' || p.country === filters.country) &&
      (filters.account_manager === 'All' ||
        p.account_manager === filters.account_manager) &&
      (filters.sales_stage === 'All' || p.sales_stage === filters.sales_stage)
    );
  });

  const getDropdownOptions = (key) => {
    const options = [...new Set(projects.map((p) => p[key]).filter(Boolean))];
    return ['All', ...options];
  };

  const handleEdit = (project) => {
    setEditProjectId(project.id);
    setEditedData({ ...project });
  };

  const handleInputChange = (e, key) => {
    setEditedData({ ...editedData, [key]: e.target.value });
  };

  const handleSave = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to save the changes?'
    );
    if (!confirmed) return;

    const { error } = await supabase
      .from('projects')
      .update(editedData)
      .eq('id', editProjectId);
    if (!error) {
      setEditProjectId(null);
      setEditedData({});
      fetchProjects();
    }
  };

  const handleExport = () => {
    const confirmed = window.confirm(
      'Export current filtered projects to CSV?'
    );
    if (!confirmed) return;

    const csv = [
      Object.keys(filteredProjects[0] || {}).join(','),
      ...filteredProjects.map((p) => Object.values(p).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'filtered_projects.csv');
  };

  const getBadgeColor = (stage) => {
    switch (stage) {
      case 'Lead':
        return 'orange';
      case 'Opportunity':
        return 'blue';
      case 'Proposal':
        return 'gold';
      case 'Contracting':
        return 'purple';
      case 'Done':
        return 'green';
      default:
        return 'gray';
    }
  };

  return (
    <section>
      <h2>📋 Project List</h2>

      <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
        {[
          { label: 'Country', key: 'country' },
          { label: 'Account Manager', key: 'account_manager' },
          { label: 'Sales Stage', key: 'sales_stage' },
        ].map(({ label, key }) => (
          <div key={key}>
            <label>{label}:</label>
            <br />
            <select
              name={key}
              onChange={handleFilterChange}
              value={filters[key]}
            >
              {getDropdownOptions(key).map((opt) => (
                <option key={opt}>{opt}</option>
              ))}
            </select>
          </div>
        ))}
        <button onClick={handleExport}>Export</button>
      </div>

      <ul>
        {filteredProjects.map((p) => (
          <li
            key={p.id}
            id={`project-${p.id}`}
            style={{
              marginBottom: '30px',
              borderBottom: '1px solid #ccc',
              paddingBottom: '20px',
            }}
          >
            {editProjectId === p.id ? (
              <div>
                {Object.entries(p).map(([key, val]) =>
                  key !== 'id' ? (
                    <div key={key}>
                      <label>{key.replace(/_/g, ' ')}:</label>
                      <br />
                      {key === 'sales_stage' ? (
                        <select
                          value={editedData[key]}
                          onChange={(e) => handleInputChange(e, key)}
                        >
                          {salesStageOptions.map((stage) => (
                            <option key={stage}>{stage}</option>
                          ))}
                        </select>
                      ) : key === 'country' ? (
                        <select
                          value={editedData[key]}
                          onChange={(e) => handleInputChange(e, key)}
                        >
                          {asiaPacificCountries.map((country) => (
                            <option key={country}>{country}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={key.includes('date') ? 'date' : 'text'}
                          value={editedData[key] || ''}
                          onChange={(e) => handleInputChange(e, key)}
                        />
                      )}
                      <br />
                    </div>
                  ) : null
                )}
                <button onClick={handleSave}>Save</button>
              </div>
            ) : (
              <div>
                <strong>{p.title}</strong>
                <br />
                {Object.entries(p).map(([key, val]) =>
                  key !== 'id' && key !== 'title' ? (
                    <div key={key}>
                      {key.replace(/_/g, ' ')}: {val}
                    </div>
                  ) : null
                )}
                <span
                  style={{
                    backgroundColor: getBadgeColor(p.sales_stage),
                    color: 'white',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    display: 'inline-block',
                    marginTop: '5px',
                  }}
                >
                  {p.sales_stage}
                </span>
                <br />
                <button
                  onClick={() => handleEdit(p)}
                  style={{ marginTop: '10px' }}
                >
                  Edit
                </button>
              </div>
            )}
            <ProjectTasks projectId={p.id} />
          </li>
        ))}
      </ul>
    </section>
  );
}
