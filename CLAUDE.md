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
- `src/game/effects/` — `CollisionParticleSystem`, `TireSmokeSystem`, `SplatterDecalSystem`, `HazardSplashSystem`, `RainHazardSystem`, `updateTireEffects`
- `src/game/hazard/` — `types`, `updateHazardSplash`
- `src/game/audio/` — `AudioManager`, `AudioPrefs`, `CarAudioNode`, `MenuMusicPlayer`, `SoundSynthesizer`
- `src/game/scene/` — `TableScene`, `LightingSetup`, `ObstacleFactory`, `TrackBoundaryObjects`, `TireMarkSystem`, `KitchenItems`, `ProceduralTextures`
- `src/game/ControlsPrefs.ts` — key binding persistence
- `src/components/hud/` — `Speedometer`, `LapTimer`, `CheckpointTimer`, `Countdown`, `MinimapDisplay`, `PositionIndicator`, `WrongWayIndicator`, `VersusScoreDisplay`, `VersusRoundOverlay`, `VolumeControls`, `SegmentPanel`
- `src/components/screens/` — `MainMenu`, `TrackSelect`, `CarSelect`, `LapSelect`, `RaceScreen`, `PracticeScreen`, `VersusCarSelect`, `VersusRaceScreen`, `VersusEndScreen`, `Scoreboard`, `TrackEditor`, `OptionsScreen`, `RandomizerSelect`, `MenuCarAnimations`
- `src/components/shared/` — `CarPreview`
- `src/constants/` — `cars.ts`, `track.ts`, `physics.ts`, `camera.ts`, `aiRacer.ts`, `effects.ts`, `audio.ts`, `trackEditor.ts`, `randomizer.ts`
- `src/state/` — `GameStateEmitter`, `VersusStateEmitter`
- `src/hooks/` — `useGameState`, `useGameEngine`, `useVersusGameState`, `useVersusGameEngine`, `useAutoHideCursor`
- `src/types/game.ts` — shared types

The Three.js game loop runs independently of React; React handles UI overlays (HUD, menus). Engine classes are instantiated imperatively inside their respective screen components.

## Key Types & Interfaces (`src/types/game.ts`)

| Type | Purpose |
|---|---|
| `RacePhase` | Union of all app navigation phases |
| `CarDefinition` | Static car stats (`id`, `name`, `color`, `maxSpeed`, `acceleration`, `handling`, `braking`) |
| `CarState` | Full per-car runtime state including position, physics, lap/checkpoint tracking |
| `GameState` | HUD-facing race state emitted to React at ~15fps |
| `VersusGameState` | HUD-facing versus state (scores, round phase, both player speeds) |
| `TrackConfig` | Track definition: control points, hazards, width, checkpoints, objects, lights, tunnels, boost/rain zones |
| `HazardZone` | Hazard placement: `type` + either T-range (legacy) or circle format |
| `HazardEffect` | Per-hazard physics modifiers: `speedMultiplier`, `steeringMultiplier`, `lateralDrift` |
| `RaceResult` | Post-race entry: position, carId, name, color, times, isPlayer |
| `RandomizerMutation` | Single stat tweak: `target` + `multiplier` |
| `RandomizerValues` | All multipliers (default `1.0`) applied to engines at race start |
| `MinimapCar` / `MinimapPoint` / `MinimapStartFinish` | Minimap data passed via `GameState` |
| `PlacedObject` / `PlacedSplatter` / `PlacedLight` | Track editor placement types |
| `PhysicsTelemetry` | Debug/dev snapshot of physics internals per frame |
| `ActionBindings` / `ControlsConfig` | Key binding maps for P1/P2 |
| `AudioPrefs` | `masterVolume` + `musicVolume` (persisted to localStorage) |

## Patterns & Conventions

### State / HUD bridge
Engines emit `GameState` / `VersusGameState` via `GameStateEmitter` / `VersusStateEmitter` (throttled ~15fps pub/sub). React hooks subscribe and return the latest snapshot:
```ts
// in engine
this.emitter.emit(state);            // throttled; pass force=true for immediate
// in component
const state = useGameState(emitter); // re-renders at ~15fps
```
`subscribe()` returns an unsubscribe function used as the `useEffect` cleanup.

### Persistence (localStorage)
All prefs use a `load*` / `save*` / `reset*` pattern with try/catch and `kgp_` key prefix:
- `loadAudioPrefs()` / `saveAudioPrefs(partial)` — `kgp_audio_prefs`
- `loadSPControlsConfig()` / `saveSPControlsConfig(cfg)` — `kgp_controls_sp`
- `loadControlsConfig()` / `saveControlsConfig(cfg)` — `kgp_controls` (versus)

### Randomizer pipeline
`RandomizerSelect` screen → user picks a `RandomizerCardDef` → `applyMutations(cards)` returns `RandomizerValues` (all fields default `1.0`) → passed as prop to race screen → forwarded to `GameEngine` / `VersusGameEngine` to scale physics constants at init.

### Physics constants grouping
Three separate `as const` objects in `src/constants/physics.ts`:
- `PHYSICS` — base steering, drag, collision radii
- `DRIFT_PHYSICS` — drift/handbrake feel, grip, inertia times
- `CONTROLLER_PHYSICS` — throttle logic thresholds, post-drift boost

### UI framework (Mantine v7)
Screens use Mantine components: `Button`, `Stack`, `Title`, `Text`, `Group`, `Box`, `Slider`, `Divider`, `Table`. Conventions:
- Primary CTA: `<Button color="yellow">` (e.g. Start Race)
- Secondary/neutral: `<Button variant="default">`
- Screen wrapper: `<div className="screen <name>">` with inner `<div className="menu-content">`
- Inline overlay styles (pause, loading) are typed `as const` objects defined outside JSX

### Screen component props
All screen components receive callback props rather than routing directly:
```ts
interface FooScreenProps {
  onBack: () => void;
  onStart: () => void;
  // ...
}
```
Navigation is coordinated by `App.tsx` phase state (`RacePhase`).

### Key binding display
`keyCodeLabel(code: string)` in `ControlsPrefs.ts` converts `KeyboardEvent.code` values to human-readable labels (e.g. `'KeyW'` → `'W'`, `'ArrowUp'` → `'↑'`).

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
