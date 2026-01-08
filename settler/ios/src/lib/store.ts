import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Types
export type Persona = 'mediator' | 'judge_judy' | 'comedic';
export type SubscriptionTier = 'free' | 'premium' | 'trial';

export interface User {
  id: string;
  email: string;
  displayName: string | null;
  subscriptionTier: SubscriptionTier;
  subscriptionExpiresAt: string | null;
  trialStartedAt: string | null;
  argumentsToday: number;
  preferredPersona: Persona;
}

export interface Turn {
  id: string;
  speaker: 'person_a' | 'person_b';
  speakerName: string;
  transcription: string;
  audioUri?: string;
  durationSeconds?: number;
}

export interface Judgment {
  id: string;
  winner: 'person_a' | 'person_b' | 'tie';
  winnerName: string;
  reasoning: string;
  fullResponse: string;
  audioUrl?: string;
  researchPerformed: boolean;
  sources?: string[];
}

export interface Argument {
  id: string;
  mode: 'live' | 'turn_based';
  personAName: string;
  personBName: string;
  persona: Persona;
  status: 'recording' | 'processing' | 'completed' | 'failed';
  turns: Turn[];
  judgment?: Judgment;
  createdAt: string;
}

// Store interface
interface AppState {
  // Auth
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;

  // Current session
  currentArgument: {
    mode: 'live' | 'turn_based' | null;
    personAName: string;
    personBName: string;
    persona: Persona;
    turns: Turn[];
  };

  // Recording state
  isRecording: boolean;
  currentTranscript: string;
  isProcessing: boolean;

  // History
  arguments: Argument[];

  // UI
  isUpgradeModalVisible: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  logout: () => void;

  // Session actions
  startNewArgument: (
    mode: 'live' | 'turn_based',
    personAName: string,
    personBName: string,
    persona: Persona
  ) => void;
  addTurn: (turn: Turn) => void;
  clearCurrentArgument: () => void;

  // Recording actions
  setIsRecording: (value: boolean) => void;
  setCurrentTranscript: (text: string) => void;
  setIsProcessing: (value: boolean) => void;

  // History actions
  setArguments: (args: Argument[]) => void;
  addArgument: (arg: Argument) => void;

  // UI actions
  showUpgradeModal: () => void;
  hideUpgradeModal: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      token: null,
      isAuthenticated: false,

      currentArgument: {
        mode: null,
        personAName: '',
        personBName: '',
        persona: 'mediator',
        turns: [],
      },

      isRecording: false,
      currentTranscript: '',
      isProcessing: false,

      arguments: [],

      isUpgradeModalVisible: false,

      // Auth actions
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setToken: (token) => set({ token }),
      logout: () =>
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          currentArgument: {
            mode: null,
            personAName: '',
            personBName: '',
            persona: 'mediator',
            turns: [],
          },
        }),

      // Session actions
      startNewArgument: (mode, personAName, personBName, persona) =>
        set({
          currentArgument: {
            mode,
            personAName,
            personBName,
            persona,
            turns: [],
          },
          currentTranscript: '',
        }),

      addTurn: (turn) =>
        set((state) => ({
          currentArgument: {
            ...state.currentArgument,
            turns: [...state.currentArgument.turns, turn],
          },
        })),

      clearCurrentArgument: () =>
        set({
          currentArgument: {
            mode: null,
            personAName: '',
            personBName: '',
            persona: 'mediator',
            turns: [],
          },
          currentTranscript: '',
          isRecording: false,
          isProcessing: false,
        }),

      // Recording actions
      setIsRecording: (value) => set({ isRecording: value }),
      setCurrentTranscript: (text) => set({ currentTranscript: text }),
      setIsProcessing: (value) => set({ isProcessing: value }),

      // History actions
      setArguments: (args) => set({ arguments: args }),
      addArgument: (arg) =>
        set((state) => ({ arguments: [arg, ...state.arguments] })),

      // UI actions
      showUpgradeModal: () => set({ isUpgradeModalVisible: true }),
      hideUpgradeModal: () => set({ isUpgradeModalVisible: false }),
    }),
    {
      name: 'settler-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Selectors
export const useUser = () => useAppStore((state) => state.user);
export const useIsAuthenticated = () => useAppStore((state) => state.isAuthenticated);
export const useIsPremium = () =>
  useAppStore((state) => state.user?.subscriptionTier === 'premium');
export const useCurrentArgument = () => useAppStore((state) => state.currentArgument);
export const useArguments = () => useAppStore((state) => state.arguments);
