import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GameAudio } from './audio';
import { CityMaterialLibrary, createCityMaterials } from './materials';
import {
  createBuildingModel,
  createCactusModel,
  createCarModel,
  createCraftTableModel,
  createDesertMesaModel,
  createFirstPersonGun,
  createLootCrateModel,
  createMountainModel,
  createNpcModel,
  createPlainsTreeModel,
  NpcModelRig,
} from './models';
import {
  BIOME_LABELS,
  BiomeId,
  GamePhase,
  HudSnapshot,
  STORY_CHAPTERS,
  WeaponId,
  WEAPONS,
  WeatherState,
} from './types';

interface BuildingCollider {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  height: number;
}

interface CityChunk {
  key: string;
  cx: number;
  cz: number;
  group: THREE.Group;
  colliders: BuildingCollider[];
  craftTablePos: THREE.Vector3 | null;
}

interface StreetLoot {
  id: number;
  mesh: THREE.Group;
  x: number;
  z: number;
  collected: boolean;
  bobPhase: number;
}

interface CityNpc {
  id: number;
  role: 'civilian' | 'syndicate' | 'boss';
  rig: NpcModelRig;
  hitMesh: THREE.Mesh;
  x: number;
  z: number;
  yaw: number;
  speed: number;
  hp: number;
  maxHp: number;
  state: 'walk' | 'flee' | 'combat';
  stateTimer: number;
  fireCooldown: number;
  walkCycle: number;
}

interface CityCar {
  id: number;
  mesh: THREE.Group;
  x: number;
  z: number;
  yaw: number; // 0 = -Z
  speed: number;
  axis: 'x' | 'z';
  dir: 1 | -1;
  isPlayerDriven: boolean;
}

interface TracerBeam {
  line: THREE.Line;
  life: number;
  maxLife: number;
  active: boolean;
}

interface Particle {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  active: boolean;
}

const CHUNK_SIZE = 34; // 12m road corridor + 22m sidewalk/building plaza
const ACTIVE_RADIUS = 2; // 5x5 = 25 active chunks streaming infinitely
const GRAVITY = 26;
const EYE_HEIGHT = 1.66;
const DAY_CYCLE_DURATION = 78; // full day/night cycle in seconds

const _v3A = new THREE.Vector3();
const _v3B = new THREE.Vector3();
const _colorA = new THREE.Color();
const _colorB = new THREE.Color();
const _colorC = new THREE.Color();
const _raycaster = new THREE.Raycaster();
const _centerNDC = new THREE.Vector2(0, 0);

function hash2D(x: number, z: number): number {
  const n = Math.sin(x * 127.1 + z * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}

function detectSoftwareWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl =
      (canvas.getContext('webgl2') as WebGL2RenderingContext | null) ||
      (canvas.getContext('webgl') as WebGLRenderingContext | null);
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return false;
  }
}

export class InfiniteCityEngine {
  private container: HTMLElement;
  private onHudUpdate: (snapshot: HudSnapshot) => void;
  public readonly audio = new GameAudio();

  private isSoftwareGl: boolean;
  private isLowEndMobile: boolean;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private mats: CityMaterialLibrary;
  private envRT: THREE.WebGLRenderTarget | null = null;

  // Lighting, Sky, Clouds & Rain
  private sunLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private skyDome: THREE.Mesh;
  private fog: THREE.FogExp2;
  private cloudGroup: THREE.Group;
  private clouds: THREE.Group[] = [];
  private rainLines: THREE.LineSegments;
  private rainPos: Float32Array;
  private readonly rainCount = 120;

  // Infinite Multi-Biome World Chunks
  private chunks = new Map<string, CityChunk>();
  private lastChunkX = Number.NaN;
  private lastChunkZ = Number.NaN;
  private currentBiome: BiomeId = 'city';
  private allColliders: BuildingCollider[] = [];
  private craftTables: THREE.Vector3[] = [];

  // Dynamic World Entities
  private lootCrates: StreetLoot[] = [];
  private nextLootId = 1;
  private npcs: CityNpc[] = [];
  private npcHitMeshes: THREE.Mesh[] = [];
  private nextNpcId = 1;
  private cars: CityCar[] = [];
  private nextCarId = 1;

  // Pooled Tracers & Particles
  private tracers: TracerBeam[] = [];
  private particles: Particle[] = [];
  private particleGeo = new THREE.BoxGeometry(0.14, 0.14, 0.14);

  // Player & First-Person Weapon
  private playerPos = new THREE.Vector3(11, 0, 11);
  private playerVel = new THREE.Vector3(0, 0, 0);
  private lookYaw = 0;
  private lookPitch = 0;
  private onGround = true;
  private walkBobPhase = 0;
  private shakeIntensity = 0;

  private fpGunHolder = new THREE.Group();
  private fpGunMeshes: Record<WeaponId, { group: THREE.Group; flash: THREE.Mesh }>;
  private gunRecoil = 0;
  private muzzleTimer = 0;
  private fireCooldown = 0;
  private isFiringHeld = false;
  private hitMarkerTimer = 0;

  // Vehicle driving state
  private drivenCar: CityCar | null = null;
  private driveDistanceAccum = 0;
  private nearCar: CityCar | null = null;
  private nearCraftTable = false;

  // Player Stats & Inventory
  private health = 100;
  private readonly maxHealth = 100;
  private armor = 25;
  private cash = 40;
  private scrap = 2;
  private tech = 0;
  private xp = 0;
  private level = 1;
  private kills = 0;
  private cratesLooted = 0;
  private syndicateKills = 0;
  private bossSpawned = false;
  private bossDefeated = false;

  private equippedWeapon: WeaponId = 'pistol';
  private unlockedWeapons: Set<WeaponId> = new Set(['pistol']);
  private ammoMap: Record<WeaponId, number> = {
    pistol: WEAPONS.pistol.magSize,
    smg: WEAPONS.smg.magSize,
    shotgun: WEAPONS.shotgun.magSize,
    railgun: WEAPONS.railgun.magSize,
  };
  private isReloading = false;
  private reloadTimer = 0;

  // Story & Cinematic Director
  private phase: GamePhase = 'title';
  private endlessFreeRoam = false;
  private chapterIndex = 0;
  private cinematicTimer = 0;
  private cinematicDuration = 4.2;
  private cinematicHeadline = '';
  private cinematicSubtitle = '';
  private cinematicFocus = new THREE.Vector3(0, 8, 0);
  private cinematicOnComplete: (() => void) | null = null;

  // Time & Weather
  private elapsedTime = 0;
  private timeOfDay = 0.28; // 0..1 (0.25 morning, 0.5 noon, 0.78 sunset, 0.95 night)
  private dayCount = 1;
  private weather: WeatherState = 'cloudy';
  private weatherTimer = 26;
  private rainIntensity = 0;
  private toastMessage: string | null = null;
  private toastTimer = 0;

  // Input (Keyboard + Mouse + Mobile Touch + Optional Gyro)
  private keys = new Set<string>();
  private virtualMoveX = 0;
  private virtualMoveZ = 0;
  private virtualSprint = false;
  private isMouseDragging = false;
  private lastMouseX = 0;
  private lastMouseY = 0;
  private dragMoved = false;
  private gyroEnabled = false;
  private lastGyroBeta: number | null = null;
  private lastGyroGamma: number | null = null;

  // Loop
  private frameId = 0;
  private disposed = false;
  private lastFrameTime = performance.now();
  private hudThrottleTimer = 0;

  constructor(container: HTMLElement, onHudUpdate: (snapshot: HudSnapshot) => void) {
    this.container = container;
    this.onHudUpdate = onHudUpdate;
    this.isSoftwareGl = detectSoftwareWebGL();
    this.isLowEndMobile =
      window.innerWidth <= 900 || /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x283a52);
    this.fog = new THREE.FogExp2(0x526b84, 0.0085);
    this.scene.fog = this.fog;

    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    const initialFov = h > w ? 78 : 68;
    this.camera = new THREE.PerspectiveCamera(initialFov, w / h, 0.08, 240);
    this.camera.rotation.order = 'YXZ';
    this.scene.add(this.camera);

