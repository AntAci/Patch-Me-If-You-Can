export const ZONES = ['Auth', 'UI', 'API', 'Config', 'Tests'] as const;
export type ZoneName = (typeof ZONES)[number];

export const COLORS = {
  healthy: 0x00ff88,
  suspicious: 0xffcc00,
  infected: 0xff3344,
  quarantined: 0xff8800,
  healing: 0x4488ff,
  released: 0x00ff88,
  blocked: 0xff0033,
  idle: 0x334455,
  passed: 0x00ff88,
  failed: 0xff3344,
  skipped: 0x666666,
} as const;

export const ZONE_COLORS: Record<string, number> = {
  Auth: 0xff6b6b,
  UI: 0x4ecdc4,
  API: 0x45b7d1,
  Config: 0xf7dc6f,
  Tests: 0xbb8fce,
};

export const PIPELINE_STAGES = [
  'Queue',
  'Zone Check',
  'Checks',
  'Diagnosis',
  'Verdict',
] as const;
