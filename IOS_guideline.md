# Full-Stack iOS App Development Guide

A comprehensive checklist for building production-ready iOS apps with React Native/Expo and a Node.js backend.

---

## TABLE OF CONTENTS

1. [Project Setup](#1-project-setup)
2. [Frontend Architecture](#2-frontend-architecture)
3. [Backend Architecture](#3-backend-architecture)
4. [Authentication](#4-authentication)
5. [Database](#5-database)
6. [Payments & Subscriptions](#6-payments--subscriptions)
7. [External Services](#7-external-services)
8. [App Store Compliance](#8-app-store-compliance)
9. [Deployment](#9-deployment)
10. [Pre-Submission Checklist](#10-pre-submission-checklist)

---

## 1. PROJECT SETUP

### Directory Structure
```
project/
├── ios/                    # React Native/Expo app
│   ├── App.tsx
│   ├── app.json           # Expo config
│   ├── eas.json           # EAS Build config
│   ├── package.json
│   ├── .env               # Environment variables
│   ├── src/
│   │   ├── screens/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── lib/
│   │   └── navigation/
│   └── assets/
├── api/                    # Backend
│   ├── src/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── middleware/
│   │   ├── db/
│   │   └── types/
│   ├── package.json
│   └── .env
└── docs/
```

### Initial Setup Checklist

- [ ] Create Expo project: `npx create-expo-app ios`
- [ ] Create API project: `mkdir api && cd api && npm init -y`
- [ ] Set up Git repository
- [ ] Create `.gitignore` (exclude node_modules, .env, build folders)
- [ ] Set up TypeScript in both projects
- [ ] Create `.env.example` files (document all required variables)

### Essential Configuration Files

**app.json** (Expo):
```json
{
  "expo": {
    "name": "App Name",
    "slug": "app-slug",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.company.appname",
      "buildNumber": "1",
      "infoPlist": {},
      "usesAppleSignIn": true
    },
    "plugins": [
      "expo-apple-authentication"
    ],
    "extra": {
      "eas": { "projectId": "your-eas-project-id" }
    }
  }
}
```

**eas.json**:
```json
{
  "cli": { "version": ">= 3.0.0", "appVersionSource": "remote" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {}
  }
}
```

---

## 2. FRONTEND ARCHITECTURE

### Core Dependencies
```json
{
  "expo": "~54.x",
  "react": "19.x",
  "react-native": "0.81.x",
  "@react-navigation/native": "^7.x",
  "@react-navigation/native-stack": "^7.x",
  "@react-navigation/bottom-tabs": "^7.x",
  "zustand": "^5.x",
  "firebase": "^12.x",
  "react-native-purchases": "^9.x",
  "expo-av": "^16.x",
  "expo-apple-authentication": "^8.x",
  "expo-crypto": "^15.x",
  "@react-native-async-storage/async-storage": "^2.x"
}
```

### State Management (Zustand)

```typescript
// src/lib/store.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AppState {
  // Auth
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;

  // Data
  profile: UserProfile | null;

  // Actions
  setUser: (user: User | null) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      profile: null,

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      logout: () => set({ user: null, token: null, isAuthenticated: false, profile: null }),
    }),
    {
      name: 'app-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
);
```

### Navigation Structure

```typescript
// src/navigation/index.tsx
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

export type RootStackParamList = {
  Landing: undefined;
  Auth: undefined;
  Onboarding: undefined;
  MainTabs: undefined;
  // Modal screens
  Player: { id: string };
};

export type TabParamList = {
  Home: undefined;
  Library: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function MainTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Library" component={LibraryScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function Navigation() {
  const user = useAppStore((state) => state.user);

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
            <Stack.Screen name="Player" component={PlayerScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

### API Client

```typescript
// src/lib/api.ts
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

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  // Define your API methods
  async getCurrentUser() { return this.request<User>('/api/users/me'); }
  async createOrUpdateUser(displayName?: string) {
    return this.request<User>('/api/users/me', {
      method: 'POST',
      body: JSON.stringify({ displayName }),
    });
  }
  async deleteAccount() {
    return this.request<{ success: boolean }>('/api/users/me', { method: 'DELETE' });
  }
  // ... more methods
}

export const api = new ApiClient();
```

### Frontend Checklist

- [ ] Set up Zustand store with persistence
- [ ] Configure React Navigation (stack + tabs)
- [ ] Create API client with token injection
- [ ] Set up theme/design system (colors, typography, spacing)
- [ ] Create reusable components
- [ ] Implement loading states
- [ ] Implement error handling
- [ ] Add pull-to-refresh where applicable
- [ ] Handle keyboard avoiding views
- [ ] Test on multiple screen sizes

---

## 3. BACKEND ARCHITECTURE

### Core Dependencies
```json
{
  "express": "^5.x",
  "typescript": "^5.x",
  "pg": "^8.x",
  "firebase-admin": "^13.x",
  "cors": "^2.x",
  "dotenv": "^17.x",
  "uuid": "^9.x"
}
```

### Express App Structure

```typescript
// src/app.ts
import express from 'express';
import cors from 'cors';
import usersRoutes from './routes/users';
import configRoutes from './routes/config';
import webhooksRoutes from './routes/webhooks';

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Routes
app.use('/api/users', usersRoutes);
app.use('/api/config', configRoutes);
app.use('/api/webhooks', webhooksRoutes);

export default app;
```

### Auth Middleware

```typescript
// src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin';

export interface AuthenticatedRequest extends Request {
  user?: { uid: string; email?: string };
}

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing authorization header' });
    return;
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = { uid: decodedToken.uid, email: decodedToken.email };
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};
```

### Database Connection

```typescript
// src/db/index.ts
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const result = await pool.query(text, params);
  return result.rows;
}

export async function queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] || null;
}
```

### Backend Checklist

- [ ] Set up Express with TypeScript
- [ ] Configure CORS
- [ ] Create database connection pool
- [ ] Implement auth middleware (Firebase Admin)
- [ ] Create user routes (CRUD)
- [ ] Set up migration system
- [ ] Add health check endpoint
- [ ] Implement error handling middleware
- [ ] Add request logging
- [ ] Set up environment variable validation

---

## 4. AUTHENTICATION

### Firebase Setup

1. Create Firebase project at https://console.firebase.google.com
2. Enable Authentication > Sign-in methods:
   - Email/Password
   - Apple (requires Apple Developer account)
3. Download `GoogleService-Info.plist` for iOS
4. Get service account JSON for backend

### Client-Side Firebase

```typescript
// src/lib/firebase.ts
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  signInWithCredential,
  OAuthProvider,
  User,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  // ... rest of config
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export async function signUp(email: string, password: string): Promise<User> {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  return result.user;
}

export async function signIn(email: string, password: string): Promise<User> {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

export async function signInWithApple(identityToken: string, nonce: string): Promise<User> {
  const provider = new OAuthProvider('apple.com');
  const credential = provider.credential({ idToken: identityToken, rawNonce: nonce });
  const result = await signInWithCredential(auth, credential);
  return result.user;
}

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export async function getIdToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}
```

### Apple Sign In

```typescript
// In AuthScreen.tsx
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';

const handleAppleSignIn = async () => {
  // Generate nonce
  const nonce = Math.random().toString(36).substring(2, 10) +
                Math.random().toString(36).substring(2, 10);
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    nonce
  );

  // Request Apple Sign In
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    nonce: hashedNonce,
  });

  if (!credential.identityToken) {
    throw new Error('No identity token');
  }

  // Sign in to Firebase
  await signInWithApple(credential.identityToken, nonce);

  // Extract name (only on first sign in)
  const displayName = credential.fullName
    ? [credential.fullName.givenName, credential.fullName.familyName].filter(Boolean).join(' ')
    : null;

  // Sync with backend
  await api.createOrUpdateUser(displayName || undefined);
};
```

### Server-Side Firebase Admin

```typescript
// src/middleware/auth.ts
import admin from 'firebase-admin';

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  }),
});
```

### Authentication Checklist

- [ ] Create Firebase project
- [ ] Enable Email/Password auth
- [ ] Enable Apple Sign In
- [ ] Download GoogleService-Info.plist
- [ ] Get service account credentials
- [ ] Implement client-side Firebase auth
- [ ] Implement Apple Sign In with nonce
- [ ] Implement server-side token verification
- [ ] Handle auth state persistence
- [ ] Implement logout/session clearing

---

## 5. DATABASE

### Migration System

```typescript
// src/db/migrate.ts
import fs from 'fs';
import path from 'path';
import { pool } from './index';

