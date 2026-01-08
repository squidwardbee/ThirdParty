import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
});

// Voice IDs for different personas
export const PERSONA_VOICES: Record<string, string> = {
  // Mediator - calm, balanced voice
  mediator: 'EXAVITQu4vr4xnSDxMaL', // Rachel - soft, empathetic
  // Judge - authoritative, confident voice
  judge: 'ErXwobaYiN019PkySvjV', // Antoni - strong, clear
  // Comedic - expressive, fun voice
  comedic: 'MF3mGyEYCl7XYWbV9V6O', // Elli - playful, energetic
};

// Default voice if persona not found
const DEFAULT_VOICE = 'EXAVITQu4vr4xnSDxMaL';

export interface TTSResult {
  audioBuffer: Buffer;
  durationSeconds: number;
}

/**
 * Convert text to speech using ElevenLabs
 */
export async function textToSpeech(
  text: string,
  persona: string = 'mediator'
): Promise<TTSResult> {
  const voiceId = PERSONA_VOICES[persona] || DEFAULT_VOICE;

  // Generate audio
  const audioStream = await elevenlabs.textToSpeech.convert(voiceId, {
    text,
    modelId: 'eleven_turbo_v2_5',
    outputFormat: 'mp3_44100_128',
    voiceSettings: {
      stability: 0.5,
      similarityBoost: 0.75,
      style: persona === 'comedic' ? 0.5 : 0.0,
      useSpeakerBoost: true,
    },
  });

  // Collect stream chunks into buffer
  const chunks: Buffer[] = [];
  for await (const chunk of audioStream) {
    chunks.push(Buffer.from(chunk));
  }

  const audioBuffer = Buffer.concat(chunks);

  // Estimate duration (128kbps = 16KB/s)
  const durationSeconds = Math.round(audioBuffer.length / 16000);

  return {
    audioBuffer,
    durationSeconds,
  };
}

/**
 * Generate judgment audio with appropriate persona voice
 */
export async function generateJudgmentAudio(
  judgment: {
    winnerName: string;
    reasoning: string;
    fullResponse: string;
  },
  persona: string
): Promise<TTSResult> {
  // Use full response for audio if available, otherwise reasoning
  const text = judgment.fullResponse || judgment.reasoning;

  return textToSpeech(text, persona);
}

/**
 * Get available voices for a persona
 */
export async function getAvailableVoices(): Promise<
  { id: string; name: string; persona: string }[]
> {
  const voices = await elevenlabs.voices.getAll();

  return voices.voices.map((voice) => ({
    id: voice.voiceId,
    name: voice.name || 'Unknown',
    persona: getPersonaForVoice(voice.voiceId),
  }));
}

function getPersonaForVoice(voiceId: string): string {
  for (const [persona, id] of Object.entries(PERSONA_VOICES)) {
    if (id === voiceId) return persona;
  }
  return 'custom';
}
