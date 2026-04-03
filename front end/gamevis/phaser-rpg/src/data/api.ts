import { resolveBackendOrigin } from '../constants';
import type { ScenarioRunResult, TimelineEvent } from './types';
import { STATIC_RESULTS } from './staticResults';

function scenarioUrl(name: string) {
  const origin = resolveBackendOrigin();
  return origin ? `${origin}/api/run/${name}` : `/api/run/${name}`;
}

export function getLiveSocketUrl() {
  const origin = resolveBackendOrigin();
  if (!origin) return null;
  const url = new URL(origin);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = '/ws';
  url.search = '';
  url.hash = '';
  return url.toString();
}

export async function runScenario(
  name: string,
): Promise<ScenarioRunResult> {
  const origin = resolveBackendOrigin();
  if (!origin) {
    const fallback = STATIC_RESULTS[name];
    if (fallback) return fallback;
    throw new Error(`No static fallback for scenario: ${name}`);
  }

  try {
    const res = await fetch(scenarioUrl(name), { method: 'POST' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as ScenarioRunResult;
  } catch {
    const fallback = STATIC_RESULTS[name];
    if (fallback) return fallback;
    throw new Error(`No static fallback for scenario: ${name}`);
  }
}

export function connectLive(
  onEvent: (event: TimelineEvent) => void,
  onStatus?: (connected: boolean) => void,
): WebSocket | null {
  const socketUrl = getLiveSocketUrl();
  if (!socketUrl) {
    onStatus?.(false);
    return null;
  }
  const ws = new WebSocket(socketUrl);

  ws.addEventListener('open', () => onStatus?.(true));

  ws.addEventListener('message', (e) => {
    const msg = JSON.parse(e.data as string) as {
      type: string;
      event?: TimelineEvent;
    };
    if (msg.type === 'timeline_event' && msg.event) {
      onEvent(msg.event);
    }
  });

  ws.addEventListener('close', () => onStatus?.(false));
  ws.addEventListener('error', () => onStatus?.(false));

  return ws;
}