async function migrate() {
  // Create migrations table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // Get executed migrations
  const { rows: executed } = await pool.query('SELECT name FROM migrations');
  const executedNames = new Set(executed.map(r => r.name));

  // Get migration files
  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir).sort();

  for (const file of files) {
    if (executedNames.has(file)) continue;

    console.log(`Running migration: ${file}`);
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

    await pool.query('BEGIN');
    try {
      await pool.query(sql);
      await pool.query('INSERT INTO migrations (name) VALUES ($1)', [file]);
      await pool.query('COMMIT');
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
  }
}

migrate().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
```

### Essential Tables

```sql
-- 001_initial.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  firebase_uid VARCHAR(255) UNIQUE NOT NULL,
  subscription_tier VARCHAR(20) DEFAULT 'free',
  subscription_expires_at TIMESTAMP,
  apple_display_name VARCHAR(255),
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- User profiles table
CREATE TABLE user_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  display_name VARCHAR(100) NOT NULL,
  -- Add your profile fields here
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX idx_users_firebase_uid ON users(firebase_uid);
CREATE INDEX idx_users_email ON users(email);
```

### Database Checklist

- [ ] Set up PostgreSQL (Railway, Supabase, etc.)
- [ ] Create migration system
- [ ] Create users table with Firebase UID
- [ ] Create user_profiles table
- [ ] Add updated_at triggers
- [ ] Create necessary indexes
- [ ] Set up connection pooling
- [ ] Test migrations on fresh database

---

## 6. PAYMENTS & SUBSCRIPTIONS

### RevenueCat Setup

1. Create account at https://www.revenuecat.com
2. Create project and add iOS app
3. Get API keys (public for client, secret for webhooks)
4. Configure products in App Store Connect first

### App Store Connect Products

1. Go to App Store Connect > Your App > In-App Purchases
2. Create Subscription Group
3. Create products:
   - `appname_premium_monthly` - Monthly subscription
   - `appname_premium_annual` - Annual subscription
4. Set pricing and localization

### RevenueCat Dashboard

1. Add products from App Store Connect
2. Create Entitlement: `premium`
3. Create Offering with packages
4. Configure webhook URL

### Client Integration

```typescript
// src/lib/purchases.ts
import Purchases, { CustomerInfo, PurchasesPackage } from 'react-native-purchases';

