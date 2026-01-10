import { Router, Request, Response } from 'express';
import { query, queryOne } from '../db';

const router = Router();

// Webhook secret for verification
const REVENUECAT_WEBHOOK_SECRET = process.env.REVENUECAT_WEBHOOK_SECRET;

/**
 * Verify webhook authorization
 */
function verifyWebhookAuth(req: Request): boolean {
  if (!REVENUECAT_WEBHOOK_SECRET) {
    console.warn('[Webhook] REVENUECAT_WEBHOOK_SECRET not configured');
    return false;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return false;
  }

  // Handle both "Bearer <token>" and raw "<token>" formats
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : authHeader;

  return token === REVENUECAT_WEBHOOK_SECRET;
}

interface RevenueCatEvent {
  type: string;
  event_timestamp_ms: number;
  id: string;
  app_user_id: string;
  aliases?: string[];
  product_id?: string;
  period_type?: string;
  purchased_at_ms?: number;
  expiration_at_ms?: number;
  environment?: string;
  entitlement_id?: string;
  entitlement_ids?: string[];
  presented_offering_id?: string;
  transaction_id?: string;
  original_transaction_id?: string;
  is_family_share?: boolean;
  price_in_purchased_currency?: number;
  currency?: string;
  store?: string;
}

/**
 * Find user by RevenueCat app_user_id or aliases
 */
async function findUser(
  appUserId: string,
  aliases: string[] = []
): Promise<{ id: string; firebase_uid: string } | null> {
  // Try by database ID first (we pass user.id to RevenueCat)
  const byId = await queryOne<{ id: string; firebase_uid: string }>(
    'SELECT id, firebase_uid FROM users WHERE id::text = $1',
    [appUserId]
  );

  if (byId) return byId;

  // Try by firebase_uid
  const byFirebase = await queryOne<{ id: string; firebase_uid: string }>(
    'SELECT id, firebase_uid FROM users WHERE firebase_uid = $1',
    [appUserId]
  );

  if (byFirebase) return byFirebase;

  // Try by RevenueCat customer ID
  const byRevenueCat = await queryOne<{ id: string; firebase_uid: string }>(
    'SELECT id, firebase_uid FROM users WHERE revenuecat_customer_id = $1',
    [appUserId]
  );

  if (byRevenueCat) return byRevenueCat;

  // Try aliases
  for (const alias of aliases) {
    const byAlias = await queryOne<{ id: string; firebase_uid: string }>(
      'SELECT id, firebase_uid FROM users WHERE id::text = $1 OR firebase_uid = $1 OR revenuecat_customer_id = $1',
      [alias]
    );
    if (byAlias) return byAlias;
  }

  return null;
}

/**
 * Update user subscription status
 */
async function updateUserSubscription(
  userId: string,
  tier: 'free' | 'premium',
  expiresAt: Date | null,
  platform?: string
): Promise<void> {
  await query(
    `UPDATE users
     SET subscription_tier = $1,
         subscription_expires_at = $2,
         subscription_platform = $3,
         updated_at = NOW()
     WHERE id = $4`,
    [tier, expiresAt, platform || null, userId]
  );
}

/**
 * Log subscription event for audit trail
 */
async function logSubscriptionEvent(
  userId: string,
  event: RevenueCatEvent
): Promise<void> {
  await query(
    `INSERT INTO subscription_events
     (user_id, event_type, platform, product_id, price_cents, currency, revenuecat_event_id, raw_payload)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      userId,
      event.type,
      event.store || null,
      event.product_id || null,
      event.price_in_purchased_currency
        ? Math.round(event.price_in_purchased_currency * 100)
        : null,
      event.currency || 'USD',
      event.id,
      JSON.stringify(event),
    ]
  );
}

/**
 * POST /api/webhooks/revenuecat
 * Handle RevenueCat subscription events
 */
router.post('/revenuecat', async (req: Request, res: Response) => {
  // Verify webhook authorization
  if (!verifyWebhookAuth(req)) {
    console.error('Unauthorized RevenueCat webhook attempt');
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const { event } = req.body as { event: RevenueCatEvent };

    if (!event || !event.type) {
      res.status(400).json({ error: 'Invalid event payload' });
      return;
    }

    console.log(`RevenueCat webhook: ${event.type} for user ${event.app_user_id}`);

    // Find the user
    const user = await findUser(event.app_user_id, event.aliases || []);

    if (!user) {
      console.warn(`User not found for RevenueCat event: ${event.app_user_id}`);
      // Still return 200 to prevent retries
      res.status(200).json({ received: true, processed: false, reason: 'User not found' });
      return;
    }

    // Log the event for audit
    await logSubscriptionEvent(user.id, event);

    // Process event based on type
    switch (event.type) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
      case 'PRODUCT_CHANGE':
        // User purchased or renewed subscription
        await updateUserSubscription(
          user.id,
          'premium',
          event.expiration_at_ms ? new Date(event.expiration_at_ms) : null,
          event.store
        );
        break;

      case 'CANCELLATION':
        // Subscription was cancelled (refund)
        await updateUserSubscription(user.id, 'free', null, event.store);
        break;

      case 'EXPIRATION':
        // Subscription expired naturally
        await updateUserSubscription(user.id, 'free', null, event.store);
        break;

      case 'BILLING_ISSUE':
        // Billing problem - keep premium for grace period
        console.log(`Billing issue for user ${user.id}`);
        break;

      case 'SUBSCRIBER_ALIAS':
        // User aliases changed - update RevenueCat customer ID
        await query(
          'UPDATE users SET revenuecat_customer_id = $1 WHERE id = $2',
          [event.app_user_id, user.id]
        );
        break;

      case 'TRANSFER':
        // Subscription transferred between users
        console.log(`Transfer event for user ${user.id}`);
        break;

      case 'TEST':
        // Test webhook from RevenueCat dashboard
        console.log('Test webhook received');
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true, processed: true });
  } catch (error) {
    console.error('RevenueCat webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
