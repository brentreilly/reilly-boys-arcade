// UI overlay: HUD, swing meter, club selector, scorecard, wind indicator
// All rendered as HTML overlaid on the Three.js canvas

import { CLUBS, SURFACES } from './clubs.js';
import { HOLES, COURSE_PAR } from './course.js';
import { SWING_PHASE } from './swing.js';

const YARDS_TO_METERS = 0.9144;
const METERS_TO_YARDS = 1 / YARDS_TO_METERS;

export class GameUI {
  constructor() {
    this.container = document.getElementById('ui-overlay');
    this.buildUI();
  }

  buildUI() {
    // All content below is static HTML - no user input is interpolated
    this.container.innerHTML = `
      <div id="hud-top">
        <div id="hole-info">
          <div id="hole-number">HOLE 1</div>
          <div id="hole-details">Par 4 &middot; 380 yds</div>
          <div id="hole-name">The Opening Drive</div>
        </div>
        <div id="wind-indicator">
          <div id="wind-label">WIND</div>
          <div id="wind-arrow">&#8593;</div>
          <div id="wind-speed">2 mph</div>
        </div>
        <div id="shot-info">
          <div id="stroke-count">Stroke: 1</div>
          <div id="distance-to-pin">380 yds to pin</div>
          <div id="lie-info">Tee Box</div>
        </div>
      </div>

      <div id="club-selector">
        <div id="club-label">CLUB</div>
        <button id="club-prev" class="club-btn">&larr;</button>
        <div id="club-name">Driver</div>
        <button id="club-next" class="club-btn">&rarr;</button>
        <div id="club-distance">260 yds</div>
      </div>

      <div id="swing-meter" class="hidden">
        <div id="swing-meter-bg">
          <div id="swing-power-fill"></div>
          <div id="swing-accuracy-marker"></div>
          <div id="swing-sweetspot"></div>
        </div>
        <div id="swing-label">Press SPACE to swing</div>
      </div>

      <div id="aim-controls">
        <div class="aim-hint">&#8592; A/D &#8594; to aim &middot; SPACE to swing</div>
      </div>

      <div id="shot-result" class="hidden">
        <div id="result-distance"></div>
        <div id="result-quality"></div>
      </div>

      <div id="scorecard" class="hidden">
        <div id="scorecard-title">SCORECARD</div>
        <table id="scorecard-table">
          <thead>
            <tr id="scorecard-holes-row"></tr>
            <tr id="scorecard-par-row"></tr>
            <tr id="scorecard-score-row"></tr>
          </thead>
        </table>
        <div id="scorecard-total"></div>
        <div id="scorecard-continue">Press SPACE to continue</div>
      </div>

      <div id="message-overlay" class="hidden">
        <div id="message-text"></div>
        <div id="message-sub"></div>
      </div>

      <div id="game-start" class="hidden">
        <div id="start-title">LINKS</div>
        <div id="start-subtitle">A Golf Simulator</div>
        <div id="start-prompt">Press SPACE to tee off</div>
        <div id="start-controls">
          <p><b>A / D</b> &mdash; Aim left / right</p>
          <p><b>Q / E</b> &mdash; Change club</p>
          <p><b>SPACE</b> &mdash; Swing (3-click: power, then accuracy)</p>
        </div>
      </div>

      <div id="game-complete" class="hidden">
        <div id="complete-title">ROUND COMPLETE</div>
        <div id="complete-score"></div>
        <div id="complete-detail"></div>
        <div id="complete-prompt">Press SPACE to play again</div>
      </div>
    `;

    this.buildScorecard();
  }

  buildScorecard() {
    const holesRow = document.getElementById('scorecard-holes-row');
    const parRow = document.getElementById('scorecard-par-row');
    const scoreRow = document.getElementById('scorecard-score-row');

    // Clear and rebuild with safe DOM methods
    while (holesRow.firstChild) holesRow.removeChild(holesRow.firstChild);
    while (parRow.firstChild) parRow.removeChild(parRow.firstChild);
    while (scoreRow.firstChild) scoreRow.removeChild(scoreRow.firstChild);

    const addCell = (row, text, tag = 'td', cls = '') => {
      const cell = document.createElement(tag);
      cell.textContent = text;
      if (cls) cell.className = cls;
      row.appendChild(cell);
      return cell;
    };

    addCell(holesRow, 'Hole', 'th');
    addCell(parRow, 'Par', 'th');
    addCell(scoreRow, 'Score', 'th');

    for (const hole of HOLES) {
      addCell(holesRow, hole.number);
      addCell(parRow, hole.par);
      const sc = addCell(scoreRow, '-');
      sc.id = `score-hole-${hole.number}`;
    }

    addCell(holesRow, 'TOT', 'td', 'total');
    addCell(parRow, COURSE_PAR, 'td', 'total');
    const tot = addCell(scoreRow, '-', 'td', 'total');
    tot.id = 'score-total';
  }

  updateHoleInfo(hole) {
    document.getElementById('hole-number').textContent = `HOLE ${hole.number}`;
    document.getElementById('hole-details').textContent = `Par ${hole.par} \u00B7 ${hole.distance} yds`;
    document.getElementById('hole-name').textContent = hole.name;
  }

  updateWind(speed, directionDeg) {
    document.getElementById('wind-speed').textContent = `${speed.toFixed(0)} mph`;
    const arrow = document.getElementById('wind-arrow');
    arrow.style.transform = `rotate(${directionDeg}deg)`;
  }

