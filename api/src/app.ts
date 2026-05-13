import express from 'express';
import cors from 'cors';
import sessionsRouter from './routes/sessions.js';
import shareRouter from './routes/share.js';

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
      credentials: true,
    })
  );
  app.use(express.json());

  app.get('/health', (_req, res) => res.json({ ok: true }));

  app.use('/api/sessions', sessionsRouter);
  app.use('/api/share', shareRouter);

  // 404 + error handlers
  app.use((_req, res) => res.status(404).json({ error: 'not found' }));
  app.use(
    (
      err: Error,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      console.error('[api] unhandled error:', err);
      res.status(500).json({ error: err.message || 'internal error' });
    }
  );

  return app;
}
