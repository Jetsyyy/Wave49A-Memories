import { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useData } from '../data.jsx';
import { Reveal, Spinner } from '../components/bits.jsx';
import { CountUp, Marquee } from '../components/fx.jsx';
import { fmtDate, pad } from '../utils.js';

// Album card: a deck of the album's photos that fans out on hover, tilts toward the cursor,
// with a rotating gradient border and a light sweep.
export function AlbumTile({ album, index = 0 }) {
  const nav = useNavigate();
  const ref = useRef(null);
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rx = useSpring(useTransform(my, [0, 1], [7, -7]), { stiffness: 200, damping: 20 });
  const ry = useSpring(useTransform(mx, [0, 1], [-9, 9]), { stiffness: 200, damping: 20 });
  const imgX = useSpring(useTransform(mx, [0, 1], ['-3%', '3%']), { stiffness: 150, damping: 20 });
  const imgY = useSpring(useTransform(my, [0, 1], ['-3%', '3%']), { stiffness: 150, damping: 20 });
  const backs = (album.previewUrls || []).filter((u) => u !== album.coverUrl).slice(0, 2);

  return (
    <motion.button
      ref={ref}
      className="album-tile"
      style={{ rotateX: rx, rotateY: ry }}
      initial={{ opacity: 0, y: 80, rotate: index % 2 ? 3 : -3 }}
      whileInView={{ opacity: 1, y: 0, rotate: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.9, delay: (index % 3) * 0.1, ease: [0.16, 1, 0.3, 1] }}
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
      <span className="album-tile-border" aria-hidden />
      <div className="album-deck">
        {backs.map((u, i) => (
          <span key={u} className={`deck-card deck-card--${i}`} style={{ backgroundImage: `url("${u}")` }} aria-hidden />
        ))}
        <div className="album-tile-img">
          {album.coverUrl ? (
            <motion.span className="album-tile-photo" style={{ backgroundImage: `url("${album.coverUrl}")`, x: imgX, y: imgY }} />
          ) : (
            <span className="album-tile-emoji">{album.emoji || '📸'}</span>
          )}
          <span className="album-tile-shine" aria-hidden />
          <span className="album-tile-index">{pad(index + 1)}</span>
          <span className="album-tile-count">
            <b>{album.memoryCount}</b> {album.memoryCount === 1 ? 'memory' : 'memories'}
          </span>
        </div>
      </div>
      <div className="album-tile-body">
        <small>
          <span className="dash" />
          {album.eventDate ? fmtDate(album.eventDate) : 'Wave 49A'}
        </small>
        <strong>
          {album.emoji} {album.title}
        </strong>
        {album.subtitle && <span className="album-tile-sub">{album.subtitle}</span>}
        <span className="album-tile-cta">Open album →</span>
      </div>
    </motion.button>
  );
}

export default function Albums() {
  const { albums, openAlbumForm } = useData();
  const total = (albums || []).reduce((s, a) => s + a.memoryCount, 0);
  const words = albums?.length ? albums.map((a) => `${a.emoji || '✦'} ${a.title}`) : ['Wave 49A', 'Memories', 'Albums', 'Chapters'];

  return (
    <>
      <section className="albums-hero">
        <Marquee speed={45} className="marquee--outline">
          {words.map((w, i) => (
            <span key={i} className="marquee-word">
              {w} <span className="marquee-star">✦</span>
            </span>
          ))}
        </Marquee>
        <div className="albums-hero-row">
          <Reveal>
            <p className="eyebrow light">All albums</p>
            <h2 className="display">Chapters of the wave</h2>
          </Reveal>
          <div className="albums-hero-stats">
            <div>
              <b><CountUp value={albums?.length || 0} /></b>
              <span>albums</span>
            </div>
            <div>
              <b><CountUp value={total} /></b>
              <span>memories</span>
            </div>
            <button className="btn btn--accent" onClick={openAlbumForm}>+ New album</button>
          </div>
        </div>
      </section>
      <section className="section dark albums-list">
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
    </>
  );
}
