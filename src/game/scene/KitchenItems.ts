import * as THREE from "three";
import type { KitchenItemType } from "../../types/game.js";
import {
  makeCeramicTexture,
  makeSilverTexture,
  makeClothTexture,
  makeDonutGlazeTexture,
  makeBreadCrustTexture,
  makeSalamiTexture,
  makeAppleSkinTexture,
  makeCheeseTexture,
  makeNapkinStackTexture,
  makePlateDepthTexture,
} from "./ProceduralTextures.js";

interface Materials {
  ceramic: THREE.MeshStandardMaterial;
  silver: THREE.MeshStandardMaterial;
  cloth: THREE.MeshStandardMaterial;
  glass: THREE.MeshStandardMaterial;
}

// Lazily created shared materials for factory map usage
let _sharedMats: Materials | null = null;
function getSharedMats(): Materials {
  if (!_sharedMats) {
    _sharedMats = {
      ceramic: new THREE.MeshStandardMaterial({
        map: makeCeramicTexture(),
        roughness: 0.3,
        metalness: 0.0,
      }),
      silver: new THREE.MeshStandardMaterial({
        map: makeSilverTexture(),
        roughness: 0.2,
        metalness: 0.7,
      }),
      cloth: new THREE.MeshStandardMaterial({
        map: makeClothTexture(),
        roughness: 0.9,
        metalness: 0.0,
      }),
      glass: new THREE.MeshStandardMaterial({
        color: 0xccddee,
        roughness: 0.1,
        metalness: 0.1,
        transparent: true,
        opacity: 0.4,
      }),
    };
  }
  return _sharedMats;
}

function makeMug(_mats: Materials): THREE.Group {
  const g = new THREE.Group();

  // Blue mug like in the background image
  const mugMat = new THREE.MeshStandardMaterial({
    color: 0x4a7fb5,
    roughness: 0.35,
    metalness: 0.0,
  });
  const mugMatDouble = mugMat.clone();
  mugMatDouble.side = THREE.DoubleSide;

  // Outer shell (open-ended)
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(3, 2.8, 6, 20, 1, true),
    mugMat,
  );
  body.position.y = 3;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);

  // Inner wall
  const inner = new THREE.Mesh(
    new THREE.CylinderGeometry(2.8, 2.6, 6, 20, 1, true),
    mugMatDouble,
  );
  inner.position.y = 3;
  g.add(inner);

  // Bottom disc
  const bottom = new THREE.Mesh(new THREE.CircleGeometry(2.8, 20), mugMat);
  bottom.rotation.x = -Math.PI / 2;
  bottom.position.y = 0.05;
  g.add(bottom);

  // Top rim ring
  const rim = new THREE.Mesh(new THREE.TorusGeometry(2.9, 0.2, 8, 20), mugMat);
  rim.rotation.x = Math.PI / 2;
  rim.position.set(0, 6, 0);
  g.add(rim);

  // Handle
  const handle = new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.4, 8, 12), mugMat);
  handle.position.set(3.2, 3.5, 0);
  handle.rotation.z = Math.PI / 2;
  handle.castShadow = true;
  g.add(handle);

  return g;
}

function makeSpoon(mats: Materials): THREE.Group {
  const g = new THREE.Group();
  const handle = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.15, 8),
    mats.silver,
  );
  handle.position.set(0, 0.1, 0);
  handle.castShadow = true;
  g.add(handle);
  const bowl = new THREE.Mesh(
    new THREE.SphereGeometry(1.2, 10, 8),
    mats.silver,
  );
  bowl.scale.set(1, 0.3, 1.2);
  bowl.position.set(0, 0.15, 5);
  bowl.castShadow = true;
  g.add(bowl);
  return g;
}

function makePlate(_mats: Materials): THREE.Group {
  const g = new THREE.Group();
  const plateMat = new THREE.MeshStandardMaterial({
    map: makePlateDepthTexture(),
    roughness: 0.25,
    metalness: 0.05,
  });
  const points = [
    new THREE.Vector2(9, 0),
    new THREE.Vector2(9.5, 0.2),
    new THREE.Vector2(9.5, 0.5),
    new THREE.Vector2(8.5, 0.5),
    new THREE.Vector2(7.5, 0.8),
    new THREE.Vector2(1, 1.0),
    new THREE.Vector2(0, 1.0),
  ];
  const plate = new THREE.Mesh(new THREE.LatheGeometry(points, 32), plateMat);
  plate.castShadow = true;
  plate.receiveShadow = true;
  g.add(plate);
  return g;
}

