// HUD & UI management — track select, countdown, race HUD, results screens.
// Uses DOM elements defined in index.html, toggled via .hidden class.

import { TRACKS } from './track.js';

const TOTAL_LAPS = 3;
const SAVE_KEY = 'neon-racers-unlocked';

export class HUD {
  constructor() {
    // Cache DOM refs
    this.trackSelectScreen = document.getElementById('track-select');
    this.countdownOverlay = document.getElementById('countdown-overlay');
    this.countdownText = document.getElementById('countdown-text');
    this.raceHud = document.getElementById('race-hud');
    this.positionDisplay = document.getElementById('position-display');
    this.lapDisplay = document.getElementById('lap-display');
    this.pauseScreen = document.getElementById('pause-screen');
    this.resultsScreen = document.getElementById('results-screen');
    this.resultsPosition = document.getElementById('results-position');
    this.resultsMessage = document.getElementById('results-message');
    this.unlockMessage = document.getElementById('unlock-message');
    this.trackGrid = document.getElementById('track-grid');
    this.pauseBtn = document.getElementById('pause-btn');

    this.positionFlashTimer = 0;
    this.lastPosition = 4;

    this._loadUnlocked();
  }

  // ── Save / Load ──────────────────────────────────────────────────────────
  _loadUnlocked() {
    try {
      const saved = localStorage.getItem(SAVE_KEY);
      this.unlockedCount = saved ? parseInt(saved, 10) : 1;
    } catch {
      this.unlockedCount = 1;
    }
    if (this.unlockedCount < 1) this.unlockedCount = 1;
  }

  _saveUnlocked() {
    try {
      localStorage.setItem(SAVE_KEY, String(this.unlockedCount));
    } catch { /* ignore */ }
  }

  unlockNext() {
    if (this.unlockedCount < TRACKS.length) {
      this.unlockedCount++;
      this._saveUnlocked();
      return this.unlockedCount - 1; // index of newly unlocked track
    }
    return -1;
  }

  // ── Track Select ─────────────────────────────────────────────────────────
  _buildTrackGrid() {
    // Clear existing children safely
    while (this.trackGrid.firstChild) {
      this.trackGrid.removeChild(this.trackGrid.firstChild);
    }

    for (let i = 0; i < TRACKS.length; i++) {
      const card = document.createElement('button');
      card.className = 'track-card';
      card.dataset.index = String(i);

      const locked = i >= this.unlockedCount;
      if (locked) card.classList.add('locked');

      // Track preview canvas
      const preview = document.createElement('canvas');
      preview.className = 'track-preview';
      preview.width = 160;
      preview.height = 120;
      card.appendChild(preview);

      const name = document.createElement('div');
      name.className = 'track-card-name';
      name.textContent = locked ? '???' : TRACKS[i].name;
      card.appendChild(name);

      if (locked) {
        const lock = document.createElement('div');
        lock.className = 'track-lock';
        lock.textContent = '🔒';
        card.appendChild(lock);
      }

      this.trackGrid.appendChild(card);
    }
  }

  showTrackSelect(onSelect) {
    this._buildTrackGrid(); // Refresh locked state
    this.hideAll();
    this.trackSelectScreen.classList.remove('hidden');

    // Draw track previews
    for (let i = 0; i < TRACKS.length; i++) {
      if (i >= this.unlockedCount) continue;
      const canvas = this.trackGrid.children[i].querySelector('.track-preview');
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, 160, 120);
      this._drawTrackPreview(ctx, i);
    }

