import { neon } from '@neondatabase/serverless';

let _sql;
export function sql(strings, ...values) {
  if (!_sql) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new HttpError(500, 'DATABASE_URL is not set. Add your Neon connection string to the environment.');
    }
    _sql = url.startsWith('pglite:') ? pgliteSql(url.slice(7)) : neon(url);
  }
  return _sql(strings, ...values);
}

// Local-only: DATABASE_URL=pglite:./.localdb runs an embedded Postgres so you can try the app without Neon.
function pgliteSql(dir) {
  const db = import('@electric-sql/pglite').then(({ PGlite }) => new PGlite(dir || undefined));
  return async (strings, ...values) => {
    const text = strings.reduce((acc, s, i) => acc + `$${i}` + s);
    const res = await (await db).query(text, values);
    return res.rows;
  };
}

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Tables are created automatically on the first request, so no manual SQL step is needed.
let migrated;
export function migrate() {
  if (!migrated) {
    migrated = (async () => {
      await sql`CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        display_name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        avatar_color TEXT NOT NULL DEFAULT '#f5b041',
        avatar_url TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`;
      await sql`CREATE TABLE IF NOT EXISTS albums (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        subtitle TEXT,
        description TEXT,
        emoji TEXT,
        event_date DATE,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`;
      await sql`CREATE TABLE IF NOT EXISTS memories (
        id SERIAL PRIMARY KEY,
        album_id INTEGER NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        media_url TEXT NOT NULL,
        media_type TEXT NOT NULL CHECK (media_type IN ('image','video')),
        caption TEXT,
        taken_at DATE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`;
      await sql`CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        memory_id INTEGER NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        body TEXT,
        gif_url TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`;
      await sql`CREATE TABLE IF NOT EXISTS reactions (
        memory_id INTEGER NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        emoji TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (memory_id, user_id, emoji)
      )`;
      await sql`CREATE INDEX IF NOT EXISTS memories_album_idx ON memories(album_id, created_at DESC)`;
      await sql`CREATE INDEX IF NOT EXISTS comments_memory_idx ON comments(memory_id, created_at)`;
    })().catch((e) => {
      migrated = undefined;
      throw e;
    });
  }
  return migrated;
}
