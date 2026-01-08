import { Router, Request, Response } from 'express';
import pool from '../db';

const router = Router();

/**
 * GET /health
 * Health check endpoint for load balancers and monitoring
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    // Check database connection
    await pool.query('SELECT 1');

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Database connection failed',
    });
  }
});

export default router;
