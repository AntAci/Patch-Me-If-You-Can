import Phaser from 'phaser';

import * as scenes from './scenes';
import { runScenario } from './data/api';

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
      <div class="tech-card">
        <div class="panel-header">
          <div>
            <p class="card-title">Operator Guardrails</p>
            <p class="panel-note">Control what the security agent is allowed to touch during repair.</p>
          </div>
          <div class="status-chip status-chip-warm">POLICY</div>
        </div>
        <label class="control-label" for="ext-no-touch-files">Protected Files / Paths</label>
        <textarea id="ext-no-touch-files" class="policy-input" name="no_touch_files" rows="3" autocomplete="off" spellcheck="false">src/auth/
src/security/
config/secrets.ts</textarea>
        <label class="toggle-row" for="ext-lock-sql">
          <input id="ext-lock-sql" type="checkbox" checked />
          <span>Block changes to the main SQL database and migration history</span>
        </label>
        <label class="toggle-row" for="ext-keep-diff-small">
          <input id="ext-keep-diff-small" type="checkbox" checked />
          <span>Require minimal, reversible repairs only</span>
        </label>
        <label class="control-label" for="ext-operator-notes">Extra Natural Language Instruction</label>
        <textarea id="ext-operator-notes" class="policy-input" name="operator_notes" rows="4" autocomplete="off" spellcheck="false" placeholder="Example: Do not touch payments settlement or production seed data."></textarea>
        <div class="guard-summary" id="ext-guard-summary">Guardrails active.</div>
      </div>
      <div class="tech-card">
          <p class="card-title">Agent Prompt</p>
          <div id="ext-policy-list" class="policy-list">No policy instructions loaded.</div>
          <div id="ext-agent-prompt" class="prompt-block">Waiting for scenario data...</div>
      </div>
      <div class="tech-card demo-run-card">
        <div class="panel-header">
          <div>
            <p class="card-title">Guided Demo</p>
            <p class="panel-note">Run a short scripted walkthrough of release, repair, and block behavior.</p>
          </div>
          <div class="status-chip status-chip-warm">DEMO</div>
        </div>
        <button id="ext-demo-run" class="demo-run-button" type="button">Demo Run</button>
        <div id="ext-demo-run-status" class="guard-summary">Ready to show the full flow.</div>
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

const game = new Phaser.Game({
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

function setDemoRunStatus(message: string) {
  const node = document.getElementById('ext-demo-run-status');
  if (node) node.textContent = message;
}

function getDashboardScene() {
  return game.scene.getScene('dashboard') as scenes.Dashboard;
}

function estimateScenarioDuration(result: Awaited<ReturnType<typeof runScenario>>) {
  const timelineLength = result.timeline?.length ?? 0;
  return Math.max(3200, timelineLength * 520 + 1200);
}

function wireDemoRunButton() {
  const button = document.getElementById('ext-demo-run') as HTMLButtonElement | null;
  if (!button) return;

  let running = false;
  let timers: number[] = [];

  const clearTimers = () => {
    timers.forEach((timer) => window.clearTimeout(timer));
    timers = [];
  };

  button.addEventListener('click', async () => {
    if (running) return;

    running = true;
    button.disabled = true;
    setDemoRunStatus('Loading guided walkthrough...');

    try {
      const sequence = [
        { name: 'healthy', label: '1/3 Clean release' },
        { name: 'infected-healed', label: '2/3 Quarantine + repair' },
        { name: 'protected-zone-blocked', label: '3/3 Protected-file block' },
      ] as const;

      const results = await Promise.all(sequence.map((item) => runScenario(item.name)));

      let offset = 0;
      results.forEach((result, index) => {
        const timeout = window.setTimeout(() => {
          setDemoRunStatus(`${sequence[index].label} running...`);
          getDashboardScene().playScenario(result);
        }, offset);
        timers.push(timeout);
        offset += estimateScenarioDuration(result);
      });

      const finishTimer = window.setTimeout(() => {
        clearTimers();
        running = false;
        button.disabled = false;
        setDemoRunStatus('Demo Run complete. You can run it again.');
      }, offset);
      timers.push(finishTimer);
    } catch {
      clearTimers();
      running = false;
      button.disabled = false;
      setDemoRunStatus('Demo Run failed to load scenario data.');
    }
  });
}

wireDemoRunButton();
