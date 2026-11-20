import { useEffect, useMemo, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useData } from '../data.jsx';
import MemoryGrid from '../components/MemoryGrid.jsx';
import { CoverModal } from '../components/Cover.jsx';
import { Avatar, Spinner, SplitTitle } from '../components/bits.jsx';
import { fmtDate, timeAgo } from '../utils.js';

export default function AlbumPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const { version, openUpload, openViewer, refresh } = useData();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [coverOpen, setCoverOpen] = useState(false);
  const { scrollY } = useScroll();
  const bgY = useTransform(scrollY, [0, 600], [0, 180]);
  const fade = useTransform(scrollY, [0, 400], [1, 0.2]);

  useEffect(() => {
    api(`albums/${id}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [id, version]);

  const memories = useMemo(() => {
    if (!data) return [];
    if (filter === 'all') return data.memories;
    if (filter === 'photos') return data.memories.filter((m) => m.mediaType === 'image');
    if (filter === 'videos') return data.memories.filter((m) => m.mediaType === 'video');
    return data.memories.filter((m) => String(m.uploader?.id) === filter);
  }, [data, filter]);

  const contributors = useMemo(() => {
    const map = new Map();
    data?.memories.forEach((m) => m.uploader && map.set(m.uploader.id, m.uploader));
    return [...map.values()];
  }, [data]);

  if (error) return <div className="section dark page-top"><p className="error">{error}</p></div>;
  if (!data) return <div className="section dark page-top center"><Spinner /></div>;

  const { album } = data;
  const cover = album.coverUrl;

  const removeAlbum = async () => {
    if (!confirm(`Delete “${album.title}” and all ${album.memoryCount} memories in it? This cannot be undone.`)) return;
    await api(`albums/${album.id}`, { method: 'DELETE' });
    refresh();
    nav('/albums');
  };

  return (
    <>
      <section className="album-hero">
        <motion.div className="album-hero-bg" style={{ y: bgY, opacity: fade, backgroundImage: cover ? `url("${cover}")` : undefined }} />
        <div className="hero-shade" />
        <div className="album-hero-content">
          <button className="link-btn light" onClick={() => nav(-1)}>← Back</button>
          <p className="hero-eyebrow">
            <span className="dash" />
            {album.subtitle || (album.eventDate ? fmtDate(album.eventDate) : 'Wave 49A')}
          </p>
          <h1 className="hero-title">
            <SplitTitle text={`${album.title}`} />
          </h1>
          {album.description && <p className="hero-desc">{album.description}</p>}
          <div className="album-meta">
            <span>{album.emoji} {album.memoryCount} {album.memoryCount === 1 ? 'memory' : 'memories'}</span>
            <span>Started by {album.creatorName || 'the crew'} · {timeAgo(album.createdAt)}</span>
            {contributors.length > 0 && (
              <span className="stack">
                {contributors.slice(0, 6).map((u) => <Avatar key={u.id} user={u} size={28} />)}
              </span>
            )}
          </div>
          <div className="hero-actions">
            <button className="btn btn--accent" onClick={() => openUpload(album.id)}>+ Add to this album</button>
            {album.canEdit && (
              <button className="btn btn--ghost" onClick={() => setCoverOpen(true)}>🖼 Change cover</button>
            )}
            {album.createdBy === user.id && (
              <button className="btn btn--ghost" onClick={removeAlbum}>Delete album</button>
            )}
          </div>
        </div>
      </section>

      <section className="section light">
        {data.memories.length === 0 ? (
          <div className="center empty">
            <p>This album is empty. Drop the first photo from that day.</p>
            <button className="btn btn--dark" onClick={() => openUpload(album.id)}>+ Add memory</button>
          </div>
        ) : (
          <>
            <div className="chips">
              {[['all', 'All'], ['photos', 'Photos'], ['videos', 'Videos']].map(([k, label]) => (
                <button key={k} className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>{label}</button>
              ))}
              {contributors.map((u) => (
                <button key={u.id} className={filter === String(u.id) ? 'on' : ''} onClick={() => setFilter(String(u.id))}>
                  <Avatar user={u} size={18} /> {u.displayName}
                </button>
              ))}
            </div>
            <MemoryGrid memories={memories} onOpen={(i) => openViewer(memories, i)} />
          </>
        )}
      </section>

      {album.canEdit && (
        <CoverModal open={coverOpen} onClose={() => setCoverOpen(false)} album={album} memories={data.memories} onSaved={refresh} />
      )}
    </>
  );
}
