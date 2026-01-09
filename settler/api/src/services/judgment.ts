import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/chat';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ArgumentTurn {
  speaker: 'person_a' | 'person_b';
  speakerName: string;
  transcription: string;
}

export interface JudgmentRequest {
  personAName: string;
  personBName: string;
  persona: 'mediator' | 'judge' | 'comedic';
  turns: ArgumentTurn[];
}

export interface JudgmentResult {
  winner: 'person_a' | 'person_b' | 'tie';
  winnerName: string;
  reasoning: string;
  fullResponse: string;
  researchPerformed: boolean;
  sources: string[];
}

// Persona system prompts - CONCISE BUT COMPLETE
const PERSONA_PROMPTS: Record<string, string> = {
  mediator: `You are a fair mediator settling disputes.
Give 2-3 sentences about each person's argument - what they got right or wrong.
Then declare the winner clearly.`,

  judge: `You are Judge Judy - direct and no-nonsense.
Give 2-3 punchy sentences about each person's case. Call out BS when you see it.
Then declare the winner. One catchphrase allowed.`,

  comedic: `You are a witty comedic judge.
Give 2-3 funny sentences roasting each person's argument.
Then declare the winner with a good punchline.`,
};

/**
 * Generate a judgment for an argument using GPT-4
 */
export async function generateJudgment(
  request: JudgmentRequest
): Promise<JudgmentResult> {
  const { personAName, personBName, persona, turns } = request;

  // Build the conversation transcript
  const transcript = turns
    .map((turn) => `${turn.speakerName}: "${turn.transcription}"`)
    .join('\n\n');

  const systemPrompt = `${PERSONA_PROMPTS[persona] || PERSONA_PROMPTS.mediator}

Settling: ${personAName} vs ${personBName}

RULES:
1. 2-3 sentences about ${personAName}'s argument
2. 2-3 sentences about ${personBName}'s argument
3. End with: VERDICT: [NAME] or VERDICT: TIE
4. Keep total under 150 words.`;

  const userMessage = `Transcript:

${transcript}

Give your verdict with 2-3 sentences per person.`;

  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage },
  ];

  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages,
    temperature: 0.8,
    max_tokens: 250,
  });

  const fullResponse = response.choices[0].message.content || '';

  // Parse the verdict
  const { winner, winnerName, reasoning } = parseVerdict(
    fullResponse,
    personAName,
    personBName
  );

  return {
    winner,
    winnerName,
    reasoning,
    fullResponse,
    researchPerformed: false,
    sources: [],
  };
}

/**
 * Parse the verdict from the AI response
 */
function parseVerdict(
  response: string,
  personAName: string,
  personBName: string
): { winner: 'person_a' | 'person_b' | 'tie'; winnerName: string; reasoning: string } {
  const verdictMatch = response.match(/VERDICT:\s*(.+?)(?:\n|$)/i);
  const verdictText = verdictMatch ? verdictMatch[1].trim().toLowerCase() : '';

  let winner: 'person_a' | 'person_b' | 'tie' = 'tie';
  let winnerName = 'Tie';

  if (verdictText.includes('tie') || verdictText.includes('draw')) {
    winner = 'tie';
    winnerName = 'Tie';
  } else if (
    verdictText.toLowerCase().includes(personAName.toLowerCase()) ||
    verdictText.includes('person a') ||
    verdictText.includes('first person')
  ) {
    winner = 'person_a';
    winnerName = personAName;
  } else if (
    verdictText.toLowerCase().includes(personBName.toLowerCase()) ||
    verdictText.includes('person b') ||
    verdictText.includes('second person')
  ) {
    winner = 'person_b';
    winnerName = personBName;
  }

  // Extract reasoning (everything before the VERDICT line)
  const reasoning = response.replace(/VERDICT:.+$/i, '').trim();

  return { winner, winnerName, reasoning };
}
