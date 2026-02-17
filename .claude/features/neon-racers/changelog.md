# Neon Racers — Changelog

- **Date:** 2026-02-17
- **Issue:** None
- **PR:** (pending)
- **Type:** new-feature

## Summary

Added Neon Racers, a top-down F1 kart racing game. Players steer with thumb zones (hold left/right side of screen) through 5 unlockable tracks against 3 AI opponents. Features F1-style car rendering with tapered bodies, exposed tires, and wings; realistic track visuals with grass fringe, red/white curb strips, and dashed center lines; a full state machine (track select → countdown → racing → results); and localStorage progression.

## Files Changed

### Game (`games/neon-racers/`)
- `index.html` — HTML shell with inline styles, UI overlay, touch zones, all screens
- `js/main.js` — Game loop, state machine, input handling, render pipeline
- `js/track.js` — 5 track definitions (Catmull-Rom splines), collision, grass/curb/asphalt rendering
- `js/kart.js` — F1 car physics (auto-accel, thumb steering, wall bounce), AI controller, car rendering
- `js/camera.js` — Follow + rotate camera (player always faces up)
- `js/hud.js` — Track select, countdown, race HUD, results, localStorage saves
- `js/particles.js` — Tire trails, boost speed lines, overtake burst, win confetti

### Homepage
- `index.html` — Added Neon Racers game card to arcade grid

### Docs
- `docs/plans/2026-02-17-neon-racers-design.md` — Game design document
- `.claude/features/neon-racers/plan.md` — Implementation plan

## Deviations from Plan

- **F1 car visuals:** Design doc called for "simple top-down kart shapes (rounded rectangle body + wheels)". Upgraded to detailed F1 cars with tapered nose, exposed tires, wings, cockpit/helmet, and white accent stripes based on post-build feedback with pixel art reference.
- **Track rendering:** Design doc called for "neon-bordered lanes on dark background". Upgraded to realistic track with grass fringe, red/white curb strips, dashed center line, and subtle neon outer glow for a more immersive F1 feel.
- **Physics model:** Switched from simple scalar speed to velocity-based physics with lateral friction for more realistic cornering feel.

## Known Limitations

- No sound effects or music
- Track previews in the select screen use raw waypoints (not the full spline) — approximate shape only
- AI uses simple waypoint following — no rubber-banding or dynamic difficulty adjustment
- No minimap during racing
- Tracks 2-5 not yet play-tested for balance — AI speed and track width may need tuning
