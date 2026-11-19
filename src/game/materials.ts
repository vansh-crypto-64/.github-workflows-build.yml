import * as THREE from 'three';

export interface CityMaterialLibrary {
  asphalt: THREE.MeshPhysicalMaterial;
  sidewalk: THREE.MeshStandardMaterial;
  buildingGlass: THREE.MeshPhysicalMaterial;
  buildingConcrete: THREE.MeshStandardMaterial;
  buildingBrick: THREE.MeshStandardMaterial;
  roofDark: THREE.MeshStandardMaterial;
  neonCyan: THREE.MeshStandardMaterial;
  neonAmber: THREE.MeshStandardMaterial;
  neonRed: THREE.MeshStandardMaterial;
  neonMagenta: THREE.MeshStandardMaterial;
  carPaints: THREE.MeshPhysicalMaterial[];
  carGlass: THREE.MeshPhysicalMaterial;
  carTrim: THREE.MeshStandardMaterial;
  tireRubber: THREE.MeshStandardMaterial;
  headlight: THREE.MeshStandardMaterial;
  taillight: THREE.MeshStandardMaterial;
  lightConeWarm: THREE.MeshBasicMaterial;
  lightConeCool: THREE.MeshBasicMaterial;
  gunMetal: THREE.MeshPhysicalMaterial;
  gunDark: THREE.MeshStandardMaterial;
  gunAccent: THREE.MeshStandardMaterial;
  muzzleFlash: THREE.MeshBasicMaterial;
  npcCivilianClothes: THREE.MeshStandardMaterial[];
  npcSkin: THREE.MeshStandardMaterial;
  syndicateArmor: THREE.MeshPhysicalMaterial;
  syndicateVisor: THREE.MeshStandardMaterial;
  bossArmor: THREE.MeshPhysicalMaterial;
  bossGold: THREE.MeshPhysicalMaterial;
  craftWood: THREE.MeshStandardMaterial;
  craftHolo: THREE.MeshStandardMaterial;
  crateBody: THREE.MeshStandardMaterial;
  foliageMat: THREE.MeshStandardMaterial;
  cloudMat: THREE.MeshStandardMaterial;
  skyMaterial: THREE.ShaderMaterial;
  textures: THREE.Texture[];
  setRainWetness: (wetness: number) => void;
  setNightEmission: (nightFactor: number) => void;
  dispose: () => void;
}