    // Click handlers
    const handler = (e) => {
      const card = e.target.closest('.track-card');
      if (!card) return;
      const idx = parseInt(card.dataset.index, 10);
      if (idx >= this.unlockedCount) return; // locked
      this.trackGrid.removeEventListener('click', handler);
      onSelect(idx);
    };
    this.trackGrid.addEventListener('click', handler);
  }

  _drawTrackPreview(ctx, trackIdx) {
    const def = TRACKS[trackIdx];
    const pts = def.points;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of pts) {
      minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
    }
    const margin = 20;
    const scaleX = (160 - margin * 2) / (maxX - minX || 1);
    const scaleY = (120 - margin * 2) / (maxY - minY || 1);
    const scale = Math.min(scaleX, scaleY);
    const cx = 80 - ((minX + maxX) / 2) * scale;
    const cy = 60 - ((minY + maxY) / 2) * scale;

    ctx.beginPath();
    ctx.moveTo(pts[0].x * scale + cx, pts[0].y * scale + cy);
    for (let i = 1; i <= pts.length; i++) {
      const p = pts[i % pts.length];
      ctx.lineTo(p.x * scale + cx, p.y * scale + cy);
    }
    ctx.closePath();
    ctx.strokeStyle = def.color || '#39ff14';
    ctx.lineWidth = 2;
    ctx.shadowColor = def.color || '#39ff14';
    ctx.shadowBlur = 4;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // ── Countdown ────────────────────────────────────────────────────────────
  showCountdown(onGo) {
    this.hideAll();
    this.raceHud.classList.remove('hidden');
    this.countdownOverlay.classList.remove('hidden');
    this.updatePosition(4);
    this.updateLap(1, TOTAL_LAPS);

    let count = 3;
    this.countdownText.textContent = String(count);
    this.countdownText.style.transform = 'scale(1.5)';
    this.countdownText.style.opacity = '1';

    const tick = () => {
      count--;
      if (count > 0) {
        this.countdownText.textContent = String(count);
        this.countdownText.style.transform = 'scale(1.5)';
        setTimeout(() => {
          this.countdownText.style.transform = 'scale(1)';
        }, 50);
        setTimeout(tick, 800);
      } else {
        this.countdownText.textContent = 'GO!';
        this.countdownText.style.color = '#39ff14';
        this.countdownText.style.transform = 'scale(2)';
        setTimeout(() => {
          this.countdownOverlay.classList.add('hidden');
          this.countdownText.style.color = '';
          onGo();
        }, 500);
      }
    };
    setTimeout(tick, 800);
  }

  // ── Race HUD ─────────────────────────────────────────────────────────────
  updatePosition(pos) {
    const suffixes = ['', '1st', '2nd', '3rd', '4th'];
    this.positionDisplay.textContent = suffixes[pos] || `${pos}th`;

    // Flash effect on position change (improvement)
    if (pos < this.lastPosition) {
      this.positionDisplay.classList.add('position-up');
      setTimeout(() => this.positionDisplay.classList.remove('position-up'), 500);
    }
    this.lastPosition = pos;
  }

  updateLap(lap, total) {
    this.lapDisplay.textContent = `LAP ${Math.min(lap, total)}/${total}`;
  }

  // ── Pause ────────────────────────────────────────────────────────────────
  showPause() {
    this.pauseScreen.classList.remove('hidden');
  }

  hidePause() {
    this.pauseScreen.classList.add('hidden');
  }

  // ── Results ──────────────────────────────────────────────────────────────
  showResults(position, trackIdx, onReplay, onNext, onMenu) {
    this.hideAll();
    this.resultsScreen.classList.remove('hidden');

    const suffixes = ['', '1st', '2nd', '3rd', '4th'];
    this.resultsPosition.textContent = suffixes[position] || `${position}th`;

    if (position === 1) {
      this.resultsPosition.style.color = '#ffe600';
      this.resultsMessage.textContent = 'YOU WIN!';
    } else if (position <= 3) {
      this.resultsPosition.style.color = '#39ff14';
      this.resultsMessage.textContent = 'NICE RACE!';
    } else {
      this.resultsPosition.style.color = '#ff5555';
      this.resultsMessage.textContent = 'TRY AGAIN!';
    }

    // Unlock next track?
    const unlockIdx = (position <= 3) ? this.unlockNext() : -1;
    if (unlockIdx >= 0) {
      this.unlockMessage.textContent = `🔓 ${TRACKS[unlockIdx].name} UNLOCKED!`;
      this.unlockMessage.classList.remove('hidden');
    } else {
      this.unlockMessage.classList.add('hidden');
    }

    // Show/hide "Next Track" button
    const nextBtn = document.getElementById('results-next-btn');
    if (unlockIdx >= 0 || trackIdx + 1 < this.unlockedCount) {
      nextBtn.classList.remove('hidden');
    } else {
      nextBtn.classList.add('hidden');
    }

    // Button handlers (one-time)
    const replayBtn = document.getElementById('results-replay-btn');
    const menuBtn = document.getElementById('results-menu-btn');

    const cleanup = () => {
      replayBtn.removeEventListener('click', onReplayWrap);
      nextBtn.removeEventListener('click', onNextWrap);
      menuBtn.removeEventListener('click', onMenuWrap);
    };
    const onReplayWrap = () => { cleanup(); onReplay(); };
    const onNextWrap = () => { cleanup(); onNext(); };
    const onMenuWrap = () => { cleanup(); onMenu(); };

    replayBtn.addEventListener('click', onReplayWrap);
    nextBtn.addEventListener('click', onNextWrap);
    menuBtn.addEventListener('click', onMenuWrap);
  }

  // ── Utilities ────────────────────────────────────────────────────────────
  hideAll() {
    this.trackSelectScreen.classList.add('hidden');
    this.countdownOverlay.classList.add('hidden');
    this.raceHud.classList.add('hidden');
    this.pauseScreen.classList.add('hidden');
    this.resultsScreen.classList.add('hidden');
  }
}

export { TOTAL_LAPS };
