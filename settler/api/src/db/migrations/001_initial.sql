-- Settler Database Schema
-- Initial migration: Users, Arguments, Turns, Judgments

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  firebase_uid VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(100),
  subscription_tier VARCHAR(20) DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium', 'trial')),
  subscription_expires_at TIMESTAMP,
  trial_started_at TIMESTAMP,
  arguments_today INTEGER DEFAULT 0,
  last_argument_date DATE,
  preferred_persona VARCHAR(50) DEFAULT 'mediator',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Arguments table (each dispute)
CREATE TABLE arguments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mode VARCHAR(20) NOT NULL CHECK (mode IN ('live', 'turn_based')),
  person_a_name VARCHAR(100) NOT NULL,
  person_b_name VARCHAR(100) NOT NULL,
  persona VARCHAR(50) NOT NULL DEFAULT 'mediator',
  status VARCHAR(20) DEFAULT 'recording' CHECK (status IN ('recording', 'processing', 'completed', 'failed')),
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Argument turns (individual speaking segments)
CREATE TABLE argument_turns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  argument_id UUID NOT NULL REFERENCES arguments(id) ON DELETE CASCADE,
  speaker VARCHAR(10) NOT NULL CHECK (speaker IN ('person_a', 'person_b')),
  audio_url TEXT,
  transcription TEXT NOT NULL,
  turn_order INTEGER NOT NULL,
  duration_seconds INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Judgments (AI verdict)
CREATE TABLE judgments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  argument_id UUID NOT NULL REFERENCES arguments(id) ON DELETE CASCADE,
  winner VARCHAR(10) NOT NULL CHECK (winner IN ('person_a', 'person_b', 'tie')),
  winner_name VARCHAR(100) NOT NULL,
  reasoning TEXT NOT NULL,
  research_performed BOOLEAN DEFAULT FALSE,
  research_summary TEXT,
  sources JSONB DEFAULT '[]',
  audio_url TEXT,
  audio_duration_seconds INTEGER,
  full_response TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Subscription events (audit trail)
CREATE TABLE subscription_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  product_id VARCHAR(100),
  raw_payload JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_users_firebase_uid ON users(firebase_uid);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_arguments_user_id ON arguments(user_id);
CREATE INDEX idx_arguments_created_at ON arguments(created_at DESC);
CREATE INDEX idx_argument_turns_argument_id ON argument_turns(argument_id);
CREATE INDEX idx_argument_turns_order ON argument_turns(argument_id, turn_order);
CREATE INDEX idx_judgments_argument_id ON judgments(argument_id);

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to users table
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
