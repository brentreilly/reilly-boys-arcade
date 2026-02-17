// Three.js renderer: builds 3D scenes for each hole
// Low-poly flat-shaded aesthetic with terrain, trees, water, sky

import * as THREE from 'three';
import { SURFACES } from './clubs.js';
import { createHoleTerrain, getTreePositions } from './course.js';

export class GolfRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      powerPreference: 'low-power',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.BasicShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 1, 400);

    // Gradient sky background
    this.scene.fog = new THREE.FogExp2(0x87CEEB, 0.006);
    this.scene.background = this.createSkyGradient();

    // Lights
    this.setupLighting();

    // Reusable geometries
    this.treeGeometries = this.createTreeGeometries();
    this.ballMesh = null;
    this.flagGroup = null;
    this.trailLine = null;
    this.aimLine = null;
    this.terrainMesh = null;
    this.waterMeshes = [];
    this.treeMeshes = [];
    this.landingMarker = null;

    this.createBall();
    this.createBallShadow();
    this.createFlag();
    this.createTrail();
    this.createAimLine();
    this.createLandingMarker();

    window.addEventListener('resize', () => this.onResize());
    this.onResize();
  }

  setupLighting() {
    // Warm sunlight
    const sun = new THREE.DirectionalLight(0xFFF4D6, 1.8);
    sun.position.set(50, 80, 30);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 512;
    sun.shadow.mapSize.height = 512;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 300;
    sun.shadow.camera.left = -80;
    sun.shadow.camera.right = 80;
    sun.shadow.camera.top = 80;
    sun.shadow.camera.bottom = -80;
    sun.shadow.bias = -0.001;
    this.sun = sun;
    this.scene.add(sun);

    // Ambient fill
    const ambient = new THREE.AmbientLight(0x7EC8E3, 0.5);
    this.scene.add(ambient);

    // Hemisphere light for natural sky/ground color
    const hemi = new THREE.HemisphereLight(0x87CEEB, 0x3D5C1F, 0.4);
    this.scene.add(hemi);
  }

  createSkyGradient() {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, '#1a3a5c');    // deep blue at top
    gradient.addColorStop(0.4, '#5b8fb9');  // medium blue
    gradient.addColorStop(0.7, '#87CEEB');  // sky blue
    gradient.addColorStop(0.9, '#c5e4f0');  // pale horizon
    gradient.addColorStop(1.0, '#e8d5a3');  // warm horizon glow
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 256);
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.LinearFilter;
    return texture;
  }

  createBallShadow() {
    const geo = new THREE.CircleGeometry(0.3, 12);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.25,
      depthWrite: false,
    });
    this.ballShadow = new THREE.Mesh(geo, mat);
    this.ballShadow.rotation.x = -Math.PI / 2;
    this.scene.add(this.ballShadow);
  }

  createTreeGeometries() {
    // Pine tree
    const pineTrunk = new THREE.CylinderGeometry(0.15, 0.25, 2, 5);
    const pineCone1 = new THREE.ConeGeometry(2.0, 4, 6);
    const pineCone2 = new THREE.ConeGeometry(1.5, 3, 6);
    const pineCone3 = new THREE.ConeGeometry(1.0, 2.5, 6);

    // Oak tree
    const oakTrunk = new THREE.CylinderGeometry(0.2, 0.35, 2.5, 5);
    const oakCanopy = new THREE.IcosahedronGeometry(2.5, 1);

    return { pineTrunk, pineCone1, pineCone2, pineCone3, oakTrunk, oakCanopy };
  }

  createBall() {
    const geo = new THREE.SphereGeometry(0.15, 12, 8);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xFFFFFF,
      roughness: 0.3,
      metalness: 0.0,
    });
    this.ballMesh = new THREE.Mesh(geo, mat);
    this.ballMesh.castShadow = true;
    this.scene.add(this.ballMesh);
  }

  createFlag() {
    this.flagGroup = new THREE.Group();

    // Pole
    const poleGeo = new THREE.CylinderGeometry(0.03, 0.03, 2.5, 6);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0xCCCCCC, metalness: 0.6 });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.y = 1.25;
    this.flagGroup.add(pole);

    // Flag
    const flagGeo = new THREE.BufferGeometry();
    const vertices = new Float32Array([
      0, 2.2, 0,
      0.8, 2.35, 0,
      0, 2.5, 0,
    ]);
    flagGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    flagGeo.computeVertexNormals();
    const flagMat = new THREE.MeshBasicMaterial({ color: 0xFF2020, side: THREE.DoubleSide });
    const flag = new THREE.Mesh(flagGeo, flagMat);
    this.flagGroup.add(flag);

    // Hole ring
    const ringGeo = new THREE.TorusGeometry(0.108, 0.02, 8, 16);
    const ringMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.01;
    this.flagGroup.add(ring);

    this.scene.add(this.flagGroup);
  }

  createTrail() {
    const maxPoints = 500;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(maxPoints * 3);
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setDrawRange(0, 0);

    const material = new THREE.LineBasicMaterial({
      color: 0xFFFFFF,
      transparent: true,
      opacity: 0.6,
      linewidth: 2,
    });

    this.trailLine = new THREE.Line(geometry, material);
    this.scene.add(this.trailLine);
  }

  createAimLine() {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(6); // 2 points
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.LineDashedMaterial({
      color: 0xFFFF00,
      dashSize: 1,
      gapSize: 0.5,
      transparent: true,
      opacity: 0.8,
    });

    this.aimLine = new THREE.Line(geometry, material);
    this.aimLine.computeLineDistances();
    this.scene.add(this.aimLine);
  }

  createLandingMarker() {
    const geo = new THREE.RingGeometry(1.5, 2.0, 24);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xFFFF44,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
    });
    this.landingMarker = new THREE.Mesh(geo, mat);
    this.landingMarker.rotation.x = -Math.PI / 2;
    this.landingMarker.visible = false;
    this.scene.add(this.landingMarker);
  }

  buildHoleScene(hole, terrain) {
    // Clear old terrain and trees
    if (this.terrainMesh) {
      this.scene.remove(this.terrainMesh);
      this.terrainMesh.geometry.dispose();
    }
    for (const t of this.treeMeshes) {
      this.scene.remove(t);
    }
    this.treeMeshes = [];
    for (const w of this.waterMeshes) {
      this.scene.remove(w);
    }
    this.waterMeshes = [];

    // Build terrain mesh
    const segsX = 70;
    const segsZ = 90;
    const geo = new THREE.PlaneGeometry(terrain.width, terrain.length, segsX, segsZ);
    geo.rotateX(-Math.PI / 2);

    const positions = geo.attributes.position.array;
    const colors = new Float32Array(positions.length);
    const halfW = terrain.width / 2;
    const halfL = terrain.length / 2;

    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const z = positions[i + 2];

      // Map from geometry coords to world coords
      // Geometry goes from -halfL to +halfL in z, we want 0 to length
      const worldX = x;
      const worldZ = z + halfL;

      positions[i + 1] = terrain.getElevation(worldX, worldZ);
      positions[i] = worldX;
      positions[i + 2] = worldZ;

      // Color by surface type
      const surface = terrain.getSurface(worldX, worldZ);
      const surfData = SURFACES[surface] || SURFACES.rough;
      colors[i] = surfData.color[0];
      colors[i + 1] = surfData.color[1];
      colors[i + 2] = surfData.color[2];

      // Subtle variation
      const vary = (Math.sin(worldX * 3.7) * Math.cos(worldZ * 2.3) * 0.02);
      colors[i] = Math.max(0, Math.min(1, colors[i] + vary));
      colors[i + 1] = Math.max(0, Math.min(1, colors[i + 1] + vary));
      colors[i + 2] = Math.max(0, Math.min(1, colors[i + 2] + vary));
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    const mat = new THREE.MeshLambertMaterial({
      vertexColors: true,
      flatShading: true,
    });

    this.terrainMesh = new THREE.Mesh(geo, mat);
    this.terrainMesh.receiveShadow = true;
    this.scene.add(this.terrainMesh);

    // Large ground plane underneath to prevent sky showing through at edges
    if (this.groundPlane) this.scene.remove(this.groundPlane);
    const gpGeo = new THREE.PlaneGeometry(600, 600);
    const gpMat = new THREE.MeshLambertMaterial({ color: 0x2A5E1A });
    this.groundPlane = new THREE.Mesh(gpGeo, gpMat);
    this.groundPlane.rotation.x = -Math.PI / 2;
    this.groundPlane.position.set(0, -0.5, terrain.length / 2);
    this.groundPlane.receiveShadow = true;
    this.scene.add(this.groundPlane);

    // Add water planes
    for (const water of hole.water) {
      const wGeo = new THREE.PlaneGeometry(water.width, water.length);
      const wMat = new THREE.MeshStandardMaterial({
        color: 0x2E6B8A,
        transparent: true,
        opacity: 0.75,
        roughness: 0.1,
        metalness: 0.3,
      });
      const wMesh = new THREE.Mesh(wGeo, wMat);
      wMesh.rotation.x = -Math.PI / 2;
      const waterY = terrain.getElevation(water.x, water.z) - 0.3;
      wMesh.position.set(water.x, waterY, water.z);
      this.scene.add(wMesh);
      this.waterMeshes.push(wMesh);
    }

    // Add trees
    const treePositions = getTreePositions(hole, terrain);
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x5C3A1E, flatShading: true });
    const leafMats = [
      new THREE.MeshLambertMaterial({ color: 0x2D5A1E, flatShading: true }),
      new THREE.MeshLambertMaterial({ color: 0x3A6B2A, flatShading: true }),
      new THREE.MeshLambertMaterial({ color: 0x1E4A15, flatShading: true }),
    ];

    for (const tp of treePositions) {
      const group = new THREE.Group();
      const leafMat = leafMats[Math.floor(Math.random() * leafMats.length)];

      if (tp.type === 'pine') {
        const trunk = new THREE.Mesh(this.treeGeometries.pineTrunk, trunkMat);
        trunk.position.y = 1;
        group.add(trunk);

        const c1 = new THREE.Mesh(this.treeGeometries.pineCone1, leafMat);
        c1.position.y = 3.5;
        group.add(c1);
        const c2 = new THREE.Mesh(this.treeGeometries.pineCone2, leafMat);
        c2.position.y = 5.5;
        group.add(c2);
        const c3 = new THREE.Mesh(this.treeGeometries.pineCone3, leafMat);
        c3.position.y = 7;
        group.add(c3);
      } else {
        const trunk = new THREE.Mesh(this.treeGeometries.oakTrunk, trunkMat);
        trunk.position.y = 1.25;
        group.add(trunk);

        const canopy = new THREE.Mesh(this.treeGeometries.oakCanopy, leafMat);
        canopy.position.y = 4.5;
        group.add(canopy);
      }

      group.position.set(tp.x, tp.y, tp.z);
      group.scale.setScalar(tp.scale);
      group.castShadow = true;
      this.scene.add(group);
      this.treeMeshes.push(group);
    }

    // Position flag
    const pinY = terrain.getElevation(hole.pin.x, hole.pin.z);
    this.flagGroup.position.set(hole.pin.x, pinY, hole.pin.z);

    // Update sun position for the hole
    const midZ = terrain.holeMeters / 2;
    this.sun.position.set(50, 80, midZ);
    this.sun.target.position.set(0, 0, midZ);
    this.scene.add(this.sun.target);
  }

  updateBall(ballPos, visible = true, groundY = 0) {
    this.ballMesh.position.set(ballPos.x, ballPos.y + 0.15, ballPos.z);
    this.ballMesh.visible = visible;

    // Shadow on ground below ball — shrinks and fades with altitude
    const height = Math.max(0, ballPos.y - groundY);
    const shadowScale = Math.max(0.3, 1.0 - height * 0.015);
    const shadowOpacity = Math.max(0.05, 0.25 - height * 0.004);
    this.ballShadow.position.set(ballPos.x, groundY + 0.02, ballPos.z);
    this.ballShadow.scale.setScalar(shadowScale);
    this.ballShadow.material.opacity = shadowOpacity;
    this.ballShadow.visible = visible;
  }

  updateTrail(trail) {
    const positions = this.trailLine.geometry.attributes.position.array;
    const count = Math.min(trail.length, 500);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = trail[i].x;
      positions[i * 3 + 1] = trail[i].y + 0.1;
      positions[i * 3 + 2] = trail[i].z;
    }

    this.trailLine.geometry.attributes.position.needsUpdate = true;
    this.trailLine.geometry.setDrawRange(0, count);
  }

  updateAimLine(ballPos, aimDirDeg, distance, getElevation) {
    const aimRad = aimDirDeg * Math.PI / 180;
    const endX = ballPos.x + Math.sin(aimRad) * distance;
    const endZ = ballPos.z + Math.cos(aimRad) * distance;
    const endY = getElevation ? getElevation(endX, endZ) + 0.2 : ballPos.y + 0.2;

    const positions = this.aimLine.geometry.attributes.position.array;
    positions[0] = ballPos.x;
    positions[1] = ballPos.y + 0.3;
    positions[2] = ballPos.z;
    positions[3] = endX;
    positions[4] = endY;
    positions[5] = endZ;

    this.aimLine.geometry.attributes.position.needsUpdate = true;
    this.aimLine.computeLineDistances();
    this.aimLine.visible = true;

    // Landing marker
    const landX = ballPos.x + Math.sin(aimRad) * distance * 0.9;
    const landZ = ballPos.z + Math.cos(aimRad) * distance * 0.9;
    const landY = getElevation ? getElevation(landX, landZ) + 0.1 : 0.1;
    this.landingMarker.position.set(landX, landY, landZ);
    this.landingMarker.visible = true;
  }

  hideAimLine() {
    this.aimLine.visible = false;
    this.landingMarker.visible = false;
  }

  clearTrail() {
    this.trailLine.geometry.setDrawRange(0, 0);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }
}
