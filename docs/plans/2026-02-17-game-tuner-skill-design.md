# Game Tuner Skill — Design

## Summary

A Claude Code skill (`~/.claude/skills/game-tuner/SKILL.md`) that takes gameplay feedback from Brent about Hudson's play sessions and translates it into specific, approved code changes that improve the game for Hudson.

## Trigger Conditions

- "Hudson played X and..."
- "he didn't like..."
- "he wants..."
- "the game is too..."
- "tune the game"
- "game feedback"

## Flow: Interpret → Propose → Implement

### Phase 1: Read the Game

- Brent names the game + provides raw feedback
- Skill reads `games/<slug>/js/*.js` and `index.html` to understand current values
- Reads original design doc from `docs/plans/` if one exists

### Phase 2: Interpret Feedback

Categorize each piece of feedback:

| Type | Example | Action |
|---|---|---|
| **Difficulty** | "too hard", "keeps dying" | Find difficulty knobs, propose gentler values |
| **Controls** | "truck flips too much" | Find physics/input params, propose adjustments |
| **Boredom** | "got bored", "played 30 seconds" | Diagnose pacing/reward/variety, propose most likely fix |
| **Visual clarity** | "couldn't see the fuel" | Find UI/rendering code, propose visibility changes |
| **Feature request** | "wants jumps" | Evaluate feasibility, propose implementation |
| **Vague vibes** | "didn't seem excited" | Ask ONE follow-up question, then categorize |

### Phase 3: Propose Changes

Numbered list with:
- **What:** Concrete code change (e.g., "reduce `MAX_TILT_ANGLE` from 150° to 90°")
- **Why:** How it addresses the feedback
- **Trade-off:** What else this might affect

Wait for Brent's approval before proceeding.

### Phase 4: Implement

Make approved changes. Then suggest 2-3 things to watch for in the next play-test.

## Design Principles

- **Respect game-designer constraints:** No changes that break touch-first, min 48px targets, minimal text, Fire HD performance, or retro aesthetic
- **One follow-up max for vague feedback:** Don't interrogate — ask one clarifying question, then propose
- **Preserve the fun loop:** Flag if a change might kill replayability (e.g., "unlimited fuel removes tension")
- **Suggest play-test observations:** After changes, give 2-3 specific things to watch next session

## Relationship to Other Skills

- **game-designer** creates new games; **game-tuner** iterates on existing ones
- game-tuner enforces the same hard constraints as game-designer
- game-tuner reads design docs produced by game-designer for context

## Approach

Pure skill (no subagent, no reference file). Lightweight SKILL.md that guides the interpret → propose → implement cycle.
