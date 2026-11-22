// Google Programmable Search Engine / Custom Search JSON API.
// `model` stores the Search Engine ID (cx); it is not an LLM model name.
import { ApiKeyFailureError } from '../util/apiKeys.ts';
import { requestText } from '../util/timedRequest.ts';
import type { EngineOutput, EngineRequest, SearchEngine } from './index.ts';

interface GoogleItem { title?: string; link?: string; snippet?: string; }
interface GoogleResponse { items?: GoogleItem[]; error?: { message?: string; code?: number }; }

export async function executeGoogleSearch(options: EngineRequest): Promise<EngineOutput> {
  if (options.mode !== 'search') throw new Error('google supports search only; it does not fetch pages.');
  if (!options.query?.trim()) throw new Error('Google search requires a query.');
  const key = options.settings.apiKey?.split(',')[0]?.trim();
  const cx = options.settings.model?.trim();
  if (!key) throw new Error('Google Custom Search needs GOOGLE_CSE_API_KEY or engines.google.apiKey.');
  if (!cx) throw new Error('Google Custom Search needs a Search Engine ID (cx), saved as engines.google.model.');
  const url = new URL('https://www.googleapis.com/customsearch/v1');
  url.searchParams.set('key', key);
  url.searchParams.set('cx', cx);
  url.searchParams.set('q', options.query);
  url.searchParams.set('num', String(Math.min(10, Math.max(1, options.maxResults ?? 8))));
  const started = Date.now();
  const { response, text } = await requestText('google', url.toString(), { method: 'GET' }, AbortSignal.timeout(options.timeoutMs), options.timeoutMs, [key]);
  const data = JSON.parse(text || '{}') as GoogleResponse;
  if (!response.ok) {
    const message = data.error?.message || `Google Custom Search returned HTTP ${response.status}.`;
    if (response.status === 401 || response.status === 403 || response.status === 429) throw new ApiKeyFailureError(message);
    throw new Error(message);
  }
  const items = (data.items ?? []).map((item) => ({ title: item.title ?? '', url: item.link ?? '', snippet: item.snippet ?? '' }));
  return { result: { summary: items.map((x) => x.snippet).filter(Boolean).join(' '), items, uncertainty: items.length ? [] : ['Google returned no results.'] }, meta: { conversationId: null, durationSeconds: (Date.now() - started) / 1000, usage: { resultCount: items.length } } };
}

export const googleProvider: SearchEngine = {
  name: 'google', roles: ['search'], requirement: 'configure Google Custom Search API key and Search Engine ID (cx)',
  isAvailable: (settings, env) => Boolean((settings.apiKey || env.GOOGLE_CSE_API_KEY)?.trim() && (settings.model || env.GOOGLE_CSE_CX)?.trim()),
  execute: executeGoogleSearch,
};
