export function fmtDate(d, opts = {}) {
  if (!d) return '';
  const date = typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(`${d}T00:00:00`) : new Date(d);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', ...opts });
}

export function fmtDateTime(d) {
  if (!d) return '';
  const date = new Date(d);
  return `${fmtDate(date)} · ${date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
}

export function timeAgo(d) {
  const s = Math.round((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.round(h / 24);
  if (days < 7) return `${days}d ago`;
  return fmtDate(d);
}

export function pad(n) {
  return String(n).padStart(2, '0');
}

export function initials(name = '?') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
}

export const REACTIONS = ['❤️', '😂', '🔥', '😭', '🥹', '👏', '😮', '💯'];
export const AVATAR_COLORS = ['#f5b041', '#e74c3c', '#1abc9c', '#3498db', '#9b59b6', '#e67e22', '#2ecc71', '#ff6b9d'];
export const QUICK_EMOTES = ['🥳', '🫶', '😆', '🤣', '😍', '🙌', '💀', '🌊', '🏊', '☕', '🎤', '🍕'];
