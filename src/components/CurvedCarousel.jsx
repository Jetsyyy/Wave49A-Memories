import { useEffect, useMemo, useRef, useState } from 'react';
import { Media } from './bits.jsx';

// A concave, endlessly scrolling strip of memories: cards bend toward you at the edges.
// Drag (or swipe) to scrub; it keeps drifting on its own.
export default function CurvedCarousel({ memories, onOpen }) {
  const wrapRef = useRef(null);
  const cardsRef = useRef([]);
  const state = useRef({ offset: 0, vel: 0, dragging: false, lastX: 0, moved: 0, hover: false });
  const [dims, setDims] = useState({ w: 260, vw: 1200 });

  useEffect(() => {
    const on = () => {
      const vw = wrapRef.current?.clientWidth || window.innerWidth;
      setDims({ vw, w: Math.max(150, Math.min(300, vw * 0.2)) });
    };
    on();
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);

  const gap = dims.w * 0.14;
  const step = dims.w + gap;
  const items = useMemo(() => {
    if (!memories.length) return [];
    const need = Math.ceil((dims.vw + step * 3) / step);
    const out = [];
    while (out.length < Math.max(need, memories.length)) out.push(...memories);
    return out.map((m, i) => ({ m, key: `${m.id}-${i}`, idx: i % memories.length }));
  }, [memories, dims.vw, step]);

  useEffect(() => {
    if (!items.length) return;
    const total = items.length * step;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf;
    const tick = () => {
      const s = state.current;
      if (!s.dragging) {
        const drift = reduce ? 0 : s.hover ? 0.15 : 0.55;
        s.vel += (drift - s.vel) * 0.04;
        s.offset += s.vel;
      }
      const half = dims.vw / 2;
      cardsRef.current.forEach((el, i) => {
        if (!el) return;
        let x = (((i * step - s.offset) % total) + total) % total;
        if (x > total / 2) x -= total;
        const d = x / half; // -1 .. 1 across the viewport
        const ad = Math.min(Math.abs(d), 1.6);
        el.style.transform = `translate3d(${x - dims.w / 2}px, -50%, 0) rotateY(${-d * 32}deg) scale(${1 + ad * 0.2})`;
        el.style.zIndex = String(100 - Math.round(ad * 10));
        el.style.opacity = ad > 1.45 ? String(Math.max(0, (1.6 - ad) / 0.15)) : '1';
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [items, step, dims]);

  const onDown = (e) => {
    const s = state.current;
    s.dragging = true;
    s.lastX = e.clientX;
    s.moved = 0;
    s.vel = 0;
  };
  const onMove = (e) => {
    const s = state.current;
    if (!s.dragging) return;
    const dx = e.clientX - s.lastX;
    s.lastX = e.clientX;
    s.moved += Math.abs(dx);
    s.offset -= dx;
    s.vel = -dx;
  };
  const onUp = () => {
    state.current.dragging = false;
  };

  if (!memories.length) return null;

  return (
    <div
      className="curve"
      ref={wrapRef}
      style={{ height: dims.w * 1.25 * 1.35 }}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerLeave={() => {
        onUp();
        state.current.hover = false;
      }}
      onPointerEnter={() => (state.current.hover = true)}
    >
      {items.map(({ m, key, idx }, i) => (
        <button
          key={key}
          ref={(el) => (cardsRef.current[i] = el)}
          className="curve-card"
          style={{ width: dims.w, height: dims.w * 1.25 }}
          onClick={() => state.current.moved < 6 && onOpen(idx)}
          aria-label={m.caption || 'Open memory'}
        >
          <Media memory={m} />
          {m.mediaType === 'video' && <span className="play-badge">▶</span>}
        </button>
      ))}
    </div>
  );
}
