// Dogfight — Enemy Manager
// Spawning, movement patterns, wave system, boss logic, collision

import { enemySprite, shooterSprite, bossSprite } from './sprites.js';

const MAX_ENEMIES = 20;

const TYPE = {
  BASIC: 'basic',
  SHOOTER: 'shooter',
  BOSS: 'boss',
};

export class EnemyManager {
  constructor() {
    this.enemies = [];
    this.waveEnemiesLeft = 0; // enemies still to defeat this wave
  }

  reset() {
    this.enemies = [];
    this.waveEnemiesLeft = 0;
  }

  spawnWave(wave, screenW, screenH) {
    const isBoss = wave % 5 === 0;

    if (isBoss) {
      this.spawnBoss(wave, screenW, screenH);
      return;
    }

    // Enemy count: starts at 3, +1 per wave
    const count = Math.min(3 + (wave - 1), 15);
    // Speed ramps 5% per wave
    const baseSpeed = 80 * Math.pow(1.05, wave - 1);
    // Shooter ratio: 0 for wave 1-2, then increases
    const shooterChance = wave < 3 ? 0 : Math.min(0.15 + (wave - 3) * 0.05, 0.6);

    for (let i = 0; i < count; i++) {
      const isShooter = Math.random() < shooterChance;
      this.spawnEnemy(
        isShooter ? TYPE.SHOOTER : TYPE.BASIC,
        baseSpeed + Math.random() * 40,
        screenW,
        screenH,
        i * 0.3 // stagger spawn delay
      );
    }

    this.waveEnemiesLeft = count;
  }

  spawnBoss(wave, screenW, screenH) {
    const bossNum = Math.floor(wave / 5); // 1st boss, 2nd boss, etc.
    const hp = 4 + bossNum;
    const speed = 60 + bossNum * 10;

    const enemy = {
      type: TYPE.BOSS,
      x: screenW + 40,
      y: screenH / 2,
      speed,
      hp,
      maxHp: hp,
      size: 36,
      hitRadius: 36 * 1.2, // generous hitbox
      angle: Math.PI, // facing left
      alive: true,
      spawnDelay: 0,

      // Boss movement: figure-8
      moveTime: 0,
      centerX: screenW * 0.65,
      centerY: screenH / 2,
      orbitRadiusX: screenW * 0.2,
      orbitRadiusY: screenH * 0.25,

      // Boss shooting
      fireTimer: 0,
      fireRate: 1.5 - bossNum * 0.1, // fires faster each boss
      spreadCount: 3 + Math.floor(bossNum / 2),

      // Visual
      pulseTime: 0,
    };

    this.enemies.push(enemy);
    this.waveEnemiesLeft = 1;
  }

  spawnEnemy(type, speed, screenW, screenH, delay) {
    // Pick a random edge to spawn from
    const edge = Math.floor(Math.random() * 3); // 0=right, 1=top, 2=bottom
    let x, y, angle;

    if (edge === 0) { // right
      x = screenW + 30;
      y = 60 + Math.random() * (screenH - 120);
      angle = Math.PI + (Math.random() - 0.5) * 0.6; // mostly leftward
    } else if (edge === 1) { // top
      x = screenW * 0.3 + Math.random() * screenW * 0.7;
      y = -30;
      angle = Math.PI / 2 + (Math.random() - 0.5) * 0.8; // mostly downward
    } else { // bottom
      x = screenW * 0.3 + Math.random() * screenW * 0.7;
      y = screenH + 30;
      angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.8; // mostly upward
    }

    const enemy = {
      type,
      x,
      y,
      speed,
      hp: 1,
      maxHp: 1,
      size: 14,
      hitRadius: 14 * 1.2, // 20% bigger than visual
      angle,
      alive: true,
      spawnDelay: delay,
      moveTime: Math.random() * Math.PI * 2, // random phase for sine wave

      // Shooter properties
      fireTimer: type === TYPE.SHOOTER ? 1.5 + Math.random() : 0,
      fireRate: 2.0,

      // Trail
      trail: [],
      trailMax: 3,
    };

    this.enemies.push(enemy);
  }

  update(dt, player, bullets, screenW, screenH) {
    for (const e of this.enemies) {
      if (!e.alive) continue;

      // Spawn delay
      if (e.spawnDelay > 0) {
        e.spawnDelay -= dt;
        continue;
      }

      if (e.type === TYPE.BOSS) {
        this.updateBoss(e, dt, player, bullets, screenW, screenH);
      } else {
        this.updateNormal(e, dt, player, bullets, screenW, screenH);
      }
    }

    // Clean up dead enemies that are off screen
    this.enemies = this.enemies.filter(e => e.alive || e.deathTimer > 0);
  }

  updateNormal(e, dt, player, bullets, screenW, screenH) {
    e.moveTime += dt;

    // Move forward with sine wave wobble
    const wobble = Math.sin(e.moveTime * 2.5) * 0.8;
    const moveAngle = e.angle + wobble * dt;

    e.x += Math.cos(moveAngle) * e.speed * dt;
    e.y += Math.sin(moveAngle) * e.speed * dt;

    // Trail
    e.trail.unshift({ x: e.x, y: e.y });
    if (e.trail.length > e.trailMax) e.trail.pop();

    // Shooter: fire at player
    if (e.type === TYPE.SHOOTER) {
      e.fireTimer -= dt;
      if (e.fireTimer <= 0) {
        e.fireTimer = e.fireRate;
        const dx = player.x - e.x;
        const dy = player.y - e.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) {
          const bulletSpeed = 160;
          bullets.spawn(
            e.x, e.y,
            (dx / dist) * bulletSpeed,
            (dy / dist) * bulletSpeed,
            false
          );
        }
      }
    }

