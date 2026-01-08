import OpenAI from 'openai';
import { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat';
import { searchWeb, ResearchResult } from './research';

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

// Tools for the AI agent
const tools: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'search_web',
      description:
        'Search the web to fact-check claims, verify statistics, or research topics mentioned in the argument. Use this when someone makes a factual claim that can be verified.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query to look up',
          },
        },
        required: ['query'],
      },
    },
  },
];

/**
 * Generate a judgment for an argument using GPT-4 with tool calling
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
2. If someone makes factual claims that can be verified, use the search_web tool to research them.
3. Base your judgment on:
   - Logic and reasoning quality
   - Factual accuracy (verified when possible)
   - How well they addressed the other person's points
   - Overall persuasiveness
4. Provide clear reasoning for your decision.
5. At the end of your response, include a clear verdict line in this format:
   VERDICT: [WINNER_NAME] (or VERDICT: TIE)`;

  const userMessage = `Here is the argument transcript:

${transcript}

Please analyze this argument and render your judgment. If any factual claims are made, consider researching them to verify accuracy. Then provide your verdict with clear reasoning.`;

  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage },
  ];

  let researchPerformed = false;
  const sources: string[] = [];
  let fullResponse = '';

  // Initial completion with tools
  let response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages,
    tools,
    tool_choice: 'auto',
    temperature: 0.7,
    max_tokens: 2000,
  });

  let choice = response.choices[0];

  // Handle tool calls (research loop)
  while (choice.finish_reason === 'tool_calls' && choice.message.tool_calls) {
    const toolCalls = choice.message.tool_calls;

    // Add assistant message with tool calls
    messages.push(choice.message);

    // Process each tool call
    for (const toolCall of toolCalls) {
      // Type guard for function tool calls
      if (toolCall.type !== 'function') continue;

      if (toolCall.function.name === 'search_web') {
        researchPerformed = true;
        const args = JSON.parse(toolCall.function.arguments);

        try {
          const searchResult: ResearchResult = await searchWeb(args.query, {
            maxResults: 3,
            includeAnswer: true,
          });

          // Add sources
          for (const result of searchResult.results) {
            if (!sources.includes(result.url)) {
              sources.push(result.url);
            }
          }

          // Format results for the AI
          const resultText = formatSearchResults(searchResult);

          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: resultText,
          });
        } catch (error) {
          console.error('Search failed:', error);
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: 'Search failed. Please proceed without this information.',
          });
        }
      }
    }

    // Continue the conversation
    response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages,
      tools,
      tool_choice: 'auto',
      temperature: 0.7,
      max_tokens: 2000,
    });

    choice = response.choices[0];
  }

  // Get the final response
  fullResponse = choice.message.content || '';

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
    researchPerformed,
    sources,
  };
}

/**
 * Format search results for the AI
 */
function formatSearchResults(result: ResearchResult): string {
  let text = `Search results for: "${result.query}"\n\n`;

  if (result.answer) {
    text += `Quick Answer: ${result.answer}\n\n`;
  }

  text += 'Sources:\n';
  for (const r of result.results) {
    text += `- ${r.title}\n  ${r.content.slice(0, 300)}...\n  URL: ${r.url}\n\n`;
  }

  return text;
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
