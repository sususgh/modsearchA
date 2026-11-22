// Microsoft Foundry Web Search toolbox over its MCP HTTP endpoint.
// Configure baseURL as the toolbox MCP URL and apiKey as a current Entra bearer token.
import { requestText } from '../util/timedRequest.ts';
import type { EngineOutput, EngineRequest, SearchEngine } from './index.ts';

const PROTOCOL = '2025-03-26';
let nextId = 1;
type McpTool = { name: string; description?: string; inputSchema?: { properties?: Record<string, unknown>; required?: string[] } };

function parseMcp(text: string): any {
  const trimmed = text.trim();
  if (!trimmed) return {};
  if (trimmed.split(/\r?\n/).some((line) => line.startsWith('data:'))) {
    const data = trimmed.split(/\r?\n/).filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trim()).filter(Boolean).at(-1);
    return data ? JSON.parse(data) : {};
  }
  return JSON.parse(trimmed);
}

async function mcpPost(options: EngineRequest, endpoint: string, token: string, session: string | null, method: string, params: unknown, notification = false) {
  const id = nextId++;
  const body = { jsonrpc: '2.0', ...(notification ? {} : { id }), method, params };
  const headers: Record<string, string> = { authorization: `Bearer ${token}`, 'content-type': 'application/json', accept: 'application/json, text/event-stream', 'MCP-Protocol-Version': PROTOCOL };
  if (session) headers['mcp-session-id'] = session;
  const { response, text } = await requestText('azure', endpoint, { method: 'POST', headers, body: JSON.stringify(body) }, AbortSignal.timeout(options.timeoutMs), options.timeoutMs, [token]);
  if (!response.ok) throw new Error(`Azure Foundry MCP returned HTTP ${response.status}: ${text.slice(0, 500)}`);
  const newSession = response.headers.get('mcp-session-id') || session;
  if (notification || response.status === 202 || !text.trim()) return { result: null, session: newSession };
  const parsed = parseMcp(text);
  if (parsed.error) throw new Error(`Azure Foundry MCP error: ${parsed.error.message || JSON.stringify(parsed.error)}`);
  return { result: parsed.result, session: newSession };
}

export async function executeAzureSearch(options: EngineRequest): Promise<EngineOutput> {
  if (options.mode !== 'search') throw new Error('azure supports web search only; page fetch is not supported.');
  if (!options.query?.trim()) throw new Error('Azure web search requires a query.');
  const endpoint = options.settings.baseURL?.trim();
  const token = options.settings.apiKey?.trim();
  if (!endpoint || !token) throw new Error('Azure Foundry requires a toolbox MCP URL (baseURL) and a current Microsoft Entra bearer token (apiKey).');
  if (!/^https:\/\//i.test(endpoint)) throw new Error('Azure Foundry toolbox URL must use HTTPS.');
  const started = Date.now();
  let session: string | null = null;
  const init = await mcpPost(options, endpoint, token, session, 'initialize', { protocolVersion: PROTOCOL, capabilities: {}, clientInfo: { name: 'modsearch', version: '1.0.0' } });
  session = init.session;
  await mcpPost(options, endpoint, token, session, 'notifications/initialized', {}, true);
  const listed = await mcpPost(options, endpoint, token, session, 'tools/list', {});
  const tools = (listed.result?.tools ?? []) as McpTool[];
  const tool = tools.find((item) => /search/i.test(`${item.name} ${item.description || ''}`));
  if (!tool) throw new Error(`Azure toolbox exposes no search tool. Available tools: ${tools.map((item) => item.name).join(', ') || 'none'}.`);
  const properties = tool.inputSchema?.properties ?? {};
  const queryField = ['query', 'search_query', 'q', 'text'].find((key) => Object.hasOwn(properties, key)) || Object.keys(properties).find((key) => /query|search|text/i.test(key)) || Object.keys(properties)[0] || 'query';
  const args: Record<string, unknown> = { [queryField]: options.query };
  for (const key of ['count', 'top_k', 'max_results', 'limit']) if (Object.hasOwn(properties, key)) args[key] = options.maxResults ?? 8;
  const called = await mcpPost(options, endpoint, token, session, 'tools/call', { name: tool.name, arguments: args });
  const content = (called.result?.content ?? []) as Array<{ type?: string; text?: string }>;
  const raw = content.filter((part) => part.type === 'text' && part.text).map((part) => part.text).join('\n');
  if (called.result?.isError) throw new Error(`Azure web search failed: ${raw.slice(0, 500)}`);
  const urls = [...raw.matchAll(/https?:\/\/[^\s)\]}>'"]+/g)].map((match) => match[0]);
  const unique = [...new Set(urls)];
  const items = unique.map((url) => ({ title: url, url, snippet: '' }));
  return { result: { summary: raw || 'Azure Foundry web search completed without textual output.', items, uncertainty: raw ? [] : ['Azure returned no textual search output.'] }, meta: { conversationId: null, durationSeconds: (Date.now() - started) / 1000, usage: { resultCount: items.length, mcpTool: tool.name } } };
}

export const azureProvider: SearchEngine = {
  name: 'azure', roles: ['search'], requirement: 'configure an Azure Foundry Web Search toolbox MCP URL and Microsoft Entra bearer token',
  isAvailable: (settings) => Boolean(settings.apiKey?.trim() && settings.baseURL?.trim()), execute: executeAzureSearch,
};
