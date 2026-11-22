import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const DIR = join(homedir(), '.modsearch');
const FILE = join(DIR, 'traffic.json');

export interface TrafficEntry {
  at: string;
  engine: string;
  uploadBytes: number;
  downloadBytes: number;
  status: number | null;
  durationMs: number;
  ok: boolean;
}

interface TrafficStore { version: 1; entries: TrafficEntry[] }

function readStore(): TrafficStore {
  try {
    const value = JSON.parse(readFileSync(FILE, 'utf8')) as TrafficStore;
    if (value.version === 1 && Array.isArray(value.entries)) return value;
  } catch { /* first run or unreadable file */ }
  return { version: 1, entries: [] };
}

/** Record application-payload bytes, not TCP/TLS wire bytes. */
export function recordTraffic(entry: TrafficEntry): void {
  try {
    mkdirSync(DIR, { recursive: true, mode: 0o700 });
    const store = readStore();
    store.entries.push(entry);
    if (store.entries.length > 10_000) store.entries.splice(0, store.entries.length - 10_000);
    writeFileSync(FILE, JSON.stringify(store), { mode: 0o600 });
  } catch {
    // Telemetry must never break a search.
  }
}

export function readTraffic(): TrafficStore {
  return readStore();
}
