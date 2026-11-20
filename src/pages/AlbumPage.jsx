import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useScroll, useTransform } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useData } from '../data.jsx';
import MemoryGrid, { MemoryCard } from '../components/MemoryGrid.jsx';
import { CoverModal } from '../components/Cover.jsx';
import { Avatar, Reveal, Spinner, SplitTitle } from '../components/bits.jsx';
import { CountUp, Marquee } from '../components/fx.jsx';
import { fmtDate, timeAgo } from '../utils.js';

const EASE = [0.16, 1, 0.3, 1];

// Three photos stacked like prints on a table; they bob gently and fan out on hover.
function PhotoStack({ photos, onOpen }) {
  if (!photos.length) return null;
  return (
    <motion.div
      className="photo-stack"
      initial={{ opacity: 0, x: 60, rotate: 6 }}
      animate={{ opacity: 1, x: 0, rotate: 0 }}
      transition={{ duration: 1.1, delay: 0.4, ease: EASE }}
    >
      {photos.slice(0, 3).map((m, i) => (
        <button key={m.id} className={`stack-card stack-card--${i}`} onClick={() => onOpen(m)} aria-label="Open photo">
          <img src={m.mediaUrl} alt="" />
          <span className="stack-card-caption">{m.caption || m.uploader?.displayName || ''}</span>
        </button>
      ))}
    </motion.div>
  );
}

function Stat({ value, label, delay }) {
  return (
    <motion.div
      className="album-stat"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay, ease: EASE }}
    >
      <b>
        <CountUp value={value} />
      </b>
      <span>{label}</span>
    </motion.div>
  );
}

function dayKey(m) {
  return m.takenAt || String(m.createdAt).slice(0, 10);
}

