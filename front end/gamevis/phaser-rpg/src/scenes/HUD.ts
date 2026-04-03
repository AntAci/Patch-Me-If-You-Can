import { Scene } from 'phaser';

import { key } from '../constants';
import { connectLive, runScenario } from '../data/api';
import type { ScenarioRunResult, TimelineEvent } from '../data/types';
import { state, subscribe, updateState } from '../state';
import type { Dashboard } from './Dashboard';

const EVENT_LABELS: Record<string, string> = {
  scenario_received: 'Mutation spawned',
  patch_loaded: 'Mutation armed',
  patch_apply_simulated: 'Contact made',
  protected_zone_check_passed: 'Shield lock',
  protected_zone_check_blocked: 'Shield breach attempt',
  checks_started: 'Scanner sweep',
  test_check_completed: 'Sentinel report',
  lint_check_completed: 'Lint ward report',
  typecheck_completed: 'Type ward report',
  health_classified: 'Threat class',
  patch_quarantined: 'Containment',
  diagnosis_generated: 'Enemy type resolved',
  treatment_generated: 'Countermeasure queued',
  retry_started: 'Recovery cycle',
  retry_patch_applied: 'Patch volley',
  repair_loop_started: 'Repair loop primed',
  repair_attempt_started: 'Repair attempt',
  repair_patch_generated: 'Repair patch drafted',
  repair_patch_applied: 'Repair patch applied',
  recheck_started: 'Second sweep',
  repair_attempt_failed: 'Repair attempt failed',
  repair_attempt_succeeded: 'Repair attempt succeeded',
  final_verdict_issued: 'Encounter resolved',
};

const EVENT_COLORS: Record<string, string> = {
  protected_zone_check_blocked: '#ff3344',
  health_classified: '#ffcc00',
  patch_quarantined: '#ff8800',
  diagnosis_generated: '#ffcc00',
  treatment_generated: '#4488ff',
  retry_started: '#4488ff',
  repair_loop_started: '#4488ff',
  repair_attempt_started: '#6ab8ff',
  repair_patch_generated: '#6ab8ff',
  repair_patch_applied: '#6ab8ff',
  repair_attempt_failed: '#ff8800',
  repair_attempt_succeeded: '#00ff88',
  final_verdict_issued: '#00ff88',
  test_check_completed: '#5a7a9a',
  lint_check_completed: '#5a7a9a',
  typecheck_completed: '#5a7a9a',
};

export class HUD extends Scene {
  private overlay!: HTMLDivElement;
  private timelineFeed!: HTMLDivElement;
  private diagnosisPanel!: HTMLDivElement;
  private patchInfo!: HTMLDivElement;
  private agentDot!: HTMLSpanElement;
  private modeLabel!: HTMLSpanElement;
  private riskValue!: HTMLSpanElement;
  private mutationCount!: HTMLSpanElement;
  private buttons: HTMLButtonElement[] = [];
  private liveWs: WebSocket | null = null;
  private dashboard!: Dashboard;
  private liveThreatCode = 'unknown';
  private liveSymptoms: string[] = [];
  private liveTreatment = '';
  private demoRunButton: HTMLButtonElement | null = null;
  private demoRunStatus: HTMLDivElement | null = null;
  private demoRunTimers: number[] = [];
  private demoRunActive = false;

  constructor() {
    super(key.scene.hud);
  }

  create() {
    this.dashboard = this.scene.get(key.scene.dashboard) as Dashboard;
    this.buildOverlay();
    this.wireEvents();
  }

