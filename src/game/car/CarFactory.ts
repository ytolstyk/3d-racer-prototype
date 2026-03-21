import * as THREE from 'three';
import type { CarDefinition } from '../../types/game.js';

// Shared materials (created once)
const CARBON  = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6, metalness: 0.3 });
const RUBBER  = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.95, metalness: 0.0 });
const SILVER  = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.25, metalness: 0.8 });
const DARK_GLASS = new THREE.MeshStandardMaterial({ color: 0x0d1a2a, roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.82 });
const HEADLIGHT_MAT = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.0, roughness: 0.1 });
const TAILLIGHT_MAT = new THREE.MeshStandardMaterial({ color: 0xff1a00, emissive: 0xff2200, emissiveIntensity: 1.2, roughness: 0.1 });

function box(w: number, h: number, d: number): THREE.BoxGeometry { return new THREE.BoxGeometry(w, h, d); }
function cyl(rt: number, rb: number, h: number, seg = 12): THREE.CylinderGeometry { return new THREE.CylinderGeometry(rt, rb, h, seg); }

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0, shadow = true): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  if (shadow) { m.castShadow = true; m.receiveShadow = true; }
  return m;
}

export class CarFactory {
  createCar(definition: CarDefinition): THREE.Group {
    const paint = new THREE.MeshStandardMaterial({
      color: definition.color,
      roughness: 0.22,
      metalness: 0.55,
    });
    const accent = new THREE.MeshStandardMaterial({
      color: definition.accentColor,
      roughness: 0.35,
      metalness: 0.2,
    });

    switch (definition.id) {
      case 'racer-red':   return this.buildF1(paint, accent);
      case 'sir-skids':   return this.buildMuscle(paint, accent);
      case 'captain-crumb': return this.buildHatchback(paint, accent);
      case 'butterknife': return this.buildSports(paint, accent);
      case 'sauce-boss':  return this.buildSUV(paint, accent);
      case 'lil-pepper':  return this.buildMini(paint, accent);
      default:            return this.buildGeneric(paint, accent);
    }
  }

  // ── F1 (racer-red) ────────────────────────────────────────────────────────
  private buildF1(paint: THREE.MeshStandardMaterial, accent: THREE.MeshStandardMaterial): THREE.Group {
    const g = new THREE.Group();

    // Floor pan — wide and flat
    g.add(mesh(box(2.5, 0.1, 5.0), CARBON, 0, 0.13, 0));

    // Nose cone
    g.add(mesh(box(0.6, 0.1, 2.0), paint, 0, 0.17, 2.3));

    // Front wing
    g.add(mesh(box(3.2, 0.07, 0.75), accent, 0, 0.17, 3.3));
    // Wing endplates
    for (const sx of [-1, 1]) {
      g.add(mesh(box(0.08, 0.35, 0.75), accent, sx * 1.54, 0.35, 3.3));
    }

    // Central tub/monocoque
    g.add(mesh(box(0.95, 0.42, 3.0), paint, 0, 0.4, 0));

    // Side pods
    for (const sx of [-1, 1]) {
      g.add(mesh(box(0.4, 0.28, 1.7), paint, sx * 0.72, 0.28, -0.1));
    }

    // Open cockpit pod
    g.add(mesh(box(0.62, 0.35, 0.9), paint, 0, 0.68, 0.45));

    // Rear wing posts
    for (const sx of [-1, 1]) {
      g.add(mesh(box(0.09, 0.8, 0.09), CARBON, sx * 0.56, 0.92, -2.05));
    }
    // Rear wing blade
    g.add(mesh(box(1.65, 0.09, 0.42), accent, 0, 1.48, -2.05));

    // Rear diffuser
    g.add(mesh(box(1.8, 0.09, 0.8), CARBON, 0, 0.12, -2.1));

    // Headlights
    for (const sx of [-1, 1]) {
      g.add(mesh(box(0.35, 0.08, 0.06), HEADLIGHT_MAT, sx * 0.5, 0.2, 3.22));
    }
    // Taillights
    for (const sx of [-1, 1]) {
      g.add(mesh(box(0.3, 0.1, 0.06), TAILLIGHT_MAT, sx * 0.48, 0.26, -2.4));
    }

    // Wheels — F1 style (wider front track)
    const wheelPos: [number, number, number][] = [
      [-1.3, 0.4, 1.8], [1.3, 0.4, 1.8],
      [-1.25, 0.4, -1.7], [1.25, 0.4, -1.7],
    ];
    for (const [wx, wy, wz] of wheelPos) {
      this.addWheel(g, wx, wy, wz, accent);
    }

    return g;
  }

