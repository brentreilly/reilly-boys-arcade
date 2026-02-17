// Club definitions with real-world characteristics
// Loft angles, typical ball speeds, spin rates, and launch conditions

const YARDS_TO_METERS = 0.9144;

export const CLUBS = [
  {
    name: 'Driver',
    shortName: '1W',
    loft: 10.5,
    ballSpeed: 67,       // m/s (~150 mph)
    launchAngle: 12,     // degrees
    backspin: 2700,      // rpm
    maxDistance: 260,     // yards (carry)
    category: 'wood',
  },
  {
    name: '3 Wood',
    shortName: '3W',
    loft: 15,
    ballSpeed: 62,
    launchAngle: 14,
    backspin: 3500,
    maxDistance: 230,
    category: 'wood',
  },
  {
    name: '5 Wood',
    shortName: '5W',
    loft: 18,
    ballSpeed: 58,
    launchAngle: 16,
    backspin: 4000,
    maxDistance: 210,
    category: 'wood',
  },
  {
    name: '4 Iron',
    shortName: '4i',
    loft: 23,
    ballSpeed: 54,
    launchAngle: 18,
    backspin: 4500,
    maxDistance: 190,
    category: 'iron',
  },
  {
    name: '5 Iron',
    shortName: '5i',
    loft: 26,
    ballSpeed: 51,
    launchAngle: 20,
    backspin: 5000,
    maxDistance: 180,
    category: 'iron',
  },
  {
    name: '6 Iron',
    shortName: '6i',
    loft: 30,
    ballSpeed: 48,
    launchAngle: 22,
    backspin: 5500,
    maxDistance: 170,
    category: 'iron',
  },
  {
    name: '7 Iron',
    shortName: '7i',
    loft: 34,
    ballSpeed: 45,
    launchAngle: 24,
    backspin: 6500,
    maxDistance: 155,
    category: 'iron',
  },
  {
    name: '8 Iron',
    shortName: '8i',
    loft: 38,
    ballSpeed: 42,
    launchAngle: 26,
    backspin: 7500,
    maxDistance: 140,
    category: 'iron',
  },
  {
    name: '9 Iron',
    shortName: '9i',
    loft: 42,
    ballSpeed: 39,
    launchAngle: 28,
    backspin: 8000,
    maxDistance: 130,
    category: 'iron',
  },
  {
    name: 'Pitching Wedge',
    shortName: 'PW',
    loft: 46,
    ballSpeed: 36,
    launchAngle: 30,
    backspin: 8500,
    maxDistance: 120,
    category: 'wedge',
  },
  {
    name: 'Sand Wedge',
    shortName: 'SW',
    loft: 56,
    ballSpeed: 28,
    launchAngle: 34,
    backspin: 9500,
    maxDistance: 80,
    category: 'wedge',
  },
  {
    name: 'Lob Wedge',
    shortName: 'LW',
    loft: 60,
    ballSpeed: 24,
    launchAngle: 38,
    backspin: 10000,
    maxDistance: 60,
    category: 'wedge',
  },
  {
    name: 'Putter',
    shortName: 'PT',
    loft: 3,
    ballSpeed: 0,  // determined by power meter
    launchAngle: 2,
    backspin: 300,
    maxDistance: 0,  // putting is distance-controlled
    category: 'putter',
  },
];

// Surface friction and bounce characteristics
export const SURFACES = {
  tee:     { friction: 0.15, bounce: 0.6, spinRetention: 0.5, name: 'Tee Box',  color: [0.25, 0.55, 0.18] },
  fairway: { friction: 0.18, bounce: 0.55, spinRetention: 0.6, name: 'Fairway',  color: [0.22, 0.52, 0.15] },
  rough:   { friction: 0.45, bounce: 0.3,  spinRetention: 0.2, name: 'Rough',    color: [0.15, 0.38, 0.10] },
  bunker:  { friction: 0.7,  bounce: 0.1,  spinRetention: 0.05, name: 'Bunker',  color: [0.82, 0.75, 0.55] },
  green:   { friction: 0.10, bounce: 0.35, spinRetention: 0.8, name: 'Green',    color: [0.18, 0.60, 0.18] },
  water:   { friction: 1.0,  bounce: 0.0,  spinRetention: 0.0, name: 'Water',    color: [0.15, 0.35, 0.65] },
  oob:     { friction: 1.0,  bounce: 0.0,  spinRetention: 0.0, name: 'Out of Bounds', color: [0.3, 0.25, 0.2] },
};

// Recommend a club based on distance to pin (in yards)
export function recommendClub(distanceYards, lie) {
  if (distanceYards < 1) return CLUBS[CLUBS.length - 1]; // putter

  // On the green, always putt
  if (lie === 'green') return CLUBS[CLUBS.length - 1];

  // Find the club whose max distance best matches the needed distance
  // Prefer a club that can reach comfortably (80-95% power)
  let best = CLUBS[0];
  let bestDiff = Infinity;

  for (const club of CLUBS) {
    if (club.category === 'putter') continue;
    const sweetSpot = club.maxDistance * 0.9;
    const diff = Math.abs(sweetSpot - distanceYards);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = club;
    }
  }

  return best;
}

export function getClubByName(name) {
  return CLUBS.find(c => c.name === name || c.shortName === name);
}
