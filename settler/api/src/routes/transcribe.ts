import { Router, Request, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { transcribeFromBase64 } from '../services/transcription';

const router = Router();

/**
 * POST /api/transcribe
 * Transcribe audio to text using OpenAI Whisper
 */
router.post('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { audio } = req.body;

    if (!audio) {
      return res.status(400).json({ error: 'Missing audio data' });
    }

    console.log(`[Transcribe] Received audio data, length: ${audio.length}`);

    // Transcribe using Whisper
    const result = await transcribeFromBase64(audio, 'audio/m4a');

    console.log(`[Transcribe] Transcription complete: "${result.text.substring(0, 100)}..."`);

    return res.json({
      transcription: result.text,
      duration: result.duration,
      language: result.language,
    });
  } catch (error) {
    console.error('[Transcribe] Error:', error);
    return res.status(500).json({ error: 'Transcription failed' });
  }
});

export default router;
