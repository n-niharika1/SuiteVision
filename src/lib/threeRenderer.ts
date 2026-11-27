"use client";

import * as THREE from "three";
import { SceneObject, ScenePlan } from "./types";

export interface ThreeRenderOptions {
  style: string;
  lightingMode: string;
  finishMaterial: string;
}

function validHex(hex: string | undefined, fallback: string): string {
  return hex && /^#[0-9A-Fa-f]{6}$/.test(hex) ? hex : fallback;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

// ─── Procedural PBR Textures ──────────────────────────────────────────────────

function makeWoodTexture(baseHex: string): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 90; i++) {
    const y = (i / 90) * 256;
    ctx.strokeStyle = i % 3 === 0 ? "rgba(0,0,0,0.14)" : "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1 + (i % 3);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(85, y + Math.sin(i) * 5, 170, y - Math.cos(i) * 5, 256, y);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makePlasterTexture(baseHex: string): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 600; i++) {
    const x = (i * 73) % 256;
    const y = (i * 137) % 256;
    const r = 4 + (i % 14);
    ctx.fillStyle = i % 2 === 0 ? "rgba(255,255,255,0.035)" : "rgba(0,0,0,0.03)";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeMarbleFloorTexture(baseHex: string): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 512, 512);

  // Subtle marble veins
  for (let i = 0; i < 24; i++) {
    ctx.strokeStyle = i % 2 === 0 ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.09)";
    ctx.lineWidth = 1 + (i % 2);
    ctx.beginPath();
    const sy = (i * 29) % 512;
    ctx.moveTo(0, sy);
    ctx.bezierCurveTo(160, sy + 25, 340, sy - 25, 512, (sy + 40) % 512);
    ctx.stroke();
  }

  // Tile grout lines
  ctx.strokeStyle = "rgba(0,0,0,0.16)";
  ctx.lineWidth = 2;
  for (let p = 0; p <= 512; p += 128) {
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, 512);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(512, p);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeFabricTexture(baseHex: string, striped = false): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 256, 256);

  if (striped) {
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    for (let x = 0; x < 256; x += 16) {
      ctx.fillRect(x, 0, 4, 256);
    }
  }

  // Fine weave
  ctx.fillStyle = "rgba(0,0,0,0.04)";
  for (let y = 0; y < 256; y += 4) {
    ctx.fillRect(0, y, 256, 1);
  }
  for (let x = 0; x < 256; x += 4) {
    ctx.fillRect(x, 0, 1, 256);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeRugTexture(primaryHex: string, secondaryHex: string): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = primaryHex;
  ctx.fillRect(0, 0, 512, 512);

  // Geometric border
  ctx.strokeStyle = secondaryHex;
  ctx.lineWidth = 22;
  ctx.strokeRect(28, 28, 456, 456);
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 6;
  ctx.strokeRect(52, 52, 408, 408);

  // Center diamond motif
  ctx.fillStyle = secondaryHex;
  ctx.beginPath();
  ctx.moveTo(256, 120);
  ctx.lineTo(392, 256);
  ctx.lineTo(256, 392);
  ctx.lineTo(120, 256);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = primaryHex;
  ctx.beginPath();
  ctx.arc(256, 256, 56, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ─── Main Three.js 3D Renderer ────────────────────────────────────────────────

export async function renderWithThreeJS(
  plan: ScenePlan,
  options: ThreeRenderOptions
): Promise<string | null> {
  const W = 1024;
  const H = 768;

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true,
      powerPreference: "high-performance",
    });
  } catch {
    return null;
  }

  renderer.setSize(W, H);
  renderer.setPixelRatio(1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  const isWarm =
    options.lightingMode === "warm-evening" ||
    options.lightingMode === "golden-hour";
  const isDaylight = options.lightingMode === "natural-daylight";

  scene.background = new THREE.Color(isDaylight ? "#dce8f2" : "#181512");

  // Room dimensions in meters
  const roomW = 9.2;
  const roomH = 4.0;
  const roomD = 8.4;
  const backZ = -roomD / 2;

  const camera = new THREE.PerspectiveCamera(46, W / H, 0.1, 60);
  camera.position.set(0, 1.85, roomD / 2 + 1.15);
  camera.lookAt(0, 1.45, -1.2);

  // ── 1. Lighting ──────────────────────────────────────────────────────────
  const hemi = new THREE.HemisphereLight(
    isDaylight ? 0xeef6ff : 0xfff0d8,
    0x4a3d30,
    isDaylight ? 0.95 : 0.75
  );
  scene.add(hemi);

  const keyLight = new THREE.DirectionalLight(
    isWarm ? 0xffe4b8 : isDaylight ? 0xffffff : 0xffd79a,
    isDaylight ? 1.5 : 1.15
  );
  keyLight.position.set(2.8, 3.8, 3.5);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 2048;
  keyLight.shadow.mapSize.height = 2048;
  keyLight.shadow.camera.near = 0.5;
  keyLight.shadow.camera.far = 18;
  keyLight.shadow.camera.left = -6;
  keyLight.shadow.camera.right = 6;
  keyLight.shadow.camera.top = 5;
  keyLight.shadow.camera.bottom = -2;
  keyLight.shadow.bias = -0.0005;
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xcbdcff, 0.35);
  fillLight.position.set(-3.5, 2.4, 2.5);
  scene.add(fillLight);

  // ── 2. 3D Room Architecture ──────────────────────────────────────────────
  const wallHex = validHex(plan.wallColor, "#E8D5A3");
  const ceilHex = validHex(plan.ceilingColor, "#F5F1EB");
  const floorHex = validHex(plan.floorColor, "#8A6D4B");

  const wallMat = new THREE.MeshStandardMaterial({
    map: makePlasterTexture(wallHex),
    roughness: 0.85,
    metalness: 0.02,
  });
  const sideWallMat = new THREE.MeshStandardMaterial({
    map: makePlasterTexture(wallHex),
    color: new THREE.Color(wallHex).multiplyScalar(0.92),
    roughness: 0.88,
    metalness: 0.02,
  });
  const ceilMat = new THREE.MeshStandardMaterial({
    color: ceilHex,
    roughness: 0.9,
  });
  const floorMat = new THREE.MeshStandardMaterial({
    map: makeMarbleFloorTexture(floorHex),
    roughness: 0.28,
    metalness: 0.08,
  });

  // Floor
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(roomW, roomD), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Ceiling
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(roomW, roomD), ceilMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = roomH;
  scene.add(ceiling);

  // Back wall
  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(roomW, roomH), wallMat);
  backWall.position.set(0, roomH / 2, backZ);
  backWall.receiveShadow = true;
  scene.add(backWall);

  // Left & Right walls
  const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(roomD, roomH), sideWallMat);
  leftWall.rotation.y = Math.PI / 2;
  leftWall.position.set(-roomW / 2, roomH / 2, 0);
  leftWall.receiveShadow = true;
  scene.add(leftWall);

  const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(roomD, roomH), sideWallMat);
  rightWall.rotation.y = -Math.PI / 2;
  rightWall.position.set(roomW / 2, roomH / 2, 0);
  rightWall.receiveShadow = true;
  scene.add(rightWall);

  // Baseboard & crown molding
  const moldingMat = new THREE.MeshStandardMaterial({
    color: "#EDE8DF",
    roughness: 0.45,
  });
  const baseboard = new THREE.Mesh(new THREE.BoxGeometry(roomW, 0.12, 0.04), moldingMat);
  baseboard.position.set(0, 0.06, backZ + 0.02);
  scene.add(baseboard);

  const crown = new THREE.Mesh(new THREE.BoxGeometry(roomW, 0.1, 0.08), moldingMat);
  crown.position.set(0, roomH - 0.05, backZ + 0.04);
  scene.add(crown);

  // Recessed ceiling light panel
  const ceilPanelMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: isWarm ? 0xffe4b5 : 0xf4f8ff,
    emissiveIntensity: 1.4,
  });
  const ceilPanel = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.03, 1.2), ceilPanelMat);
  ceilPanel.position.set(0, roomH - 0.02, -0.6);
  scene.add(ceilPanel);

  // ── 3. Build 3D Furniture from ScenePlan ─────────────────────────────────
  const objects = plan.objects || [];
  const nightstands = objects.filter((o) => o.type === "nightstand");

  for (const obj of objects) {
    add3DSceneObject(scene, obj, {
      roomW,
      roomH,
      roomD,
      backZ,
      isWarm,
      isDaylight,
      nightstands,
    });
  }

  // Render frame
  renderer.render(scene, camera);
  const dataUrl = renderer.domElement.toDataURL("image/jpeg", 0.94);

  // Cleanup GPU resources
  renderer.dispose();
  scene.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      const mats = Array.isArray(child.material)
        ? child.material
        : [child.material];
      mats.forEach((m) => m.dispose());
    }
  });

  return dataUrl;
}