function makeFork(mats: Materials): THREE.Group {
  const g = new THREE.Group();
  const handle = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.12, 7),
    mats.silver,
  );
  handle.position.set(0, 0.08, 0);
  handle.castShadow = true;
  g.add(handle);
  for (let i = -1.5; i <= 1.5; i += 1) {
    const tine = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 0.1, 3),
      mats.silver,
    );
    tine.position.set(i * 0.3, 0.08, 5);
    g.add(tine);
  }
  return g;
}

function makeNapkin(_mats: Materials): THREE.Group {
  const g = new THREE.Group();
  const napkinMat = new THREE.MeshStandardMaterial({
    map: makeNapkinStackTexture(),
    roughness: 0.85,
    metalness: 0.0,
  });
  const napkin = new THREE.Mesh(new THREE.BoxGeometry(6, 0.3, 8), napkinMat);
  napkin.position.y = 0.15;
  napkin.castShadow = true;
  napkin.receiveShadow = true;
  g.add(napkin);
  return g;
}

function makeSaltShaker(_mats: Materials): THREE.Group {
  const g = new THREE.Group();

  // Sage-green rounded shaker matching the background image
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x7aab90,
    roughness: 0.45,
    metalness: 0.05,
  });
  const domeMat = new THREE.MeshStandardMaterial({
    color: 0x8bbfa3,
    roughness: 0.35,
    metalness: 0.05,
  });

  // Squat cylindrical body
  const body = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, 4, 16), bodyMat);
  body.position.y = 2;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);

  // Rounded dome top (half-sphere)
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(1.6, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    domeMat,
  );
  dome.position.y = 4;
  dome.castShadow = true;
  g.add(dome);

  // Small holes on dome
  const holeMat = new THREE.MeshStandardMaterial({ color: 0x2a4a3a, roughness: 1.0 });
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2;
    const hole = new THREE.Mesh(new THREE.CircleGeometry(0.13, 6), holeMat);
    hole.position.set(Math.cos(angle) * 0.9, 4.6, Math.sin(angle) * 0.9);
    hole.lookAt(new THREE.Vector3(Math.cos(angle) * 10, 4.6, Math.sin(angle) * 10));
    g.add(hole);
  }

  return g;
}

function makeGlass(mats: Materials): THREE.Group {
  const g = new THREE.Group();
  const glassMat = mats.glass.clone();
  glassMat.side = THREE.DoubleSide;

  const glass = new THREE.Mesh(
    new THREE.CylinderGeometry(2.5, 2, 7, 16, 1, true),
    glassMat,
  );
  glass.position.y = 3.5;
  glass.castShadow = true;
  g.add(glass);

  // Inner cylinder (makes glass visible from all angles)
  const inner = new THREE.Mesh(
    new THREE.CylinderGeometry(2.2, 1.7, 6.8, 16, 1, true),
    glassMat,
  );
  inner.position.y = 3.5;
  g.add(inner);

  const bottom = new THREE.Mesh(new THREE.CircleGeometry(2, 16), glassMat);
  bottom.rotation.x = -Math.PI / 2;
  bottom.position.y = 0.05;
  g.add(bottom);
  return g;
}

function makeButterDish(mats: Materials): THREE.Group {
  const g = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(8, 0.5, 5, 1, 1, 1),
    mats.ceramic,
  );
  base.position.y = 0.25;
  base.castShadow = true;
  base.receiveShadow = true;
  g.add(base);
  const butterMat = new THREE.MeshStandardMaterial({
    color: 0xf5e6a0,
    roughness: 0.6,
  });
  const butter = new THREE.Mesh(new THREE.BoxGeometry(5, 2, 3), butterMat);
  butter.position.y = 1.5;
  butter.castShadow = true;
  g.add(butter);
  return g;
}

function makeDonut(_mats: Materials): THREE.Group {
  const g = new THREE.Group();
  const glazeMat = new THREE.MeshStandardMaterial({
    map: makeDonutGlazeTexture(),
    roughness: 0.5,
    metalness: 0.0,
  });
  const donut = new THREE.Mesh(
    new THREE.TorusGeometry(3.5, 1.4, 16, 36),
    glazeMat,
  );
  donut.rotation.x = Math.PI / 2;
  donut.scale.set(1, 0.3, 1);
  donut.position.y = 1.4;
  donut.castShadow = true;
  donut.receiveShadow = true;
  g.add(donut);
  return g;
}

