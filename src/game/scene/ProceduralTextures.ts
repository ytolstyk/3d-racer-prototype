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

  // Transparent background
  ctx.clearRect(0, 0, size, size);

  // Draw irregular blob clusters
  const center = size / 2;
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = baseColor;

  // Main blob
  ctx.beginPath();
  const points = 12;
  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * Math.PI * 2;
    const r = center * (0.5 + rng() * 0.35);
    const x = center + Math.cos(angle) * r;
    const y = center + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();

  // Smaller satellite blobs
  for (let i = 0; i < 8; i++) {
    const angle = rng() * Math.PI * 2;
    const dist = center * (0.3 + rng() * 0.5);
    const bx = center + Math.cos(angle) * dist;
    const by = center + Math.sin(angle) * dist;
    const br = 15 + rng() * 40;
    ctx.globalAlpha = 0.3 + rng() * 0.4;
    ctx.fillStyle = rng() > 0.5 ? baseColor : blobColor;
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
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
