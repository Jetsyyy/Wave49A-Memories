import { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useData } from '../data.jsx';
import { Reveal, Spinner } from '../components/bits.jsx';
import { fmtDate } from '../utils.js';

// Album card that tilts toward the cursor.
export function AlbumTile({ album, index = 0 }) {
  const nav = useNavigate();
  const ref = useRef(null);
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rx = useSpring(useTransform(my, [0, 1], [8, -8]), { stiffness: 200, damping: 20 });
  const ry = useSpring(useTransform(mx, [0, 1], [-10, 10]), { stiffness: 200, damping: 20 });

  return (
    <motion.button
      ref={ref}
      className="album-tile"
      style={{ rotateX: rx, rotateY: ry }}
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.8, delay: (index % 3) * 0.08, ease: [0.16, 1, 0.3, 1] }}
      onMouseMove={(e) => {
        const r = ref.current.getBoundingClientRect();
        mx.set((e.clientX - r.left) / r.width);
        my.set((e.clientY - r.top) / r.height);
      }}
      onMouseLeave={() => {
        mx.set(0.5);
        my.set(0.5);
      }}
      onClick={() => nav(`/albums/${album.id}`)}
    >
      <div className="album-tile-img" style={album.coverUrl ? { backgroundImage: `url("${album.coverUrl}")` } : undefined}>
        {!album.coverUrl && <span className="album-tile-emoji">{album.emoji || '📸'}</span>}
      </div>
      <div className="album-tile-body">
        <span className="dash" />
        <small>
          {album.memoryCount} {album.memoryCount === 1 ? 'memory' : 'memories'}
          {album.eventDate ? ` · ${fmtDate(album.eventDate)}` : ''}
        </small>
        <strong>
          {album.emoji} {album.title}
        </strong>
        {album.subtitle && <span className="album-tile-sub">{album.subtitle}</span>}
      </div>
    </motion.button>
  );
}

export default function Albums() {
  const { albums, openAlbumForm } = useData();
  return (
    <section className="section dark page-top">
      <div className="section-head">
        <Reveal>
          <p className="eyebrow light">All albums</p>
          <h2 className="display">Chapters of the wave</h2>
        </Reveal>
        <button className="btn btn--accent" onClick={openAlbumForm}>+ New album</button>
      </div>
      {!albums ? (
        <Spinner />
      ) : albums.length === 0 ? (
        <p className="muted">No albums yet. Make one for your first outing.</p>
      ) : (
        <div className="album-grid">
          {albums.map((a, i) => (
            <AlbumTile key={a.id} album={a} index={i} />
          ))}
        </div>
      )}
    </section>
  );
}