function makeBreadLoaf(_mats: Materials): THREE.Group {
  const g = new THREE.Group();
  const crustMat = new THREE.MeshStandardMaterial({
    map: makeBreadCrustTexture(),
    roughness: 0.9,
    metalness: 0.0,
  });
  const body = new THREE.Mesh(new THREE.BoxGeometry(12, 5.5, 7), crustMat);
  body.position.y = 2.75;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);
  for (const sx of [-1, 1]) {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(3.5, 10, 8), crustMat);
    cap.scale.set(0.5, 0.8, 1);
    cap.position.set(sx * 6, 2.5, 0);
    cap.castShadow = true;
    g.add(cap);
  }
  return g;
}

function makeSalami(_mats: Materials): THREE.Group {
  const g = new THREE.Group();
  const salamiMat = new THREE.MeshStandardMaterial({
    map: makeSalamiTexture(),
    roughness: 0.7,
    metalness: 0.0,
  });
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(1.8, 1.8, 7, 16),
    salamiMat,
  );
  body.rotation.z = Math.PI / 2;
  body.position.y = 1.8;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);
  const faceMat = new THREE.MeshStandardMaterial({
    color: 0xcc4444,
    roughness: 0.6,
  });
  const face = new THREE.Mesh(new THREE.CircleGeometry(1.8, 16), faceMat);
  face.rotation.y = Math.PI / 2;
  face.position.set(3.5, 1.8, 0);
  g.add(face);
  return g;
}

function makeCheeseWedge(_mats: Materials): THREE.Group {
  const g = new THREE.Group();
  const cheeseMat = new THREE.MeshStandardMaterial({
    map: makeCheeseTexture(),
    roughness: 0.7,
    metalness: 0.0,
  });
  const wedge = new THREE.Mesh(new THREE.BoxGeometry(6, 3, 5), cheeseMat);
  wedge.position.y = 1.5;
  wedge.castShadow = true;
  wedge.receiveShadow = true;
  g.add(wedge);
  return g;
}

function makeApple(_mats: Materials): THREE.Group {
  const g = new THREE.Group();
  const appleMat = new THREE.MeshStandardMaterial({
    map: makeAppleSkinTexture(),
    roughness: 0.4,
    metalness: 0.0,
  });
  const body = new THREE.Mesh(new THREE.SphereGeometry(3.5, 16, 12), appleMat);
  body.scale.set(1, 0.85, 1);
  body.position.y = 3;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);
  const stemMat = new THREE.MeshStandardMaterial({
    color: 0x5c3a1e,
    roughness: 0.9,
  });
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.3, 1.5, 6),
    stemMat,
  );
  stem.position.y = 6;
  g.add(stem);
  return g;
}

function makeBerryCluster(_mats: Materials): THREE.Group {
  const g = new THREE.Group();
  const berryMat = new THREE.MeshStandardMaterial({
    color: 0x7b1a4b,
    roughness: 0.5,
    metalness: 0.0,
  });
  const positions: [number, number, number][] = [
    [0, 1, 0],
    [1.5, 0.8, 1],
    [-1.5, 1, 0.5],
    [0.8, 1.5, -1],
    [-0.8, 0.6, -1.2],
    [2, 1.2, -0.5],
    [-2, 0.9, 0.8],
    [0.5, 0.5, 1.8],
  ];
  for (const [x, y, z] of positions) {
    const berry = new THREE.Mesh(
      new THREE.SphereGeometry(1.0, 10, 8),
      berryMat,
    );
    berry.position.set(x, y, z);
    berry.castShadow = true;
    g.add(berry);
  }
  return g;
}

function makeNotepad(_mats: Materials): THREE.Group {
  const g = new THREE.Group();
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 96;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#f5f0e8";
  ctx.fillRect(0, 0, 128, 96);
  ctx.strokeStyle = "#c0c8d8";
  ctx.lineWidth = 1;
  for (let y = 12; y < 96; y += 10) {
    ctx.beginPath();
    ctx.moveTo(4, y);
    ctx.lineTo(124, y);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const padMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 });
  const pad = new THREE.Mesh(new THREE.BoxGeometry(12, 0.8, 9), padMat);
  pad.position.y = 0.4;
  pad.castShadow = true;
  pad.receiveShadow = true;
  g.add(pad);
  return g;
}

