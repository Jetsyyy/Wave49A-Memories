import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../auth.jsx';
import { SplitTitle } from '../components/bits.jsx';
import { Logo } from '../components/Nav.jsx';

const WORDS = ['training days', 'graveyard shifts', 'first calls', 'payday feasts', 'swimming trips', 'the bonds'];

export default function AuthPage() {
  const { signIn } = useAuth();
  const [mode, setMode] = useState('login');
  const [f, setF] = useState({ username: '', password: '', displayName: '', inviteCode: '' });
  const [needsInvite, setNeedsInvite] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [w, setW] = useState(0);

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((d) => setNeedsInvite(!!d.invite))
      .catch(() => {});
    const t = setInterval(() => setW((x) => (x + 1) % WORDS.length), 2200);
    return () => clearInterval(t);
  }, []);

  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await signIn(mode, f);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <div className="auth-orbs" aria-hidden>
        <span /><span /><span />
      </div>
      <div className="auth-left">
        <Logo />
        <div>
          <p className="eyebrow light">Our BPO journey</p>
          <h1 className="auth-title">
            <SplitTitle text="Wave 49A" />
            <br />
            <SplitTitle text="Memories" className="accent" />
          </h1>
          <p className="auth-rotator">
            For the{' '}
            <AnimatePresence mode="wait">
              <motion.span key={w} initial={{ y: 18, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -18, opacity: 0 }}>
                {WORDS[w]}
              </motion.span>
            </AnimatePresence>
          </p>
        </div>
        <small className="muted">Private to Wave 49A.</small>
      </div>

      <motion.form
        className="auth-card"
        onSubmit={submit}
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="tabs">
          <button type="button" className={mode === 'login' ? 'on' : ''} onClick={() => setMode('login')}>Log in</button>
          <button type="button" className={mode === 'register' ? 'on' : ''} onClick={() => setMode('register')}>Join the wave</button>
          <motion.span className="tabs-ink" layout style={{ left: mode === 'login' ? 4 : '50%' }} />
        </div>

        <AnimatePresence initial={false}>
          {mode === 'register' && (
            <motion.label className="field" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
              <span>Your name</span>
              <input className="input" value={f.displayName} onChange={set('displayName')} placeholder="Juan Dela Cruz" maxLength={40} />
            </motion.label>
          )}
        </AnimatePresence>
        <label className="field">
          <span>Username</span>
          <input className="input" value={f.username} onChange={set('username')} placeholder="juan.dc" autoComplete="username" required />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            className="input"
            type="password"
            value={f.password}
            onChange={set('password')}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            minLength={mode === 'register' ? 6 : undefined}
            required
          />
        </label>
        <AnimatePresence initial={false}>
          {mode === 'register' && needsInvite && (
            <motion.label className="field" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
              <span>Invite code</span>
              <input className="input" value={f.inviteCode} onChange={set('inviteCode')} placeholder="Ask your wave admin" required />
            </motion.label>
          )}
        </AnimatePresence>
        {error && <p className="error">{error}</p>}
        <button className="btn btn--accent btn--block" disabled={busy}>
          {busy ? 'One sec…' : mode === 'login' ? 'Log in' : 'Create account'}
        </button>
      </motion.form>
    </div>
  );
}
