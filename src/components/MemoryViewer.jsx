import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useData } from '../data.jsx';
import { REACTIONS, fmtDate, fmtDateTime, timeAgo } from '../utils.js';
import { Avatar, Media, Modal, Spinner } from './bits.jsx';
import GifPicker from './GifPicker.jsx';
import { MentionInput, MentionText, useMembers } from './Mentions.jsx';

// Vercel Blob serves the file as a download (keeping its name) when ?download=1 is added.
function downloadUrl(url) {
  try {
    const u = new URL(url);
    if (u.hostname.endsWith('.blob.vercel-storage.com')) u.searchParams.set('download', '1');
    return u.toString();
  } catch {
    return url;
  }
}

// Faces of everyone who reacted; tap to see each person and their emojis.
function ReactedBy({ reactors, me }) {
  const [open, setOpen] = useState(false);
  const people = [];
  const byUser = new Map();
  reactors.forEach((r) => {
    let p = byUser.get(r.user.id);
    if (!p) {
      p = { user: r.user, emojis: [] };
      byUser.set(r.user.id, p);
      people.push(p);
    }
    p.emojis.push(r.emoji);
  });
  const names = people.map((p) => (p.user.id === me.id ? 'You' : p.user.displayName.split(' ')[0]));
  const summary =
    names.length <= 2 ? names.join(' and ') : `${names.slice(0, 2).join(', ')} and ${names.length - 2} other${names.length - 2 === 1 ? '' : 's'}`;

  return (
    <div className="reacted">
      <button type="button" className="reacted-summary" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="stack">
          {people.slice(0, 5).map((p) => (
            <Avatar key={p.user.id} user={p.user} size={24} />
          ))}
        </span>
        <span>
          Reacted by <strong>{summary}</strong>
        </span>
        <span className={`reacted-caret ${open ? 'open' : ''}`}>▾</span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.ul
            className="reacted-list"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {people.map((p, i) => (
              <motion.li key={p.user.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                <Avatar user={p.user} size={30} />
                <span className="reacted-name">
                  <strong>{p.user.id === me.id ? 'You' : p.user.displayName}</strong>
                  <small>@{p.user.username}</small>
                </span>
                <span className="reacted-emojis">{p.emojis.join(' ')}</span>
              </motion.li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

function Burst({ bursts }) {
  return (
    <div className="burst-layer" aria-hidden>
      <AnimatePresence>
        {bursts.map((b) => (
          <motion.span
            key={b.id}
            className="burst"
            style={{ left: `${b.x}%` }}
            initial={{ y: 0, opacity: 1, scale: 0.6 }}
            animate={{ y: -260 - Math.random() * 120, opacity: 0, scale: 1.6, rotate: b.r }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.4, ease: 'easeOut' }}
          >
            {b.emoji}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}

const isEmojiOnly = (s) => !!s && /^(\p{Extended_Pictographic}|\p{Emoji_Component}|\s|‍|️)+$/u.test(s) && s.length <= 16;

export default function MemoryViewer() {
  const { viewer, setViewer, refresh } = useData();
  const { user } = useAuth();
  const open = !!viewer;
  const list = viewer?.list || [];
  const index = viewer?.index ?? 0;
  const base = list[index];
  const [detail, setDetail] = useState(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [picker, setPicker] = useState(false);
  const [bursts, setBursts] = useState([]);
  const [editing, setEditing] = useState(false);
  const [caption, setCaption] = useState('');
  const [error, setError] = useState('');
  const endRef = useRef(null);
  const members = useMembers();
  const close = useCallback(() => setViewer(null), [setViewer]);

  const load = useCallback(
    (id) =>
      api(`memories/${id}`)
        .then((d) => setDetail((prev) => (prev && prev.memory.id !== id ? prev : d)))
        .catch((e) => setError(e.message)),
    [],
  );

  useEffect(() => {
    if (!base) return;
    setDetail(null);
    setEditing(false);
    setError('');
    setPicker(false);
    load(base.id);
    const t = setInterval(() => document.visibilityState === 'visible' && load(base.id), 6000);
    return () => clearInterval(t);
  }, [base?.id, load]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [detail?.comments?.length]);

  const go = useCallback(
    (d) => {
      if (!list.length) return;
      setViewer({ list, index: (index + d + list.length) % list.length });
    },
    [list, index, setViewer],
  );

  useEffect(() => {
    if (!open) return;
    const on = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [open, go]);

  const memory = detail?.memory || base;
  const mine = memory?.uploader?.id === user?.id;

  const patchList = (m) => setViewer((v) => (v ? { ...v, list: v.list.map((x) => (x.id === m.id ? { ...x, ...m } : x)) } : v));

  const fire = (emoji) => {
    const id = Math.random();
    const items = Array.from({ length: 7 }, (_, k) => ({ id: id + k, emoji, x: 30 + Math.random() * 40, r: (Math.random() - 0.5) * 80 }));
    setBursts((b) => [...b, ...items]);
    setTimeout(() => setBursts((b) => b.filter((x) => !items.includes(x))), 1500);
  };

  const react = async (emoji) => {
    const had = memory.myReactions.includes(emoji);
    if (!had) fire(emoji);
    // optimistic update
    const optimistic = {
      ...memory,
      myReactions: had ? memory.myReactions.filter((e) => e !== emoji) : [...memory.myReactions, emoji],
      reactions: { ...memory.reactions, [emoji]: Math.max(0, (memory.reactions[emoji] || 0) + (had ? -1 : 1)) },
    };
    setDetail((d) => (d ? { ...d, memory: optimistic } : d));
    try {
      const r = await api(`memories/${memory.id}/reactions`, { method: 'POST', body: { emoji } });
      patchList(r.memory);
      load(memory.id);
      refresh();
    } catch (e) {
      setError(e.message);
      load(memory.id);
    }
  };

  const send = async (payload) => {
    if (sending) return;
    setSending(true);
    setError('');
    try {
      const d = await api(`memories/${memory.id}/comments`, { method: 'POST', body: payload });
      setDetail(d);
      patchList(d.memory);
      setText('');
      setPicker(false);
      if (isEmojiOnly(payload.body)) fire(payload.body.trim());
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  const removeComment = async (id) => {
    await api(`comments/${id}`, { method: 'DELETE' });
    load(memory.id);
  };

  const saveCaption = async () => {
    await api(`memories/${memory.id}`, { method: 'PATCH', body: { caption } });
    setEditing(false);
    patchList({ id: memory.id, caption });
    load(memory.id);
    refresh();
  };

  const removeMemory = async () => {
    if (!confirm('Delete this memory for everyone? This cannot be undone.')) return;
    await api(`memories/${memory.id}`, { method: 'DELETE' });
    const rest = list.filter((m) => m.id !== memory.id);
    refresh();
    if (!rest.length) close();
    else setViewer({ list: rest, index: Math.min(index, rest.length - 1) });
  };

  return (
    <Modal open={open} onClose={close} className="viewer">
      {memory && (
        <>
          <div className="viewer-stage">
            <AnimatePresence mode="wait">
              <motion.div
                key={memory.id}
                className="viewer-media"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                transition={{ duration: 0.3 }}
              >
                <Media memory={memory} controls eager />
              </motion.div>
            </AnimatePresence>
            <Burst bursts={bursts} />
            {list.length > 1 && (
              <>
                <button className="round-btn viewer-prev" onClick={() => go(-1)} aria-label="Previous">‹</button>
                <button className="round-btn viewer-next" onClick={() => go(1)} aria-label="Next">›</button>
                <span className="viewer-count">{index + 1} / {list.length}</span>
              </>
            )}
          </div>

          <aside className="viewer-side">
            <header className="viewer-head">
              <Avatar user={memory.uploader} size={42} />
              <div>
                <strong>{memory.uploader?.displayName || 'Former member'}</strong>
                <span className="muted">
                  {memory.albumEmoji} {memory.albumTitle}
                </span>
              </div>
            </header>

            <dl className="viewer-facts">
              <div>
                <dt>Uploaded</dt>
                <dd>{fmtDateTime(memory.createdAt)}</dd>
              </div>
              {memory.takenAt && (
                <div>
                  <dt>Taken</dt>
                  <dd>{fmtDate(memory.takenAt, { weekday: 'short' })}</dd>
                </div>
              )}
            </dl>

            <div className="viewer-actions">
              <a className="save-btn" href={downloadUrl(memory.mediaUrl)} download target="_blank" rel="noreferrer">
                ⬇ Save {memory.mediaType === 'video' ? 'video' : 'photo'}
              </a>
            </div>

            {editing ? (
              <div className="caption-edit">
                <textarea className="input" rows={3} value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={500} autoFocus />
                <div className="row">
                  <button className="btn btn--sm btn--accent" onClick={saveCaption}>Save</button>
                  <button className="btn btn--sm btn--ghost-dark" onClick={() => setEditing(false)}>Cancel</button>
                </div>
              </div>
            ) : (
              memory.caption && <p className="viewer-caption">{memory.caption}</p>
            )}
            {mine && !editing && (
              <div className="row owner-tools">
                <button className="link-btn" onClick={() => { setCaption(memory.caption || ''); setEditing(true); }}>
                  {memory.caption ? 'Edit caption' : 'Add caption'}
                </button>
                <button className="link-btn danger" onClick={removeMemory}>Delete</button>
              </div>
            )}

            <div className="reaction-bar">
              {REACTIONS.map((e) => {
                const n = memory.reactions?.[e] || 0;
                const on = memory.myReactions?.includes(e);
                const who = detail?.reactors?.filter((r) => r.emoji === e).map((r) => r.user.displayName);
                return (
                  <motion.button
                    key={e}
                    className={`reaction ${on ? 'on' : ''}`}
                    whileTap={{ scale: 1.35 }}
                    onClick={() => react(e)}
                    title={who?.length ? who.join(', ') : 'React'}
                  >
                    <span>{e}</span>
                    {n > 0 && <small>{n}</small>}
                  </motion.button>
                );
              })}
            </div>

            {detail?.reactors?.length > 0 && <ReactedBy reactors={detail.reactors} me={user} />}

            <div className="comments">
              {!detail ? (
                <Spinner />
              ) : detail.comments.length === 0 ? (
                <p className="muted empty-comments">No comments yet. Say something nice (or roast them).</p>
              ) : (
                detail.comments.map((c) => (
                  <motion.div key={c.id} className="comment" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                    <Avatar user={c.user} size={30} />
                    <div className="comment-bubble">
                      <div className="comment-top">
                        <strong>{c.user?.displayName || 'Former member'}</strong>
                        <span className="muted" title={fmtDateTime(c.createdAt)}>{timeAgo(c.createdAt)}</span>
                        {c.user?.id === user.id && (
                          <button className="link-btn tiny" onClick={() => removeComment(c.id)}>delete</button>
                        )}
                      </div>
                      {c.body && (
                        <p className={isEmojiOnly(c.body) ? 'big-emoji' : ''}>
                          <MentionText text={c.body} members={members} />
                        </p>
                      )}
                      {c.gifUrl && <img className="comment-gif" src={c.gifUrl} alt="GIF" loading="lazy" />}
                    </div>
                  </motion.div>
                ))
              )}
              <div ref={endRef} />
            </div>

            {error && <p className="error">{error}</p>}

            <div className="composer-wrap">
              <AnimatePresence>
                {picker && (
                  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }} className="picker-pop">
                    <GifPicker onClose={() => setPicker(false)} onPick={(url) => send({ gifUrl: url })} onEmote={(e) => send({ body: e })} />
                  </motion.div>
                )}
              </AnimatePresence>
              <form
                className="composer"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (text.trim()) send({ body: text });
                }}
              >
                <button type="button" className={`gif-toggle ${picker ? 'on' : ''}`} onClick={() => setPicker((p) => !p)}>
                  GIF
                </button>
                <MentionInput
                  className="input"
                  placeholder="Write a comment… type @ to mention"
                  value={text}
                  onChange={setText}
                  members={members}
                  maxLength={1000}
                />
                <button className="btn btn--accent btn--sm" disabled={sending || !text.trim()}>
                  Send
                </button>
              </form>
            </div>
          </aside>
        </>
      )}
    </Modal>
  );
}