function makePen(_mats: Materials): THREE.Group {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a6e,
    roughness: 0.5,
    metalness: 0.2,
  });
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.25, 0.25, 12, 8),
    bodyMat,
  );
  body.rotation.z = Math.PI / 2;
  body.position.y = 0.25;
  body.castShadow = true;
  g.add(body);
  const capMat = new THREE.MeshStandardMaterial({
    color: 0xc0c0c0,
    roughness: 0.2,
    metalness: 0.8,
  });
  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.28, 1.2, 8),
    capMat,
  );
  cap.rotation.z = Math.PI / 2;
  cap.position.set(6.1, 0.25, 0);
  cap.castShadow = true;
  g.add(cap);
  return g;
}

function makePencil(_mats: Materials): THREE.Group {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xffd700,
    roughness: 0.6,
  });
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.25, 0.25, 13, 6),
    bodyMat,
  );
  body.rotation.z = Math.PI / 2;
  body.position.y = 0.25;
  body.castShadow = true;
  g.add(body);
  const eraserMat = new THREE.MeshStandardMaterial({
    color: 0xff99bb,
    roughness: 0.8,
  });
  const eraser = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.28, 0.8, 6),
    eraserMat,
  );
  eraser.rotation.z = Math.PI / 2;
  eraser.position.set(-6.4, 0.25, 0);
  g.add(eraser);
  const tipMat = new THREE.MeshStandardMaterial({
    color: 0x888888,
    roughness: 0.5,
  });
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.25, 1.5, 6), tipMat);
  tip.rotation.z = -Math.PI / 2; // tip points outward (away from eraser)
  tip.position.set(7.25, 0.25, 0);
  tip.castShadow = true;
  g.add(tip);
  return g;
}

function makeStickyNote(_mats: Materials): THREE.Group {
  const g = new THREE.Group();
  const colors = [0xffee44, 0xffaa22, 0xff88bb];
  const color = colors[Math.floor(Math.random() * colors.length)];
  const noteMat = new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
  const note = new THREE.Mesh(new THREE.BoxGeometry(8, 0.15, 8), noteMat);
  note.position.y = 0.075;
  note.rotation.y = (Math.random() - 0.5) * 0.3;
  note.castShadow = true;
  note.receiveShadow = true;
  g.add(note);
  return g;
}

function makeCauliflower(_mats: Materials): THREE.Group {
  const g = new THREE.Group();
  const stemMat = new THREE.MeshStandardMaterial({
    color: 0xc8c8a0,
    roughness: 1.0,
    metalness: 0,
  });
  const headMat = new THREE.MeshStandardMaterial({
    color: 0xf0f0e8,
    roughness: 1.0,
    metalness: 0,
  });
  const stalk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.65, 4.5, 12),
    stemMat,
  );
  stalk.position.y = 2.25;
  stalk.castShadow = true;
  g.add(stalk);
  const main = new THREE.Mesh(new THREE.SphereGeometry(2.8, 12, 10), headMat);
  main.scale.y = 0.72;
  main.position.y = 5.6;
  main.castShadow = true;
  g.add(main);
  const offsets: [number, number, number, number][] = [
    [1.6, 5.2, 0.8, 1.9],
    [-1.5, 5.0, 0.9, 1.8],
    [0.5, 5.4, -1.7, 2.0],
    [-0.8, 5.8, 1.5, 1.6],
    [1.8, 5.8, -0.6, 1.5],
    [-1.9, 5.6, -0.8, 1.4],
  ];
  for (const [x, y, z, r] of offsets) {
    const sub = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), headMat);
    sub.scale.y = 0.75;
    sub.position.set(x, y, z);
    sub.castShadow = true;
    g.add(sub);
  }
  return g;
}

