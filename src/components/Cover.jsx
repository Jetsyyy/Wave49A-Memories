import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../api.js';
import { uploadFile } from '../upload.js';
import { Modal } from './bits.jsx';

// Picks an image file and shows a preview. Used in the New album form.
export function CoverPicker({ file, onChange, label = 'Cover photo (optional)' }) {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (!file) return setPreview(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div className="field">
      <span>{label}</span>
      <button
        type="button"
        className={`cover-pick ${preview ? 'has-image' : ''}`}
        style={preview ? { backgroundImage: `url("${preview}")` } : undefined}
        onClick={() => inputRef.current?.click()}
      >
        <span className="cover-pick-label">{preview ? 'Change photo' : '+ Choose a cover photo'}</span>
      </button>
      {file && (
        <button type="button" className="link-btn" onClick={() => onChange(null)}>
          Remove cover
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onChange(f);
          e.target.value = '';
        }}
      />
    </div>
  );
}

// Change an existing album's cover: upload a new image, pick one of the album's photos, or go back to automatic.
export function CoverModal({ open, onClose, album, memories, onSaved }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const photos = memories.filter((m) => m.mediaType === 'image');

  const save = async (coverUrl) => {
    setBusy(true);
    setError('');
    try {
      await api(`albums/${album.id}`, { method: 'PATCH', body: { coverUrl } });
      onSaved();
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
      setProgress(0);
    }
  };

  const uploadNew = async (file) => {
    setBusy(true);
    setError('');
    try {
      const url = await uploadFile(file, `covers/${album.id}`, setProgress);
      await save(url);
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={busy ? undefined : onClose} className="sheet">
      <h2 className="sheet-title">Album cover</h2>
      <p className="muted">Upload a new image, or pick a photo already in “{album.title}”.</p>

      <button type="button" className="dropzone cover-upload" onClick={() => inputRef.current?.click()} disabled={busy}>
        <span className="dropzone-icon">⤒</span>
        <strong>{busy && progress ? `Uploading… ${Math.round(progress)}%` : 'Upload a cover image'}</strong>
        <span className="muted">Wide photos look best</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) uploadNew(f);
          e.target.value = '';
        }}
      />

      {photos.length > 0 && (
        <>
          <h3 className="cover-sub">Or use a photo from this album</h3>
          <div className="cover-grid">
            {photos.map((m) => {
              const current = album.hasCustomCover && album.coverUrl === m.mediaUrl;
              return (
                <motion.button
                  key={m.id}
                  type="button"
                  className={`cover-option ${current ? 'on' : ''}`}
                  whileHover={{ scale: 1.04 }}
                  disabled={busy}
                  onClick={() => save(m.mediaUrl)}
                >
                  <img src={m.mediaUrl} alt={m.caption || ''} loading="lazy" />
                  {current && <span className="cover-badge">Current</span>}
                </motion.button>
              );
            })}
          </div>
        </>
      )}

      {error && <p className="error">{error}</p>}
      <div className="sheet-actions">
        {album.hasCustomCover && (
          <button className="btn btn--ghost-dark" disabled={busy} onClick={() => save(null)}>
            Use newest photo automatically
          </button>
        )}
        <button className="btn btn--ghost-dark" disabled={busy} onClick={onClose}>
          Close
        </button>
      </div>
    </Modal>
  );
}
