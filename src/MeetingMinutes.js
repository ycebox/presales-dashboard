// MeetingMinutes.js (enhanced with modal and Quill editor)
import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { FaPlus, FaSave, FaTimes, FaEdit, FaTrash } from 'react-icons/fa';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

function MeetingMinutes() {
  const [minutes, setMinutes] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', project_id: null });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchMinutes();
  }, []);

  const fetchMinutes = async () => {
    const { data } = await supabase.from('meeting_minutes').select('*').order('created_at', { ascending: false });
    setMinutes(data || []);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    const payload = { ...form };
    let error;

    if (editingId) {
      ({ error } = await supabase.from('meeting_minutes').update(payload).eq('id', editingId));
    } else {
      ({ error } = await supabase.from('meeting_minutes').insert([payload]));
    }

    if (!error) {
      setShowModal(false);
      setForm({ title: '', content: '', project_id: null });
      setEditingId(null);
      fetchMinutes();
    }
  };

  const handleEdit = (note) => {
    setEditingId(note.id);
    setForm({ title: note.title, content: note.content, project_id: note.project_id });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this meeting note?')) return;
    const { error } = await supabase.from('meeting_minutes').delete().eq('id', id);
    if (!error) fetchMinutes();
  };

  return (
    <div className="meeting-minutes-card section-card">
      <div className="header-row">
        <h3>Meeting Minutes</h3>
        <button onClick={() => setShowModal(true)}><FaPlus /> Add</button>
      </div>
      <ul className="meeting-list">
        {minutes.map(note => (
          <li key={note.id}>
            <strong>{note.title}</strong>
            <div className="actions">
              <button onClick={() => handleEdit(note)}><FaEdit /></button>
              <button onClick={() => handleDelete(note.id)}><FaTrash /></button>
            </div>
          </li>
        ))}
      </ul>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>{editingId ? 'Edit' : 'Add'} Meeting Minute</h3>
            <input
              type="text"
              placeholder="Meeting Title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <ReactQuill
              theme="snow"
              value={form.content}
              onChange={(value) => setForm({ ...form, content: value })}
            />
            <div className="modal-actions">
              <button onClick={handleSave}><FaSave /> Save</button>
              <button onClick={() => { setShowModal(false); setEditingId(null); }}><FaTimes /> Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MeetingMinutes;
