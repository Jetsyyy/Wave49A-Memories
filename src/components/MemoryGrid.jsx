import { motion } from 'framer-motion';
import { Avatar, Media } from './bits.jsx';
import { fmtDate, timeAgo } from '../utils.js';

export function MemoryCard({ memory, onOpen, index = 0, showAlbum = false }) {
  const top = Object.entries(memory.reactions || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  const total = Object.values(memory.reactions || {}).reduce((s, n) => s + n, 0);
  return (
    <motion.article
      className="mcard"
      initial={{ opacity: 0, y: 50, rotate: index % 2 ? 1.5 : -1.5 }}
      whileInView={{ opacity: 1, y: 0, rotate: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.7, delay: (index % 4) * 0.06, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -6 }}
      onClick={onOpen}
    >
      <div className="mcard-media">
        <Media memory={memory} hoverPlay />
        {memory.mediaType === 'video' && <span className="play-badge">▶</span>}
        {showAlbum && (
          <span className="mcard-album">
            {memory.albumEmoji} {memory.albumTitle}
          </span>
        )}
      </div>
      <div className="mcard-body">
        {memory.caption && <p className="mcard-caption">{memory.caption}</p>}
        <div className="mcard-meta">
          <Avatar user={memory.uploader} size={26} />
          <div>
            <strong>{memory.uploader?.displayName || 'Former member'}</strong>
            <span title={new Date(memory.createdAt).toLocaleString()}>
              uploaded {timeAgo(memory.createdAt)}
              {memory.takenAt ? ` · taken ${fmtDate(memory.takenAt)}` : ''}
            </span>
          </div>
        </div>
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