    // Remove if far off screen
    const margin = 100;
    if (e.x < -margin || e.x > screenW + margin ||
        e.y < -margin || e.y > screenH + margin) {
      // Only despawn if it has been on screen at some point
      if (e.moveTime > 1.0) {
        e.alive = false;
        if (this.waveEnemiesLeft > 0) this.waveEnemiesLeft--;
      }
    }
  }

  updateBoss(e, dt, player, bullets, screenW, screenH) {
    e.moveTime += dt * 0.5;
    e.pulseTime += dt;

    // Move toward orbit position (figure-8)
    const targetX = e.centerX + Math.sin(e.moveTime) * e.orbitRadiusX;
    const targetY = e.centerY + Math.sin(e.moveTime * 2) * e.orbitRadiusY;

    // Smooth movement toward target
    e.x += (targetX - e.x) * 2.0 * dt;
    e.y += (targetY - e.y) * 2.0 * dt;

    // Face the player
    e.angle = Math.atan2(player.y - e.y, player.x - e.x);

    // Fire spread shot
    e.fireTimer -= dt;
    if (e.fireTimer <= 0) {
      e.fireTimer = e.fireRate;
      const baseAngle = Math.atan2(player.y - e.y, player.x - e.x);
      const spread = 0.3; // radians between shots
      const bulletSpeed = 140;

      for (let i = 0; i < e.spreadCount; i++) {
        const a = baseAngle + (i - (e.spreadCount - 1) / 2) * spread;
        bullets.spawn(
          e.x, e.y,
          Math.cos(a) * bulletSpeed,
          Math.sin(a) * bulletSpeed,
          false
        );
      }
    }
  }

  checkPlayerBullets(bullets, particles) {
    let kills = 0;

    for (const e of this.enemies) {
      if (!e.alive || e.spawnDelay > 0) continue;

      const hit = bullets.checkHitCircle(e.x, e.y, e.hitRadius, true);
      if (hit) {
        e.hp--;
        if (e.hp <= 0) {
          e.alive = false;
          e.deathTimer = 0; // for cleanup
          this.waveEnemiesLeft--;
          kills++;

          // Explosion
          const color = e.type === TYPE.BOSS ? '#ffcc00' : '#ff00ff';
          particles.explode(e.x, e.y, color);
          if (e.type === TYPE.BOSS) {
            // Extra big explosion for boss
            particles.explode(e.x + 10, e.y - 10, '#ff8800');
            particles.explode(e.x - 10, e.y + 10, '#ff3333');
          }
        }
      }
    }

    return kills;
  }

  isWaveClear() {
    return this.waveEnemiesLeft <= 0;
  }

  render(ctx) {
    for (const e of this.enemies) {
      if (!e.alive || e.spawnDelay > 0) continue;

      if (e.type === TYPE.BOSS) {
        this.renderBoss(ctx, e);
      } else {
        this.renderNormal(ctx, e);
      }
    }
  }

  renderNormal(ctx, e) {
    // Trail
    for (let i = 1; i < e.trail.length; i++) {
      const t = e.trail[i];
      const alpha = 0.3 * (1 - i / e.trail.length);
      ctx.fillStyle = `rgba(255, 136, 0, ${alpha})`;
      ctx.beginPath();
      ctx.arc(t.x, t.y, 3 * (1 - i / e.trail.length), 0, Math.PI * 2);
      ctx.fill();
    }

    const sprite = e.type === TYPE.SHOOTER ? shooterSprite : enemySprite;

    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(e.angle);

    // Neon glow
    ctx.globalAlpha = 0.6;
    ctx.drawImage(
      sprite.glow,
      -sprite.w / 2 - sprite.glowPad,
      -sprite.h / 2 - sprite.glowPad
    );

    // Crisp sprite
    ctx.globalAlpha = 1;
    ctx.drawImage(sprite.canvas, -sprite.w / 2, -sprite.h / 2);

    ctx.restore();
  }

  renderBoss(ctx, e) {
    const pulse = 0.6 + Math.sin(e.pulseTime * 4) * 0.4;

    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(e.angle);

    // Pulsing neon glow
    ctx.globalAlpha = pulse * 0.7;
    ctx.drawImage(
      bossSprite.glow,
      -bossSprite.w / 2 - bossSprite.glowPad,
      -bossSprite.h / 2 - bossSprite.glowPad
    );

    // Crisp sprite
    ctx.globalAlpha = 1;
    ctx.drawImage(bossSprite.canvas, -bossSprite.w / 2, -bossSprite.h / 2);

    // HP bar above boss
    ctx.restore();

    const barW = 50;
    const barH = 5;
    const barX = e.x - barW / 2;
    const barY = e.y - e.size - 12;

    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(barX, barY, barW, barH);

    const pct = e.hp / e.maxHp;
    ctx.fillStyle = pct > 0.5 ? '#39ff14' : pct > 0.25 ? '#ffcc00' : '#ff3333';
    ctx.fillRect(barX, barY, barW * pct, barH);
  }
}
