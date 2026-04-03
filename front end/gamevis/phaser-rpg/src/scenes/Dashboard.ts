import { Scene } from 'phaser';

import { key } from '../constants';
import { ZONE_COLORS } from '../constants/zones';
import type { ScenarioRunResult, TimelineEvent } from '../data/types';

type MutationKind =
  | 'clean_patch'
  | 'quality_regression'
  | 'protected_zone_violation'
  | 'malicious_signature';

type MutationState =
  | 'hostile'
  | 'benign'
  | 'repairing'
  | 'downed'
  | 'released'
  | 'quarantined'
  | 'blocked';

interface MutationUnit {
  sprite: Phaser.Physics.Arcade.Sprite;
  label: Phaser.GameObjects.Text;
  healthBar: Phaser.GameObjects.Graphics;
  kind: MutationKind;
  state: MutationState;
  hp: number;
  maxHp: number;
  attackCooldownMs: number;
  zone: string;
  mutationId?: string;
}

type RealtimeWireMessage =
  | { type: 'connected'; at?: string }
  | {
      type: 'hook_event';
      hook?: { at?: string; event?: string; payload?: unknown };
    }
  | { type: 'timeline_event'; event?: TimelineEvent }
  | {
      type: 'mutation_status';
      mutationId: string;
      status: 'received' | 'processing' | 'completed' | 'failed';
      zone: string;
      task: string;
      at: string;
      error?: string;
    };

