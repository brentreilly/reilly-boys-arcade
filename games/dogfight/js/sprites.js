// Dogfight — Pixel Art Sprites
// Multi-tone shaded fighter jets pre-rendered to offscreen canvases
// Inspired by detailed pixel art F-15/Su-27 style fighters
// All sprites face right (angle = 0), vertically symmetric

// ── Shape silhouettes ──────────────────────────
// '#' = filled, '.' = transparent

// Player: F-15 Eagle — 21 cols × 17 rows, 2px/cell = 42×34px
const PLAYER_SHAPE = [
  '....................#',
  '.................####',
  '..............#######',
  '...........##########',
  '.........############',
  '......####.##########',
  '....#################',
  '..###################',
  '.####################',
  '..###################',
  '....#################',
  '......####.##########',
  '.........############',
  '...........##########',
  '..............#######',
  '.................####',
  '....................#',
];

// Enemy: MiG-29 — 15 cols × 13 rows, 2px/cell = 30×26px
const ENEMY_SHAPE = [
  '..............#',
  '............###',
  '.........######',
  '.......########',
  '....###.#######',
  '..#############',
  '.##############',
  '..#############',
  '....###.#######',
  '.......########',
  '.........######',
  '............###',
  '..............#',
];

// Boss: heavy bomber — 29 cols × 21 rows, 2px/cell = 58×42px
const BOSS_SHAPE = [
  '............................#',
  '.........................####',
  '.....................########',
  '.................############',
  '..............###############',
  '..........#####.#############',
  '.......######################',
  '....#########################',
  '..###########################',
  '.############################',
  '.############################',
  '.############################',
  '..###########################',
  '....#########################',
  '.......######################',
  '..........#####.#############',
  '..............###############',
  '.................############',
  '.....................########',
  '.........................####',
  '............................#',
];

// ── Color palettes ─────────────────────────────

const PLAYER_COLORS = {
  outline: '#081820',
  body: ['#102030', '#1a3848', '#2a5468', '#3a7088', '#5090a8', '#70b0c8', '#90d0e0', '#b8e8f5'],
  cockpit: ['#0a0e1e', '#182050', '#2840a0', '#4868d0'],
  engine: '#181820',
  navLight: '#ff2222',
  glowColor: '#00fff5',
  glowBlur: 12,
};

const ENEMY_COLORS = {
  outline: '#180404',
  body: ['#2a0808', '#4a1010', '#6a1818', '#8a2424', '#b03030', '#d04040', '#e85858', '#ff7878'],
  cockpit: ['#080810', '#101830', '#182848', '#284068'],
  engine: '#180810',
  navLight: '#33ff33',
  glowColor: '#ff00ff',
  glowBlur: 8,
};

const SHOOTER_COLORS = {
  ...ENEMY_COLORS,
  cockpit: ['#2a0808', '#5a1010', '#a02020', '#ff3333'],
};

const BOSS_COLORS = {
  outline: '#0c0418',
  body: ['#180828', '#281040', '#381858', '#502878', '#6838a0', '#8850c0', '#a868d8', '#c888f0'],
  cockpit: ['#080810', '#141838', '#202860', '#3040a0'],
  engine: '#100818',
  navLight: '#ffcc00',
  glowColor: '#ffffff',
  glowBlur: 20,
};

// ── Feature placement per sprite ───────────────
// cockpit: { r, c, w, h } — glass canopy rectangle
// engines: [{ r, c }] — nozzle cells
// navLights: [{ r, c }] — wingtip lights

const PLAYER_FEAT = {
  cockpit: { r: 7, c: 14, w: 4, h: 3 },
  engines: [{ r: 7, c: 2 }, { r: 8, c: 1 }, { r: 8, c: 2 }, { r: 9, c: 2 }],
  navLights: [{ r: 5, c: 6 }, { r: 11, c: 6 }],
};

const ENEMY_FEAT = {
  cockpit: { r: 5, c: 10, w: 3, h: 3 },
  engines: [{ r: 5, c: 2 }, { r: 6, c: 1 }, { r: 6, c: 2 }, { r: 7, c: 2 }],
  navLights: [{ r: 4, c: 4 }, { r: 8, c: 4 }],
};

const BOSS_FEAT = {
  cockpit: { r: 9, c: 20, w: 5, h: 3 },
  engines: [{ r: 9, c: 2 }, { r: 10, c: 1 }, { r: 10, c: 2 }, { r: 11, c: 2 }],
  navLights: [{ r: 5, c: 10 }, { r: 15, c: 10 }],
};

// ── Sprite builder ─────────────────────────────