  // ── Muscle car (sir-skids) ─────────────────────────────────────────────────
  private buildMuscle(paint: THREE.MeshStandardMaterial, accent: THREE.MeshStandardMaterial): THREE.Group {
    const g = new THREE.Group();

    // Floor pan
    g.add(mesh(box(2.35, 0.15, 4.4), CARBON, 0, 0.25, 0));

    // Main body — wide and squat
    g.add(mesh(box(2.35, 0.52, 4.4), paint, 0, 0.62, 0));

    // Raised hood
    g.add(mesh(box(2.05, 0.4, 1.7), paint, 0, 0.88, 1.35));

    // Cab
    g.add(mesh(box(1.9, 0.72, 1.85), paint, 0, 1.12, -0.2));

    // Roof
    g.add(mesh(box(1.8, 0.12, 1.7), paint, 0, 1.52, -0.2));

    // High rear deck
    g.add(mesh(box(2.1, 0.12, 0.85), paint, 0, 1.05, -1.9));

    // Rear spoiler
    g.add(mesh(box(2.0, 0.22, 0.14), accent, 0, 1.22, -2.1));

    // Wheel arches (flared)
    for (const [ax, az] of [[-1.18, 1.55], [1.18, 1.55], [-1.18, -1.45], [1.18, -1.45]] as [number, number][]) {
      g.add(mesh(box(0.52, 0.45, 1.2), paint, ax, 0.52, az));
    }

    // Dual exhaust
    for (const sx of [-1, 1]) {
      const ex = mesh(cyl(0.1, 0.12, 0.38, 8), CARBON, sx * 0.58, 0.42, -2.2);
      ex.rotation.x = Math.PI / 2;
      g.add(ex);
    }

    // Windscreen
    const ws = mesh(box(1.6, 0.52, 0.08), DARK_GLASS, 0, 1.08, 0.88);
    ws.rotation.x = -0.42;
    g.add(ws);

    // Rear window
    const rw = mesh(box(1.6, 0.45, 0.08), DARK_GLASS, 0, 1.04, -1.1);
    rw.rotation.x = 0.44;
    g.add(rw);

    // Headlights
    for (const sx of [-1, 1]) {
      g.add(mesh(box(0.5, 0.16, 0.07), HEADLIGHT_MAT, sx * 0.66, 0.56, 2.18));
    }
    // Taillights
    for (const sx of [-1, 1]) {
      g.add(mesh(box(0.54, 0.18, 0.07), TAILLIGHT_MAT, sx * 0.64, 0.56, -2.18));
    }

    const wheelPos: [number, number, number][] = [
      [-1.25, 0.44, 1.55], [1.25, 0.44, 1.55],
      [-1.25, 0.44, -1.45], [1.25, 0.44, -1.45],
    ];
    for (const [wx, wy, wz] of wheelPos) {
      this.addWheel(g, wx, wy, wz, accent);
    }

    return g;
  }

  // ── Hatchback (captain-crumb) ──────────────────────────────────────────────
  private buildHatchback(paint: THREE.MeshStandardMaterial, accent: THREE.MeshStandardMaterial): THREE.Group {
    const g = new THREE.Group();

    // Floor pan
    g.add(mesh(box(2.0, 0.14, 3.6), CARBON, 0, 0.2, 0));

    // Main body
    g.add(mesh(box(2.0, 0.5, 3.6), paint, 0, 0.54, 0));

    // Tall cab box
    g.add(mesh(box(1.85, 0.95, 2.45), paint, 0, 1.04, -0.05));

    // Flat roof
    g.add(mesh(box(1.78, 0.1, 2.3), paint, 0, 1.56, -0.05));

    // Windscreen (moderately angled)
    const ws = mesh(box(1.68, 0.58, 0.08), DARK_GLASS, 0, 1.12, 1.18);
    ws.rotation.x = -0.38;
    g.add(ws);

    // Rear window (nearly vertical — hatchback style)
    const rw = mesh(box(1.68, 0.6, 0.08), DARK_GLASS, 0, 1.1, -1.22);
    rw.rotation.x = 0.22;
    g.add(rw);

    // Side windows
    for (const sx of [-1, 1]) {
      g.add(mesh(box(0.07, 0.38, 1.05), DARK_GLASS, sx * 0.94, 1.05, 0.0));
    }

    // Front bumper
    g.add(mesh(box(2.0, 0.3, 0.22), CARBON, 0, 0.38, 1.78));

    // Rear hatch slope
    g.add(mesh(box(1.82, 0.45, 0.1), paint, 0, 1.27, -1.72));

    // Headlights
    for (const sx of [-1, 1]) {
      g.add(mesh(box(0.44, 0.15, 0.07), HEADLIGHT_MAT, sx * 0.64, 0.52, 1.85));
    }
    // Taillights (wide)
    for (const sx of [-1, 1]) {
      g.add(mesh(box(0.5, 0.16, 0.07), TAILLIGHT_MAT, sx * 0.62, 0.52, -1.85));
    }

    // Smaller wheels
    const wheelPos: [number, number, number][] = [
      [-1.18, 0.38, 1.3], [1.18, 0.38, 1.3],
      [-1.18, 0.38, -1.3], [1.18, 0.38, -1.3],
    ];
    for (const [wx, wy, wz] of wheelPos) {
      this.addWheel(g, wx, wy, wz, accent, 0.36);
    }

    return g;
  }

