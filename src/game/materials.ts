import * as THREE from 'three';

export interface CityMaterialLibrary {
  asphalt: THREE.MeshStandardMaterial;
  sidewalk: THREE.MeshStandardMaterial;
  grass: THREE.MeshStandardMaterial;
  sand: THREE.MeshStandardMaterial;
  mountainRock: THREE.MeshStandardMaterial;
  snowCap: THREE.MeshStandardMaterial;
  mesaRock: THREE.MeshStandardMaterial;
  riverWater: THREE.MeshStandardMaterial;
  bridgeStone: THREE.MeshStandardMaterial;
  cactusGreen: THREE.MeshStandardMaterial;
  buildingGlass: THREE.MeshStandardMaterial;
  buildingConcrete: THREE.MeshStandardMaterial;
  buildingBrick: THREE.MeshStandardMaterial;
  roofDark: THREE.MeshStandardMaterial;
  neonCyan: THREE.MeshStandardMaterial;
  neonAmber: THREE.MeshStandardMaterial;
  neonRed: THREE.MeshStandardMaterial;
  neonMagenta: THREE.MeshStandardMaterial;
  carPaints: THREE.MeshStandardMaterial[];
  carGlass: THREE.MeshStandardMaterial;
  carTrim: THREE.MeshStandardMaterial;
  tireRubber: THREE.MeshStandardMaterial;
  headlight: THREE.MeshStandardMaterial;
  taillight: THREE.MeshStandardMaterial;
  gunMetal: THREE.MeshStandardMaterial;
  gunDark: THREE.MeshStandardMaterial;
  gunAccent: THREE.MeshStandardMaterial;
  muzzleFlash: THREE.MeshBasicMaterial;
  npcCivilianClothes: THREE.MeshStandardMaterial[];
  npcSkin: THREE.MeshStandardMaterial;
  syndicateArmor: THREE.MeshStandardMaterial;
  syndicateVisor: THREE.MeshStandardMaterial;
  bossArmor: THREE.MeshStandardMaterial;
  bossGold: THREE.MeshStandardMaterial;
  craftWood: THREE.MeshStandardMaterial;
  craftHolo: THREE.MeshStandardMaterial;
  crateBody: THREE.MeshStandardMaterial;
  foliageMat: THREE.MeshStandardMaterial;
  cloudMat: THREE.MeshLambertMaterial;
  skyMaterial: THREE.ShaderMaterial;
  textures: THREE.Texture[];
  setRainWetness: (wetness: number) => void;
  setNightEmission: (nightFactor: number) => void;
  dispose: () => void;
}

