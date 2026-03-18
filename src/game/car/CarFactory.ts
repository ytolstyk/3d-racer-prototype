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
    const g = new THREE.Group();

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

    // ── Floor pan ─────────────────────────────────────────────────────
    g.add(mesh(box(2.05, 0.14, 4.0), CARBON, 0, 0.22, 0));

    // ── Main body slab ────────────────────────────────────────────────
    g.add(mesh(box(2.05, 0.48, 3.8), paint, 0, 0.54, 0));

    // ── Wheel arch extensions (4 corners) ────────────────────────────
    for (const [ax, az] of [[-1.02, 1.38], [1.02, 1.38], [-1.02, -1.38], [1.02, -1.38]] as [number, number][]) {
      g.add(mesh(box(0.48, 0.38, 1.05), paint, ax, 0.5, az));
    }

    // ── Cab / passenger cell ─────────────────────────────────────────
    g.add(mesh(box(1.7, 0.58, 2.15), paint, 0, 0.98, 0.05));

    // ── Roof ─────────────────────────────────────────────────────────
    g.add(mesh(box(1.6, 0.1, 1.9), paint, 0, 1.32, 0.05));

    // ── Windscreen (front, angled) ────────────────────────────────────
    const ws = mesh(box(1.5, 0.48, 0.07), DARK_GLASS, 0, 1.04, 1.08);
    ws.rotation.x = -0.48;
    g.add(ws);

    // ── Rear window (angled) ──────────────────────────────────────────
    const rw = mesh(box(1.5, 0.4, 0.07), DARK_GLASS, 0, 1.0, -0.98);
    rw.rotation.x = 0.5;
    g.add(rw);

    // ── Side windows ─────────────────────────────────────────────────
    for (const sx of [-1, 1]) {
      g.add(mesh(box(0.06, 0.34, 0.95), DARK_GLASS, sx * 0.87, 0.97, 0.05));
    }

    // ── Hood accent stripe ────────────────────────────────────────────
    g.add(mesh(box(0.55, 0.02, 1.4), accent, 0, 0.79, 0.8));

    // ── Front bumper ─────────────────────────────────────────────────
    g.add(mesh(box(2.05, 0.32, 0.22), CARBON, 0, 0.36, 1.98));

    // ── Front grille ─────────────────────────────────────────────────
    g.add(mesh(box(1.1, 0.18, 0.08), CARBON, 0, 0.3, 2.1));

    // ── Headlights ───────────────────────────────────────────────────
    for (const sx of [-1, 1]) {
      g.add(mesh(box(0.48, 0.14, 0.06), HEADLIGHT_MAT, sx * 0.64, 0.48, 2.1));
    }

    // ── Rear bumper ──────────────────────────────────────────────────
    g.add(mesh(box(2.05, 0.3, 0.22), CARBON, 0, 0.36, -1.98));

    // ── Taillights ───────────────────────────────────────────────────
    for (const sx of [-1, 1]) {
      g.add(mesh(box(0.52, 0.16, 0.06), TAILLIGHT_MAT, sx * 0.62, 0.48, -2.1));
    }

    // ── Rear spoiler ─────────────────────────────────────────────────
    // Posts
    for (const sx of [-1, 1]) {
      g.add(mesh(box(0.07, 0.28, 0.07), CARBON, sx * 0.68, 1.3, -1.92));
    }
    // Blade
    g.add(mesh(box(1.48, 0.07, 0.32), accent, 0, 1.5, -1.92));

    // ── Exhaust tips ─────────────────────────────────────────────────
    for (const sx of [-1, 1]) {
      const ex = mesh(cyl(0.07, 0.08, 0.14, 8), CARBON, sx * 0.55, 0.22, -2.04);
      ex.rotation.x = Math.PI / 2;
      g.add(ex);
    }

    // ── Wheels ───────────────────────────────────────────────────────
    const wheelPositions: [number, number, number][] = [
      [-1.22, 0.42, 1.38],
      [ 1.22, 0.42, 1.38],
      [-1.22, 0.42, -1.38],
      [ 1.22, 0.42, -1.38],
    ];
    for (const [wx, wy, wz] of wheelPositions) {
      this.addWheel(g, wx, wy, wz, accent);
    }

    return g;
  }

  private addWheel(g: THREE.Group, x: number, y: number, z: number, accent: THREE.MeshStandardMaterial): void {
    // Tyre — wide and chunky
    const tyre = new THREE.Mesh(cyl(0.42, 0.42, 0.4, 16), RUBBER);
    tyre.rotation.z = Math.PI / 2;
    tyre.position.set(x, y, z);
    tyre.castShadow = true;
    tyre.receiveShadow = true;
    g.add(tyre);

    // Rim
    const rim = new THREE.Mesh(cyl(0.29, 0.29, 0.42, 12), SILVER);
    rim.rotation.z = Math.PI / 2;
    rim.position.set(x, y, z);
    rim.castShadow = true;
    g.add(rim);

    // Rim spokes (5)
    for (let s = 0; s < 5; s++) {
      const angle = (s / 5) * Math.PI * 2;
      const spoke = new THREE.Mesh(box(0.42, 0.05, 0.06), SILVER);
      spoke.rotation.z = Math.PI / 2;
      spoke.rotation.x = angle;
      spoke.position.set(x, y, z);
      g.add(spoke);
    }

    // Tyre sidewall accent ring
    const sidewall = new THREE.Mesh(cyl(0.42, 0.42, 0.05, 16), accent);
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
