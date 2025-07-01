// src/MeetingMinutes.js
import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { Link } from 'react-router-dom';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import './MeetingMinutes.css';
import { FaPlus, FaSave, FaTimes } from 'react-icons/fa';

function MeetingMinutes() {
  const [minutes, setMinutes] = useState([]);
  const [projects, setProjects] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newNote, setNewNote] = useState({
    title: '',
    content: '',
    project_id: '',
  });

  useEffect(() => {
    fetchMinutes();
    fetchProjects();
  }, []);

  const fetchMinutes = async () => {
    const { data } = await supabase.from('meeting_minutes').select('*').order('created_at', { ascending: false });
    setMinutes(data || []);
  };

  const fetchProjects = async () => {
    const { data } = await supabase.from('projects').select('id, customer_name');
    setProjects(data || []);
  };

  const handleSave = async () => {
    if (!newNote.title.trim() || !newNote.content.trim()) return;
    const { error } = await supabase.from('meeting_minutes').insert([newNote]);
    if (!error) {
      setShowModal(false);
      setNewNote({ title: '', content: '', project_id: '' });
      fetchMinutes();
    }
  };

  return (
    <div className="page-wrapper navy-theme">
      <div className="page-content wide">
        <h2>📑 Meeting Minutes</h2>
        <button onClick={() => setShowModal(true)} className="add-btn"><FaPlus /> Add Note</button>

        <ul className="minutes-list">
          {minutes.map((note) => (
            <li key={note.id}>
              <strong>{note.title}</strong> 
              {note.project_id && (
                <>
                  {' '}– linked to project <Link to={`/project/${note.project_id}`}>View Project</Link>
                </>
              )}
              <div
                className="note-preview"
                dangerouslySetInnerHTML={{ __html: note.content.slice(0, 150) + '...' }}
              />
            </li>
          ))}
        </ul>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal large">
            <h3>Add Meeting Minute</h3>
            <input
              type="text"
              placeholder="Meeting title"
              value={newNote.title}
              onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
            />
            <select
              value={newNote.project_id}
              onChange={(e) => setNewNote({ ...newNote, project_id: e.target.value })}
            >
              <option value="">-- Optional: Link to project --</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.customer_name}</option>
              ))}
            </select>
            <ReactQuill
              value={newNote.content}
              onChange={(value) => setNewNote({ ...newNote, content: value })}
              placeholder="Write your meeting notes here..."
              style={{ marginTop: '1rem' }}
            />
            <div className="modal-actions" style={{ marginTop: '1rem' }}>
              <button onClick={handleSave}><FaSave /> Save</button>
              <button onClick={() => setShowModal(false)}><FaTimes /> Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MeetingMinutes;
