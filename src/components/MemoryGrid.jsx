import { motion } from 'framer-motion';
import { Avatar, Media } from './bits.jsx';
import { useSpotlight } from './fx.jsx';
import { fmtDate, timeAgo } from '../utils.js';

const EASE = [0.16, 1, 0.3, 1];

// One scroll trigger on the card drives both the card rise and the photo wipe (child variant).
const cardVariants = {
  hidden: { opacity: 0, y: 60 },
  show: (delay) => ({ opacity: 1, y: 0, transition: { duration: 0.8, delay, ease: EASE } }),
};
const revealVariants = {
  hidden: { clipPath: 'inset(100% 0% 0% 0%)', scale: 1.25 },
  show: (delay) => ({ clipPath: 'inset(0% 0% 0% 0%)', scale: 1, transition: { duration: 1.1, delay: delay + 0.05, ease: EASE } }),
};

export function MemoryCard({ memory, onOpen, index = 0, showAlbum = false }) {
  const spot = useSpotlight();
  const top = Object.entries(memory.reactions || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  const total = Object.values(memory.reactions || {}).reduce((s, n) => s + n, 0);
  const delay = (index % 4) * 0.08;

  return (
    <motion.article
      ref={spot.ref}
      onMouseMove={spot.onMouseMove}
      className="mcard"
      variants={cardVariants}
      custom={delay}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-40px' }}
      whileHover={{ y: -8, transition: { duration: 0.3 } }}
      onClick={onOpen}
    >
      <span className="mcard-glow" aria-hidden />
      <div className="mcard-media">
        {/* Image wipes in from the bottom while settling from a slight zoom. */}
        <motion.div className="mcard-reveal" variants={revealVariants} custom={delay}>
          <Media memory={memory} hoverPlay />
        </motion.div>
        <span className="mcard-shade" aria-hidden />
        {memory.mediaType === 'video' && <span className="play-badge">▶</span>}
        {showAlbum && (
          <span className="mcard-album">
            {memory.albumEmoji} {memory.albumTitle}
          </span>
        )}
        <span className="mcard-view">View</span>
        {(total > 0 || memory.commentCount > 0) && (
          <div className="mcard-stats">
            {total > 0 && (
              <span>
                {top.map(([e]) => e).join('')} {total}
              </span>
            )}
            {memory.commentCount > 0 && <span>💬 {memory.commentCount}</span>}
          </div>
        )}
      </div>
      <div className="mcard-body">
        {memory.caption && <p className="mcard-caption">{memory.caption}</p>}
        <div className="mcard-meta">
          <Avatar user={memory.uploader} size={28} />
          <div>
            <strong>{memory.uploader?.displayName || 'Former member'}</strong>
            <span title={new Date(memory.createdAt).toLocaleString()}>
              uploaded {timeAgo(memory.createdAt)}
              {memory.takenAt ? ` · taken ${fmtDate(memory.takenAt)}` : ''}
            </span>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

export default function MemoryGrid({ memories, onOpen, showAlbum }) {
  return (
    <div className="masonry">
      {memories.map((m, i) => (
        <MemoryCard key={m.id} memory={m} index={i} showAlbum={showAlbum} onOpen={() => onOpen(i)} />
      ))}
    </div>
  );
}
