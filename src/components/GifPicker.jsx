import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { QUICK_EMOTES } from '../utils.js';
import { Spinner } from './bits.jsx';

// GIPHY search when GIPHY_API_KEY is set on the server; otherwise animated emotes + paste a GIF link.
export default function GifPicker({ onPick, onEmote, onClose }) {
  const [q, setQ] = useState('');
  const [state, setState] = useState({ loading: true, enabled: false, results: [] });
  const [link, setLink] = useState('');

  useEffect(() => {
    let live = true;
    setState((s) => ({ ...s, loading: true }));
    const t = setTimeout(() => {
      api(`gifs?q=${encodeURIComponent(q)}`)
        .then((d) => live && setState({ loading: false, enabled: d.enabled, results: d.results }))
        .catch(() => live && setState({ loading: false, enabled: false, results: [] }));
    }, 300);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [q]);

  return (
    <div className="gifpicker">
      <div className="gifpicker-head">
        <strong>GIFs & emotes</strong>
        <button className="link-btn" onClick={onClose}>close</button>
      </div>
      <div className="emote-row">
        {QUICK_EMOTES.map((e) => (
          <button key={e} className="emote" onClick={() => onEmote(e)}>
            {e}
          </button>
        ))}
      </div>
      {state.enabled ? (
        <>
          <input className="input" placeholder="Search GIPHY…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
          <div className="gif-grid">
            {state.loading ? (
              <Spinner />
            ) : (
              state.results.map((g) => (
                <button key={g.id} className="gif-item" onClick={() => onPick(g.url)}>
                  <img src={g.preview} alt={g.title} loading="lazy" />
                </button>
              ))
            )}
          </div>
          <small className="muted">Powered by GIPHY</small>
        </>
      ) : (
        !state.loading && (
          <form
            className="gif-link"
            onSubmit={(e) => {
              e.preventDefault();
              if (/^https:\/\//i.test(link.trim())) onPick(link.trim());
            }}
          >
            <input className="input" placeholder="Paste a GIF link (https://…gif)" value={link} onChange={(e) => setLink(e.target.value)} />
            <button className="btn btn--sm btn--accent" type="submit">Send</button>
          </form>
        )
      )}
    </div>
  );
}
