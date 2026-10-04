import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

const colors = ['#fff0a8', '#ffdcd7', '#d9f2de', '#e6dcff', '#d9efff', '#ffe1ef'];
async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.error || 'Could not reach the notes server.');
  }
  return response.status === 204 ? null : response.json();
}

function Icon({ name, size = 18 }) {
  const paths = {
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    pin: <><path d="m16 3 5 5-4 1-4 4v5l-2 2-2-7-7-2 2-2h5l4-4z"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    close: <><path d="m18 6-12 12M6 6l12 12"/></>,
    trash: <><path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6"/></>,
    note: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h6"/></>,
    spark: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3z"/><path d="m19 14 1.2 2.8L23 18l-2.8 1.2L19 22l-1.2-2.8L15 18l2.8-1.2L19 14z"/></>,
  };
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function App() {
  const [notes, setNotes] = useState([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api('/api/notes')
      .then((result) => { if (active) setNotes(result); })
      .catch((cause) => { if (active) setError(cause.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const visibleNotes = notes
    .filter((note) => filter === 'all' || note.pinned)
    .filter((note) => `${note.title} ${note.body}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt);

  async function saveNote(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get('title')).trim();
    const body = String(form.get('body')).trim();
    if (!title && !body) return;
    const payload = { title, body, color: editing?.color ?? colors[notes.length % colors.length], pinned: editing?.pinned ?? false };
    try {
      const note = await api(editing.id ? `/api/notes/${editing.id}` : '/api/notes', {
        method: editing.id ? 'PATCH' : 'POST',
        body: JSON.stringify(payload),
      });
      setNotes((current) => editing.id ? current.map((item) => item.id === note.id ? note : item) : [note, ...current]);
      setEditing(null);
      setError('');
    } catch (cause) {
      setError(cause.message);
    }
  }

  async function togglePin(event, id) {
    event.stopPropagation();
    const current = notes.find((note) => note.id === id);
    try {
      const note = await api(`/api/notes/${id}`, { method: 'PATCH', body: JSON.stringify({ ...current, pinned: !current.pinned }) });
      setNotes((items) => items.map((item) => item.id === id ? note : item));
      setError('');
    } catch (cause) { setError(cause.message); }
  }

  async function deleteNote(event, id) {
    event.stopPropagation();
    if (!window.confirm('Delete this note?')) return;
    try {
      await api(`/api/notes/${id}`, { method: 'DELETE' });
      setNotes((current) => current.filter((note) => note.id !== id));
      setError('');
    } catch (cause) { setError(cause.message); }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#home" aria-label="Little Notes home"><span className="brand-mark"><Icon name="note" size={21} /></span><span>little notes<span className="brand-dot">.</span></span></a>
        <div className="side-label">YOUR SPACE</div>
        <nav className="nav-list" aria-label="Note filters">
          <button className={`nav-item ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}><Icon name="note" /><span>All notes</span><span className="count">{notes.length}</span></button>
          <button className={`nav-item ${filter === 'pinned' ? 'active' : ''}`} onClick={() => setFilter('pinned')}><Icon name="pin" /><span>Pinned</span><span className="count">{notes.filter((note) => note.pinned).length}</span></button>
        </nav>
        <div className="sidebar-bottom"><div className="sun-doodle">☀️</div><p>A little place for all your little thoughts.</p><span>Made for your mind to wander ♡</span></div>
      </aside>

      <main className="main-area" id="home">
        <header className="topbar"><div className="breadcrumb">My space <span>/</span> <b>{filter === 'all' ? 'All notes' : 'Pinned notes'}</b></div><div className="today">A fresh page, just for you <span>✿</span></div></header>
        <section className="content">
          <div className="welcome-row"><div><div className="eyebrow"><Icon name="spark" size={16} /> YOUR HAPPY LITTLE CORNER</div><h1>Hey there, <span>daydreamer</span> <span className="wave">✦</span></h1><p className="subtitle">Catch a thought before it flutters away.</p></div><button className="new-note" onClick={() => setEditing({})}><Icon name="plus" size={18} /> New note</button></div>

          {error && <p className="server-error" role="alert">{error}</p>}
          <div className="toolbar"><label className="search-box"><Icon name="search" size={19} /><input aria-label="Search notes" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a little something..." />{query && <button className="clear-search" aria-label="Clear search" onClick={() => setQuery('')}><Icon name="close" size={15} /></button>}</label><span className="notes-total">{visibleNotes.length} {visibleNotes.length === 1 ? 'note' : 'notes'} <span>·</span> all yours</span></div>

          {loading ? <div className="empty-state"><div className="empty-illustration">✿</div><h2>Gathering your notes...</h2></div> : visibleNotes.length ? <div className="notes-grid">{visibleNotes.map((note, index) => <article key={note.id} className={`note-card card-${index % 5}`} style={{ '--card-color': note.color }} role="button" tabIndex={0} aria-label={`Edit note: ${note.title || 'Untitled'}`} onClick={() => setEditing(note)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setEditing(note); } }}>
            <div className="card-top"><span className="note-type"><span className="type-dot" /> LITTLE NOTE</span><div className="card-actions"><button aria-label={note.pinned ? 'Unpin note' : 'Pin note'} className={`icon-button pin-button ${note.pinned ? 'is-pinned' : ''}`} onClick={(event) => togglePin(event, note.id)}><Icon name="pin" size={16} /></button><button aria-label="Delete note" className="icon-button delete-button" onClick={(event) => deleteNote(event, note.id)}><Icon name="trash" size={16} /></button></div></div>
            <h2>{note.title || 'A little thought'}</h2><p className="note-body">{note.body || <span className="empty-body">Nothing here just yet...</span>}</p><div className="card-footer"><span>{new Date(note.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span><span className="footer-flower">✿</span></div>
          </article>)}</div> : <div className="empty-state"><div className="empty-illustration">{query ? '🔎' : '📝'}</div><h2>{query ? 'No notes found' : filter === 'pinned' ? 'Nothing pinned yet' : 'Your page is wide open'}</h2><p>{query ? 'Try another search and see what pops up.' : 'Every lovely idea starts somewhere. Add your first note!'}</p>{!query && filter === 'all' && <button className="new-note" onClick={() => setEditing({})}><Icon name="plus" size={18} /> Write a note</button>}</div>}
          <footer className="page-footer"><span>✦</span> Your thoughts are tucked safely into SQLite. <span>✦</span></footer>
        </section>
      </main>

      {editing && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditing(null); }}><section className="note-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-top"><span className="modal-kicker"><span className="type-dot" /> {editing.id ? 'A LITTLE NOTE' : 'A NEW LITTLE NOTE'}</span><button className="icon-button modal-close" aria-label="Close editor" onClick={() => setEditing(null)}><Icon name="close" /></button></div><h2 id="modal-title" className="sr-only">{editing.id ? 'Edit note' : 'Create a note'}</h2><form onSubmit={saveNote}><input autoFocus name="title" className="title-input" placeholder="Give your note a title..." defaultValue={editing.title || ''} aria-label="Note title" /><textarea name="body" className="body-input" placeholder="Let your thoughts out..." defaultValue={editing.body || ''} aria-label="Note text" rows="7" /><div className="modal-footer"><button type="button" className={`modal-pin ${editing.pinned ? 'selected' : ''}`} onClick={() => setEditing({ ...editing, pinned: !editing.pinned })}><Icon name="pin" size={16} /> {editing.pinned ? 'Pinned' : 'Pin this note'}</button><div><button type="button" className="cancel-button" onClick={() => setEditing(null)}>Cancel</button><button type="submit" className="save-button">Save note <span>✿</span></button></div></div></form></section></div>}
    </div>
  );
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
