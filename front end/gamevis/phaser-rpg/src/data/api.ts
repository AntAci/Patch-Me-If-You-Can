import type { ScenarioRunResult, TimelineEvent } from './types';
import { STATIC_RESULTS } from './staticResults';

export async function runScenario(
  name: string,
): Promise<ScenarioRunResult> {
  try {
    const res = await fetch(`/api/run/${name}`, { method: 'POST' });
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
): WebSocket {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const ws = new WebSocket(`${protocol}//${location.host}/ws`);

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
