import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth';
import { query, queryOne } from '../db';
import {
  ArgumentRow,
  ArgumentTurnRow,
  JudgmentRow,
  Argument,
  ArgumentTurn,
  Judgment,
  CreateArgumentRequest,
  AddTurnRequest,
  ArgumentWithDetails,
} from '../types';
import { generateJudgment, ArgumentTurn as JudgmentTurn } from '../services/judgment';
import { generateJudgmentAudio } from '../services/tts';
import { uploadAudio } from '../services/storage';
import { transcribeFromBase64 } from '../services/transcription';
import {
  canCreateArgument,
  canAddTurn,
  incrementArgumentCount,
  isResearchEnabled,
} from '../services/usageLimits';

const router = Router();

// All argument routes require authentication
router.use(authMiddleware);

// Helper functions to convert database rows
function rowToArgument(row: ArgumentRow): Argument {
  return {
    id: row.id,
    userId: row.user_id,
    mode: row.mode as 'live' | 'turn_based',
    personAName: row.person_a_name,
    personBName: row.person_b_name,
    persona: row.persona as Argument['persona'],
    status: row.status as Argument['status'],
    createdAt: row.created_at,
    completedAt: row.completed_at,
  };
}

function rowToTurn(row: ArgumentTurnRow): ArgumentTurn {
  return {
    id: row.id,
    argumentId: row.argument_id,
    speaker: row.speaker as 'person_a' | 'person_b',
    audioUrl: row.audio_url,
    transcription: row.transcription,
    turnOrder: row.turn_order,
    durationSeconds: row.duration_seconds,
    createdAt: row.created_at,
  };
}

function rowToJudgment(row: JudgmentRow): Judgment {
  return {
    id: row.id,
    argumentId: row.argument_id,
    winner: row.winner as 'person_a' | 'person_b' | 'tie',
    winnerName: row.winner_name,
    reasoning: row.reasoning,
    researchPerformed: row.research_performed,
    researchSummary: row.research_summary,
    sources: typeof row.sources === 'string' ? JSON.parse(row.sources) : row.sources,
    audioUrl: row.audio_url,
    audioDurationSeconds: row.audio_duration_seconds,
    fullResponse: row.full_response,
    createdAt: row.created_at,
  };
}

/**
 * GET /api/arguments
 * List all arguments for the current user
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Get user ID from Firebase UID
    const user = await queryOne<{ id: string }>(
      'SELECT id FROM users WHERE firebase_uid = $1',
      [req.user!.uid]
    );

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const argumentRows = await query<ArgumentRow>(
      `SELECT * FROM arguments
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 100`,
      [user.id]
    );

    // Get turns and judgments for each argument
    const argumentsWithDetails: ArgumentWithDetails[] = await Promise.all(
      argumentRows.map(async (row) => {
        const turns = await query<ArgumentTurnRow>(
          'SELECT * FROM argument_turns WHERE argument_id = $1 ORDER BY turn_order',
          [row.id]
        );

        const judgment = await queryOne<JudgmentRow>(
          'SELECT * FROM judgments WHERE argument_id = $1',
          [row.id]
        );

        return {
          ...rowToArgument(row),
          turns: turns.map(rowToTurn),
          judgment: judgment ? rowToJudgment(judgment) : null,
        };
      })
    );

    res.json(argumentsWithDetails);
  } catch (error) {
    console.error('Error fetching arguments:', error);
    res.status(500).json({ error: 'Failed to fetch arguments' });
  }
});

/**
 * POST /api/arguments
 * Create a new argument session
 */
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { mode, personAName, personBName, persona }: CreateArgumentRequest = req.body;

    // Validate required fields
    if (!mode || !personAName || !personBName) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    if (!['live', 'turn_based'].includes(mode)) {
      res.status(400).json({ error: 'Invalid mode' });
      return;
    }

    // Get user
    const user = await queryOne<{ id: string }>(
      'SELECT id FROM users WHERE firebase_uid = $1',
      [req.user!.uid]
    );

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Check usage limits
    const usageCheck = await canCreateArgument(user.id);
    if (!usageCheck.allowed) {
      res.status(429).json({
        error: usageCheck.reason,
        code: 'LIMIT_EXCEEDED',
        remaining: usageCheck.remaining,
      });
      return;
    }

    // Create argument
    const id = uuidv4();
    const rows = await query<ArgumentRow>(
      `INSERT INTO arguments (id, user_id, mode, person_a_name, person_b_name, persona, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'recording')
       RETURNING *`,
      [id, user.id, mode, personAName, personBName, persona || 'mediator']
    );

    // Update user's daily count
    await incrementArgumentCount(user.id);

    res.status(201).json({
      ...rowToArgument(rows[0]),
      turns: [],
      judgment: null,
      remainingToday: usageCheck.remaining,
    });
  } catch (error) {
    console.error('Error creating argument:', error);
    res.status(500).json({ error: 'Failed to create argument' });
  }
});