function makeLiteTexture(
  size: number,
  draw: (ctx: CanvasRenderingContext2D, s: number) => void,
  repeatX = 1,
  repeatY = 1
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  draw(ctx, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.needsUpdate = true;
  return tex;
}

export function createCityMaterials(_renderer: THREE.WebGLRenderer): CityMaterialLibrary {
  const textures: THREE.Texture[] = [];

  // Lightweight 256x256 procedural textures for fast Android 4+ / mobile GPUs
  const asphaltTex = makeLiteTexture(256, (ctx, s) => {
    ctx.fillStyle = '#262930';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 1200; i++) {
      const v = 32 + Math.floor(Math.random() * 20);
      ctx.fillStyle = `rgb(${v},${v + 1},${v + 3})`;
      ctx.fillRect(Math.random() * s, Math.random() * s, 2, 2);
    }
    ctx.fillStyle = 'rgba(234, 179, 8, 0.78)';
    ctx.fillRect(s * 0.485, 0, 3, s);
    ctx.fillRect(s * 0.505, 0, 3, s);
  });

  const grassTex = makeLiteTexture(
    256,
    (ctx, s) => {
      ctx.fillStyle = '#3f6e38';
      ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < 1600; i++) {
        const g = 92 + Math.floor(Math.random() * 38);
        ctx.fillStyle = `rgb(${54 + Math.floor(Math.random() * 20)}, ${g}, ${46 + Math.floor(Math.random() * 18)})`;
        ctx.fillRect(Math.random() * s, Math.random() * s, 3, 3);
      }
    },
    3,
    3
  );

  const sandTex = makeLiteTexture(
    256,
    (ctx, s) => {
      ctx.fillStyle = '#cfa66b';
      ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < 1400; i++) {
        const v = Math.floor(Math.random() * 24);
        ctx.fillStyle = `rgb(${194 + v}, ${154 + v}, ${96 + v})`;
        ctx.fillRect(Math.random() * s, Math.random() * s, 3, 2);
      }
      // Subtle wind-blown desert ripples
      ctx.strokeStyle = 'rgba(155, 112, 60, 0.22)';
      ctx.lineWidth = 2;
      for (let y = 16; y < s; y += 28) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.quadraticCurveTo(s / 2, y + 6, s, y);
        ctx.stroke();
      }
    },
    3,
    3
  );

  const glassFacadeTex = makeLiteTexture(
    256,
    (ctx, s) => {
      ctx.fillStyle = '#1b2b3d';
      ctx.fillRect(0, 0, s, s);
      const cols = 6;
      const rows = 8;
      const cw = s / cols;
      const rh = s / rows;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          ctx.fillStyle = (r + c) % 3 === 0 ? '#50789c' : '#243a52';
          ctx.fillRect(c * cw + 4, r * rh + 4, cw - 8, rh - 8);
        }
      }
    },
    1,
    2
  );

  const glassEmissiveTex = makeLiteTexture(
    256,
    (ctx, s) => {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, s, s);
      const cols = 6;
      const rows = 8;
      const cw = s / cols;
      const rh = s / rows;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const roll = Math.random();
          if (roll > 0.55) {
            ctx.fillStyle = roll > 0.85 ? '#38bdf8' : '#fde68a';
            ctx.fillRect(c * cw + 5, r * rh + 5, cw - 10, rh - 10);
          }
        }
      }
    },
    1,
    2
  );

  const concreteFacadeTex = makeLiteTexture(
    256,
    (ctx, s) => {
      ctx.fillStyle = '#585e68';
      ctx.fillRect(0, 0, s, s);
      const cols = 5;
      const rows = 6;
      const cw = s / cols;
      const rh = s / rows;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          ctx.fillStyle = '#202936';
          ctx.fillRect(c * cw + 7, r * rh + 8, cw - 14, rh - 14);
        }
      }
    },
    1,
    2
  );

  const brickFacadeTex = makeLiteTexture(
    256,
    (ctx, s) => {
      ctx.fillStyle = '#6c453a';
      ctx.fillRect(0, 0, s, s);
      const cols = 4;
      const rows = 6;
      const cw = s / cols;
      const rh = s / rows;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          ctx.fillStyle = '#222834';
          ctx.fillRect(c * cw + 9, r * rh + 8, cw - 18, rh - 14);
        }
      }
    },
    1,
    1.5
  );

  textures.push(
    asphaltTex,
    grassTex,
    sandTex,
    glassFacadeTex,
    glassEmissiveTex,
    concreteFacadeTex,
    brickFacadeTex
  );

  // Fast Standard Materials (Android 4+ friendly)
  const asphalt = new THREE.MeshStandardMaterial({
    map: asphaltTex,
    roughness: 0.84,
    metalness: 0.08,
  });

  const sidewalk = new THREE.MeshStandardMaterial({
    color: 0x737882,
    roughness: 0.88,
    metalness: 0.04,
  });

  const grass = new THREE.MeshStandardMaterial({
    map: grassTex,
    roughness: 0.92,
    metalness: 0.02,
  });

  const sand = new THREE.MeshStandardMaterial({
    map: sandTex,
    roughness: 0.94,
    metalness: 0.02,
  });

  const mountainRock = new THREE.MeshStandardMaterial({
    color: 0x5c616b,
    roughness: 0.92,
    metalness: 0.06,
  });

  const snowCap = new THREE.MeshStandardMaterial({
    color: 0xe8eff5,
    roughness: 0.72,
    metalness: 0.05,
  });

  const mesaRock = new THREE.MeshStandardMaterial({
    color: 0xb06b42,
    roughness: 0.9,
    metalness: 0.04,
  });

  const riverWater = new THREE.MeshStandardMaterial({
    color: 0x1d7ea8,
    emissive: 0x0a2e42,
    emissiveIntensity: 0.35,
    roughness: 0.16,
    metalness: 0.55,
  });

  const bridgeStone = new THREE.MeshStandardMaterial({
    color: 0x575c64,
    roughness: 0.85,
    metalness: 0.12,
  });

  const cactusGreen = new THREE.MeshStandardMaterial({
    color: 0x3b7a44,
    roughness: 0.85,
    metalness: 0.02,
  });

  const buildingGlass = new THREE.MeshStandardMaterial({
    map: glassFacadeTex,
    emissiveMap: glassEmissiveTex,
    emissive: new THREE.Color(0xffffff),
    emissiveIntensity: 0.2,
    roughness: 0.28,
    metalness: 0.55,
  });

  const buildingConcrete = new THREE.MeshStandardMaterial({
    map: concreteFacadeTex,
    emissiveMap: glassEmissiveTex,
    emissive: new THREE.Color(0xffe0a3),
    emissiveIntensity: 0.12,
    roughness: 0.85,
    metalness: 0.08,
  });

  const buildingBrick = new THREE.MeshStandardMaterial({
    map: brickFacadeTex,
    emissiveMap: glassEmissiveTex,
    emissive: new THREE.Color(0xffd28a),
    emissiveIntensity: 0.12,
    roughness: 0.88,
    metalness: 0.05,
  });

  const roofDark = new THREE.MeshStandardMaterial({
    color: 0x2a2e36,
    roughness: 0.9,
    metalness: 0.1,
  });

  const neonCyan = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0ea5e9,
    emissiveIntensity: 1.4,
    roughness: 0.2,
  });

  const neonAmber = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.4,
    roughness: 0.2,
  });

  const neonRed = new THREE.MeshStandardMaterial({
    color: 0xf87171,
    emissive: 0xef4444,
    emissiveIntensity: 1.4,
    roughness: 0.2,
  });

  const neonMagenta = new THREE.MeshStandardMaterial({
    color: 0xe879f9,
    emissive: 0xc026d3,
    emissiveIntensity: 1.3,
    roughness: 0.2,
  });

  const carPaintHexes = [0xdc2626, 0x2563eb, 0xeab308, 0xe2e8f0, 0x10b981];
  const carPaints = carPaintHexes.map(
    (hex) =>
      new THREE.MeshStandardMaterial({
        color: hex,
        roughness: 0.3,
        metalness: 0.62,
      })
  );

  const carGlass = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.15,
    metalness: 0.8,
  });

  const carTrim = new THREE.MeshStandardMaterial({
    color: 0x1f2329,
    roughness: 0.6,
    metalness: 0.35,
  });

  const tireRubber = new THREE.MeshStandardMaterial({
    color: 0x15171a,
    roughness: 0.92,
    metalness: 0.05,
  });

  const headlight = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xfef3c7,
    emissiveIntensity: 1.8,
    roughness: 0.1,
  });

  const taillight = new THREE.MeshStandardMaterial({
    color: 0xff3b3b,
    emissive: 0xef4444,
    emissiveIntensity: 1.6,
    roughness: 0.15,
  });

  const gunMetal = new THREE.MeshStandardMaterial({
    color: 0x526072,
    roughness: 0.32,
    metalness: 0.82,
  });

  const gunDark = new THREE.MeshStandardMaterial({
    color: 0x1e2229,
    roughness: 0.62,
    metalness: 0.4,
  });

  const gunAccent = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xd97706,
    emissiveIntensity: 0.6,
    roughness: 0.25,
    metalness: 0.55,
  });

  const muzzleFlash = new THREE.MeshBasicMaterial({
    color: 0xfef08a,
    transparent: true,
    opacity: 0.95,
  });

  const npcCivilianClothes = [0x475569, 0x2563eb, 0x0f766e, 0x92400e, 0x7e22ce].map(
    (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.82, metalness: 0.04 })
  );

  const npcSkin = new THREE.MeshStandardMaterial({
    color: 0xd6a584,
    roughness: 0.72,
    metalness: 0.02,
  });

  const syndicateArmor = new THREE.MeshStandardMaterial({
    color: 0x1f1d24,
    roughness: 0.45,
    metalness: 0.5,
  });

  const syndicateVisor = new THREE.MeshStandardMaterial({
    color: 0xf87171,
    emissive: 0xef4444,
    emissiveIntensity: 1.6,
    roughness: 0.15,
  });

  const bossArmor = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    roughness: 0.32,
    metalness: 0.72,
  });

  const bossGold = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: 0xd97706,
    emissiveIntensity: 0.9,
    roughness: 0.22,
    metalness: 0.8,
  });

  const craftWood = new THREE.MeshStandardMaterial({
    color: 0x6b4423,
    roughness: 0.85,
    metalness: 0.06,
  });

  const craftHolo = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0ea5e9,
    emissiveIntensity: 1.4,
    roughness: 0.15,
    transparent: true,
    opacity: 0.85,
  });

  const crateBody = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.5,
    metalness: 0.5,
  });

  const foliageMat = new THREE.MeshStandardMaterial({
    color: 0x2d6b3c,
    roughness: 0.88,
    metalness: 0.02,
  });

  const cloudMat = new THREE.MeshLambertMaterial({
    color: 0xf1f5f9,
    transparent: true,
    opacity: 0.8,
  });

  // Lightweight Sky Dome Shader (Android 4 / WebGL1 compatible — low ALU cost)
  const skyMaterial = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uSunDir: { value: new THREE.Vector3(0.4, 0.7, 0.5).normalize() },
      uZenithColor: { value: new THREE.Color(0x214a80) },
      uHorizonColor: { value: new THREE.Color(0x95bee0) },
      uSunColor: { value: new THREE.Color(0xfff1cc) },
      uNightFactor: { value: 0.0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uSunDir;
      uniform vec3 uZenithColor;
      uniform vec3 uHorizonColor;
      uniform vec3 uSunColor;
      uniform float uNightFactor;
      varying vec3 vDir;

      void main() {
        vec3 d = normalize(vDir);
        float h = clamp(d.y, 0.0, 1.0);
        vec3 col = mix(uHorizonColor, uZenithColor, pow(h, 0.55));
        float sunDot = max(dot(d, normalize(uSunDir)), 0.0);
        col += uSunColor * (pow(sunDot, 10.0) * 0.35 + smoothstep(0.996, 0.999, sunDot) * 1.2) * (1.0 - uNightFactor * 0.85);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });

  const allMats: THREE.Material[] = [
    asphalt,
    sidewalk,
    grass,
    sand,
    mountainRock,
    snowCap,
    mesaRock,
    riverWater,
    bridgeStone,
    cactusGreen,
    buildingGlass,
    buildingConcrete,
    buildingBrick,
    roofDark,
    neonCyan,
    neonAmber,
    neonRed,
    neonMagenta,
    ...carPaints,
    carGlass,
    carTrim,
    tireRubber,
    headlight,
    taillight,
    gunMetal,
    gunDark,
    gunAccent,
    muzzleFlash,
    ...npcCivilianClothes,
    npcSkin,
    syndicateArmor,
    syndicateVisor,
    bossArmor,
    bossGold,
    craftWood,
    craftHolo,
    crateBody,
    foliageMat,
    cloudMat,
    skyMaterial,
  ];

  return {
    asphalt,
    sidewalk,
    grass,
    sand,
    mountainRock,
    snowCap,
    mesaRock,
    riverWater,
    bridgeStone,
    cactusGreen,
    buildingGlass,
    buildingConcrete,
    buildingBrick,
    roofDark,
    neonCyan,
    neonAmber,
    neonRed,
    neonMagenta,
    carPaints,
    carGlass,
    carTrim,
    tireRubber,
    headlight,
    taillight,
    gunMetal,
    gunDark,
    gunAccent,
    muzzleFlash,
    npcCivilianClothes,
    npcSkin,
    syndicateArmor,
    syndicateVisor,
    bossArmor,
    bossGold,
    craftWood,
    craftHolo,
    crateBody,
    foliageMat,
    cloudMat,
    skyMaterial,
    textures,
    setRainWetness: (wetness: number) => {
      asphalt.roughness = THREE.MathUtils.lerp(0.84, 0.35, wetness);
    },
    setNightEmission: (nightFactor: number) => {
      const intensity = 0.1 + nightFactor * 1.05;
      buildingGlass.emissiveIntensity = intensity;
      buildingConcrete.emissiveIntensity = intensity * 0.7;
      buildingBrick.emissiveIntensity = intensity * 0.7;
    },
    dispose: () => {
      allMats.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
    },
  };
}
