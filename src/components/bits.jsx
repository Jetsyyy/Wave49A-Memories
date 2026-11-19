import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { initials } from '../utils.js';

export function Avatar({ user, size = 32 }) {
  if (!user) return <span className="avatar" style={{ width: size, height: size, background: '#555' }}>?</span>;
  return (
    <span
      className="avatar"
      title={user.displayName}
      style={{ width: size, height: size, background: user.avatarColor, fontSize: size * 0.4 }}
    >
      {user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : initials(user.displayName)}
    </span>
  );
}

export function Media({ memory, className = '', controls = false, hoverPlay = false, eager = false }) {
  const ref = useRef(null);
  if (memory.mediaType === 'video') {
    return (
      <video
        ref={ref}
        className={className}
        src={`${memory.mediaUrl}#t=0.1`}
        controls={controls}
        playsInline
        muted={!controls}
        loop={!controls}
        preload="metadata"
        autoPlay={controls}
        onMouseEnter={hoverPlay ? () => ref.current?.play().catch(() => {}) : undefined}
        onMouseLeave={hoverPlay ? () => ref.current?.pause() : undefined}
      />
    );
  }
  return <img className={className} src={memory.mediaUrl} alt={memory.caption || 'Wave 49A memory'} loading={eager ? 'eager' : 'lazy'} draggable={false} />;
}

export function Modal({ open, onClose, children, className = '' }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
        >
          <motion.div
            className={`modal ${className}`}
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
          >
            <button className="modal-close" onClick={onClose} aria-label="Close">
              ✕
            </button>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Reveal({ children, delay = 0, y = 40, className = '', as = 'div' }) {
  const Tag = motion[as];
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </Tag>
  );
}

// Splits a headline into letters that rise in one by one.
export function SplitTitle({ text, className = '' }) {
  const words = String(text).split(' ');
  return (
    <span className={`split ${className}`} aria-label={text}>
      {words.map((w, wi) => (
        <span className="split-word" key={wi} aria-hidden>
          {[...w].map((ch, i) => (
            <motion.span
              key={i}
              className="split-char"
              initial={{ y: '110%', opacity: 0 }}
              animate={{ y: '0%', opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.15 + (wi * 4 + i) * 0.035, ease: [0.16, 1, 0.3, 1] }}
            >
              {ch}
            </motion.span>
          ))}
        </span>
      ))}
    </span>
  );
}

export function Spinner() {
  return <span className="spinner" aria-label="Loading" />;
}