  private buildOverlay() {
    // Get or create the overlay div
    this.overlay = document.getElementById('hud-overlay') as HTMLDivElement;
    if (!this.overlay) {
      this.overlay = document.createElement('div');
      this.overlay.id = 'hud-overlay';
      document.body.appendChild(this.overlay);
    }

    this.overlay.innerHTML = `
      <div class="hud-header">
        <span class="hud-title">MAINLINE IMMUNITY // ARENA OPS</span>
        <div class="hud-header-right">
          <button class="mode-toggle" id="mode-toggle">
            <span class="mode-dot" id="agent-dot"></span>
            <span id="mode-label">DEMO</span>
          </button>
          <span class="hud-stat">Mutations: <span id="mutation-count">0</span></span>
          <span class="hud-stat">Risk: <span id="risk-value">--</span></span>
        </div>
      </div>

      <div class="hud-patch-info" id="patch-info">
        <span class="patch-info-label">Awaiting scenario...</span>
      </div>

      <div class="hud-bottom">
        <div class="hud-controls">
          <div class="controls-label">SCENARIO DEPLOYMENT</div>
          <div class="controls-buttons">
            <button class="ctrl-btn ctrl-healthy" id="btn-healthy">Clean Route</button>
            <button class="ctrl-btn ctrl-infected" id="btn-infected">Infected Wave</button>
            <button class="ctrl-btn ctrl-blocked" id="btn-blocked">Protected Clash</button>
            <button class="ctrl-btn ctrl-replay" id="btn-replay" disabled>Replay Battle</button>
          </div>
          <button class="ctrl-btn ctrl-disabled" disabled title="Coming soon">Gauntlet Mode</button>
        </div>

        <div class="hud-timeline">
          <div class="timeline-label">COMBAT LOG</div>
          <div class="timeline-feed" id="timeline-feed"></div>
        </div>
      </div>

      <div class="hud-diagnosis" id="diagnosis-panel">
        <div class="diagnosis-label">THREAT ANALYSIS / COUNTERMEASURE</div>
        <div class="diagnosis-content">
          <span class="diagnosis-placeholder">Awaiting analysis...</span>
        </div>
      </div>
    `;

    // Cache elements
    this.timelineFeed = this.overlay.querySelector('#timeline-feed')!;
    this.diagnosisPanel = this.overlay.querySelector('#diagnosis-panel')!;
    this.patchInfo = this.overlay.querySelector('#patch-info')!;
    this.agentDot = this.overlay.querySelector('#agent-dot')!;
    this.modeLabel = this.overlay.querySelector('#mode-label')!;
    this.riskValue = this.overlay.querySelector('#risk-value')!;
    this.mutationCount = this.overlay.querySelector('#mutation-count')!;

    // Wire buttons
    const btnHealthy = this.overlay.querySelector(
      '#btn-healthy',
    ) as HTMLButtonElement;
    const btnInfected = this.overlay.querySelector(
      '#btn-infected',
    ) as HTMLButtonElement;
    const btnBlocked = this.overlay.querySelector(
      '#btn-blocked',
    ) as HTMLButtonElement;
    const btnReplay = this.overlay.querySelector(
      '#btn-replay',
    ) as HTMLButtonElement;
    const modeToggle = this.overlay.querySelector(
      '#mode-toggle',
    ) as HTMLButtonElement;
    this.demoRunButton = document.getElementById(
      'ext-demo-run',
    ) as HTMLButtonElement | null;
    this.demoRunStatus = document.getElementById(
      'ext-demo-run-status',
    ) as HTMLDivElement | null;

    this.buttons = [btnHealthy, btnInfected, btnBlocked, btnReplay];

    btnHealthy.addEventListener('click', () => this.runDemo('healthy'));
    btnInfected.addEventListener('click', () =>
      this.runDemo('infected-healed'),
    );
    btnBlocked.addEventListener('click', () =>
      this.runDemo('protected-zone-blocked'),
    );
    btnReplay.addEventListener('click', () => {
      if (state.currentScenario) {
        this.runDemoWithResult(state.currentScenario);
      }
    });
    modeToggle.addEventListener('click', () => this.toggleMode());
    this.demoRunButton?.addEventListener('click', () => this.startDemoRun());
  }

  private wireEvents() {
    // Listen for timeline events from Dashboard
    const dashboard = this.scene.get(key.scene.dashboard);
    dashboard.events.on('timeline_event', (event: TimelineEvent) => {
      this.appendTimelineEvent(event);
      this.updateDiagnosis(event);
      this.updateRisk(event);
    });

    subscribe((s) => {
      this.buttons.forEach((b) => {
        if (b.id !== 'btn-replay') {
          b.disabled = s.isPlaying || s.mode === 'live';
        }
      });
      const replay = this.overlay.querySelector(
        '#btn-replay',
      ) as HTMLButtonElement;
      if (replay)
        replay.disabled =
          s.isPlaying || !s.currentScenario || s.mode === 'live';
      this.mutationCount.textContent = String(s.mutationCount);
      if (this.demoRunButton) {
        this.demoRunButton.disabled = s.mode === 'live' || this.demoRunActive;
      }
    });
  }

  private async runDemo(name: string) {
    this.stopDemoRun(false);
    this.setButtonsDisabled(true);
    const result = await runScenario(name);
    this.runDemoWithResult(result);
  }

  private runDemoWithResult(result: ScenarioRunResult) {
    this.clearTimeline();
    this.clearDiagnosis();
    this.showPatchInfo(result);
    updateState({ mutationCount: state.mutationCount + 1 });
    this.dashboard.playScenario(result);
  }

