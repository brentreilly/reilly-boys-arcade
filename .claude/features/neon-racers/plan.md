# Neon Racers — Implementation Plan

- **Issue:** None
- **Branch:** `feature/neon-racers`
- **Design doc:** `docs/plans/2026-02-17-neon-racers-design.md`
- **Database impact:** None (localStorage only for track unlock progress)

## Build Phases

### Phase 1: Track Data & Geometry Engine (`track.js`) [DONE]

The foundation everything else depends on. Define tracks as center-line waypoint arrays with width, then implement:

- Track path interpolation (smooth curves from waypoints via Catmull-Rom or similar)
- Track boundary calculation (inner/outer edges from center + width)
- Collision detection (point distance from center line vs half-width)
- Boost pad placement data per track
- Start/finish line position and lap-crossing detection
- All 5 track layouts (Neon Oval, Pixel Circuit, Cyber Loop, Laser Lane, Warp Ring)

**Files:** `games/neon-racers/js/track.js`

### Phase 2: Kart Physics & AI (`kart.js`) [DONE]

Player and AI kart behavior:

- Kart state: position, velocity, rotation, speed
- Player steering: turn rate applied based on input (left/right flags)
- Auto-acceleration with max speed
- Wall collision response (bounce + slow down)
- Boost pad effect (temporary speed multiplier for 1.5s)
- AI pathfinding: follow track waypoints with offset variation
- AI speed scaling per track difficulty
- AI separation (avoid overlapping each other)

**Files:** `games/neon-racers/js/kart.js`

### Phase 3: Camera System (`camera.js`) [DONE]

Top-down camera that follows and rotates with the player:

- Follow player kart position with smooth lerp
- Rotate view so player kart always faces "up" on screen
- Smooth rotation interpolation to avoid jarring snaps
- Provide world-to-screen transform for rendering

**Files:** `games/neon-racers/js/camera.js`

### Phase 4: HUD & UI (`hud.js`) [DONE]

All DOM-based UI elements:

- Track select screen (grid of 5 tracks, locked/unlocked state)
- Countdown overlay (3… 2… 1… GO!)
- Race HUD (position indicator, lap counter)
- Pause screen
- Results screen (finishing positions, unlock animation)
- Position change celebration effect
- localStorage save/load for track unlocks

**Files:** `games/neon-racers/js/hud.js`

### Phase 5: Particles & Effects (`particles.js`) [DONE]

Visual juice (kept lightweight for Fire HD):

- Tire trail particles (small dots behind karts)
- Boost speed lines (brief burst when hitting boost pad)
- Overtake celebration (position flash + burst)
- Win confetti (particle burst on finishing 1st, max 30 particles)

**Files:** `games/neon-racers/js/particles.js`

### Phase 6: Main Game Loop & State Machine (`main.js`) [DONE]

Orchestrates everything:

- State machine: TRACK_SELECT → COUNTDOWN → RACING → RACE_FINISH → RESULTS
- Game loop (requestAnimationFrame with capped dt)
- Input handling (pointer events for left/right thumb zones + keyboard fallback)
- Canvas setup with DPR scaling
- Render pipeline: clear → background → camera transform → track → karts → particles → restore
- Position tracking (who's in 1st/2nd/3rd/4th based on lap progress)
- Lap counting and race completion logic

**Files:** `games/neon-racers/js/main.js`

### Phase 7: HTML Shell & Styling (`index.html`) [DONE]

The game's HTML with all inline styles:

- Canvas element
- UI overlay with all screens (track select, countdown, HUD, pause, results)
- Touch zones (left/right steering areas)
- Back button (← ARCADE)
- Press Start 2P font
- Dark background, neon color palette
- Mobile meta tags (viewport, no-scale, webapp-capable)

**Files:** `games/neon-racers/index.html`

### Phase 8: Homepage Integration [DONE]

Add game card to the arcade homepage.

**Files:** `index.html` (root)

## Checkpoints

- **After Phase 3:** Track renders, karts move, camera follows — core gameplay loop is testable
- **After Phase 6:** Full game is playable end-to-end
- **After Phase 8:** Code review before shipping

## Dependencies

- **CDN:** None (pure Canvas2D)
- **Font:** Press Start 2P (Google Fonts, already used by other games)
- **Packages:** None
