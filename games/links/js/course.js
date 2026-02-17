// Course definition: 9 holes with terrain features
// Each hole defines: par, layout, fairway path, hazards, and elevation

const YARDS_TO_METERS = 0.9144;

// Simple seeded noise for terrain variation
function hash(x, z) {
  let h = x * 374761393 + z * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  h = h ^ (h >> 16);
  return (h & 0x7fffffff) / 0x7fffffff;
}

function smoothNoise(x, z, scale) {
  const sx = x / scale;
  const sz = z / scale;
  const ix = Math.floor(sx);
  const iz = Math.floor(sz);
  const fx = sx - ix;
  const fz = sz - iz;
  const u = fx * fx * (3 - 2 * fx);
  const v = fz * fz * (3 - 2 * fz);
  const a = hash(ix, iz);
  const b = hash(ix + 1, iz);
  const c = hash(ix, iz + 1);
  const d = hash(ix + 1, iz + 1);
  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
}

function fbmNoise(x, z, octaves = 3, scale = 40) {
  let value = 0;
  let amp = 1;
  let freq = 1;
  let maxAmp = 0;
  for (let i = 0; i < octaves; i++) {
    value += smoothNoise(x * freq, z * freq, scale) * amp;
    maxAmp += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return value / maxAmp;
}

// Hole definitions
export const HOLES = [
  {
    number: 1,
    name: 'The Opening Drive',
    par: 4,
    distance: 380,
    description: 'A gentle opener. Wide fairway, slight uphill approach.',
    tee: { x: 0, z: 0 },
    pin: { x: 5, z: 347 },
    fairway: [
      { x: 0, z: 20, width: 22 },
      { x: 0, z: 80, width: 35 },
      { x: 2, z: 160, width: 32 },
      { x: 5, z: 240, width: 28 },
      { x: 5, z: 310, width: 24 },
    ],
    green: { x: 5, z: 347, radius: 14, slopeX: 0.01, slopeZ: -0.015 },
    bunkers: [
      { x: -18, z: 330, radius: 6 },
      { x: 22, z: 340, radius: 5 },
    ],
    water: [],
    trees: { density: 0.3, avoidFairway: true },
    elevation: (x, z) => {
      return z > 250 ? (z - 250) * 0.015 : 0;
    },
    wind: { speed: 2, direction: 45 },
  },
  {
    number: 2,
    name: 'Island View',
    par: 3,
    distance: 165,
    description: 'A short par 3 over water. Don\'t come up short!',
    tee: { x: 0, z: 0 },
    pin: { x: -3, z: 151 },
    fairway: [
      { x: -3, z: 120, width: 18 },
    ],
    green: { x: -3, z: 151, radius: 12, slopeX: -0.02, slopeZ: 0.01 },
    bunkers: [
      { x: 12, z: 148, radius: 5 },
      { x: -16, z: 155, radius: 4 },
    ],
    water: [
      { x: 0, z: 70, width: 50, length: 40 },
    ],
    trees: { density: 0.15, avoidFairway: true },
    elevation: (x, z) => 0,
    wind: { speed: 4, direction: 270 },
  },
  {
    number: 3,
    name: 'The Bend',
    par: 5,
    distance: 520,
    description: 'A sweeping dogleg right. Big hitters can cut the corner.',
    tee: { x: 0, z: 0 },
    pin: { x: 60, z: 440 },
    fairway: [
      { x: 0, z: 30, width: 24 },
      { x: 5, z: 100, width: 34 },
      { x: 15, z: 200, width: 30 },
      { x: 35, z: 300, width: 28 },
      { x: 55, z: 380, width: 26 },
      { x: 60, z: 420, width: 22 },
    ],
    green: { x: 60, z: 440, radius: 15, slopeX: 0.015, slopeZ: -0.01 },
    bunkers: [
      { x: 45, z: 200, radius: 7 },
      { x: 75, z: 430, radius: 5 },
      { x: 48, z: 450, radius: 4 },
    ],
    water: [
      { x: 70, z: 280, width: 30, length: 60 },
    ],
    trees: { density: 0.4, avoidFairway: true },
    elevation: (x, z) => Math.sin(z / 200) * 2,
    wind: { speed: 3, direction: 135 },
  },
  {
    number: 4,
    name: 'Heartbreak Hill',
    par: 4,
    distance: 410,
    description: 'A demanding uphill par 4. Club up on approach.',
    tee: { x: 0, z: 0 },
    pin: { x: -5, z: 375 },
    fairway: [
      { x: 0, z: 30, width: 22 },
      { x: -2, z: 100, width: 30 },
      { x: -3, z: 200, width: 28 },
      { x: -5, z: 300, width: 25 },
      { x: -5, z: 350, width: 22 },
    ],
    green: { x: -5, z: 375, radius: 13, slopeX: 0.005, slopeZ: -0.025 },
    bunkers: [
      { x: -20, z: 360, radius: 6 },
      { x: 10, z: 370, radius: 5 },
    ],
    water: [],
    trees: { density: 0.35, avoidFairway: true },
    elevation: (x, z) => z * 0.025,
    wind: { speed: 5, direction: 0 },
  },
  {
    number: 5,
    name: 'The Clifftop',
    par: 3,
    distance: 200,
    description: 'Elevated tee with a stunning drop. Wind is a factor.',
    tee: { x: 0, z: 0 },
    pin: { x: 3, z: 183 },
    fairway: [
      { x: 3, z: 140, width: 20 },
    ],
    green: { x: 3, z: 183, radius: 11, slopeX: 0.02, slopeZ: 0.01 },
    bunkers: [
      { x: -10, z: 175, radius: 5 },
      { x: 14, z: 190, radius: 6 },
      { x: 3, z: 200, radius: 4 },
    ],
    water: [],
    trees: { density: 0.2, avoidFairway: true },
    elevation: (x, z) => {
      if (z < 30) return 12;
      if (z < 80) return 12 - (z - 30) * 0.24;
      return 0;
    },
    wind: { speed: 7, direction: 90 },
  },
  {
    number: 6,
    name: 'Bunker Alley',
    par: 4,
    distance: 350,
    description: 'Fairway bunkers guard both sides. Accuracy off the tee is key.',
    tee: { x: 0, z: 0 },
    pin: { x: -8, z: 320 },
    fairway: [
      { x: 0, z: 25, width: 20 },
      { x: -2, z: 100, width: 24 },
      { x: -5, z: 180, width: 22 },
      { x: -7, z: 260, width: 24 },
      { x: -8, z: 300, width: 20 },
    ],
    green: { x: -8, z: 320, radius: 13, slopeX: -0.02, slopeZ: -0.01 },
    bunkers: [
      { x: -20, z: 100, radius: 6 },
      { x: 15, z: 110, radius: 5 },
      { x: -22, z: 190, radius: 5 },
      { x: 12, z: 200, radius: 6 },
      { x: -22, z: 310, radius: 5 },
      { x: 6, z: 325, radius: 4 },
    ],
    water: [],
    trees: { density: 0.25, avoidFairway: true },
    elevation: (x, z) => 0,
    wind: { speed: 3, direction: 315 },
  },
  {
    number: 7,
    name: 'The Serpent',
    par: 5,
    distance: 545,
    description: 'A double dogleg that winds through the trees. Strategy matters.',
    tee: { x: 0, z: 0 },
    pin: { x: -20, z: 480 },
    fairway: [
      { x: 0, z: 30, width: 24 },
      { x: 10, z: 100, width: 30 },
      { x: 25, z: 200, width: 26 },
      { x: 15, z: 300, width: 28 },
      { x: -5, z: 380, width: 26 },
      { x: -18, z: 440, width: 24 },
    ],
    green: { x: -20, z: 480, radius: 16, slopeX: -0.01, slopeZ: -0.02 },
    bunkers: [
      { x: 40, z: 210, radius: 6 },
      { x: -25, z: 400, radius: 5 },
      { x: -35, z: 475, radius: 5 },
    ],
    water: [
      { x: -15, z: 300, width: 20, length: 30 },
    ],
    trees: { density: 0.5, avoidFairway: true },
    elevation: (x, z) => Math.sin(z / 150) * 3 + Math.cos(x / 80) * 1.5,
    wind: { speed: 2, direction: 180 },
  },
  {
    number: 8,
    name: 'Narrow Passage',
    par: 4,
    distance: 430,
    description: 'Long and tight. Water runs the entire right side.',
    tee: { x: 0, z: 0 },
    pin: { x: -5, z: 393 },
    fairway: [
      { x: 0, z: 25, width: 18 },
      { x: -3, z: 100, width: 22 },
      { x: -5, z: 200, width: 20 },
      { x: -5, z: 300, width: 22 },
      { x: -5, z: 370, width: 20 },
    ],
    green: { x: -5, z: 393, radius: 12, slopeX: -0.015, slopeZ: 0.02 },
    bunkers: [
      { x: -20, z: 380, radius: 5 },
      { x: 5, z: 400, radius: 4 },
    ],
    water: [
      { x: 25, z: 50, width: 30, length: 340 },
    ],
    trees: { density: 0.35, avoidFairway: true },
    elevation: (x, z) => z > 300 ? (z - 300) * 0.01 : 0,
    wind: { speed: 4, direction: 60 },
  },
  {
    number: 9,
    name: 'The Finale',
    par: 4,
    distance: 400,
    description: 'A dramatic finishing hole. Water guards the green. Go for glory.',
    tee: { x: 0, z: 0 },
    pin: { x: 0, z: 366 },
    fairway: [
      { x: 0, z: 30, width: 24 },
      { x: 0, z: 100, width: 32 },
      { x: 0, z: 200, width: 28 },
      { x: 0, z: 290, width: 24 },
    ],
    green: { x: 0, z: 366, radius: 14, slopeX: 0.01, slopeZ: -0.02 },
    bunkers: [
      { x: -18, z: 350, radius: 6 },
      { x: 18, z: 355, radius: 5 },
      { x: 0, z: 385, radius: 5 },
    ],
    water: [
      { x: 0, z: 320, width: 50, length: 20 },
    ],
    trees: { density: 0.3, avoidFairway: true },
    elevation: (x, z) => {
      if (z > 340) return 1.5;
      if (z > 310) return (z - 310) * 0.05;
      return 0;
    },
    wind: { speed: 3, direction: 225 },
  },
];

export const COURSE_PAR = HOLES.reduce((sum, h) => sum + h.par, 0);

// Terrain helpers for a given hole
export function createHoleTerrain(hole) {
  const holeMeters = hole.distance * YARDS_TO_METERS;
  const width = 120;    // meters total width
  const length = holeMeters + 60; // extra behind green

  return {
    hole,
    width,
    length,
    holeMeters,

    getElevation(x, z) {
      // Base elevation from hole definition
      let elev = hole.elevation(x, z);
      // Add gentle terrain noise
      elev += fbmNoise(x + hole.number * 1000, z + hole.number * 2000, 3, 50) * 1.5 - 0.75;

      // Flatten tee area
      const tDist = Math.sqrt((x - hole.tee.x) ** 2 + (z - hole.tee.z) ** 2);
      if (tDist < 6) {
        const teeElev = hole.elevation(hole.tee.x, hole.tee.z);
        const blend = Math.max(0, 1 - tDist / 6);
        elev = elev * (1 - blend) + teeElev * blend;
      }

      // Flatten green area
      const gDist = Math.sqrt((x - hole.green.x) ** 2 + (z - hole.green.z) ** 2);
      if (gDist < hole.green.radius * 1.3) {
        const greenBase = hole.elevation(hole.green.x, hole.green.z);
        // Green has subtle slope
        const greenElev = greenBase +
          (x - hole.green.x) * (hole.green.slopeX || 0) +
          (z - hole.green.z) * (hole.green.slopeZ || 0);
        const blend = Math.max(0, 1 - gDist / (hole.green.radius * 1.3));
        elev = elev * (1 - blend * blend) + greenElev * blend * blend;
      }

      // Depress bunker areas
      for (const bunker of hole.bunkers) {
        const bDist = Math.sqrt((x - bunker.x) ** 2 + (z - bunker.z) ** 2);
        if (bDist < bunker.radius * 1.2) {
          const blend = Math.max(0, 1 - bDist / (bunker.radius * 1.2));
          elev -= blend * blend * 0.8;
        }
      }

      // Depress water areas
      for (const water of hole.water) {
        const wx = x - water.x;
        const wz = z - water.z;
        if (Math.abs(wx) < water.width / 2 + 3 && Math.abs(wz) < water.length / 2 + 3) {
          const edgeX = Math.max(0, Math.abs(wx) - water.width / 2) / 3;
          const edgeZ = Math.max(0, Math.abs(wz) - water.length / 2) / 3;
          const blend = Math.max(0, 1 - Math.max(edgeX, edgeZ));
          elev -= blend * 1.5;
        }
      }

      return elev;
    },

    getSurface(x, z) {
      // Check green
      const gDist = Math.sqrt((x - hole.green.x) ** 2 + (z - hole.green.z) ** 2);
      if (gDist < hole.green.radius) return 'green';

      // Check bunkers
      for (const bunker of hole.bunkers) {
        const bDist = Math.sqrt((x - bunker.x) ** 2 + (z - bunker.z) ** 2);
        if (bDist < bunker.radius) return 'bunker';
      }

      // Check water
      for (const water of hole.water) {
        const wx = Math.abs(x - water.x);
        const wz = Math.abs(z - water.z);
        if (wx < water.width / 2 && wz < water.length / 2) return 'water';
      }

      // Check tee box
      const tDist = Math.sqrt((x - hole.tee.x) ** 2 + (z - hole.tee.z) ** 2);
      if (tDist < 4) return 'tee';

      // Check fairway (distance to path)
      if (isOnFairway(x, z, hole.fairway)) return 'fairway';

      // Check out of bounds
      if (Math.abs(x) > width / 2 - 5 || z < -10 || z > length - 10) return 'oob';

      return 'rough';
    },

    // Check if ball is in the hole — generous radius for satisfying gameplay
    isInHole(x, z) {
      const dx = x - hole.pin.x;
      const dz = z - hole.pin.z;
      return Math.sqrt(dx * dx + dz * dz) < 1.5; // bigger cup for kids
    },

    distanceToPin(x, z) {
      const dx = x - hole.pin.x;
      const dz = z - hole.pin.z;
      return Math.sqrt(dx * dx + dz * dz);
    },
  };
}

function isOnFairway(x, z, fairwayPath) {
  if (fairwayPath.length === 0) return false;

  let minDist = Infinity;
  let interpWidth = 30;

  for (let i = 0; i < fairwayPath.length - 1; i++) {
    const a = fairwayPath[i];
    const b = fairwayPath[i + 1];

    // Project point onto segment
    const abx = b.x - a.x;
    const abz = b.z - a.z;
    const apx = x - a.x;
    const apz = z - a.z;
    const abLen2 = abx * abx + abz * abz;
    let t = abLen2 > 0 ? (apx * abx + apz * abz) / abLen2 : 0;
    t = Math.max(0, Math.min(1, t));

    const closestX = a.x + t * abx;
    const closestZ = a.z + t * abz;
    const dist = Math.sqrt((x - closestX) ** 2 + (z - closestZ) ** 2);
    const width = a.width * (1 - t) + b.width * t;

    if (dist < width / 2 && dist < minDist) {
      minDist = dist;
      interpWidth = width;
    }
  }

  // Also check closest to first and last points
  const first = fairwayPath[0];
  const last = fairwayPath[fairwayPath.length - 1];
  const dFirst = Math.sqrt((x - first.x) ** 2 + (z - first.z) ** 2);
  const dLast = Math.sqrt((x - last.x) ** 2 + (z - last.z) ** 2);
  if (dFirst < first.width / 2) return true;
  if (dLast < last.width / 2) return true;

  return minDist < interpWidth / 2;
}

export function getTreePositions(hole, terrain) {
  const positions = [];
  const holeMeters = hole.distance * YARDS_TO_METERS;
  const density = (hole.trees.density || 0.3) * 0.4; // reduced for mobile performance
  const spacing = 12 / density;

  for (let x = -55; x < 55; x += spacing) {
    for (let z = -5; z < holeMeters + 40; z += spacing) {
      // Jitter position
      const jx = x + (hash(x * 7 + hole.number, z * 13) - 0.5) * spacing * 0.8;
      const jz = z + (hash(x * 17, z * 7 + hole.number) - 0.5) * spacing * 0.8;

      const surface = terrain.getSurface(jx, jz);
      if (surface !== 'rough' && surface !== 'oob') continue;

      // Avoid being too close to fairway
      if (hole.trees.avoidFairway) {
        let tooClose = false;
        for (const fp of hole.fairway) {
          const d = Math.sqrt((jx - fp.x) ** 2 + (jz - fp.z) ** 2);
          if (d < fp.width / 2 + 5) { tooClose = true; break; }
        }
        const gd = Math.sqrt((jx - hole.green.x) ** 2 + (jz - hole.green.z) ** 2);
        if (gd < hole.green.radius + 8) tooClose = true;
        const td = Math.sqrt((jx - hole.tee.x) ** 2 + (jz - hole.tee.z) ** 2);
        if (td < 15) tooClose = true;
        if (tooClose) continue;
      }

      // Avoid water
      let inWater = false;
      for (const w of hole.water) {
        if (Math.abs(jx - w.x) < w.width / 2 + 2 && Math.abs(jz - w.z) < w.length / 2 + 2) {
          inWater = true; break;
        }
      }
      if (inWater) continue;

      const elev = terrain.getElevation(jx, jz);
      const scale = 0.7 + hash(jx * 31, jz * 37) * 0.8;
      const type = hash(jx * 41, jz * 43) > 0.5 ? 'pine' : 'oak';
      positions.push({ x: jx, z: jz, y: elev, scale, type });
    }
  }

  return positions;
}
