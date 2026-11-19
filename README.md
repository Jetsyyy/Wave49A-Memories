# Wave 49A Memories

A private photo and video wall for our BPO wave: albums ("Swimming", "Training Days"…), uploads that record who posted them and when, comments, emoji reactions, GIFs and emotes.

**Stack:** React + Vite + Framer Motion · Neon Postgres (data) · Vercel Blob (photos/videos) · one Vercel serverless function (`api/index.js`).

## Features
- Accounts with username/password, gated by an invite code
- Albums with emoji, tagline, event date and story
- Drag-and-drop uploads of photos and videos (up to 200 MB each). Big photos are resized to save space. Every memory stores the uploader, upload date/time and date taken.
- Viewer with 8 reactions (with an emoji burst), comments, quick emotes and GIFs (GIPHY search when a key is set, otherwise paste a GIF link)
- Cinematic home hero slider, a curved 3D reel of recent memories, tilting album cards, masonry grids, and filters by person or media type
- "The Crew" page with everyone's upload and comment counts
- Only the uploader can edit or delete a memory; only the album creator can delete an album

## Deploy (one-time setup)

1. **Push to GitHub**: the repo is `Jetsyyy/Wave49A-Memories`.
2. **Vercel**: *Add New → Project → Import* the repo. The framework is detected as Vite.
3. **Neon database**: in the Vercel project go to *Storage → Create → Neon (Postgres)* and connect it. This adds `DATABASE_URL` automatically.
   (Or create a project at neon.tech, copy the connection string, and add it as `DATABASE_URL`.)
4. **Blob storage**: *Storage → Create → Blob* and connect it to the project. This adds `BLOB_READ_WRITE_TOKEN`.
5. **Environment variables** (*Settings → Environment Variables*):
   | Name | Value |
   |---|---|
   | `JWT_SECRET` | a long random string (32+ chars) |
   | `INVITE_CODE` | the code your wave types to sign up, e.g. `wave49a` |
   | `GIPHY_API_KEY` | optional, free at developers.giphy.com |
6. **Redeploy.** Tables are created automatically on the first request.

## Run locally
```
npm install
cp .env.example .env.local   # then fill in values
npm run dev                  # http://localhost:5173 (API included)
```
To try it without Neon, set `DATABASE_URL=pglite:./.localdb` (embedded Postgres). Uploads still need a `BLOB_READ_WRITE_TOKEN` (`vercel env pull .env.local` gets the real one).

## Free-tier limits to know
- Vercel Blob (Hobby): about 1 GB stored. Videos fill it fast, so keep clips short.
- Neon free: 0.5 GB database, which is plenty for text data.
