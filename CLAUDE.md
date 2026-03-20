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

This is a React 19 + TypeScript + Vite 3D racing game prototype using **Three.js** (imported directly, not via React Three Fiber).

**TypeScript config is strict**: `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly`, and `verbatimModuleSyntax` are all enabled. Use `import type` for type-only imports.

### Structure

- `src/App.tsx` — top-level phase router (`menu` → `trackSelect` → `carSelect` → `lapSelect` → `racing`)
- `src/game/GameEngine.ts` — main game loop, Three.js scene orchestration
- `src/game/car/` — `CarFactory`, `CarPhysics`, `CarController`, `AiController`
- `src/game/track/` — `TrackDefinition`, `TrackBuilder`, `HazardSystem`
- `src/game/race/` — `RaceManager`, `StartSequence`, `Minimap`
- `src/game/camera/` — `TopDownCamera`
- `src/game/collision/` — `CollisionSystem`
- `src/game/effects/` — `CollisionParticleSystem`, `TireSmokeSystem`
- `src/game/scene/` — `TableScene`, `LightingSetup`, `ObstacleFactory`, `TrackBoundaryObjects`, `TireMarkSystem`, `KitchenItems`, `ProceduralTextures`
- `src/components/hud/` — `Speedometer`, `LapTimer`, `Countdown`, `MinimapDisplay`, `PositionIndicator`
- `src/components/screens/` — `MainMenu`, `TrackSelect`, `CarSelect`, `LapSelect`, `RaceScreen`, `Scoreboard`
- `src/constants/` — `cars.ts`, `track.ts`, `physics.ts`
- `src/state/` — `GameStateEmitter`
- `src/types/game.ts` — shared types
- `src/assets/tracks/` — track preview images

The Three.js game loop runs independently of React; React handles UI overlays (HUD, menus). `GameEngine` is instantiated imperatively inside `RaceScreen`.
