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

export interface SplatTextureResult {
  texture: THREE.CanvasTexture;
  alphaData: Uint8ClampedArray;
  size: number;
}

/** Irregular blob splat with alpha — used for hazard zone overlays. */
function makeSplatTexture(
  size: number,
  baseColor: string,
  blobColor: string,
  seed: number,
  kind?: 'juice' | 'oil' | 'milk' | 'butter' | 'food',
): SplatTextureResult {
  const [canvas, ctx] = makeCanvas(size);
  const rng = seededRng(seed);

  ctx.clearRect(0, 0, size, size);

  const center = size / 2;
  const baseRadius = center * 0.42;

  // Main organic blob via bezier curves (14 control points for more organic shape)
  ctx.globalAlpha = 0.75;
  ctx.fillStyle = baseColor;
  const blobPts = 14;
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

  // Type-specific extras
  if (kind === 'milk') {
    // Foam dots at blob edges
    for (let i = 0; i < 20; i++) {
      const angle = rng() * Math.PI * 2;
      const dist = baseRadius * (0.55 + rng() * 0.3);
      const fx = center + Math.cos(angle) * dist;
      const fy = center + Math.sin(angle) * dist;
      ctx.globalAlpha = 0.6 + rng() * 0.35;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(fx, fy, 3 + rng() * 6, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (kind === 'juice') {
    // Pulp specks (tiny orange/red dots)
    for (let i = 0; i < 35; i++) {
      const angle = rng() * Math.PI * 2;
      const dist = baseRadius * rng() * 0.9;
      const px = center + Math.cos(angle) * dist;
      const py = center + Math.sin(angle) * dist;
      ctx.globalAlpha = 0.5 + rng() * 0.4;
      ctx.fillStyle = rng() > 0.5 ? '#cc4400' : '#ff6600';
      ctx.beginPath();
      ctx.arc(px, py, 1.5 + rng() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (kind === 'oil') {
    // Iridescent color layer (thin purple/green overlay at low alpha)
    ctx.globalAlpha = 0.12;
    const iridGrad = ctx.createRadialGradient(center * 0.8, center * 0.7, 0, center, center, baseRadius * 1.1);
    iridGrad.addColorStop(0, '#cc44ff');
    iridGrad.addColorStop(0.4, '#44ffaa');
    iridGrad.addColorStop(0.7, '#4488ff');
    iridGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = iridGrad;
    ctx.fillRect(0, 0, size, size);
  }

  // Alpha fade at splat edge (radial alpha mask)
  ctx.globalCompositeOperation = 'destination-in';
  const alphaMask = ctx.createRadialGradient(center, center, baseRadius * 0.35, center, center, center * 0.95);
  alphaMask.addColorStop(0, 'rgba(0,0,0,1)');
  alphaMask.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = alphaMask;
  ctx.globalAlpha = 1;
  ctx.fillRect(0, 0, size, size);
  ctx.globalCompositeOperation = 'source-over';

  const alphaData = ctx.getImageData(0, 0, size, size).data;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return { texture: tex, alphaData, size };
}

/** Blue/white polished floor tiles with deep grout lines. */
export function makeFloorTileTexture(size = 512): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(size);
  const cols = 4, rows = 4;
  const tileW = size / cols;
  const tileH = size / rows;
  const grooveThick = 8;

  ctx.filter = 'blur(6px)';

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * tileW;
      const y = r * tileH;
      const isBlue = (r + c) % 2 === 0;
      ctx.fillStyle = isBlue ? '#4a7ab5' : '#e8eef7';
      ctx.fillRect(x, y, tileW, tileH);
    }
  }

  ctx.filter = 'none';
  ctx.fillStyle = '#111827';
  for (let r = 0; r <= rows; r++) {
    ctx.fillRect(0, r * tileH - grooveThick / 2, size, grooveThick);
  }
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

export function makeOilSplatTexture(size = 512): SplatTextureResult {
  return makeSplatTexture(size, '#3a3a10', '#555520', 201, 'oil');
}

export function makeJuiceSplatTexture(size = 512): SplatTextureResult {
  return makeSplatTexture(size, '#ff8800', '#ffaa33', 202, 'juice');
}

export function makeFoodSplatTexture(size = 512): SplatTextureResult {
  return makeSplatTexture(size, '#6a9930', '#88cc44', 203, 'food');
}

export function makeMilkSplatTexture(size = 512): SplatTextureResult {
  return makeSplatTexture(size, '#dde8ff', '#f0f5ff', 204, 'milk');
}

export function makeButterSplatTexture(size = 512): SplatTextureResult {
  return makeSplatTexture(size, '#f5d020', '#ffe55a', 205, 'butter');
}

/** Ceramic texture — white/cream with radial center highlight and subtle speckles. */
export function makeCeramicTexture(size = 512): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(size);
  const rng = seededRng(301);

  ctx.fillStyle = '#f5f0e8';
  ctx.fillRect(0, 0, size, size);

  // Radial gradient (center slightly brighter)
  const radGrad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size * 0.7);
  radGrad.addColorStop(0, 'rgba(255,255,255,0.18)');
  radGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = 1;
  ctx.fillStyle = radGrad;
  ctx.fillRect(0, 0, size, size);

  // More speckle variation
  for (let i = 0; i < 120; i++) {
    ctx.globalAlpha = 0.04 + rng() * 0.1;
    const pick = rng();
    ctx.fillStyle = pick > 0.66 ? '#c8c4bc' : pick > 0.33 ? '#e8e4dc' : '#ddd8d0';
    ctx.beginPath();
    ctx.arc(rng() * size, rng() * size, 1 + rng() * 5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Silver/metallic texture with anisotropic-like highlights. */
export function makeSilverTexture(size = 512): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(size);
  const rng = seededRng(302);

  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, '#c0c0c0');
  grad.addColorStop(0.5, '#e0e0e0');
  grad.addColorStop(1, '#b0b0b0');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Anisotropic-like highlights (thin bright horizontal bands)
  for (let i = 0; i < 8; i++) {
    const y = rng() * size;
    const h = 1 + rng() * 3;
    ctx.globalAlpha = 0.12 + rng() * 0.15;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, y, size, h);
  }

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

/** Bread crust — golden-brown with score lines and grain noise. */
export function makeBreadCrustTexture(size = 256): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(size);
  const rng = seededRng(402);

  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, '#c8760a');
  grad.addColorStop(0.5, '#a85c06');
  grad.addColorStop(1, '#8a4804');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

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

/** Salami cross-section — pink/red base with white fat dots and circular vignette. */
export function makeSalamiTexture(size = 512): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(size);
  const rng = seededRng(403);

  ctx.fillStyle = '#c84040';
  ctx.fillRect(0, 0, size, size);

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

  const imgData = ctx.getImageData(0, 0, size, size);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rng() - 0.5) * 18;
    d[i] = Math.max(0, Math.min(255, d[i] + n));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n * 0.5));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n * 0.5));
  }
  ctx.putImageData(imgData, 0, 0);

  // Circular vignette (darker edges = cross-section depth)
  const vigGrad = ctx.createRadialGradient(size / 2, size / 2, size * 0.3, size / 2, size / 2, size * 0.7);
  vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
  vigGrad.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.globalAlpha = 1;
  ctx.fillStyle = vigGrad;
  ctx.fillRect(0, 0, size, size);

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

