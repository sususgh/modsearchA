import { EnvHttpProxyAgent, type Dispatcher } from 'undici';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { formatErrorWithCause } from './errorCause.ts';
import { resolveProxyForUrl } from './proxy.ts';
import { redactSecrets } from './redact.ts';

/**
 * One HTTP request to an engine API with its whole body read under a single
 * deadline. The signal stays armed until the body is in memory: aborting only
 * up to the response headers let a server that streams the body slowly hold
 * the run past its timeout.
 *
 * A timeout reads `<label> timed out after <ms> ms.`, which the cooldown layer
 * treats as transient. Any other transport failure reads `<label> request
 * failed: ...` with the cause attached and the secrets scrubbed. An error
 * response whose body cannot be read comes back with empty text, so the caller
 * still reports the status.
 *
 * The call honors http_proxy / https_proxy / no_proxy the same way the local
 * page fetch does. Node's fetch ignores them unless NODE_USE_ENV_PROXY is set,
 * and a harness that spawns this CLI rarely sets it, so on a machine whose
 * only way out is a proxy every engine failed while page fetches worked.
 */
export async function requestText(
  label: string,
  url: string,
  init: RequestInit,
  signal: AbortSignal,
  timeoutMs: number,
  secrets: ReadonlyArray<string | undefined | null>,
): Promise<{ response: Response; text: string }> {
  const fail = (error: unknown): Error =>
    signal.aborted
      ? new Error(`${label} timed out after ${timeoutMs} ms.`)
      : new Error(
          `${label} request failed: ${redactSecrets(
            formatErrorWithCause(error),
            secrets,
          )}`,
        );

  const target = new URL(url);
  const proxyUrl = resolveProxyForUrl(target, process.env);
  // NO_PROXY was already applied above, so the agent gets an empty one and
  // always takes the proxy it is handed.
  const dispatcher = proxyUrl
    ? new EnvHttpProxyAgent({ httpProxy: proxyUrl, httpsProxy: proxyUrl, noProxy: '' })
    : undefined;
  const startedAt = Date.now();
  const bodyBytes = typeof init.body === 'string'
    ? Buffer.byteLength(init.body)
    : init.body instanceof Uint8Array
      ? init.body.byteLength
      : init.body instanceof ArrayBuffer
        ? init.body.byteLength
        : 0;
  // Count the request target (including GET query parameters), explicitly set
  // headers and body. This catches GET APIs such as Google CSE, whose query is
  // carried in the URL rather than a request body. Values are counted only;
  // none of the URL, headers or body is written to the ledger.
  const method = (init.method || 'GET').toUpperCase();
  const uploadBytes =
    Buffer.byteLength(`${method} ${target.pathname}${target.search} HTTP/1.1\\r\\n`) +
    headerByteLength(init.headers) + 2 + bodyBytes;
  let responseStatus: number | null = null;
  let recorded = false;
  try {
    let response: Response;
    try {
      // `dispatcher` is a Node/undici extension to fetch's options, not the
      // DOM RequestInit type, so it is attached through a cast.
      response = await fetch(url, {
        ...init,
        signal,
        ...(dispatcher ? { dispatcher } : {}),
      } as RequestInit & { dispatcher?: Dispatcher });
      responseStatus = response.status;
    } catch (error) {
      throw fail(error);
    }
    try {
      const text = await response.text();
      recordNetworkUsage({ engine: label, at: new Date().toISOString(), uploadBytes, downloadBytes: responseByteLength(response, text), status: response.status, durationMs: Date.now() - startedAt });
      recorded = true;
      return { response, text };
    } catch (error) {
      if (!response.ok && !signal.aborted) {
        recordNetworkUsage({ engine: label, at: new Date().toISOString(), uploadBytes, downloadBytes: responseByteLength(response, ''), status: response.status, durationMs: Date.now() - startedAt });
        recorded = true;
        return { response, text: '' };
      }
      throw fail(error);
    }
  } catch (error) {
    if (!recorded) {
      recordNetworkUsage({ engine: label, at: new Date().toISOString(), uploadBytes, downloadBytes: 0, status: responseStatus, durationMs: Date.now() - startedAt });
    }
    throw error;
  } finally {
    await dispatcher?.close();
  }
}

/** Approximate the uncompressed HTTP header-section size, without retaining values. */
function headerByteLength(headers: HeadersInit | undefined): number {
  let bytes = 0;
  new Headers(headers).forEach((value, name) => {
    bytes += Buffer.byteLength(`${name}: ${value}\\r\\n`);
  });
  return bytes;
}

/** Approximate response status line + headers + decoded body bytes. */
function responseByteLength(response: Response, text: string): number {
  return (
    Buffer.byteLength(`HTTP/1.1 ${response.status}\\r\\n`) +
    headerByteLength(response.headers) + 2 + Buffer.byteLength(text)
  );
}

/** Best-effort local traffic ledger. It deliberately stores no URL, query, body,
 * headers, API key, or response content. */
function recordNetworkUsage(entry: { engine: string; at: string; uploadBytes: number; downloadBytes: number; status: number | null; durationMs: number }): void {
  try {
    const dir = path.join(os.homedir(), '.modsearch');
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    fs.appendFileSync(path.join(dir, 'network-usage.jsonl'), `${JSON.stringify(entry)}\n`, { mode: 0o600 });
  } catch { /* Monitoring must never break a search request. */ }
}
