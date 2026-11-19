import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Avatar, Reveal, Spinner } from '../components/bits.jsx';
import { fmtDate } from '../utils.js';

const EXPIRY = [
  ['', 'Never expires'],
  ['1', '1 day'],
  ['7', '7 days'],
  ['30', '30 days'],
  ['90', '90 days'],
];

function useCopy() {
  const [copied, setCopied] = useState('');
  const copy = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const t = document.createElement('textarea');
      t.value = text;
      document.body.appendChild(t);
      t.select();
      document.execCommand('copy');
      t.remove();
    }
    setCopied(key);
    setTimeout(() => setCopied(''), 1600);
  };
  return [copied, copy];
}

function InviteCard({ invite, onToggle, copied, copy }) {
  const link = `${window.location.origin}/?invite=${encodeURIComponent(invite.code)}`;
  const active = invite.status === 'active';
  return (
    <motion.div layout className={`invite-card ${active ? '' : 'invite-card--off'}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="invite-top">
        <strong className="invite-label">{invite.label || 'Untitled invite'}</strong>
        <span className={`pill pill--${invite.status.replace(' ', '-')}`}>{invite.status}</span>
      </div>
      <button className="invite-code" onClick={() => copy(invite.code, `c${invite.id}`)} title="Copy code">
        {invite.code}
        <small>{copied === `c${invite.id}` ? 'Copied!' : 'Tap to copy'}</small>
      </button>
      <div className="invite-stats">
        <span>
          <b>{invite.uses}</b>
          {invite.maxUses ? ` / ${invite.maxUses}` : ''} joined
        </span>
        <span>{invite.expiresAt ? `Expires ${fmtDate(invite.expiresAt)}` : 'No expiry'}</span>
      </div>
      {invite.members.length > 0 && <p className="invite-members">{invite.members.join(', ')}</p>}
      <div className="row">
        {active && (
          <button className="btn btn--sm btn--accent" onClick={() => copy(link, `l${invite.id}`)}>
            {copied === `l${invite.id}` ? 'Link copied!' : 'Copy invite link'}
          </button>
        )}
        {invite.status !== 'expired' && invite.status !== 'used up' && (
          <button className="btn btn--sm btn--ghost-dark" onClick={() => onToggle(invite)}>
            {invite.revoked ? 'Turn back on' : 'Revoke'}
          </button>
        )}
      </div>
      <small className="muted">
        Made by {invite.createdBy || 'an admin'} · {fmtDate(invite.createdAt)}
      </small>
    </motion.div>
  );
}

export default function Admin() {
  const { user } = useAuth();
  const [invites, setInvites] = useState(null);
  const [members, setMembers] = useState(null);
  const [form, setForm] = useState({ label: '', maxUses: '', expiresInDays: '7', code: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, copy] = useCopy();

  const load = useCallback(() => {
    api('admin/invites').then((d) => setInvites(d.invites)).catch((e) => setError(e.message));
    api('admin/members').then((d) => setMembers(d.members)).catch((e) => setError(e.message));
  }, []);

  useEffect(load, [load]);

  if (!user.isAdmin) {
    return (
      <section className="section dark page-top">
        <h2 className="display">Admins only</h2>
        <p className="muted">Ask a Wave 49A admin if you need an invite code for someone.</p>
      </section>
    );
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const create = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const d = await api('admin/invites', { method: 'POST', body: form });
      setInvites((list) => [d.invite, ...(list || [])]);
      setForm({ label: '', maxUses: '', expiresInDays: '7', code: '' });
      copy(`${window.location.origin}/?invite=${encodeURIComponent(d.invite.code)}`, `l${d.invite.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (inv) => {
    if (!inv.revoked && !confirm(`Revoke “${inv.label || inv.code}”? Nobody new can join with it. People who already joined keep their accounts.`)) return;
    await api(`admin/invites/${inv.id}`, { method: 'PATCH', body: { revoked: !inv.revoked } });
    load();
  };

  const setAdmin = async (m, isAdmin) => {
    if (!confirm(isAdmin ? `Make ${m.displayName} an admin? They'll be able to create invite codes.` : `Remove admin from ${m.displayName}?`)) return;
    try {
      await api(`admin/members/${m.id}`, { method: 'PATCH', body: { isAdmin } });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="section dark page-top admin">
      <Reveal>
        <p className="eyebrow light">Admin</p>
        <h2 className="display">Invite codes</h2>
        <p className="lede light">
          Make a code for each team or batch, then send them the link. Anyone with an active code can create an account.
        </p>
      </Reveal>

      <div className="admin-grid">
        <form className="admin-form" onSubmit={create}>
          <h3>New invite</h3>
          <label className="field">
            <span>Who is it for?</span>
            <input className="input" value={form.label} onChange={set('label')} placeholder="Team Alpha" maxLength={60} />
          </label>
          <div className="field-row">
            <label className="field">
              <span>Max sign-ups</span>
              <input className="input" type="number" min="1" value={form.maxUses} onChange={set('maxUses')} placeholder="Unlimited" />
            </label>
            <label className="field">
              <span>Expires</span>
              <select className="input" value={form.expiresInDays} onChange={set('expiresInDays')}>
                {EXPIRY.map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="field">
            <span>Custom code (optional)</span>
            <input className="input" value={form.code} onChange={set('code')} placeholder="Leave blank for a random one" maxLength={40} />
          </label>
          {error && <p className="error">{error}</p>}
          <button className="btn btn--accent btn--block" disabled={busy}>
            {busy ? 'Creating…' : 'Create code & copy link'}
          </button>
        </form>

        <div>
          {!invites ? (
            <Spinner />
          ) : invites.length === 0 ? (
            <p className="muted">No invite codes yet. Make one for your first team.</p>
          ) : (
            <div className="invite-list">
              <AnimatePresence>
                {invites.map((inv) => (
                  <InviteCard key={inv.id} invite={inv} onToggle={toggle} copied={copied} copy={copy} />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      <Reveal>
        <h2 className="display admin-sub">Members</h2>
      </Reveal>
      {!members ? (
        <Spinner />
      ) : (
        <div className="member-table">
          {members.map((m) => (
            <div key={m.id} className="member-row">
              <Avatar user={m} size={38} />
              <div className="member-name">
                <strong>
                  {m.displayName} {m.isAdmin && <span className="pill pill--admin">admin</span>}
                </strong>
                <span className="muted">@{m.username} · joined {fmtDate(m.createdAt)}</span>
              </div>
              <span className="member-via muted">{m.inviteLabel ? `via ${m.inviteLabel}` : m.inviteCode ? `via ${m.inviteCode}` : m.lockedAdmin ? 'owner' : '—'}</span>
              {m.lockedAdmin ? (
                <span className="muted member-action">set in Vercel</span>
              ) : m.isAdmin ? (
                <button className="link-btn member-action" onClick={() => setAdmin(m, false)} disabled={m.id === user.id}>
                  Remove admin
                </button>
              ) : (
                <button className="link-btn member-action" onClick={() => setAdmin(m, true)}>
                  Make admin
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