/** Cheese surface — pale yellow with depth/AO holes and surface roughness noise. */
export function makeCheeseTexture(size = 512): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(size);
  const rng = seededRng(405);

  ctx.fillStyle = '#e8d060';
  ctx.fillRect(0, 0, size, size);

  // Holes with depth/AO
  for (let i = 0; i < 20; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const r = 5 + rng() * 12;

    // 1. AO shadow ring
    const aoGrad = ctx.createRadialGradient(x, y, r * 0.2, x, y, r);
    aoGrad.addColorStop(0, '#4a3000');
    aoGrad.addColorStop(1, 'rgba(74,48,0,0)');
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = aoGrad;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();

    // 2. Dark hole center
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = '#2d1500';
    ctx.beginPath(); ctx.arc(x, y, r * 0.65, 0, Math.PI * 2); ctx.fill();

    // 3. Top-left highlight
    const hlGrad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r * 0.5);
    hlGrad.addColorStop(0, 'rgba(255,220,80,0.5)');
    hlGrad.addColorStop(1, 'rgba(255,220,80,0)');
    ctx.globalAlpha = 1;
    ctx.fillStyle = hlGrad;
    ctx.beginPath(); ctx.arc(x, y, r * 0.5, 0, Math.PI * 2); ctx.fill();

    // 4. Subtle outer ring
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = '#a07820';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
  }

  // Pixel noise for surface roughness
  const imgData = ctx.getImageData(0, 0, size, size);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rng() - 0.5) * 18;
    d[i] = Math.max(0, Math.min(255, d[i] + n));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n * 0.9));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n * 0.3));
  }
  ctx.putImageData(imgData, 0, 0);

  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Cloth/napkin texture with crosshatch weave pattern. */
