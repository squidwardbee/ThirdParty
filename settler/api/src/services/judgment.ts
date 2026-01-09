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

// Persona system prompts - MICRO RESPONSES
const PERSONA_PROMPTS: Record<string, string> = {
  mediator: `Fair mediator. ULTRA BRIEF.
One short sentence per person (10 words max each). Declare winner.
Total: 2-3 sentences, under 30 words.`,

  judge: `Judge Judy style. ULTRA BRIEF.
One punchy sentence per person (10 words max each). Declare winner.
Total: 2-3 sentences, under 30 words.`,

  comedic: `Witty judge. ULTRA BRIEF.
One funny sentence per person (10 words max each). Declare winner.
Total: 2-3 sentences, under 30 words.`,
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

${personAName} vs ${personBName}

FORMAT:
[Name]: [10 words max]
[Name]: [10 words max]
VERDICT: [WINNER]

30 words max total. No fluff.`;

  const userMessage = `${transcript}

Verdict now. 30 words max.`;

  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage },
  ];

  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages,
    temperature: 0.7,
    max_tokens: 100,
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
