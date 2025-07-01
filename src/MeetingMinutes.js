import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { FaPlus, FaEdit, FaSave, FaTimes, FaTrash } from 'react-icons/fa';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { useLocation, Link } from 'react-router-dom';

function MeetingMinutes() {
  const [notes, setNotes] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editNoteId, setEditNoteId] = useState(null);
  const [form, setForm] = useState({ title: '', content: '', project_id: '' });
  const [projects, setProjects] = useState([]);
  const [selectedNote, setSelectedNote] = useState(null);

  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const viewId = params.get('id');

  useEffect(() => {
    fetchProjects();
    fetchNotes();
  }, []);

  useEffect(() => {
    if (viewId && notes.length > 0) {
      const note = notes.find(n => String(n.id) === viewId);
      setSelectedNote(note || null);
    }
  }, [viewId, notes]);

  const fetchNotes = async () => {
    const { data } = await supabase.from('meeting_minutes').select('*').order('created_at', { ascending: false });
    setNotes(data || []);
  };

  const fetchProjects = async () => {
    const { data } = await supabase.from('projects').select('id, customer_name');
    setProjects(data || []);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    const payload = { title: form.title, content: form.content, project_id: form.project_id || null };

    let result;
    if (editNoteId) {
      result = await supabase.from('meeting_minutes').update(payload).eq('id', editNoteId);
    } else {
      result = await supabase.from('meeting_minutes').insert([payload]);
    }

    if (!result.error) {
      setShowModal(false);
      setForm({ title: '', content: '', project_id: '' });
      setEditNoteId(null);
      fetchNotes();
    }
  };

  const handleEdit = (note) => {
    setEditNoteId(note.id);
    setForm({ title: note.title, content: note.content, project_id: note.project_id || '' });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this meeting note?')) return;
    await supabase.from('meeting_minutes').delete().eq('id', id);
    fetchNotes();
  };

  // --- RENDERING VIEW MODE ---
  if (viewId && selectedNote) {
    return (
      <div className="page-wrapper">
        <div className="page-content wide">
          <Link to="/" className="back-btn" style={{ marginBottom: '1rem', display: 'inline-block' }}>← Back to Dashboard</Link>
          <h2>{selectedNote.title}</h2>
          <div dangerouslySetInnerHTML={{ __html: selectedNote.content }} style={{ marginTop: '1rem' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="section-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>Meeting Minutes</h3>
        <button onClick={() => setShowModal(true)}><FaPlus /> Add</button>
      </div>

      <ul style={{ marginTop: '1rem' }}>
        {notes.map(note => (
          <li key={note.id} style={{ marginBottom: '1rem' }}>
            <div><strong>{note.title}</strong></div>
            <div style={{ marginTop: '0.25rem', fontSize: '0.9rem' }}>
              <div dangerouslySetInnerHTML={{ __html: note.content.substring(0, 100) + '...' }}></div>
              <div style={{ marginTop: '0.5rem' }}>
                <Link to={`/meeting-minutes?id=${note.id}`} className="btn-view" style={{ marginRight: '0.5rem' }}>
                  View
                </Link>
                <button onClick={() => handleEdit(note)}><FaEdit /></button>
                <button onClick={() => handleDelete(note.id)} style={{ marginLeft: '0.5rem' }}><FaTrash /></button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '800px', width: '90%' }}>
            <h3>{editNoteId ? 'Edit' : 'Add'} Meeting Minute</h3>
            <input
              placeholder="Title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              style={{ width: '100%', marginBottom: '0.75rem' }}
            />

            <select
              value={form.project_id || ''}
              onChange={(e) => setForm({ ...form, project_id: e.target.value })}
              style={{ width: '100%', marginBottom: '0.75rem' }}
            >
              <option value="">No linked project</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.customer_name}</option>
              ))}
            </select>

            <ReactQuill
              theme="snow"
              value={form.content}
              onChange={(content) => setForm({ ...form, content })}
              style={{ height: '250px', marginBottom: '1rem' }}
            />
            <div className="modal-actions">
              <button onClick={handleSave}><FaSave /> Save</button>
              <button onClick={() => {
                setShowModal(false);
                setForm({ title: '', content: '', project_id: '' });
                setEditNoteId(null);
              }}><FaTimes /> Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MeetingMinutes;
