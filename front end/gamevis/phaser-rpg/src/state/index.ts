import type { ScenarioRunResult, TimelineEvent } from '../data/types';

export interface AppState {
  mode: 'idle' | 'demo' | 'live';
  currentScenario: ScenarioRunResult | null;
  liveEvents: TimelineEvent[];
  timelineIndex: number;
  isPlaying: boolean;
  selectedZone: string | null;
  patchPhase:
    | 'idle'
    | 'queue'
    | 'checking'
    | 'quarantined'
    | 'healing'
    | 'verdict';
  agentConnected: boolean;
  mutationCount: number;
}

export const state: AppState = {
  mode: 'idle',
  currentScenario: null,
  liveEvents: [],
  timelineIndex: -1,
  isPlaying: false,
  selectedZone: null,
  patchPhase: 'idle',
  agentConnected: false,
  mutationCount: 0,
};

type Listener = (state: AppState) => void;
const listeners: Listener[] = [];

export function subscribe(fn: Listener): () => void {
  listeners.push(fn);
  return () => {
    const i = listeners.indexOf(fn);
    if (i >= 0) listeners.splice(i, 1);
  };
}

export function emit(): void {
  for (const fn of listeners) fn(state);
}

export function updateState(patch: Partial<AppState>): void {
  Object.assign(state, patch);
  emit();
}