function makeCanvasTexture(
  size: number,
  draw: (ctx: CanvasRenderingContext2D, s: number) => void,
  anisotropy: number,
  repeatX = 1,
  repeatY = 1,
  isColor = true
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  draw(ctx, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = anisotropy;
  tex.needsUpdate = true;
  return tex;
}

export function createCityMaterials(renderer: THREE.WebGLRenderer): CityMaterialLibrary {
  const maxAniso = Math.min(16, renderer.capabilities.getMaxAnisotropy());
  const textures: THREE.Texture[] = [];

  // 1. ULTRA 1024x1024 Urban Asphalt (albedo + puddle roughness map + aggregate bump map)
  const asphaltTex = makeCanvasTexture(
    1024,
    (ctx, s) => {
      ctx.fillStyle = '#1f2228';
      ctx.fillRect(0, 0, s, s);

      // Macro tar variation patches
      for (let i = 0; i < 90; i++) {
        const x = Math.random() * s;
        const y = Math.random() * s;
        const r = 30 + Math.random() * 90;
        const g = ctx.createRadialGradient(x, y, 4, x, y, r);
        const v = 24 + Math.floor(Math.random() * 18);
        g.addColorStop(0, `rgba(${v},${v + 2},${v + 5},0.35)`);
        g.addColorStop(1, 'rgba(28,30,36,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Fine mineral aggregate speckle
      for (let i = 0; i < 24000; i++) {
        const v = 22 + Math.floor(Math.random() * 34);
        ctx.fillStyle = `rgb(${v},${v + 1},${v + 3})`;
        ctx.fillRect(Math.random() * s, Math.random() * s, 2, 2);
      }

      // Tar seam cracks
      ctx.strokeStyle = 'rgba(10,11,14,0.65)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 26; i++) {
        let x = Math.random() * s;
        let y = Math.random() * s;
        ctx.beginPath();
        ctx.moveTo(x, y);
        for (let seg = 0; seg < 4; seg++) {
          x += (Math.random() - 0.5) * 110;
          y += (Math.random() - 0.5) * 110;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // Crisp highway double-yellow center divider & white crosswalk bars near edges
      ctx.fillStyle = 'rgba(234, 179, 8, 0.78)';
      ctx.fillRect(s * 0.486, 0, 7, s);
      ctx.fillRect(s * 0.506, 0, 7, s);

      // Dashed white lane markers
      ctx.fillStyle = 'rgba(226, 232, 240, 0.48)';
      for (let y = 24; y < s; y += 96) {
        ctx.fillRect(s * 0.24, y, 6, 46);
        ctx.fillRect(s * 0.75, y, 6, 46);
      }
    },
    maxAniso,
    1,
    1,
    true
  );

  // Puddle Roughness Map (dark spots = glossy reflective rainwater puddles!)
  const asphaltRoughness = makeCanvasTexture(
    512,
    (ctx, s) => {
      ctx.fillStyle = '#d8d8d8';
      ctx.fillRect(0, 0, s, s);
      // Organic reflective puddles
      for (let i = 0; i < 42; i++) {
        const x = Math.random() * s;
        const y = Math.random() * s;
        const rx = 20 + Math.random() * 55;
        const ry = 14 + Math.random() * 40;
        const grad = ctx.createRadialGradient(x, y, 2, x, y, rx);
        grad.addColorStop(0, 'rgba(18, 18, 18, 0.92)');
        grad.addColorStop(0.7, 'rgba(55, 55, 55, 0.65)');
        grad.addColorStop(1, 'rgba(216, 216, 216, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(x, y, rx, ry, Math.random() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    maxAniso,
    1,
    1,
    false
  );

  const asphaltBump = makeCanvasTexture(
    512,
    (ctx, s) => {
      ctx.fillStyle = '#808080';
      ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < 14000; i++) {
        const v = 85 + Math.floor(Math.random() * 90);
        ctx.fillStyle = `rgb(${v},${v},${v})`;
        ctx.fillRect(Math.random() * s, Math.random() * s, 2, 2);
      }
    },
    maxAniso,
    2,
    2,
    false
  );
  textures.push(asphaltTex, asphaltRoughness, asphaltBump);

  // 2. Detailed Architectural Concrete Sidewalk (albedo + bump)
  const sidewalkTex = makeCanvasTexture(
    512,
    (ctx, s) => {
      ctx.fillStyle = '#686d76';
      ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < 8000; i++) {
        const v = 88 + Math.floor(Math.random() * 34);
        ctx.fillStyle = `rgb(${v},${v + 2},${v + 4})`;
        ctx.fillRect(Math.random() * s, Math.random() * s, 2, 2);
      }
      ctx.strokeStyle = 'rgba(22, 24, 30, 0.55)';
      ctx.lineWidth = 3;
      for (let p = 0; p < s; p += 64) {
        ctx.beginPath();
        ctx.moveTo(p, 0);
        ctx.lineTo(p, s);
        ctx.moveTo(0, p);
        ctx.lineTo(s, p);
        ctx.stroke();
      }
    },
    maxAniso,
    5,
    5,
    true
  );

  const sidewalkBump = makeCanvasTexture(
    256,
    (ctx, s) => {
      ctx.fillStyle = '#909090';
      ctx.fillRect(0, 0, s, s);
      ctx.strokeStyle = '#181818';
      ctx.lineWidth = 3;
      for (let p = 0; p < s; p += 64) {
        ctx.beginPath();
        ctx.moveTo(p, 0);
        ctx.lineTo(p, s);
        ctx.moveTo(0, p);
        ctx.lineTo(s, p);
        ctx.stroke();
      }
    },
    maxAniso,
    5,
    5,
    false
  );
  textures.push(sidewalkTex, sidewalkBump);

  // 3. ULTRA 1024x1024 Glass Skyscraper Curtain Wall (albedo + emissive + bump)
  const glassFacadeTex = makeCanvasTexture(
    1024,
    (ctx, s) => {
      ctx.fillStyle = '#152130';
      ctx.fillRect(0, 0, s, s);
      const cols = 10;
      const rows = 14;
      const cw = s / cols;
      const rh = s / rows;

      for (let r = 0; r < rows; r++) {
        // Horizontal spandrel steel beam
        ctx.fillStyle = '#0f1722';
        ctx.fillRect(0, r * rh, s, 8);
        for (let c = 0; c < cols; c++) {
          const x = c * cw + 6;
          const y = r * rh + 10;
          const w = cw - 12;
          const h = rh - 16;

          const grad = ctx.createLinearGradient(x, y, x, y + h);
          const lit = Math.random() > 0.38;
          grad.addColorStop(0, lit ? '#5b84ab' : '#1b2b3d');
          grad.addColorStop(0.55, lit ? '#365470' : '#121c29');
          grad.addColorStop(1, '#0e1622');
          ctx.fillStyle = grad;
          ctx.fillRect(x, y, w, h);

          // Interior office blinds / ceiling light silhouette
          if (Math.random() > 0.5) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
            ctx.fillRect(x + 4, y + 4, w - 8, h * 0.25);
          }

          // Diagonal specular sky glint
          ctx.fillStyle = 'rgba(200, 232, 255, 0.14)';
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + w * 0.65, y);
          ctx.lineTo(x, y + h * 0.6);
          ctx.closePath();
          ctx.fill();
        }
      }
    },
    maxAniso,
    1,
    2,
    true
  );

  const glassEmissiveTex = makeCanvasTexture(
    512,
    (ctx, s) => {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, s, s);
      const cols = 10;
      const rows = 14;
      const cw = s / cols;
      const rh = s / rows;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const roll = Math.random();
          if (roll > 0.48) {
            ctx.fillStyle =
              roll > 0.88
                ? '#38bdf8'
                : roll > 0.72
                  ? '#fef08a'
                  : roll > 0.58
                    ? '#fbbf24'
                    : '#f97316';
            ctx.fillRect(c * cw + 4, r * rh + 6, cw - 8, rh - 10);
          }
        }
      }
    },
    maxAniso,
    1,
    2,
    true
  );

  const facadeBump = makeCanvasTexture(
    512,
    (ctx, s) => {
      ctx.fillStyle = '#d0d0d0';
      ctx.fillRect(0, 0, s, s);
      const cols = 10;
      const rows = 14;
      const cw = s / cols;
      const rh = s / rows;
      ctx.fillStyle = '#404040';
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          ctx.fillRect(c * cw + 5, r * rh + 6, cw - 10, rh - 10);
        }
      }
    },
    maxAniso,
    1,
    2,
    false
  );
  textures.push(glassFacadeTex, glassEmissiveTex, facadeBump);

  // 4. Concrete & Brick Mid-Rise Facades
  const concreteFacadeTex = makeCanvasTexture(
    512,
    (ctx, s) => {
      ctx.fillStyle = '#4a505a';
      ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < 5000; i++) {
        const v = 58 + Math.floor(Math.random() * 32);
        ctx.fillStyle = `rgb(${v},${v + 2},${v + 5})`;
        ctx.fillRect(Math.random() * s, Math.random() * s, 3, 3);
      }
      const cols = 6;
      const rows = 8;
      const cw = s / cols;
      const rh = s / rows;
      for (let r = 0; r < rows; r++) {
        ctx.fillStyle = '#2d333d';
        ctx.fillRect(0, r * rh, s, 8);
        for (let c = 0; c < cols; c++) {
          ctx.fillStyle = '#18212d';
          ctx.fillRect(c * cw + 11, r * rh + 14, cw - 22, rh - 24);
          ctx.fillStyle = 'rgba(180,210,240,0.12)';
          ctx.fillRect(c * cw + 11, r * rh + 14, cw - 22, 10);
        }
      }
    },
    maxAniso,
    1,
    2,
    true
  );

  const brickFacadeTex = makeCanvasTexture(
    512,
    (ctx, s) => {
      ctx.fillStyle = '#5a3830';
      ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < 5500; i++) {
        const v = Math.floor(Math.random() * 26);
        ctx.fillStyle = `rgb(${78 + v}, ${46 + v}, ${38 + v})`;
        ctx.fillRect(Math.random() * s, Math.random() * s, 5, 2.5);
      }
      const cols = 5;
      const rows = 7;
      const cw = s / cols;
      const rh = s / rows;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          ctx.fillStyle = '#1b212b';
          ctx.fillRect(c * cw + 14, r * rh + 14, cw - 28, rh - 24);
          ctx.fillStyle = '#9498a1';
          ctx.fillRect(c * cw + 11, r * rh + rh - 10, cw - 22, 6);
        }
      }
    },
    maxAniso,
    1,
    1.5,
    true
  );
  textures.push(concreteFacadeTex, brickFacadeTex);

  // Ultra Physically-Based Materials
  const asphalt = new THREE.MeshPhysicalMaterial({
    map: asphaltTex,
    roughnessMap: asphaltRoughness,
    bumpMap: asphaltBump,
    bumpScale: 0.16,
    roughness: 0.78,
    metalness: 0.12,
    clearcoat: 0.15,
    clearcoatRoughness: 0.4,
  });

  const sidewalk = new THREE.MeshStandardMaterial({
    map: sidewalkTex,
    bumpMap: sidewalkBump,
    bumpScale: 0.12,
    roughness: 0.86,
    metalness: 0.05,
  });

  const buildingGlass = new THREE.MeshPhysicalMaterial({
    map: glassFacadeTex,
    emissiveMap: glassEmissiveTex,
    bumpMap: facadeBump,
    bumpScale: 0.18,
    emissive: new THREE.Color(0xffffff),
    emissiveIntensity: 0.25,
    roughness: 0.14,
    metalness: 0.76,
    clearcoat: 0.85,
    clearcoatRoughness: 0.12,
  });

  const buildingConcrete = new THREE.MeshStandardMaterial({
    map: concreteFacadeTex,
    emissiveMap: glassEmissiveTex,
    bumpMap: facadeBump,
    bumpScale: 0.16,
    emissive: new THREE.Color(0xffe0a3),
    emissiveIntensity: 0.16,
    roughness: 0.82,
    metalness: 0.1,
  });

  const buildingBrick = new THREE.MeshStandardMaterial({
    map: brickFacadeTex,
    emissiveMap: glassEmissiveTex,
    bumpMap: facadeBump,
    bumpScale: 0.16,
    emissive: new THREE.Color(0xffd28a),
    emissiveIntensity: 0.15,
    roughness: 0.86,
    metalness: 0.06,
  });

  const roofDark = new THREE.MeshStandardMaterial({
    color: 0x22262e,
    roughness: 0.88,
    metalness: 0.16,
  });

  const neonCyan = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0ea5e9,
    emissiveIntensity: 2.2,
    roughness: 0.15,
  });

  const neonAmber = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: 0xf59e0b,
    emissiveIntensity: 2.2,
    roughness: 0.15,
  });

  const neonRed = new THREE.MeshStandardMaterial({
    color: 0xf87171,
    emissive: 0xef4444,
    emissiveIntensity: 2.2,
    roughness: 0.15,
  });

  const neonMagenta = new THREE.MeshStandardMaterial({
    color: 0xe879f9,
    emissive: 0xc026d3,
    emissiveIntensity: 2.1,
    roughness: 0.15,
  });

  // Automotive Clearcoat Lacquer Car Paints
  const carPaintHexes = [0xdc2626, 0x1d4ed8, 0xeab308, 0xe2e8f0, 0x059669];
  const carPaints = carPaintHexes.map(
    (hex) =>
      new THREE.MeshPhysicalMaterial({
        color: hex,
        roughness: 0.18,
        metalness: 0.78,
        clearcoat: 1.0,
        clearcoatRoughness: 0.06,
      })
  );

  const carGlass = new THREE.MeshPhysicalMaterial({
    color: 0x0b1220,
    roughness: 0.06,
    metalness: 0.92,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
  });

  const carTrim = new THREE.MeshStandardMaterial({
    color: 0x1b1f26,
    roughness: 0.52,
    metalness: 0.45,
  });

  const tireRubber = new THREE.MeshStandardMaterial({
    color: 0x131518,
    roughness: 0.92,
    metalness: 0.04,
  });

  const headlight = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xfef3c7,
    emissiveIntensity: 2.8,
    roughness: 0.08,
  });

  const taillight = new THREE.MeshStandardMaterial({
    color: 0xff3b3b,
    emissive: 0xef4444,
    emissiveIntensity: 2.6,
    roughness: 0.12,
  });

  const lightConeWarm = new THREE.MeshBasicMaterial({
    color: 0xfde68a,
    transparent: true,
    opacity: 0.08,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });

  const lightConeCool = new THREE.MeshBasicMaterial({
    color: 0xe0f2fe,
    transparent: true,
    opacity: 0.09,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });

  // Brushed Clearcoat Gunmetal for First-Person Weapons
  const gunMetal = new THREE.MeshPhysicalMaterial({
    color: 0x526072,
    roughness: 0.22,
    metalness: 0.92,
    clearcoat: 0.4,
    clearcoatRoughness: 0.2,
  });

  const gunDark = new THREE.MeshStandardMaterial({
    color: 0x191d24,
    roughness: 0.56,
    metalness: 0.48,
  });

  const gunAccent = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xd97706,
    emissiveIntensity: 0.9,
    roughness: 0.2,
    metalness: 0.7,
  });

  const muzzleFlash = new THREE.MeshBasicMaterial({
    color: 0xfef08a,
    transparent: true,
    opacity: 0.96,
  });

  const npcCivilianClothes = [0x475569, 0x2563eb, 0x0f766e, 0x92400e, 0x7e22ce].map(
    (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.78, metalness: 0.06 })
  );

  const npcSkin = new THREE.MeshStandardMaterial({
    color: 0xd6a584,
    roughness: 0.68,
    metalness: 0.02,
  });

  const syndicateArmor = new THREE.MeshPhysicalMaterial({
    color: 0x1a1820,
    roughness: 0.36,
    metalness: 0.65,
    clearcoat: 0.45,
  });

  const syndicateVisor = new THREE.MeshStandardMaterial({
    color: 0xf87171,
    emissive: 0xef4444,
    emissiveIntensity: 2.5,
    roughness: 0.1,
    metalness: 0.8,
  });

  const bossArmor = new THREE.MeshPhysicalMaterial({
    color: 0x141418,
    roughness: 0.24,
    metalness: 0.86,
    clearcoat: 0.85,
  });

  const bossGold = new THREE.MeshPhysicalMaterial({
    color: 0xfbbf24,
    emissive: 0xd97706,
    emissiveIntensity: 1.4,
    roughness: 0.18,
    metalness: 0.92,
    clearcoat: 0.7,
  });

  const craftWood = new THREE.MeshStandardMaterial({
    color: 0x6b4423,
    roughness: 0.82,
    metalness: 0.08,
  });

  const craftHolo = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0ea5e9,
    emissiveIntensity: 2.0,
    roughness: 0.12,
    transparent: true,
    opacity: 0.88,
  });

  const crateBody = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.42,
    metalness: 0.64,
  });

  const foliageMat = new THREE.MeshStandardMaterial({
    color: 0x2d5a3c,
    roughness: 0.85,
    metalness: 0.04,
  });

  const cloudMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    roughness: 0.95,
    metalness: 0.0,
    transparent: true,
    opacity: 0.84,
  });

  // Ultra Atmospheric Sky Dome with Sun, Moon, Stars & Sun-Lit Silver-Lining Clouds
  const skyMaterial = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uSunDir: { value: new THREE.Vector3(0.4, 0.7, 0.5).normalize() },
      uZenithColor: { value: new THREE.Color(0x1b3c6b) },
      uHorizonColor: { value: new THREE.Color(0x8bb6db) },
      uSunColor: { value: new THREE.Color(0xfff1cc) },
      uRainFactor: { value: 0.0 },
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
      uniform float uTime;
      uniform vec3 uSunDir;
      uniform vec3 uZenithColor;
      uniform vec3 uHorizonColor;
      uniform vec3 uSunColor;
      uniform float uRainFactor;
      uniform float uNightFactor;
      varying vec3 vDir;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
          u.y
        );
      }

      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        for (int i = 0; i < 5; i++) {
          v += a * noise(p);
          p *= 2.03;
          a *= 0.5;
        }
        return v;
      }

      void main() {
        vec3 d = normalize(vDir);
        float h = clamp(d.y, 0.0, 1.0);
        vec3 col = mix(uHorizonColor, uZenithColor, pow(h, 0.5));

        // Sun disc, atmospheric Mie halo & warm horizon scatter
        vec3 sDir = normalize(uSunDir);
        float sunDot = max(dot(d, sDir), 0.0);
        float sunHalo = pow(sunDot, 10.0) * 0.45 * (1.0 - uRainFactor * 0.7) * (1.0 - uNightFactor * 0.85);
        float sunCore = smoothstep(0.996, 0.9992, sunDot) * 1.8 * (1.0 - uRainFactor * 0.85) * (1.0 - uNightFactor * 0.92);
        col += uSunColor * (sunHalo + sunCore);

        // Glowing Moon + Starfield at night
        if (uNightFactor > 0.12 && d.y > 0.06) {
          vec3 moonDir = normalize(vec3(-sDir.x, max(0.35, abs(sDir.y)), -sDir.z));
          float moonDot = max(dot(d, moonDir), 0.0);
          col += vec3(0.75, 0.86, 1.0) * smoothstep(0.997, 0.999, moonDot) * uNightFactor * (1.0 - uRainFactor);
          vec2 starUV = floor(d.xz / (d.y + 0.15) * 95.0);
          float sVal = hash(starUV);
          if (sVal > 0.992) {
            float twinkle = 0.65 + 0.35 * sin(uTime * 3.0 + sVal * 90.0);
            col += vec3(0.85, 0.93, 1.0) * uNightFactor * (1.0 - uRainFactor) * twinkle;
          }
        }

        // Rich multi-octave clouds with silver lining near sun
        if (d.y > 0.015) {
          vec2 cloudUV = d.xz / (d.y + 0.16) * 1.2 + vec2(uTime * 0.016, -uTime * 0.009);
          float c = fbm(cloudUV);
          float cloudMask = smoothstep(0.44 - uRainFactor * 0.18, 0.78, c) * smoothstep(0.015, 0.22, d.y);
          vec3 baseCloud = mix(uHorizonColor * 1.22, vec3(0.22, 0.27, 0.34), uRainFactor * 0.78);
          vec3 silverLining = uSunColor * pow(sunDot, 5.0) * 0.45 * (1.0 - uNightFactor);
          col = mix(col, baseCloud + silverLining, cloudMask * (0.55 + uRainFactor * 0.32));
        }

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });

  const allMats: THREE.Material[] = [
    asphalt,
    sidewalk,
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
    lightConeWarm,
    lightConeCool,
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
    lightConeWarm,
    lightConeCool,
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
      // Wet city streets shimmer with clearcoat rain reflections!
      asphalt.roughness = THREE.MathUtils.lerp(0.78, 0.18, wetness);
      asphalt.clearcoat = THREE.MathUtils.lerp(0.15, 0.92, wetness);
      asphalt.clearcoatRoughness = THREE.MathUtils.lerp(0.4, 0.08, wetness);
      sidewalk.roughness = THREE.MathUtils.lerp(0.86, 0.32, wetness);
    },
    setNightEmission: (nightFactor: number) => {
      const intensity = 0.14 + nightFactor * 1.45;
      buildingGlass.emissiveIntensity = intensity;
      buildingConcrete.emissiveIntensity = intensity * 0.82;
      buildingBrick.emissiveIntensity = intensity * 0.78;
      lightConeWarm.opacity = 0.03 + nightFactor * 0.12;
      lightConeCool.opacity = 0.04 + nightFactor * 0.13;
    },
    dispose: () => {
      allMats.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
    },
  };
}
