import bcrypt from 'bcryptjs';
import { handleUpload } from '@vercel/blob/client';
import { del } from '@vercel/blob';
import { sql, migrate, HttpError } from './db.js';
import { signToken, requireUser } from './auth.js';

const REACTIONS = ['❤️', '😂', '🔥', '😭', '🥹', '👏', '😮', '💯'];
const COLORS = ['#f5b041', '#e74c3c', '#1abc9c', '#3498db', '#9b59b6', '#e67e22', '#2ecc71', '#ff6b9d'];
const MAX_UPLOAD_BYTES = 200 * 1024 * 1024;

function clean(value, max) {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  if (!s) return null;
  return s.slice(0, max);
}

function publicUser(u) {
  return { id: u.id, username: u.username, displayName: u.display_name, avatarColor: u.avatar_color, avatarUrl: u.avatar_url, createdAt: u.created_at };
}

async function removeBlobs(urls) {
  const list = urls.filter(Boolean);
  if (!list.length || !process.env.BLOB_READ_WRITE_TOKEN) return;
  try {
    await del(list);
  } catch (e) {
    console.warn('Blob delete failed', e.message);
  }
}

// ---------- auth ----------
async function register(req) {
  const { username, displayName, password, inviteCode } = req.body || {};
  const expected = process.env.INVITE_CODE;
  if (expected && String(inviteCode || '').trim().toLowerCase() !== expected.trim().toLowerCase()) {
    throw new HttpError(403, 'That invite code is not right. Ask a Wave 49A admin for it.');
  }
  const uname = clean(username, 30)?.toLowerCase();
  if (!uname || !/^[a-z0-9_.]{3,30}$/.test(uname)) throw new HttpError(400, 'Username must be 3–30 letters, numbers, dots or underscores.');
  const name = clean(displayName, 40) || uname;
  if (!password || String(password).length < 6) throw new HttpError(400, 'Password must be at least 6 characters.');
  const exists = await sql`SELECT 1 FROM users WHERE username = ${uname}`;
  if (exists.length) throw new HttpError(409, 'That username is taken.');
  const hash = await bcrypt.hash(String(password), 10);
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  const rows = await sql`INSERT INTO users (username, display_name, password_hash, avatar_color)
    VALUES (${uname}, ${name}, ${hash}, ${color}) RETURNING *`;
  return { token: await signToken(rows[0].id), user: publicUser(rows[0]) };
}

async function login(req) {
  const { username, password } = req.body || {};
  const rows = await sql`SELECT * FROM users WHERE username = ${String(username || '').trim().toLowerCase()}`;
  const u = rows[0];
  if (!u || !(await bcrypt.compare(String(password || ''), u.password_hash))) {
    throw new HttpError(401, 'Wrong username or password.');
  }
  return { token: await signToken(u.id), user: publicUser(u) };
}

async function updateMe(req, me) {
  const name = clean(req.body?.displayName, 40);
  const color = COLORS.includes(req.body?.avatarColor) ? req.body.avatarColor : null;
  const rows = await sql`UPDATE users SET
      display_name = COALESCE(${name}, display_name),
      avatar_color = COALESCE(${color}, avatar_color)
    WHERE id = ${me.id} RETURNING *`;
  return { user: publicUser(rows[0]) };
}

// ---------- albums ----------
async function listAlbums() {
  const rows = await sql`
    SELECT a.*, to_char(a.event_date, 'YYYY-MM-DD') AS event_on, u.display_name AS creator_name,
      (SELECT COUNT(*)::int FROM memories m WHERE m.album_id = a.id) AS memory_count,
      (SELECT m.media_url FROM memories m WHERE m.album_id = a.id AND m.media_type = 'image' ORDER BY m.created_at DESC LIMIT 1) AS cover_url,
      (SELECT m.media_url FROM memories m WHERE m.album_id = a.id ORDER BY m.created_at DESC LIMIT 1) AS latest_url,
      (SELECT m.media_type FROM memories m WHERE m.album_id = a.id ORDER BY m.created_at DESC LIMIT 1) AS latest_type,
      (SELECT MAX(m.created_at) FROM memories m WHERE m.album_id = a.id) AS last_upload_at
    FROM albums a LEFT JOIN users u ON u.id = a.created_by
    ORDER BY COALESCE((SELECT MAX(m.created_at) FROM memories m WHERE m.album_id = a.id), a.created_at) DESC`;
  return { albums: rows.map(albumOut) };
}

