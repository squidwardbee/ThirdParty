-- Subscription enhancements
-- Add RevenueCat customer ID and platform tracking

-- Add RevenueCat columns to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS revenuecat_customer_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_platform VARCHAR(20);

-- Add platform and price columns to subscription_events
ALTER TABLE subscription_events ADD COLUMN IF NOT EXISTS platform VARCHAR(20);
ALTER TABLE subscription_events ADD COLUMN IF NOT EXISTS price_cents INTEGER;
ALTER TABLE subscription_events ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'USD';
ALTER TABLE subscription_events ADD COLUMN IF NOT EXISTS revenuecat_event_id VARCHAR(255);

-- Create index for RevenueCat customer ID lookup
CREATE INDEX IF NOT EXISTS idx_users_revenuecat_customer_id ON users(revenuecat_customer_id);

-- Usage limits configuration
-- Free tier: 3 arguments per day
-- Premium tier: Unlimited arguments

COMMENT ON COLUMN users.arguments_today IS 'Number of arguments created today (resets daily)';
COMMENT ON COLUMN users.last_argument_date IS 'Date of last argument creation (for daily reset)';
COMMENT ON COLUMN users.subscription_tier IS 'User subscription: free, premium, or trial';