/**
 * GET /api/arguments/:id
 * Get a single argument with all details
 */
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Get user
    const user = await queryOne<{ id: string }>(
      'SELECT id FROM users WHERE firebase_uid = $1',
      [req.user!.uid]
    );

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Get argument
    const argumentRow = await queryOne<ArgumentRow>(
      'SELECT * FROM arguments WHERE id = $1 AND user_id = $2',
      [id, user.id]
    );

    if (!argumentRow) {
      res.status(404).json({ error: 'Argument not found' });
      return;
    }

    // Get turns
    const turns = await query<ArgumentTurnRow>(
      'SELECT * FROM argument_turns WHERE argument_id = $1 ORDER BY turn_order',
      [id]
    );

    // Get judgment
    const judgment = await queryOne<JudgmentRow>(
      'SELECT * FROM judgments WHERE argument_id = $1',
      [id]
    );

    res.json({
      ...rowToArgument(argumentRow),
      turns: turns.map(rowToTurn),
      judgment: judgment ? rowToJudgment(judgment) : null,
    });
  } catch (error) {
    console.error('Error fetching argument:', error);
    res.status(500).json({ error: 'Failed to fetch argument' });
  }
});

/**
 * DELETE /api/arguments/:id
 * Delete an argument
 */
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Get user
    const user = await queryOne<{ id: string }>(
      'SELECT id FROM users WHERE firebase_uid = $1',
      [req.user!.uid]
    );

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Delete argument (cascades to turns and judgments)
    const result = await query(
      'DELETE FROM arguments WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, user.id]
    );

    if (result.length === 0) {
      res.status(404).json({ error: 'Argument not found' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting argument:', error);
    res.status(500).json({ error: 'Failed to delete argument' });
  }
});

/**
 * POST /api/arguments/:id/turns
 * Add a turn to an argument
 * Accepts either transcription directly or base64 audio for transcription
 */
