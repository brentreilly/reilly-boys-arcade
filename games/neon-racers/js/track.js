// Track data, geometry, rendering, and collision detection
// Tracks defined as arrays of center-line waypoints; Catmull-Rom splines smooth them.

// ── Catmull-Rom interpolation ──────────────────────────────────────────────
function catmullRom(p0, p1, p2, p3, t) {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (
    (2 * p1) +
    (-p0 + p2) * t +
    (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
    (-p0 + 3 * p1 - 3 * p2 + p3) * t3
  );
}

// ── Track definitions ──────────────────────────────────────────────────────
const TRACKS = [
  {
    name: 'Neon Oval',
    width: 200,
    boostPads: [0.12, 0.62],          // positions along track (0–1)
    aiSpeed: 0.85,
    color: '#39ff14',
    points: (() => {
      const pts = [];
      const a = 900, b = 550;
      for (let i = 0; i < 8; i++) {
        const θ = (i / 8) * Math.PI * 2;
        pts.push({ x: a * Math.cos(θ), y: b * Math.sin(θ) });
      }
      return pts;
    })(),
  },
  {
    name: 'Pixel Circuit',
    width: 180,
    boostPads: [0.05, 0.50],
    aiSpeed: 0.88,
    color: '#00fff5',
    points: [
      { x: 100, y: -40 },
      { x: 500, y: -380 },
      { x: 850, y: -150 },
      { x: 850, y: 150 },
      { x: 500, y: 380 },
      { x: -100, y: 40 },
      { x: -500, y: 380 },
      { x: -850, y: 150 },
      { x: -850, y: -150 },
      { x: -500, y: -380 },
    ],
  },
  {
    name: 'Cyber Loop',
    width: 160,
    boostPads: [0.35, 0.80],
    aiSpeed: 0.91,
    color: '#ff00ff',
    points: [
      { x: 0, y: -600 },
      { x: 500, y: -550 },
      { x: 800, y: -250 },
      { x: 750, y: 100 },
      { x: 400, y: 300 },
      // hairpin
      { x: 200, y: 500 },
      { x: -100, y: 550 },
      { x: -300, y: 400 },
      // back up
      { x: -500, y: 100 },
      { x: -700, y: -200 },
      { x: -600, y: -500 },
      { x: -300, y: -620 },
    ],
  },
  {
    name: 'Laser Lane',
    width: 130,
    boostPads: [0.15, 0.40, 0.70],
    aiSpeed: 0.94,
    color: '#ffe600',
    points: [
      { x: 0, y: -650 },
      { x: 350, y: -600 },
      { x: 650, y: -400 },
      { x: 800, y: -100 },
      { x: 700, y: 200 },
      { x: 400, y: 400 },
      { x: 100, y: 500 },
      { x: -200, y: 600 },
      { x: -550, y: 450 },
      { x: -750, y: 200 },
      { x: -800, y: -100 },
      { x: -650, y: -350 },
      { x: -350, y: -550 },
    ],
  },
  {
    name: 'Warp Ring',
    width: 140,
    boostPads: [0.10, 0.35, 0.60, 0.85],
    aiSpeed: 0.97,
    color: '#ff5500',
    points: [
      { x: 0, y: -700 },
      { x: 300, y: -680 },
      { x: 600, y: -500 },
      { x: 800, y: -250 },
      { x: 750, y: 50 },
      { x: 500, y: 250 },
      { x: 200, y: 150 },
      { x: -50, y: 350 },
      { x: -300, y: 550 },
      { x: -600, y: 500 },
      { x: -800, y: 300 },
      { x: -850, y: 0 },
      { x: -750, y: -250 },
      { x: -500, y: -450 },
      { x: -250, y: -600 },
    ],
  },
];

// ── Samples per waypoint segment ───────────────────────────────────────────
const SAMPLES_PER_SEG = 24;

export class TrackSystem {
  constructor(trackIndex) {
    const def = TRACKS[trackIndex];
    this.name = def.name;
    this.trackWidth = def.width;
    this.aiSpeed = def.aiSpeed;
    this.color = def.color;
    this.boostPadPositions = def.boostPads;  // 0-1 track positions
    this.waypoints = def.points;
    this.samples = [];
    this.totalLength = 0;
    this.boostPads = [];
    this._buildSamples();
    this._buildBoostPads();
  }

  // Pre-compute dense sample array from spline
  _buildSamples() {
    const pts = this.waypoints;
    const n = pts.length;
    const samples = [];
    let cumDist = 0;

    for (let seg = 0; seg < n; seg++) {
      const p0 = pts[(seg - 1 + n) % n];
      const p1 = pts[seg];
      const p2 = pts[(seg + 1) % n];
      const p3 = pts[(seg + 2) % n];

      for (let s = 0; s < SAMPLES_PER_SEG; s++) {
        const t = s / SAMPLES_PER_SEG;
        const x = catmullRom(p0.x, p1.x, p2.x, p3.x, t);
        const y = catmullRom(p0.y, p1.y, p2.y, p3.y, t);
        samples.push({ x, y, dist: cumDist });

        // Distance to next sample for cumulative distance
        if (samples.length > 1) {
          const prev = samples[samples.length - 2];
          cumDist += Math.hypot(x - prev.x, y - prev.y);
          samples[samples.length - 1].dist = cumDist;
        }
      }
    }

    this.totalLength = cumDist;
    // Add distance for closing segment (last sample back to first)
    const first = samples[0];
    const last = samples[samples.length - 1];
    this.totalLength += Math.hypot(first.x - last.x, first.y - last.y);

    // Compute normals and edge points for each sample
    const count = samples.length;
    for (let i = 0; i < count; i++) {
      const curr = samples[i];
      const next = samples[(i + 1) % count];
      // Tangent direction
      const dx = next.x - curr.x;
      const dy = next.y - curr.y;
      const len = Math.hypot(dx, dy) || 1;
      // Normal (perpendicular to tangent, pointing right of travel direction)
      curr.nx = -dy / len;
      curr.ny = dx / len;
      // Edge points
      const hw = this.trackWidth / 2;
      curr.leftX = curr.x + curr.nx * hw;
      curr.leftY = curr.y + curr.ny * hw;
      curr.rightX = curr.x - curr.nx * hw;
      curr.rightY = curr.y - curr.ny * hw;
      // Normalized progress (0–1)
      curr.progress = curr.dist / this.totalLength;
    }

    this.samples = samples;
  }

  _buildBoostPads() {
    const count = this.samples.length;
    const boostLen = 60; // length of boost pad in samples
    for (const pos of this.boostPadPositions) {
      const idx = Math.floor(pos * count) % count;
      this.boostPads.push({
        startIdx: idx,
        endIdx: (idx + boostLen) % count,
        progress: pos,
      });
    }
  }

  // Get sample index closest to a world position. `hint` is the last known index for fast search.
  getClosestSample(x, y, hint = 0) {
    const samples = this.samples;
    const n = samples.length;
    let bestIdx = hint;
    let bestDist = Infinity;

    // Search ±60 samples around the hint for speed
    const range = 60;
    for (let offset = -range; offset <= range; offset++) {
      const idx = ((hint + offset) % n + n) % n;
      const s = samples[idx];
      const d = (s.x - x) * (s.x - x) + (s.y - y) * (s.y - y);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = idx;
      }
    }

    return { index: bestIdx, distSq: bestDist };
  }

  // Get signed distance from track center. Positive = right of center, negative = left.
  getTrackInfo(x, y, hint = 0) {
    const { index, distSq } = this.getClosestSample(x, y, hint);
    const s = this.samples[index];
    const dist = Math.sqrt(distSq);

    // Determine which side of center line
    const toPointX = x - s.x;
    const toPointY = y - s.y;
    const side = toPointX * s.nx + toPointY * s.ny; // dot with normal

    return {
      index,
      dist,
      side,                         // signed distance from center along normal
      onTrack: dist < this.trackWidth / 2,
      progress: s.progress,
      sample: s,
    };
  }

  // Check if position overlaps any boost pad
  isOnBoostPad(sampleIndex) {
    const n = this.samples.length;
    for (const bp of this.boostPads) {
      // Handle wraparound
      if (bp.startIdx < bp.endIdx) {
        if (sampleIndex >= bp.startIdx && sampleIndex <= bp.endIdx) return true;
      } else {
        if (sampleIndex >= bp.startIdx || sampleIndex <= bp.endIdx) return true;
      }
    }
    return false;
  }

  // Get start positions for karts (staggered behind start line)
  getStartPositions(count) {
    const positions = [];
    const s0 = this.samples[0];
    const s1 = this.samples[1];
    // Direction of travel at start
    const dx = s1.x - s0.x;
    const dy = s1.y - s0.y;
    const len = Math.hypot(dx, dy) || 1;
    const dirX = dx / len;
    const dirY = dy / len;
    const angle = Math.atan2(dy, dx);

    for (let i = 0; i < count; i++) {
      // Stagger backwards along track, offset to side
      const row = Math.floor(i / 2);
      const col = i % 2;
      const behindDist = 50 + row * 60;
      const sideDist = (col === 0 ? -1 : 1) * 30;
      positions.push({
        x: s0.x - dirX * behindDist + s0.nx * sideDist,
        y: s0.y - dirY * behindDist + s0.ny * sideDist,
        angle,
      });
    }
    return positions;
  }

  // ── Rendering ────────────────────────────────────────────────────────────
  // Rendering constants
  static CURB_W = 10;    // curb strip width
  static GRASS_W = 40;   // grass width beyond curbs
  static CURB_SEG = 6;   // samples per curb color segment

  render(ctx) {
    this._renderGrass(ctx);
    this._renderSurface(ctx);
    this._renderCurbs(ctx);
    this._renderCenterLine(ctx);
    this._renderBoostPads(ctx);
    this._renderStartLine(ctx);
    this._renderNeonGlow(ctx);
  }

  // Green grass fringe around the track
  _renderGrass(ctx) {
    const samples = this.samples;
    const n = samples.length;
    const expand = TrackSystem.CURB_W + TrackSystem.GRASS_W;

    ctx.beginPath();
    // Right outer edge of grass
    ctx.moveTo(
      samples[0].rightX - samples[0].nx * expand,
      samples[0].rightY - samples[0].ny * expand,
    );
    for (let i = 1; i <= n; i++) {
      const s = samples[i % n];
      ctx.lineTo(s.rightX - s.nx * expand, s.rightY - s.ny * expand);
    }
    // Left outer edge of grass (backwards to close the ring)
    for (let i = n; i >= 0; i--) {
      const s = samples[((i % n) + n) % n];
      ctx.lineTo(s.leftX + s.nx * expand, s.leftY + s.ny * expand);
    }
    ctx.closePath();
    ctx.fillStyle = '#1a3a1a';
    ctx.fill();
  }

  // Dark asphalt track surface
  _renderSurface(ctx) {
    const samples = this.samples;
    const n = samples.length;
    ctx.beginPath();
    ctx.moveTo(samples[0].rightX, samples[0].rightY);
    for (let i = 1; i <= n; i++) {
      const s = samples[i % n];
      ctx.lineTo(s.rightX, s.rightY);
    }
    for (let i = n - 1; i >= 0; i--) {
      ctx.lineTo(samples[i].leftX, samples[i].leftY);
    }
    ctx.closePath();
    ctx.fillStyle = '#222';
    ctx.fill();

    // Subtle asphalt grain (sparse dots for texture, not every sample)
    ctx.fillStyle = 'rgba(255,255,255,0.02)';
    for (let i = 0; i < n; i += 3) {
      const s = samples[i];
      ctx.fillRect(s.x - 1, s.y - 1, 2, 2);
    }
  }

  // Red/white curb strips along both edges
  _renderCurbs(ctx) {
    const samples = this.samples;
    const n = samples.length;
    const cW = TrackSystem.CURB_W;
    const seg = TrackSystem.CURB_SEG;

    // Batch all red segments, then all white segments (2 fill calls total)
    for (const isRed of [true, false]) {
      ctx.beginPath();
      for (let i = 0; i < n; i += seg) {
        if ((Math.floor(i / seg) % 2 === 0) !== isRed) continue;

        const s1 = samples[i];
        const s2 = samples[(i + seg) % n];

        // Left curb
        ctx.moveTo(s1.leftX, s1.leftY);
        ctx.lineTo(s2.leftX, s2.leftY);
        ctx.lineTo(s2.leftX + s2.nx * cW, s2.leftY + s2.ny * cW);
        ctx.lineTo(s1.leftX + s1.nx * cW, s1.leftY + s1.ny * cW);

        // Right curb
        ctx.moveTo(s1.rightX, s1.rightY);
        ctx.lineTo(s2.rightX, s2.rightY);
        ctx.lineTo(s2.rightX - s2.nx * cW, s2.rightY - s2.ny * cW);
        ctx.lineTo(s1.rightX - s1.nx * cW, s1.rightY - s1.ny * cW);
      }
      ctx.fillStyle = isRed ? '#cc2222' : '#eeeeee';
      ctx.fill();
    }
  }

  // White dashed center line
  _renderCenterLine(ctx) {
    const samples = this.samples;
    const n = samples.length;
    const dashLen = 8;  // samples per dash
    const gapLen = 8;   // samples per gap

    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 2;

    let drawing = true;
    let counter = 0;
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const s = samples[i % n];
      if (drawing) {
        if (counter === 0) ctx.moveTo(s.x, s.y);
        else ctx.lineTo(s.x, s.y);
      }
      counter++;
      if (drawing && counter >= dashLen) { counter = 0; drawing = false; }
      else if (!drawing && counter >= gapLen) { counter = 0; drawing = true; }
    }
    ctx.stroke();
  }

  _renderBoostPads(ctx) {
    const samples = this.samples;
    const n = samples.length;
    const time = performance.now() / 1000;
    const pulse = 0.5 + 0.5 * Math.sin(time * 4);

    for (const bp of this.boostPads) {
      ctx.beginPath();
      let idx = bp.startIdx;
      const endIdx = bp.endIdx;
      const step = 4;
      let iterations = 0;

      while (idx !== endIdx && iterations++ < 100) {
        const s = samples[idx];
        const nextIdx = (idx + step) % n;
        const ns = samples[nextIdx];
        const midX = (s.x + ns.x) / 2;
        const midY = (s.y + ns.y) / 2;

        ctx.moveTo(s.leftX * 0.7 + s.x * 0.3, s.leftY * 0.7 + s.y * 0.3);
        ctx.lineTo(midX, midY);
        ctx.lineTo(s.rightX * 0.7 + s.x * 0.3, s.rightY * 0.7 + s.y * 0.3);

        idx = (idx + step * 2) % n;
      }

      ctx.strokeStyle = `rgba(255, 255, 255, ${0.3 + pulse * 0.4})`;
      ctx.lineWidth = 2;
      ctx.shadowColor = '#00fff5';
      ctx.shadowBlur = 6 + pulse * 4;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }

  // Checkered start/finish line
  _renderStartLine(ctx) {
    const s = this.samples[0];
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(s.leftX, s.leftY);
    ctx.lineTo(s.rightX, s.rightY);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 5;
    ctx.setLineDash([10, 10]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // Subtle neon glow at the outermost edge of the grass
  _renderNeonGlow(ctx) {
    const samples = this.samples;
    const n = samples.length;
    const expand = TrackSystem.CURB_W + TrackSystem.GRASS_W;

    // Left outer glow
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const s = samples[i % n];
      const gx = s.leftX + s.nx * expand;
      const gy = s.leftY + s.ny * expand;
      if (i === 0) ctx.moveTo(gx, gy);
      else ctx.lineTo(gx, gy);
    }
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 6;
    ctx.globalAlpha = 0.4;
    ctx.stroke();

    // Right outer glow
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const s = samples[i % n];
      const gx = s.rightX - s.nx * expand;
      const gy = s.rightY - s.ny * expand;
      if (i === 0) ctx.moveTo(gx, gy);
      else ctx.lineTo(gx, gy);
    }
    ctx.stroke();

    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  // Render a mini overview of the track (for track select)
  renderMini(ctx, cx, cy, scale) {
    const samples = this.samples;
    const n = samples.length;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.beginPath();
    ctx.moveTo(samples[0].x, samples[0].y);
    for (let i = 1; i <= n; i++) {
      ctx.lineTo(samples[i % n].x, samples[i % n].y);
    }
    ctx.closePath();
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 3 / scale;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 4;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();
  }
}

export { TRACKS };
