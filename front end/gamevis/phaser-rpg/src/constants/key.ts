const texture = {
  zoneHex: 'zone_hex',
  patchSprite: 'patch_sprite',
  particle: 'particle',
  stageMarker: 'stage_marker',
  arenaCore: 'arena_core',
  defender: 'defender_unit',
  mutationClean: 'mutation_clean',
  mutationRegression: 'mutation_regression',
  mutationProtected: 'mutation_protected',
  mutationMalicious: 'mutation_malicious',
  quarantineRing: 'quarantine_ring',
  healBurst: 'heal_burst',
} as const;

const scene = {
  boot: 'boot',
  dashboard: 'dashboard',
  hud: 'hud',
} as const;

export const key = {
  texture,
  scene,
} as const;
