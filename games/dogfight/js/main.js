// Dogfight — Fighter Jet Battle
// Main game loop, state machine, canvas management

import { Controls } from './controls.js';
import { Player } from './player.js';
import { BulletPool } from './bullets.js';
import { EnemyManager } from './enemies.js';
import { ParticleSystem } from './particles.js';
import { Starfield } from './starfield.js';
import { UI } from './ui.js';

const STATE = {
  START: 'start',
  PLAYING: 'playing',
  WAVE_INTRO: 'wave_intro',
  BOSS_INTRO: 'boss_intro',
  PAUSED: 'paused',
  GAME_OVER: 'game_over',
};

class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');

    // Game systems
    this.controls = new Controls();
    this.player = new Player();
    this.bullets = new BulletPool();
    this.enemies = new EnemyManager();
    this.particles = new ParticleSystem();
    this.starfield = new Starfield();
    this.ui = new UI();

    // State
    this.state = STATE.START;
    this.score = 0;
    this.wave = 0;
    this.bestScore = parseInt(localStorage.getItem('dogfight-best') || '0', 10);
    this.lastTime = 0;

    // Wave timing
    this.waveTimer = 0;
    this.waveIntroDuration = 1.2; // seconds to show "WAVE X"
    this.bossIntroDuration = 1.0; // seconds to show "WARNING"

    this.setupCanvas();
    this.setupUI();

    // Show high score on start screen
    this.ui.showStartBest(this.bestScore);

    requestAnimationFrame((t) => this.loop(t));
  }

  setupCanvas() {
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.canvas.width = window.innerWidth * dpr;
      this.canvas.height = window.innerHeight * dpr;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.starfield.regenerate(this.width, this.height);
    };
    resize();
    window.addEventListener('resize', resize);
  }

  setupUI() {
    document.getElementById('start-play-btn').addEventListener('click', () => {
      this.startGame();
    });

    document.getElementById('gameover-retry-btn').addEventListener('click', () => {
      this.startGame();
    });

    document.getElementById('pause-btn').addEventListener('click', () => {
      if (this.state === STATE.PLAYING) this.pause();
    });

    document.getElementById('pause-resume-btn').addEventListener('click', () => {
      if (this.state === STATE.PAUSED) this.resume();
    });
  }

  startGame() {
    this.state = STATE.WAVE_INTRO;
    this.score = 0;
    this.wave = 1;
    this.waveTimer = 0;

    this.player.reset(this.width, this.height);
    this.bullets.reset();
    this.enemies.reset();
    this.particles.reset();
    this.controls.reset();

    this.ui.startGame();
    this.ui.updateScore(0);
    this.ui.updateWave(1);
    this.ui.updateLives(this.player.lives);
    this.ui.showWaveAnnounce(1);
  }

  gameOver() {
    this.state = STATE.GAME_OVER;
    const isRecord = this.score > this.bestScore;
    if (isRecord) {
      this.bestScore = this.score;
      localStorage.setItem('dogfight-best', String(this.score));
    }
    this.ui.showGameOver(this.wave, this.score, this.bestScore, isRecord);
  }

  pause() {
    this.state = STATE.PAUSED;
    this.ui.showPause();
  }

  resume() {
    this.state = STATE.PLAYING;
    this.lastTime = performance.now();
    this.ui.hidePause();
  }

  startNextWave() {
    this.wave++;
    this.waveTimer = 0;

    const isBossWave = this.wave % 5 === 0;
    if (isBossWave) {
      this.state = STATE.BOSS_INTRO;
      this.ui.showBossWarning();
    } else {
      this.state = STATE.WAVE_INTRO;
      this.ui.showWaveAnnounce(this.wave);
    }
    this.ui.updateWave(this.wave);

    // Gain a life every 5 waves (capped at 3)
    if (this.wave % 5 === 1 && this.wave > 1) {
      this.player.gainLife();
      this.ui.updateLives(this.player.lives);
    }
  }

  loop(time) {
    requestAnimationFrame((t) => this.loop(t));

    const dt = Math.min((time - (this.lastTime || time)) / 1000, 0.05);
    this.lastTime = time;

    this.controls.update();

    if (this.state === STATE.PLAYING) {
      this.update(dt);
    } else if (this.state === STATE.WAVE_INTRO) {
      this.waveTimer += dt;
      // Still update starfield and player during intro
      this.starfield.update(dt);
      this.player.update(dt, this.controls.dir, this.width, this.height);
      if (this.waveTimer >= this.waveIntroDuration) {
        this.ui.hideWaveAnnounce();
        this.state = STATE.PLAYING;
        this.enemies.spawnWave(this.wave, this.width, this.height);
      }
    } else if (this.state === STATE.BOSS_INTRO) {
      this.waveTimer += dt;
      this.starfield.update(dt);
      this.player.update(dt, this.controls.dir, this.width, this.height);
      if (this.waveTimer >= this.bossIntroDuration) {
        this.ui.hideBossWarning();
        this.ui.showWaveAnnounce(this.wave);
        // Transition to wave intro briefly to show wave number
        this.state = STATE.WAVE_INTRO;
        this.waveTimer = 0;
      }
    }

    this.render();
  }

  update(dt) {
    this.starfield.update(dt);

    // Player movement + shooting
    this.player.update(dt, this.controls.dir, this.width, this.height);

    if (this.controls.firing) {
      this.player.tryShoot(this.bullets);
    }

    // Update bullets
    this.bullets.update(dt, this.width, this.height);

    // Update enemies
    this.enemies.update(dt, this.player, this.bullets, this.width, this.height);

    // Update particles
    this.particles.update(dt);

    // Check player bullets hitting enemies
    const kills = this.enemies.checkPlayerBullets(this.bullets, this.particles);
    if (kills > 0) {
      this.score += kills;
      this.ui.updateScore(this.score);
    }

    // Check enemy bullets hitting player
    if (!this.player.invincible) {
      const hit = this.bullets.checkHitCircle(
        this.player.x, this.player.y, this.player.hitRadius, false
      );
      if (hit) {
        this.player.takeDamage();
        this.particles.explode(this.player.x, this.player.y, '#00fff5');
        this.ui.updateLives(this.player.lives);
        if (this.player.lives <= 0) {
          this.gameOver();
          return;
        }
      }
    }

    // Check if wave is clear
    if (this.enemies.isWaveClear()) {
      this.startNextWave();
    }
  }

  render() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // Clear
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, w, h);

    // Starfield
    this.starfield.render(ctx, w, h);

    // Enemies
    this.enemies.render(ctx);

    // Player
    this.player.render(ctx);

    // Bullets
    this.bullets.render(ctx);

    // Particles
    this.particles.render(ctx);
  }
}

// Boot
new Game();
