import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useData } from '../data.jsx';
import { fmtDate, pad } from '../utils.js';
import { SplitTitle } from './bits.jsx';

const SLIDE_MS = 7000;

function Backdrop({ album }) {
  const url = album?.coverUrl;
  if (!album) return <div className="class-bg" aria-hidden />;
  return (
    <AnimatePresence mode="sync">
      <motion.div
        key={album?.id ?? 'empty'}
        className="hero-bg"
        initial={{ opacity: 0, scale: 1.12 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        transition={{ opacity: { duration: 1.1 }, scale: { duration: SLIDE_MS / 1000 + 1.5, ease: 'linear' } }}
        style={url ? { backgroundImage: `url("${url}")` } : undefined}
      />
    </AnimatePresence>
  );
}

export default function HeroSlider() {
  const { albums, openUpload, openAlbumForm } = useData();
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const nav = useNavigate();
  const list = albums || [];
  const n = list.length;
  const active = list[idx % Math.max(n, 1)];

  useEffect(() => {
    if (n < 2 || paused) return;
    const t = setTimeout(() => setIdx((i) => (i + 1) % n), SLIDE_MS);
    return () => clearTimeout(t);
  }, [idx, n, paused]);

  const go = (d) => setIdx((i) => (i + d + n) % n);
  const upcoming = n ? Array.from({ length: Math.min(n - 1, 4) }, (_, k) => list[(idx + 1 + k) % n]) : [];

  return (
    <section className="hero" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <Backdrop album={active} />
      <div className="hero-shade" />

      <div className="hero-content">
        <AnimatePresence mode="wait">
          <motion.div
            key={active?.id ?? 'empty'}
            className="hero-copy"
            exit={{ opacity: 0, y: -20, transition: { duration: 0.35 } }}
          >
            <motion.p className="hero-eyebrow" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
              <span className="dash" />
              {active ? active.subtitle || (active.eventDate ? fmtDate(active.eventDate, { month: 'long', day: undefined }) : 'Wave 49A') : 'Our BPO journey'}
            </motion.p>
            <h1 className="hero-title">
              <SplitTitle text={active ? active.title : 'Wave 49A Memories'} />
            </h1>
            <motion.p className="hero-desc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
              {active
                ? active.description || `${active.memoryCount} ${active.memoryCount === 1 ? 'memory' : 'memories'} · started by ${active.creatorName || 'the crew'}`
                : 'Every training day, every graveyard shift, every bond. Make the first album and start filling it.'}
            </motion.p>
            <motion.div className="hero-actions" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75 }}>
              {active ? (
                <>
                  <button className="btn btn--accent" onClick={() => nav(`/albums/${active.id}`)}>
                    Open album →
                  </button>
                  <button className="btn btn--ghost" onClick={() => openUpload(active.id)}>
                    + Add to {active.title}
                  </button>
                </>
              ) : (
                <button className="btn btn--accent" onClick={openAlbumForm}>
                  Create the first album
                </button>
              )}
            </motion.div>
          </motion.div>
        </AnimatePresence>

        {n > 0 && (
          <div className="hero-cards">
            <AnimatePresence mode="popLayout" initial={false}>
              {upcoming.map((a, k) => (
                <motion.button
                  layout
                  key={a.id}
                  className="hero-card"
                  initial={{ opacity: 0, x: 80, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -120, scale: 1.1, transition: { duration: 0.45 } }}
                  transition={{ type: 'spring', stiffness: 200, damping: 26, delay: k * 0.04 }}
                  whileHover={{ y: -10 }}
                  onClick={() => setIdx(list.indexOf(a))}
                  style={a.coverUrl ? { backgroundImage: `url("${a.coverUrl}")` } : undefined}
                >
                  <span className="hero-card-meta">
                    <span className="dash" />
                    <small>{a.memoryCount} memories</small>
                    <strong>{a.emoji} {a.title}</strong>
                  </span>
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {n > 1 && (
        <div className="hero-controls">
          <button className="round-btn" onClick={() => go(-1)} aria-label="Previous album">‹</button>
          <button className="round-btn" onClick={() => go(1)} aria-label="Next album">›</button>
          <div className="hero-progress">
            <motion.span
              key={`${idx}-${paused}`}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: paused ? 0 : 1 }}
              transition={{ duration: paused ? 0.2 : SLIDE_MS / 1000, ease: 'linear' }}
            />
          </div>
          <div className="hero-count">
            <AnimatePresence mode="wait">
              <motion.span key={idx} initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -30, opacity: 0 }}>
                {pad(idx + 1)}
              </motion.span>
            </AnimatePresence>
            <small>/ {pad(n)}</small>
          </div>
        </div>
      )}
      {n < 2 && <div className="scroll-hint">scroll</div>}
    </section>
  );
}