// Memories grouped by the day they were taken, newest first, with a glowing line down the side.
function Timeline({ memories, onOpen }) {
  const groups = useMemo(() => {
    const map = new Map();
    memories.forEach((m, i) => {
      const k = dayKey(m);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push({ m, i });
    });
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [memories]);

  return (
    <div className="timeline">
      {groups.map(([day, items]) => {
        const d = new Date(`${day}T00:00:00`);
        return (
          <section key={day} className="tl-group">
            <motion.div
              className="tl-date"
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.7, ease: EASE }}
            >
              <span className="tl-dot" />
              <b>{d.getDate()}</b>
              <span>{d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</span>
              <small>
                {d.toLocaleDateString(undefined, { weekday: 'long' })} · {items.length} {items.length === 1 ? 'memory' : 'memories'}
              </small>
            </motion.div>
            <div className="tl-cards">
              {items.map(({ m, i }, k) => (
                <MemoryCard key={m.id} memory={m} index={k} onOpen={() => onOpen(i)} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export default function AlbumPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const { version, openUpload, openViewer, refresh } = useData();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [view, setView] = useState('grid');
  const [coverOpen, setCoverOpen] = useState(false);
  const { scrollY } = useScroll();
  const bgY = useTransform(scrollY, [0, 700], [0, 220]);
  const bgScale = useTransform(scrollY, [0, 700], [1.05, 1.2]);
  const fade = useTransform(scrollY, [0, 500], [1, 0.15]);
  const ghostX = useTransform(scrollY, [0, 700], ['0%', '-18%']);

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
    data?.memories.forEach((m) => {
      if (!m.uploader) return;
      const cur = map.get(m.uploader.id) || { user: m.uploader, count: 0 };
      cur.count += 1;
      map.set(m.uploader.id, cur);
    });
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [data]);

  if (error) return <div className="section dark page-top"><p className="error">{error}</p></div>;
  if (!data) return <div className="section dark page-top center"><Spinner /></div>;

  const { album } = data;
  const cover = album.coverUrl;
  const photos = data.memories.filter((m) => m.mediaType === 'image');
  const videos = data.memories.length - photos.length;
  const reactions = data.memories.reduce((s, m) => s + Object.values(m.reactions || {}).reduce((a, b) => a + b, 0), 0);
  const comments = data.memories.reduce((s, m) => s + (m.commentCount || 0), 0);
  const stackPhotos = photos.filter((m) => m.mediaUrl !== cover).length >= 2 ? photos.filter((m) => m.mediaUrl !== cover) : photos;
  const openById = (m) => openViewer(data.memories, data.memories.indexOf(m));
  const maxCount = contributors[0]?.count || 1;

  const removeAlbum = async () => {
    if (!confirm(`Delete “${album.title}” and all ${album.memoryCount} memories in it? This cannot be undone.`)) return;
    await api(`albums/${album.id}`, { method: 'DELETE' });
    refresh();
    nav('/albums');
  };

  const filters = [
    ['all', 'All', data.memories.length],
    ['photos', 'Photos', photos.length],
    ['videos', 'Videos', videos],
  ];

  return (
    <>
      <section className="album-hero">
        <motion.div
          className="album-hero-bg"
          style={{ y: bgY, scale: bgScale, opacity: fade, backgroundImage: cover ? `url("${cover}")` : undefined }}
        />
        <div className="hero-shade" />
        <motion.div className="album-ghost" style={{ x: ghostX }} aria-hidden>
          {album.title} {album.emoji}
        </motion.div>

        <div className="album-hero-grid">
          <div className="album-hero-content">
            <button className="link-btn light" onClick={() => nav(-1)}>← Back</button>
            <motion.p className="hero-eyebrow" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
              <span className="dash" />
              {album.subtitle || (album.eventDate ? fmtDate(album.eventDate) : 'Wave 49A')}
            </motion.p>
            <h1 className="hero-title">
              <SplitTitle text={album.title} />
            </h1>
            {album.description && (
              <motion.p className="hero-desc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                {album.description}
              </motion.p>
            )}
            <motion.div className="album-meta" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
              <span>Started by {album.creatorName || 'the crew'} · {timeAgo(album.createdAt)}</span>
              {album.eventDate && <span>📅 {fmtDate(album.eventDate, { weekday: 'short' })}</span>}
              {contributors.length > 0 && (
                <span className="stack">
                  {contributors.slice(0, 6).map(({ user: u }) => <Avatar key={u.id} user={u} size={28} />)}
                </span>
              )}
            </motion.div>
            <motion.div className="hero-actions" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
              <button className="btn btn--accent" onClick={() => openUpload(album.id)}>+ Add to this album</button>
              {album.canEdit && (
                <button className="btn btn--ghost" onClick={() => setCoverOpen(true)}>🖼 Change cover</button>
              )}
              {album.createdBy === user.id && (
                <button className="btn btn--ghost" onClick={removeAlbum}>Delete album</button>
              )}
            </motion.div>
          </div>
          <PhotoStack photos={stackPhotos} onOpen={openById} />
        </div>

        <div className="album-stats">
          <Stat value={photos.length} label="photos" delay={0.6} />
          <Stat value={videos} label="videos" delay={0.7} />
          <Stat value={contributors.length} label="people" delay={0.8} />
          <Stat value={reactions} label="reactions" delay={0.9} />
          <Stat value={comments} label="comments" delay={1} />
        </div>
      </section>

      {photos.length >= 4 && (
        <div className="ribbon-wrap" aria-hidden>
          <Marquee speed={Math.max(30, photos.length * 5)} className="ribbon">
            {photos.slice(0, 14).map((m) => (
              <img key={m.id} src={m.mediaUrl} alt="" loading="lazy" />
            ))}
          </Marquee>
        </div>
      )}

      <section className="section light album-body">
        {data.memories.length === 0 ? (
          <Reveal className="center empty">
            <div className="empty-art" aria-hidden>
              <span>📸</span>
              <span>🫶</span>
              <span>✨</span>
            </div>
            <p>This album is empty. Drop the first photo from that day.</p>
            <button className="btn btn--dark" onClick={() => openUpload(album.id)}>+ Add memory</button>
          </Reveal>
        ) : (
          <>
            <div className="album-toolbar">
              <div className="seg">
                {filters.map(([k, label, n]) => (
                  <button key={k} className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>
                    {filter === k && <motion.span layoutId="seg-pill" className="seg-pill" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
                    <span className="seg-label">
                      {label} <small>{n}</small>
                    </span>
                  </button>
                ))}
                {contributors.map(({ user: u }) => (
                  <button key={u.id} className={filter === String(u.id) ? 'on' : ''} onClick={() => setFilter(String(u.id))}>
                    {filter === String(u.id) && (
                      <motion.span layoutId="seg-pill" className="seg-pill" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />
                    )}
                    <span className="seg-label">
                      <Avatar user={u} size={18} /> {u.displayName.split(' ')[0]}
                    </span>
                  </button>
                ))}
              </div>
              <div className="seg seg--view">
                {[['grid', '▦ Grid'], ['timeline', '⏱ Timeline']].map(([k, label]) => (
                  <button key={k} className={view === k ? 'on' : ''} onClick={() => setView(k)}>
                    {view === k && <motion.span layoutId="view-pill" className="seg-pill" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
                    <span className="seg-label">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={`${view}-${filter}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35 }}
              >
                {memories.length === 0 ? (
                  <p className="muted center empty">Nothing here yet.</p>
                ) : view === 'grid' ? (
                  <MemoryGrid memories={memories} onOpen={(i) => openViewer(memories, i)} />
                ) : (
                  <Timeline memories={memories} onOpen={(i) => openViewer(memories, i)} />
                )}
              </motion.div>
            </AnimatePresence>

            {contributors.length > 0 && (
              <div className="captured">
                <Reveal>
                  <p className="eyebrow">Captured by</p>
                </Reveal>
                <div className="captured-list">
                  {contributors.map(({ user: u, count }, i) => (
                    <motion.div
                      key={u.id}
                      className="captured-row"
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.06, ease: EASE, duration: 0.6 }}
                    >
                      <Avatar user={u} size={40} />
                      <div className="captured-info">
                        <strong>{u.displayName}</strong>
                        <div className="captured-bar">
                          <motion.span
                            style={{ background: u.avatarColor }}
                            initial={{ width: 0 }}
                            whileInView={{ width: `${(count / maxCount) * 100}%` }}
                            viewport={{ once: true }}
                            transition={{ duration: 1.2, delay: 0.2 + i * 0.06, ease: EASE }}
                          />
                        </div>
                      </div>
                      <b className="captured-count">{count}</b>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {album.canEdit && (
        <CoverModal open={coverOpen} onClose={() => setCoverOpen(false)} album={album} memories={data.memories} onSaved={refresh} />
      )}
    </>
  );
}
