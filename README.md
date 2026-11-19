# Wave 49A Memories

A private photo and video wall for our BPO wave: albums ("Swimming", "Training Days"…), uploads that record who posted them and when, comments, emoji reactions, GIFs and emotes.

**Stack:** React + Vite + Framer Motion · Neon Postgres (data) · Vercel Blob (photos/videos) · one Vercel serverless function (`api/index.js`).

## Features
- Accounts with username/password. Sign-up needs an invite code that an admin creates per team, with optional limits, expiry and revoke.
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
   | `ADMIN_USERNAMES` | your username, e.g. `jeth` (comma-separate several) |
   | `INVITE_CODE` | optional shared backup code; leave empty to use only admin-made codes |
   | `GIPHY_API_KEY` | optional, free at developers.giphy.com |
6. **Redeploy.** Tables are created automatically on the first request.
7. **Become admin:** open the site, choose *Join the wave*, and sign up with the username you put in `ADMIN_USERNAMES`. No code is needed. An **Admin** tab appears in the menu.

## Inviting teams (admins)
1. Open **Admin → New invite**. Enter who it's for (e.g. "Team Alpha"), plus an optional sign-up limit and expiry.
2. Click **Create code & copy link**, then send the link (`…/?invite=W49A-XXXX-XXXX`) in your team chat. It opens sign-up with the code filled in. People can also type the code by hand.
3. Each card shows how many people joined and who they are. **Revoke** stops new sign-ups with that code; people who already joined keep their accounts.
4. Under **Members** you can see which code each person used and make other people admins.

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
