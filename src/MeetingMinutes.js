<div className="meeting-minutes-page">
  <h2>Meeting Minutes</h2>
  <button onClick={() => setShowModal(true)}>➕ New Meeting Note</button>

  <div className="minutes-list">
    {minutes.map(min => (
      <div key={min.id} className="minute-card">
        <h4>{min.title}</h4>
        <p>Linked Project: {min.project_id ? projectsMap[min.project_id] : '—'}</p>
        <small>{new Date(min.created_at).toLocaleString()}</small>
        <button onClick={() => viewNote(min)}>View</button>
      </div>
    ))}
  </div>
</div>
