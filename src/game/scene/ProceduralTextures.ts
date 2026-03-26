import * as THREE from 'three';

function makeCanvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  return [c, ctx];
}

/** Seeded pseudo-random for reproducible noise */
function seededRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

/** Irregular blob splat with alpha — used for hazard zone overlays. */
function makeSplatTexture(size: number, baseColor: string, blobColor: string, seed: number): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(size);
  const rng = seededRng(seed);

  ctx.clearRect(0, 0, size, size);

  const center = size / 2;
  const baseRadius = center * 0.42;

  // Main organic blob via bezier curves
  ctx.globalAlpha = 0.75;
  ctx.fillStyle = baseColor;
  const blobPts = 10;
  const angles: number[] = [];
  const radii: number[] = [];
  for (let i = 0; i < blobPts; i++) {
    angles.push((i / blobPts) * Math.PI * 2);
    radii.push(baseRadius * (0.7 + rng() * 0.6));
  }
  ctx.beginPath();
  for (let i = 0; i < blobPts; i++) {
    const a0 = angles[i];
    const a1 = angles[(i + 1) % blobPts];
    const r0 = radii[i];
    const r1 = radii[(i + 1) % blobPts];
    const x0 = center + Math.cos(a0) * r0;
    const y0 = center + Math.sin(a0) * r0;
    const x1 = center + Math.cos(a1) * r1;
    const y1 = center + Math.sin(a1) * r1;
    const aMid = (a0 + a1) / 2;
    const rCtrl = baseRadius * (0.55 + rng() * 0.9);
    const cx1 = center + Math.cos(aMid) * rCtrl;
    const cy1 = center + Math.sin(aMid) * rCtrl;
    if (i === 0) ctx.moveTo(x0, y0);
    ctx.bezierCurveTo(cx1, cy1, cx1, cy1, x1, y1);
  }
  ctx.closePath();
  ctx.fill();

  // Arms/tendrils radiating outward
  const numArms = 4 + Math.floor(rng() * 4);
  for (let i = 0; i < numArms; i++) {
    const angle = rng() * Math.PI * 2;
    const len = baseRadius * (0.15 + rng() * 0.4);
    const ax = center + Math.cos(angle) * (baseRadius * 0.6);
    const ay = center + Math.sin(angle) * (baseRadius * 0.6);
    const ex = ax + Math.cos(angle) * len;
    const ey = ay + Math.sin(angle) * len;
    ctx.save();
    ctx.translate(ex, ey);
    ctx.rotate(angle);
    ctx.globalAlpha = 0.45 + rng() * 0.3;
    ctx.fillStyle = rng() > 0.5 ? baseColor : blobColor;
    ctx.beginPath();
    ctx.ellipse(0, 0, len * 0.35, 4 + rng() * 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Peripheral droplets
  const numDrops = 10 + Math.floor(rng() * 7);
  for (let i = 0; i < numDrops; i++) {
    const angle = rng() * Math.PI * 2;
    const dist = baseRadius * (0.6 + rng() * 0.35);
    const dx = center + Math.cos(angle) * dist;
    const dy = center + Math.sin(angle) * dist;
    const dr = 4 + rng() * 8;
    ctx.globalAlpha = 0.4 + rng() * 0.5;
    ctx.fillStyle = rng() > 0.5 ? baseColor : blobColor;
    ctx.beginPath();
    ctx.arc(dx, dy, dr, 0, Math.PI * 2);
    ctx.fill();
  }

  // Tail streaks
  const numStreaks = 2 + Math.floor(rng() * 2);
  for (let i = 0; i < numStreaks; i++) {
    const angle = rng() * Math.PI * 2;
    const len = baseRadius * (0.5 + rng() * 0.6);
    const sx = center + Math.cos(angle) * (baseRadius * 0.3);
    const sy = center + Math.sin(angle) * (baseRadius * 0.3);
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(angle);
    ctx.globalAlpha = 0.3 + rng() * 0.25;
    ctx.fillStyle = baseColor;
    ctx.beginPath();
    ctx.ellipse(len * 0.5, 0, len, 3 + rng() * 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Blue/white polished floor tiles with deep grout lines. */
export function makeFloorTileTexture(size = 512): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(size);
  const cols = 4, rows = 4;
  const tileW = size / cols;
  const tileH = size / rows;
  const grooveThick = 8;

  // Apply soft blur filter before drawing fills for baked DOF-like softness
  ctx.filter = 'blur(6px)';

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * tileW;
      const y = r * tileH;
      // Alternate blue and white tiles in checkerboard-ish pattern
      const isBlue = (r + c) % 2 === 0;
      ctx.fillStyle = isBlue ? '#4a7ab5' : '#e8eef7';
      ctx.fillRect(x, y, tileW, tileH);
    }
  }

  // Grooves
  ctx.filter = 'none';
  ctx.fillStyle = '#111827';
  // Horizontal grooves
  for (let r = 0; r <= rows; r++) {
    ctx.fillRect(0, r * tileH - grooveThick / 2, size, grooveThick);
  }
  // Vertical grooves
  for (let c = 0; c <= cols; c++) {
    ctx.fillRect(c * tileW - grooveThick / 2, 0, grooveThick, size);
  }

  ctx.filter = 'none';
  const scuffRng = seededRng(501);
  for (let i = 0; i < 35; i++) {
    const sx = scuffRng() * size, sy = scuffRng() * size;
    const sw = 3 + scuffRng() * 18, sh = 1 + scuffRng() * 4;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(scuffRng() * Math.PI);
    ctx.globalAlpha = 0.08 + scuffRng() * 0.14;
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.ellipse(0, 0, sw, sh, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function makeOilSplatTexture(size = 512): THREE.CanvasTexture {
  return makeSplatTexture(size, '#3a3a10', '#555520', 201);
}

export function makeJuiceSplatTexture(size = 512): THREE.CanvasTexture {
  return makeSplatTexture(size, '#ff8800', '#ffaa33', 202);
}

export function makeFoodSplatTexture(size = 512): THREE.CanvasTexture {
  return makeSplatTexture(size, '#6a9930', '#88cc44', 203);
}

export function makeMilkSplatTexture(size = 512): THREE.CanvasTexture {
  return makeSplatTexture(size, '#dde8ff', '#f0f5ff', 204);
}

export function makeButterSplatTexture(size = 512): THREE.CanvasTexture {
  return makeSplatTexture(size, '#f5d020', '#ffe55a', 205);
}

/** Ceramic texture for kitchen items — white/cream with subtle speckles. */
export function makeCeramicTexture(size = 256): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(size);
  const rng = seededRng(301);

  ctx.fillStyle = '#f5f0e8';
  ctx.fillRect(0, 0, size, size);

  // Subtle speckles
  for (let i = 0; i < 60; i++) {
    ctx.globalAlpha = 0.05 + rng() * 0.08;
    ctx.fillStyle = rng() > 0.5 ? '#ddd8d0' : '#e8e4dc';
    ctx.beginPath();
    ctx.arc(rng() * size, rng() * size, 2 + rng() * 4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Silver/metallic texture for utensils. */
export function makeSilverTexture(size = 256): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(size);
  const rng = seededRng(302);

  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, '#c0c0c0');
  grad.addColorStop(0.5, '#e0e0e0');
  grad.addColorStop(1, '#b0b0b0');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Scratches
  for (let i = 0; i < 20; i++) {
    ctx.globalAlpha = 0.08 + rng() * 0.1;
    ctx.strokeStyle = '#999999';
    ctx.lineWidth = 0.3 + rng();
    ctx.beginPath();
    ctx.moveTo(rng() * size, rng() * size);
    ctx.lineTo(rng() * size, rng() * size);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Donut glaze — brown/chocolate gradient with colored sprinkle dots. */
export function makeDonutGlazeTexture(size = 256): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(size);
  const rng = seededRng(401);

  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size * 0.6);
  grad.addColorStop(0, '#7b3f00');
  grad.addColorStop(0.6, '#5c2d00');
  grad.addColorStop(1, '#3d1f00');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Sprinkle dots
  const sprinkleColors = ['#ff6699', '#66ccff', '#ffdd33', '#88ee44', '#ff8833', '#cc66ff'];
  for (let i = 0; i < 60; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const w = 3 + rng() * 5;
    const h = 1.5 + rng() * 2;
    const angle = rng() * Math.PI;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = sprinkleColors[Math.floor(rng() * sprinkleColors.length)];
    ctx.globalAlpha = 0.85;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.restore();
  }

  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Bread crust — golden-brown with score lines. */
export function makeBreadCrustTexture(size = 256): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(size);
  const rng = seededRng(402);

  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, '#c8760a');
  grad.addColorStop(0.5, '#a85c06');
  grad.addColorStop(1, '#8a4804');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Score lines
  ctx.strokeStyle = '#5c3000';
  ctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    ctx.globalAlpha = 0.4 + rng() * 0.3;
    const y = (i + 1) * (size / 5) + (rng() - 0.5) * 10;
    ctx.beginPath();
    ctx.moveTo(size * 0.1, y);
    ctx.lineTo(size * 0.9, y + (rng() - 0.5) * 8);
    ctx.stroke();
  }

  // Grain noise
  const imgData = ctx.getImageData(0, 0, size, size);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rng() - 0.5) * 20;
    d[i] = Math.max(0, Math.min(255, d[i] + n));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n * 0.7));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n * 0.3));
  }
  ctx.putImageData(imgData, 0, 0);

  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Salami cross-section — pink/red base with white fat dots. */
