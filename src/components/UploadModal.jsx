import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { upload } from '@vercel/blob/client';
import { useNavigate } from 'react-router-dom';
import { api, getToken } from '../api.js';
import { useData } from '../data.jsx';
import { Modal } from './bits.jsx';

const MAX_BYTES = 200 * 1024 * 1024;

function toDateInput(ms) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Big phone photos are shrunk to 2560px JPEGs to save Blob storage. Videos and GIFs are uploaded as-is.
async function shrinkImage(file) {
  if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.size < 1.5 * 1024 * 1024) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 2560 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.86));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    return file; // e.g. HEIC the browser can't decode
  }
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
        const file = await shrinkImage(f.file);
        const safe = file.name.replace(/[^\w.-]+/g, '_').slice(-80);
        const blob = await upload(`albums/${albumId}/${safe}`, file, {
          access: 'public',
          handleUploadUrl: '/api/upload',
          headers: { Authorization: `Bearer ${getToken()}` },
          multipart: file.size > 20 * 1024 * 1024,
          contentType: file.type,
          onUploadProgress: ({ percentage }) => patch(f.key, { progress: percentage }),
        });
        patch(f.key, { progress: 100 });
        items.push({ mediaUrl: blob.url, mediaType: f.type, caption: f.caption, takenAt: f.takenAt });
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
