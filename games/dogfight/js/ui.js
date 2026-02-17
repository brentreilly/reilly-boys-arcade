// Dogfight — UI Manager
// Score, wave, lives, announcements, screen transitions

export class UI {
  constructor() {
    this.scoreEl = document.getElementById('score-display');
    this.waveEl = document.getElementById('wave-display');
    this.livesEl = document.getElementById('lives-display');
    this.hudEl = document.getElementById('hud');
    this.controlsEl = document.getElementById('controls');

    this.waveAnnounceText = document.getElementById('wave-announce-text');
    this.bossWarning = document.getElementById('boss-warning');

    this.startScreen = document.getElementById('start-screen');
    this.startBest = document.getElementById('start-best');
    this.gameoverScreen = document.getElementById('gameover-screen');
    this.pauseScreen = document.getElementById('pause-screen');

    this.gameoverWave = document.getElementById('gameover-wave');
    this.gameoverScore = document.getElementById('gameover-score');
    this.gameoverBest = document.getElementById('gameover-best');
    this.gameoverNewRecord = document.getElementById('gameover-new-record');
  }

  showStartBest(best) {
    if (best > 0) {
      this.startBest.textContent = `HIGH SCORE: ${best}`;
    }
  }

  startGame() {
    this.startScreen.classList.add('hidden');
    this.gameoverScreen.classList.add('hidden');
    this.pauseScreen.classList.add('hidden');
    this.hudEl.classList.remove('hidden');
    this.controlsEl.classList.remove('hidden');
  }

  updateScore(score) {
    this.scoreEl.textContent = score;
  }

  updateWave(wave) {
    this.waveEl.textContent = `WAVE ${wave}`;
  }

  updateLives(lives) {
    // Clear existing icons using DOM methods
    while (this.livesEl.firstChild) {
      this.livesEl.removeChild(this.livesEl.firstChild);
    }
    for (let i = 0; i < lives; i++) {
      const icon = document.createElement('div');
      icon.className = 'life-icon';
      this.livesEl.appendChild(icon);
    }
  }

  showWaveAnnounce(wave) {
    this.waveAnnounceText.textContent = `WAVE ${wave}`;
    this.waveAnnounceText.classList.add('visible');
  }

  hideWaveAnnounce() {
    this.waveAnnounceText.classList.remove('visible');
  }

  showBossWarning() {
    this.bossWarning.classList.remove('hidden');
    this.bossWarning.classList.add('visible');
  }

  hideBossWarning() {
    this.bossWarning.classList.add('hidden');
    this.bossWarning.classList.remove('visible');
  }

  showGameOver(wave, score, bestScore, isRecord) {
    this.hudEl.classList.add('hidden');
    this.controlsEl.classList.add('hidden');
    this.hideWaveAnnounce();
    this.hideBossWarning();

    this.gameoverWave.textContent = `WAVE ${wave}`;
    this.gameoverScore.textContent = score;
    this.gameoverBest.textContent = `BEST: ${bestScore}`;
    this.gameoverNewRecord.classList.toggle('hidden', !isRecord);
    this.gameoverScreen.classList.remove('hidden');
  }

  showPause() {
    this.pauseScreen.classList.remove('hidden');
  }

  hidePause() {
    this.pauseScreen.classList.add('hidden');
  }
}