export function makeSalamiTexture(size = 256): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(size);
  const rng = seededRng(403);

  ctx.fillStyle = '#c84040';
  ctx.fillRect(0, 0, size, size);

  // White fat dots
  for (let i = 0; i < 40; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const r = 4 + rng() * 10;
    ctx.globalAlpha = 0.7 + rng() * 0.3;
    ctx.fillStyle = '#f0e8e0';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Grain noise
  const imgData = ctx.getImageData(0, 0, size, size);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rng() - 0.5) * 18;
    d[i] = Math.max(0, Math.min(255, d[i] + n));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n * 0.5));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n * 0.5));
  }
  ctx.putImageData(imgData, 0, 0);

  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Apple skin — red gradient with subtle streaks. */
export function makeAppleSkinTexture(size = 256): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(size);
  const rng = seededRng(404);

  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, '#cc2200');
  grad.addColorStop(0.5, '#ee3311');
  grad.addColorStop(1, '#aa1100');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Highlight streaks
  for (let i = 0; i < 15; i++) {
    ctx.globalAlpha = 0.08 + rng() * 0.1;
    ctx.strokeStyle = '#ff8866';
    ctx.lineWidth = 1 + rng() * 3;
    ctx.beginPath();
    const x = rng() * size;
    ctx.moveTo(x, 0);
    ctx.lineTo(x + (rng() - 0.5) * 30, size);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Cheese surface — pale yellow with hole pattern. */
export function makeCheeseTexture(size = 256): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(size);
  const rng = seededRng(405);

  ctx.fillStyle = '#e8d060';
  ctx.fillRect(0, 0, size, size);

  // Holes
  for (let i = 0; i < 20; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const r = 5 + rng() * 12;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, '#8a6000');
    grad.addColorStop(0.5, '#c09020');
    grad.addColorStop(1, 'rgba(200,160,50,0)');
    ctx.fillStyle = grad;
    ctx.globalAlpha = 0.6 + rng() * 0.4;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Cloth/napkin texture. */
export function makeClothTexture(size = 256): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(size);
  const rng = seededRng(303);

  ctx.fillStyle = '#e8e0d0';
  ctx.fillRect(0, 0, size, size);

  // Weave pattern
  ctx.globalAlpha = 0.1;
  ctx.strokeStyle = '#d0c8b8';
  for (let i = 0; i < size; i += 4) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(size, i);
    ctx.stroke();
  }

  // Wrinkle noise
  const imgData = ctx.getImageData(0, 0, size, size);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    const noise = (rng() - 0.5) * 12;
    d[i] = Math.max(0, Math.min(255, d[i] + noise));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + noise));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + noise));
  }
  ctx.putImageData(imgData, 0, 0);

  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