function albumOut(a) {
  return {
    id: a.id, title: a.title, subtitle: a.subtitle, description: a.description, emoji: a.emoji,
    eventDate: a.event_on ?? null, createdAt: a.created_at, createdBy: a.created_by, creatorName: a.creator_name,
    memoryCount: a.memory_count ?? 0, coverUrl: a.cover_url, latestUrl: a.latest_url, latestType: a.latest_type,
    lastUploadAt: a.last_upload_at,
  };
}

async function createAlbum(req, me) {
  const title = clean(req.body?.title, 60);
  if (!title) throw new HttpError(400, 'Give the album a name, like “Swimming”.');
  const subtitle = clean(req.body?.subtitle, 80);
  const description = clean(req.body?.description, 500);
  const emoji = clean(req.body?.emoji, 8);
  const eventDate = /^\d{4}-\d{2}-\d{2}$/.test(req.body?.eventDate || '') ? req.body.eventDate : null;
  const rows = await sql`INSERT INTO albums (title, subtitle, description, emoji, event_date, created_by)
    VALUES (${title}, ${subtitle}, ${description}, ${emoji}, ${eventDate}, ${me.id})
    RETURNING *, to_char(event_date, 'YYYY-MM-DD') AS event_on`;
  return { album: albumOut({ ...rows[0], creator_name: me.display_name }) };
}

async function getAlbum(id, me) {
  const rows = await sql`SELECT a.*, to_char(a.event_date, 'YYYY-MM-DD') AS event_on, u.display_name AS creator_name FROM albums a LEFT JOIN users u ON u.id = a.created_by WHERE a.id = ${id}`;
  if (!rows[0]) throw new HttpError(404, 'Album not found.');
  const memories = await memoryQuery(me.id, { albumId: id });
  return { album: albumOut({ ...rows[0], memory_count: memories.length }), memories };
}

async function deleteAlbum(id, me) {
  const rows = await sql`SELECT created_by FROM albums WHERE id = ${id}`;
  if (!rows[0]) throw new HttpError(404, 'Album not found.');
  if (rows[0].created_by !== me.id) throw new HttpError(403, 'Only the person who made this album can delete it.');
  const media = await sql`SELECT media_url FROM memories WHERE album_id = ${id}`;
  await sql`DELETE FROM albums WHERE id = ${id}`;
  await removeBlobs(media.map((m) => m.media_url));
  return { ok: true };
}

// ---------- memories ----------
async function memoryQuery(meId, { albumId = null, memoryId = null, limit = 500 } = {}) {
  const rows = await sql`
    SELECT m.*, to_char(m.taken_at, 'YYYY-MM-DD') AS taken_on, a.title AS album_title, a.emoji AS album_emoji,
      u.username, u.display_name, u.avatar_color, u.avatar_url,
      (SELECT COUNT(*)::int FROM comments c WHERE c.memory_id = m.id) AS comment_count,
      COALESCE((SELECT json_object_agg(r.emoji, r.n) FROM
        (SELECT emoji, COUNT(*)::int AS n FROM reactions WHERE memory_id = m.id GROUP BY emoji) r), '{}'::json) AS reactions,
      COALESCE((SELECT json_agg(emoji) FROM reactions WHERE memory_id = m.id AND user_id = ${meId}), '[]'::json) AS my_reactions
    FROM memories m
    JOIN albums a ON a.id = m.album_id
    LEFT JOIN users u ON u.id = m.user_id
    WHERE (${albumId}::int IS NULL OR m.album_id = ${albumId}::int)
      AND (${memoryId}::int IS NULL OR m.id = ${memoryId}::int)
    ORDER BY m.created_at DESC
    LIMIT ${limit}`;
  return rows.map((m) => ({
    id: m.id, albumId: m.album_id, albumTitle: m.album_title, albumEmoji: m.album_emoji,
    mediaUrl: m.media_url, mediaType: m.media_type, caption: m.caption, takenAt: m.taken_on, createdAt: m.created_at,
    uploader: m.user_id ? { id: m.user_id, username: m.username, displayName: m.display_name, avatarColor: m.avatar_color, avatarUrl: m.avatar_url } : null,
    commentCount: m.comment_count, reactions: m.reactions || {}, myReactions: m.my_reactions || [],
  }));
}

