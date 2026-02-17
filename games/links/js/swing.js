// 3-click swing meter mechanic
// Phase 1: Power bar fills up and down — click to set power
// Phase 2: Accuracy needle swings — click to set accuracy
// Phase 3: Results computed

export const SWING_PHASE = {
  IDLE: 'idle',
  POWER: 'power',
  ACCURACY: 'accuracy',
  DONE: 'done',
};

export class SwingMeter {
  constructor() {
    this.phase = SWING_PHASE.IDLE;
    this.power = 0;           // 0-1
    this.accuracy = 0.5;      // 0-1 (0.5 = perfect center)
    this.powerDir = 1;        // direction of power bar
    this.powerSpeed = 0.7;    // oscillations per second (slow for kids)
    this.accuracyPos = 0;     // -1 to 1 oscillating
    this.accuracySpeed = 0.9; // slower accuracy for kids
    this.accuracyDir = 1;
    this.time = 0;
    this.isPutting = false;
    this.onComplete = null;
  }

  start(isPutting = false) {
    this.phase = SWING_PHASE.POWER;
    this.power = 0;
    this.accuracy = 0.5;
    this.powerDir = 1;
    this.accuracyPos = -1;
    this.accuracyDir = 1;
    this.time = 0;
    this.isPutting = isPutting;

    if (isPutting) {
      this.powerSpeed = 0.5;
      this.accuracySpeed = 0.7;
    } else {
      this.powerSpeed = 0.7;
      this.accuracySpeed = 0.9;
    }
  }

  click() {
    if (this.phase === SWING_PHASE.POWER) {
      // Lock in power
      this.phase = SWING_PHASE.ACCURACY;
      this.accuracyPos = -1;
      this.accuracyDir = 1;
      return 'accuracy';
    } else if (this.phase === SWING_PHASE.ACCURACY) {
      // Lock in accuracy (map -1..1 to 0..1)
      this.accuracy = (this.accuracyPos + 1) / 2;
      this.phase = SWING_PHASE.DONE;
      if (this.onComplete) {
        this.onComplete(this.power, this.accuracy);
      }
      return 'done';
    }
    return null;
  }

  update(dt) {
    this.time += dt;

    if (this.phase === SWING_PHASE.POWER) {
      this.power += this.powerDir * this.powerSpeed * dt;
      if (this.power >= 1) {
        this.power = 1;
        this.powerDir = -1;
      } else if (this.power <= 0) {
        this.power = 0;
        this.powerDir = 1;
      }
    } else if (this.phase === SWING_PHASE.ACCURACY) {
      this.accuracyPos += this.accuracyDir * this.accuracySpeed * dt * 2;
      if (this.accuracyPos >= 1) {
        this.accuracyPos = 1;
        this.accuracyDir = -1;
      } else if (this.accuracyPos <= -1) {
        this.accuracyPos = -1;
        this.accuracyDir = 1;
      }
    }
  }

  reset() {
    this.phase = SWING_PHASE.IDLE;
    this.power = 0;
    this.accuracy = 0.5;
    this.time = 0;
  }

  // Get accuracy description
  getAccuracyLabel() {
    const dev = Math.abs(this.accuracy - 0.5);
    if (dev < 0.15) return 'Perfect!';
    if (dev < 0.25) return 'Great';
    if (dev < 0.35) return 'Good';
    if (dev < 0.45) return 'Okay';
    if (this.accuracy < 0.5) return 'Hook';
    return 'Slice';
  }

  getPowerPercent() {
    return Math.round(this.power * 100);
  }
}