function makeToaster(_mats: Materials): THREE.Group {
  const g = new THREE.Group();

  // Cream/yellow body matching the background image
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xe8d882,
    roughness: 0.6,
    metalness: 0.1,
  });
  const darkMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    roughness: 0.8,
    metalness: 0.0,
  });
  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xc0c0c0,
    roughness: 0.2,
    metalness: 0.8,
  });

  // Main boxy body
  const body = new THREE.Mesh(new THREE.BoxGeometry(12, 7, 8), bodyMat);
  body.position.y = 3.5;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);

  // Two slots on top
  for (const sx of [-2.5, 2.5]) {
    const slot = new THREE.Mesh(new THREE.BoxGeometry(2, 0.4, 5.5), darkMat);
    slot.position.set(sx, 7.1, 0);
    g.add(slot);
  }

  // Lever on side
  const leverBase = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2, 0.8), chromeMat);
  leverBase.position.set(6.3, 2.8, 1.5);
  g.add(leverBase);
  const leverKnob = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), chromeMat);
  leverKnob.position.set(6.6, 2.0, 1.5);
  g.add(leverKnob);

  // Crumb tray slot line
  const tray = new THREE.Mesh(new THREE.BoxGeometry(10, 0.25, 0.3), darkMat);
  tray.position.set(0, 0.3, 4.1);
  g.add(tray);

  // Small feet
  const footPositions: [number, number][] = [[-4.5, -3], [4.5, -3], [-4.5, 3], [4.5, 3]];
  for (const [fx, fz] of footPositions) {
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.5, 8), darkMat);
    foot.position.set(fx, 0.25, fz);
    g.add(foot);
  }

  return g;
}

function makeKnife(mats: Materials): THREE.Group {
  const g = new THREE.Group();

  // Handle
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.15, 6), mats.silver);
  handle.position.set(0, 0.1, -2);
  handle.castShadow = true;
  g.add(handle);

  // Blade (slightly narrower, tapers toward tip)
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.1, 7), mats.silver);
  blade.position.set(0, 0.08, 4.5);
  g.add(blade);

  // Bolster (guard between handle and blade)
  const bolster = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.2, 0.5), mats.silver);
  bolster.position.set(0, 0.12, 1.2);
  g.add(bolster);

  return g;
}

function makeFruitBowl(_mats: Materials): THREE.Group {
  const g = new THREE.Group();

  // Blue bowl (matching the image)
  const bowlMat = new THREE.MeshStandardMaterial({
    color: 0x4a6fa5,
    roughness: 0.35,
    metalness: 0.05,
    side: THREE.DoubleSide,
  });

  const pts = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(2, 0.3),
    new THREE.Vector2(4.5, 1.5),
    new THREE.Vector2(6, 3.5),
    new THREE.Vector2(6.2, 4.2),
  ];
  const bowl = new THREE.Mesh(new THREE.LatheGeometry(pts, 24), bowlMat);
  bowl.castShadow = true;
  bowl.receiveShadow = true;
  g.add(bowl);

  // Red and green apples
  const redMat = new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.4 });
  const greenMat = new THREE.MeshStandardMaterial({ color: 0x4aaa33, roughness: 0.4 });
  const orangeMat2 = new THREE.MeshStandardMaterial({ color: 0xff7722, roughness: 0.4 });
  const stemMat = new THREE.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 0.9 });

  const fruits: [number, number, number, THREE.MeshStandardMaterial][] = [
    [0, 5.0, 0, redMat],
    [2.2, 4.8, 1.2, greenMat],
    [-2.0, 4.8, 0.8, redMat],
    [0.5, 4.6, -2.0, orangeMat2],
  ];
  for (const [x, y, z, mat] of fruits) {
    const fruit = new THREE.Mesh(new THREE.SphereGeometry(1.8, 10, 8), mat);
    fruit.scale.set(1, 0.88, 1);
    fruit.position.set(x, y, z);
    fruit.castShadow = true;
    g.add(fruit);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 1.0, 5), stemMat);
    stem.position.set(x, y + 1.8, z);
    g.add(stem);
  }

  // Banana on top (curved torus arc)
  const bananaMat = new THREE.MeshStandardMaterial({ color: 0xffd740, roughness: 0.5 });
  const banana = new THREE.Mesh(
    new THREE.TorusGeometry(2.8, 0.55, 6, 14, Math.PI * 0.55),
    bananaMat,
  );
  banana.position.set(-0.5, 7.0, 0);
  banana.rotation.set(Math.PI / 2, 0, 0.4);
  banana.castShadow = true;
  g.add(banana);

  return g;
}

export const OBJECT_HEIGHTS: Record<KitchenItemType, number> = {
  mug: 6,
  spoon: 0.3,
  plate: 1,
  fork: 0.3,
  napkin: 0.5,
  saltShaker: 8,
  glass: 9,
  butterDish: 3,
  donut: 2,
  breadLoaf: 5,
  salami: 6,
  cheeseWedge: 5,
  apple: 4,
  berryCluster: 3,
  notepad: 0.5,
  pen: 0.6,
  pencil: 0.6,
  stickyNote: 0.5,
  cauliflower: 6,
  toaster: 7,
  knife: 0.2,
  fruitBowl: 8,
};

