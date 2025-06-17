import React, { useState } from 'react';
import { supabase } from './supabaseClient';

function AddProjectForm({ onClose, onProjectAdded }) {
  const [formData, setFormData] = useState({
    customer_name: '',
    country: '',
    account_manager: '',
    sales_stage: 'Lead',
    product: '',
    deal_value: '',
    scope: '',
    backup_presales: '',
    remarks: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('projects').insert([formData]);
    if (error) {
      console.error('Error adding project:', error.message);
    } else {
      onProjectAdded();
      onClose();
    }
  };

  return (
    <div className="modal">
      <div className="modal-content">
        <h3>New Project</h3>
        <form onSubmit={handleSubmit}>
          <input name="customer_name" placeholder="Customer Name" onChange={handleChange} required />
          <input name="country" placeholder="Country" onChange={handleChange} required />
          <input name="account_manager" placeholder="Account Manager" onChange={handleChange} />
          <input name="product" placeholder="Product" onChange={handleChange} />
          <input name="deal_value" placeholder="Deal Value" type="number" onChange={handleChange} />
          <input name="scope" placeholder="Scope" onChange={handleChange} />
          <input name="backup_presales" placeholder="Backup Presales" onChange={handleChange} />
          <input name="remarks" placeholder="Remarks" onChange={handleChange} />
          <select name="sales_stage" onChange={handleChange} defaultValue="Lead">
            <option value="Lead">Lead</option>
            <option value="Opportunity">Opportunity</option>
            <option value="Proposal">Proposal</option>
            <option value="Contracting">Contracting</option>
            <option value="Done">Done</option>
          </select>
          <button type="submit">Save</button>
          <button type="button" onClick={onClose}>Cancel</button>
        </form>
      </div>
    </div>
  );
}

export default AddProjectForm;
