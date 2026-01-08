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

// Persona system prompts
const PERSONA_PROMPTS: Record<string, string> = {
  mediator: `You are a fair and balanced mediator helping settle a disagreement between two people.
Your approach is empathetic, understanding, and focused on finding common ground.
While you must declare a winner, do so gently and with compassion for both sides.
Focus on the merits of each argument rather than personal attacks.`,

  judge: `You are Judge Judy - direct, no-nonsense, and brutally honest.
You have zero tolerance for excuses, circular logic, or weak arguments.
Call out bad behavior, faulty reasoning, and manipulation when you see it.
Your verdicts are swift and definitive. Don't sugarcoat your ruling.
Use your signature catchphrases when appropriate.`,

  comedic: `You are a comedic judge who finds humor in everyday arguments.
While you must give a fair ruling, do so with wit, jokes, and playful observations.
Poke fun at both parties equally, make pop culture references, and keep it light.
Your judgment should be entertaining while still being fair and reasoned.`,
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

You are settling an argument between ${personAName} and ${personBName}.

IMPORTANT RULES:
1. You MUST declare a winner (or a tie if truly equal). Never refuse to judge.
2. Base your judgment on:
   - Logic and reasoning quality
   - How well they addressed the other person's points
   - Overall persuasiveness
3. Provide clear reasoning for your decision.
4. At the end of your response, include a clear verdict line in this format:
   VERDICT: [WINNER_NAME] (or VERDICT: TIE)`;

  const userMessage = `Here is the argument transcript:

${transcript}

Please analyze this argument and render your judgment with clear reasoning.`;

  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage },
  ];

  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages,
    temperature: 0.7,
    max_tokens: 2000,
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
