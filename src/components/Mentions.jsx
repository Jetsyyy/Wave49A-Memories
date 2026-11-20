import { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { api } from '../api.js';
import { Avatar } from './bits.jsx';

// Members are fetched once and shared by every comment box on the page.
let membersPromise;
export function useMembers() {
  const [members, setMembers] = useState([]);
  useEffect(() => {
    if (!membersPromise) {
      membersPromise = api('members')
        .then((d) => d.members)
        .catch(() => {
          membersPromise = undefined;
          return [];
        });
    }
    let live = true;
    membersPromise.then((m) => live && setMembers(m));
    return () => {
      live = false;
    };
  }, []);
  return members;
}

const MENTION_SPLIT = /(@[a-z0-9_.]{3,30})/gi;

// Comment text with @username highlighted when it matches a real member.
export function MentionText({ text, members }) {
  const byName = useMemo(() => new Map(members.map((m) => [m.username.toLowerCase(), m])), [members]);
  return String(text)
    .split(MENTION_SPLIT)
    .map((part, i) => {
      const m = part.startsWith('@') ? byName.get(part.slice(1).toLowerCase().replace(/\.$/, '')) : null;
      return m ? (
        <span key={i} className="mention" title={m.displayName}>
          @{m.username}
        </span>
      ) : (
        part
      );
    });
}

// Text input that suggests members after typing "@".
export const MentionInput = forwardRef(function MentionInput({ value, onChange, members, ...rest }, outerRef) {
  const innerRef = useRef(null);
  const ref = outerRef || innerRef;
  const [query, setQuery] = useState(null); // text typed after "@", or null when not mentioning
  const [active, setActive] = useState(0);

  const matches = useMemo(() => {
    if (query === null) return [];
    const q = query.toLowerCase();
    return members
      .filter((m) => m.username.toLowerCase().startsWith(q) || m.displayName.toLowerCase().includes(q))
      .slice(0, 6);
  }, [query, members]);

  const detect = (text, caret) => {
    const m = text.slice(0, caret).match(/(^|\s)@([a-z0-9_.]*)$/i);
    setQuery(m ? m[2] : null);
    setActive(0);
  };

  const pick = (member) => {
    const el = ref.current;
    const caret = el?.selectionStart ?? value.length;
    const before = value.slice(0, caret).replace(/@([a-z0-9_.]*)$/i, `@${member.username} `);
    const next = before + value.slice(caret);
    onChange(next);
    setQuery(null);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(before.length, before.length);
    });
  };

  return (
    <div className="mention-wrap">
      <AnimatePresence>
        {matches.length > 0 && (
          <motion.ul
            className="mention-list"
            role="listbox"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.15 }}
          >
            {matches.map((m, i) => (
              <li key={m.id} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  className={i === active ? 'on' : ''}
                  onMouseDown={(e) => {
                    e.preventDefault(); // keep focus in the input
                    pick(m);
                  }}
                  onMouseEnter={() => setActive(i)}
                >
                  <Avatar user={m} size={24} />
                  <strong>{m.displayName}</strong>
                  <span>@{m.username}</span>
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
      <input
        ref={ref}
        {...rest}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          detect(e.target.value, e.target.selectionStart);
        }}
        onClick={(e) => detect(e.target.value, e.target.selectionStart)}
        onBlur={() => setTimeout(() => setQuery(null), 120)}
        onKeyDown={(e) => {
          if (!matches.length) return;
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((a) => (a + 1) % matches.length);
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((a) => (a - 1 + matches.length) % matches.length);
          } else if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            pick(matches[active]);
          } else if (e.key === 'Escape') {
            // Close just the suggestions, not the whole photo viewer.
            e.nativeEvent.stopPropagation();
            setQuery(null);
          }
        }}
      />
    </div>
  );
});
