import { tavily } from '@tavily/core';

const tavilyClient = tavily({ apiKey: process.env.TAVILY_API_KEY || '' });

export interface SearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

export interface ResearchResult {
  query: string;
  answer?: string;
  results: SearchResult[];
  searchTime?: number;
}

/**
 * Perform a web search using Tavily API
 * Returns relevant search results for fact-checking claims
 */
export async function searchWeb(
  query: string,
  options: {
    maxResults?: number;
    searchDepth?: 'basic' | 'advanced';
    includeAnswer?: boolean;
    includeDomains?: string[];
    excludeDomains?: string[];
  } = {}
): Promise<ResearchResult> {
  const {
    maxResults = 5,
    searchDepth = 'basic',
    includeAnswer = true,
    includeDomains,
    excludeDomains,
  } = options;

  const startTime = Date.now();

  const response = await tavilyClient.search(query, {
    maxResults,
    searchDepth,
    includeAnswer,
    includeDomains,
    excludeDomains,
  });

  const searchTime = Date.now() - startTime;

  return {
    query,
    answer: response.answer,
    results: response.results.map((r) => ({
      title: r.title,
      url: r.url,
      content: r.content,
      score: r.score,
    })),
    searchTime,
  };
}

/**
 * Extract facts and claims from transcription text
 * that might need fact-checking
 */
export function extractFactCheckableStatements(text: string): string[] {
  // Look for statements that contain:
  // - Numbers/statistics
  // - "Studies show", "Research says", etc.
  // - Historical facts
  // - Scientific claims
  // - Comparisons with specific data

  const patterns = [
    /\d+%?\s+(?:of|percent|more|less|times)/gi,
    /(?:studies?|research|scientists?|experts?)\s+(?:show|say|prove|found)/gi,
    /(?:in|since|during)\s+\d{4}/gi,
    /(?:always|never|every|no one|everyone)\s+/gi,
  ];

  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 10);
  const factCheckable: string[] = [];

  for (const sentence of sentences) {
    for (const pattern of patterns) {
      if (pattern.test(sentence)) {
        factCheckable.push(sentence.trim());
        break;
      }
    }
  }

  return [...new Set(factCheckable)]; // Remove duplicates
}

/**
 * Research multiple claims and aggregate results
 */
export async function researchClaims(claims: string[]): Promise<{
  researched: { claim: string; research: ResearchResult }[];
  sources: string[];
}> {
  const researched: { claim: string; research: ResearchResult }[] = [];
  const allSources: Set<string> = new Set();

  // Research each claim (limit to avoid rate limits)
  const claimsToResearch = claims.slice(0, 5);

  for (const claim of claimsToResearch) {
    try {
      const research = await searchWeb(claim, {
        maxResults: 3,
        searchDepth: 'basic',
        includeAnswer: true,
      });

      researched.push({ claim, research });

      // Collect sources
      for (const result of research.results) {
        allSources.add(result.url);
      }
    } catch (error) {
      console.error(`Failed to research claim: ${claim}`, error);
    }
  }

  return {
    researched,
    sources: Array.from(allSources),
  };
}
