import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { KitchenItemType } from "../../types/game.js";

import mugUrl from "../../assets/meshes/mug.glb?url";
import spoonUrl from "../../assets/meshes/spoon.glb?url";
import plateUrl from "../../assets/meshes/plate.glb?url";
import forkUrl from "../../assets/meshes/fork.glb?url";
import glassUrl from "../../assets/meshes/glass.glb?url";
import donutUrl from "../../assets/meshes/donut.glb?url";
import cauliflowerUrl from "../../assets/meshes/cauliflower.glb?url";
import toasterUrl from "../../assets/meshes/toaster.glb?url";
import knifeUrl from "../../assets/meshes/knife.glb?url";
import appleUrl from "../../assets/meshes/apple.glb?url";
import bowlUrl from "../../assets/meshes/bowl.glb?url";
import cheeseUrl from "../../assets/meshes/cheese.glb?url";
import cheeseburgerUrl from "../../assets/meshes/cheeseburger.glb?url";
import pizzaSliceUrl from "../../assets/meshes/pizza_slice.glb?url";
import croissantUrl from "../../assets/meshes/croissant.glb?url";
import bananaUrl from "../../assets/meshes/banana.glb?url";
import broccoliUrl from "../../assets/meshes/broccoli.glb?url";
import toastUrl from "../../assets/meshes/toast.glb?url";
import pretzelUrl from "../../assets/meshes/pretzel.glb?url";

const _loader = new GLTFLoader();

/**
 * Creates a Group immediately, then async-loads the GLB into it.
 * Scales the loaded scene so its Y extent matches `targetHeight` (local units,
 * before the engine's 4× group scale), and shifts it so the bottom sits at y=0.
 */
function createGlbGroup(url: string, targetHeight: number): THREE.Group {
  const group = new THREE.Group();
  _loader.load(url, (gltf) => {
    const scene = gltf.scene;

    // Compute native bounding box and normalize height
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    if (size.y > 0) {
      scene.scale.setScalar(targetHeight / size.y);
    }

    // Recompute after scaling; center X/Z and place bottom at y=0
    const scaledBox = new THREE.Box3().setFromObject(scene);
    const center = scaledBox.getCenter(new THREE.Vector3());
    scene.position.x = -center.x;
    scene.position.z = -center.z;
    scene.position.y = -scaledBox.min.y;

    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    group.add(scene);
  });
  return group;
}

/**
 * Target height in local units (before the engine's 4× group scale).
 * World height = OBJECT_HEIGHTS[type] × 4 for an object placed at scale=1.
 */
export const OBJECT_HEIGHTS: Record<KitchenItemType, number> = {
  mug: 6,
  spoon: 0.7,
  plate: 1,
  fork: 0.5,
  glass: 8,
  donut: 2,
  cauliflower: 7,
  toaster: 7,
  knife: 0.1,
  apple: 5,
  bowl: 4,
  cheese: 4,
  cheeseburger: 4.5,
  pizzaSlice: 0.8,
  croissant: 3,
  banana: 7,
  broccoli: 7,
  toast: 1.2,
  pretzel: 5,
};

/** Collision radii in world units (post 4× group scale, at obj.scale=1). */
export const OBJECT_COLLISION_RADII: Record<KitchenItemType, number> = {
  mug: 12,
  spoon: 4,
  plate: 36,
  fork: 4,
  glass: 10,
  donut: 20,
  cauliflower: 14,
  toaster: 24,
  knife: 4,
  apple: 14,
  bowl: 20,
  cheese: 16,
  cheeseburger: 14,
  pizzaSlice: 16,
  croissant: 14,
  banana: 12,
  broccoli: 12,
  toast: 14,
  pretzel: 12,
};

/** Factory map: returns a Group that fills with the GLB mesh asynchronously. */
export const KITCHEN_ITEM_FACTORIES: Record<
  KitchenItemType,
  () => THREE.Group
> = {
  mug: () => createGlbGroup(mugUrl, OBJECT_HEIGHTS.mug),
  spoon: () => createGlbGroup(spoonUrl, OBJECT_HEIGHTS.spoon),
  plate: () => createGlbGroup(plateUrl, OBJECT_HEIGHTS.plate),
  fork: () => createGlbGroup(forkUrl, OBJECT_HEIGHTS.fork),
  glass: () => createGlbGroup(glassUrl, OBJECT_HEIGHTS.glass),
  donut: () => createGlbGroup(donutUrl, OBJECT_HEIGHTS.donut),
  cauliflower: () => createGlbGroup(cauliflowerUrl, OBJECT_HEIGHTS.cauliflower),
  toaster: () => createGlbGroup(toasterUrl, OBJECT_HEIGHTS.toaster),
  knife: () => createGlbGroup(knifeUrl, OBJECT_HEIGHTS.knife),
  apple: () => createGlbGroup(appleUrl, OBJECT_HEIGHTS.apple),
  bowl: () => createGlbGroup(bowlUrl, OBJECT_HEIGHTS.bowl),
  cheese: () => createGlbGroup(cheeseUrl, OBJECT_HEIGHTS.cheese),
  cheeseburger: () =>
    createGlbGroup(cheeseburgerUrl, OBJECT_HEIGHTS.cheeseburger),
  pizzaSlice: () => createGlbGroup(pizzaSliceUrl, OBJECT_HEIGHTS.pizzaSlice),
  croissant: () => createGlbGroup(croissantUrl, OBJECT_HEIGHTS.croissant),
  banana: () => createGlbGroup(bananaUrl, OBJECT_HEIGHTS.banana),
  broccoli: () => createGlbGroup(broccoliUrl, OBJECT_HEIGHTS.broccoli),
  toast: () => createGlbGroup(toastUrl, OBJECT_HEIGHTS.toast),
  pretzel: () => createGlbGroup(pretzelUrl, OBJECT_HEIGHTS.pretzel),
};