  // ── Sports car (butterknife) ───────────────────────────────────────────────
  private buildSports(paint: THREE.MeshStandardMaterial, accent: THREE.MeshStandardMaterial): THREE.Group {
    const g = new THREE.Group();

    // Floor pan — long and low
    g.add(mesh(box(1.72, 0.1, 5.2), CARBON, 0, 0.14, 0));

    // Main body — very low
    g.add(mesh(box(1.72, 0.38, 5.0), paint, 0, 0.36, 0));

    // Long sloping hood
    g.add(mesh(box(1.52, 0.22, 2.6), paint, 0, 0.44, 1.65));

    // Cab — short and low
    g.add(mesh(box(1.42, 0.55, 1.65), paint, 0, 0.65, -0.35));

    // Roof (narrow, tapers)
    g.add(mesh(box(1.3, 0.1, 1.5), paint, 0, 0.97, -0.35));

    // Flying buttress rear supports
    for (const sx of [-1, 1]) {
      const buttress = mesh(box(0.09, 0.55, 1.15), paint, sx * 0.65, 0.7, -1.55);
      buttress.rotation.z = sx * 0.14;
      g.add(buttress);
    }

    // Rear flat diffuser
    g.add(mesh(box(1.72, 0.09, 1.1), CARBON, 0, 0.14, -2.25));

    // Small rear spoiler
    g.add(mesh(box(1.5, 0.1, 0.32), accent, 0, 1.05, -2.25));

    // Windscreen (steeply raked)
    const ws = mesh(box(1.32, 0.52, 0.08), DARK_GLASS, 0, 0.76, 0.72);
    ws.rotation.x = -0.62;
    g.add(ws);

    // Rear window
    const rw = mesh(box(1.28, 0.42, 0.08), DARK_GLASS, 0, 0.72, -1.12);
    rw.rotation.x = 0.58;
    g.add(rw);

    // Headlights
    for (const sx of [-1, 1]) {
      g.add(mesh(box(0.4, 0.1, 0.07), HEADLIGHT_MAT, sx * 0.58, 0.36, 2.55));
    }
    // Taillights
    for (const sx of [-1, 1]) {
      g.add(mesh(box(0.42, 0.12, 0.07), TAILLIGHT_MAT, sx * 0.56, 0.38, -2.55));
    }

    const wheelPos: [number, number, number][] = [
      [-1.14, 0.42, 1.85], [1.14, 0.42, 1.85],
      [-1.14, 0.42, -1.85], [1.14, 0.42, -1.85],
    ];
    for (const [wx, wy, wz] of wheelPos) {
      this.addWheel(g, wx, wy, wz, accent);
    }

    return g;
  }

