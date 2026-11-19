import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../api.js';
import { useData } from '../data.jsx';
import { Avatar, Reveal, Spinner } from '../components/bits.jsx';
import { fmtDate } from '../utils.js';

export default function Crew() {
  const { version } = useData();
  const [members, setMembers] = useState(null);

  useEffect(() => {
    api('members').then((d) => setMembers(d.members)).catch(() => setMembers([]));
  }, [version]);

  return (
    <section className="section dark page-top">
      <div className="crew-head">
        <div className="class-bg class-bg--soft" aria-hidden />
        <Reveal>
          <p className="eyebrow light">The crew</p>
          <h2 className="display">Wave 49A</h2>
          <p className="lede light">{members ? `${members.length} of us and counting.` : ''}</p>
        </Reveal>
      </div>
      {!members ? (
        <Spinner />
      ) : (
        <div className="crew-grid">
          {members.map((m, i) => (
            <motion.div
              key={m.id}
              className="crew-card"
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: (i % 8) * 0.05, type: 'spring', stiffness: 180, damping: 20 }}
              whileHover={{ y: -8 }}
            >
              <Avatar user={m} size={64} />
              <strong>{m.displayName}</strong>
              <span className="muted">@{m.username}</span>
              <div className="crew-stats">
                <span><b>{m.uploadCount}</b> uploads</span>
                <span><b>{m.commentCount}</b> comments</span>
              </div>
              <small className="muted">Joined {fmtDate(m.createdAt)}</small>
            </motion.div>
          ))}
        </div>
      )}
    </section>
  );
}
