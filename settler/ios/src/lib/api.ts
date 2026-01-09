import { useAppStore } from './store';
import { getIdToken } from './firebase';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * API Client for Settler backend
 */
class ApiClient {
  private async getToken(): Promise<string | null> {
    // Get Firebase ID token for authentication
    const firebaseToken = await getIdToken();
    if (firebaseToken) return firebaseToken;
    return useAppStore.getState().token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.getToken();

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `Request failed: ${response.status}`);
    }

    return response.json();
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.request('/health');
  }

  // User endpoints
  async getCurrentUser() {
    return this.request<User>('/api/users/me');
  }

  async createOrUpdateUser(displayName?: string) {
    return this.request<User>('/api/users/me', {
      method: 'POST',
      body: JSON.stringify({ displayName }),
    });
  }

  async deleteAccount() {
    return this.request<{ success: boolean }>('/api/users/me', {
      method: 'DELETE',
    });
  }

  async updatePersona(persona: string) {
    return this.request<User>('/api/users/me/persona', {
      method: 'PATCH',
      body: JSON.stringify({ persona }),
    });
  }

  // Argument endpoints (placeholders)
  async getArguments() {
    return this.request<Argument[]>('/api/arguments');
  }

  async createArgument(data: CreateArgumentRequest) {
    return this.request<Argument>('/api/arguments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getArgument(id: string) {
    return this.request<ArgumentWithJudgment>(`/api/arguments/${id}`);
  }

  async deleteArgument(id: string) {
    return this.request<{ success: boolean }>(`/api/arguments/${id}`, {
      method: 'DELETE',
    });
  }

  async addTurn(argumentId: string, data: AddTurnRequest) {
    return this.request<Turn>(`/api/arguments/${argumentId}/turns`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async requestJudgment(argumentId: string) {
    return this.request<Judgment>(`/api/arguments/${argumentId}/judge`, {
      method: 'POST',
    });
  }

  async judgeScreenshot(screenshotBase64: string, mimeType: string = 'image/png') {
    return this.request<ScreenshotJudgmentResponse>('/api/arguments/screenshot', {
      method: 'POST',
      body: JSON.stringify({ screenshotBase64, mimeType }),
    });
  }

  // Transcription
  async transcribeAudio(audioBase64: string) {
    return this.request<{ transcription: string }>('/api/transcribe', {
      method: 'POST',
      body: JSON.stringify({ audio: audioBase64 }),
    });
  }
}

// Types used by the API client
interface User {
  id: string;
  email: string;
  displayName: string | null;
  subscriptionTier: 'free' | 'premium' | 'trial';
  subscriptionExpiresAt: string | null;
  argumentsToday: number;
  preferredPersona: string;
}

interface Argument {
  id: string;
  mode: 'live' | 'turn_based' | 'screenshot';
  personAName: string;
  personBName: string;
  persona: string;
  status: string;
  screenshotUrl?: string;
  createdAt: string;
}

interface ScreenshotJudgmentResponse {
  argument: ArgumentWithJudgment;
  remainingToday: number;
}

interface ArgumentWithJudgment extends Argument {
  turns: Turn[];
  judgment: Judgment | null;
}

interface Turn {
  id: string;
  speaker: 'person_a' | 'person_b';
  transcription: string;
  audioUrl: string | null;
  durationSeconds: number | null;
}

interface Judgment {
  id: string;
  winner: 'person_a' | 'person_b' | 'tie';
  winnerName: string;
  reasoning: string;
  fullResponse: string;
  audioUrl: string | null;
  researchPerformed: boolean;
  sources: string[];
}

interface CreateArgumentRequest {
  mode: 'live' | 'turn_based';
  personAName: string;
  personBName: string;
  persona: string;
}

interface AddTurnRequest {
  speaker: 'person_a' | 'person_b';
  transcription: string;
  audioUrl?: string;
  durationSeconds?: number;
}

export const api = new ApiClient();