router.post('/:id/turns', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      speaker,
      transcription: providedTranscription,
      audioBase64,
      audioMimeType,
      durationSeconds,
    } = req.body;

    if (!speaker) {
      res.status(400).json({ error: 'Missing speaker' });
      return;
    }

    if (!['person_a', 'person_b'].includes(speaker)) {
      res.status(400).json({ error: 'Invalid speaker' });
      return;
    }

    // Get user
    const user = await queryOne<{ id: string }>(
      'SELECT id FROM users WHERE firebase_uid = $1',
      [req.user!.uid]
    );

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Verify argument exists and belongs to user
    const argument = await queryOne<ArgumentRow>(
      'SELECT * FROM arguments WHERE id = $1 AND user_id = $2',
      [id, user.id]
    );

    if (!argument) {
      res.status(404).json({ error: 'Argument not found' });
      return;
    }

    // Check turn limits
    const turnCheck = await canAddTurn(user.id, id);
    if (!turnCheck.allowed) {
      res.status(429).json({
        error: turnCheck.reason,
        code: 'TURN_LIMIT_EXCEEDED',
      });
      return;
    }

    // Get next turn order
    const lastTurn = await queryOne<{ turn_order: number }>(
      'SELECT MAX(turn_order) as turn_order FROM argument_turns WHERE argument_id = $1',
      [id]
    );

    const turnOrder = (lastTurn?.turn_order || 0) + 1;

    let transcription = providedTranscription;
    let audioUrl: string | null = null;

    // If audio is provided, transcribe and upload it
    if (audioBase64) {
      try {
        // Transcribe the audio
        const transcriptionResult = await transcribeFromBase64(
          audioBase64,
          audioMimeType || 'audio/m4a'
        );
        transcription = transcriptionResult.text;

        // Upload audio to S3
        const base64Data = audioBase64.replace(/^data:audio\/\w+;base64,/, '');
        const audioBuffer = Buffer.from(base64Data, 'base64');
        const uploadResult = await uploadAudio(
          audioBuffer,
          user.id,
          id,
          'turn',
          turnOrder
        );
        audioUrl = uploadResult.url;
      } catch (error) {
        console.error('Audio processing failed:', error);
        res.status(500).json({ error: 'Failed to process audio' });
        return;
      }
    }

    if (!transcription) {
      res.status(400).json({ error: 'Missing transcription or audio' });
      return;
    }

    // Create turn
    const turnId = uuidv4();
    const rows = await query<ArgumentTurnRow>(
      `INSERT INTO argument_turns (id, argument_id, speaker, transcription, audio_url, duration_seconds, turn_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [turnId, id, speaker, transcription, audioUrl, durationSeconds || null, turnOrder]
    );

    res.status(201).json(rowToTurn(rows[0]));
  } catch (error) {
    console.error('Error adding turn:', error);
    res.status(500).json({ error: 'Failed to add turn' });
  }
});

/**
 * POST /api/arguments/transcribe
 * Transcribe audio without creating a turn (for live preview)
 */
router.post('/transcribe', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { audioBase64, audioMimeType } = req.body;

    if (!audioBase64) {
      res.status(400).json({ error: 'Missing audio data' });
      return;
    }

    const result = await transcribeFromBase64(audioBase64, audioMimeType || 'audio/m4a');

    res.json({
      transcription: result.text,
      duration: result.duration,
      language: result.language,
    });
  } catch (error) {
    console.error('Transcription error:', error);
    res.status(500).json({ error: 'Failed to transcribe audio' });
  }
});

/**
 * POST /api/arguments/:id/judge
 * Request AI judgment for an argument
 */
router.post('/:id/judge', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Get user
    const user = await queryOne<{ id: string }>(
      'SELECT id FROM users WHERE firebase_uid = $1',
      [req.user!.uid]
    );

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Get argument with turns
    const argument = await queryOne<ArgumentRow>(
      'SELECT * FROM arguments WHERE id = $1 AND user_id = $2',
      [id, user.id]
    );

    if (!argument) {
      res.status(404).json({ error: 'Argument not found' });
      return;
    }

    // Update status to processing
    await query(
      "UPDATE arguments SET status = 'processing' WHERE id = $1",
      [id]
    );

    // Get turns
    const turns = await query<ArgumentTurnRow>(
      'SELECT * FROM argument_turns WHERE argument_id = $1 ORDER BY turn_order',
      [id]
    );

    if (turns.length === 0) {
      await query("UPDATE arguments SET status = 'recording' WHERE id = $1", [id]);
      res.status(400).json({ error: 'No turns to judge' });
      return;
    }

    // Format turns for the judgment service
    const judgmentTurns: JudgmentTurn[] = turns.map((turn) => ({
      speaker: turn.speaker as 'person_a' | 'person_b',
      speakerName:
        turn.speaker === 'person_a' ? argument.person_a_name : argument.person_b_name,
      transcription: turn.transcription || '',
    }));

    // Generate AI judgment
    const judgmentResult = await generateJudgment({
      personAName: argument.person_a_name,
      personBName: argument.person_b_name,
      persona: argument.persona as 'mediator' | 'judge' | 'comedic',
      turns: judgmentTurns,
    });

    // Generate audio for the judgment
    let audioUrl: string | null = null;
    let audioDurationSeconds: number | null = null;

    try {
      const audioResult = await generateJudgmentAudio(
        {
          winnerName: judgmentResult.winnerName,
          reasoning: judgmentResult.reasoning,
          fullResponse: judgmentResult.fullResponse,
        },
        argument.persona
      );

      // Upload audio to S3
      const uploadResult = await uploadAudio(
        audioResult.audioBuffer,
        user.id,
        id,
        'judgment'
      );

      audioUrl = uploadResult.url;
      audioDurationSeconds = audioResult.durationSeconds;
    } catch (audioError) {
      console.error('Failed to generate judgment audio:', audioError);
      // Continue without audio - judgment text is still valid
    }

    // Save judgment to database
    const judgmentId = uuidv4();
    const judgmentRows = await query<JudgmentRow>(
      `INSERT INTO judgments (
        id, argument_id, winner, winner_name, reasoning, full_response,
        research_performed, sources, audio_url, audio_duration_seconds
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        judgmentId,
        id,
        judgmentResult.winner,
        judgmentResult.winnerName,
        judgmentResult.reasoning,
        judgmentResult.fullResponse,
        judgmentResult.researchPerformed,
        JSON.stringify(judgmentResult.sources),
        audioUrl,
        audioDurationSeconds,
      ]
    );

    // Update argument status
    await query(
      "UPDATE arguments SET status = 'completed', completed_at = NOW() WHERE id = $1",
      [id]
    );

    res.json(rowToJudgment(judgmentRows[0]));
  } catch (error) {
    console.error('Error judging argument:', error);
    // Reset status on error
    await query("UPDATE arguments SET status = 'recording' WHERE id = $1", [req.params.id]);
    res.status(500).json({ error: 'Failed to judge argument' });
  }
});

export default router;