const REVENUECAT_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY!;

export async function initializePurchases(userId: string): Promise<void> {
  await Purchases.configure({ apiKey: REVENUECAT_API_KEY, appUserID: userId });
}

export async function checkSubscriptionStatus(): Promise<boolean> {
  const customerInfo = await Purchases.getCustomerInfo();
  return customerInfo.entitlements.active['premium'] !== undefined;
}

export async function getOfferings() {
  const offerings = await Purchases.getOfferings();
  return offerings.current;
}

export async function purchasePackage(pkg: PurchasesPackage): Promise<boolean> {
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return customerInfo.entitlements.active['premium'] !== undefined;
}

export async function restorePurchases(): Promise<boolean> {
  const customerInfo = await Purchases.restorePurchases();
  return customerInfo.entitlements.active['premium'] !== undefined;
}
```

### Webhook Handler

```typescript
// src/routes/webhooks.ts
import { Router } from 'express';
import { queryOne, query } from '../db';

const router = Router();

router.post('/revenuecat', async (req, res) => {
  const authHeader = req.headers.authorization;

  // Verify webhook secret
  if (authHeader !== `Bearer ${process.env.REVENUECAT_WEBHOOK_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { event } = req.body;
  const { app_user_id, type } = event;

  // Find user
  const user = await queryOne(
    'SELECT * FROM users WHERE id = $1 OR firebase_uid = $1',
    [app_user_id]
  );

  if (!user) {
    return res.json({ received: true, processed: false, reason: 'User not found' });
  }

  // Handle event types
  switch (type) {
    case 'INITIAL_PURCHASE':
    case 'RENEWAL':
      await query(
        `UPDATE users SET subscription_tier = 'premium',
         subscription_expires_at = $1 WHERE id = $2`,
        [new Date(event.expiration_at_ms), user.id]
      );
      break;
    case 'EXPIRATION':
    case 'BILLING_ISSUE':
      await query(
        `UPDATE users SET subscription_tier = 'free' WHERE id = $1`,
        [user.id]
      );
      break;
  }

  res.json({ received: true, processed: true });
});

export default router;
```

### Payments Checklist

- [ ] Create RevenueCat account and project
- [ ] Create subscription products in App Store Connect
- [ ] Configure products in RevenueCat
- [ ] Create entitlement (e.g., "premium")
- [ ] Create offering with packages
- [ ] Implement client-side purchase flow
- [ ] Implement restore purchases
- [ ] Set up webhook endpoint
- [ ] Test in sandbox environment
- [ ] Add "Manage Subscription" link (opens App Store settings)
- [ ] Add "Restore Purchases" button

---

## 7. EXTERNAL SERVICES

### Required Services Checklist

- [ ] **Firebase** - Authentication
  - Project created
  - Auth methods enabled
  - GoogleService-Info.plist downloaded
  - Service account credentials saved

- [ ] **RevenueCat** - Subscriptions
  - Account created
  - iOS app added
  - Products configured
  - Webhook URL set

- [ ] **PostgreSQL** - Database
  - Instance created (Railway/Supabase)
  - Connection string saved
  - Migrations run

- [ ] **Cloud Storage** (if needed) - AWS S3/Google Cloud Storage
  - Bucket created
  - IAM credentials configured
  - CORS policy set

### Environment Variables Template

```bash
# .env.example

# Server
NODE_ENV=development
PORT=3001

# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# Firebase Admin
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@project.iam.gserviceaccount.com

# RevenueCat
REVENUECAT_WEBHOOK_SECRET=your-webhook-secret

# AWS S3 (if using)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=your-bucket

# Client (.env for Expo)
EXPO_PUBLIC_API_URL=https://your-api.railway.app
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_...
```

---

## 8. APP STORE COMPLIANCE

### Apple Guidelines Requirements

#### Sign in with Apple (REQUIRED if offering third-party login)
- [ ] If you offer any social login (Google, Facebook, etc.), you MUST offer Sign in with Apple
- [ ] Apple Sign In button must follow Apple's design guidelines
- [ ] Don't request name/email AFTER Apple Sign In (Apple provides them)
- [ ] Store `apple_display_name` from credential

#### Account Deletion (REQUIRED)
- [ ] Users must be able to delete their account from within the app
- [ ] Must delete all user data (not just deactivate)
- [ ] Settings > Delete Account button
- [ ] Double confirmation dialog
- [ ] Call backend to delete all data

```typescript
const handleDeleteAccount = () => {
  Alert.alert(
    'Delete Account',
    'Are you sure? This cannot be undone.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          Alert.alert(
            'Final Confirmation',
            'All your data will be permanently deleted.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Yes, Delete Everything',
                style: 'destructive',
                onPress: async () => {
                  await api.deleteAccount();
                  await signOut();
                  logout();
                },
              },
            ]
          );
        },
      },
    ]
  );
};
```

#### Privacy Policy (REQUIRED)
- [ ] Must have a privacy policy URL
- [ ] Must be accessible from within the app
- [ ] Must describe data collection practices

#### Terms of Service (REQUIRED for subscriptions)
- [ ] Separate URL from privacy policy
- [ ] Must cover subscription terms
- [ ] Must mention age requirements if applicable

#### Age Restriction (for 17+ content)
- [ ] Add age verification checkbox at signup
- [ ] Set app rating to 17+ in App Store Connect
- [ ] Terms of Service must state age requirement

```typescript
// In signup form
{isSignUp && (
  <TouchableOpacity onPress={() => setAgeVerified(!ageVerified)}>
    <Checkbox checked={ageVerified} />
    <Text>I confirm that I am 18 years of age or older</Text>
  </TouchableOpacity>
)}

// In handleSubmit
if (isSignUp && !ageVerified) {
  setError('You must confirm you are 18 or older');
  return;
}
```

#### Subscription Requirements
- [ ] Clearly display price before purchase
- [ ] Show billing frequency (monthly/annual)
- [ ] Mention auto-renewal
- [ ] Link to Terms of Service
- [ ] Restore Purchases button
- [ ] Manage Subscription link (opens App Store settings)

### App Store Connect Setup

- [ ] Create App Store Connect record
- [ ] Set bundle identifier (must match app.json)
- [ ] Upload app icon (1024x1024 PNG, no alpha)
- [ ] Add screenshots for all required sizes
- [ ] Write description (avoid prohibited words)
- [ ] Set content rating (answer questionnaire honestly)
- [ ] Add privacy policy URL
- [ ] Add support URL/email
- [ ] Create demo account (if required)
- [ ] Configure in-app purchases

---

## 9. DEPLOYMENT

### Backend Deployment (Railway)

1. Connect GitHub repo to Railway
2. Add PostgreSQL plugin
3. Configure environment variables
4. Set start command: `npm run build && npm start`

```json
// railway.json
{
  "build": { "builder": "NIXPACKS" },
  "deploy": {
    "startCommand": "npm run build && npm start",
    "restartPolicyType": "ON_FAILURE"
  }
}
```

Commands:
```bash
cd api
railway login
railway init
railway up
npm run db:migrate:prod  # Run migrations
```

### iOS Deployment (EAS)

1. Configure eas.json
2. Set up credentials in EAS

Commands:
```bash
cd ios
eas login
eas build:configure

# Build for App Store
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios
```

### Deployment Checklist

- [ ] Backend deployed and accessible
- [ ] Database migrated
- [ ] Environment variables set in production
- [ ] API health check passing
- [ ] EAS project configured
- [ ] Apple Developer credentials linked
- [ ] Production build succeeds
- [ ] App submitted to App Store

---

## 10. PRE-SUBMISSION CHECKLIST

### Code Quality
- [ ] No console.log statements in production
- [ ] Error handling in place
- [ ] Loading states implemented
- [ ] No hardcoded secrets
- [ ] TypeScript errors resolved

### Authentication
- [ ] Email/password auth works
- [ ] Apple Sign In works (test on real device)
- [ ] Logout clears all state
- [ ] Token refresh works
- [ ] Account deletion works

### Payments
- [ ] Subscription purchase works (sandbox)
- [ ] Restore purchases works
- [ ] Subscription status syncs correctly
- [ ] Webhook processes events
- [ ] UI updates after purchase

### Compliance
- [ ] Sign in with Apple implemented (if required)
- [ ] Account deletion available
- [ ] Privacy policy accessible
- [ ] Terms of service accessible
- [ ] Age verification (if 17+)
- [ ] Subscription terms displayed

### App Store Assets
- [ ] App icon (1024x1024)
- [ ] Screenshots (all required sizes)
- [ ] App description
- [ ] Keywords
- [ ] Support URL
- [ ] Privacy policy URL

### Testing
- [ ] Tested on multiple iOS versions
- [ ] Tested on multiple screen sizes
- [ ] Tested offline behavior
- [ ] Tested with slow network
- [ ] Tested signup flow
- [ ] Tested purchase flow
- [ ] Tested as new user
- [ ] Tested as returning user

### Final Steps
- [ ] Increment version number
- [ ] Build production app
- [ ] Test production build on device
- [ ] Submit to App Store
- [ ] Respond to App Review feedback promptly

---

## COMMON MISTAKES TO AVOID

1. **Not testing Sign in with Apple on real device** - Simulator doesn't support it
2. **Forgetting account deletion** - Apple requires this
3. **Same URL for Privacy Policy and ToS** - Should be different documents
4. **Not storing Apple displayName** - Only provided on first signin
5. **Not implementing Restore Purchases** - Required for subscriptions
6. **Hardcoding API URLs** - Use environment variables
7. **Not handling token expiration** - Implement refresh logic
8. **Missing loading states** - Users need feedback
9. **Not testing as new user** - Always test fresh installs
10. **Ignoring App Review guidelines** - Read them carefully

---

## QUICK REFERENCE

### Start New Project
```bash
npx create-expo-app ios --template blank-typescript
mkdir api && cd api && npm init -y
npm i express typescript pg firebase-admin
```

### Run Development
```bash
# Terminal 1: API
cd api && npm run dev

# Terminal 2: iOS
cd ios && npx expo start --ios
```

### Build & Submit
```bash
cd ios
eas build --platform ios --profile production
eas submit --platform ios
```

### Database Migration
```bash
cd api
npm run db:migrate        # Development
npm run db:migrate:prod   # Production
```
`