export class Dashboard extends Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private worldLayer!: Phaser.Tilemaps.TilemapLayer;
  private aboveLayer!: Phaser.Tilemaps.TilemapLayer;
  private core!: Phaser.GameObjects.Image;
  private coreHealthText!: Phaser.GameObjects.Text;
  private infoText!: Phaser.GameObjects.Text;
  private streamStatusText!: Phaser.GameObjects.Text;
  private streamDetailsText!: Phaser.GameObjects.Text;
  private coreHealth = 100;

  private patrolPoints: Phaser.Math.Vector2[] = [];
  private patrolIndex = 0;
  private mutations: MutationUnit[] = [];
  private attackTicker = 0;
  private timelineQueue: TimelineEvent[] = [];
  private liveSocket: WebSocket | null = null;

  private lastMutationStatus = 'idle';
  private lastTimelineEvent = 'none';
  private lastHookEvent = 'none';
  private lastZone = 'n/a';
  private liveConnected = false;
  private lastMutationId = 'none';
  private lastStage = 'idle';
  private lastDiagnosis = 'none';
  private lastVerdict = 'pending';
  private lastFiles = 'No file payload yet.';
  private lastTask = 'No active task.';
  private checkTests = 'n/a';
  private checkLint = 'n/a';
  private checkTypecheck = 'n/a';

  private processedHookKeys = new Set<string>();
  private spawnedTotal = 0;
  private killedTotal = 0;
  private fixedTotal = 0;
  private quarantinedTotal = 0;
  private blockedTotal = 0;
  private agentHitCount = 0;
  private patrolLoops = 0;
  private processFeed: string[] = [];
  private backendFeed: string[] = [];

  constructor() {
    super(key.scene.dashboard);
  }

  preload() {
    this.load.image(
      'room-tiles',
      '/room-assets/tilesets/tuxmon-sample-32px-extruded.png',
    );
    this.load.tilemapTiledJSON(
      'room-map',
      '/room-assets/tilemaps/tuxemon-town.json',
    );
    this.load.atlas(
      'room-atlas',
      '/room-assets/atlas/atlas.png',
      '/room-assets/atlas/atlas.json',
    );
  }

  create() {
    this.createMap();
    this.createPlayer();
    this.createCore();
    this.createUI();
    this.createAnimations();
    this.startAutoplay();
    this.connectLiveHooks();
  }

  update(_time: number, delta: number) {
    this.updateMutations(delta);
    this.attackTicker += delta;

    if (this.attackTicker > 380) {
      this.attackNearestMutation();
      this.attackTicker = 0;
    }

    this.updatePlayerAnimation();
  }

  private createMap() {
    const map = this.make.tilemap({ key: 'room-map' });
    const tileset = map.addTilesetImage(
      'tuxmon-sample-32px-extruded',
      'room-tiles',
    );
    if (!tileset) throw new Error('Missing tileset for room-map');

    map.createLayer('Below Player', tileset, 0, 0);
    const worldLayer = map.createLayer('World', tileset, 0, 0);
    const aboveLayer = map.createLayer('Above Player', tileset, 0, 0);
    if (!worldLayer || !aboveLayer) {
      throw new Error('Room map layers are missing');
    }

    this.worldLayer = worldLayer;
    this.aboveLayer = aboveLayer;
    this.worldLayer.setCollisionByProperty({ collides: true });
    this.aboveLayer.setDepth(20);

    const width = map.widthInPixels;
    const height = map.heightInPixels;
    this.physics.world.setBounds(0, 0, width, height);
    this.cameras.main.setBounds(0, 0, width, height);

    this.patrolPoints = [
      new Phaser.Math.Vector2(376, 312),
      new Phaser.Math.Vector2(628, 302),
      new Phaser.Math.Vector2(614, 492),
      new Phaser.Math.Vector2(386, 508),
    ];
  }

  private createPlayer() {
    const spawn = this.patrolPoints[0] ?? new Phaser.Math.Vector2(400, 300);
    this.player = this.physics.add
      .sprite(spawn.x, spawn.y, 'room-atlas', 'misa-front')
      .setSize(30, 40)
      .setOffset(0, 24);
    this.player.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, this.worldLayer);

    this.cameras.main.startFollow(this.player, true, 0.07, 0.07);
    this.cameras.main.setZoom(2);
  }

  private createCore() {
    const center = this.corePoint();
    this.core = this.add
      .image(center.x, center.y, key.texture.arenaCore)
      .setTint(0x74a8ff);
    this.core.setScale(1.2);
    this.core.setDepth(8);
    this.tweens.add({
      targets: this.core,
      scaleX: 1.28,
      scaleY: 1.28,
      alpha: 0.82,
      duration: 880,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
  }

  private createUI() {
    this.infoText = this.add
      .text(16, 16, 'Defender intercepts hostile patches only', {
        fontFamily: '"Chakra Petch", sans-serif',
        fontSize: '14px',
        color: '#d9ecff',
        backgroundColor: '#0a1426cc',
        padding: { x: 8, y: 6 },
      })
      .setScrollFactor(0)
      .setDepth(40);

    this.coreHealthText = this.add
      .text(16, 56, '', {
        fontFamily: '"Chakra Petch", sans-serif',
        fontSize: '12px',
        color: '#80ffb8',
        backgroundColor: '#0a1426cc',
        padding: { x: 8, y: 6 },
      })
      .setScrollFactor(0)
      .setDepth(40);

    this.streamStatusText = this.add
      .text(16, 104, 'Hook Stream: connecting...', {
        fontFamily: '"Chakra Petch", sans-serif',
        fontSize: '12px',
        color: '#ffd27a',
        backgroundColor: '#0a1426cc',
        padding: { x: 8, y: 6 },
      })
      .setScrollFactor(0)
      .setDepth(40);

    this.streamDetailsText = this.add
      .text(16, 146, 'Last event: none\nZone: n/a\nStatus: idle', {
        fontFamily: '"Chakra Petch", sans-serif',
        fontSize: '11px',
        color: '#d2e6ff',
        backgroundColor: '#0a1426cc',
        padding: { x: 8, y: 6 },
      })
      .setScrollFactor(0)
      .setDepth(40);

    this.updateHudText();
  }

  private createAnimations() {
    const anims = this.anims;
    if (!anims.exists('misa-left-walk')) {
      anims.create({
        key: 'misa-left-walk',
        frames: anims.generateFrameNames('room-atlas', {
          prefix: 'misa-left-walk.',
          start: 0,
          end: 3,
          zeroPad: 3,
        }),
        frameRate: 10,
        repeat: -1,
      });
      anims.create({
        key: 'misa-right-walk',
        frames: anims.generateFrameNames('room-atlas', {
          prefix: 'misa-right-walk.',
          start: 0,
          end: 3,
          zeroPad: 3,
        }),
        frameRate: 10,
        repeat: -1,
      });
      anims.create({
        key: 'misa-front-walk',
        frames: anims.generateFrameNames('room-atlas', {
          prefix: 'misa-front-walk.',
          start: 0,
          end: 3,
          zeroPad: 3,
        }),
        frameRate: 10,
        repeat: -1,
      });
      anims.create({
        key: 'misa-back-walk',
        frames: anims.generateFrameNames('room-atlas', {
          prefix: 'misa-back-walk.',
          start: 0,
          end: 3,
          zeroPad: 3,
        }),
        frameRate: 10,
        repeat: -1,
      });
    }
  }

  private startAutoplay() {
    this.time.addEvent({
      delay: 260,
      callback: () => this.updatePlayerIntent(),
      loop: true,
    });
  }

  private connectLiveHooks() {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${location.host}/ws`);
    this.liveSocket = ws;

    ws.addEventListener('message', (evt) => {
      try {
        const message = JSON.parse(evt.data as string) as RealtimeWireMessage;
        if (message.type === 'hook_event' && message.hook) {
          this.processHookEvent(message.hook);
        }
        if (message.type === 'timeline_event' && message.event) {
          this.lastTimelineEvent = message.event.name;
          this.lastZone = String(eventZone(message.event) ?? this.lastZone);
          this.processTimelineEvent(message.event);
        }
        if (message.type === 'mutation_status') {
          this.processMutationStatus(message);
        }
        this.updateStreamDetails();
      } catch {
        // ignore malformed events
      }
    });

    ws.addEventListener('open', () => {
      this.liveConnected = true;
      this.streamStatusText.setText('Hook Stream: connected');
      this.streamStatusText.setColor('#80ffb8');
      this.syncExternalStats();
    });

    ws.addEventListener('close', () => {
      this.liveConnected = false;
      this.streamStatusText.setText('Hook Stream: disconnected');
      this.streamStatusText.setColor('#ff8899');
      this.syncExternalStats();
    });
  }

  private processMutationStatus(
    message: Extract<RealtimeWireMessage, { type: 'mutation_status' }>,
  ) {
    this.lastMutationStatus = message.status;
    this.lastZone = message.zone || this.lastZone;
    this.lastMutationId = message.mutationId;
    this.lastTask = message.task;
    this.pushBackendFeed(
      `${this.formatClock(message.at)} mutation_status ${message.status} ${message.mutationId}`,
    );

    const unit = this.findMutationById(message.mutationId);
    if (unit) {
      unit.mutationId = message.mutationId;
    }
  }

  private updateStreamDetails() {
    this.streamDetailsText.setText(
      `Last event: ${this.lastTimelineEvent}\nZone: ${this.lastZone}\nStatus: ${this.lastMutationStatus}`,
    );
    this.syncExternalStats();
  }

  private updatePlayerIntent() {
    const hostile = this.closestHostile();
    if (hostile) {
      const intercept = new Phaser.Math.Vector2(
        hostile.sprite.x - 40,
        hostile.sprite.y,
      );
      this.movePlayerTowards(intercept, 140);
      return;
    }

    const target = this.patrolPoints[this.patrolIndex];
    this.patrolIndex = (this.patrolIndex + 1) % this.patrolPoints.length;
    if (this.patrolIndex === 0) {
      this.patrolLoops += 1;
      this.pushFeed(`Patrol loop ${this.patrolLoops} complete`);
    }
    this.movePlayerTowards(target, 115);
  }

  private movePlayerTowards(target: Phaser.Math.Vector2, speed: number) {
    const delta = target
      .clone()
      .subtract(new Phaser.Math.Vector2(this.player.x, this.player.y));
    if (delta.length() < 8) {
      this.player.setVelocity(0, 0);
      return;
    }
    const velocity = delta.normalize().scale(speed);
    this.player.setVelocity(velocity.x, velocity.y);
  }

  private spawnTargetedMutation(kind: MutationKind, zone?: string) {
    const resolvedZone = zone ?? 'UI';
    const spot = this.spawnPointForZone(resolvedZone);
    const state: MutationState = kind === 'clean_patch' ? 'benign' : 'hostile';
    const unit = this.createMutationUnit(
      kind,
      state,
      resolvedZone,
      spot,
      6,
      1.18,
    );
    this.mutations.push(unit);
    this.spawnedTotal += 1;
    this.pushFeed(
      `${state === 'benign' ? 'Admitted' : 'Spawned'} ${this.shortLabel(kind)} from ingress`,
    );
    this.updateHudText();
  }

  private createMutationUnit(
    kind: MutationKind,
    state: MutationState,
    zone: string,
    spot: Phaser.Math.Vector2,
    hp: number,
    scale: number,
  ): MutationUnit {
    const sprite = this.physics.add
      .sprite(spot.x, spot.y, this.mutationTextureFor(kind))
      .setDepth(12)
      .setScale(scale);
    sprite.setTint(this.tintForUnit(kind, state));
    sprite.setCollideWorldBounds(true);
    sprite.setDrag(220, 220);
    sprite.setBounce(0.25, 0.25);
    sprite.setMaxVelocity(180, 180);
    sprite.setSize(20, 30).setOffset(8, 14);

    this.physics.add.collider(sprite, this.worldLayer);
    this.physics.add.collider(sprite, this.player);

    this.tweens.add({
      targets: sprite,
      y: sprite.y - 3,
      angle: { from: -2, to: 2 },
      duration: 420 + Phaser.Math.Between(0, 160),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });

    const label = this.add
      .text(spot.x, spot.y - 22, this.labelFor(kind, state), {
        fontFamily: '"Chakra Petch", sans-serif',
        fontSize: '10px',
        color: '#f3f8ff',
        backgroundColor: '#0b1528cc',
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5, 1)
      .setDepth(13);

    const healthBar = this.add.graphics().setDepth(13);
    this.drawMutationHealthBar(healthBar, sprite.x, sprite.y, hp, hp, state);

    return {
      sprite,
      label,
      healthBar,
      kind,
      state,
      hp,
      maxHp: hp,
      attackCooldownMs: 0,
      zone,
    };
  }

  private updateMutations(delta: number) {
    const corePos = this.corePoint();

    for (const unit of this.mutations) {
      const current = new Phaser.Math.Vector2(unit.sprite.x, unit.sprite.y);
      const distanceToCore = Phaser.Math.Distance.Between(
        current.x,
        current.y,
        corePos.x,
        corePos.y,
      );

      if (unit.state === 'hostile') {
        const velocity = corePos
          .clone()
          .subtract(current)
          .normalize()
          .scale(this.speedByKind(unit.kind));
        unit.sprite.setVelocity(velocity.x, velocity.y);
      } else if (unit.state === 'benign' || unit.state === 'released') {
        unit.sprite.setVelocity(-72, 0);
      } else {
        unit.sprite.setVelocity(0, 0);
      }

      unit.label.setPosition(unit.sprite.x, unit.sprite.y - 22);
      this.drawMutationHealthBar(
        unit.healthBar,
        unit.sprite.x,
        unit.sprite.y,
        unit.hp,
        unit.maxHp,
        unit.state,
      );
      unit.attackCooldownMs = Math.max(0, unit.attackCooldownMs - delta);

      if (
        unit.state === 'hostile' &&
        distanceToCore < 26 &&
        unit.attackCooldownMs <= 0
      ) {
        this.coreHealth = Math.max(
          0,
          this.coreHealth - this.damageByKind(unit.kind),
        );
        this.agentHitCount += 1;
        unit.attackCooldownMs = this.cooldownByKind(unit.kind);

        this.tweens.add({
          targets: unit.sprite,
          scaleX: 1.35,
          scaleY: 1.35,
          duration: 80,
          yoyo: true,
        });

        const shove = new Phaser.Math.Vector2(
          this.player.x - unit.sprite.x,
          this.player.y - unit.sprite.y,
        )
          .normalize()
          .scale(130);
        this.player.setVelocity(shove.x, shove.y);

        this.cameras.main.shake(90, 0.0025);
        this.pushFeed(
          `${this.shortLabel(unit.kind)} hit core for ${this.damageByKind(unit.kind)}`,
        );
        this.updateHudText();
      }
    }

    const remaining: MutationUnit[] = [];
    for (const unit of this.mutations) {
      if (unit.state === 'benign' && unit.sprite.x < 120) {
        this.pushFeed(`${this.shortLabel(unit.kind)} was spared and passed`);
        this.removeMutation(unit);
        continue;
      }
      if (unit.state === 'released' && unit.sprite.x < 120) {
        this.fixedTotal += 1;
        this.pushFeed(`${this.shortLabel(unit.kind)} repaired and released`);
        this.removeMutation(unit);
        continue;
      }
      if (
        (unit.state === 'quarantined' || unit.state === 'blocked') &&
        unit.hp <= 0
      ) {
        this.removeMutation(unit);
        continue;
      }
      remaining.push(unit);
    }
    this.mutations = remaining;
  }

  private attackNearestMutation() {
    const playerPos = new Phaser.Math.Vector2(this.player.x, this.player.y);
    const hostile = this.mutations
      .filter((unit) => unit.state === 'hostile')
      .reduce(
        (best, cur) => {
          const dist = Phaser.Math.Distance.Between(
            playerPos.x,
            playerPos.y,
            cur.sprite.x,
            cur.sprite.y,
          );
          if (!best || dist < best.dist) return { unit: cur, dist };
          return best;
        },
        null as null | { unit: MutationUnit; dist: number },
      );

    if (!hostile || hostile.dist > 78) return;

    hostile.unit.hp -= this.playerDamageByKind(hostile.unit.kind);

    const slash = this.add.graphics().setDepth(16);
    slash.lineStyle(4, this.playerBeamColorByKind(hostile.unit.kind), 0.92);
    slash.beginPath();
    slash.arc(
      this.player.x,
      this.player.y - 4,
      30,
      Phaser.Math.DegToRad(-45),
      Phaser.Math.DegToRad(35),
    );
    slash.strokePath();
    this.time.delayedCall(100, () => slash.destroy());

    this.tweens.add({
      targets: hostile.unit.sprite,
      scaleX: 1.45,
      scaleY: 1.45,
      duration: 90,
      yoyo: true,
    });

    const knockback = new Phaser.Math.Vector2(
      hostile.unit.sprite.x - this.player.x,
      hostile.unit.sprite.y - this.player.y,
    )
      .normalize()
      .scale(185);
    hostile.unit.sprite.setVelocity(knockback.x, knockback.y);
    this.cameras.main.shake(60, 0.0015);

    if (hostile.unit.hp <= 0) {
      hostile.unit.hp = 0;
      hostile.unit.state = 'downed';
      hostile.unit.label.setText('DOWNED');
      hostile.unit.sprite.setTint(
        this.tintForUnit(hostile.unit.kind, 'downed'),
      );
      this.killedTotal += 1;
      this.pushFeed(
        `${this.shortLabel(hostile.unit.kind)} downed for inspection`,
      );
      this.updateHudText();
    }
  }

  private removeMutation(unit: MutationUnit) {
    unit.sprite.destroy();
    unit.label.destroy();
    unit.healthBar.destroy();
  }

  private updatePlayerAnimation() {
    const body = this.player.body as Phaser.Physics.Arcade.Body | null;
    if (!body) return;

    const velocity = body.velocity;
    if (velocity.length() < 1) {
      this.player.anims.stop();
      return;
    }

    if (Math.abs(velocity.x) > Math.abs(velocity.y)) {
      if (velocity.x > 0) this.player.anims.play('misa-right-walk', true);
      else this.player.anims.play('misa-left-walk', true);
      return;
    }

    if (velocity.y > 0) this.player.anims.play('misa-front-walk', true);
    else this.player.anims.play('misa-back-walk', true);
  }

  private updateHudText() {
    const label =
      `Agent Integrity: ${this.coreHealth}%  |  Active Entities: ${this.mutations.length}\n` +
      'Ingress right -> hostile intercepted -> repair loop shown -> released entities walk free';
    this.coreHealthText.setText(label);

    if (this.coreHealth <= 0) {
      this.infoText.setText('Room Breached // Restart to replay');
      this.player.setVelocity(0, 0);
    } else if (this.liveConnected) {
      this.infoText.setText(
        'Defender spares clean patches and fights hostile ones',
      );
    } else {
      this.infoText.setText('Awaiting backend stream');
    }

    this.syncExternalStats();
  }

  private mutationTextureFor(kind: MutationKind): string {
    if (kind === 'quality_regression') return key.texture.mutationRegression;
    if (kind === 'protected_zone_violation')
      return key.texture.mutationProtected;
    if (kind === 'malicious_signature') return key.texture.mutationMalicious;
    return key.texture.mutationClean;
  }

  private tintForUnit(kind: MutationKind, state: MutationState): number {
    if (state === 'repairing') return 0x5fb7ff;
    if (state === 'downed') return 0x7d8a96;
    if (state === 'released') return 0x80ffb8;
    if (state === 'quarantined') return 0xff9900;
    if (state === 'blocked') return 0xff4b5c;
    if (kind === 'quality_regression') return ZONE_COLORS.UI;
    if (kind === 'protected_zone_violation') return ZONE_COLORS.Config;
    if (kind === 'malicious_signature') return 0xff3344;
    return 0x64f2a5;
  }

  private shortLabel(kind: MutationKind): string {
    if (kind === 'quality_regression') return 'REGRESSION';
    if (kind === 'protected_zone_violation') return 'PROTECTED';
    if (kind === 'malicious_signature') return 'MALICIOUS';
    return 'CLEAN';
  }

  private labelFor(kind: MutationKind, state: MutationState): string {
    if (state === 'repairing') return 'REPAIR';
    if (state === 'downed') return 'DOWNED';
    if (state === 'released') return 'RELEASED';
    if (state === 'quarantined') return 'QUARANTINE';
    if (state === 'blocked') return 'BLOCKED';
    return this.shortLabel(kind);
  }

  private pushFeed(message: string) {
    this.processFeed.unshift(message);
    if (this.processFeed.length > 8) this.processFeed.length = 8;
  }

  private pushBackendFeed(message: string) {
    this.backendFeed.unshift(message);
    if (this.backendFeed.length > 10) this.backendFeed.length = 10;
  }

  private processHookEvent(hook: {
    at?: string;
    event?: string;
    payload?: unknown;
  }) {
    const filePath =
      this.extractFilePath(hook.payload) ?? 'frontend/unknown.ts';
    const hookEvent = hook.event ?? 'unknown';
    const zone = this.inferZoneFromPath(filePath);
    const keyForHook = `${hook.at ?? 'unknown'}:${hookEvent}:${filePath}`;
    if (this.processedHookKeys.has(keyForHook)) return;
    this.processedHookKeys.add(keyForHook);

    if (hookEvent !== 'afterFileEdit') {
      this.spawnTargetedMutation(this.kindFromHook(hookEvent, filePath), zone);
    }

    this.lastHookEvent = hookEvent;
    this.lastTimelineEvent = hookEvent;
    this.lastZone = zone;
    this.lastFiles = filePath;
    this.lastStage = hookEvent.includes('Read') ? 'reader' : 'hook_ingress';
    this.lastMutationStatus = hookEvent.includes('Read')
      ? 'inspected'
      : 'received';

    this.pushFeed(`Hook ${hookEvent} on ${filePath}`);
    this.pushBackendFeed(
      `${this.formatClock(hook.at)} ${hookEvent} ${filePath}`,
    );
    this.updateStreamDetails();
  }

  private inferZoneFromPath(path: string): string {
    const p = path.toLowerCase();
    if (p.includes('auth') || p.includes('login')) return 'Auth';
    if (p.includes('api') || p.includes('server')) return 'API';
    if (p.includes('config') || p.includes('env')) return 'Config';
    if (p.includes('test') || p.includes('spec')) return 'Tests';
    return 'UI';
  }

  private kindFromPath(path: string): MutationKind {
    const zone = this.inferZoneFromPath(path);
    if (zone === 'Auth') return 'malicious_signature';
    if (zone === 'API') return 'quality_regression';
    if (zone === 'Config') return 'protected_zone_violation';
    return 'clean_patch';
  }

  private kindFromHook(hookEvent: string, path: string): MutationKind {
    if (hookEvent === 'afterFileEdit') return this.kindFromPath(path);
    if (hookEvent === 'beforeReadFile' || hookEvent === 'beforeTabFileRead') {
      return 'clean_patch';
    }
    if (hookEvent === 'afterShellExecution') return 'protected_zone_violation';
    if (hookEvent === 'afterMCPExecution') return 'malicious_signature';
    if (hookEvent === 'afterAgentResponse') return 'quality_regression';
    return 'clean_patch';
  }

  private speedByKind(kind: MutationKind): number {
    if (kind === 'malicious_signature') return 66;
    if (kind === 'quality_regression') return 58;
    if (kind === 'protected_zone_violation') return 50;
    return 54;
  }

  private damageByKind(kind: MutationKind): number {
    if (kind === 'malicious_signature') return 8;
    if (kind === 'quality_regression') return 5;
    if (kind === 'protected_zone_violation') return 4;
    return 3;
  }

  private cooldownByKind(kind: MutationKind): number {
    if (kind === 'malicious_signature') return 650;
    if (kind === 'quality_regression') return 820;
    if (kind === 'protected_zone_violation') return 1000;
    return 900;
  }

  private playerDamageByKind(kind: MutationKind): number {
    if (kind === 'malicious_signature') return 1;
    if (kind === 'quality_regression') return 2;
    if (kind === 'protected_zone_violation') return 2;
    return 3;
  }

  private playerBeamColorByKind(kind: MutationKind): number {
    if (kind === 'malicious_signature') return 0xff88aa;
    if (kind === 'quality_regression') return 0x88d6ff;
    if (kind === 'protected_zone_violation') return 0xffdf8b;
    return 0x8effb2;
  }

  private extractFilePath(payload: unknown): string | undefined {
    if (typeof payload === 'string') return payload;
    if (Array.isArray(payload)) {
      for (const value of payload) {
        const path = this.extractFilePath(value);
        if (path) return path;
      }
      return undefined;
    }
    if (!payload || typeof payload !== 'object') return undefined;

    const maybe = payload as Record<string, unknown>;
    const directValues = [
      maybe.filePath,
      maybe.path,
      maybe.relativePath,
      maybe.target,
      maybe.file,
      maybe.uri,
    ];

    for (const value of directValues) {
      const path = this.extractFilePath(value);
      if (path) return path;
    }

    return undefined;
  }

  private kindFromDiagnosis(code?: string): MutationKind {
    if (code === 'quality_regression') return 'quality_regression';
    if (code === 'protected_zone_violation') return 'protected_zone_violation';
    if (code === 'malicious_signature') return 'malicious_signature';
    return 'clean_patch';
  }

  private drawMutationHealthBar(
    bar: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    hp: number,
    maxHp: number,
    state: MutationState,
  ) {
    const width = 24;
    const ratio = Phaser.Math.Clamp(hp / Math.max(1, maxHp), 0, 1);
    let color = 0x80ffb8;
    if (state === 'hostile') color = ratio > 0.25 ? 0xffd27a : 0xff7d93;
    if (state === 'repairing') color = 0x5fb7ff;
    if (state === 'downed') color = 0x7d8a96;
    if (state === 'quarantined') color = 0xff9900;
    if (state === 'blocked') color = 0xff4b5c;

    bar.clear();
    bar.fillStyle(0x09111b, 0.82);
    bar.fillRoundedRect(x - width / 2, y - 31, width, 4, 2);
    bar.fillStyle(color, 1);
    bar.fillRoundedRect(x - width / 2 + 1, y - 30, (width - 2) * ratio, 2, 1);
  }

  private stageFromEvent(name: TimelineEvent['name']): string {
    if (name === 'scenario_received' || name === 'patch_loaded')
      return 'patch_ingest';
    if (name === 'patch_apply_simulated') return 'apply_simulation';
    if (
      name === 'protected_zone_check_passed' ||
      name === 'protected_zone_check_blocked'
    ) {
      return 'zone_check';
    }
    if (name === 'checks_started') return 'checks_start';
    if (name === 'test_check_completed') return 'tests';
    if (name === 'lint_check_completed') return 'lint';
    if (name === 'typecheck_completed') return 'typecheck';
    if (name === 'health_classified') return 'health_classification';
    if (name === 'diagnosis_generated') return 'diagnosis';
    if (name === 'treatment_generated') return 'treatment';
    if (
      name === 'retry_started' ||
      name === 'retry_patch_applied' ||
      name === 'recheck_started'
    ) {
      return 'repair_loop';
    }
    if (name === 'patch_quarantined') return 'quarantine';
    if (name === 'final_verdict_issued') return 'final_verdict';
    return 'pipeline';
  }

  private processTimelineEvent(event: TimelineEvent) {
    this.events.emit('timeline_event', event);
    this.pushFeed(`Event: ${event.name}`);
    this.pushBackendFeed(`${this.formatClock(event.at)} ${event.name}`);
    this.lastStage = this.stageFromEvent(event.name);
    this.lastMutationId = String(event.data?.mutationId ?? this.lastMutationId);
    if (event.data?.filesChanged)
      this.lastFiles = String(event.data.filesChanged);

    let active =
      this.findMutationById(String(event.data?.mutationId ?? '')) ??
      this.latestNonBenign();

    if (event.name === 'scenario_received' && !active) {
      this.spawnTargetedMutation(
        this.kindFromDiagnosis(
          String(event.data?.diagnosisCode ?? 'clean_patch'),
        ),
        String(event.data?.zone ?? 'UI'),
      );
      active = this.latestNonBenign();
      if (active && event.data?.mutationId) {
        active.mutationId = String(event.data.mutationId);
      }
    }

    if (!active) {
      this.syncExternalStats();
      return;
    }

    if (event.data?.mutationId) {
      active.mutationId = String(event.data.mutationId);
    }

    if (event.name === 'diagnosis_generated') {
      active.kind = this.kindFromDiagnosis(
        String(event.data?.diagnosisCode ?? active.kind),
      );
      this.lastDiagnosis = String(
        event.data?.diagnosisCode ?? this.lastDiagnosis,
      );
      active.sprite.setTexture(this.mutationTextureFor(active.kind));
      active.sprite.setTint(this.tintForUnit(active.kind, active.state));
      active.label.setText(this.labelFor(active.kind, active.state));
    } else if (event.name === 'health_classified') {
      const health = String(event.data?.health ?? 'suspicious');
      if (health === 'healthy') active.state = 'benign';
      if (health === 'infected') active.state = 'hostile';
      active.sprite.setTint(this.tintForUnit(active.kind, active.state));
      active.label.setText(this.labelFor(active.kind, active.state));
    } else if (event.name === 'test_check_completed') {
      this.checkTests = String(event.data?.status ?? this.checkTests);
    } else if (event.name === 'lint_check_completed') {
      this.checkLint = String(event.data?.status ?? this.checkLint);
    } else if (event.name === 'typecheck_completed') {
      this.checkTypecheck = String(event.data?.status ?? this.checkTypecheck);
    } else if (
      event.name === 'treatment_generated' ||
      event.name === 'retry_started' ||
      event.name === 'retry_patch_applied' ||
      event.name === 'recheck_started'
    ) {
      active.state = 'repairing';
      active.hp = Math.max(active.hp, Math.ceil(active.maxHp * 0.35));
      active.sprite.setTint(this.tintForUnit(active.kind, active.state));
      active.label.setText(this.labelFor(active.kind, active.state));
      this.pushFeed('Repair loop active');
    } else if (event.name === 'patch_quarantined') {
      active.state = 'quarantined';
      active.hp = 0;
      active.sprite.setTint(this.tintForUnit(active.kind, active.state));
      active.label.setText(this.labelFor(active.kind, active.state));
      this.quarantinedTotal += 1;
      this.pushFeed('Mutation quarantined');
    } else if (event.name === 'final_verdict_issued') {
      const verdict = String(event.data?.finalVerdict ?? 'quarantined');
      this.lastVerdict = verdict;
      if (verdict === 'released') {
        active.state = 'released';
        active.kind = 'clean_patch';
        active.hp = active.maxHp;
        active.sprite.setTexture(this.mutationTextureFor(active.kind));
        active.sprite.setTint(this.tintForUnit(active.kind, active.state));
        active.label.setText(this.labelFor(active.kind, active.state));
        this.pushFeed('Entity revived after repair and is now released');
      } else if (verdict === 'blocked') {
        active.state = 'blocked';
        active.hp = 0;
        active.sprite.setTint(this.tintForUnit(active.kind, active.state));
        active.label.setText(this.labelFor(active.kind, active.state));
        this.coreHealth = Math.max(0, this.coreHealth - 15);
        this.cameras.main.shake(180, 0.008);
        this.blockedTotal += 1;
        this.pushFeed('Mutation blocked at final verdict');
      } else {
        active.state = 'quarantined';
        active.hp = 0;
        active.sprite.setTint(this.tintForUnit(active.kind, active.state));
        active.label.setText(this.labelFor(active.kind, active.state));
        this.quarantinedTotal += 1;
        this.pushFeed('Mutation quarantined at final verdict');
      }
    }

    this.updateHudText();
    this.syncExternalStats();
  }

  playScenario(result: ScenarioRunResult) {
    this.coreHealth = 100;
    this.mutations.forEach((m) => this.removeMutation(m));
    this.mutations = [];

    this.lastTask = result.task;
    this.lastDiagnosis = result.diagnosis.code;
    this.lastVerdict = result.finalVerdict;
    this.checkTests = result.checks.tests.status;
    this.checkLint = result.checks.lint.status;
    this.checkTypecheck = result.checks.typecheck.status;

    this.spawnTargetedMutation(
      this.kindFromDiagnosis(result.diagnosis.code),
      result.zone,
    );
    this.pushFeed(`Scenario ${result.scenarioId} injected`);
    this.timelineQueue = [...result.timeline];

    const tick = () => {
      if (this.timelineQueue.length === 0) return;
      const event = this.timelineQueue.shift();
      if (event) this.processTimelineEvent(event);
      this.time.delayedCall(500, tick);
    };

    tick();
    this.updateHudText();
  }

  advanceToEvent(event: TimelineEvent) {
    this.processTimelineEvent(event);
  }

  resetVisuals() {
    this.playScenario({} as ScenarioRunResult);
  }

  private findMutationById(mutationId: string) {
    if (!mutationId) return undefined;
    return this.mutations.find((unit) => unit.mutationId === mutationId);
  }

  private latestNonBenign() {
    return [...this.mutations]
      .reverse()
      .find((unit) => unit.state !== 'benign' && unit.state !== 'released');
  }

  private closestHostile() {
    const playerPos = new Phaser.Math.Vector2(this.player.x, this.player.y);
    return this.mutations
      .filter((unit) => unit.state === 'hostile')
      .sort(
        (a, b) =>
          Phaser.Math.Distance.Between(
            playerPos.x,
            playerPos.y,
            a.sprite.x,
            a.sprite.y,
          ) -
          Phaser.Math.Distance.Between(
            playerPos.x,
            playerPos.y,
            b.sprite.x,
            b.sprite.y,
          ),
      )[0];
  }

  private spawnPointForZone(zone: string) {
    const yByZone: Record<string, number> = {
      Auth: 238,
      UI: 302,
      API: 374,
      Config: 448,
      Tests: 522,
    };
    return new Phaser.Math.Vector2(860, yByZone[zone] ?? 302);
  }

  private corePoint() {
    return new Phaser.Math.Vector2(390, 400);
  }

  private formatClock(at?: string) {
    if (!at) return '--:--:--';
    return at.slice(11, 19);
  }

  private syncExternalStats() {
    const core = document.getElementById('ext-core');
    if (core) core.textContent = `${this.coreHealth}%`;
    const mut = document.getElementById('ext-mutations');
    if (mut) mut.textContent = String(this.mutations.length);
    const spawned = document.getElementById('ext-spawned');
    if (spawned) spawned.textContent = String(this.spawnedTotal);
    const killed = document.getElementById('ext-killed');
    if (killed) killed.textContent = String(this.killedTotal);
    const fixed = document.getElementById('ext-fixed');
    if (fixed) fixed.textContent = String(this.fixedTotal);
    const quarantined = document.getElementById('ext-quarantined');
    if (quarantined) quarantined.textContent = String(this.quarantinedTotal);
    const blocked = document.getElementById('ext-blocked');
    if (blocked) blocked.textContent = String(this.blockedTotal);
    const hits = document.getElementById('ext-hits');
    if (hits) hits.textContent = String(this.agentHitCount);
    const loops = document.getElementById('ext-loops');
    if (loops) loops.textContent = String(this.patrolLoops);
    const ev = document.getElementById('ext-event');
    if (ev) ev.textContent = this.lastTimelineEvent;
    const zone = document.getElementById('ext-zone');
    if (zone) zone.textContent = this.lastZone;
    const stream = document.getElementById('ext-stream');
    if (stream) stream.textContent = this.lastMutationStatus;
    const feed = document.getElementById('ext-feed');
    if (feed)
      feed.innerHTML = this.processFeed
        .map((line) => `- ${line}`)
        .join('<br/>');

    const hook = document.getElementById('ext-hook-event');
    if (hook) hook.textContent = this.lastHookEvent;
    const mutationId = document.getElementById('ext-mutation-id');
    if (mutationId) mutationId.textContent = this.lastMutationId;
    const stage = document.getElementById('ext-stage');
    if (stage) stage.textContent = this.lastStage;
    const diagnosis = document.getElementById('ext-diagnosis');
    if (diagnosis) diagnosis.textContent = this.lastDiagnosis;
    const verdict = document.getElementById('ext-verdict');
    if (verdict) verdict.textContent = this.lastVerdict;
    const files = document.getElementById('ext-files');
    if (files) files.textContent = this.lastFiles;
    const task = document.getElementById('ext-task');
    if (task) task.textContent = this.lastTask;
    const tests = document.getElementById('ext-check-tests');
    if (tests) tests.textContent = this.checkTests;
    const lint = document.getElementById('ext-check-lint');
    if (lint) lint.textContent = this.checkLint;
    const typecheck = document.getElementById('ext-check-typecheck');
    if (typecheck) typecheck.textContent = this.checkTypecheck;
    const ops = document.getElementById('ext-ops-status');
    if (ops) ops.textContent = this.liveConnected ? 'LIVE' : 'OFFLINE';
    const backendFeed = document.getElementById('ext-backend-feed');
    if (backendFeed) {
      backendFeed.innerHTML = this.backendFeed
        .map((line) => {
          const [at = '--:--:--', type = 'event', ...rest] = line.split(' ');
          return `<div class="trace-line"><span class="trace-at">${at}</span><span class="trace-type">${type}</span><span class="trace-detail">${rest.join(' ')}</span></div>`;
        })
        .join('');
    }
  }

  shutdown() {
    if (this.liveSocket) {
      this.liveSocket.close();
      this.liveSocket = null;
    }
  }
}

function eventZone(event: TimelineEvent) {
  return typeof event.data?.zone === 'string' ? event.data.zone : undefined;
}
