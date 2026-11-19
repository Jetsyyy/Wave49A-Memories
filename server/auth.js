import { SignJWT, jwtVerify } from 'jose';
import { HttpError, sql } from './db.js';

function secret() {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 16) throw new HttpError(500, 'JWT_SECRET is missing or shorter than 16 characters.');
  return new TextEncoder().encode(s);
}

export async function signToken(userId) {
  return new SignJWT({ sub: String(userId) })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secret());
}

export async function userFromToken(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const rows = await sql`SELECT id, username, display_name, avatar_color, avatar_url, created_at, is_admin FROM users WHERE id = ${Number(payload.sub)}`;
    const u = rows[0];
    if (u && !u.is_admin && isBootstrapAdmin(u.username)) {
      await sql`UPDATE users SET is_admin = true WHERE id = ${u.id}`;
      u.is_admin = true;
    }
    return u || null;
  } catch {
    return null;
  }
}

export function bearer(req) {
  const h = req.headers.authorization || req.headers.Authorization || '';
  return h.startsWith('Bearer ') ? h.slice(7) : null;
}

export async function requireUser(req) {
  const user = await userFromToken(bearer(req));
  if (!user) throw new HttpError(401, 'Please log in first.');
  return user;
}

// The site owner is always an admin. More admins can be listed in ADMIN_USERNAMES (comma separated).
// These usernames can sign up without an invite code.
const OWNERS = ['jethskii'];

export function isBootstrapAdmin(username) {
  const list = (process.env.ADMIN_USERNAMES || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const name = String(username || '').toLowerCase();
  return OWNERS.includes(name) || list.includes(name);
}

export function requireAdmin(user) {
  if (!user?.is_admin) throw new HttpError(403, 'Admins only.');
}