  updateShotInfo(stroke, distanceToPin, surface) {
    document.getElementById('stroke-count').textContent = `Stroke: ${stroke}`;
    document.getElementById('distance-to-pin').textContent = `${Math.round(distanceToPin)} yds to pin`;
    const surfData = SURFACES[surface];
    document.getElementById('lie-info').textContent = surfData ? surfData.name : 'Rough';
  }

  updateClub(club) {
    document.getElementById('club-name').textContent = club.name;
    document.getElementById('club-distance').textContent =
      club.category === 'putter' ? 'Putting' : `${club.maxDistance} yds`;
  }

  showSwingMeter(phase, power, accuracyPos) {
    const meter = document.getElementById('swing-meter');
    meter.classList.remove('hidden');

    const fill = document.getElementById('swing-power-fill');
    const marker = document.getElementById('swing-accuracy-marker');
    const sweetspot = document.getElementById('swing-sweetspot');
    const label = document.getElementById('swing-label');

    if (phase === SWING_PHASE.POWER) {
      fill.style.width = `${power * 100}%`;
      fill.style.background = power > 0.9 ? '#ff4444' : power > 0.7 ? '#ffaa00' : '#44cc44';
      marker.classList.add('hidden');
      sweetspot.classList.add('hidden');
      label.textContent = `Power: ${Math.round(power * 100)}% \u2014 Press SPACE`;
    } else if (phase === SWING_PHASE.ACCURACY) {
      fill.style.width = `${power * 100}%`;
      marker.classList.remove('hidden');
      sweetspot.classList.remove('hidden');
      const markerPos = (accuracyPos + 1) / 2 * 100;
      marker.style.left = `${markerPos}%`;
      label.textContent = 'Accuracy \u2014 Press SPACE at center!';
    }
  }

  hideSwingMeter() {
    document.getElementById('swing-meter').classList.add('hidden');
  }

  showShotResult(distance, quality) {
    const el = document.getElementById('shot-result');
    el.classList.remove('hidden');
    document.getElementById('result-distance').textContent = `${Math.round(distance)} yards`;
    document.getElementById('result-quality').textContent = quality;
    setTimeout(() => el.classList.add('hidden'), 2500);
  }

  showMessage(text, sub, duration = 2000) {
    const el = document.getElementById('message-overlay');
    el.classList.remove('hidden');
    document.getElementById('message-text').textContent = text;
    document.getElementById('message-sub').textContent = sub || '';
    if (duration > 0) {
      setTimeout(() => el.classList.add('hidden'), duration);
    }
    return el;
  }

  hideMessage() {
    document.getElementById('message-overlay').classList.add('hidden');
  }

  showAimControls(show) {
    document.getElementById('aim-controls').style.display = show ? 'block' : 'none';
  }

  showClubSelector(show) {
    document.getElementById('club-selector').style.display = show ? 'flex' : 'none';
  }

  updateScore(holeNumber, strokes) {
    const cell = document.getElementById(`score-hole-${holeNumber}`);
    if (cell) cell.textContent = strokes;
  }

  showScorecard(scores, totalStrokes) {
    const el = document.getElementById('scorecard');
    el.classList.remove('hidden');

    for (let i = 0; i < scores.length; i++) {
      this.updateScore(i + 1, scores[i]);
    }

    // Calculate par for only the holes played
    const parPlayed = HOLES.slice(0, scores.length).reduce((sum, h) => sum + h.par, 0);
    const diff = totalStrokes - parPlayed;
    let label = `Total: ${totalStrokes}`;
    if (diff > 0) label += ` (+${diff})`;
    else if (diff < 0) label += ` (${diff})`;
    else label += ' (E)';

    document.getElementById('score-total').textContent = totalStrokes;
    document.getElementById('scorecard-total').textContent = label;
  }

  hideScorecard() {
    document.getElementById('scorecard').classList.add('hidden');
  }

  showGameStart() {
    document.getElementById('game-start').classList.remove('hidden');
  }

  hideGameStart() {
    document.getElementById('game-start').classList.add('hidden');
  }

  showGameComplete(totalStrokes, scores) {
    const el = document.getElementById('game-complete');
    el.classList.remove('hidden');

    const diff = totalStrokes - COURSE_PAR;
    let scoreText;
    if (diff === 0) scoreText = `Even Par (${totalStrokes})`;
    else if (diff > 0) scoreText = `+${diff} (${totalStrokes})`;
    else scoreText = `${diff} (${totalStrokes})`;

    document.getElementById('complete-score').textContent = scoreText;

    let comment;
    if (diff <= -5) comment = 'Incredible round! Are you a pro?';
    else if (diff <= -2) comment = 'Excellent golf! Under par!';
    else if (diff <= 0) comment = 'Solid round. Right around par.';
    else if (diff <= 3) comment = 'Not bad! A few strokes to shave.';
    else if (diff <= 8) comment = 'Keep practicing, you\'ll get there!';
    else comment = 'Tough day on the course. Try again!';

    document.getElementById('complete-detail').textContent = comment;
  }

  hideGameComplete() {
    document.getElementById('game-complete').classList.add('hidden');
  }

  getScoreName(strokes, par) {
    const diff = strokes - par;
    if (strokes === 1) return 'Hole in One!';
    if (diff === -3) return 'Albatross!';
    if (diff === -2) return 'Eagle!';
    if (diff === -1) return 'Birdie!';
    if (diff === 0) return 'Par';
    if (diff === 1) return 'Bogey';
    if (diff === 2) return 'Double Bogey';
    if (diff === 3) return 'Triple Bogey';
    return `+${diff}`;
  }
}
