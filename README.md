# 3D Racing Game Prototype

A top-down 3D racing game built with React 19 + TypeScript + Three.js. Supports single-player racing, practice mode, and local versus (split-input) mode.

## Tech Stack

- **React 19** — UI overlays (HUD, menus, screens)
- **Three.js 0.183** — 3D rendering, game loop
- **Yuka 0.7.8** — AI steering / pathfinding for bot opponents
- **Vite 8** — dev server + build
- **TypeScript 5.9** (strict mode)

## Getting Started

```bash
npm install
npm run dev       # Start dev server with HMR
npm run preview   # Preview production build
```

## Game Modes

- **Race** — single-player race against AI bots across multiple laps
- **Practice** — free drive with no opponents or timers
- **Versus** — local multiplayer (two players on one keyboard)

## Controls

| Action | Player 1 | Player 2 |
|--------|----------|----------|
| Accelerate | W / ↑ | — |
| Brake/Reverse | S / ↓ | — |
| Steer | A / D | — |
| Handbrake | Space | — |

*(Versus mode binds a second set of keys for Player 2)*

## Project Structure

```
src/
├── App.tsx                     # Phase router: menu → trackSelect → carSelect → lapSelect → racing
├── constants/                  # cars.ts, track.ts, physics.ts, camera.ts, aiRacer.ts
├── types/game.ts               # Shared types
├── state/                      # GameStateEmitter, VersusStateEmitter
├── hooks/                      # useGameState, useGameEngine, useVersusGameState, useVersusGameEngine
├── game/
│   ├── GameEngine.ts           # Single-player game loop
│   ├── VersusGameEngine.ts     # Versus game loop
│   ├── PracticeEngine.ts       # Practice game loop
│   ├── InputManager.ts
│   ├── car/                    # CarFactory, CarPhysics, CarController
│   ├── ai/                     # AIManager, pathUtils (Yuka-based)
│   ├── track/                  # TrackDefinition, TrackBuilder, HazardSystem
│   ├── race/                   # RaceManager, VersusRaceManager, StartSequence, Minimap
│   ├── camera/                 # TopDownCamera
│   ├── collision/              # CollisionSystem
│   ├── effects/                # CollisionParticleSystem, TireSmokeSystem, SplatterDecalSystem, HazardSplashSystem
│   └── scene/                  # TableScene, LightingSetup, ObstacleFactory, TrackBoundaryObjects, TireMarkSystem, KitchenItems, ProceduralTextures
└── components/
    ├── hud/                    # Speedometer, LapTimer, Countdown, MinimapDisplay, PositionIndicator, WrongWayIndicator, VersusScoreDisplay, VersusRoundOverlay, CheckpointTimer
    └── screens/                # MainMenu, TrackSelect, CarSelect, LapSelect, RaceScreen, PracticeScreen, VersusCarSelect, VersusRaceScreen, VersusEndScreen, Scoreboard, TrackEditor
```

## Development Commands

```bash
npm run dev           # Dev server (HMR)
npm run build         # Production build
npm run type-check    # TypeScript check
npm run lint          # ESLint (flat config v9+)
npm run preview       # Preview build
```