interface RoomCtx {
  roomW: number;
  roomH: number;
  roomD: number;
  backZ: number;
  isWarm: boolean;
  isDaylight: boolean;
  nightstands: SceneObject[];
}

function add3DSceneObject(scene: THREE.Scene, obj: SceneObject, ctx: RoomCtx) {
  const { roomW, roomH, backZ, isWarm, isDaylight, nightstands } = ctx;

  const cx = (clamp(obj.x + obj.w / 2, 0.05, 0.95) - 0.5) * roomW * 0.92;
  const objW = clamp(obj.w * roomW * 0.88, 0.35, roomW * 0.85);
  const objH = clamp(obj.h * roomH * 0.92, 0.25, roomH * 0.88);
  const topY = (1 - clamp(obj.y, 0.02, 0.95)) * roomH;

  const pc = validHex(obj.primaryColor, "#7A5C43");
  const sc = validHex(obj.secondaryColor, "#D4AF37");
  const brassMat = new THREE.MeshStandardMaterial({
    color: "#D4AF37",
    roughness: 0.25,
    metalness: 0.85,
  });

  const group = new THREE.Group();

  switch (obj.type) {
    case "headboard": {
      const hbDepth = 0.16;
      const hbH = clamp(objH, 0.9, 1.8);
      const mat = new THREE.MeshStandardMaterial({
        map: makeFabricTexture(pc),
        roughness: 0.82,
      });
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(objW, hbH, hbDepth),
        mat
      );
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);

      // Tufted button grid
      const btnMat = new THREE.MeshStandardMaterial({
        color: sc,
        roughness: 0.5,
      });
      const cols = Math.max(3, Math.round(objW / 0.45));
      const rows = 2;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const btn = new THREE.Mesh(
            new THREE.SphereGeometry(0.028, 10, 10),
            btnMat
          );
          btn.position.set(
            ((c + 0.5) / cols - 0.5) * objW * 0.86,
            ((r + 0.5) / rows - 0.5) * hbH * 0.65,
            hbDepth / 2 + 0.01
          );
          group.add(btn);
        }
      }

      group.position.set(cx, 0.55 + hbH / 2, backZ + hbDepth / 2 + 0.02);
      break;
    }

    case "bed": {
      const bedD = 2.65;
      const baseH = 0.28;
      const mattH = 0.26;
      const woodMat = new THREE.MeshStandardMaterial({
        map: makeWoodTexture(pc),
        roughness: 0.45,
        metalness: 0.05,
      });
      const duvetMat = new THREE.MeshStandardMaterial({
        map: makeFabricTexture(sc, true),
        roughness: 0.85,
      });
      const sheetMat = new THREE.MeshStandardMaterial({
        color: "#F6F3EE",
        roughness: 0.8,
      });

      // Wooden frame
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(objW, baseH, bedD),
        woodMat
      );
      frame.position.y = baseH / 2 + 0.1;
      frame.castShadow = true;
      frame.receiveShadow = true;
      group.add(frame);

      // 4 wooden legs
      for (const lx of [-objW / 2 + 0.08, objW / 2 - 0.08]) {
        for (const lz of [-bedD / 2 + 0.08, bedD / 2 - 0.08]) {
          const leg = new THREE.Mesh(
            new THREE.BoxGeometry(0.08, 0.12, 0.08),
            woodMat
          );
          leg.position.set(lx, 0.06, lz);
          leg.castShadow = true;
          group.add(leg);
        }
      }

      // White mattress
      const mattress = new THREE.Mesh(
        new THREE.BoxGeometry(objW * 0.94, mattH, bedD * 0.94),
        sheetMat
      );
      mattress.position.set(0, baseH + 0.1 + mattH / 2, 0);
      mattress.castShadow = true;
      mattress.receiveShadow = true;
      group.add(mattress);

      // Plush duvet covering lower 72% of bed
      const duvet = new THREE.Mesh(
        new THREE.BoxGeometry(objW * 0.98, mattH * 0.68, bedD * 0.7),
        duvetMat
      );
      duvet.position.set(0, baseH + 0.1 + mattH * 0.72, bedD * 0.14);
      duvet.castShadow = true;
      duvet.receiveShadow = true;
      group.add(duvet);

      // Accent throw runner at foot of bed
      const runnerMat = new THREE.MeshStandardMaterial({
        color: pc,
        roughness: 0.85,
      });
      const runner = new THREE.Mesh(
        new THREE.BoxGeometry(objW * 0.99, 0.04, bedD * 0.22),
        runnerMat
      );
      runner.position.set(0, baseH + 0.1 + mattH + 0.03, bedD * 0.34);
      runner.castShadow = true;
      group.add(runner);

      group.position.set(cx, 0, backZ + bedD / 2 + 0.18);
      break;
    }

    case "pillow": {
      const pCount = Math.max(2, Math.round(objW / 0.7));
      const pw = (objW * 0.9) / pCount;
      const pMat = new THREE.MeshStandardMaterial({
        map: makeFabricTexture(pc),
        roughness: 0.85,
      });
      const accentPMat = new THREE.MeshStandardMaterial({
        map: makeFabricTexture(sc, true),
        roughness: 0.85,
      });

      for (let i = 0; i < pCount; i++) {
        const px = ((i + 0.5) / pCount - 0.5) * objW * 0.9;
        // Back sleeping pillow
        const p1 = new THREE.Mesh(
          new THREE.BoxGeometry(pw * 0.92, 0.16, 0.42),
          pMat
        );
        p1.position.set(px, 0.74, 0);
        p1.rotation.x = 0.25;
        p1.castShadow = true;
        group.add(p1);

        // Front accent cushion
        const p2 = new THREE.Mesh(
          new THREE.BoxGeometry(pw * 0.72, 0.14, 0.32),
          accentPMat
        );
        p2.position.set(px, 0.72, 0.24);
        p2.rotation.x = 0.38;
        p2.castShadow = true;
        group.add(p2);
      }
      group.position.set(cx, 0, backZ + 0.55);
      break;
    }

    case "nightstand": {
      const nsD = 0.56;
      const nsH = clamp(objH, 0.48, 0.72);
      const nsW = clamp(objW, 0.45, 0.9);
      const woodMat = new THREE.MeshStandardMaterial({
        map: makeWoodTexture(pc),
        roughness: 0.42,
      });

      const body = new THREE.Mesh(
        new THREE.BoxGeometry(nsW, nsH, nsD),
        woodMat
      );
      body.position.y = nsH / 2;
      body.castShadow = true;
      body.receiveShadow = true;
      group.add(body);

      // 2 drawer fronts + brass pulls
      for (const dy of [nsH * 0.28, nsH * 0.72]) {
        const drawer = new THREE.Mesh(
          new THREE.BoxGeometry(nsW * 0.88, nsH * 0.36, 0.03),
          woodMat
        );
        drawer.position.set(0, dy, nsD / 2 + 0.01);
        group.add(drawer);

        const pull = new THREE.Mesh(
          new THREE.BoxGeometry(nsW * 0.28, 0.025, 0.04),
          brassMat
        );
        pull.position.set(0, dy, nsD / 2 + 0.035);
        group.add(pull);
      }

      group.position.set(cx, 0, backZ + nsD / 2 + 0.08);
      break;
    }

    case "lamp": {
      const isFloorLamp = obj.h > 0.32;
      // Check if lamp sits on a nearby nightstand
      const nearNs = nightstands.find(
        (n) => Math.abs(n.x + n.w / 2 - (obj.x + obj.w / 2)) < 0.14
      );
      const baseY = isFloorLamp ? 0 : nearNs ? clamp(nearNs.h * roomH * 0.92, 0.48, 0.72) : 0.58;
      const lampH = isFloorLamp ? clamp(objH, 1.2, 1.75) : 0.48;

      const baseMat = new THREE.MeshStandardMaterial({
        color: pc,
        roughness: 0.3,
        metalness: 0.2,
      });
      const shadeMat = new THREE.MeshStandardMaterial({
        color: sc,
        emissive: isWarm ? 0xffd27d : 0xfff4dc,
        emissiveIntensity: 0.95,
        roughness: 0.6,
        side: THREE.DoubleSide,
      });

      if (isFloorLamp) {
        // Tripod / stand floor lamp
        const disc = new THREE.Mesh(
          new THREE.CylinderGeometry(0.18, 0.2, 0.04, 24),
          brassMat
        );
        disc.position.y = 0.02;
        group.add(disc);

        const pole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.02, 0.025, lampH * 0.78, 12),
          brassMat
        );
        pole.position.y = lampH * 0.39;
        pole.castShadow = true;
        group.add(pole);

        const shade = new THREE.Mesh(
          new THREE.CylinderGeometry(0.16, 0.26, 0.32, 24, 1, true),
          shadeMat
        );
        shade.position.y = lampH * 0.85;
        group.add(shade);

        const bulb = new THREE.PointLight(
          isWarm ? 0xffcb77 : 0xfff3d6,
          2.2,
          5.5,
          1.8
        );
        bulb.position.set(0, lampH * 0.82, 0.1);
        group.add(bulb);
      } else {
        // Table lamp
        const pot = new THREE.Mesh(
          new THREE.CylinderGeometry(0.07, 0.1, 0.22, 20),
          baseMat
        );
        pot.position.y = 0.11;
        pot.castShadow = true;
        group.add(pot);

        const shade = new THREE.Mesh(
          new THREE.CylinderGeometry(0.13, 0.18, 0.22, 24, 1, true),
          shadeMat
        );
        shade.position.y = 0.34;
        group.add(shade);

        const bulb = new THREE.PointLight(
          isWarm ? 0xffc96b : 0xfff2d6,
          1.8,
          4.5,
          1.8
        );
        bulb.position.set(0, 0.34, 0.12);
        group.add(bulb);
      }

      group.position.set(cx, baseY, backZ + 0.36);
      break;
    }

    case "chandelier": {
      const isPlant = (obj.label || "").toLowerCase().includes("plant");
      const dropY = clamp(topY, roomH * 0.52, roomH - 0.35);
      const cordLen = roomH - dropY;

      const cord = new THREE.Mesh(
        new THREE.CylinderGeometry(0.01, 0.01, cordLen, 8),
        brassMat
      );
      cord.position.y = dropY + cordLen / 2;
      group.add(cord);

      if (isPlant) {
        const pot = new THREE.Mesh(
          new THREE.CylinderGeometry(0.14, 0.1, 0.16, 16),
          new THREE.MeshStandardMaterial({ color: sc, roughness: 0.7 })
        );
        pot.position.y = dropY;
        group.add(pot);

        const leafMat = new THREE.MeshStandardMaterial({
          color: pc,
          roughness: 0.6,
        });
        for (let i = 0; i < 6; i++) {
          const leaf = new THREE.Mesh(
            new THREE.SphereGeometry(0.09, 8, 8),
            leafMat
          );
          const ang = (i / 6) * Math.PI * 2;
          leaf.position.set(
            Math.cos(ang) * 0.14,
            dropY + 0.04,
            Math.sin(ang) * 0.14
          );
          group.add(leaf);
        }
      } else {
        const shadeMat = new THREE.MeshStandardMaterial({
          color: sc,
          emissive: 0xffd588,
          emissiveIntensity: 1.0,
          roughness: 0.4,
        });
        const dome = new THREE.Mesh(
          new THREE.ConeGeometry(0.18, 0.22, 20, 1, true),
          shadeMat
        );
        dome.position.y = dropY;
        group.add(dome);

        const light = new THREE.PointLight(0xffd27f, 2.0, 6.0, 1.8);
        light.position.set(0, dropY - 0.1, 0);
        group.add(light);
      }

      group.position.set(cx, 0, backZ + 1.2);
      break;
    }

    case "sofa": {
      const sofaD = 1.05;
      const sofaH = 0.82;
      const fabricMat = new THREE.MeshStandardMaterial({
        map: makeFabricTexture(pc),
        roughness: 0.88,
      });
      const legMat = new THREE.MeshStandardMaterial({
        map: makeWoodTexture(sc),
        roughness: 0.45,
      });

      // Base
      const base = new THREE.Mesh(
        new THREE.BoxGeometry(objW, 0.24, sofaD),
        fabricMat
      );
      base.position.y = 0.22;
      base.castShadow = true;
      base.receiveShadow = true;
      group.add(base);

      // Legs
      for (const lx of [-objW / 2 + 0.1, objW / 2 - 0.1]) {
        for (const lz of [-sofaD / 2 + 0.1, sofaD / 2 - 0.1]) {
          const leg = new THREE.Mesh(
            new THREE.CylinderGeometry(0.03, 0.02, 0.14, 10),
            legMat
          );
          leg.position.set(lx, 0.07, lz);
          group.add(leg);
        }
      }

      // 3 Seat cushions + 3 back cushions
      const n = 3;
      const cw = (objW * 0.84) / n;
      for (let i = 0; i < n; i++) {
        const sx = ((i + 0.5) / n - 0.5) * objW * 0.84;
        const seat = new THREE.Mesh(
          new THREE.BoxGeometry(cw * 0.94, 0.16, sofaD * 0.78),
          fabricMat
        );
        seat.position.set(sx, 0.42, 0.06);
        seat.castShadow = true;
        group.add(seat);

        const back = new THREE.Mesh(
          new THREE.BoxGeometry(cw * 0.94, sofaH * 0.52, 0.22),
          fabricMat
        );
        back.position.set(sx, 0.58, -sofaD / 2 + 0.15);
        back.rotation.x = -0.1;
        back.castShadow = true;
        group.add(back);
      }

      // Armrests
      for (const side of [-1, 1]) {
        const arm = new THREE.Mesh(
          new THREE.BoxGeometry(0.16, 0.44, sofaD),
          fabricMat
        );
        arm.position.set(side * (objW / 2 - 0.08), 0.44, 0);
        arm.castShadow = true;
        group.add(arm);
      }

      group.position.set(cx, 0, backZ + sofaD / 2 + 1.25);
      break;
    }

    case "rug": {
      const rugW = clamp(objW, 1.8, roomW * 0.85);
      const rugD = 3.2;
      const rugMat = new THREE.MeshStandardMaterial({
        map: makeRugTexture(pc, sc),
        roughness: 0.95,
      });
      const rug = new THREE.Mesh(new THREE.BoxGeometry(rugW, 0.018, rugD), rugMat);
      rug.position.set(cx, 0.01, backZ + rugD / 2 + 0.75);
      rug.receiveShadow = true;
      group.add(rug);
      break;
    }

    case "plant": {
      const pH = clamp(objH, 0.75, 1.8);
      const potMat = new THREE.MeshStandardMaterial({
        color: "#E8E2D8",
        roughness: 0.4,
      });
      const leafMat = new THREE.MeshStandardMaterial({
        color: pc,
        roughness: 0.55,
        side: THREE.DoubleSide,
      });

      const pot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.16, pH * 0.32, 20),
        potMat
      );
      pot.position.y = pH * 0.16;
      pot.castShadow = true;
      group.add(pot);

      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2;
        const blade = new THREE.Mesh(
          new THREE.ConeGeometry(0.14, pH * 0.65, 6),
          leafMat
        );
        blade.position.set(
          Math.cos(ang) * 0.14,
          pH * 0.55,
          Math.sin(ang) * 0.14
        );
        blade.rotation.z = Math.cos(ang) * 0.45;
        blade.rotation.x = Math.sin(ang) * 0.45;
        blade.castShadow = true;
        group.add(blade);
      }

      group.position.set(cx, 0, backZ + 0.55);
      break;
    }

    case "artwork": {
      const isMirror = (obj.label || "").toLowerCase().includes("mirror");
      const frameMat = new THREE.MeshStandardMaterial({
        map: makeWoodTexture(pc),
        roughness: 0.4,
      });
      const artY = clamp(topY - objH / 2, 1.6, roomH - 0.5);

      if (isMirror) {
        const r = clamp(Math.min(objW, objH) / 2, 0.25, 0.55);
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(r, 0.045, 12, 32),
          frameMat
        );
        const glass = new THREE.Mesh(
          new THREE.CircleGeometry(r * 0.95, 32),
          new THREE.MeshStandardMaterial({
            color: "#d9e8f5",
            roughness: 0.05,
            metalness: 0.9,
          })
        );
        glass.position.z = 0.01;
        group.add(ring, glass);
      } else {
        const frame = new THREE.Mesh(
          new THREE.BoxGeometry(objW, objH, 0.05),
          frameMat
        );
        const canvasMesh = new THREE.Mesh(
          new THREE.BoxGeometry(objW * 0.86, objH * 0.82, 0.06),
          new THREE.MeshStandardMaterial({
            map: makeFabricTexture(sc),
            roughness: 0.7,
          })
        );
        frame.castShadow = true;
        group.add(frame, canvasMesh);
      }

      group.position.set(cx, artY, backZ + 0.04);
      break;
    }

    case "window": {
      const winY = clamp(topY - objH / 2, 1.2, roomH - 0.6);
      const skyMat = new THREE.MeshStandardMaterial({
        color: "#b8e2ff",
        emissive: isDaylight ? 0xd8f0ff : 0x7cb8e8,
        emissiveIntensity: 0.8,
      });
      const frameMat = new THREE.MeshStandardMaterial({
        color: "#F3EFEA",
        roughness: 0.4,
      });

      const pane = new THREE.Mesh(
        new THREE.BoxGeometry(objW, objH, 0.04),
        skyMat
      );
      const topFrame = new THREE.Mesh(
        new THREE.BoxGeometry(objW + 0.08, 0.06, 0.08),
        frameMat
      );
      topFrame.position.y = objH / 2;
      const botFrame = new THREE.Mesh(
        new THREE.BoxGeometry(objW + 0.08, 0.06, 0.08),
        frameMat
      );
      botFrame.position.y = -objH / 2;
      const midBar = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, objH, 0.07),
        frameMat
      );

      group.add(pane, topFrame, botFrame, midBar);
      group.position.set(cx, winY, backZ + 0.03);
      break;
    }

    case "curtain": {
      const curtMat = new THREE.MeshStandardMaterial({
        map: makeFabricTexture(pc),
        roughness: 0.9,
      });
      const folds = 5;
      const fw = objW / folds;
      for (let i = 0; i < folds; i++) {
        const pleat = new THREE.Mesh(
          new THREE.CylinderGeometry(fw * 0.55, fw * 0.55, objH, 12),
          curtMat
        );
        pleat.position.set(((i + 0.5) / folds - 0.5) * objW, objH / 2, 0);
        pleat.castShadow = true;
        group.add(pleat);
      }
      group.position.set(cx, 0, backZ + 0.12);
      break;
    }

    case "door":
    case "other": {
      const cabD = 0.62;
      const cabH = clamp(objH, 1.0, roomH - 0.25);
      const woodMat = new THREE.MeshStandardMaterial({
        map: makeWoodTexture(pc),
        roughness: 0.42,
      });
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(objW, cabH, cabD),
        woodMat
      );
      box.position.y = cabH / 2;
      box.castShadow = true;
      box.receiveShadow = true;
      group.add(box);

      const handle = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, 0.2, 0.04),
        brassMat
      );
      handle.position.set(0, cabH * 0.5, cabD / 2 + 0.02);
      group.add(handle);

      group.position.set(cx, 0, backZ + cabD / 2 + 0.05);
      break;
    }

    case "table":
    case "chair": {
      const tD = 0.75;
      const tH = obj.type === "chair" ? 0.85 : 0.75;
      const woodMat = new THREE.MeshStandardMaterial({
        map: makeWoodTexture(pc),
        roughness: 0.45,
      });
      const top = new THREE.Mesh(
        new THREE.BoxGeometry(objW, 0.06, tD),
        woodMat
      );
      top.position.y = tH * 0.6;
      top.castShadow = true;
      group.add(top);

      for (const lx of [-objW / 2 + 0.06, objW / 2 - 0.06]) {
        for (const lz of [-tD / 2 + 0.06, tD / 2 - 0.06]) {
          const leg = new THREE.Mesh(
            new THREE.CylinderGeometry(0.025, 0.02, tH * 0.6, 8),
            woodMat
          );
          leg.position.set(lx, tH * 0.3, lz);
          leg.castShadow = true;
          group.add(leg);
        }
      }
      group.position.set(cx, 0, backZ + 1.6);
      break;
    }

    default: {
      const mat = new THREE.MeshStandardMaterial({
        map: makeWoodTexture(pc),
        roughness: 0.6,
      });
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(objW, objH, 0.5),
        mat
      );
      m.position.y = objH / 2;
      m.castShadow = true;
      m.receiveShadow = true;
      group.add(m);
      group.position.set(cx, 0, backZ + 0.4);
    }
  }

  scene.add(group);
}
