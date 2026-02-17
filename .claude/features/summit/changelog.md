# Summit Physics Tuning — Changelog

**Date:** 2026-02-17
**Issue:** None
**PR:** https://github.com/brentreilly/reilly-boys-arcade/pull/1
**Type:** enhancement

## Summary

Tuned Summit's monster truck physics for a more realistic, weighty feel. The truck now uses per-wheel terrain contact, tighter slope tracking, suspension-like landing absorption, and heavier air rotation. Also added wheelie/stoppie torque and made flipping fatal.

## Files Changed

**Game** — `games/summit/js/truck.js`
- Physics constants: ANGULAR_DAMPING, BOUNCE_FACTOR, GRAVITY, GAS_FORCE, BRAKE_FORCE, MAX_SPEED, AIR_TILT_FORCE
- Per-wheel grounding (average of rear + front wheel terrain heights)
- Slope tracking lerp increased (0.12 → 0.25)
- Landing spin factor reduced (0.5 → 0.15)
- Added GROUND_TILT_FORCE for wheelie/stoppie mechanics
- Flip death replaces auto-right timer

## Deviations from Plan

- **Flip death instead of auto-right:** The original design doc specified auto-right after 1 second. Changed to fatal flip for higher stakes. Can revert if too punishing for Hudson.

## Known Limitations

- Terrain contact is still an average of two wheel heights, not true independent wheel simulation. Good enough for the arcade feel.
- The flip-death threshold (~100°) may need tuning after play-testing.