async function createMemories(req, me) {
  const albumId = Number(req.body?.albumId);
  const items = Array.isArray(req.body?.items) ? req.body.items.slice(0, 50) : [];
  if (!albumId || !items.length) throw new HttpError(400, 'Nothing to save.');
  const album = await sql`SELECT id FROM albums WHERE id = ${albumId}`;
  if (!album[0]) throw new HttpError(404, 'Album not found.');
  const created = [];
  for (const it of items) {
    const url = String(it.mediaUrl || '');
    if (!/^https:\/\/[^/]+\.blob\.vercel-storage\.com\//.test(url)) throw new HttpError(400, 'Upload URL is not a Vercel Blob URL.');
    const type = it.mediaType === 'video' ? 'video' : 'image';
    const caption = clean(it.caption, 500);
    const takenAt = /^\d{4}-\d{2}-\d{2}$/.test(it.takenAt || '') ? it.takenAt : null;
    const rows = await sql`INSERT INTO memories (album_id, user_id, media_url, media_type, caption, taken_at)
      VALUES (${albumId}, ${me.id}, ${url}, ${type}, ${caption}, ${takenAt}) RETURNING id`;
    created.push(rows[0].id);
  }
  return { created };
}

async function getMemory(id, me) {
  const [memory] = await memoryQuery(me.id, { memoryId: id, limit: 1 });
  if (!memory) throw new HttpError(404, 'Memory not found.');
  const comments = await sql`
    SELECT c.*, u.username, u.display_name, u.avatar_color, u.avatar_url
    FROM comments c LEFT JOIN users u ON u.id = c.user_id
    WHERE c.memory_id = ${id} ORDER BY c.created_at`;
  const reactors = await sql`
    SELECT r.emoji, u.display_name FROM reactions r JOIN users u ON u.id = r.user_id
    WHERE r.memory_id = ${id} ORDER BY r.created_at`;
  return {
    memory,
    reactors,
    comments: comments.map((c) => ({
      id: c.id, body: c.body, gifUrl: c.gif_url, createdAt: c.created_at,
      user: c.user_id ? { id: c.user_id, username: c.username, displayName: c.display_name, avatarColor: c.avatar_color, avatarUrl: c.avatar_url } : null,
    })),
  };
}

async function updateMemory(id, req, me) {
  const rows = await sql`SELECT user_id FROM memories WHERE id = ${id}`;
  if (!rows[0]) throw new HttpError(404, 'Memory not found.');
  if (rows[0].user_id !== me.id) throw new HttpError(403, 'Only the uploader can edit this.');
  const caption = clean(req.body?.caption, 500);
  await sql`UPDATE memories SET caption = ${caption} WHERE id = ${id}`;
  return { ok: true };
}

async function deleteMemory(id, me) {
  const rows = await sql`SELECT user_id, media_url FROM memories WHERE id = ${id}`;
  if (!rows[0]) throw new HttpError(404, 'Memory not found.');
  if (rows[0].user_id !== me.id) throw new HttpError(403, 'Only the uploader can delete this.');
  await sql`DELETE FROM memories WHERE id = ${id}`;
  await removeBlobs([rows[0].media_url]);
  return { ok: true };
}

// ---------- comments & reactions ----------
async function addComment(memoryId, req, me) {
  const body = clean(req.body?.body, 1000);
  let gif = clean(req.body?.gifUrl, 600);
  if (gif && !/^https:\/\//i.test(gif)) throw new HttpError(400, 'GIF link must start with https://');
  if (!body && !gif) throw new HttpError(400, 'Write something or pick a GIF.');
  const m = await sql`SELECT 1 FROM memories WHERE id = ${memoryId}`;
  if (!m[0]) throw new HttpError(404, 'Memory not found.');
  await sql`INSERT INTO comments (memory_id, user_id, body, gif_url) VALUES (${memoryId}, ${me.id}, ${body}, ${gif})`;
  return getMemory(memoryId, me);
}

async function deleteComment(id, me) {
  const rows = await sql`SELECT user_id FROM comments WHERE id = ${id}`;
  if (!rows[0]) throw new HttpError(404, 'Comment not found.');
  if (rows[0].user_id !== me.id) throw new HttpError(403, 'You can only delete your own comments.');
  await sql`DELETE FROM comments WHERE id = ${id}`;
  return { ok: true };
}

async function toggleReaction(memoryId, req, me) {
  const emoji = req.body?.emoji;
  if (!REACTIONS.includes(emoji)) throw new HttpError(400, 'Unknown reaction.');
  const removed = await sql`DELETE FROM reactions WHERE memory_id = ${memoryId} AND user_id = ${me.id} AND emoji = ${emoji} RETURNING 1`;
  if (!removed.length) {
    await sql`INSERT INTO reactions (memory_id, user_id, emoji) VALUES (${memoryId}, ${me.id}, ${emoji}) ON CONFLICT DO NOTHING`;
  }
  const [memory] = await memoryQuery(me.id, { memoryId, limit: 1 });
  return { memory };
}

// ---------- members, feed, gifs, uploads ----------
async function members() {
  const rows = await sql`
    SELECT u.*,
      (SELECT COUNT(*)::int FROM memories m WHERE m.user_id = u.id) AS upload_count,
      (SELECT COUNT(*)::int FROM comments c WHERE c.user_id = u.id) AS comment_count
    FROM users u ORDER BY upload_count DESC, u.created_at`;
  return { members: rows.map((u) => ({ ...publicUser(u), uploadCount: u.upload_count, commentCount: u.comment_count })) };
}

async function gifs(url) {
  const key = process.env.GIPHY_API_KEY;
  if (!key) return { enabled: false, results: [] };
  const q = (url.searchParams.get('q') || '').slice(0, 50);
  const endpoint = q
    ? `https://api.giphy.com/v1/gifs/search?api_key=${key}&q=${encodeURIComponent(q)}&limit=24&rating=pg-13`
    : `https://api.giphy.com/v1/gifs/trending?api_key=${key}&limit=24&rating=pg-13`;
  const r = await fetch(endpoint);
  if (!r.ok) throw new HttpError(502, 'GIF search is not available right now.');
  const data = await r.json();
  return {
    enabled: true,
    results: (data.data || []).map((g) => ({
      id: g.id,
      title: g.title,
      preview: g.images?.fixed_width_small?.url || g.images?.fixed_width?.url,
      url: g.images?.fixed_height?.url || g.images?.original?.url,
    })),
  };
}

async function upload(req) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new HttpError(500, 'BLOB_READ_WRITE_TOKEN is not set. Connect a Vercel Blob store.');
  return handleUpload({
    body: req.body,
    request: req,
    onBeforeGenerateToken: async () => {
      await requireUser(req);
      return {
        allowedContentTypes: ['image/*', 'video/*'],
        maximumSizeInBytes: MAX_UPLOAD_BYTES,
        addRandomSuffix: true,
      };
    },
  });
}

// ---------- router ----------
export async function route(req, path, url) {
  const method = req.method;
  const seg = path.split('/').filter(Boolean);
  const id = seg[1] ? Number(seg[1]) : null;
  if (seg[1] && !Number.isInteger(id) && seg[0] !== 'auth') throw new HttpError(404, 'Not found.');

  if (seg[0] === 'health') return { ok: true, giphy: !!process.env.GIPHY_API_KEY, invite: !!process.env.INVITE_CODE };

  await migrate();

  if (seg[0] === 'auth') {
    if (seg[1] === 'register' && method === 'POST') return register(req);
    if (seg[1] === 'login' && method === 'POST') return login(req);
    const me = await requireUser(req);
    if (seg[1] === 'me' && method === 'GET') return { user: publicUser(me) };
    if (seg[1] === 'me' && method === 'PATCH') return updateMe(req, me);
  }

  if (seg[0] === 'upload' && method === 'POST') return upload(req);

  const me = await requireUser(req);

  if (seg[0] === 'albums') {
    if (!id && method === 'GET') return listAlbums();
    if (!id && method === 'POST') return createAlbum(req, me);
    if (id && method === 'GET') return getAlbum(id, me);
    if (id && method === 'DELETE') return deleteAlbum(id, me);
  }
  if (seg[0] === 'memories') {
    if (!id && method === 'GET') return { memories: await memoryQuery(me.id, { limit: Math.min(Number(url.searchParams.get('limit')) || 40, 200) }) };
    if (!id && method === 'POST') return createMemories(req, me);
    if (id && seg[2] === 'comments' && method === 'POST') return addComment(id, req, me);
    if (id && seg[2] === 'reactions' && method === 'POST') return toggleReaction(id, req, me);
    if (id && !seg[2] && method === 'GET') return getMemory(id, me);
    if (id && !seg[2] && method === 'PATCH') return updateMemory(id, req, me);
    if (id && !seg[2] && method === 'DELETE') return deleteMemory(id, me);
  }
  if (seg[0] === 'comments' && id && method === 'DELETE') return deleteComment(id, me);
  if (seg[0] === 'members' && method === 'GET') return members();
  if (seg[0] === 'gifs' && method === 'GET') return gifs(url);

  throw new HttpError(404, 'Not found.');
}
