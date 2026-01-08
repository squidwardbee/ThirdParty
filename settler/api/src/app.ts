import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';

// Import routes
import healthRouter from './routes/health';
import usersRouter from './routes/users';
import argumentsRouter from './routes/arguments';
import webhooksRouter from './routes/webhooks';
import transcribeRouter from './routes/transcribe';

export function createApp(): Express {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: '50mb' })); // Large limit for audio data

  // Request logging in development
  if (process.env.NODE_ENV !== 'production') {
    app.use((req: Request, res: Response, next: NextFunction) => {
      console.log(`${req.method} ${req.path}`);
      next();
    });
  }

  // Health check (no auth required)
  app.use('/health', healthRouter);

  // API routes
  app.use('/api/users', usersRouter);
  app.use('/api/arguments', argumentsRouter);
  app.use('/api/webhooks', webhooksRouter);
  app.use('/api/transcribe', transcribeRouter);

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Error handler
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
      error: process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message,
    });
  });

  return app;
}

export default createApp;
