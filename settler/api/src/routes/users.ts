import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth';
import { query, queryOne } from '../db';
import { UserRow, User, Persona } from '../types';

const router = Router();

// All user routes require authentication
router.use(authMiddleware);

/**
 * Helper to convert database row to User object
 */
function rowToUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    firebaseUid: row.firebase_uid,
    displayName: row.display_name,
    subscriptionTier: row.subscription_tier as User['subscriptionTier'],
    subscriptionExpiresAt: row.subscription_expires_at,
    trialStartedAt: row.trial_started_at,
    argumentsToday: row.arguments_today,
    lastArgumentDate: row.last_argument_date,
    preferredPersona: row.preferred_persona as Persona,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * GET /api/users/me
 * Get current user profile
 */
router.get('/me', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await queryOne<UserRow>(
      'SELECT * FROM users WHERE firebase_uid = $1',
      [req.user!.uid]
    );

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(rowToUser(user));
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

/**
 * POST /api/users/me
 * Create or update current user (called after Firebase auth)
 * Uses UPSERT to handle race conditions and firebase_uid changes
 */
router.post('/me', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { displayName } = req.body;
    const { uid, email } = req.user!;

    // First, check if user exists by firebase_uid
    let user = await queryOne<UserRow>(
      'SELECT * FROM users WHERE firebase_uid = $1',
      [uid]
    );

    if (user) {
      // Update existing user if needed
      if (displayName && !user.display_name) {
        await query(
          'UPDATE users SET display_name = $1, updated_at = NOW() WHERE id = $2',
          [displayName, user.id]
        );
        user.display_name = displayName;
      }
      res.json(rowToUser(user));
      return;
    }

    // User not found by firebase_uid - use UPSERT on firebase_uid
    // This handles race conditions where multiple requests try to create the same user
    const id = uuidv4();
    const rows = await query<UserRow>(
      `INSERT INTO users (id, email, firebase_uid, display_name)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (firebase_uid) DO UPDATE SET
         email = EXCLUDED.email,
         updated_at = NOW()
       RETURNING *`,
      [id, email, uid, displayName || null]
    );
    user = rows[0];

    res.json(rowToUser(user));
  } catch (error) {
    console.error('Error creating/updating user:', error);
    res.status(500).json({ error: 'Failed to create/update user' });
  }
});

/**
 * PATCH /api/users/me/persona
 * Update user's preferred AI persona
 */
router.patch('/me/persona', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { persona } = req.body;

    if (!['mediator', 'judge_judy', 'comedic'].includes(persona)) {
      res.status(400).json({ error: 'Invalid persona' });
      return;
    }

    const rows = await query<UserRow>(
      `UPDATE users
       SET preferred_persona = $1, updated_at = NOW()
       WHERE firebase_uid = $2
       RETURNING *`,
      [persona, req.user!.uid]
    );

    if (rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(rowToUser(rows[0]));
  } catch (error) {
    console.error('Error updating persona:', error);
    res.status(500).json({ error: 'Failed to update persona' });
  }
});

export default router;
