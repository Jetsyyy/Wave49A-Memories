import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useData } from '../data.jsx';
import { AVATAR_COLORS } from '../utils.js';
import { Avatar, Modal } from './bits.jsx';

const ALBUM_EMOJIS = ['🏊', '🎉', '🎤', '☕', '🍕', '🏖️', '🎂', '🏆', '🎄', '🌙', '🎳', '📞', '💼', '🌊', '📸', '🫶'];

export function AlbumForm() {
  const { albumForm, closeAlbumForm, refresh } = useData();
  const nav = useNavigate();
  const [f, setF] = useState({ title: '', subtitle: '', description: '', emoji: '🏊', eventDate: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const d = await api('albums', { method: 'POST', body: f });
      refresh();
      closeAlbumForm();
      setF({ title: '', subtitle: '', description: '', emoji: '🏊', eventDate: '' });
      nav(`/albums/${d.album.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={albumForm} onClose={closeAlbumForm} className="sheet">
      <form onSubmit={submit}>
        <h2 className="sheet-title">New album</h2>
        <p className="muted">One album per moment — “Swimming”, “Nesting week”, “Christmas party”.</p>
        <div className="emoji-pick">
          {ALBUM_EMOJIS.map((e) => (
            <button type="button" key={e} className={f.emoji === e ? 'on' : ''} onClick={() => setF((x) => ({ ...x, emoji: e }))}>
              {e}
            </button>
          ))}
        </div>
        <label className="field">
          <span>Name *</span>
          <input className="input" value={f.title} onChange={set('title')} placeholder="Swimming" maxLength={60} required autoFocus />
        </label>
        <label className="field">
          <span>Tagline</span>
          <input className="input" value={f.subtitle} onChange={set('subtitle')} placeholder="Laguna · after our first payday" maxLength={80} />
        </label>
        <label className="field">
          <span>Date of the event</span>
          <input className="input" type="date" value={f.eventDate} onChange={set('eventDate')} />
        </label>
        <label className="field">
          <span>Story</span>
          <textarea className="input" rows={3} value={f.description} onChange={set('description')} placeholder="What happened that day?" maxLength={500} />
        </label>
        {error && <p className="error">{error}</p>}
        <div className="sheet-actions">
          <button type="button" className="btn btn--ghost-dark" onClick={closeAlbumForm}>Cancel</button>
          <button className="btn btn--accent" disabled={busy}>{busy ? 'Creating…' : 'Create album'}</button>
        </div>
      </form>
    </Modal>
  );
}

export function ProfileForm() {
  const { profile, closeProfile } = useData();
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user.displayName);
  const [color, setColor] = useState(user.avatarColor);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    try {
      const d = await api('auth/me', { method: 'PATCH', body: { displayName: name, avatarColor: color } });
      setUser(d.user);
      closeProfile();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Modal open={profile} onClose={closeProfile} className="sheet sheet--sm">
      <form onSubmit={submit}>
        <h2 className="sheet-title">Your profile</h2>
        <div className="profile-preview">
          <Avatar user={{ ...user, displayName: name || user.displayName, avatarColor: color }} size={72} />
          <span className="muted">@{user.username}</span>
        </div>
        <label className="field">
          <span>Display name</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
        </label>
        <div className="color-pick">
          {AVATAR_COLORS.map((c) => (
            <button type="button" key={c} style={{ background: c }} className={c === color ? 'on' : ''} onClick={() => setColor(c)} aria-label={`Color ${c}`} />
          ))}
        </div>
        {error && <p className="error">{error}</p>}
        <div className="sheet-actions">
          <button type="button" className="btn btn--ghost-dark" onClick={closeProfile}>Cancel</button>
          <button className="btn btn--accent">Save</button>
        </div>
      </form>
    </Modal>
  );
}
