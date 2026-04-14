# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server with HMR
rtk tsc                     # Type-check (tsc -b)
rtk err npm run build       # Production build (vite build)
rtk lint                    # ESLint (flat config, v9+)
npm run preview   # Preview production build locally
```

## Architecture

This is a React 19 + TypeScript + Vite 3D racing game prototype using **Three.js** (imported directly, not via React Three Fiber). AI bots use **Yuka** for steering/pathfinding.

**TypeScript config is strict**: `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly`, and `verbatimModuleSyntax` are all enabled. Use `import type` for type-only imports.

### Game Modes
- **Race** — single-player vs AI bots (`GameEngine` + `RaceManager`)
- **Practice** — free drive, no opponents (`PracticeEngine`)
- **Versus** — local multiplayer (`VersusGameEngine` + `VersusRaceManager`)

### Structure

- `src/App.tsx` — top-level phase router (`menu` → `trackSelect` → `carSelect` → `lapSelect` → `racing`)
- `src/game/GameEngine.ts` — single-player game loop, Three.js scene orchestration
- `src/game/VersusGameEngine.ts` — versus (local multiplayer) game loop
- `src/game/PracticeEngine.ts` — practice mode game loop
- `src/game/InputManager.ts` — keyboard input handling
- `src/game/car/` — `CarFactory`, `CarPhysics`, `CarController`
- `src/game/ai/` — `AIManager`, `pathUtils` (Yuka-based steering)
- `src/game/track/` — `TrackDefinition`, `TrackBuilder`, `HazardSystem`
- `src/game/race/` — `RaceManager`, `VersusRaceManager`, `StartSequence`, `Minimap`
- `src/game/camera/` — `TopDownCamera`
- `src/game/collision/` — `CollisionSystem`
- `src/game/effects/` — `CollisionParticleSystem`, `TireSmokeSystem`, `SplatterDecalSystem`, `HazardSplashSystem`
- `src/game/scene/` — `TableScene`, `LightingSetup`, `ObstacleFactory`, `TrackBoundaryObjects`, `TireMarkSystem`, `KitchenItems`, `ProceduralTextures`
- `src/components/hud/` — `Speedometer`, `LapTimer`, `CheckpointTimer`, `Countdown`, `MinimapDisplay`, `PositionIndicator`, `WrongWayIndicator`, `VersusScoreDisplay`, `VersusRoundOverlay`
- `src/components/screens/` — `MainMenu`, `TrackSelect`, `CarSelect`, `LapSelect`, `RaceScreen`, `PracticeScreen`, `VersusCarSelect`, `VersusRaceScreen`, `VersusEndScreen`, `Scoreboard`, `TrackEditor`
- `src/constants/` — `cars.ts`, `track.ts`, `physics.ts`, `camera.ts`, `aiRacer.ts`
- `src/state/` — `GameStateEmitter`, `VersusStateEmitter`
- `src/hooks/` — `useGameState`, `useGameEngine`, `useVersusGameState`, `useVersusGameEngine`
- `src/types/game.ts` — shared types

The Three.js game loop runs independently of React; React handles UI overlays (HUD, menus). Engine classes are instantiated imperatively inside their respective screen components.

## Physics & Driving Mechanics

### Physics pipeline (per frame)
`CarController.update()` → computes throttle (with direction-reversal and handbrake overrides) → `applyAcceleration()` → `applySteering()` → `updatePosition()` → post-physics floor enforcement

### Key constants (`src/constants/physics.ts` → `DRIFT_PHYSICS`)
| Constant | Value | Effect |
|---|---|---|
| `throttleInertiaTime` | 0.40 | Seconds to ramp throttle to 63% — higher = slower acceleration |
| `brakeInertiaTime` | 0.28 | Same for braking — higher = longer stopping distance |
| `frontAxleOffset` | 2.0 | Pivot shift distance during handbrake turns |
| `handbrakeGripMultiplier` | 0.12 | Grip fraction when handbrake held — low = lots of drift |
| `corneringDragFactor` | 0.18 | Speed bleed per radian of slip — higher = more speed loss in corners |
| `skidSlipThreshold` | 0.25 rad | Slip angle above which `isSkidding = true` (triggers smoke/marks) |

### Handbrake behavior (`CarController` + `CarPhysics`)
- **Drag**: `0.985` per frame (vs `0.988` normal) — gradual speed bleed
- **Forward held**: brakes toward 25% max speed with `throttle = -0.6`, then holds a 25% floor post-physics
- **No input**: `throttle = 0`, drag brings car to full stop gradually
- **Rotation**: `rotRate * 1.8` (was 3.5) when slip > threshold — gentler rear swing

### High-speed cornering
When `speedRatio > 0.75` and `|steeringAngle| > 0.8 rad`, grip is reduced and a small spinout rotation is added. Slip exceeds `skidSlipThreshold`, triggering tire smoke + marks automatically.
