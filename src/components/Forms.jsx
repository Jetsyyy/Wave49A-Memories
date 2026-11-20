import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useData } from '../data.jsx';
import { AVATAR_COLORS } from '../utils.js';
import { uploadFile } from '../upload.js';
import { Avatar, Modal } from './bits.jsx';
import { CoverPicker } from './Cover.jsx';

const ALBUM_EMOJIS = ['🏊', '🎉', '🎤', '☕', '🍕', '🏖️', '🎂', '🏆', '🎄', '🌙', '🎳', '📞', '💼', '🌊', '📸', '🫶'];

export function AlbumForm() {
  const { albumForm, closeAlbumForm, refresh } = useData();
  const nav = useNavigate();
  const [f, setF] = useState({ title: '', subtitle: '', description: '', emoji: '🏊', eventDate: '' });
  const [cover, setCover] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const coverUrl = cover ? await uploadFile(cover, 'covers/new') : null;
      const d = await api('albums', { method: 'POST', body: { ...f, coverUrl } });
      refresh();
      closeAlbumForm();
      setF({ title: '', subtitle: '', description: '', emoji: '🏊', eventDate: '' });
      setCover(null);
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
        <CoverPicker file={cover} onChange={setCover} />
        {error && <p className="error">{error}</p>}
        <div className="sheet-actions">
          <button type="button" className="btn btn--ghost-dark" onClick={closeAlbumForm}>Cancel</button>
          <button className="btn btn--accent" disabled={busy}>{busy ? (cover ? 'Uploading cover…' : 'Creating…') : 'Create album'}</button>
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
  const [photo, setPhoto] = useState(null); // newly picked File
  const [removed, setRemoved] = useState(false);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  // Start fresh from the saved profile every time the window opens.
  useEffect(() => {
    if (!profile) return;
    setName(user.displayName);
    setColor(user.avatarColor);
    setPhoto(null);
    setRemoved(false);
    setError('');
  }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!photo) return setPreview(null);
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  const shownUrl = preview || (removed ? null : user.avatarUrl);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const body = { displayName: name, avatarColor: color };
      if (photo) body.avatarUrl = await uploadFile(photo, `avatars/${user.id}`, undefined, { maxSide: 512 });
      else if (removed) body.avatarUrl = null;
      const d = await api('auth/me', { method: 'PATCH', body });
      setUser(d.user);
      closeProfile();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={profile} onClose={busy ? undefined : closeProfile} className="sheet sheet--sm">
      <form onSubmit={submit}>
        <h2 className="sheet-title">Your profile</h2>
        <div className="profile-preview">
          <button type="button" className="avatar-edit" onClick={() => fileRef.current?.click()} aria-label="Change profile photo">
            <Avatar user={{ ...user, displayName: name || user.displayName, avatarColor: color, avatarUrl: shownUrl }} size={96} />
            <span className="avatar-edit-badge">📷</span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                setPhoto(f);
                setRemoved(false);
              }
              e.target.value = '';
            }}
          />
          <span className="muted">@{user.username}</span>
          <div className="row">
            <button type="button" className="link-btn" onClick={() => fileRef.current?.click()}>
              {shownUrl ? 'Change photo' : 'Upload a photo'}
            </button>
            {shownUrl && (
              <button
                type="button"
                className="link-btn danger"
                onClick={() => {
                  setPhoto(null);
                  setRemoved(true);
                }}
              >
                Remove photo
              </button>
            )}
          </div>
        </div>
        <label className="field">
          <span>Display name</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
        </label>
        <p className="muted small-note">Color shows behind your initials when you have no photo.</p>
        <div className="color-pick">
          {AVATAR_COLORS.map((c) => (
            <button type="button" key={c} style={{ background: c }} className={c === color ? 'on' : ''} onClick={() => setColor(c)} aria-label={`Color ${c}`} />
          ))}
        </div>
        {error && <p className="error">{error}</p>}
        <div className="sheet-actions">
          <button type="button" className="btn btn--ghost-dark" onClick={closeProfile} disabled={busy}>Cancel</button>
          <button className="btn btn--accent" disabled={busy}>{busy ? (photo ? 'Uploading…' : 'Saving…') : 'Save'}</button>
        </div>
      </form>
    </Modal>
  );
}