/** Collision radii in world units (post 4× scale, scale=1). */
export const OBJECT_COLLISION_RADII: Record<KitchenItemType, number> = {
  mug: 12,
  spoon: 4,
  plate: 36,
  fork: 4,
  napkin: 12,
  saltShaker: 8,
  glass: 10,
  butterDish: 16,
  donut: 20,
  breadLoaf: 24,
  salami: 8,
  cheeseWedge: 12,
  apple: 14,
  berryCluster: 12,
  notepad: 24,
  pen: 4,
  pencil: 4,
  stickyNote: 16,
  cauliflower: 12,
  toaster: 24,
  knife: 4,
  fruitBowl: 24,
};

function scaled4x(fn: () => THREE.Group): () => THREE.Group {
  return () => {
    const g = fn();
    g.scale.setScalar(4);
    return g;
  };
}

// Factory map: each function creates a kitchen item using shared materials (base 4× scale)
export const KITCHEN_ITEM_FACTORIES: Record<
  KitchenItemType,
  () => THREE.Group
> = {
  mug: scaled4x(() => makeMug(getSharedMats())),
  spoon: scaled4x(() => makeSpoon(getSharedMats())),
  plate: scaled4x(() => makePlate(getSharedMats())),
  fork: scaled4x(() => makeFork(getSharedMats())),
  napkin: scaled4x(() => makeNapkin(getSharedMats())),
  saltShaker: scaled4x(() => makeSaltShaker(getSharedMats())),
  glass: scaled4x(() => makeGlass(getSharedMats())),
  butterDish: scaled4x(() => makeButterDish(getSharedMats())),
  donut: scaled4x(() => makeDonut(getSharedMats())),
  breadLoaf: scaled4x(() => makeBreadLoaf(getSharedMats())),
  salami: scaled4x(() => makeSalami(getSharedMats())),
  cheeseWedge: scaled4x(() => makeCheeseWedge(getSharedMats())),
  apple: scaled4x(() => makeApple(getSharedMats())),
  berryCluster: scaled4x(() => makeBerryCluster(getSharedMats())),
  notepad: scaled4x(() => makeNotepad(getSharedMats())),
  pen: scaled4x(() => makePen(getSharedMats())),
  pencil: scaled4x(() => makePencil(getSharedMats())),
  stickyNote: scaled4x(() => makeStickyNote(getSharedMats())),
  cauliflower: scaled4x(() => makeCauliflower(getSharedMats())),
  toaster: scaled4x(() => makeToaster(getSharedMats())),
  knife: scaled4x(() => makeKnife(getSharedMats())),
  fruitBowl: scaled4x(() => makeFruitBowl(getSharedMats())),
};

export class KitchenItems {
  private group: THREE.Group;

  constructor() {
    this.group = new THREE.Group();
    const mats = getSharedMats();

    const makers = [
      makeMug,
      makeSpoon,
      makePlate,
      makeFork,
      makeNapkin,
      makeSaltShaker,
      makeGlass,
      makeButterDish,
      makeDonut,
      makeBreadLoaf,
      makeSalami,
      makeCheeseWedge,
      makeApple,
      makeBerryCluster,
      makeCauliflower,
      makeNotepad,
      makePen,
      makePencil,
      makeStickyNote,
      makeToaster,
      makeKnife,
      makeFruitBowl,
    ];

    const clusters: [number, number][] = [
      [120, 100],
      [-120, 100],
      [120, -100],
      [-120, -100],
      [0, 120],
      [0, -120],
      [-60, 80],
      [60, 80],
    ];

    for (const [cx, cz] of clusters) {
      const count = 3 + Math.floor(Math.random() * 3);
      const shuffled = [...makers].sort(() => Math.random() - 0.5);
      for (let i = 0; i < count; i++) {
        const ox = (Math.random() - 0.5) * 30;
        const oz = (Math.random() - 0.5) * 30;
        const rot = Math.random() * Math.PI * 2;
        const mesh = shuffled[i % shuffled.length](mats);
        mesh.position.set(cx + ox, 0, cz + oz);
        mesh.rotation.y = rot;
        this.group.add(mesh);
      }
    }
  }

  build(): THREE.Group {
    return this.group;
  }
}
