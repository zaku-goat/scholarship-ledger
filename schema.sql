-- Run this once in the Cloudflare D1 console (dashboard) to set up the table.

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT UNIQUE,
  status TEXT,              -- 'trialing', 'active', 'past_due', 'canceled'
  trial_end INTEGER,
  current_period_end INTEGER,
  created_at INTEGER
);
