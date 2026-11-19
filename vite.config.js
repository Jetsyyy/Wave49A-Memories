import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// In local dev, serve /api/* with the same handler Vercel uses, so `npm run dev` is all you need.
function localApi() {
  return {
    name: 'local-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url.startsWith('/api')) return next();
        try {
          const mod = await server.ssrLoadModule('/api/index.js');
          await mod.default(req, res);
        } catch (e) {
          console.error(e);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: e.message }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''));
  return { plugins: [react(), localApi()] };
});
