// User types
export interface User {
  id: string;
  email: string;
  firebaseUid: string;
  displayName: string | null;
  subscriptionTier: 'free' | 'premium' | 'trial';
  subscriptionExpiresAt: Date | null;
  trialStartedAt: Date | null;
  argumentsToday: number;
  lastArgumentDate: Date | null;
  preferredPersona: Persona;
  createdAt: Date;
  updatedAt: Date;
}

export type Persona = 'mediator' | 'judge_judy' | 'comedic';

// Argument types
export interface Argument {
  id: string;
  userId: string;
  mode: 'live' | 'turn_based';
  personAName: string;
  personBName: string;
  persona: Persona;
  status: 'recording' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  completedAt: Date | null;
}

export interface ArgumentTurn {
  id: string;
  argumentId: string;
  speaker: 'person_a' | 'person_b';
  audioUrl: string | null;
  transcription: string;
  turnOrder: number;
  durationSeconds: number | null;
  createdAt: Date;
}

export interface Judgment {
  id: string;
  argumentId: string;
  winner: 'person_a' | 'person_b' | 'tie';
  winnerName: string;
  reasoning: string;
  researchPerformed: boolean;
  researchSummary: string | null;
  sources: string[];
  audioUrl: string | null;
  audioDurationSeconds: number | null;
  fullResponse: string;
  createdAt: Date;
}

// API Request/Response types
export interface CreateArgumentRequest {
  mode: 'live' | 'turn_based';
  personAName: string;
  personBName: string;
  persona: Persona;
}

export interface AddTurnRequest {
  speaker: 'person_a' | 'person_b';
  transcription: string;
  audioUrl?: string;
  durationSeconds?: number;
}

export interface ArgumentWithDetails extends Argument {
  turns: ArgumentTurn[];
  judgment: Judgment | null;
}

// Database row types (snake_case)
export interface UserRow {
  id: string;
  email: string;
  firebase_uid: string;
  display_name: string | null;
  subscription_tier: string;
  subscription_expires_at: Date | null;
  trial_started_at: Date | null;
  arguments_today: number;
  last_argument_date: Date | null;
  preferred_persona: string;
  created_at: Date;
  updated_at: Date;
}

export interface ArgumentRow {
  id: string;
  user_id: string;
  mode: string;
  person_a_name: string;
  person_b_name: string;
  persona: string;
  status: string;
  created_at: Date;
  completed_at: Date | null;
}

export interface ArgumentTurnRow {
  id: string;
  argument_id: string;
  speaker: string;
  audio_url: string | null;
  transcription: string;
  turn_order: number;
  duration_seconds: number | null;
  created_at: Date;
}

export interface JudgmentRow {
  id: string;
  argument_id: string;
  winner: string;
  winner_name: string;
  reasoning: string;
  research_performed: boolean;
  research_summary: string | null;
  sources: string;
  audio_url: string | null;
  audio_duration_seconds: number | null;
  full_response: string;
  created_at: Date;
}