export function makeClothTexture(size = 512): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(size);
  const rng = seededRng(303);

  ctx.fillStyle = '#e8e0d0';
  ctx.fillRect(0, 0, size, size);

  // Weave pattern (higher contrast)
  ctx.globalAlpha = 0.18;
  ctx.strokeStyle = '#b8b0a0';
  ctx.lineWidth = 1;
  for (let i = 0; i < size; i += 4) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(size, i); ctx.stroke();
  }

  // 45° crosshatch for linen look
  ctx.globalAlpha = 0.08;
  ctx.strokeStyle = '#a09080';
  for (let i = -size; i < size * 2; i += 6) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + size, size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(i, size); ctx.lineTo(i + size, 0); ctx.stroke();
  }

  const imgData = ctx.getImageData(0, 0, size, size);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    const noise = (rng() - 0.5) * 14;
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

/** Napkin stack — cloth base with horizontal paper stacking lines. */
export function makeNapkinStackTexture(size = 512): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(size);
  const rng = seededRng(510);

  ctx.fillStyle = '#f0ece4';
  ctx.fillRect(0, 0, size, size);

  // Subtle paper/cloth noise on top face
  for (let i = 0; i < 80; i++) {
    ctx.globalAlpha = 0.04 + rng() * 0.06;
    ctx.fillStyle = rng() > 0.5 ? '#d8d4cc' : '#e0dcd4';
    ctx.fillRect(rng() * size, rng() * size, 2 + rng() * 6, 1 + rng() * 3);
  }

  // Dense horizontal lines on sides (stacked paper cross-section pattern)
  ctx.globalAlpha = 0.25;
  ctx.strokeStyle = '#b8b4ac';
  ctx.lineWidth = 1;
  for (let y = 5; y < size; y += 10) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Salt shaker cap — grey metallic with 3×3 grid of holes. */
export function makeSaltCapTexture(size = 256): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(size);

  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, '#aaaaaa');
  grad.addColorStop(0.5, '#cccccc');
  grad.addColorStop(1, '#999999');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const cols = 3, rows = 3;
  const cellW = size / (cols + 1);
  const cellH = size / (rows + 1);
  const holeR = Math.min(cellW, cellH) * 0.28;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const hx = (c + 1) * cellW;
      const hy = (r + 1) * cellH;

      const aoGrad = ctx.createRadialGradient(hx, hy, holeR * 0.3, hx, hy, holeR * 1.8);
      aoGrad.addColorStop(0, 'rgba(0,0,0,0.6)');
      aoGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = aoGrad;
      ctx.beginPath(); ctx.arc(hx, hy, holeR * 1.8, 0, Math.PI * 2); ctx.fill();

      ctx.globalAlpha = 1;
      ctx.fillStyle = '#222222';
      ctx.beginPath(); ctx.arc(hx, hy, holeR, 0, Math.PI * 2); ctx.fill();
    }
  }

  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Plate depth texture — white base with subtle radial shadow and rim highlight. */
export function makePlateDepthTexture(size = 512): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(size);

  ctx.fillStyle = '#f8f8ff';
  ctx.fillRect(0, 0, size, size);

  // Center radial shadow (cool blue tint)
  const centerGrad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size * 0.45);
  centerGrad.addColorStop(0, 'rgba(210,220,240,0.25)');
  centerGrad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.globalAlpha = 1;
  ctx.fillStyle = centerGrad;
  ctx.fillRect(0, 0, size, size);

  // Rim highlight ring
  ctx.globalAlpha = 0.18;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = size * 0.04;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.43, 0, Math.PI * 2);
  ctx.stroke();

  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
