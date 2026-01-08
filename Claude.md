# Campfire App - Architecture & Implementation Guide

> Complete reference document for building a React Native + Express audio storytelling app with AI generation, subscriptions, and cloud deployment.

---

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Backend API Setup](#4-backend-api-setup)
5. [Database Design & Migrations](#5-database-design--migrations)
6. [Authentication System](#6-authentication-system)
7. [AI Story Generation](#7-ai-story-generation)
8. [Text-to-Speech Integration](#8-text-to-speech-integration)
9. [Cloud Storage (AWS S3)](#9-cloud-storage-aws-s3)
10. [Payment Integration (RevenueCat)](#10-payment-integration-revenuecat)
11. [Frontend Architecture (Expo/React Native)](#11-frontend-architecture-exporeact-native)
12. [State Management (Zustand)](#12-state-management-zustand)
13. [Navigation Structure](#13-navigation-structure)
14. [Design System & Theme](#14-design-system--theme)
15. [Deployment Patterns](#15-deployment-patterns)
16. [App Store Submission](#16-app-store-submission)
17. [Environment Variables Reference](#17-environment-variables-reference)
18. [API Routes Reference](#18-api-routes-reference)

---

## 1. Project Overview

**Campfire** is a personalized audio storytelling app that:
- Generates AI-written stories based on user preferences
- Converts stories to audio using TTS (Text-to-Speech)
- Offers subscription-based access (free/premium tiers)
- Supports variable story lengths (5-180 minutes)

### Core User Flow
1. User signs up via email/password (Firebase Auth)
2. Completes onboarding questionnaire (preferences)
3. Generates personalized stories from templates or custom prompts
4. Listens to audio stories with player controls
5. Premium users get longer stories, premium voices, and more generation quota

---

## 2. Tech Stack

### Frontend (Mobile)
| Technology | Purpose | Version |
|------------|---------|---------|
| Expo | React Native framework | ~54.0 |
| React Native | Cross-platform mobile | 0.81.x |
| React Navigation | Navigation (stack + tabs) | 7.x |
| Zustand | State management | 5.x |
| Expo AV | Audio playback | 16.x |
| React Native Purchases | RevenueCat SDK | 9.x |
| Firebase | Authentication | 12.x |
| AsyncStorage | Local persistence | 2.x |

### Backend (API)
| Technology | Purpose | Version |
|------------|---------|---------|
| Node.js | Runtime | 18+ |
| Express | HTTP framework | 5.x |
| TypeScript | Type safety | 5.x |
| PostgreSQL | Database | 14+ |
| Firebase Admin | Token verification | 13.x |
| OpenAI SDK | LLM API client | 6.x |

### AI & Audio Services
| Service | Purpose |
|---------|---------|
| xAI Grok | Story text generation (OpenAI-compatible) |
| ElevenLabs | Premium TTS voices |
| Google Cloud TTS | Free TTS voices |
| OpenAI TTS | Alternative TTS option |

### Infrastructure
| Service | Purpose |
|---------|---------|
| Railway | API hosting + PostgreSQL |
| AWS S3 | Audio file storage |
| RevenueCat | Subscription management |
| Firebase | Authentication |
| EAS (Expo) | iOS/Android builds |

---

## 3. Project Structure

```
campfire/
├── api/                          # Backend Express API
│   ├── src/
│   │   ├── index.ts              # Server entry point
│   │   ├── app.ts                # Express app configuration
│   │   ├── db/
│   │   │   ├── index.ts          # PostgreSQL connection pool
│   │   │   ├── migrate.ts        # Migration runner
│   │   │   └── migrations/       # SQL migration files
│   │   ├── middleware/
│   │   │   └── auth.ts           # Firebase JWT verification
│   │   ├── routes/
│   │   │   ├── users.ts          # User CRUD + profile
│   │   │   ├── stories.ts        # Story generation + CRUD
│   │   │   ├── templates.ts      # Story template endpoints
│   │   │   ├── voices.ts         # Voice listing
│   │   │   ├── config.ts         # Feature flags + pricing
│   │   │   └── webhooks.ts       # RevenueCat webhooks
│   │   ├── services/
│   │   │   ├── storyGenerator.ts # LLM story generation
│   │   │   ├── tts.ts            # Text-to-speech synthesis
│   │   │   └── storage.ts        # AWS S3 operations
│   │   ├── lib/
│   │   │   ├── constants.ts      # App-wide constants
│   │   │   └── featureFlags.ts   # Feature flag management
│   │   ├── types/
│   │   │   └── index.ts          # TypeScript interfaces
│   │   └── utils/
│   │       └── normalize.ts      # snake_case to camelCase
│   ├── .env.example              # Environment template
│   ├── package.json
│   ├── railway.json              # Railway deployment config
│   └── tsconfig.json
│
├── ios/                          # Expo React Native app
│   ├── App.tsx                   # Root component
│   ├── src/
│   │   ├── screens/
│   │   │   ├── AuthScreen.tsx
│   │   │   ├── OnboardingScreen.tsx
│   │   │   ├── DashboardScreen.tsx
│   │   │   ├── PlayerScreen.tsx
│   │   │   ├── LibraryScreen.tsx
│   │   │   ├── SettingsScreen.tsx
│   │   │   └── ...
│   │   ├── components/
│   │   │   ├── UpgradeModal.tsx
│   │   │   ├── VoicePickerModal.tsx
│   │   │   └── Icons.tsx
│   │   ├── lib/
│   │   │   ├── store.ts          # Zustand state
│   │   │   ├── api.ts            # API client
│   │   │   ├── firebase.ts       # Firebase config
│   │   │   ├── purchases.ts      # RevenueCat integration
│   │   │   └── theme.ts          # Design tokens
│   │   ├── navigation/
│   │   │   └── index.tsx         # Stack + tab navigators
│   │   └── hooks/
│   │       └── ...
│   ├── app.json                  # Expo configuration
│   ├── eas.json                  # EAS Build profiles
│   └── package.json
│
├── web/                          # Next.js marketing site (optional)
│   └── ...
│
└── docs/
```

---

## 4. Backend API Setup

### Initial Setup

```bash
mkdir api && cd api
npm init -y
npm install express cors pg dotenv uuid firebase-admin openai \
  @aws-sdk/client-s3 @aws-sdk/s3-request-presigner @aws-sdk/lib-storage \
  @google-cloud/text-to-speech

npm install -D typescript @types/express @types/cors @types/pg @types/node \
  @types/uuid ts-node nodemon dotenv-cli jest ts-jest supertest
```

### Express App Configuration (`src/app.ts`)

```typescript
import express from 'express';
import cors from 'cors';

// Import routes
import usersRouter from './routes/users';
import storiesRouter from './routes/stories';
import templatesRouter from './routes/templates';
import voicesRouter from './routes/voices';
import configRouter from './routes/config';
import webhooksRouter from './routes/webhooks';

export function createApp(): express.Express {
  const app = express();

  // Middleware - allow all origins for mobile app
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API routes
  app.use('/api/users', usersRouter);
  app.use('/api/stories', storiesRouter);
  app.use('/api/templates', templatesRouter);
  app.use('/api/voices', voicesRouter);
  app.use('/api/config', configRouter);
  app.use('/api/webhooks', webhooksRouter);

  // Error handling
  app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
```

### Database Connection (`src/db/index.ts`)

```typescript
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export default pool;

export async function query<T>(text: string, params?: unknown[]): Promise<T[]> {
  const result = await pool.query(text, params);
  return result.rows as T[];
}

export async function queryOne<T>(text: string, params?: unknown[]): Promise<T | null> {
  const result = await pool.query(text, params);
  return (result.rows[0] as T) || null;
}
```

---

## 5. Database Design & Migrations

### Core Schema

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  firebase_uid VARCHAR(255) UNIQUE NOT NULL,
  subscription_tier VARCHAR(20) DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium')),
  subscription_expires_at TIMESTAMP,
  subscription_platform VARCHAR(20),
  revenuecat_customer_id VARCHAR(255),
  stories_generated_today INTEGER DEFAULT 0,
  last_story_date DATE,
  free_minutes_used_month INTEGER DEFAULT 0,
  free_minutes_limit INTEGER DEFAULT 10,
  elevenlabs_minutes_used_month INTEGER DEFAULT 0,
  elevenlabs_minutes_limit INTEGER DEFAULT 400,
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- User profiles (questionnaire data)
CREATE TABLE user_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  display_name VARCHAR(100) NOT NULL,
  physical_description TEXT,
  age_range VARCHAR(20) DEFAULT '25-34',
  partner_genders TEXT[] DEFAULT '{}',
  partner_archetypes TEXT[] DEFAULT '{}',
  preferred_settings TEXT[] DEFAULT '{}',
  pacing_preference VARCHAR(20) DEFAULT 'moderate',
  emotional_tones TEXT[] DEFAULT '{}',
  explicitness_level INTEGER DEFAULT 2,
  hard_limits TEXT[] DEFAULT '{}',
  custom_limits TEXT,
  selected_voice_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Story templates
CREATE TABLE story_templates (
  id VARCHAR(100) PRIMARY KEY,
  category VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  default_setting VARCHAR(100),
  archetypes TEXT[] DEFAULT '{}',
  suggested_pacing VARCHAR(20) DEFAULT 'moderate',
  is_premium BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Stories (generated content)
CREATE TABLE stories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  template_id VARCHAR(100) REFERENCES story_templates(id) ON DELETE SET NULL,
  custom_prompt TEXT,
  title VARCHAR(200) NOT NULL,
  generated_text TEXT NOT NULL,
  audio_url TEXT,
  duration_seconds INTEGER,
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Voices (narrator options)
CREATE TABLE voices (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) CHECK (type IN ('masculine', 'feminine', 'neutral')),
  description TEXT,
  provider VARCHAR(20) NOT NULL CHECK (provider IN ('google', 'elevenlabs', 'openai')),
  provider_id VARCHAR(200) NOT NULL,
  tier VARCHAR(20) DEFAULT 'free' CHECK (tier IN ('free', 'premium')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Subscription events (audit trail)
CREATE TABLE subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  platform VARCHAR(20),
  product_id VARCHAR(100),
  price_cents INTEGER,
  currency VARCHAR(10) DEFAULT 'USD',
  revenuecat_event_id VARCHAR(255),
  raw_payload JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Feature flags
CREATE TABLE feature_flags (
  id VARCHAR(100) PRIMARY KEY,
  flags JSONB NOT NULL DEFAULT '{}',
  enabled BOOLEAN DEFAULT TRUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_firebase_uid ON users(firebase_uid);
CREATE INDEX idx_stories_user_id ON stories(user_id);
CREATE INDEX idx_stories_created_at ON stories(created_at DESC);
```

### Migration Strategy

Create numbered migration files in `src/db/migrations/`:

```
001_initial.sql          # Core tables
002_enhanced_personalization.sql
003_schema_fixes.sql
004_payments.sql          # RevenueCat integration
005_tts_provider_limits.sql
006_minutes_based_limits.sql
```

Run migrations with:
```bash
npm run db:migrate        # Development
npm run db:migrate:prod   # Production
```

---

## 6. Authentication System

### Firebase Setup (Client - `ios/src/lib/firebase.ts`)

```typescript
import { initializeApp, getApps } from 'firebase/app';
import {
  initializeAuth,
  getAuth,
  getReactNativePersistence,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
  Auth,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-app.firebaseapp.com",
  projectId: "your-app",
  storageBucket: "your-app.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

let auth: Auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (error) {
  auth = getAuth(app);
}

export { auth };

export async function signIn(email: string, password: string): Promise<User> {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
}

export async function signUp(email: string, password: string): Promise<User> {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  return result.user;
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

export async function getIdToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

export function onAuthChange(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}
```

### Firebase Admin Middleware (Server - `api/src/middleware/auth.ts`)

```typescript
import { Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
  });
}

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email: string;
  };
}

export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email || '',
    };
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}
```

---

## 7. AI Story Generation

### LLM Configuration (`api/src/services/storyGenerator.ts`)

```typescript
import OpenAI from 'openai';

// Grok uses OpenAI-compatible API
const grok = new OpenAI({
  apiKey: process.env.GROK_API_KEY,
  baseURL: process.env.GROK_API_URL || 'https://api.x.ai/v1',
});

// Word counts for different durations (150 words/minute speaking rate)
const DURATION_WORD_COUNTS: Record<number, number> = {
  5: 750,    // 5 minutes
  15: 2250,  // 15 minutes
  30: 4500,  // 30 minutes
  60: 9000,  // 1 hour (epic)
  120: 18000, // 2 hours
  180: 27000, // 3 hours
};

interface GenerateStoryParams {
  profile: UserProfile;
  template?: StoryTemplate | null;
  customPrompt?: string | null;
  explicitnessOverride?: number;
  isPremium: boolean;
  targetDurationMinutes?: number;
}

export async function generateStory(params: GenerateStoryParams): Promise<{
  title: string;
  content: string;
  wordCount: number;
}> {
  const { profile, template, customPrompt, targetDurationMinutes = 15 } = params;
  const targetWords = DURATION_WORD_COUNTS[targetDurationMinutes];

  // Build personalized prompt based on user preferences
  const systemPrompt = buildSystemPrompt(profile, template, targetWords);
  const userPrompt = customPrompt || template?.description || 'Create an engaging story';

  const completion = await grok.chat.completions.create({
    model: 'grok-beta',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: targetWords * 2, // Allow buffer for longer responses
    temperature: 0.8,
  });

  const content = completion.choices[0].message.content || '';

  // Extract title and body
  const titleMatch = content.match(/^#\s*(.+?)$/m);
  const title = titleMatch ? titleMatch[1].trim() : 'Untitled Story';
  const body = content.replace(/^#\s*.+?$/m, '').trim();

  return {
    title,
    content: body,
    wordCount: body.split(/\s+/).length,
  };
}
```

### Key Generation Features
- **Blueprint System**: Two-phase generation (outline then prose)
- **Beat Structure**: Different story structures for 5/15/30-minute stories
- **Epic Stories**: Chapter-based generation for 60+ minute stories
- **Personalization**: User preferences injected into prompts
- **Variation Seeds**: Ensures unique stories with randomized seeds

---

## 8. Text-to-Speech Integration

### Multi-Provider TTS (`api/src/services/tts.ts`)

```typescript
import textToSpeech, { TextToSpeechClient } from '@google-cloud/text-to-speech';

// Initialize Google Cloud TTS
let googleTTS: TextToSpeechClient;
if (process.env.GOOGLE_TTS_CREDENTIALS) {
  const credentials = JSON.parse(process.env.GOOGLE_TTS_CREDENTIALS);
  googleTTS = new textToSpeech.TextToSpeechClient({ credentials });
} else {
  googleTTS = new textToSpeech.TextToSpeechClient();
}

interface TTSResult {
  audioContent: Buffer;
  durationSeconds: number;
}

// ElevenLabs (Premium)
async function synthesizeWithElevenLabs(text: string, voiceId: string): Promise<TTSResult> {
  // Chunk text to avoid API limits (5000 chars per request)
  const chunks = splitIntoChunks(text, 5000);

  const audioBuffers = await Promise.all(
    chunks.map(chunk => synthesizeChunkWithElevenLabs(chunk, voiceId))
  );

  const combinedBuffer = Buffer.concat(audioBuffers);
  const durationSeconds = Math.round(combinedBuffer.length / 24000); // Estimate

  return { audioContent: combinedBuffer, durationSeconds };
}

// Google Cloud TTS (Free tier)
async function synthesizeWithGoogle(text: string, voiceId: string): Promise<TTSResult> {
  // Split text into 5000 byte chunks
  const chunks = splitTextForGoogle(text, 4800);

  const audioBuffers = await Promise.all(chunks.map(async (chunk) => {
    const [response] = await googleTTS.synthesizeSpeech({
      input: { text: chunk },
      voice: { languageCode: 'en-US', name: voiceId },
      audioConfig: { audioEncoding: 'MP3' },
    });
    return Buffer.from(response.audioContent as Uint8Array);
  }));

  const combinedBuffer = Buffer.concat(audioBuffers);
  return { audioContent: combinedBuffer, durationSeconds: estimateDuration(text) };
}

// Main synthesis function
export async function synthesizeSpeech(
  text: string,
  voice: Voice
): Promise<TTSResult> {
  switch (voice.provider) {
    case 'elevenlabs':
      return synthesizeWithElevenLabs(text, voice.provider_id);
    case 'google':
      return synthesizeWithGoogle(text, voice.provider_id);
    case 'openai':
      return synthesizeWithOpenAI(text, voice.provider_id);
    default:
      throw new Error(`Unknown TTS provider: ${voice.provider}`);
  }
}
```

### Voice Configuration Examples
```typescript
const voices = [
  { id: 'masculine-warm', name: 'James', provider: 'google', provider_id: 'en-US-Neural2-D', tier: 'free' },
  { id: 'feminine-warm', name: 'Emma', provider: 'google', provider_id: 'en-GB-Neural2-C', tier: 'free' },
  { id: 'el-victoria', name: 'Victoria', provider: 'elevenlabs', provider_id: 'EXAVITQu4vr4xnSDxMaL', tier: 'premium' },
];
```

---

## 9. Cloud Storage (AWS S3)

### S3 Service (`api/src/services/storage.ts`)

```typescript
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'campfire-audio';

export async function uploadAudio(
  audioBuffer: Buffer,
  userId: string,
  storyId: string
): Promise<{ key: string; url: string }> {
  const key = `audio/${userId}/${storyId}.mp3`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: audioBuffer,
      ContentType: 'audio/mpeg',
      CacheControl: 'max-age=31536000',
    })
  );

  const url = await getSignedAudioUrl(key);
  return { key, url };
}

export async function getSignedAudioUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });
  return getSignedUrl(s3Client, command, { expiresIn: 86400 }); // 24 hours
}

export function generateStoryId(): string {
  return uuidv4();
}
```

### S3 Bucket Structure
```
campfire-audio/
├── audio/
│   └── {user_id}/
│       └── {story_id}.mp3
├── previews/
│   └── voices/
│       └── {voice_id}/
│           ├── onboarding.mp3
│           └── comparison.mp3
└── samples/
    ├── voice-comparison-free.mp3
    └── voice-comparison-premium.mp3
```

---

## 10. Payment Integration (RevenueCat)

### Client Setup (`ios/src/lib/purchases.ts`)

```typescript
import Purchases, { PurchasesPackage, CustomerInfo, LOG_LEVEL } from 'react-native-purchases';
import { Platform } from 'react-native';
import { useAppStore } from './store';

const REVENUECAT_API_KEY_IOS = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || '';
const PREMIUM_ENTITLEMENT = 'premium';

export async function initializePurchases(userId?: string): Promise<void> {
  const apiKey = Platform.OS === 'ios' ? REVENUECAT_API_KEY_IOS : REVENUECAT_API_KEY_ANDROID;

  await Purchases.configure({
    apiKey,
    appUserID: userId,
  });

  await checkSubscriptionStatus();
}

export async function checkSubscriptionStatus(): Promise<boolean> {
  const customerInfo = await Purchases.getCustomerInfo();
  const isPremium = customerInfo.entitlements.active[PREMIUM_ENTITLEMENT] !== undefined;

  const store = useAppStore.getState();
  if (store.user) {
    store.setUser({ ...store.user, subscriptionTier: isPremium ? 'premium' : 'free' });
  }

  return isPremium;
}

export async function purchasePackage(pkg: PurchasesPackage): Promise<boolean> {
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  const isPremium = customerInfo.entitlements.active[PREMIUM_ENTITLEMENT] !== undefined;

  if (isPremium) {
    const store = useAppStore.getState();
    store.setUser({ ...store.user!, subscriptionTier: 'premium' });
  }

  return isPremium;
}

export async function getOfferings(): Promise<PurchasesPackage[]> {
  const offerings = await Purchases.getOfferings();
  return offerings.current?.availablePackages || [];
}

export async function restorePurchases(): Promise<boolean> {
  const customerInfo = await Purchases.restorePurchases();
  return customerInfo.entitlements.active[PREMIUM_ENTITLEMENT] !== undefined;
}
```

### Server Webhook (`api/src/routes/webhooks.ts`)

```typescript
router.post('/revenuecat', async (req: Request, res: Response) => {
  // Verify webhook authorization
  if (!verifyWebhookAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const event = req.body.event;
  const user = await findUser(event.app_user_id, event.aliases || []);

  if (!user) {
    return res.status(200).json({ received: true, processed: false });
  }

  switch (event.type) {
    case 'INITIAL_PURCHASE':
    case 'RENEWAL':
      await updateUserSubscription(user.id, 'premium', new Date(event.expiration_at_ms));
      break;
    case 'EXPIRATION':
      await updateUserSubscription(user.id, 'free', null);
      break;
  }

  res.status(200).json({ received: true, processed: true });
});
```

### RevenueCat Configuration
1. Create products in App Store Connect (monthly/annual)
2. Create matching products in RevenueCat dashboard
3. Configure entitlement "premium"
4. Set up webhook URL: `https://your-api.com/api/webhooks/revenuecat`
5. Configure Bearer token for webhook authentication

---

## 11. Frontend Architecture (Expo/React Native)

### Project Initialization

```bash
npx create-expo-app@latest ios --template blank-typescript
cd ios

# Install dependencies
npm install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs
npm install react-native-screens react-native-safe-area-context
npm install zustand @react-native-async-storage/async-storage
npm install expo-av expo-blur expo-linear-gradient expo-splash-screen
npm install firebase react-native-purchases
npm install react-native-reanimated react-native-svg
npm install @expo-google-fonts/cormorant-garamond @expo-google-fonts/crimson-pro
```

### App Entry Point (`App.tsx`)

```typescript
import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, CormorantGaramond_400Regular, ... } from '@expo-google-fonts/cormorant-garamond';
import Navigation from './src/navigation';
import { colors } from './src/lib/theme';

SplashScreen.preventAutoHideAsync();

export default function App() {
  const [fontsLoaded] = useFonts({
    'Cormorant-Regular': CormorantGaramond_400Regular,
    // ... more fonts
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <View style={styles.container} onLayout={onLayoutRootView}>
      <StatusBar style="light" />
      <Navigation />
    </View>
  );
}
```

### API Client (`ios/src/lib/api.ts`)

```typescript
import { useAppStore } from './store';
import { getIdToken } from './firebase';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

class ApiClient {
  private async getToken(): Promise<string | null> {
    const firebaseToken = await getIdToken();
    if (firebaseToken) return firebaseToken;
    return useAppStore.getState().token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = await this.getToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };

    const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  async getCurrentUser() { return this.request('/api/users/me'); }
  async createOrUpdateUser() { return this.request('/api/users/me', { method: 'POST' }); }
  async getProfile() { return this.request('/api/users/me/profile'); }
  async updateProfile(profile: any) { return this.request('/api/users/me/profile', { method: 'PUT', body: JSON.stringify(profile) }); }
  async getStories() { return this.request('/api/stories'); }
  async generateStory(params: any) { return this.request('/api/stories/generate', { method: 'POST', body: JSON.stringify(params) }); }
  async getTemplates() { return this.request('/api/templates'); }
  async getVoices() { return this.request('/api/voices'); }
  async getFeatureFlags() { return this.request('/api/config/features'); }
}

export const api = new ApiClient();
```

---

## 12. State Management (Zustand)

### Store Design (`ios/src/lib/store.ts`)

```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface User {
  id: string;
  email: string;
  subscriptionTier: 'free' | 'premium';
  storiesGeneratedToday: number;
  onboardingCompleted: boolean;
  freeMinutesUsedMonth: number;
  freeMinutesLimit: number;
  elevenlabsMinutesUsedMonth: number;
  elevenlabsMinutesLimit: number;
}

export interface UserProfile {
  displayName: string;
  partnerGenders: string[];
  partnerArchetypes: string[];
  preferredSettings: string[];
  pacingPreference: 'slow' | 'moderate' | 'direct';
  emotionalTones: string[];
  explicitnessLevel: number;
  hardLimits: string[];
  selectedVoiceId: string;
}

export interface Story {
  id: string;
  title: string;
  audioUrl: string;
  durationSeconds: number;
  isFavorite: boolean;
  createdAt: string;
}

interface AppState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  profile: UserProfile | null;
  stories: Story[];
  currentStory: Story | null;
  generatingStory: { status: 'idle' | 'generating' | 'completed' | 'failed'; progress: number; phase: string };
  selectedDuration: 5 | 15 | 30 | 60 | 120 | 180;
  isUpgradeModalVisible: boolean;
  featureFlags: FeatureFlags | null;

  // Actions
  setUser: (user: User | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setStories: (stories: Story[]) => void;
  addStory: (story: Story) => void;
  setCurrentStory: (story: Story | null) => void;
  setGeneratingStory: (gen: Partial<AppState['generatingStory']>) => void;
  showUpgradeModal: () => void;
  hideUpgradeModal: () => void;
  logout: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      profile: null,
      stories: [],
      currentStory: null,
      generatingStory: { status: 'idle', progress: 0, phase: '' },
      selectedDuration: 5,
      isUpgradeModalVisible: false,
      featureFlags: null,

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setProfile: (profile) => set({ profile }),
      setStories: (stories) => set({ stories }),
      addStory: (story) => set((state) => ({ stories: [story, ...state.stories] })),
      setCurrentStory: (story) => set({ currentStory: story }),
      setGeneratingStory: (gen) => set((state) => ({ generatingStory: { ...state.generatingStory, ...gen } })),
      showUpgradeModal: () => set({ isUpgradeModalVisible: true }),
      hideUpgradeModal: () => set({ isUpgradeModalVisible: false }),
      logout: () => set({ user: null, token: null, isAuthenticated: false, profile: null, stories: [] }),
    }),
    {
      name: 'campfire-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ user: state.user, token: state.token, profile: state.profile, isAuthenticated: state.isAuthenticated }),
    }
  )
);

// Selectors
export const useUser = () => useAppStore((state) => state.user);
export const useProfile = () => useAppStore((state) => state.profile);
export const useStories = () => useAppStore((state) => state.stories);
export const useIsAuthenticated = () => useAppStore((state) => state.isAuthenticated);
export const useIsPremium = () => useAppStore((state) => state.user?.subscriptionTier === 'premium');
```

---

## 13. Navigation Structure

### Navigator Setup (`ios/src/navigation/index.tsx`)

```typescript
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { onAuthChange } from '../lib/firebase';
import { useAppStore } from '../lib/store';
import { api } from '../lib/api';
import { initializePurchases } from '../lib/purchases';

// Types
export type RootStackParamList = {
  Landing: undefined;
  Auth: undefined;
  Onboarding: undefined;
  MainTabs: undefined;
  Player: { storyId?: string; templateId?: string };
  Templates: undefined;
  CustomRequest: undefined;
  ProfileEdit: { section: string };
};

export type TabParamList = {
  Dashboard: undefined;
  Library: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function MainTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false, tabBarStyle: { backgroundColor: '#121010' } }}>
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Library" component={LibraryScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function Navigation() {
  const [isLoading, setIsLoading] = useState(true);
  const user = useAppStore((state) => state.user);
  const setUser = useAppStore((state) => state.setUser);

  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      if (firebaseUser) {
        await api.createOrUpdateUser();
        const userData = await api.getCurrentUser();
        setUser(userData);
        initializePurchases(userData.id);
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });
    return unsubscribe;
  }, []);

  if (isLoading) return <LoadingScreen />;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <>
            <Stack.Screen name="Landing" component={LandingScreen} />
            <Stack.Screen name="Auth" component={AuthScreen} />
          </>
        ) : !user.onboardingCompleted ? (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen name="Player" component={PlayerScreen} options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="Templates" component={TemplatesScreen} />
            <Stack.Screen name="CustomRequest" component={CustomRequestScreen} />
            <Stack.Screen name="ProfileEdit" component={ProfileEditScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

### Screen Flow
```
Landing → Auth → Onboarding → MainTabs
                                ├── Dashboard (Home)
                                ├── Library
                                └── Settings

Modal Screens: Player, Templates, CustomRequest, ProfileEdit
```

---

## 14. Design System & Theme

### Theme Tokens (`ios/src/lib/theme.ts`)

```typescript
export const colors = {
  // Deep obsidian blacks
  bgDeep: '#080604',
  bgElevated: '#121010',
  bgSurface: '#1A1614',
  bgHover: '#231F1C',
  bgGlass: 'rgba(18, 16, 14, 0.85)',

  // Amber/candlelight
  amber50: '#FFF8F0',
  amber100: '#FCECD8',
  amber200: '#F5D4A8',
  amber300: '#E8B978',
  amber400: '#D4975A',
  amber500: '#C4834A',
  amber600: '#A66D3A',
  amberGlow: 'rgba(212, 151, 90, 0.12)',

  // Wine/burgundy
  wine900: '#1A0A10',
  wine700: '#4A1828',
  wineGlow: 'rgba(106, 32, 56, 0.3)',

  // Rose gold accents
  roseGold: '#C4918A',

  // Status colors
  success: '#4A9D7C',
  error: '#C45A5A',

  // Text hierarchy
  textPrimary: '#F8F2EA',
  textSecondary: '#B8A898',
  textMuted: '#6A5D52',
};

export const fonts = {
  display: 'Cormorant-Regular',
  displayMedium: 'Cormorant-Medium',
  displaySemiBold: 'Cormorant-SemiBold',
  body: 'CrimsonPro-Regular',
  bodyMedium: 'CrimsonPro-Medium',
};

export const typography = {
  hero: { fontFamily: fonts.displaySemiBold, fontSize: 56, lineHeight: 64 },
  h1: { fontFamily: fonts.displaySemiBold, fontSize: 36, lineHeight: 44 },
  h2: { fontFamily: fonts.displaySemiBold, fontSize: 28, lineHeight: 36 },
  h3: { fontFamily: fonts.displayMedium, fontSize: 22, lineHeight: 28 },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24 },
  caption: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
};

export const spacing = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48,
};

export const borderRadius = {
  sm: 4, md: 8, lg: 12, xl: 16, full: 9999,
};
```

---

## 15. Deployment Patterns

### Backend Deployment (Railway)

1. **Create Railway Project**
   ```bash
   railway login
   railway init
   ```

2. **Add PostgreSQL Database**
   - Add PostgreSQL plugin in Railway dashboard
   - Copy DATABASE_URL to environment variables

3. **Configure Deployment** (`railway.json`)
   ```json
   {
     "$schema": "https://railway.app/railway.schema.json",
     "build": { "builder": "NIXPACKS" },
     "deploy": {
       "startCommand": "npm run build && npm start",
       "restartPolicyType": "ON_FAILURE",
       "restartPolicyMaxRetries": 10
     }
   }
   ```

4. **Set Environment Variables**
   - All values from `.env.example`
   - Production DATABASE_URL
   - Firebase credentials
   - API keys

5. **Deploy**
   ```bash
   railway up
   ```

### iOS Deployment (EAS Build)

1. **Install EAS CLI**
   ```bash
   npm install -g eas-cli
   eas login
   ```

2. **Configure EAS** (`eas.json`)
   ```json
   {
     "cli": { "version": ">= 16.28.0" },
     "build": {
       "development": {
         "developmentClient": true,
         "distribution": "internal"
       },
       "preview": { "distribution": "internal" },
       "production": { "autoIncrement": true }
     },
     "submit": {
       "production": {}
     }
   }
   ```

3. **Build for App Store**
   ```bash
   cd ios
   eas build --platform ios --profile production
   ```

4. **Submit to App Store**
   ```bash
   eas submit --platform ios
   ```

---

## 16. App Store Submission

### Prerequisites
- Apple Developer Account ($99/year)
- App icon (1024x1024 PNG, no transparency)
- Screenshots for required device sizes
- Privacy Policy URL
- Support URL

### App Store Connect Configuration

| Field | Example Value |
|-------|---------------|
| Name | Campfire - Audio Stories |
| Bundle ID | app.campfire.stories |
| SKU | campfire001 |
| Category | Entertainment |
| Age Rating | 17+ (explicit content) |

### Submission Checklist
- [ ] Backend API deployed to production
- [ ] `EXPO_PUBLIC_API_URL` set to production URL
- [ ] Privacy policy hosted
- [ ] Demo account created for reviewers
- [ ] All screenshots captured
- [ ] App tested on real device
- [ ] RevenueCat products configured

---

## 17. Environment Variables Reference

### Backend (`.env`)
```bash
# Server
NODE_ENV=production
PORT=3001

# Database
DATABASE_URL=postgresql://user:pass@host:port/db

# Firebase Admin
FIREBASE_PROJECT_ID=your-project
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com

# AI/LLM
GROK_API_KEY=xai-xxxxxxxxxx
GROK_API_URL=https://api.x.ai/v1

# TTS
ELEVENLABS_API_KEY=sk_xxxxxxxx
OPENAI_API_KEY=sk-xxxxxxxx
GOOGLE_TTS_CREDENTIALS={"type":"service_account",...}

# AWS S3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=campfire-audio

# RevenueCat
REVENUECAT_WEBHOOK_SECRET=your-secret

# Feature Flags
FF_PAYMENTS_ENABLED=true
FF_PREMIUM_MONTHLY_PRICE_CENTS=1999
```

### Frontend (`.env`)
```bash
EXPO_PUBLIC_API_URL=https://your-api.railway.app
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_xxxxxxxx
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_xxxxxxxx
```

---

## 18. API Routes Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/users/me` | Get current user |
| POST | `/api/users/me` | Create/update user |
| GET | `/api/users/me/profile` | Get user profile |
| PUT | `/api/users/me/profile` | Update profile |
| GET | `/api/stories` | List user stories |
| POST | `/api/stories/generate` | Generate new story |
| GET | `/api/stories/:id` | Get single story |
| PATCH | `/api/stories/:id/favorite` | Toggle favorite |
| DELETE | `/api/stories/:id` | Delete story |
| GET | `/api/templates` | List story templates |
| GET | `/api/voices` | List available voices |
| GET | `/api/voices/previews` | Get voice previews |
| GET | `/api/config/features` | Get feature flags |
| GET | `/api/config/pricing` | Get pricing info |
| POST | `/api/webhooks/revenuecat` | RevenueCat webhook |

---

## Summary

This document covers the complete architecture of a production audio storytelling app:

1. **Backend**: Express + TypeScript + PostgreSQL on Railway
2. **Frontend**: Expo React Native with Zustand state management
3. **Auth**: Firebase Authentication with JWT verification
4. **AI**: xAI Grok for story generation (OpenAI-compatible)
5. **TTS**: Multi-provider (Google, ElevenLabs, OpenAI)
6. **Storage**: AWS S3 with signed URLs
7. **Payments**: RevenueCat for subscription management
8. **Deployment**: Railway (API) + EAS Build (iOS)

Key patterns used:
- Feature flags for gradual rollout
- Minutes-based rate limiting
- Webhook-based subscription sync
- Persistent state with AsyncStorage
- Type-safe API client
- Modular service architecture