  private toggleMode() {
    if (state.mode === 'live') {
      // Switch to demo
      if (this.liveWs) {
        this.liveWs.close();
        this.liveWs = null;
      }
      updateState({ mode: 'idle', agentConnected: false });
      this.modeLabel.textContent = 'DEMO';
      this.agentDot.className = 'mode-dot mode-dot-grey';
      this.buttons.forEach((b) => (b.disabled = false));
      if (this.demoRunButton) this.demoRunButton.disabled = false;
      this.setDemoRunStatus('Ready to show the full flow.');
    } else {
      // Switch to live
      this.stopDemoRun(false);
      updateState({ mode: 'live' });
      this.modeLabel.textContent = 'LIVE';
      this.agentDot.className = 'mode-dot mode-dot-connecting';
      this.buttons.forEach((b) => {
        if (b.id !== 'btn-replay') b.disabled = true;
      });
      if (this.demoRunButton) this.demoRunButton.disabled = true;
      this.setDemoRunStatus('Demo Run disabled while live stream mode is active.');

      this.liveWs = connectLive(
        (event) => {
          // In live mode, forward events directly to dashboard
          if (event.name === 'scenario_received') {
            this.clearTimeline();
            this.clearDiagnosis();
            updateState({ mutationCount: state.mutationCount + 1 });
            this.showPatchInfoFromEvent(event);
          }
          this.dashboard.advanceToEvent(event);
        },
        (connected) => {
          updateState({ agentConnected: connected });
          this.agentDot.className = connected
            ? 'mode-dot mode-dot-green'
            : 'mode-dot mode-dot-red';
        },
      );
    }
  }

  private setButtonsDisabled(disabled: boolean) {
    this.buttons.forEach((b) => (b.disabled = disabled));
  }

  private async startDemoRun() {
    if (this.demoRunActive || state.mode === 'live') return;

    this.stopDemoRun(false);
    this.demoRunActive = true;
    if (this.demoRunButton) this.demoRunButton.disabled = true;
    this.setButtonsDisabled(true);
    this.setDemoRunStatus('Loading guided walkthrough...');

    const sequence = [
      {
        name: 'healthy',
        label: '1/3 Clean release',
      },
      {
        name: 'infected-healed',
        label: '2/3 Quarantine + repair',
      },
      {
        name: 'protected-zone-blocked',
        label: '3/3 Protected-file block',
      },
    ];

    try {
      const results = await Promise.all(sequence.map((item) => runScenario(item.name)));
      results.forEach((result, index) => {
        const timeout = window.setTimeout(() => {
          const label = sequence[index]?.label ?? 'Demo';
          this.setDemoRunStatus(`${label} running...`);
          this.runDemoWithResult(result);

          if (index === results.length - 1) {
            const finishTimeout = window.setTimeout(() => {
              this.stopDemoRun(true);
            }, this.estimateScenarioDuration(result));
            this.demoRunTimers.push(finishTimeout);
          }
        }, index === 0 ? 0 : this.offsetForResults(results, index));
        this.demoRunTimers.push(timeout);
      });
    } catch {
      this.stopDemoRun(false);
      this.setDemoRunStatus('Demo Run failed to load scenario data.');
    }
  }

  private offsetForResults(results: ScenarioRunResult[], endIndex: number) {
    let total = 0;
    for (let idx = 0; idx < endIndex; idx += 1) {
      total += this.estimateScenarioDuration(results[idx]);
    }
    return total;
  }

  private estimateScenarioDuration(result: ScenarioRunResult) {
    const timelineLength = result.timeline?.length ?? 0;
    return Math.max(3200, timelineLength * 520 + 1200);
  }

  private stopDemoRun(completed: boolean) {
    this.demoRunTimers.forEach((timer) => window.clearTimeout(timer));
    this.demoRunTimers = [];
    const wasActive = this.demoRunActive;
    this.demoRunActive = false;
    if (this.demoRunButton) {
      this.demoRunButton.disabled = state.mode === 'live';
    }
    if (state.mode !== 'live') {
      this.setButtonsDisabled(false);
    }
    if (completed) {
      this.setDemoRunStatus('Demo Run complete. You can replay or launch a single scenario.');
    } else if (wasActive && state.mode !== 'live') {
      this.setDemoRunStatus('Ready to show the full flow.');
    }
  }

  private setDemoRunStatus(message: string) {
    if (this.demoRunStatus) {
      this.demoRunStatus.textContent = message;
    }
  }

  private appendTimelineEvent(event: TimelineEvent) {
    const label = EVENT_LABELS[event.name] || event.name;
    const color = EVENT_COLORS[event.name] || '#5a7a9a';
    const attempt = event.attempt > 0 ? ' [retry]' : '';
    const detail = this.getEventDetail(event);

    const line = document.createElement('div');
    line.className = 'timeline-entry';
    line.innerHTML = `
      <span class="tl-dot" style="background:${color}"></span>
      <span class="tl-label" style="color:${color}">${label}${attempt}</span>
      <span class="tl-detail">${detail}</span>
    `;
    this.timelineFeed.appendChild(line);
    this.timelineFeed.scrollTop = this.timelineFeed.scrollHeight;
  }

