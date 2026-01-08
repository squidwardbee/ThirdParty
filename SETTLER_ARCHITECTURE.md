# Settler - Argument Resolution App Architecture

> AI-powered app that listens to arguments between couples/friends and delivers fair, researched judgments.

---

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [User Flow](#4-user-flow)
5. [Database Schema](#5-database-schema)
6. [API Routes](#6-api-routes)
7. [Speech-to-Text Integration](#7-speech-to-text-integration)
8. [AI Judgment System](#8-ai-judgment-system)
9. [Text-to-Speech (ElevenLabs)](#9-text-to-speech-elevenlabs)
10. [Frontend Screens](#10-frontend-screens)
11. [State Management](#11-state-management)
12. [Subscription Model](#12-subscription-model)
13. [Environment Variables](#13-environment-variables)

---

## 1. Project Overview

**Settler** is an AI-powered argument resolution app that:
- Listens to disagreements between two people
- Transcribes and analyzes each person's position
- Researches facts when needed (agentic AI)
- Delivers a fair judgment with clear winner and reasoning
- Speaks the verdict aloud using premium TTS
- Saves all arguments for future reference

### Two Main Modes

| Mode | Description |
|------|-------------|
| **Live Conversation** | App listens to both people talking naturally, uses speaker diarization (or AI detection) to separate speakers, user ends when ready |
| **Turn-Based** | Users take turns recording their arguments sequentially, each labeled with their name, unlimited turns until "Judge" is pressed |

### Core Features
- Firebase authentication (email/password)
- Live transcription display during recording
- AI persona selection (Serious Mediator, Judge Judy, Comedic)
- Web search for fact-checking when needed
- Clear winner declaration with reasoning
- Audio playback of judgment (ElevenLabs TTS)
- Full argument history saved
- Screenshot export option
- Subscription with 3-day free trial

---

## 2. Tech Stack

### Frontend (iOS)
| Technology | Purpose | Version |
|------------|---------|---------|
| Expo | React Native framework | ~54.0 |
| React Native | Cross-platform mobile | 0.81.x |
| React Navigation | Navigation (stack + tabs) | 7.x |
| Zustand | State management | 5.x |
| Expo AV | Audio recording/playback | 16.x |
| expo-speech-recognition | Speech-to-text (on-device) | Latest |
| Firebase | Authentication | 12.x |
| react-native-purchases | RevenueCat SDK | 9.x |
| react-native-view-shot | Screenshot capture | 4.x |
| react-native-share | Share screenshots | 10.x |

### Backend (API)
| Technology | Purpose | Version |
|------------|---------|---------|
| Node.js | Runtime | 18+ |
| Express | HTTP framework | 5.x |
| TypeScript | Type safety | 5.x |
| PostgreSQL | Database | 14+ |
| Firebase Admin | Token verification | 13.x |
| OpenAI SDK | Whisper STT + GPT-4 | 6.x |
| Anthropic SDK | Claude for judgment (alternative) | Latest |

### AI & Audio Services
| Service | Purpose |
|---------|---------|
| OpenAI Whisper | Speech-to-text (server-side, high accuracy) |
| expo-speech-recognition | On-device STT for live transcription |
| OpenAI GPT-4 / Claude | AI judgment with tool use (web search) |
| Tavily / Perplexity API | Web search for fact-checking |
| ElevenLabs | Text-to-speech for verdicts |

### Infrastructure
| Service | Purpose |
|---------|---------|
| Railway | API hosting + PostgreSQL |
| AWS S3 | Audio file storage (recordings + verdicts) |
| RevenueCat | Subscription management |
| Firebase | Authentication |
| EAS (Expo) | iOS builds |

---

## 3. Project Structure

```
settler/
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
│   │   │   ├── arguments.ts      # Argument CRUD + history
│   │   │   ├── transcribe.ts     # Speech-to-text endpoint
│   │   │   ├── judge.ts          # AI judgment endpoint
│   │   │   ├── config.ts         # Feature flags + pricing
│   │   │   └── webhooks.ts       # RevenueCat webhooks
│   │   ├── services/
│   │   │   ├── transcription.ts  # Whisper STT service
│   │   │   ├── judgment.ts       # AI agent for judging
│   │   │   ├── research.ts       # Web search integration
│   │   │   ├── tts.ts            # ElevenLabs TTS
│   │   │   └── storage.ts        # AWS S3 operations
│   │   ├── agents/
│   │   │   └── judgeAgent.ts     # Agentic AI with tool use
│   │   └── types/
│   │       └── index.ts          # TypeScript interfaces
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
├── ios/                          # Expo React Native app
│   ├── App.tsx                   # Root component
│   ├── src/
│   │   ├── screens/
│   │   │   ├── AuthScreen.tsx
│   │   │   ├── HomeScreen.tsx           # Mode selection
│   │   │   ├── LiveModeScreen.tsx       # Live conversation recording
│   │   │   ├── TurnBasedScreen.tsx      # Turn-based recording
│   │   │   ├── JudgmentScreen.tsx       # Verdict display + audio
│   │   │   ├── HistoryScreen.tsx        # Past arguments
│   │   │   ├── ArgumentDetailScreen.tsx # Single argument view
│   │   │   ├── SettingsScreen.tsx
│   │   │   └── PaywallScreen.tsx
│   │   ├── components/
│   │   │   ├── RecordButton.tsx
│   │   │   ├── TranscriptionDisplay.tsx
│   │   │   ├── PersonaSelector.tsx
│   │   │   ├── ParticipantCard.tsx
│   │   │   ├── VerdictCard.tsx
│   │   │   └── UpgradeModal.tsx
│   │   ├── lib/
│   │   │   ├── store.ts          # Zustand state
│   │   │   ├── api.ts            # API client
│   │   │   ├── firebase.ts       # Firebase config
│   │   │   ├── purchases.ts      # RevenueCat integration
│   │   │   ├── audio.ts          # Recording utilities
│   │   │   └── theme.ts          # Design tokens
│   │   ├── navigation/
│   │   │   └── index.tsx         # Stack + tab navigators
│   │   └── hooks/
│   │       ├── useRecording.ts
│   │       ├── useSpeechRecognition.ts
│   │       └── useAudioPlayer.ts
│   ├── app.json
│   ├── eas.json
│   └── package.json
│
└── docs/
    └── SETTLER_ARCHITECTURE.md   # This file
```

---

## 4. User Flow

### Authentication Flow
```
Landing → Auth (Email/Password) → Home
```

### Live Conversation Mode
```
Home → Select "Live Mode" → Enter Names (Person A, Person B)
  → Select AI Persona → Start Recording
  → [Live transcription displayed]
  → User taps "End & Judge"
  → Loading (AI processing + research)
  → Judgment Screen (verdict + audio playback)
  → Save to History
```

### Turn-Based Mode
```
Home → Select "Turn-Based" → Enter Names (Person A, Person B)
  → Select AI Persona
  → Person A's Turn: Record → See transcription
  → Person B's Turn: Record → See transcription
  → [Repeat unlimited times]
  → Tap "Judge"
  → Loading (AI processing + research)
  → Judgment Screen (verdict + audio playback)
  → Save to History
```

### History Flow
```
History Tab → List of past arguments
  → Tap argument → Full detail view
  → Replay audio verdict
  → Screenshot & share option
```

---

## 5. Database Schema

```sql
-- 001_initial.sql

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

  -- Mode
  mode VARCHAR(20) NOT NULL CHECK (mode IN ('live', 'turn_based')),

  -- Participants
  person_a_name VARCHAR(100) NOT NULL,
  person_b_name VARCHAR(100) NOT NULL,

  -- AI Configuration
  persona VARCHAR(50) NOT NULL DEFAULT 'mediator',

  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('recording', 'processing', 'completed', 'failed')),

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Argument turns (for turn-based mode, or diarized segments for live mode)
CREATE TABLE argument_turns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  argument_id UUID NOT NULL REFERENCES arguments(id) ON DELETE CASCADE,

  -- Who spoke
  speaker VARCHAR(10) NOT NULL CHECK (speaker IN ('person_a', 'person_b')),

  -- Content
  audio_url TEXT,
  transcription TEXT NOT NULL,

  -- Order
  turn_order INTEGER NOT NULL,
  duration_seconds INTEGER,

  created_at TIMESTAMP DEFAULT NOW()
);

-- Judgments (AI verdict)
CREATE TABLE judgments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  argument_id UUID NOT NULL REFERENCES arguments(id) ON DELETE CASCADE,

  -- Verdict
  winner VARCHAR(10) NOT NULL CHECK (winner IN ('person_a', 'person_b', 'tie')),
  winner_name VARCHAR(100) NOT NULL,
  reasoning TEXT NOT NULL,

  -- Research performed
  research_performed BOOLEAN DEFAULT FALSE,
  research_summary TEXT,
  sources JSONB DEFAULT '[]',

  -- Audio
  audio_url TEXT,
  audio_duration_seconds INTEGER,

  -- Full response
  full_response TEXT NOT NULL,

  created_at TIMESTAMP DEFAULT NOW()
);

-- Subscription events
CREATE TABLE subscription_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  product_id VARCHAR(100),
  raw_payload JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_firebase_uid ON users(firebase_uid);
CREATE INDEX idx_arguments_user_id ON arguments(user_id);
CREATE INDEX idx_arguments_created_at ON arguments(created_at DESC);
CREATE INDEX idx_argument_turns_argument_id ON argument_turns(argument_id);
CREATE INDEX idx_judgments_argument_id ON judgments(argument_id);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## 6. API Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| **Health** |
| GET | `/health` | Health check |
| **Users** |
| GET | `/api/users/me` | Get current user |
| POST | `/api/users/me` | Create/update user |
| DELETE | `/api/users/me` | Delete account (GDPR) |
| PATCH | `/api/users/me/persona` | Update preferred persona |
| **Arguments** |
| GET | `/api/arguments` | List user's arguments (history) |
| POST | `/api/arguments` | Create new argument session |
| GET | `/api/arguments/:id` | Get single argument with turns & judgment |
| DELETE | `/api/arguments/:id` | Delete argument |
| **Turns** |
| POST | `/api/arguments/:id/turns` | Add a turn (turn-based mode) |
| **Transcription** |
| POST | `/api/transcribe` | Transcribe audio file (Whisper) |
| POST | `/api/transcribe/diarize` | Transcribe with speaker diarization |
| **Judgment** |
| POST | `/api/arguments/:id/judge` | Trigger AI judgment |
| GET | `/api/arguments/:id/judgment` | Get judgment result |
| **Config** |
| GET | `/api/config/personas` | Get available AI personas |
| GET | `/api/config/limits` | Get usage limits |
| **Webhooks** |
| POST | `/api/webhooks/revenuecat` | RevenueCat subscription events |

---

## 7. Speech-to-Text Integration

### Hybrid Approach

| Layer | Technology | Purpose |
|-------|------------|---------|
| Client (live) | expo-speech-recognition | Real-time transcription display |
| Server (final) | OpenAI Whisper | High-accuracy final transcription |
| Server (diarization) | Whisper + pyannote.audio OR AssemblyAI | Speaker separation |

### Client-Side Live Transcription

```typescript
// ios/src/hooks/useSpeechRecognition.ts
import { useSpeechRecognitionEvent, ExpoSpeechRecognitionModule } from 'expo-speech-recognition';

export function useLiveTranscription() {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);

  useSpeechRecognitionEvent('result', (event) => {
    const text = event.results[0]?.transcript || '';
    setTranscript(text);
  });

  const startListening = async () => {
    const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!granted) throw new Error('Microphone permission required');

    await ExpoSpeechRecognitionModule.start({
      lang: 'en-US',
      interimResults: true,
      continuous: true,
    });
    setIsListening(true);
  };

  const stopListening = async () => {
    await ExpoSpeechRecognitionModule.stop();
    setIsListening(false);
  };

  return { transcript, isListening, startListening, stopListening };
}
```

### Server-Side Whisper Transcription

```typescript
// api/src/services/transcription.ts
import OpenAI from 'openai';
import fs from 'fs';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function transcribeAudio(audioFilePath: string): Promise<string> {
  const transcription = await openai.audio.transcriptions.create({
    file: fs.createReadStream(audioFilePath),
    model: 'whisper-1',
    response_format: 'text',
  });

  return transcription;
}
```

### Speaker Diarization Option

For live mode, we have two options:

**Option A: Simple AI Detection (Recommended for MVP)**
- Send full transcript to AI
- Let AI infer speaker boundaries from context
- Works well for clear conversations

**Option B: AssemblyAI Diarization (Higher accuracy)**
```typescript
// api/src/services/transcription.ts
import { AssemblyAI } from 'assemblyai';

const client = new AssemblyAI({ apiKey: process.env.ASSEMBLYAI_API_KEY });

export async function transcribeWithDiarization(audioUrl: string) {
  const transcript = await client.transcripts.transcribe({
    audio: audioUrl,
    speaker_labels: true,
  });

  // Returns utterances with speaker labels
  return transcript.utterances?.map(u => ({
    speaker: u.speaker, // 'A' or 'B'
    text: u.text,
    start: u.start,
    end: u.end,
  }));
}
```

---

## 8. AI Judgment System

### Agentic Architecture

The judgment system uses tool-calling to enable research when needed:

```typescript
// api/src/agents/judgeAgent.ts
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface JudgmentInput {
  personAName: string;
  personBName: string;
  turns: Array<{ speaker: string; text: string }>;
  persona: 'mediator' | 'judge_judy' | 'comedic';
}

interface JudgmentResult {
  winner: 'person_a' | 'person_b' | 'tie';
  winnerName: string;
  reasoning: string;
  researchPerformed: boolean;
  researchSummary?: string;
  sources?: string[];
  fullResponse: string;
}

const PERSONA_PROMPTS = {
  mediator: `You are a fair and diplomatic mediator. Analyze both sides carefully,
    acknowledge valid points from each person, but ultimately declare a clear winner
    based on logic, facts, and reasonableness. Be empathetic but decisive.`,

  judge_judy: `You are Judge Judy - direct, no-nonsense, and brutally honest.
    Cut through the BS, call out logical fallacies, and deliver your verdict
    with sharp wit. Don't sugarcoat anything. Pick a clear winner.`,

  comedic: `You are a comedic judge who makes light of the situation while still
    being fair. Use humor and witty observations, but give a real verdict.
    Think of yourself as a funny friend who tells it like it is.`,
};

const tools: OpenAI.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'search_web',
      description: 'Search the web for factual information to verify claims or get context',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query to look up facts',
          },
        },
        required: ['query'],
      },
    },
  },
];

export async function generateJudgment(input: JudgmentInput): Promise<JudgmentResult> {
  const conversationText = input.turns
    .map(t => `${t.speaker === 'person_a' ? input.personAName : input.personBName}: "${t.text}"`)
    .join('\n\n');

  const systemPrompt = `${PERSONA_PROMPTS[input.persona]}

You are judging an argument between ${input.personAName} and ${input.personBName}.

Your task:
1. Carefully analyze each person's arguments
2. If factual claims are made that you're unsure about, use the search_web tool to verify
3. Determine a clear winner (you MUST pick one, no cop-outs)
4. Provide clear reasoning for your decision
5. Format your final response for text-to-speech (it will be read aloud)

Structure your response as:
- Brief summary of the dispute
- Key points from each side
- Your verdict (who wins and why)
- Final words to both parties`;

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Here is the argument:\n\n${conversationText}\n\nPlease render your judgment.` },
  ];

  let researchPerformed = false;
  let researchSummary = '';
  let sources: string[] = [];

  // Agentic loop - handle tool calls
  while (true) {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages,
      tools,
      tool_choice: 'auto',
    });

    const message = response.choices[0].message;

    if (message.tool_calls && message.tool_calls.length > 0) {
      messages.push(message);

      for (const toolCall of message.tool_calls) {
        if (toolCall.function.name === 'search_web') {
          const args = JSON.parse(toolCall.function.arguments);
          const searchResult = await performWebSearch(args.query);

          researchPerformed = true;
          sources.push(...searchResult.sources);
          researchSummary += `Searched: "${args.query}"\n${searchResult.summary}\n\n`;

          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: searchResult.summary,
          });
        }
      }
    } else {
      // No more tool calls, we have the final response
      const fullResponse = message.content || '';

      // Parse winner from response (simple heuristic)
      const winnerMatch = fullResponse.toLowerCase();
      let winner: 'person_a' | 'person_b' | 'tie' = 'tie';

      if (winnerMatch.includes(input.personAName.toLowerCase() + ' wins') ||
          winnerMatch.includes('winner: ' + input.personAName.toLowerCase())) {
        winner = 'person_a';
      } else if (winnerMatch.includes(input.personBName.toLowerCase() + ' wins') ||
                 winnerMatch.includes('winner: ' + input.personBName.toLowerCase())) {
        winner = 'person_b';
      }

      return {
        winner,
        winnerName: winner === 'person_a' ? input.personAName :
                    winner === 'person_b' ? input.personBName : 'Tie',
        reasoning: fullResponse,
        researchPerformed,
        researchSummary: researchSummary || undefined,
        sources: sources.length > 0 ? sources : undefined,
        fullResponse,
      };
    }
  }
}

// Web search using Tavily
async function performWebSearch(query: string): Promise<{ summary: string; sources: string[] }> {
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      api_key: process.env.TAVILY_API_KEY,
      query,
      max_results: 3,
    }),
  });

  const data = await response.json();

  const sources = data.results?.map((r: any) => r.url) || [];
  const summary = data.results?.map((r: any) => r.content).join('\n\n') || 'No results found';

  return { summary, sources };
}
```

---

## 9. Text-to-Speech (ElevenLabs)

```typescript
// api/src/services/tts.ts

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const DEFAULT_VOICE_ID = 'pNInz6obpgDQGcFmaJgB'; // Adam - authoritative voice

interface TTSResult {
  audioBuffer: Buffer;
  durationSeconds: number;
}

export async function synthesizeVerdict(text: string, voiceId?: string): Promise<TTSResult> {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId || DEFAULT_VOICE_ID}`,
    {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY!,
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_turbo_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.5,
          use_speaker_boost: true,
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`ElevenLabs API error: ${response.statusText}`);
  }

  const audioBuffer = Buffer.from(await response.arrayBuffer());

  // Estimate duration (rough: ~150 words per minute)
  const wordCount = text.split(/\s+/).length;
  const durationSeconds = Math.round((wordCount / 150) * 60);

  return { audioBuffer, durationSeconds };
}
```

---

## 10. Frontend Screens

### Screen List

| Screen | Purpose |
|--------|---------|
| `AuthScreen` | Email/password login/signup |
| `HomeScreen` | Mode selection (Live vs Turn-Based) |
| `SetupScreen` | Enter names, select persona |
| `LiveModeScreen` | Record live conversation with transcription |
| `TurnBasedScreen` | Take turns recording arguments |
| `ProcessingScreen` | Loading while AI judges |
| `JudgmentScreen` | Display verdict, play audio, share |
| `HistoryScreen` | List past arguments |
| `ArgumentDetailScreen` | View single past argument |
| `SettingsScreen` | Account, subscription, persona preference |
| `PaywallScreen` | Subscription purchase |

### Navigation Structure

```typescript
// src/navigation/index.tsx

export type RootStackParamList = {
  Auth: undefined;
  MainTabs: undefined;
  Setup: { mode: 'live' | 'turn_based' };
  LiveMode: { personA: string; personB: string; persona: string };
  TurnBased: { personA: string; personB: string; persona: string };
  Processing: { argumentId: string };
  Judgment: { argumentId: string };
  ArgumentDetail: { argumentId: string };
  Paywall: undefined;
};

export type TabParamList = {
  Home: undefined;
  History: undefined;
  Settings: undefined;
};
```

### Key Screen: TurnBasedScreen

```typescript
// src/screens/TurnBasedScreen.tsx (pseudocode structure)

function TurnBasedScreen({ route }) {
  const { personA, personB, persona } = route.params;
  const [turns, setTurns] = useState<Turn[]>([]);
  const [currentSpeaker, setCurrentSpeaker] = useState<'person_a' | 'person_b'>('person_a');
  const [isRecording, setIsRecording] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');

  const handleRecordTurn = async () => {
    // 1. Start recording audio + live transcription
    // 2. User speaks
    // 3. User taps stop
    // 4. Save turn with transcription
    // 5. Switch to other speaker
  };

  const handleJudge = async () => {
    // 1. Create argument on server
    // 2. Upload all turns
    // 3. Navigate to Processing screen
  };

  return (
    <View>
      <TurnsList turns={turns} personA={personA} personB={personB} />

      <CurrentSpeakerCard
        name={currentSpeaker === 'person_a' ? personA : personB}
        isRecording={isRecording}
        transcript={currentTranscript}
      />

      <RecordButton
        onPress={handleRecordTurn}
        isRecording={isRecording}
      />

      <SwitchSpeakerButton
        onPress={() => setCurrentSpeaker(s => s === 'person_a' ? 'person_b' : 'person_a')}
      />

      {turns.length >= 2 && (
        <JudgeButton onPress={handleJudge} />
      )}
    </View>
  );
}
```

---

## 11. State Management

```typescript
// src/lib/store.ts

interface User {
  id: string;
  email: string;
  displayName: string | null;
  subscriptionTier: 'free' | 'premium' | 'trial';
  subscriptionExpiresAt: string | null;
  trialStartedAt: string | null;
  argumentsToday: number;
  preferredPersona: 'mediator' | 'judge_judy' | 'comedic';
}

interface Turn {
  id: string;
  speaker: 'person_a' | 'person_b';
  speakerName: string;
  transcription: string;
  audioUri?: string;
  durationSeconds?: number;
}

interface Judgment {
  id: string;
  winner: 'person_a' | 'person_b' | 'tie';
  winnerName: string;
  reasoning: string;
  fullResponse: string;
  audioUrl?: string;
  researchPerformed: boolean;
  sources?: string[];
}

interface Argument {
  id: string;
  mode: 'live' | 'turn_based';
  personAName: string;
  personBName: string;
  persona: string;
  status: 'recording' | 'processing' | 'completed' | 'failed';
  turns: Turn[];
  judgment?: Judgment;
  createdAt: string;
}

interface AppState {
  // Auth
  user: User | null;
  isAuthenticated: boolean;

  // Current session
  currentArgument: Argument | null;
  pendingTurns: Turn[];

  // History
  arguments: Argument[];

  // UI State
  isRecording: boolean;
  isProcessing: boolean;
  currentTranscript: string;

  // Actions
  setUser: (user: User | null) => void;
  logout: () => void;

  startNewArgument: (mode: 'live' | 'turn_based', personA: string, personB: string, persona: string) => void;
  addTurn: (turn: Turn) => void;
  clearPendingTurns: () => void;

  setCurrentTranscript: (text: string) => void;
  setIsRecording: (value: boolean) => void;
  setIsProcessing: (value: boolean) => void;

  setArguments: (args: Argument[]) => void;
  addArgument: (arg: Argument) => void;
}
```

---

## 12. Subscription Model

### Tiers

| Feature | Free | Premium |
|---------|------|---------|
| Arguments per day | 3 | Unlimited |
| AI Personas | Mediator only | All 3 |
| History | Last 10 | Unlimited |
| Audio verdict | No | Yes |
| Web research | No | Yes |
| Priority processing | No | Yes |

### Pricing

| Plan | Price | Trial |
|------|-------|-------|
| Monthly | $9.99/mo | 3 days free |
| Annual | $59.99/yr | 3 days free |

### RevenueCat Configuration

```typescript
// Products
settler_premium_monthly - $9.99/month
settler_premium_annual - $59.99/year

// Entitlement
premium

// Offering
default
  - Monthly package
  - Annual package (highlight as best value)
```

---

## 13. Environment Variables

### Backend (.env)
```bash
# Server
NODE_ENV=development
PORT=3001

# Database
DATABASE_URL=postgresql://user:pass@host:5432/settler

# Firebase Admin
FIREBASE_PROJECT_ID=settler-app
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@settler-app.iam.gserviceaccount.com

# OpenAI (Whisper + GPT-4)
OPENAI_API_KEY=sk-...

# ElevenLabs (TTS)
ELEVENLABS_API_KEY=...

# Web Search (Tavily)
TAVILY_API_KEY=tvly-...

# AWS S3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=settler-audio

# RevenueCat
REVENUECAT_WEBHOOK_SECRET=...

# Optional: AssemblyAI for diarization
ASSEMBLYAI_API_KEY=...
```

### Frontend (.env)
```bash
EXPO_PUBLIC_API_URL=https://settler-api.railway.app
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_...
```

---

## Implementation Priority

### Phase 1: MVP Core
1. Project setup (Expo + Express + PostgreSQL)
2. Firebase authentication
3. Basic database schema
4. Turn-based mode with Whisper transcription
5. Simple AI judgment (no research)
6. Basic UI for recording and viewing verdict

### Phase 2: Enhanced Features
7. Live conversation mode with expo-speech-recognition
8. ElevenLabs TTS for verdicts
9. AI personas (all 3)
10. Agentic research with web search
11. History and argument detail screens

### Phase 3: Monetization
12. RevenueCat integration
13. Subscription tiers and limits
14. Paywall screen
15. Free trial flow

### Phase 4: Polish
16. Screenshot sharing
17. Speaker diarization (AssemblyAI)
18. Offline support (local recording)
19. Push notifications
20. App Store submission

---

## Key Technical Decisions

| Decision | Choice | Reasoning |
|----------|--------|-----------|
| STT for live display | expo-speech-recognition | On-device, real-time, no API cost |
| STT for accuracy | OpenAI Whisper | Best accuracy for final transcription |
| AI Model | GPT-4 with tool use | Best for agentic behavior + research |
| TTS | ElevenLabs | High quality, natural sounding |
| Diarization | AI inference (MVP) → AssemblyAI (later) | Start simple, upgrade if needed |
| Web search | Tavily API | Built for AI agents, good summaries |
| State | Zustand | Lightweight, persistent, hooks-based |
| Payments | RevenueCat | Handles receipts, trials, cross-platform |
