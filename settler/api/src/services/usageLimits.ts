import { query, queryOne } from '../db';

// Usage limits per subscription tier
const LIMITS = {
  free: {
    argumentsPerDay: 3,
    maxTurnsPerArgument: 10,
    researchEnabled: false,
  },
  trial: {
    argumentsPerDay: 10,
    maxTurnsPerArgument: 20,
    researchEnabled: true,
  },
  premium: {
    argumentsPerDay: Infinity,
    maxTurnsPerArgument: Infinity,
    researchEnabled: true,
  },
};

interface UserUsage {
  id: string;
  subscriptionTier: 'free' | 'trial' | 'premium';
  argumentsToday: number;
  lastArgumentDate: Date | null;
  subscriptionExpiresAt: Date | null;
}

/**
 * Get current user usage and limits
 */
export async function getUserUsage(userId: string): Promise<UserUsage | null> {
  const user = await queryOne<{
    id: string;
    subscription_tier: string;
    arguments_today: number;
    last_argument_date: Date | null;
    subscription_expires_at: Date | null;
  }>(
    `SELECT id, subscription_tier, arguments_today, last_argument_date, subscription_expires_at
     FROM users WHERE id = $1`,
    [userId]
  );

  if (!user) return null;

  // Check if subscription expired
  let tier = user.subscription_tier as 'free' | 'trial' | 'premium';
  if (tier !== 'free' && user.subscription_expires_at) {
    if (new Date() > new Date(user.subscription_expires_at)) {
      // Subscription expired, downgrade to free
      await query(
        "UPDATE users SET subscription_tier = 'free' WHERE id = $1",
        [userId]
      );
      tier = 'free';
    }
  }

  return {
    id: user.id,
    subscriptionTier: tier,
    argumentsToday: user.arguments_today || 0,
    lastArgumentDate: user.last_argument_date,
    subscriptionExpiresAt: user.subscription_expires_at,
  };
}

/**
 * Check if user can create a new argument
 */
export async function canCreateArgument(userId: string): Promise<{
  allowed: boolean;
  reason?: string;
  remaining?: number;
}> {
  const usage = await getUserUsage(userId);

  if (!usage) {
    return { allowed: false, reason: 'User not found' };
  }

  const limits = LIMITS[usage.subscriptionTier];
  const today = new Date().toISOString().split('T')[0];
  const lastDate = usage.lastArgumentDate
    ? new Date(usage.lastArgumentDate).toISOString().split('T')[0]
    : null;

  // Reset daily count if new day
  let currentCount = usage.argumentsToday;
  if (lastDate !== today) {
    currentCount = 0;
  }

  if (currentCount >= limits.argumentsPerDay) {
    return {
      allowed: false,
      reason: `Daily limit reached (${limits.argumentsPerDay} arguments per day on ${usage.subscriptionTier} tier)`,
      remaining: 0,
    };
  }

  return {
    allowed: true,
    remaining: limits.argumentsPerDay === Infinity
      ? undefined
      : limits.argumentsPerDay - currentCount - 1,
  };
}

/**
 * Check if user can add a turn to an argument
 */
export async function canAddTurn(
  userId: string,
  argumentId: string
): Promise<{ allowed: boolean; reason?: string }> {
  const usage = await getUserUsage(userId);

  if (!usage) {
    return { allowed: false, reason: 'User not found' };
  }

  const limits = LIMITS[usage.subscriptionTier];

  // Check current turn count
  const turnCount = await queryOne<{ count: string }>(
    'SELECT COUNT(*) as count FROM argument_turns WHERE argument_id = $1',
    [argumentId]
  );

  const currentTurns = parseInt(turnCount?.count || '0', 10);

  if (currentTurns >= limits.maxTurnsPerArgument) {
    return {
      allowed: false,
      reason: `Maximum turns reached (${limits.maxTurnsPerArgument} turns per argument on ${usage.subscriptionTier} tier)`,
    };
  }

  return { allowed: true };
}

/**
 * Check if research is enabled for user's subscription
 */
export async function isResearchEnabled(userId: string): Promise<boolean> {
  const usage = await getUserUsage(userId);
  if (!usage) return false;
  return LIMITS[usage.subscriptionTier].researchEnabled;
}

/**
 * Increment daily argument count
 */
export async function incrementArgumentCount(userId: string): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const usage = await getUserUsage(userId);

  if (!usage) return;

  const lastDate = usage.lastArgumentDate
    ? new Date(usage.lastArgumentDate).toISOString().split('T')[0]
    : null;

  if (lastDate === today) {
    await query(
      'UPDATE users SET arguments_today = arguments_today + 1 WHERE id = $1',
      [userId]
    );
  } else {
    await query(
      'UPDATE users SET arguments_today = 1, last_argument_date = $1 WHERE id = $2',
      [today, userId]
    );
  }
}

/**
 * Get user's subscription limits
 */
export function getLimitsForTier(tier: 'free' | 'trial' | 'premium') {
  return LIMITS[tier];
}