  // ── SUV/Rally (sauce-boss) ─────────────────────────────────────────────────
  private buildSUV(paint: THREE.MeshStandardMaterial, accent: THREE.MeshStandardMaterial): THREE.Group {
    const g = new THREE.Group();

    // High-clearance floor pan
    g.add(mesh(box(2.3, 0.18, 4.4), CARBON, 0, 0.52, 0));

    // Main body — tall and boxy
    g.add(mesh(box(2.3, 0.75, 4.4), paint, 0, 1.02, 0));

    // Cab — boxy roofline
    g.add(mesh(box(2.12, 0.85, 2.25), paint, 0, 1.65, -0.2));

    // Flat roof
    g.add(mesh(box(2.05, 0.12, 2.1), paint, 0, 2.1, -0.2));

    // Roof rack bars
    for (const rz of [-0.7, 0, 0.7]) {
      g.add(mesh(box(1.85, 0.06, 0.3), CARBON, 0, 2.24, rz - 0.2));
    }
    // Roof rack rails
    for (const rx of [-0.85, 0.85]) {
      g.add(mesh(box(0.06, 0.06, 1.85), CARBON, rx, 2.24, -0.2));
    }

    // Bull bar at front
    g.add(mesh(box(2.2, 0.55, 0.32), CARBON, 0, 0.95, 2.2));
    for (const sx of [-1, 1]) {
      g.add(mesh(box(0.12, 0.8, 0.12), CARBON, sx * 0.88, 0.88, 2.3));
    }

    // Boxy windscreen
    g.add(mesh(box(1.98, 0.7, 0.1), DARK_GLASS, 0, 1.78, 1.12));

    // Rear window
    g.add(mesh(box(1.98, 0.65, 0.1), DARK_GLASS, 0, 1.75, -1.3));

    // Side windows
    for (const sx of [-1, 1]) {
      g.add(mesh(box(0.08, 0.5, 0.95), DARK_GLASS, sx * 1.06, 1.72, -0.2));
    }

    // Headlights
    for (const sx of [-1, 1]) {
      g.add(mesh(box(0.52, 0.18, 0.08), HEADLIGHT_MAT, sx * 0.72, 0.96, 2.2));
    }
    // Taillights
    for (const sx of [-1, 1]) {
      g.add(mesh(box(0.54, 0.2, 0.08), TAILLIGHT_MAT, sx * 0.7, 0.96, -2.2));
    }

    // Skid plate
    g.add(mesh(box(2.0, 0.08, 0.6), CARBON, 0, 0.42, 2.0));

    const wheelPos: [number, number, number][] = [
      [-1.3, 0.56, 1.58], [1.3, 0.56, 1.58],
      [-1.3, 0.56, -1.58], [1.3, 0.56, -1.58],
    ];
    for (const [wx, wy, wz] of wheelPos) {
      this.addWheel(g, wx, wy, wz, accent, 0.48);
    }

    return g;
  }

  // ── Mini (lil-pepper) ─────────────────────────────────────────────────────
  private buildMini(paint: THREE.MeshStandardMaterial, accent: THREE.MeshStandardMaterial): THREE.Group {
    const g = new THREE.Group();

    // Floor pan — short and narrow
    g.add(mesh(box(1.62, 0.12, 3.05), CARBON, 0, 0.18, 0));

    // Main body
    g.add(mesh(box(1.62, 0.38, 3.05), paint, 0, 0.44, 0));

    // Dome cab — sphere-based
    const dome = mesh(new THREE.SphereGeometry(0.78, 10, 8), paint, 0, 0.92, -0.08);
    dome.scale.set(1, 0.88, 1.05);
    g.add(dome);

    // Stubby hood
    g.add(mesh(box(1.44, 0.22, 0.85), paint, 0, 0.5, 1.3));

    // Windscreen
    const ws = mesh(box(1.2, 0.48, 0.07), DARK_GLASS, 0, 0.88, 0.75);
    ws.rotation.x = -0.32;
    g.add(ws);

    // Rear window
    const rw = mesh(box(1.2, 0.42, 0.07), DARK_GLASS, 0, 0.82, -0.78);
    rw.rotation.x = 0.3;
    g.add(rw);

    // Small spoiler nub
    g.add(mesh(box(1.1, 0.1, 0.2), accent, 0, 1.0, -1.38));

    // Front bumper
    g.add(mesh(box(1.62, 0.28, 0.18), CARBON, 0, 0.34, 1.5));

    // Headlights (round)
    for (const sx of [-1, 1]) {
      const hl = mesh(new THREE.SphereGeometry(0.15, 8, 6), HEADLIGHT_MAT, sx * 0.5, 0.44, 1.58);
      hl.scale.z = 0.5;
      g.add(hl);
    }
    // Taillights
    for (const sx of [-1, 1]) {
      g.add(mesh(box(0.32, 0.12, 0.06), TAILLIGHT_MAT, sx * 0.48, 0.44, -1.55));
    }

    const wheelPos: [number, number, number][] = [
      [-1.05, 0.38, 1.1], [1.05, 0.38, 1.1],
      [-1.05, 0.38, -1.1], [1.05, 0.38, -1.1],
    ];
    for (const [wx, wy, wz] of wheelPos) {
      this.addWheel(g, wx, wy, wz, accent, 0.36);
    }

    return g;
  }

