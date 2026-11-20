import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useData } from '../data.jsx';
import { uploadFile } from '../upload.js';
import { Modal } from './bits.jsx';

const MAX_BYTES = 200 * 1024 * 1024;

function toDateInput(ms) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function UploadModal() {
  const { upload: state, closeUpload, albums, refresh } = useData();
  const nav = useNavigate();
  const [albumId, setAlbumId] = useState('');
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [drag, setDrag] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (state) {
      setAlbumId(state.albumId ? String(state.albumId) : albums?.[0] ? String(albums[0].id) : '');
      setFiles([]);
      setError('');
    }
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => files.forEach((f) => URL.revokeObjectURL(f.preview)), [files]);

  const addFiles = (list) => {
    const next = [...list]
      .filter((f) => f.type.startsWith('image/') || f.type.startsWith('video/'))
      .map((f) => ({
        key: `${f.name}-${f.size}-${Math.random()}`,
        file: f,
        preview: URL.createObjectURL(f),
        type: f.type.startsWith('video/') ? 'video' : 'image',
        caption: '',
        takenAt: toDateInput(f.lastModified || Date.now()),
        progress: 0,
        tooBig: f.size > MAX_BYTES,
      }));
    setFiles((cur) => [...cur, ...next].slice(0, 50));
  };

  const patch = (key, p) => setFiles((cur) => cur.map((f) => (f.key === key ? { ...f, ...p } : f)));

  const submit = async () => {
    if (!albumId) return setError('Pick an album first.');
    const ready = files.filter((f) => !f.tooBig);
    if (!ready.length) return setError('Add at least one photo or video.');
    setBusy(true);
    setError('');
    try {
      const items = [];
      for (const f of ready) {
        const url = await uploadFile(f.file, `albums/${albumId}`, (p) => patch(f.key, { progress: p }));
        patch(f.key, { progress: 100 });
        items.push({ mediaUrl: url, mediaType: f.type, caption: f.caption, takenAt: f.takenAt });
      }
      await api('memories', { method: 'POST', body: { albumId: Number(albumId), items } });
      refresh();
      closeUpload();
      nav(`/albums/${albumId}`);
    } catch (e) {
      setError(e.message || 'Upload failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={!!state} onClose={busy ? undefined : closeUpload} className="sheet">
      <h2 className="sheet-title">Add memories</h2>
      <p className="muted">Photos and videos up to 200 MB each. Your name and the upload time are saved with every file.</p>

      {albums?.length ? (
        <label className="field">
          <span>Album</span>
          <select className="input" value={albumId} onChange={(e) => setAlbumId(e.target.value)} disabled={busy}>
            {albums.map((a) => (
              <option key={a.id} value={a.id}>
                {a.emoji} {a.title}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <p className="error">Create an album first, then add memories to it.</p>
      )}

      <div
        className={`dropzone ${drag ? 'drag' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          addFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
      >
        <input ref={inputRef} type="file" accept="image/*,video/*" multiple hidden onChange={(e) => addFiles(e.target.files)} />
        <motion.div animate={{ y: drag ? -6 : 0 }} className="dropzone-inner">
          <span className="dropzone-icon">⤒</span>
          <strong>Drop photos & videos here</strong>
          <span className="muted">or click to choose</span>
        </motion.div>
      </div>

      {files.length > 0 && (
        <div className="upload-list">
          {files.map((f) => (
            <motion.div layout key={f.key} className="upload-item" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
              <div className="upload-thumb">
                {f.type === 'video' ? <video src={f.preview} muted /> : <img src={f.preview} alt="" />}
                {busy && <span className="upload-progress" style={{ width: `${f.progress}%` }} />}
              </div>
              <div className="upload-fields">
                {f.tooBig && <span className="error">Too big (over 200 MB) — will be skipped</span>}
                <input className="input" placeholder="Caption (optional)" value={f.caption} disabled={busy} onChange={(e) => patch(f.key, { caption: e.target.value })} maxLength={500} />
                <label className="mini-field">
                  <span>Taken</span>
                  <input className="input" type="date" value={f.takenAt} disabled={busy} onChange={(e) => patch(f.key, { takenAt: e.target.value })} />
                </label>
              </div>
              {!busy && (
                <button className="link-btn danger" onClick={() => setFiles((cur) => cur.filter((x) => x.key !== f.key))} aria-label="Remove">
                  ✕
                </button>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {error && <p className="error">{error}</p>}
      <div className="sheet-actions">
        <button className="btn btn--ghost-dark" onClick={closeUpload} disabled={busy}>Cancel</button>
        <button className="btn btn--accent" onClick={submit} disabled={busy || !files.length || !albumId}>
          {busy ? 'Uploading…' : `Upload ${files.length || ''}`}
        </button>
      </div>
    </Modal>
  );
}
