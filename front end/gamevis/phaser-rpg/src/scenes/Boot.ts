import { Scene } from 'phaser';

import { key } from '../constants';

export class Boot extends Scene {
  constructor() {
    super(key.scene.boot);
  }

  preload() {
    // No external assets -- generate procedural textures
  }

  create() {
    this.generateTextures();
    this.scene.start(key.scene.dashboard);
  }

  private generateTextures() {
    const hexG = this.make.graphics({ x: 0, y: 0 }, false);
    const r = 20;
    const cx = 20;
    const cy = 23;
    hexG.fillStyle(0xffffff);
    hexG.beginPath();
    for (let i = 0; i < 6; i += 1) {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      const px = cx + r * Math.cos(angle);
      const py = cy + r * Math.sin(angle);
      if (i === 0) hexG.moveTo(px, py);
      else hexG.lineTo(px, py);
    }
    hexG.closePath();
    hexG.fillPath();
    hexG.generateTexture(key.texture.zoneHex, 40, 46);
    hexG.destroy();

    const patchG = this.make.graphics({ x: 0, y: 0 }, false);
    patchG.fillStyle(0xffffff);
    patchG.fillCircle(8, 8, 7);
    patchG.generateTexture(key.texture.patchSprite, 16, 16);
    patchG.destroy();

    const dotG = this.make.graphics({ x: 0, y: 0 }, false);
    dotG.fillStyle(0xffffff);
    dotG.fillCircle(2, 2, 2);
    dotG.generateTexture(key.texture.particle, 4, 4);
    dotG.destroy();

    const stageG = this.make.graphics({ x: 0, y: 0 }, false);
    stageG.fillStyle(0xffffff);
    stageG.fillCircle(12, 12, 11);
    stageG.generateTexture(key.texture.stageMarker, 24, 24);
    stageG.destroy();

    const coreG = this.make.graphics({ x: 0, y: 0 }, false);
    coreG.lineStyle(3, 0xffffff, 1);
    coreG.strokeCircle(27, 27, 24);
    coreG.lineStyle(1, 0xffffff, 0.35);
    coreG.strokeCircle(27, 27, 16);
    coreG.generateTexture(key.texture.arenaCore, 54, 54);
    coreG.destroy();

    const defenderG = this.make.graphics({ x: 0, y: 0 }, false);
    defenderG.fillStyle(0xffffff, 1);
    defenderG.beginPath();
    defenderG.moveTo(14, 1);
    defenderG.lineTo(27, 14);
    defenderG.lineTo(14, 27);
    defenderG.lineTo(1, 14);
    defenderG.closePath();
    defenderG.fillPath();
    defenderG.lineStyle(2, 0xffffff, 0.4);
    defenderG.strokePath();
    defenderG.generateTexture(key.texture.defender, 28, 28);
    defenderG.destroy();

    this.generateMutationTexture(
      key.texture.mutationClean,
      'hood',
      0x6fffd1,
      0x173f39,
    );
    this.generateMutationTexture(
      key.texture.mutationRegression,
      'brute',
      0x6fc6ff,
      0x12283c,
    );
    this.generateMutationTexture(
      key.texture.mutationProtected,
      'guard',
      0xffde7d,
      0x433719,
    );
    this.generateMutationTexture(
      key.texture.mutationMalicious,
      'rogue',
      0xff6f8b,
      0x3b1521,
    );

    const quarantineG = this.make.graphics({ x: 0, y: 0 }, false);
    quarantineG.lineStyle(2, 0xffffff, 1);
    quarantineG.strokeCircle(19, 19, 17);
    quarantineG.lineStyle(1, 0xffffff, 1);
    for (let i = -2; i <= 2; i += 1) {
      quarantineG.moveTo(8 + i * 5, 7);
      quarantineG.lineTo(30 + i * 5, 31);
    }
    quarantineG.strokePath();
    quarantineG.generateTexture(key.texture.quarantineRing, 38, 38);
    quarantineG.destroy();

    const healG = this.make.graphics({ x: 0, y: 0 }, false);
    healG.fillStyle(0xffffff, 1);
    healG.fillCircle(17, 17, 6);
    healG.fillRect(16, 3, 2, 28);
    healG.fillRect(3, 16, 28, 2);
    healG.generateTexture(key.texture.healBurst, 34, 34);
    healG.destroy();
  }

  private generateMutationTexture(
    textureKey: string,
    silhouette: 'hood' | 'brute' | 'guard' | 'rogue',
    primary: number,
    shadow: number,
  ) {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(shadow, 1);
    g.fillEllipse(18, 40, 22, 8);

    g.fillStyle(primary, 1);
    g.fillRoundedRect(10, 16, 16, 20, 5);
    g.fillCircle(18, 12, 8);
    g.fillRect(12, 35, 4, 10);
    g.fillRect(20, 35, 4, 10);
    g.fillRect(8, 19, 4, 12);
    g.fillRect(24, 19, 4, 12);

    if (silhouette === 'hood') {
      g.fillStyle(0xf3fffb, 0.95);
      g.fillTriangle(10, 16, 18, 2, 26, 16);
      g.fillStyle(0x0c1720, 1);
      g.fillCircle(15, 13, 1.2);
      g.fillCircle(21, 13, 1.2);
    } else if (silhouette === 'brute') {
      g.fillStyle(primary, 1);
      g.fillRoundedRect(8, 14, 20, 24, 6);
      g.fillRect(5, 18, 5, 14);
      g.fillRect(26, 18, 5, 14);
      g.fillStyle(0xffffff, 0.35);
      g.fillRect(14, 9, 8, 2);
    } else if (silhouette === 'guard') {
      g.fillStyle(0xeff7ff, 0.92);
      g.fillTriangle(18, 4, 10, 12, 26, 12);
      g.fillStyle(primary, 1);
      g.fillRect(8, 22, 20, 6);
      g.lineStyle(2, 0xffffff, 0.55);
      g.strokeRect(12, 17, 12, 18);
    } else {
      g.fillStyle(0xffffff, 0.9);
      g.fillTriangle(7, 10, 18, 2, 29, 10);
      g.fillStyle(primary, 1);
      g.fillRect(5, 21, 4, 14);
      g.fillRect(27, 21, 4, 14);
    }

    g.lineStyle(2, 0x071019, 0.55);
    g.strokeCircle(18, 12, 8);
    g.strokeRoundedRect(10, 16, 16, 20, 5);
    g.generateTexture(textureKey, 36, 48);
    g.destroy();
  }
}