  private getEventDetail(event: TimelineEvent): string {
    if (!event.data) return '';
    if (
      event.name === 'test_check_completed' ||
      event.name === 'lint_check_completed' ||
      event.name === 'typecheck_completed'
    ) {
      const status = event.data.status as string;
      const summary = event.data.summary as string;
      return `<span class="tl-status-${status}">${summary}</span>`;
    }
    if (event.name === 'health_classified') {
      return `<span class="tl-status-${event.data.health}">${event.data.health}</span>`;
    }
    if (event.name === 'final_verdict_issued') {
      return `<span class="tl-verdict-${event.data.finalVerdict}">${String(event.data.finalVerdict).toUpperCase()}</span>`;
    }
    if (event.name === 'patch_loaded') {
      return String(event.data.filesChanged || '');
    }
    return '';
  }

  private updateDiagnosis(event: TimelineEvent) {
    if (
      event.name !== 'diagnosis_generated' &&
      event.name !== 'treatment_generated'
    )
      return;
    const result = state.currentScenario;
    const diagnosisCode = String(
      event.data?.diagnosisCode ??
        event.data?.code ??
        result?.diagnosis.code ??
        this.liveThreatCode,
    );
    const diagnosisSummary =
      result?.diagnosis.summary ?? 'Live mutation in active encounter.';
    const treatmentPrompt =
      result?.treatment.prompt ??
      (this.liveTreatment || 'Contain and monitor.');

    if (result?.symptoms?.length) {
      this.liveSymptoms = result.symptoms;
    } else if (event.data?.status) {
      this.liveSymptoms = [`Recent check status: ${String(event.data.status)}`];
    } else if (this.liveSymptoms.length === 0) {
      this.liveSymptoms = ['Telemetry stream active'];
    }
    this.liveThreatCode = diagnosisCode;

    const content = this.diagnosisPanel.querySelector('.diagnosis-content')!;
    content.innerHTML = `
      <div class="diag-row">
        <span class="diag-key">Symptoms</span>
        <span class="diag-val">${this.liveSymptoms.join(' | ')}</span>
      </div>
      <div class="diag-row">
        <span class="diag-key">Threat</span>
        <span class="diag-val diag-code">${diagnosisCode.replace(/_/g, ' ')}</span>
        <span class="diag-val">${diagnosisSummary}</span>
      </div>
      <div class="diag-row">
        <span class="diag-key">Counter</span>
        <span class="diag-val">[${String(event.data?.strategy ?? result?.treatment.strategy ?? 'none')}] ${treatmentPrompt}</span>
      </div>
    `;
  }

  private updateRisk(event: TimelineEvent) {
    if (event.name === 'health_classified') {
      const health = event.data?.health as string;
      if (health === 'healthy') {
        this.riskValue.textContent = 'LOW';
        this.riskValue.className = 'risk-low';
      } else if (health === 'suspicious') {
        this.riskValue.textContent = 'MED';
        this.riskValue.className = 'risk-med';
      } else {
        this.riskValue.textContent = 'HIGH';
        this.riskValue.className = 'risk-high';
      }
    }
  }

  private showPatchInfo(result: ScenarioRunResult) {
    this.patchInfo.innerHTML = `
      <span class="pi-id">${result.patchId}</span>
      <span class="pi-zone pi-zone-${result.zone.toLowerCase()}">${result.zone}</span>
      <span class="pi-task">${result.task}</span>
    `;
  }

  private showPatchInfoFromEvent(event: TimelineEvent) {
    this.patchInfo.innerHTML = `
      <span class="pi-id">${String(event.data?.patchId ?? event.data?.mutationId ?? 'LIVE')}</span>
      <span class="pi-zone pi-zone-${String(event.data?.zone ?? 'ui').toLowerCase()}">${String(event.data?.zone ?? 'UI')}</span>
      <span class="pi-task">${String(event.data?.task ?? 'Realtime mutation entered the arena')}</span>
    `;
  }

  private clearTimeline() {
    this.timelineFeed.innerHTML = '';
    this.riskValue.textContent = '--';
    this.riskValue.className = '';
  }

  private clearDiagnosis() {
    const content = this.diagnosisPanel.querySelector('.diagnosis-content')!;
    content.innerHTML =
      '<span class="diagnosis-placeholder">Awaiting analysis...</span>';
  }

  shutdown() {
    this.stopDemoRun(false);
    if (this.liveWs) {
      this.liveWs.close();
      this.liveWs = null;
    }
  }
}
