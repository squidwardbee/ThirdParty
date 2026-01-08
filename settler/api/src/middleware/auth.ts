import { Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (projectId && clientEmail && privateKey) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    console.log('Firebase Admin initialized');
  } else {
    console.warn('Firebase Admin credentials not configured - auth will use dev mode');
  }
}

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email: string;
  };
}

/**
 * Middleware to verify Firebase JWT tokens
 */
export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing authorization header' });
    return;
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    // Development mode - accept dev token
    if (process.env.NODE_ENV === 'development' && token === 'dev-token') {
      req.user = {
        uid: 'dev-user-123',
        email: 'dev@example.com',
      };
      next();
      return;
    }

    // Production mode - verify with Firebase
    if (!admin.apps.length) {
      res.status(500).json({ error: 'Firebase Admin not configured' });
      return;
    }

    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email || '',
    };
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
}

/**
 * Optional auth - attaches user if token present, continues if not
 */
export async function optionalAuthMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    next();
    return;
  }

  try {
    const token = authHeader.split('Bearer ')[1];

    if (process.env.NODE_ENV === 'development' && token === 'dev-token') {
      req.user = {
        uid: 'dev-user-123',
        email: 'dev@example.com',
      };
    } else if (admin.apps.length) {
      const decodedToken = await admin.auth().verifyIdToken(token);
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email || '',
      };
    }
  } catch {
    // Ignore auth errors for optional auth
  }

  next();
}