function buildShadedSprite(shape, cellSize, colors, features) {
  const rows = shape.length;
  const cols = shape[0].length;
  const w = cols * cellSize;
  const h = rows * cellSize;

  // Parse into boolean grid
  const filled = shape.map(row => [...row].map(ch => ch === '#'));

  // Find extents
  let minC = cols, maxC = 0, minR = rows, maxR = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (filled[r][c]) {
        if (c < minC) minC = c;
        if (c > maxC) maxC = c;
        if (r < minR) minR = r;
        if (r > maxR) maxR = r;
      }
    }
  }
  const centerR = (minR + maxR) / 2;
  const spanR = (maxR - minR) || 1;
  const spanC = (maxC - minC) || 1;

  // Build feature lookup: "r,c" → color
  const featureAt = new Map();

  if (features.cockpit) {
    const cp = features.cockpit;
    for (let r = cp.r; r < cp.r + cp.h; r++) {
      for (let c = cp.c; c < cp.c + cp.w; c++) {
        if (filled[r]?.[c]) {
          const t = (c - cp.c) / Math.max(cp.w - 1, 1);
          const idx = Math.min(Math.floor(t * colors.cockpit.length), colors.cockpit.length - 1);
          featureAt.set(`${r},${c}`, colors.cockpit[idx]);
        }
      }
    }
  }
  for (const eng of (features.engines || [])) {
    if (filled[eng.r]?.[eng.c]) featureAt.set(`${eng.r},${eng.c}`, colors.engine);
  }
  for (const nl of (features.navLights || [])) {
    if (filled[nl.r]?.[nl.c]) featureAt.set(`${nl.r},${nl.c}`, colors.navLight);
  }

  // Render sprite
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!filled[r][c]) continue;

      // Check for feature override
      const feat = featureAt.get(`${r},${c}`);
      if (feat) {
        ctx.fillStyle = feat;
        ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
        continue;
      }

      // Edge detection: cardinal neighbor is empty or OOB
      const isEdge =
        !filled[r - 1]?.[c] || !filled[r + 1]?.[c] ||
        !filled[r]?.[c - 1] || !filled[r]?.[c + 1];

      if (isEdge) {
        ctx.fillStyle = colors.outline;
        ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
        continue;
      }

      // Near-edge: any diagonal neighbor is empty (creates secondary outline)
      const nearEdge =
        !filled[r - 1]?.[c - 1] || !filled[r - 1]?.[c + 1] ||
        !filled[r + 1]?.[c - 1] || !filled[r + 1]?.[c + 1];

      // Shading based on position within silhouette
      const nx = (c - minC) / spanC;                        // 0=tail, 1=nose
      const ny = Math.abs(r - centerR) / (spanR / 2);       // 0=center, 1=edge
      const lightness = nx * 0.45 + (1 - ny) * 0.35 + 0.2;  // brighter toward nose & center

      let idx = Math.min(Math.floor(lightness * colors.body.length), colors.body.length - 1);
      if (nearEdge) idx = Math.max(0, idx - 2); // darken near edges

      ctx.fillStyle = colors.body[idx];
      ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
    }
  }

  // Add panel line detail — subtle darker stripe at ~40% and ~70% from tail
  for (let r = 0; r < rows; r++) {
    for (const frac of [0.4, 0.7]) {
      const c = Math.round(minC + frac * spanC);
      if (!filled[r][c]) continue;
      if (featureAt.has(`${r},${c}`)) continue;
      // Only on interior cells
      const isEdge =
        !filled[r - 1]?.[c] || !filled[r + 1]?.[c] ||
        !filled[r]?.[c - 1] || !filled[r]?.[c + 1];
      if (isEdge) continue;

      ctx.fillStyle = colors.body[1]; // second-darkest shade
      ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
    }
  }

  // Specular highlight along the spine (center row ±1, forward half)
  const midR = Math.round(centerR);
  for (let c = Math.round(minC + spanC * 0.3); c <= maxC - 2; c++) {
    if (!filled[midR][c]) continue;
    if (featureAt.has(`${midR},${c}`)) continue;
    const isEdge =
      !filled[midR - 1]?.[c] || !filled[midR + 1]?.[c] ||
      !filled[midR]?.[c - 1] || !filled[midR]?.[c + 1];
    if (isEdge) continue;

    ctx.fillStyle = colors.body[colors.body.length - 1]; // brightest
    ctx.fillRect(c * cellSize, midR * cellSize, cellSize, cellSize);
  }

  // Glow canvas — pre-rendered shadow for neon effect
  const pad = colors.glowBlur * 2;
  const glow = document.createElement('canvas');
  glow.width = w + pad * 2;
  glow.height = h + pad * 2;
  const gctx = glow.getContext('2d');

  gctx.shadowColor = colors.glowColor;
  gctx.shadowBlur = colors.glowBlur;
  gctx.drawImage(canvas, pad, pad);
  gctx.shadowBlur = 0;

  return { canvas, glow, glowPad: pad, w, h };
}

// ── Exports ────────────────────────────────────

export const playerSprite  = buildShadedSprite(PLAYER_SHAPE, 2, PLAYER_COLORS,  PLAYER_FEAT);
export const enemySprite   = buildShadedSprite(ENEMY_SHAPE,  2, ENEMY_COLORS,   ENEMY_FEAT);
export const shooterSprite = buildShadedSprite(ENEMY_SHAPE,  2, SHOOTER_COLORS, ENEMY_FEAT);
export const bossSprite    = buildShadedSprite(BOSS_SHAPE,   2, BOSS_COLORS,    BOSS_FEAT);