  // ── Generic fallback ───────────────────────────────────────────────────────
  private buildGeneric(paint: THREE.MeshStandardMaterial, accent: THREE.MeshStandardMaterial): THREE.Group {
    const g = new THREE.Group();

    g.add(mesh(box(2.05, 0.14, 4.0), CARBON, 0, 0.22, 0));
    g.add(mesh(box(2.05, 0.48, 3.8), paint, 0, 0.54, 0));

    for (const [ax, az] of [[-1.02, 1.38], [1.02, 1.38], [-1.02, -1.38], [1.02, -1.38]] as [number, number][]) {
      g.add(mesh(box(0.48, 0.38, 1.05), paint, ax, 0.5, az));
    }

    g.add(mesh(box(1.7, 0.58, 2.15), paint, 0, 0.98, 0.05));
    g.add(mesh(box(1.6, 0.1, 1.9), paint, 0, 1.32, 0.05));

    const ws = mesh(box(1.5, 0.48, 0.07), DARK_GLASS, 0, 1.04, 1.08);
    ws.rotation.x = -0.48;
    g.add(ws);

    const rw = mesh(box(1.5, 0.4, 0.07), DARK_GLASS, 0, 1.0, -0.98);
    rw.rotation.x = 0.5;
    g.add(rw);

    g.add(mesh(box(0.55, 0.02, 1.4), accent, 0, 0.79, 0.8));
    g.add(mesh(box(2.05, 0.32, 0.22), CARBON, 0, 0.36, 1.98));

    for (const sx of [-1, 1]) {
      g.add(mesh(box(0.48, 0.14, 0.06), HEADLIGHT_MAT, sx * 0.64, 0.48, 2.1));
    }

    g.add(mesh(box(2.05, 0.3, 0.22), CARBON, 0, 0.36, -1.98));
    for (const sx of [-1, 1]) {
      g.add(mesh(box(0.52, 0.16, 0.06), TAILLIGHT_MAT, sx * 0.62, 0.48, -2.1));
    }

    for (const sx of [-1, 1]) {
      g.add(mesh(box(0.07, 0.28, 0.07), CARBON, sx * 0.68, 1.3, -1.92));
    }
    g.add(mesh(box(1.48, 0.07, 0.32), accent, 0, 1.5, -1.92));

    const wheelPositions: [number, number, number][] = [
      [-1.22, 0.42, 1.38], [1.22, 0.42, 1.38],
      [-1.22, 0.42, -1.38], [1.22, 0.42, -1.38],
    ];
    for (const [wx, wy, wz] of wheelPositions) {
      this.addWheel(g, wx, wy, wz, accent);
    }

    return g;
  }

  private addWheel(
    g: THREE.Group,
    x: number,
    y: number,
    z: number,
    accent: THREE.MeshStandardMaterial,
    radius = 0.42,
  ): void {
    const tyre = new THREE.Mesh(cyl(radius, radius, 0.4, 16), RUBBER);
    tyre.rotation.z = Math.PI / 2;
    tyre.position.set(x, y, z);
    tyre.castShadow = true;
    tyre.receiveShadow = true;
    g.add(tyre);

    const rim = new THREE.Mesh(cyl(radius * 0.69, radius * 0.69, 0.42, 12), SILVER);
    rim.rotation.z = Math.PI / 2;
    rim.position.set(x, y, z);
    rim.castShadow = true;
    g.add(rim);

    for (let s = 0; s < 5; s++) {
      const angle = (s / 5) * Math.PI * 2;
      const spoke = new THREE.Mesh(box(radius * 1.0, 0.05, 0.06), SILVER);
      spoke.rotation.z = Math.PI / 2;
      spoke.rotation.x = angle;
      spoke.position.set(x, y, z);
      g.add(spoke);
    }

    const sidewall = new THREE.Mesh(cyl(radius, radius, 0.05, 16), accent);
    sidewall.rotation.z = Math.PI / 2;
    sidewall.position.set(x, y, z);
    g.add(sidewall);
  }

  createNameplate(name: string, color: number): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.roundRect(4, 4, 248, 56, 10);
    ctx.fill();

    ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
    ctx.fillRect(8, 8, 6, 48);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, 132, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(6, 1.5, 1);
    sprite.position.y = 3;

    return sprite;
  }
}