    const enableShadows = !this.isSoftwareGl && !this.isLowEndMobile;
    this.renderer = new THREE.WebGLRenderer({
      antialias: enableShadows,
      powerPreference: 'default',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.setPixelRatio(
      this.isSoftwareGl || this.isLowEndMobile ? 1 : Math.min(window.devicePixelRatio || 1, 1.25)
    );
    this.renderer.setSize(w, h);
    this.renderer.shadowMap.enabled = enableShadows;
    this.renderer.shadowMap.type = THREE.BasicShadowMap;
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.touchAction = 'none';
    container.appendChild(this.renderer.domElement);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
    this.scene.environment = this.envRT.texture;
    pmrem.dispose();

    this.mats = createCityMaterials(this.renderer);

    // Lightweight Atmospheric Sky Dome
    this.skyDome = new THREE.Mesh(new THREE.SphereGeometry(210, 16, 12), this.mats.skyMaterial);
    this.skyDome.frustumCulled = false;
    this.scene.add(this.skyDome);

    // Lightweight Floating Clouds
    this.cloudGroup = new THREE.Group();
    this.scene.add(this.cloudGroup);
    this.buildSkyClouds();

    // Lightweight 3D Rain Streaks
    this.rainPos = new Float32Array(this.rainCount * 2 * 3);
    for (let i = 0; i < this.rainCount; i++) {
      this.setRainDrop(i, (Math.random() - 0.5) * 40, Math.random() * 24, (Math.random() - 0.5) * 40);
    }
    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute('position', new THREE.BufferAttribute(this.rainPos, 3));
    const rainMat = new THREE.LineBasicMaterial({
      color: 0xcbd5e1,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    });
    this.rainLines = new THREE.LineSegments(rainGeo, rainMat);
    this.rainLines.frustumCulled = false;
    this.rainLines.visible = false;
    this.scene.add(this.rainLines);

    // Outdoor Day/Night Lighting Rig (Android 4+ friendly)
    this.hemiLight = new THREE.HemisphereLight(0x9ac4f0, 0x32363e, 0.85);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff1d6, 2.0);
    this.sunLight.position.set(35, 55, 25);
    this.sunLight.castShadow = enableShadows;
    this.sunLight.shadow.mapSize.set(512, 512);
    this.sunLight.shadow.camera.near = 2;
    this.sunLight.shadow.camera.far = 140;
    const sd = 40;
    this.sunLight.shadow.camera.left = -sd;
    this.sunLight.shadow.camera.right = sd;
    this.sunLight.shadow.camera.top = sd;
    this.sunLight.shadow.camera.bottom = -sd;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    // First-Person Weapons attached to camera
    this.fpGunHolder.position.set(0.26, -0.22, -0.4);
    this.fpGunHolder.visible = false;
    this.camera.add(this.fpGunHolder);

    this.fpGunMeshes = {
      pistol: createFirstPersonGun('pistol', this.mats),
      smg: createFirstPersonGun('smg', this.mats),
      shotgun: createFirstPersonGun('shotgun', this.mats),
      railgun: createFirstPersonGun('railgun', this.mats),
    };
    (Object.keys(this.fpGunMeshes) as WeaponId[]).forEach((wid) => {
      this.fpGunMeshes[wid].group.visible = wid === this.equippedWeapon;
      this.fpGunHolder.add(this.fpGunMeshes[wid].group);
    });

    // Pooled Bullet Tracer Beams
    for (let i = 0; i < 20; i++) {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(),
        new THREE.Vector3(0, 0, -1),
      ]);
      const mat = new THREE.LineBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.9 });
      const line = new THREE.Line(geo, mat);
      line.visible = false;
      line.frustumCulled = false;
      this.scene.add(line);
      this.tracers.push({ line, life: 0, maxLife: 0.1, active: false });
    }

    // Pooled Impact Particles
    for (let i = 0; i < 64; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const mesh = new THREE.Mesh(this.particleGeo, mat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.particles.push({ mesh, vx: 0, vy: 0, vz: 0, life: 0, maxLife: 0.45, active: false });
    }

    // Stream initial infinite city around origin for live Title Screen
    this.updateCityChunks(true);
    this.spawnInitialTrafficAndNpcs();

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.bindEvents();
    this.emitHud();
    this.lastFrameTime = performance.now();
    this.tick();
  }

  private buildSkyClouds(): void {
    const puffGeo = new THREE.BoxGeometry(1, 1, 1);
    for (let i = 0; i < 10; i++) {
      const cluster = new THREE.Group();
      const puffs = 2 + Math.floor(Math.random() * 2);
      for (let p = 0; p < puffs; p++) {
        const mesh = new THREE.Mesh(puffGeo, this.mats.cloudMat);
        mesh.scale.set(
          9 + Math.random() * 12,
          2.4 + Math.random() * 2.2,
          7 + Math.random() * 9
        );
        mesh.position.set((p - 1) * 6.5, (Math.random() - 0.5) * 1.4, (Math.random() - 0.5) * 4);
        cluster.add(mesh);
      }
      cluster.position.set(
        (Math.random() - 0.5) * 220,
        62 + Math.random() * 22,
        (Math.random() - 0.5) * 220
      );
      this.cloudGroup.add(cluster);
      this.clouds.push(cluster);
    }
  }

  private setRainDrop(index: number, x: number, y: number, z: number): void {
    const b = index * 6;
    this.rainPos[b] = x;
    this.rainPos[b + 1] = y;
    this.rainPos[b + 2] = z;
    this.rainPos[b + 3] = x - 0.14;
    this.rainPos[b + 4] = y - 1.35;
    this.rainPos[b + 5] = z - 0.08;
  }

  // --- Deterministic Multi-Biome Infinite World Generator ---
  private getBiomeAt(cx: number, cz: number): BiomeId {
    // Spawn hub is always Metro City with a Craft Table & starter car
    if (cx === 0 && cz === 0) return 'city';

    // Winding River Valley cutting across the infinite world
    const riverNorth = Math.round(Math.sin(cx * 0.55) * 1.4) + 2;
    const riverSouth = Math.round(Math.cos(cx * 0.45) * 1.4) - 4;
    if (cz === riverNorth || cz === riverSouth) return 'river';

    // Immediate variety right around spawn so the world feels rich & distinct
    if (cx === 1 && cz === 0) return 'plains';
    if (cx === -1 && cz === 0) return 'desert';
    if (cx === 0 && cz === -1) return 'mountain';

    // Smooth regional biome distribution across the infinite map
    const region =
      Math.sin(cx * 0.42 + cz * 0.28) * 0.6 + Math.cos(cx * 0.25 - cz * 0.48) * 0.6;
    if (region < -0.45) return 'desert';
    if (region < 0.05) return 'plains';
    if (region < 0.48) return 'mountain';
    return 'city';
  }

  private updateCityChunks(force = false): void {
    const curCx = Math.floor(this.playerPos.x / CHUNK_SIZE);
    const curCz = Math.floor(this.playerPos.z / CHUNK_SIZE);
    this.currentBiome = this.getBiomeAt(curCx, curCz);
    if (!force && curCx === this.lastChunkX && curCz === this.lastChunkZ) return;
    this.lastChunkX = curCx;
    this.lastChunkZ = curCz;

    const needed = new Set<string>();
    for (let dx = -ACTIVE_RADIUS; dx <= ACTIVE_RADIUS; dx++) {
      for (let dz = -ACTIVE_RADIUS; dz <= ACTIVE_RADIUS; dz++) {
        const cx = curCx + dx;
        const cz = curCz + dz;
        const key = `${cx},${cz}`;
        needed.add(key);
        if (!this.chunks.has(key)) {
          const chunk = this.createCityChunk(cx, cz);
          this.chunks.set(key, chunk);
          this.scene.add(chunk.group);
        }
      }
    }

    // Recycle distant chunks to keep memory & draw calls low on Android 4+
    for (const [key, chunk] of this.chunks.entries()) {
      if (!needed.has(key)) {
        this.scene.remove(chunk.group);
        this.chunks.delete(key);
      }
    }

    // Rebuild flat collision & craft-table lists
    this.allColliders = [];
    this.craftTables = [];
    for (const chunk of this.chunks.values()) {
      for (const c of chunk.colliders) this.allColliders.push(c);
      if (chunk.craftTablePos) this.craftTables.push(chunk.craftTablePos);
    }
  }

  private createCityChunk(cx: number, cz: number): CityChunk {
    const group = new THREE.Group();
    const ox = cx * CHUNK_SIZE;
    const oz = cz * CHUNK_SIZE;
    group.position.set(ox, 0, oz);

    const colliders: BuildingCollider[] = [];
    const seed = hash2D(cx, cz);
    const biome = this.getBiomeAt(cx, cz);
    const castShadow = !this.isSoftwareGl && !this.isLowEndMobile;
    let craftTablePos: THREE.Vector3 | null = null;

    if (biome === 'city') {
      // Asphalt road base covering full 34x34m chunk
      const roadMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE),
        this.mats.asphalt
      );
      roadMesh.rotation.x = -Math.PI / 2;
      roadMesh.receiveShadow = castShadow;
      group.add(roadMesh);

      // Raised Sidewalk Plaza in center (22m x 22m -> leaves 12m wide avenue roads)
      const plaza = new THREE.Mesh(new THREE.BoxGeometry(22, 0.22, 22), this.mats.sidewalk);
      plaza.position.y = 0.11;
      plaza.receiveShadow = castShadow;
      group.add(plaza);

      // Lightweight Streetlamps (no volumetric cone overhead for Android 4+)
      const poleGeo = new THREE.CylinderGeometry(0.09, 0.12, 5.2, 6);
      const bulbGeo = new THREE.BoxGeometry(0.5, 0.18, 0.28);
      [
        [-9.8, -9.8],
        [9.8, 9.8],
      ].forEach(([lx, lz]) => {
        const pole = new THREE.Mesh(poleGeo, this.mats.carTrim);
        pole.position.set(lx, 2.65, lz);
        const bulb = new THREE.Mesh(bulbGeo, this.mats.headlight);
        bulb.position.set(lx, 5.2, lz);
        group.add(pole, bulb);
      });

      const hasCraftTable = (cx === 0 && cz === 0) || (Math.abs(cx + cz) % 2 === 0 && seed > 0.45);
      if (hasCraftTable) {
        const bW = 11 + hash2D(cx + 3, cz) * 3;
        const bD = 11 + hash2D(cx, cz + 7) * 3;
        const bH = 16 + Math.floor(hash2D(cx * 2, cz * 2) * 30);
        const style = (Math.abs(cx + cz) % 3) as 0 | 1 | 2;
        const bx = -2.8;
        const bz = -2.8;

        const bldg = createBuildingModel(bW, bH, bD, style, this.mats, castShadow);
        bldg.position.set(bx, 0.22, bz);
        group.add(bldg);
        colliders.push({
          minX: ox + bx - bW / 2 - 0.3,
          maxX: ox + bx + bW / 2 + 0.3,
          minZ: oz + bz - bD / 2 - 0.3,
          maxZ: oz + bz + bD / 2 + 0.3,
          height: bH,
        });

        const table = createCraftTableModel(this.mats);
        table.position.set(6.8, 0.22, 6.8);
        table.rotation.y = -Math.PI / 4;
        group.add(table);
        craftTablePos = new THREE.Vector3(ox + 6.8, 0.22, oz + 6.8);
      } else {
        const b1W = 8.4 + hash2D(cx + 1, cz) * 1.4;
        const b1D = 17.5;
        const b1H = 14 + Math.floor(hash2D(cx * 3, cz) * 34);
        const s1 = (Math.abs(cx * 3 + cz) % 3) as 0 | 1 | 2;
        const b1 = createBuildingModel(b1W, b1H, b1D, s1, this.mats, castShadow);
        b1.position.set(-5.0, 0.22, 0);
        group.add(b1);
        colliders.push({
          minX: ox - 5.0 - b1W / 2 - 0.3,
          maxX: ox - 5.0 + b1W / 2 + 0.3,
          minZ: oz - b1D / 2 - 0.3,
          maxZ: oz + b1D / 2 + 0.3,
          height: b1H,
        });

        const b2W = 7.6 + hash2D(cx, cz + 5) * 1.6;
        const b2D = 16.5;
        const b2H = 12 + Math.floor(hash2D(cx, cz * 5) * 30);
        const s2 = ((s1 + 1) % 3) as 0 | 1 | 2;
        const b2 = createBuildingModel(b2W, b2H, b2D, s2, this.mats, castShadow);
        b2.position.set(5.2, 0.22, 0);
        group.add(b2);
        colliders.push({
          minX: ox + 5.2 - b2W / 2 - 0.3,
          maxX: ox + 5.2 + b2W / 2 + 0.3,
          minZ: oz - b2D / 2 - 0.3,
          maxZ: oz + b2D / 2 + 0.3,
          height: b2H,
        });
      }
    } else if (biome === 'plains') {
      // Open Green Plains biome with grass meadow, country road edge & pine trees
      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE),
        this.mats.grass
      );
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = castShadow;
      group.add(ground);

      // Subtle country road strip along the +X border so cars can cruise cleanly
      const roadStrip = new THREE.Mesh(new THREE.PlaneGeometry(7.5, CHUNK_SIZE), this.mats.asphalt);
      roadStrip.rotation.x = -Math.PI / 2;
      roadStrip.position.set(CHUNK_SIZE / 2 - 3.75, 0.02, 0);
      group.add(roadStrip);

      // Scatter 4 composite pine trees inside the meadow
      const treeSpots = [
        [-8, -7],
        [-2, 6],
        [4, -8],
        [-9, 8],
      ];
      treeSpots.forEach(([tx, tz], i) => {
        const jx = tx + (hash2D(cx + i, cz) - 0.5) * 3.5;
        const jz = tz + (hash2D(cx, cz + i) - 0.5) * 3.5;
        const tree = createPlainsTreeModel(this.mats);
        const sc = 0.85 + hash2D(cx + i * 2, cz - i) * 0.45;
        tree.scale.setScalar(sc);
        tree.position.set(jx, 0, jz);
        group.add(tree);
        colliders.push({
          minX: ox + jx - 0.7,
          maxX: ox + jx + 0.7,
          minZ: oz + jz - 0.7,
          maxZ: oz + jz + 0.7,
          height: 5,
        });
      });

      if (seed > 0.72) {
        const table = createCraftTableModel(this.mats);
        table.position.set(3.5, 0.05, 3.5);
        group.add(table);
        craftTablePos = new THREE.Vector3(ox + 3.5, 0.05, oz + 3.5);
      }
    } else if (biome === 'desert') {
      // Golden Desert biome with sand dunes, sandstone mesas & saguaro cacti
      const sandGround = new THREE.Mesh(
        new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE),
        this.mats.sand
      );
      sandGround.rotation.x = -Math.PI / 2;
      sandGround.receiveShadow = castShadow;
      group.add(sandGround);

      // Stepped Sandstone Mesa rock formation
      const mW = 7 + hash2D(cx + 2, cz) * 5;
      const mD = 6 + hash2D(cx, cz + 4) * 5;
      const mH = 7 + hash2D(cx * 3, cz * 2) * 9;
      const mx = -4.5 + (seed - 0.5) * 4;
      const mz = -3.5 + (hash2D(cx, cz + 9) - 0.5) * 4;
      const mesa = createDesertMesaModel(mW, mH, mD, this.mats);
      mesa.position.set(mx, 0, mz);
      group.add(mesa);
      colliders.push({
        minX: ox + mx - mW / 2,
        maxX: ox + mx + mW / 2,
        minZ: oz + mz - mD / 2,
        maxZ: oz + mz + mD / 2,
        height: mH,
      });

      // Saguaro cacti scattered on the dunes
      [
        [7.5, -6.5],
        [5.5, 8.2],
        [-9.5, 7.0],
      ].forEach(([kx, kz], i) => {
        const cactus = createCactusModel(this.mats);
        cactus.position.set(kx, 0, kz);
        cactus.rotation.y = hash2D(cx + i, cz) * Math.PI * 2;
        group.add(cactus);
        colliders.push({
          minX: ox + kx - 0.5,
          maxX: ox + kx + 0.5,
          minZ: oz + kz - 0.5,
          maxZ: oz + kz + 0.5,
          height: 3.4,
        });
      });

      if (seed > 0.76) {
        const table = createCraftTableModel(this.mats);
        table.position.set(8.5, 0.05, 1.5);
        group.add(table);
        craftTablePos = new THREE.Vector3(ox + 8.5, 0.05, oz + 1.5);
      }
    } else if (biome === 'mountain') {
      // Alpine Peaks biome with towering snow-capped 3D mountains & mountain pass
      const baseGround = new THREE.Mesh(
        new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE),
        this.mats.grass
      );
      baseGround.rotation.x = -Math.PI / 2;
      baseGround.receiveShadow = castShadow;
      group.add(baseGround);

      // Two towering snow-capped peaks positioned to leave a drivable mountain pass along the edges
      const m1R = 8.5 + hash2D(cx + 1, cz) * 3.5;
      const m1H = 22 + hash2D(cx * 2, cz + 3) * 20;
      const m1 = createMountainModel(m1R, m1H, this.mats);
      m1.position.set(-5.5, 0, -4.5);
      group.add(m1);
      colliders.push({
        minX: ox - 5.5 - m1R * 0.62,
        maxX: ox - 5.5 + m1R * 0.62,
        minZ: oz - 4.5 - m1R * 0.62,
        maxZ: oz - 4.5 + m1R * 0.62,
        height: m1H,
      });

      const m2R = 6.2 + hash2D(cx, cz + 5) * 2.8;
      const m2H = 15 + hash2D(cx + 4, cz * 2) * 14;
      const m2 = createMountainModel(m2R, m2H, this.mats);
      m2.position.set(5.5, 0, 5.5);
      group.add(m2);
      colliders.push({
        minX: ox + 5.5 - m2R * 0.6,
        maxX: ox + 5.5 + m2R * 0.6,
        minZ: oz + 5.5 - m2R * 0.6,
        maxZ: oz + 5.5 + m2R * 0.6,
        height: m2H,
      });

      const pine = createPlainsTreeModel(this.mats);
      pine.position.set(7.5, 0, -8.5);
      group.add(pine);
    } else {
      // River Valley biome: flowing blue river channel + grassy banks + driveable stone bridge!
      const bankBase = new THREE.Mesh(
        new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE),
        this.mats.grass
      );
      bankBase.rotation.x = -Math.PI / 2;
      group.add(bankBase);

      // Wide shimmering blue river flowing east-west across the chunk
      const water = new THREE.Mesh(
        new THREE.PlaneGeometry(CHUNK_SIZE, 16),
        this.mats.riverWater
      );
      water.rotation.x = -Math.PI / 2;
      water.position.y = 0.04;
      group.add(water);

      // Sandy riverbanks along both shores
      [-9.2, 9.2].forEach((bz) => {
        const shore = new THREE.Mesh(new THREE.BoxGeometry(CHUNK_SIZE, 0.14, 2.8), this.mats.sand);
        shore.position.set(0, 0.05, bz);
        group.add(shore);
      });

      // Driveable Stone Bridge spanning the river along the avenue corridor (+X side)
      const bridgeX = CHUNK_SIZE / 2 - 4.5;
      const deck = new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.34, 19.5), this.mats.bridgeStone);
      deck.position.set(bridgeX, 0.2, 0);
      group.add(deck);

      // Bridge side railings
      [-4.1, 4.1].forEach((rx) => {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.0, 19.5), this.mats.roofDark);
        rail.position.set(bridgeX + rx, 0.72, 0);
        group.add(rail);
      });

      // Riverside trees on the grassy banks
      [
        [-8, -13],
        [-3, 13.2],
      ].forEach(([tx, tz]) => {
        const tree = createPlainsTreeModel(this.mats);
        tree.position.set(tx, 0, tz);
        group.add(tree);
      });
    }

    // Spawn a street supply crate on sidewalk/clearing if pool has room
    if (this.lootCrates.length < 14 && seed > 0.34 && biome !== 'river') {
      this.spawnLootCrate(ox + 9.2, oz - 8.5);
    }

    return {
      key: `${cx},${cz}`,
      cx,
      cz,
      group,
      colliders,
      craftTablePos,
    };
  }

  private spawnLootCrate(x: number, z: number): void {
    const mesh = createLootCrateModel(this.mats);
    mesh.position.set(x, 0.22, z);
    this.scene.add(mesh);
    this.lootCrates.push({
      id: this.nextLootId++,
      mesh,
      x,
      z,
      collected: false,
      bobPhase: Math.random() * Math.PI * 2,
    });
  }

  private spawnInitialTrafficAndNpcs(): void {
    // Clear previous entities
    this.cars.forEach((c) => this.scene.remove(c.mesh));
    this.cars = [];
    this.npcs.forEach((n) => {
      this.scene.remove(n.rig.root);
      this.scene.remove(n.hitMesh);
    });
    this.npcs = [];
    this.npcHitMeshes = [];

    // Spawn 1 parked starter hero car right on the avenue near player!
    this.spawnCarAt(17, 6, 'z', -1, 0, 0);

    // Spawn 5 autonomous traffic cars along avenues
    for (let i = 0; i < 5; i++) {
      const axis: 'x' | 'z' = i % 2 === 0 ? 'z' : 'x';
      const dir: 1 | -1 = i % 4 < 2 ? 1 : -1;
      const laneOffset = dir === 1 ? 2.6 : -2.6;
      const roadLine = (Math.floor(i / 2) - 1) * CHUNK_SIZE + CHUNK_SIZE / 2;
      const along = (Math.random() - 0.5) * 80;
      const x = axis === 'z' ? roadLine + laneOffset : along;
      const z = axis === 'x' ? roadLine + laneOffset : along;
      this.spawnCarAt(x, z, axis, dir, i + 1, 9 + Math.random() * 5);
    }

    // Spawn 6 Civilians + only 2 Syndicate Enforcers (balanced & low-end friendly)
    for (let i = 0; i < 6; i++) {
      this.spawnNpcAroundPlayer('civilian');
    }
    for (let i = 0; i < 2; i++) {
      this.spawnNpcAroundPlayer('syndicate');
    }
  }

  private spawnCarAt(
    x: number,
    z: number,
    axis: 'x' | 'z',
    dir: 1 | -1,
    paintIndex: number,
    speed: number
  ): CityCar {
    const mesh = createCarModel(paintIndex, this.mats, !this.isSoftwareGl);
    const yaw = axis === 'z' ? (dir === -1 ? 0 : Math.PI) : dir === 1 ? -Math.PI / 2 : Math.PI / 2;
    mesh.position.set(x, 0, z);
    mesh.rotation.y = yaw;
    this.scene.add(mesh);

    const car: CityCar = {
      id: this.nextCarId++,
      mesh,
      x,
      z,
      yaw,
      speed,
      axis,
      dir,
      isPlayerDriven: false,
    };
    this.cars.push(car);
    return car;
  }

  private spawnNpcAroundPlayer(role: 'civilian' | 'syndicate' | 'boss'): void {
    const angle = Math.random() * Math.PI * 2;
    const dist = role === 'boss' ? 32 : 16 + Math.random() * 34;
    let x = this.playerPos.x + Math.cos(angle) * dist;
    let z = this.playerPos.z + Math.sin(angle) * dist;

    // Snap onto open avenue / sidewalk edge so they don't spawn inside buildings
    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    x = cx * CHUNK_SIZE + (Math.random() > 0.5 ? 11.5 : -11.5);
    z = cz * CHUNK_SIZE + (Math.random() - 0.5) * 18;

    const variant = Math.floor(Math.random() * 5);
    const rig = createNpcModel(role, variant, this.mats);
    rig.root.position.set(x, 0.22, z);
    this.scene.add(rig.root);

    const hitH = role === 'boss' ? 2.7 : 2.0;
    const hitW = role === 'boss' ? 1.3 : 0.9;
    const hitMesh = new THREE.Mesh(
      new THREE.BoxGeometry(hitW, hitH, hitW),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hitMesh.position.set(x, 0.22 + hitH / 2, z);
    const id = this.nextNpcId++;
    hitMesh.userData.npcId = id;
    this.scene.add(hitMesh);

    const maxHp = role === 'boss' ? 420 : role === 'syndicate' ? 75 : 40;
    const npc: CityNpc = {
      id,
      role,
      rig,
      hitMesh,
      x,
      z,
      yaw: Math.random() * Math.PI * 2,
      speed: role === 'boss' ? 3.2 : role === 'syndicate' ? 3.6 : 2.2,
      hp: maxHp,
      maxHp,
      state: 'walk',
      stateTimer: 2 + Math.random() * 4,
      fireCooldown: 1.2 + Math.random(),
      walkCycle: Math.random() * Math.PI * 2,
    };
    this.npcs.push(npc);
    this.npcHitMeshes.push(hitMesh);
  }

  // --- Story Campaign & Cinematic Shot Director ---
  public startNewStory(): void {
    this.endlessFreeRoam = false;
    this.chapterIndex = 0;
    this.level = 1;
    this.xp = 0;
    this.health = this.maxHealth;
    this.armor = 25;
    this.cash = 40;
    this.scrap = 2;
    this.tech = 0;
    this.kills = 0;
    this.cratesLooted = 0;
    this.syndicateKills = 0;
    this.driveDistanceAccum = 0;
    this.bossSpawned = false;
    this.bossDefeated = false;

    this.unlockedWeapons = new Set(['pistol']);
    this.equippedWeapon = 'pistol';
    this.syncGunModels();
    (Object.keys(WEAPONS) as WeaponId[]).forEach((w) => {
      this.ammoMap[w] = WEAPONS[w].magSize;
    });
    this.isReloading = false;

    this.drivenCar = null;
    this.audio.setCarEngine(false);
    this.playerPos.set(11.5, 0.22, 11.5);
    this.playerVel.set(0, 0, 0);
    this.lookYaw = Math.PI * 0.25;
    this.lookPitch = -0.05;

    this.timeOfDay = 0.28;
    this.dayCount = 1;
    this.weather = 'rain';
    this.weatherTimer = 28;

    // Clear old crates & spawn fresh starter crates nearby
    this.lootCrates.forEach((l) => this.scene.remove(l.mesh));
    this.lootCrates = [];
    this.spawnLootCrate(10, 4);
    this.spawnLootCrate(4, 10.5);
    this.spawnLootCrate(10.5, -6);

    this.updateCityChunks(true);
    this.spawnInitialTrafficAndNpcs();

    const ch = STORY_CHAPTERS[0];
    this.playCinematicShot(ch.cinematicHeadline, ch.cinematicSubtitle, this.playerPos, 4.4, () => {
      this.phase = 'playing';
      this.fpGunHolder.visible = true;
      this.showToast('Chapter 1: Scavenge 3 glowing supply crates!');
      this.emitHud();
    });
  }

  private playCinematicShot(
    headline: string,
    subtitle: string,
    focus: THREE.Vector3,
    duration: number,
    onDone: () => void
  ): void {
    this.phase = 'cinematic';
    this.fpGunHolder.visible = false;
    this.isFiringHeld = false;
    this.cinematicHeadline = headline;
    this.cinematicSubtitle = subtitle;
    this.cinematicFocus.copy(focus);
    this.cinematicTimer = 0;
    this.cinematicDuration = duration;
    this.cinematicOnComplete = onDone;
    this.audio.playChapterCinematic();
    this.emitHud();
  }

  public skipCinematic(): void {
    if (this.phase !== 'cinematic') return;
    const cb = this.cinematicOnComplete;
    this.cinematicOnComplete = null;
    if (cb) cb();
  }

  private advanceChapter(nextIndex: number): void {
    if (nextIndex >= STORY_CHAPTERS.length) {
      // Story Victory!
      this.bossDefeated = true;
      this.level = 5;
      this.playCinematicShot(
        'APEX LEGEND · CITY CONQUERED',
        'From rock bottom to ruler of the infinite skyline. The streets are yours.',
        this.playerPos,
        4.2,
        () => {
          this.phase = 'victory';
          this.emitHud();
        }
      );
      return;
    }

    this.chapterIndex = nextIndex;
    this.level = STORY_CHAPTERS[nextIndex].level;
    this.cash += 80;
    this.health = this.maxHealth;
    this.armor = Math.min(100, this.armor + 35);

    const ch = STORY_CHAPTERS[nextIndex];
    if (nextIndex === 4 && !this.bossSpawned) {
      this.bossSpawned = true;
      this.spawnNpcAroundPlayer('boss');
    }

    const focusTarget =
      nextIndex === 4
        ? this.getBossPosition() ?? this.playerPos
        : this.playerPos;

    this.playCinematicShot(ch.cinematicHeadline, ch.cinematicSubtitle, focusTarget, 3.8, () => {
      this.phase = 'playing';
      this.fpGunHolder.visible = !this.drivenCar;
      this.showToast(`${ch.title} — ${ch.objective}`);
      this.emitHud();
    });
  }

  private getBossPosition(): THREE.Vector3 | null {
    const boss = this.npcs.find((n) => n.role === 'boss');
    return boss ? new THREE.Vector3(boss.x, 1.5, boss.z) : null;
  }

  private addXp(amount: number): void {
    this.xp += amount;
    if (this.xp >= this.level * 120 && this.level < 5) {
      this.xp -= this.level * 120;
      this.level += 1;
      this.showToast(`LEVEL UP! Rank ${this.level}`);
    }
  }

  // --- Controls & Actions API ---
  public setVirtualMove(nx: number, nz: number, sprint: boolean): void {
    this.virtualMoveX = THREE.MathUtils.clamp(nx, -1, 1);
    this.virtualMoveZ = THREE.MathUtils.clamp(nz, -1, 1);
    this.virtualSprint = sprint;
  }

  public applyLookDelta(dx: number, dy: number): void {
    if (this.phase !== 'playing') return;
    const sens = 0.0052;
    this.lookYaw -= dx * sens;
    this.lookPitch = THREE.MathUtils.clamp(this.lookPitch - dy * sens, -1.25, 1.25);
  }

  public setFiring(active: boolean): void {
    if (this.phase !== 'playing') {
      this.isFiringHeld = false;
      return;
    }
    this.isFiringHeld = active;
    if (active && this.fireCooldown <= 0) {
      this.fireCurrentWeapon();
    }
  }

  public triggerJump(): void {
    if (this.phase !== 'playing' || this.drivenCar) return;
    if (this.onGround) {
      this.playerVel.y = 10.6;
      this.onGround = false;
    }
  }

  public triggerReload(): void {
    if (this.phase !== 'playing' || this.isReloading) return;
    const def = WEAPONS[this.equippedWeapon];
    if (this.ammoMap[this.equippedWeapon] >= def.magSize) return;
    this.isReloading = true;
    this.reloadTimer = 1.15;
    this.audio.playReload();
    this.emitHud();
  }

  public equipWeapon(id: WeaponId): void {
    if (!this.unlockedWeapons.has(id)) return;
    this.equippedWeapon = id;
    this.isReloading = false;
    this.syncGunModels();
    this.emitHud();
  }

  private syncGunModels(): void {
    (Object.keys(this.fpGunMeshes) as WeaponId[]).forEach((wid) => {
      this.fpGunMeshes[wid].group.visible = wid === this.equippedWeapon;
    });
  }

  public craftWeapon(id: WeaponId): boolean {
    if (this.unlockedWeapons.has(id)) {
      this.equipWeapon(id);
      return true;
    }
    const def = WEAPONS[id];
    if (this.scrap < def.craftScrap || this.tech < def.craftTech || this.cash < def.craftCash) {
      this.showToast('Not enough Scrap, Tech, or Cash!');
      return false;
    }
    this.scrap -= def.craftScrap;
    this.tech -= def.craftTech;
    this.cash -= def.craftCash;
    this.unlockedWeapons.add(id);
    this.ammoMap[id] = def.magSize;
    this.equipWeapon(id);
    this.audio.playCraft();
    this.addXp(50);
    this.showToast(`Crafted & Equipped ${def.name}!`);

    // Chapter 2 objective check
    if (this.chapterIndex === 1 && (id === 'smg' || id === 'shotgun' || id === 'railgun')) {
      this.advanceChapter(2);
    }
    this.emitHud();
    return true;
  }

  public craftMedkit(): boolean {
    if (this.scrap < 2 && this.cash < 30) {
      this.showToast('Need 2 Scrap or $30 for Medkit');
      return false;
    }
    if (this.scrap >= 2) this.scrap -= 2;
    else this.cash -= 30;
    this.health = this.maxHealth;
    this.armor = Math.min(100, this.armor + 40);
    this.audio.playCraft();
    this.showToast('Health & Armor restored!');
    this.emitHud();
    return true;
  }

  public toggleCar(): void {
    if (this.phase !== 'playing') return;
    if (this.drivenCar) {
      // Exit car onto nearby road/sidewalk
      const car = this.drivenCar;
      car.isPlayerDriven = false;
      car.speed = 0;
      this.drivenCar = null;
      this.playerPos.set(car.x + Math.cos(car.yaw) * 2.4, 0.22, car.z - Math.sin(car.yaw) * 2.4);
      this.fpGunHolder.visible = true;
      this.audio.playCarDoor();
      this.audio.setCarEngine(false);
      this.showToast('Exited vehicle');
      this.emitHud();
      return;
    }

    if (this.nearCar) {
      this.drivenCar = this.nearCar;
      this.drivenCar.isPlayerDriven = true;
      this.drivenCar.speed = 0;
      this.lookYaw = this.drivenCar.yaw;
      this.lookPitch = -0.04;
      this.fpGunHolder.visible = false;
      this.audio.playCarDoor();
      this.audio.setCarEngine(true, 0);
      this.showToast('Driving! Use Left Stick / WASD to steer & accelerate');
      this.emitHud();
    }
  }

  public toggleGyro(): boolean {
    this.gyroEnabled = !this.gyroEnabled;
    this.lastGyroBeta = null;
    this.lastGyroGamma = null;
    if (this.gyroEnabled && typeof DeviceOrientationEvent !== 'undefined') {
      const req = (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> })
        .requestPermission;
      if (typeof req === 'function') {
        req().catch(() => {});
      }
    }
    this.showToast(this.gyroEnabled ? 'Gyro Tilt Look Enabled' : 'Gyro Tilt Look Disabled');
    return this.gyroEnabled;
  }

  public setPaused(paused: boolean): void {
    if (this.phase !== 'playing' && this.phase !== 'paused') return;
    this.phase = paused ? 'paused' : 'playing';
    this.isFiringHeld = false;
    this.keys.clear();
    this.virtualMoveX = 0;
    this.virtualMoveZ = 0;
    this.emitHud();
  }

  public continueFreeRoam(): void {
    if (this.phase !== 'victory') return;
    this.endlessFreeRoam = true;
    this.phase = 'playing';
    this.fpGunHolder.visible = !this.drivenCar;
    this.showToast('Free Roam Mode — Explore the infinite city as Apex Legend!');
    this.emitHud();
  }

  private showToast(msg: string): void {
    this.toastMessage = msg;
    this.toastTimer = 3.2;
  }

  // --- First-Person Shooting ---
  private fireCurrentWeapon(): void {
    if (this.drivenCar || this.isReloading) return;
    const def = WEAPONS[this.equippedWeapon];
    if (this.ammoMap[this.equippedWeapon] <= 0) {
      this.triggerReload();
      return;
    }

    this.ammoMap[this.equippedWeapon] -= 1;
    this.fireCooldown = 1 / def.fireRate;
    this.gunRecoil = Math.min(1.4, this.gunRecoil + (this.equippedWeapon === 'shotgun' ? 1.1 : 0.55));
    this.muzzleTimer = 0.055;
    this.shakeIntensity = Math.max(this.shakeIntensity, this.equippedWeapon === 'shotgun' ? 0.14 : 0.05);
    this.fpGunMeshes[this.equippedWeapon].flash.visible = true;
    this.audio.playGunshot(this.equippedWeapon);

    // Alert nearby civilians to flee & syndicate to engage
    for (const npc of this.npcs) {
      const dist = Math.hypot(npc.x - this.playerPos.x, npc.z - this.playerPos.z);
      if (dist < 28) {
        if (npc.role === 'civilian') {
          npc.state = 'flee';
          npc.stateTimer = 5;
        } else {
          npc.state = 'combat';
        }
      }
    }

    // Cast pellets from First-Person camera
    let hitAnyNpc = false;
    const muzzleWorld = _v3A.set(0.22, -0.14, -0.8).applyMatrix4(this.camera.matrixWorld).clone();

    for (let p = 0; p < def.pellets; p++) {
      const spreadX = (Math.random() - 0.5) * def.spread;
      const spreadY = (Math.random() - 0.5) * def.spread;
      _centerNDC.set(spreadX, spreadY);
      _raycaster.setFromCamera(_centerNDC, this.camera);
      _raycaster.far = def.range;

      const hits = _raycaster.intersectObjects(this.npcHitMeshes, false);
      const endPoint = _raycaster.ray.origin
        .clone()
        .addScaledVector(_raycaster.ray.direction, def.range);

      if (hits.length > 0) {
        const hit = hits[0];
        endPoint.copy(hit.point);
        const npcId = hit.object.userData.npcId as number;
        const npc = this.npcs.find((n) => n.id === npcId);
        if (npc) {
          hitAnyNpc = true;
          this.damageNpc(npc, def.damage, hit.point);
        }
      }

      const tracerHex = this.equippedWeapon === 'railgun' ? 0xf59e0b : 0xfef08a;
      this.spawnTracer(muzzleWorld, endPoint, tracerHex);
    }
    _centerNDC.set(0, 0);

    if (hitAnyNpc) {
      this.hitMarkerTimer = 0.14;
      this.audio.playHitMarker();
    }

    if (this.ammoMap[this.equippedWeapon] <= 0) {
      this.triggerReload();
    }
  }

  private damageNpc(npc: CityNpc, damage: number, hitPoint: THREE.Vector3): void {
    npc.hp -= damage;
    this.spawnBurst(hitPoint.x, hitPoint.y, hitPoint.z, npc.role === 'boss' ? 0xfbbf24 : 0xef4444, 7);
    if (npc.role === 'civilian') {
      npc.state = 'flee';
    } else {
      npc.state = 'combat';
    }

    if (npc.hp <= 0) {
      this.scene.remove(npc.rig.root);
      this.scene.remove(npc.hitMesh);
      npc.hitMesh.geometry.dispose();
      (npc.hitMesh.material as THREE.Material).dispose();

      const idx = this.npcs.indexOf(npc);
      if (idx !== -1) this.npcs.splice(idx, 1);
      const hIdx = this.npcHitMeshes.indexOf(npc.hitMesh);
      if (hIdx !== -1) this.npcHitMeshes.splice(hIdx, 1);

      this.spawnBurst(npc.x, 1.1, npc.z, 0xf59e0b, 14);
      this.kills += 1;

      if (npc.role === 'boss') {
        this.cash += 500;
        this.tech += 6;
        this.addXp(250);
        this.advanceChapter(5); // Story Victory!
      } else if (npc.role === 'syndicate') {
        this.cash += 45;
        this.scrap += 2;
        this.tech += 1;
        this.addXp(45);
        this.syndicateKills += 1;
        this.showToast(`Syndicate Down! +$45 · +2 Scrap · +1 Tech`);
        if (this.chapterIndex === 3 && this.syndicateKills >= 3) {
          this.advanceChapter(4);
        }
      } else {
        this.cash += 10;
      }
      this.emitHud();
    }
  }

  private spawnTracer(start: THREE.Vector3, end: THREE.Vector3, colorHex: number): void {
    for (const t of this.tracers) {
      if (t.active) continue;
      t.active = true;
      t.life = 0;
      t.maxLife = 0.085;
      const pos = t.line.geometry.getAttribute('position') as THREE.BufferAttribute;
      pos.setXYZ(0, start.x, start.y, start.z);
      pos.setXYZ(1, end.x, end.y, end.z);
      pos.needsUpdate = true;
      (t.line.material as THREE.LineBasicMaterial).color.setHex(colorHex);
      t.line.visible = true;
      break;
    }
  }

  private spawnBurst(x: number, y: number, z: number, colorHex: number, count: number): void {
    let spawned = 0;
    for (let i = 0; i < this.particles.length && spawned < count; i++) {
      const p = this.particles[i];
      if (p.active) continue;
      p.active = true;
      p.life = 0;
      p.maxLife = 0.35 + Math.random() * 0.25;
      p.mesh.visible = true;
      p.mesh.position.set(x, y, z);
      p.mesh.scale.setScalar(0.8);
      (p.mesh.material as THREE.MeshBasicMaterial).color.setHex(colorHex);
      const a = Math.random() * Math.PI * 2;
      const spd = 2 + Math.random() * 4.5;
      p.vx = Math.cos(a) * spd;
      p.vy = 2 + Math.random() * 4;
      p.vz = Math.sin(a) * spd;
      spawned++;
    }
  }

  private resolveBuildingCollision(x: number, z: number, radius: number): { x: number; z: number; hit: boolean } {
    let rx = x;
    let rz = z;
    let hit = false;

    for (let i = 0; i < this.allColliders.length; i++) {
      const b = this.allColliders[i];
      const minX = b.minX - radius;
      const maxX = b.maxX + radius;
      const minZ = b.minZ - radius;
      const maxZ = b.maxZ + radius;

      if (rx > minX && rx < maxX && rz > minZ && rz < maxZ) {
        hit = true;
        const penLeft = rx - minX;
        const penRight = maxX - rx;
        const penTop = rz - minZ;
        const penBot = maxZ - rz;
        const minPen = Math.min(penLeft, penRight, penTop, penBot);
        if (minPen === penLeft) rx = minX;
        else if (minPen === penRight) rx = maxX;
        else if (minPen === penTop) rz = minZ;
        else rz = maxZ;
      }
    }
    return { x: rx, z: rz, hit };
  }

  // --- Events & Mobile Orientation Handling ---
  private bindEvents(): void {
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('orientationchange', this.handleOrientationChange);
    if (window.screen?.orientation?.addEventListener) {
      window.screen.orientation.addEventListener('change', this.handleOrientationChange);
    }
    window.addEventListener('deviceorientation', this.handleDeviceOrientation);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);

    const dom = this.renderer.domElement;
    dom.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('mouseup', this.handleMouseUp);
    dom.addEventListener('contextmenu', this.handleContextMenu);
    dom.addEventListener('webglcontextlost', this.handleContextLost);
  }

  private handleContextLost = (e: Event): void => {
    e.preventDefault();
  };

  private handleContextMenu = (e: MouseEvent): void => {
    e.preventDefault();
  };

  private handleOrientationChange = (): void => {
    // Allow mobile browser viewport to finish rotating before resizing WebGL buffer
    window.setTimeout(this.handleResize, 60);
    window.setTimeout(this.handleResize, 220);
  };

  private handleResize = (): void => {
    if (this.disposed) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    const isPortrait = h > w;
    this.camera.aspect = w / h;
    this.camera.fov = isPortrait ? 78 : 68;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private handleDeviceOrientation = (e: DeviceOrientationEvent): void => {
    if (!this.gyroEnabled || this.phase !== 'playing') return;
    if (e.beta === null || e.gamma === null) return;
    if (this.lastGyroBeta !== null && this.lastGyroGamma !== null) {
      const dGamma = e.gamma - this.lastGyroGamma;
      const dBeta = e.beta - this.lastGyroBeta;
      if (Math.abs(dGamma) < 25 && Math.abs(dBeta) < 25) {
        this.applyLookDelta(-dGamma * 2.2, -dBeta * 1.6);
      }
    }
    this.lastGyroBeta = e.beta;
    this.lastGyroGamma = e.gamma;
  };

  private handleBlur = (): void => {
    this.keys.clear();
    this.isMouseDragging = false;
    this.isFiringHeld = false;
    this.virtualMoveX = 0;
    this.virtualMoveZ = 0;
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (this.phase === 'title') {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        this.startNewStory();
      }
      return;
    }
    if (this.phase === 'cinematic') {
      if (e.code === 'Space' || e.code === 'Enter' || e.code === 'Escape') {
        e.preventDefault();
        this.skipCinematic();
      }
      return;
    }
    if (e.code === 'Escape') {
      if (this.phase === 'playing') this.setPaused(true);
      else if (this.phase === 'paused') this.setPaused(false);
      return;
    }
    if (this.phase !== 'playing') return;

    this.keys.add(e.code);
    if (e.code === 'Space') {
      e.preventDefault();
      this.triggerJump();
    } else if (e.code === 'KeyR') {
      this.triggerReload();
    } else if (e.code === 'KeyE') {
      this.toggleCar();
    } else if (e.code === 'Digit1') this.equipWeapon('pistol');
    else if (e.code === 'Digit2') this.equipWeapon('smg');
    else if (e.code === 'Digit3') this.equipWeapon('shotgun');
    else if (e.code === 'Digit4') this.equipWeapon('railgun');
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
  };

  private handleMouseDown = (e: MouseEvent): void => {
    if (this.phase !== 'playing') return;
    if (e.button === 0) {
      this.isMouseDragging = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      this.dragMoved = false;
    }
  };

  private handleMouseMove = (e: MouseEvent): void => {
    if (!this.isMouseDragging || this.phase !== 'playing') return;
    const dx = e.clientX - this.lastMouseX;
    const dy = e.clientY - this.lastMouseY;
    if (Math.hypot(dx, dy) > 2) this.dragMoved = true;
    this.applyLookDelta(dx, dy);
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
  };

  private handleMouseUp = (e: MouseEvent): void => {
    if (!this.isMouseDragging) return;
    this.isMouseDragging = false;
    if (!this.dragMoved && e.button === 0 && this.phase === 'playing') {
      this.fireCurrentWeapon();
    }
  };

  // --- Main Frame Update ---
  private updateWeatherAndSky(dt: number): void {
    // Advance Day/Night cycle
    this.timeOfDay += dt / DAY_CYCLE_DURATION;
    if (this.timeOfDay >= 1) {
      this.timeOfDay -= 1;
      this.dayCount += 1;
    }

    // Weather cycle (Clear -> Cloudy -> Rain)
    if (this.phase === 'playing') {
      this.weatherTimer -= dt;
      if (this.weatherTimer <= 0) {
        const next: WeatherState =
          this.weather === 'clear' ? 'cloudy' : this.weather === 'cloudy' ? 'rain' : 'clear';
        this.weather = next;
        this.weatherTimer = next === 'rain' ? 24 : 28;
        this.audio.setRainAmbience(next === 'rain');
      }
    }

    const targetRain = this.weather === 'rain' ? 1 : 0;
    this.rainIntensity = THREE.MathUtils.damp(this.rainIntensity, targetRain, 1.8, dt);
    this.mats.setRainWetness(this.rainIntensity);

    // Sun angle & Day/Sunset/Night blending
    const sunAngle = this.timeOfDay * Math.PI * 2;
    const sunElev = Math.sin(sunAngle - Math.PI * 0.5); // -1 midnight .. +1 noon
    const daylight = THREE.MathUtils.clamp(sunElev * 0.9 + 0.52, 0.08, 1.0);
    const nightFactor = THREE.MathUtils.clamp(1 - daylight * 1.45, 0, 1);
    const sunsetFactor = THREE.MathUtils.clamp(1 - Math.abs(sunElev) * 3.2, 0, 1);

    this.mats.setNightEmission(nightFactor);

    // Horizon & Zenith Sky Colors
    _colorA.setHex(0x0c1220).lerp(_colorB.setHex(0x88b4da), daylight);
    _colorC.setHex(0x050811).lerp(_colorB.setHex(0x25508a), daylight);

    if (sunsetFactor > 0.05) {
      _colorA.lerp(_colorB.setHex(0xd97742), sunsetFactor * 0.55);
    }
    if (this.rainIntensity > 0.02) {
      _colorA.lerp(_colorB.setHex(0x26313d), this.rainIntensity * 0.65);
      _colorC.lerp(_colorB.setHex(0x141b24), this.rainIntensity * 0.65);
    }

    (this.scene.background as THREE.Color).copy(_colorA);
    this.fog.color.copy(_colorA);

    this.skyDome.position.copy(this.camera.position);
    this.mats.skyMaterial.uniforms.uHorizonColor.value.copy(_colorA);
    this.mats.skyMaterial.uniforms.uZenithColor.value.copy(_colorC);
    this.mats.skyMaterial.uniforms.uNightFactor.value = nightFactor;

    _v3A.set(Math.cos(sunAngle) * 45, Math.max(8, sunElev * 55 + 15), Math.sin(sunAngle) * 35).normalize();
    this.mats.skyMaterial.uniforms.uSunDir.value.copy(_v3A);

    this.sunLight.position.set(
      this.playerPos.x + _v3A.x * 65,
      this.playerPos.y + _v3A.y * 65,
      this.playerPos.z + _v3A.z * 65
    );
    this.sunLight.target.position.copy(this.playerPos);
    this.sunLight.intensity = (0.4 + daylight * 1.75) * (1 - this.rainIntensity * 0.35);
    this.sunLight.color.setHex(sunsetFactor > 0.45 ? 0xffa76c : nightFactor > 0.6 ? 0x8fb5e8 : 0xfff2d8);
    this.hemiLight.intensity = 0.38 + daylight * 0.5;

    // Drift 3D clouds above player
    this.mats.cloudMat.color.setHex(nightFactor > 0.55 ? 0x334155 : this.rainIntensity > 0.4 ? 0x64748b : 0xe2e8f0);
    for (const c of this.clouds) {
      c.position.x += 2.2 * dt;
      if (c.position.x > this.playerPos.x + 145) c.position.x = this.playerPos.x - 145;
      if (c.position.x < this.playerPos.x - 145) c.position.x = this.playerPos.x + 145;
      if (c.position.z > this.playerPos.z + 145) c.position.z = this.playerPos.z - 145;
      if (c.position.z < this.playerPos.z - 145) c.position.z = this.playerPos.z + 145;
    }

    // Update 3D Rain streaks
    this.rainLines.visible = this.rainIntensity > 0.06;
    if (this.rainLines.visible) {
      const attr = this.rainLines.geometry.getAttribute('position') as THREE.BufferAttribute;
      (this.rainLines.material as THREE.LineBasicMaterial).opacity = 0.5 * this.rainIntensity;
      for (let i = 0; i < this.rainCount; i++) {
        const b = i * 6;
        let rx = this.rainPos[b] - 2.2 * dt;
        let ry = this.rainPos[b + 1] - 32 * dt;
        let rz = this.rainPos[b + 2];
        if (ry < 0 || Math.abs(rx - this.playerPos.x) > 24 || Math.abs(rz - this.playerPos.z) > 24) {
          rx = this.playerPos.x + (Math.random() - 0.5) * 44;
          ry = this.playerPos.y + 14 + Math.random() * 14;
          rz = this.playerPos.z + (Math.random() - 0.5) * 44;
        }
        this.setRainDrop(i, rx, ry, rz);
      }
      attr.needsUpdate = true;
    }
  }

  private updateCarsAndNpcs(dt: number): void {
    // 1. Cars (autonomous traffic + recycling far cars)
    this.nearCar = null;
    let bestCarDist = 5.6;

    for (const car of this.cars) {
      if (!car.isPlayerDriven) {
        // Autonomous road traffic
        const step = car.speed * dt * car.dir;
        if (car.axis === 'z') car.z += step;
        else car.x += step;

        // Recycle far traffic car ahead of player
        const dist = Math.hypot(car.x - this.playerPos.x, car.z - this.playerPos.z);
        if (dist > 95) {
          const curCx = Math.floor(this.playerPos.x / CHUNK_SIZE);
          const curCz = Math.floor(this.playerPos.z / CHUNK_SIZE);
          const roadOffset = (Math.random() > 0.5 ? 1 : -1) * CHUNK_SIZE + CHUNK_SIZE / 2;
          const lane = car.dir === 1 ? 2.6 : -2.6;
          if (car.axis === 'z') {
            car.x = curCx * CHUNK_SIZE + CHUNK_SIZE / 2 + lane;
            car.z = curCz * CHUNK_SIZE + (car.dir === 1 ? -65 : 65);
          } else {
            car.z = curCz * CHUNK_SIZE + roadOffset + lane;
            car.x = curCx * CHUNK_SIZE + (car.dir === 1 ? -65 : 65);
          }
          car.speed = 9 + Math.random() * 5;
        }
      }

      car.mesh.position.set(car.x, 0, car.z);
      car.mesh.rotation.y = car.yaw;

      if (!this.drivenCar) {
        const d = Math.hypot(car.x - this.playerPos.x, car.z - this.playerPos.z);
        if (d < bestCarDist) {
          bestCarDist = d;
          this.nearCar = car;
        }
      }
    }

    // 2. NPCs (Civilian stroll/flee + Syndicate Patrol/Shoot + Boss)
    let syndicateCount = 0;
    let civilianCount = 0;

    for (let i = this.npcs.length - 1; i >= 0; i--) {
      const npc = this.npcs[i];
      const distToPlayer = Math.hypot(npc.x - this.playerPos.x, npc.z - this.playerPos.z);

      // Recycle distant non-boss NPCs
      if (npc.role !== 'boss' && distToPlayer > 78) {
        this.scene.remove(npc.rig.root);
        this.scene.remove(npc.hitMesh);
        this.npcs.splice(i, 1);
        const hIdx = this.npcHitMeshes.indexOf(npc.hitMesh);
        if (hIdx !== -1) this.npcHitMeshes.splice(hIdx, 1);
        continue;
      }

      if (npc.role === 'civilian') civilianCount++;
      else if (npc.role === 'syndicate') syndicateCount++;

      let moveSpeed = npc.speed;
      if (npc.role === 'civilian') {
        npc.stateTimer -= dt;
        if (npc.state === 'flee') {
          npc.yaw = Math.atan2(npc.x - this.playerPos.x, npc.z - this.playerPos.z);
          moveSpeed = 5.4;
          if (npc.stateTimer <= 0) npc.state = 'walk';
        } else if (npc.stateTimer <= 0) {
          npc.yaw += (Math.random() - 0.5) * 1.8;
          npc.stateTimer = 2.5 + Math.random() * 4;
        }
      } else {
        // Syndicate Enforcer or Boss AI
        if (distToPlayer < 28 && this.phase === 'playing') {
          npc.state = 'combat';
          npc.yaw = Math.atan2(this.playerPos.x - npc.x, this.playerPos.z - npc.z);
          moveSpeed = distToPlayer > 12 ? npc.speed : 0;

          npc.fireCooldown -= dt;
          if (npc.fireCooldown <= 0 && distToPlayer < 24) {
            npc.fireCooldown = npc.role === 'boss' ? 1.15 : 2.35;
            const start = _v3A.set(npc.x, 1.5, npc.z);
            const target = _v3B.set(
              this.playerPos.x + (Math.random() - 0.5) * 1.1,
              this.playerPos.y + 1.2,
              this.playerPos.z + (Math.random() - 0.5) * 1.1
            );
            this.spawnTracer(start, target, npc.role === 'boss' ? 0xf59e0b : 0xef4444);

            // Accuracy roll (reduced if player is moving fast in car)
            const hitChance = this.drivenCar ? 0.2 : 0.45;
            if (Math.random() < hitChance) {
              const rawDmg = npc.role === 'boss' ? 10 : 5;
              this.applyPlayerDamage(rawDmg);
            }
          }
        } else {
          npc.stateTimer -= dt;
          if (npc.stateTimer <= 0) {
            npc.yaw += (Math.random() - 0.5) * 2.2;
            npc.stateTimer = 3 + Math.random() * 4;
          }
        }
      }

      if (moveSpeed > 0.1) {
        const nx = npc.x + Math.sin(npc.yaw) * moveSpeed * dt;
        const nz = npc.z + Math.cos(npc.yaw) * moveSpeed * dt;
        const col = this.resolveBuildingCollision(nx, nz, 0.45);
        npc.x = col.x;
        npc.z = col.z;
        if (col.hit) npc.yaw += Math.PI * 0.65;

        npc.walkCycle += dt * moveSpeed * 2.2;
        const swing = Math.sin(npc.walkCycle) * 0.6;
        npc.rig.leftLeg.rotation.x = swing;
        npc.rig.rightLeg.rotation.x = -swing;
        npc.rig.leftArm.rotation.x = -swing * 0.6;
        npc.rig.rightArm.rotation.x = npc.state === 'combat' ? -1.4 : swing * 0.6;
      } else {
        npc.rig.leftLeg.rotation.x = 0;
        npc.rig.rightLeg.rotation.x = 0;
        npc.rig.rightArm.rotation.x = -1.45;
      }

      npc.rig.root.position.set(npc.x, 0.22, npc.z);
      npc.rig.root.rotation.y = npc.yaw;
      npc.hitMesh.position.set(npc.x, 0.22 + (npc.role === 'boss' ? 1.35 : 1.0), npc.z);
    }

    // Keep world populated lightly (max 2 Syndicate Enforcers)
    if (civilianCount < 5) this.spawnNpcAroundPlayer('civilian');
    if (syndicateCount < 2) this.spawnNpcAroundPlayer('syndicate');
  }

  private applyPlayerDamage(dmg: number): void {
    if (this.phase !== 'playing') return;
    if (this.armor > 0) {
      const absorbed = Math.min(this.armor, Math.ceil(dmg * 0.6));
      this.armor -= absorbed;
      this.health = Math.max(0, this.health - (dmg - absorbed));
    } else {
      this.health = Math.max(0, this.health - dmg);
    }
    this.shakeIntensity = 0.22;
    this.audio.playHurt();
    if (this.health <= 0) {
      this.phase = 'gameover';
      this.isFiringHeld = false;
      this.audio.setCarEngine(false);
      this.emitHud();
    }
  }

  private updateSimulation(dt: number): void {
    this.elapsedTime += dt;
    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) this.toastMessage = null;
    }
    if (this.hitMarkerTimer > 0) this.hitMarkerTimer = Math.max(0, this.hitMarkerTimer - dt);

    // Update tracers & burst particles
    for (const t of this.tracers) {
      if (!t.active) continue;
      t.life += dt;
      if (t.life >= t.maxLife) {
        t.active = false;
        t.line.visible = false;
      }
    }
    for (const p of this.particles) {
      if (!p.active) continue;
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        p.mesh.visible = false;
        continue;
      }
      p.vy -= 14 * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
    }

    this.updateWeatherAndSky(dt);

    // Title Screen live sweeping city skyline camera
    if (this.phase === 'title') {
      const a = this.elapsedTime * 0.14;
      this.camera.position.set(Math.cos(a) * 26, 15 + Math.sin(a * 1.4) * 3, Math.sin(a) * 26);
      this.camera.lookAt(0, 7, 0);
      this.updateCarsAndNpcs(dt);
      return;
    }

    // Cinematic Shot Director (letterbox dramatic dolly/orbit camera)
    if (this.phase === 'cinematic') {
      this.cinematicTimer += dt;
      const t = Math.min(1, this.cinematicTimer / this.cinematicDuration);
      const angle = t * Math.PI * 0.65 + 0.5;
      const radius = THREE.MathUtils.lerp(24, 9, t);
      const height = THREE.MathUtils.lerp(18, 4.5, t);
      this.camera.position.set(
        this.cinematicFocus.x + Math.cos(angle) * radius,
        this.cinematicFocus.y + height,
        this.cinematicFocus.z + Math.sin(angle) * radius
      );
      this.camera.lookAt(this.cinematicFocus.x, this.cinematicFocus.y + 2.2, this.cinematicFocus.z);
      this.updateCarsAndNpcs(dt);

      if (this.cinematicTimer >= this.cinematicDuration) {
        this.skipCinematic();
      }
      return;
    }

    if (this.phase !== 'playing') return;

    // 1. Movement & Driving Input
    let moveFwd = this.virtualMoveZ;
    let moveRight = this.virtualMoveX;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) moveFwd += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) moveFwd -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) moveRight += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) moveRight -= 1;

    const mag = Math.hypot(moveFwd, moveRight);
    if (mag > 1) {
      moveFwd /= mag;
      moveRight /= mag;
    }

    if (this.drivenCar) {
      // Drivable Car Physics (First-Person Hood/Driver View!)
      const car = this.drivenCar;
      const accel = moveFwd * 24;
      car.speed = THREE.MathUtils.clamp(car.speed + accel * dt, -10, 26);
      if (Math.abs(moveFwd) < 0.05) {
        car.speed = THREE.MathUtils.damp(car.speed, 0, 3.2, dt);
      }

      if (Math.abs(car.speed) > 0.35) {
        const steerSign = car.speed >= 0 ? 1 : -1;
        car.yaw -= moveRight * 2.1 * dt * steerSign;
      }

      const prevX = car.x;
      const prevZ = car.z;
      const nx = car.x - Math.sin(car.yaw) * car.speed * dt;
      const nz = car.z - Math.cos(car.yaw) * car.speed * dt;
      const col = this.resolveBuildingCollision(nx, nz, 1.85);
      car.x = col.x;
      car.z = col.z;
      if (col.hit) car.speed *= -0.25;

      const movedDist = Math.hypot(car.x - prevX, car.z - prevZ);
      this.driveDistanceAccum += movedDist;
      if (this.chapterIndex === 2 && this.driveDistanceAccum >= 120) {
        this.advanceChapter(3);
      }

      this.playerPos.set(car.x, 0.22, car.z);
      this.lookYaw = THREE.MathUtils.damp(this.lookYaw, car.yaw, 9, dt);
      this.audio.setCarEngine(true, car.speed / 26);

      // First-Person Hood/Windshield Driving Camera
      this.camera.position.set(
        car.x - Math.sin(car.yaw) * 0.25,
        1.52,
        car.z - Math.cos(car.yaw) * 0.25
      );
      this.camera.rotation.set(this.lookPitch * 0.4 - 0.04, this.lookYaw, -moveRight * 0.035, 'YXZ');
    } else {
      // On-Foot First-Person Movement
      const isSprinting =
        this.virtualSprint || this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
      const speed = isSprinting ? 10.4 : 6.8;

      const fwdX = -Math.sin(this.lookYaw);
      const fwdZ = -Math.cos(this.lookYaw);
      const rightX = Math.cos(this.lookYaw);
      const rightZ = -Math.sin(this.lookYaw);

      const dirX = fwdX * moveFwd + rightX * moveRight;
      const dirZ = fwdZ * moveFwd + rightZ * moveRight;

      this.playerVel.x = THREE.MathUtils.damp(this.playerVel.x, dirX * speed, 14, dt);
      this.playerVel.z = THREE.MathUtils.damp(this.playerVel.z, dirZ * speed, 14, dt);

      this.playerVel.y -= GRAVITY * dt;

      const col = this.resolveBuildingCollision(
        this.playerPos.x + this.playerVel.x * dt,
        this.playerPos.z + this.playerVel.z * dt,
        0.45
      );
      this.playerPos.x = col.x;
      this.playerPos.z = col.z;

      this.playerPos.y += this.playerVel.y * dt;
      if (this.playerPos.y <= 0.22) {
        this.playerPos.y = 0.22;
        this.playerVel.y = 0;
        this.onGround = true;
      }

      const horizSpeed = Math.hypot(this.playerVel.x, this.playerVel.z);
      if (this.onGround && horizSpeed > 0.5) {
        this.walkBobPhase += dt * horizSpeed * 1.4;
      }
      const bobY = this.onGround && horizSpeed > 0.5 ? Math.sin(this.walkBobPhase * 2) * 0.042 : 0;
      const bobX = this.onGround && horizSpeed > 0.5 ? Math.cos(this.walkBobPhase) * 0.02 : 0;

      this.shakeIntensity = Math.max(0, this.shakeIntensity - dt * 1.6);
      this.camera.position.set(
        this.playerPos.x + (Math.random() - 0.5) * this.shakeIntensity * 0.4,
        this.playerPos.y + EYE_HEIGHT + bobY + (Math.random() - 0.5) * this.shakeIntensity * 0.4,
        this.playerPos.z + (Math.random() - 0.5) * this.shakeIntensity * 0.4
      );
      this.camera.rotation.set(this.lookPitch, this.lookYaw, 0, 'YXZ');

      // Weapon recoil, muzzle flash, auto-fire & reload
      if (this.fireCooldown > 0) this.fireCooldown -= dt;
      if (this.isFiringHeld && this.fireCooldown <= 0) {
        this.fireCurrentWeapon();
      }
      if (this.muzzleTimer > 0) {
        this.muzzleTimer -= dt;
        if (this.muzzleTimer <= 0) {
          this.fpGunMeshes[this.equippedWeapon].flash.visible = false;
        }
      }
      if (this.isReloading) {
        this.reloadTimer -= dt;
        if (this.reloadTimer <= 0) {
          this.isReloading = false;
          this.ammoMap[this.equippedWeapon] = WEAPONS[this.equippedWeapon].magSize;
        }
      }

      this.gunRecoil = THREE.MathUtils.damp(this.gunRecoil, 0, 14, dt);
      const reloadDrop = this.isReloading ? -0.14 : 0;
      this.fpGunHolder.position.set(
        0.26 + bobX * 0.7,
        -0.22 + bobY * 0.65 + reloadDrop,
        -0.4 + this.gunRecoil * 0.09
      );
      this.fpGunHolder.rotation.x = this.gunRecoil * 0.16;
    }

    // 2. Stream infinite city chunks around player
    this.updateCityChunks(false);

    // 3. Check proximity to Craft Tables
    this.nearCraftTable = false;
    for (const pos of this.craftTables) {
      if (Math.hypot(pos.x - this.playerPos.x, pos.z - this.playerPos.z) < 4.5) {
        this.nearCraftTable = true;
        break;
      }
    }

    // 4. Collect glowing Street Supply Crates
    for (let i = this.lootCrates.length - 1; i >= 0; i--) {
      const crate = this.lootCrates[i];
      crate.bobPhase += dt * 2.5;
      const vis = crate.mesh.getObjectByName('visual');
      if (vis) {
        vis.rotation.y += dt * 1.1;
        vis.position.y = Math.sin(crate.bobPhase) * 0.12 + 0.1;
      }

      const dist = Math.hypot(crate.x - this.playerPos.x, crate.z - this.playerPos.z);
      if (dist > 88) {
        this.scene.remove(crate.mesh);
        this.lootCrates.splice(i, 1);
        continue;
      }
      if (dist < 2.6) {
        this.scene.remove(crate.mesh);
        this.lootCrates.splice(i, 1);
        this.scrap += 2;
        this.tech += 1;
        this.cash += 35;
        this.cratesLooted += 1;
        this.addXp(35);
        this.audio.playPickup();
        this.spawnBurst(crate.x, 0.8, crate.z, 0xfbbf24, 10);
        this.showToast('Supply Crate! +2 Scrap · +1 Tech · +$35');

        if (this.chapterIndex === 0 && this.cratesLooted >= 3) {
          this.advanceChapter(1);
        }
        this.emitHud();
      }
    }

    // 5. Update Autonomous Traffic Cars & NPCs
    this.updateCarsAndNpcs(dt);
  }

  private getTimeOfDayLabel(): string {
    const h = Math.floor(this.timeOfDay * 24);
    const m = Math.floor((this.timeOfDay * 24 - h) * 60);
    const hh = String(h).padStart(2, '0');
    const mm = String(m).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  private getObjectiveProgress(): string {
    if (this.endlessFreeRoam) return 'Free Roam';
    if (this.chapterIndex === 0) return `${Math.min(3, this.cratesLooted)} / 3 Crates`;
    if (this.chapterIndex === 1) return this.unlockedWeapons.size > 1 ? 'Forged' : '0 / 1 Gun';
    if (this.chapterIndex === 2) return `${Math.min(120, Math.floor(this.driveDistanceAccum))} / 120m`;
    if (this.chapterIndex === 3) return `${Math.min(3, this.syndicateKills)} / 3 Guards`;
    return this.bossDefeated ? 'Defeated' : 'Boss Active';
  }

  private emitHud(): void {
    const ch = STORY_CHAPTERS[Math.min(this.chapterIndex, STORY_CHAPTERS.length - 1)];
    const def = WEAPONS[this.equippedWeapon];

    this.onHudUpdate({
      phase: this.phase,
      chapterIndex: this.chapterIndex,
      chapterTitle: this.endlessFreeRoam ? 'Apex Legend · Free Roam' : ch.title,
      objectiveText: this.endlessFreeRoam
        ? 'Roam the infinite world, drive across biomes, and rule the skyline'
        : ch.objective,
      objectiveProgress: this.getObjectiveProgress(),
      level: this.level,
      rank: STORY_CHAPTERS[Math.min(this.level - 1, STORY_CHAPTERS.length - 1)].rank,
      xp: this.xp,
      xpToNext: this.level * 120,
      health: Math.ceil(this.health),
      maxHealth: this.maxHealth,
      armor: Math.ceil(this.armor),
      cash: this.cash,
      scrap: this.scrap,
      tech: this.tech,
      equippedWeapon: this.equippedWeapon,
      unlockedWeapons: Array.from(this.unlockedWeapons),
      ammo: this.ammoMap[this.equippedWeapon],
      maxAmmo: def.magSize,
      isReloading: this.isReloading,
      isInCar: this.drivenCar !== null,
      carSpeedKmh: this.drivenCar ? Math.round(Math.abs(this.drivenCar.speed) * 4.2) : 0,
      nearCar: this.nearCar !== null,
      nearCraftTable: this.nearCraftTable,
      timeOfDayLabel: this.getTimeOfDayLabel(),
      dayCount: this.dayCount,
      weather: this.weather,
      biomeLabel: BIOME_LABELS[this.currentBiome],
      cinematicHeadline: this.cinematicHeadline,
      cinematicSubtitle: this.cinematicSubtitle,
      hitMarker: this.hitMarkerTimer > 0,
      kills: this.kills,
      toastMessage: this.toastMessage,
    });
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (typeof gl.fenceSync !== 'function') {
      this.frameId = window.setTimeout(cb, 50);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private tick = (): void => {
    if (this.disposed) return;
    const now = performance.now();
    const rawDt = (now - this.lastFrameTime) / 1000;
    this.lastFrameTime = now;
    const dt = Math.min(Math.max(rawDt, 0.001), 0.05);

    this.updateSimulation(dt);
    this.renderer.render(this.scene, this.camera);

    this.hudThrottleTimer += dt;
    if (this.hudThrottleTimer >= 0.1) {
      this.hudThrottleTimer = 0;
      this.emitHud();
    }

    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);

    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('orientationchange', this.handleOrientationChange);
    if (window.screen?.orientation?.removeEventListener) {
      window.screen.orientation.removeEventListener('change', this.handleOrientationChange);
    }
    window.removeEventListener('deviceorientation', this.handleDeviceOrientation);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('mouseup', this.handleMouseUp);

    const dom = this.renderer.domElement;
    dom.removeEventListener('mousedown', this.handleMouseDown);
    dom.removeEventListener('contextmenu', this.handleContextMenu);
    dom.removeEventListener('webglcontextlost', this.handleContextLost);

    this.audio.dispose();
    this.mats.dispose();
    this.particleGeo.dispose();
    this.skyDome.geometry.dispose();
    this.rainLines.geometry.dispose();
    (this.rainLines.material as THREE.Material).dispose();
    this.envRT?.dispose();
    this.renderer.dispose();
    if (dom.parentElement === this.container) {
      this.container.removeChild(dom);
    }
  }
}
