// Dogfight — Touch Controls
// Virtual joystick (right) + fire button (left) with multi-touch support

export class Controls {
  constructor() {
    // Joystick state
    this.dir = { x: 0, y: 0 };   // normalized direction (-1..1)
    this.firing = false;

    // Joystick geometry
    this.joyRadius = 70;  // half of 140px base
    this.deadZone = 0.15; // ignore tiny movements

    // DOM refs
    this.joystickZone = document.getElementById('joystick-zone');
    this.joystickBase = document.getElementById('joystick-base');
    this.joystickKnob = document.getElementById('joystick-knob');
    this.fireBtn = document.getElementById('fire-btn');

    // Track active touches by identifier
    this.joyTouchId = null;
    this.fireTouchId = null;

    // Joystick center (computed on first touch)
    this.joyCenter = { x: 0, y: 0 };

    this.setupTouch();
    this.setupKeyboard();
  }

  setupTouch() {
    // Prevent default on the whole document to avoid scrolling/zooming
    document.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });

    // --- Fire button ---
    this.fireBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (this.fireTouchId === null) {
        this.fireTouchId = e.changedTouches[0].identifier;
        this.firing = true;
        this.fireBtn.classList.add('active');
      }
    });

    this.fireBtn.addEventListener('touchend', (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === this.fireTouchId) {
          this.fireTouchId = null;
          this.firing = false;
          this.fireBtn.classList.remove('active');
        }
      }
    });

    this.fireBtn.addEventListener('touchcancel', (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === this.fireTouchId) {
          this.fireTouchId = null;
          this.firing = false;
          this.fireBtn.classList.remove('active');
        }
      }
    });

    // --- Joystick ---
    this.joystickZone.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (this.joyTouchId === null) {
        const touch = e.changedTouches[0];
        this.joyTouchId = touch.identifier;

        // Center = center of the base
        const rect = this.joystickBase.getBoundingClientRect();
        this.joyCenter.x = rect.left + rect.width / 2;
        this.joyCenter.y = rect.top + rect.height / 2;

        this.updateJoystick(touch.clientX, touch.clientY);
        this.joystickKnob.classList.add('active');
      }
    });

    this.joystickZone.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (const touch of e.changedTouches) {
        if (touch.identifier === this.joyTouchId) {
          this.updateJoystick(touch.clientX, touch.clientY);
        }
      }
    });

    const joystickEnd = (e) => {
      for (const touch of e.changedTouches) {
        if (touch.identifier === this.joyTouchId) {
          this.joyTouchId = null;
          this.dir.x = 0;
          this.dir.y = 0;
          // Reset knob to center
          this.joystickKnob.style.transform = 'translate(-50%, -50%)';
          this.joystickKnob.classList.remove('active');
        }
      }
    };

    this.joystickZone.addEventListener('touchend', joystickEnd);
    this.joystickZone.addEventListener('touchcancel', joystickEnd);
  }

  updateJoystick(touchX, touchY) {
    let dx = touchX - this.joyCenter.x;
    let dy = touchY - this.joyCenter.y;

    // Clamp to radius
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxDist = this.joyRadius;

    if (dist > maxDist) {
      dx = (dx / dist) * maxDist;
      dy = (dy / dist) * maxDist;
    }

    // Normalize to -1..1
    const nx = dx / maxDist;
    const ny = dy / maxDist;

    // Apply dead zone
    const mag = Math.sqrt(nx * nx + ny * ny);
    if (mag < this.deadZone) {
      this.dir.x = 0;
      this.dir.y = 0;
    } else {
      this.dir.x = nx;
      this.dir.y = ny;
    }

    // Move knob visual
    this.joystickKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  }

  setupKeyboard() {
    // WASD + Space for dev/testing
    this.keys = {};

    window.addEventListener('keydown', (e) => {
      this.keys[e.key.toLowerCase()] = true;
      if (e.key === ' ') this.firing = true;
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
      if (e.key === ' ') this.firing = false;
    });
  }

  update() {
    // Merge keyboard into direction (for dev)
    if (this.keys) {
      let kx = 0, ky = 0;
      if (this.keys['a'] || this.keys['arrowleft'])  kx -= 1;
      if (this.keys['d'] || this.keys['arrowright']) kx += 1;
      if (this.keys['w'] || this.keys['arrowup'])    ky -= 1;
      if (this.keys['s'] || this.keys['arrowdown'])  ky += 1;

      // Only override if no touch active
      if (this.joyTouchId === null) {
        if (kx !== 0 || ky !== 0) {
          const mag = Math.sqrt(kx * kx + ky * ky);
          this.dir.x = kx / mag;
          this.dir.y = ky / mag;
        } else {
          this.dir.x = 0;
          this.dir.y = 0;
        }
      }
    }
  }

  reset() {
    this.dir.x = 0;
    this.dir.y = 0;
    this.firing = false;
    this.joyTouchId = null;
    this.fireTouchId = null;
    this.joystickKnob.style.transform = 'translate(-50%, -50%)';
    this.joystickKnob.classList.remove('active');
    this.fireBtn.classList.remove('active');
  }
}
