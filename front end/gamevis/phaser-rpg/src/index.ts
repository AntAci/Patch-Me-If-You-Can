import Phaser from 'phaser';

import * as scenes from './scenes';

function mountAppShell() {
  const existing = document.getElementById('app-shell');
  if (existing) return;

  const shell = document.createElement('div');
  shell.id = 'app-shell';
  shell.innerHTML = `
    <aside class="side-panel left-panel">
      <h3>Runtime Telemetry</h3>
      <div class="stat-item"><span>Agent Integrity</span><strong id="ext-core">100%</strong></div>
      <div class="stat-item"><span>Active Mutations</span><strong id="ext-mutations">0</strong></div>
      <div class="stat-item"><span>Spawned Total</span><strong id="ext-spawned">0</strong></div>
      <div class="stat-item"><span>Killed Total</span><strong id="ext-killed">0</strong></div>
      <div class="stat-item"><span>Fix Loop (Released)</span><strong id="ext-fixed">0</strong></div>
      <div class="stat-item"><span>Quarantined</span><strong id="ext-quarantined">0</strong></div>
      <div class="stat-item"><span>Blocked</span><strong id="ext-blocked">0</strong></div>
      <div class="stat-item"><span>Agent Hit Count</span><strong id="ext-hits">0</strong></div>
      <div class="stat-item"><span>Patrol Loops</span><strong id="ext-loops">0</strong></div>
      <div class="stat-item"><span>Last Timeline Event</span><strong id="ext-event">none</strong></div>
      <div class="stat-item"><span>Last Zone</span><strong id="ext-zone">n/a</strong></div>
      <div class="stat-item"><span>Stream Status</span><strong id="ext-stream">connecting</strong></div>
      <h3>Process Feed</h3>
      <div id="ext-feed" class="feed-box">Awaiting mutation events...</div>
      <p class="panel-note">Left panel tracks the fight outcome. The room now resolves hooks as close-range enemy encounters instead of abstract icon spam.</p>
    </aside>
    <main class="game-stage">
      <div class="game-frame">
        <div id="game-container"></div>
      </div>
    </main>
    <aside class="side-panel right-panel">
      <div class="panel-header">
        <div>
          <p class="eyebrow">Backend Runtime</p>
          <h3>Pipeline Inspection</h3>
        </div>
        <div class="status-chip" id="ext-ops-status">STREAM</div>
      </div>
      <div class="tech-card">
        <div class="tech-row"><span>Hook</span><strong id="ext-hook-event">none</strong></div>
        <div class="tech-row"><span>Mutation</span><strong id="ext-mutation-id">none</strong></div>
        <div class="tech-row"><span>Stage</span><strong id="ext-stage">idle</strong></div>
        <div class="tech-row"><span>Diagnosis</span><strong id="ext-diagnosis">none</strong></div>
        <div class="tech-row"><span>Verdict</span><strong id="ext-verdict">pending</strong></div>
      </div>
      <div class="tech-card">
        <p class="card-title">Patch Context</p>
        <div class="mono-block" id="ext-files">No file payload yet.</div>
        <div class="mono-block" id="ext-task">No active task.</div>
      </div>
      <div class="tech-card">
        <p class="card-title">Checks</p>
        <div class="check-grid">
          <div class="check-pill"><span>Tests</span><strong id="ext-check-tests">n/a</strong></div>
          <div class="check-pill"><span>Lint</span><strong id="ext-check-lint">n/a</strong></div>
          <div class="check-pill"><span>Typecheck</span><strong id="ext-check-typecheck">n/a</strong></div>
        </div>
      </div>
      <div class="tech-card grow">
        <p class="card-title">Wire Trace</p>
        <div id="ext-backend-feed" class="trace-feed">Waiting for backend events...</div>
      </div>
    </aside>
  `;
  document.body.appendChild(shell);
}

mountAppShell();

new Phaser.Game({
  width: 1024,
  height: 700,
  title: 'Mainline Immunity',
  url: import.meta.env.VITE_APP_HOMEPAGE,
  version: import.meta.env.VITE_APP_VERSION,
  scene: [scenes.Boot, scenes.Dashboard],
  parent: 'game-container',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  disableContextMenu: import.meta.env.PROD,
  backgroundColor: '#0a0e17',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  pixelArt: false,
});
