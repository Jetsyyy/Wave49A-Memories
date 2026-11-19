// Single Vercel function that serves every /api/* route (keeps us well under the Hobby function limit).
import { route } from '../server/router.js';

async function readBody(req) {
  if (req.body !== undefined) return typeof req.body === 'string' ? safeJson(req.body) : req.body;
  if (req.method === 'GET' || req.method === 'HEAD') return undefined;
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return safeJson(Buffer.concat(chunks).toString('utf8'));
}

function safeJson(s) {
  if (!s) return undefined;
  try {
    return JSON.parse(s);
  } catch {
    return undefined;
  }
}

export default async function handler(req, res) {
  const url = new URL(req.url, 'http://localhost');
  // vercel.json rewrites /api/<path> -> /api?path=<path>; locally the dev server keeps the full path.
  const path = url.searchParams.get('path') ?? url.pathname.replace(/^\/api\/?/, '');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  try {
    req.body = await readBody(req);
    const data = await route(req, path, url);
    res.statusCode = 200;
    res.end(JSON.stringify(data ?? {}));
  } catch (e) {
    const status = e.status || 500;
    if (status >= 500) console.error(e);
    res.statusCode = status;
    res.end(JSON.stringify({ error: e.message || 'Something went wrong.' }));
  }
}
