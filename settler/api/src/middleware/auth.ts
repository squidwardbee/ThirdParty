import { Request, Response, NextFunction } from 'express';

// Placeholder for Firebase Admin - will be implemented when Firebase is set up
// import admin from 'firebase-admin';

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email: string;
  };
}

/**
 * Middleware to verify Firebase JWT tokens
 * Currently a placeholder - will verify tokens when Firebase Admin is configured
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
    // TODO: Replace with actual Firebase verification
    // const decodedToken = await admin.auth().verifyIdToken(token);
    // req.user = {
    //   uid: decodedToken.uid,
    //   email: decodedToken.email || '',
    // };

    // Placeholder: Accept any token for development
    // In production, this MUST verify the Firebase token
    if (process.env.NODE_ENV === 'development' && token === 'dev-token') {
      req.user = {
        uid: 'dev-user-123',
        email: 'dev@example.com',
      };
      next();
      return;
    }

    res.status(401).json({ error: 'Invalid token - Firebase not configured' });
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

  // Try to authenticate, but don't fail if it doesn't work
  try {
    await authMiddleware(req, res, () => {
      next();
    });
  } catch {
    next();
  }
}
