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

This is a React 19 + TypeScript + Vite project bootstrapped as a 3D game prototype. Currently at the initial scaffold stage — `src/App.tsx` is the single entry component, rendered via `src/main.tsx`.

**TypeScript config is strict**: `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly`, and `verbatimModuleSyntax` are all enabled. Use `import type` for type-only imports.

No 3D library has been added yet. When integrating one (e.g. Three.js / React Three Fiber / Babylon.js), the game loop, scene management, and asset loading should be structured separately from React UI components.
