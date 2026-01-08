import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface TranscriptionResult {
  text: string;
  segments?: TranscriptionSegment[];
  language?: string;
  duration?: number;
}

export interface TranscriptionSegment {
  id: number;
  start: number;
  end: number;
  text: string;
}

/**
 * Transcribe audio file using OpenAI Whisper
 * Supports mp3, mp4, mpeg, mpga, m4a, wav, and webm
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  filename: string = 'audio.m4a'
): Promise<TranscriptionResult> {
  // Write buffer to temp file (OpenAI SDK requires file path)
  const tempDir = path.join(process.cwd(), 'temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const tempPath = path.join(tempDir, `${uuidv4()}-${filename}`);

  try {
    fs.writeFileSync(tempPath, audioBuffer);

    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempPath),
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['segment'],
    });

    return {
      text: transcription.text,
      segments: transcription.segments?.map((seg) => ({
        id: seg.id,
        start: seg.start,
        end: seg.end,
        text: seg.text,
      })),
      language: transcription.language,
      duration: transcription.duration,
    };
  } finally {
    // Clean up temp file
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
  }
}

/**
 * Transcribe audio from URL
 */
export async function transcribeFromUrl(audioUrl: string): Promise<TranscriptionResult> {
  const response = await fetch(audioUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch audio: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Extract filename from URL or use default
  const urlPath = new URL(audioUrl).pathname;
  const filename = path.basename(urlPath) || 'audio.m4a';

  return transcribeAudio(buffer, filename);
}

/**
 * Transcribe audio from base64 encoded string
 */
export async function transcribeFromBase64(
  base64Audio: string,
  mimeType: string = 'audio/m4a'
): Promise<TranscriptionResult> {
  // Remove data URL prefix if present
  const base64Data = base64Audio.replace(/^data:audio\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');

  // Determine file extension from mime type
  const extMap: Record<string, string> = {
    'audio/mpeg': 'mp3',
    'audio/mp3': 'mp3',
    'audio/mp4': 'm4a',
    'audio/m4a': 'm4a',
    'audio/wav': 'wav',
    'audio/webm': 'webm',
    'audio/x-m4a': 'm4a',
  };

  const ext = extMap[mimeType] || 'm4a';

  return transcribeAudio(buffer, `audio.${ext}`);
}
