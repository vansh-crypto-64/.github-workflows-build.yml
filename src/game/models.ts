import * as THREE from 'three';
import { CityMaterialLibrary } from './materials';
import { WeaponId } from './types';

/**
 * Composite 5-part procedural 3D City Building (3 distinct architectural styles).
 */
export function createBuildingModel(
  width: number,
  height: number,
  depth: number,
  style: 0 | 1 | 2,
  mats: CityMaterialLibrary,
  castShadow: boolean
): THREE.Group {
  const group = new THREE.Group();
  const mainMat =
    style === 0 ? mats.buildingGlass : style === 1 ? mats.buildingConcrete : mats.buildingBrick;

  // Main tower shaft (bottom-center pivot y = 0)
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), mainMat);
  shaft.position.y = height / 2;
  shaft.castShadow = castShadow;
  shaft.receiveShadow = true;
  group.add(shaft);

  // Ground-floor dark commercial lobby trim
  const lobby = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.3, Math.min(3.4, height * 0.25), depth + 0.3),
    mats.roofDark
  );
  lobby.position.y = Math.min(1.7, height * 0.125);
  group.add(lobby);

  // Glowing neon storefront band + awning canopy
  const neonMat =
    style === 0 ? mats.neonCyan : style === 1 ? mats.neonAmber : mats.neonMagenta;
  const neonBand = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.5, 0.36, depth + 0.5),
    neonMat
  );
  neonBand.position.y = Math.min(3.5, height * 0.27);
  group.add(neonBand);

  // Mid-tower architectural setback ledge
  if (height > 22) {
    const ledge = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.55, 0.45, depth + 0.55),
      mats.roofDark
    );
    ledge.position.y = height * 0.58;
    group.add(ledge);
  }

  // Rooftop parapet cap
  const roof = new THREE.Mesh(new THREE.BoxGeometry(width + 0.45, 0.6, depth + 0.45), mats.roofDark);
  roof.position.y = height + 0.28;
  group.add(roof);

  // Architectural crown, glowing rooftop billboard, or skyscraper spire
  if (style === 0 && height > 20) {
    const crown = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.62, 3.6, depth * 0.62),
      mats.buildingGlass
    );
    crown.position.y = height + 2.2;
    group.add(crown);

    const crownNeon = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.66, 0.28, depth * 0.66),
      mats.neonCyan
    );
    crownNeon.position.y = height + 4.0;
    group.add(crownNeon);

    const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.22, 9.5, 6), mats.gunMetal);
    spire.position.y = height + 8.5;
    group.add(spire);

    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 8), mats.neonRed);
    beacon.position.y = height + 13.4;
    group.add(beacon);
  } else {
    const hvac = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.34, 1.5, depth * 0.34),
      mats.carTrim
    );
    hvac.position.set(width * 0.16, height + 1.15, -depth * 0.12);
    group.add(hvac);

    // Glowing holographic rooftop billboard
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.72, 2.4, 0.22),
      style === 1 ? mats.neonAmber : mats.neonMagenta
    );
    board.position.set(0, height + 2.1, depth * 0.38);
    group.add(board);
  }

  return group;
}

/**
 * Composite 12-part Drivable / Traffic 3D Sports Sedan with glowing headlight beam cones.
 */
export function createCarModel(
  paintIndex: number,
  mats: CityMaterialLibrary,
  castShadow: boolean
): THREE.Group {
  const group = new THREE.Group();
  const paint = mats.carPaints[paintIndex % mats.carPaints.length];

  // Lower chassis body
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.72, 4.6), paint);
  chassis.position.y = 0.68;
  chassis.castShadow = castShadow;
  chassis.receiveShadow = true;
  group.add(chassis);

  // Sculpted hood scoop accent
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.14, 1.4), paint);
  hood.position.set(0, 1.08, -1.25);
  group.add(hood);

  // Cabin greenhouse
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.62, 2.35), mats.carGlass);
  cabin.position.set(0, 1.3, 0.12);
  cabin.castShadow = castShadow;
  group.add(cabin);

  // Roof cap
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.1, 2.05), paint);
  roof.position.set(0, 1.62, 0.14);
  group.add(roof);

  // Front & rear bumpers
  const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.28, 0.25), mats.carTrim);
  frontBumper.position.set(0, 0.44, -2.32);
  const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.28, 0.25), mats.carTrim);
  rearBumper.position.set(0, 0.44, 2.32);
  group.add(frontBumper, rearBumper);

  // Spoiler on rear
  const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.96, 0.08, 0.34), mats.carTrim);
  spoiler.position.set(0, 1.18, 2.08);
  group.add(spoiler);

  // Headlights (-Z front) & Taillights (+Z rear)
  const lightGeo = new THREE.BoxGeometry(0.46, 0.18, 0.08);
  [-0.72, 0.72].forEach((x) => {
    const hl = new THREE.Mesh(lightGeo, mats.headlight);
    hl.position.set(x, 0.76, -2.31);
    const tl = new THREE.Mesh(lightGeo, mats.taillight);
    tl.position.set(x, 0.78, 2.31);
    group.add(hl, tl);
  });

  // 4 Wheels with metallic rims (low poly for smooth Android 4 performance)
  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.28, 8);
  wheelGeo.rotateZ(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.3, 6);
  rimGeo.rotateZ(Math.PI / 2);

  const wheelCoords = [
    [-1.08, 0.38, -1.42],
    [1.08, 0.38, -1.42],
    [-1.08, 0.38, 1.42],
    [1.08, 0.38, 1.42],
  ];
  wheelCoords.forEach(([wx, wy, wz]) => {
    const tire = new THREE.Mesh(wheelGeo, mats.tireRubber);
    tire.position.set(wx, wy, wz);
    const rim = new THREE.Mesh(rimGeo, mats.gunMetal);
    rim.position.set(wx, wy, wz);
    group.add(tire, rim);
  });

  return group;
}

export interface NpcModelRig {
  root: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
}

/**
 * Composite 8-part NPC (Civilian, Syndicate Enforcer, or Armored Boss).
 */
export function createNpcModel(
  role: 'civilian' | 'syndicate' | 'boss',
  variant: number,
  mats: CityMaterialLibrary
): NpcModelRig {
  const root = new THREE.Group();
  const scale = role === 'boss' ? 1.38 : 1.0;
  root.scale.setScalar(scale);

  const torsoMat =
    role === 'boss'
      ? mats.bossArmor
      : role === 'syndicate'
        ? mats.syndicateArmor
        : mats.npcCivilianClothes[variant % mats.npcCivilianClothes.length];

  const makeLeg = (x: number) => {
    const g = new THREE.Group();
    g.position.set(x, 0.76, 0);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.76, 0.24), mats.carTrim);
    mesh.position.y = -0.38;
    mesh.castShadow = true;
    g.add(mesh);
    return g;
  };
  const leftLeg = makeLeg(-0.16);
  const rightLeg = makeLeg(0.16);
  root.add(leftLeg, rightLeg);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.68, 0.32), torsoMat);
  torso.position.y = 1.1;
  torso.castShadow = true;
  root.add(torso);

  if (role === 'boss') {
    const chestGold = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.32, 0.38), mats.bossGold);
    chestGold.position.y = 1.22;
    root.add(chestGold);

    // Tall golden mission beacon above the Boss so player can find them in the infinite city
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.65, 55, 10, 1, true), beamMat);
    beam.position.y = 28;
    root.add(beam);
  }

  const makeArm = (x: number, holdingGun: boolean) => {
    const g = new THREE.Group();
    g.position.set(x, 1.38, 0);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.6, 0.2), torsoMat);
    arm.position.y = -0.28;
    g.add(arm);
    if (holdingGun) {
      const gun = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 0.56), mats.gunDark);
      gun.position.set(0, -0.42, 0.28);
      g.add(gun);
    }
    return g;
  };
  const leftArm = makeArm(-0.38, false);
  const rightArm = makeArm(0.38, role !== 'civilian');
  root.add(leftArm, rightArm);

  // Head
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.36, 0.38, 0.36),
    role === 'civilian' ? mats.npcSkin : torsoMat
  );
  head.position.y = 1.66;
  head.castShadow = true;
  root.add(head);

  if (role !== 'civilian') {
    const visor = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.14, 0.1),
      role === 'boss' ? mats.bossGold : mats.syndicateVisor
    );
    visor.position.set(0, 1.68, 0.16);
    root.add(visor);
  }

  return { root, leftLeg, rightLeg, leftArm, rightArm };
}

/**
 * Composite 7-part 3D Weapon Craft Table placed in city plazas.
 */
export function createCraftTableModel(mats: CityMaterialLibrary): THREE.Group {
  const group = new THREE.Group();

  const top = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.16, 1.3), mats.craftWood);
  top.position.y = 1.02;
  top.castShadow = true;
  top.receiveShadow = true;
  group.add(top);

  const legGeo = new THREE.BoxGeometry(0.14, 1.0, 0.14);
  [
    [-1.15, -0.52],
    [1.15, -0.52],
    [-1.15, 0.52],
    [1.15, 0.52],
  ].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(legGeo, mats.gunDark);
    leg.position.set(lx, 0.5, lz);
    group.add(leg);
  });

  // Back tool rack & glowing holographic weapon blueprint screen
  const rack = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.1, 0.12), mats.gunDark);
  rack.position.set(0, 1.6, -0.58);
  group.add(rack);

  const holo = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.72, 0.06), mats.craftHolo);
  holo.position.set(0, 1.64, -0.49);
  group.add(holo);

  // Vice / Anvil prop on workbench
  const vice = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.24, 0.34), mats.gunMetal);
  vice.position.set(-0.7, 1.22, 0.1);
  group.add(vice);

  // Vertical Cyan Beacon so player can spot Craft Tables down the street
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.2,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.32, 16, 8, 1, true), beamMat);
  beam.position.y = 8;
  group.add(beam);

  return group;
}

/**
 * Composite 4-part Glowing Street Supply Crate.
 */
export function createLootCrateModel(mats: CityMaterialLibrary): THREE.Group {
  const group = new THREE.Group();
  const visual = new THREE.Group();
  visual.name = 'visual';
  group.add(visual);

  const box = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.75, 0.8), mats.crateBody);
  box.position.y = 0.42;
  box.castShadow = true;
  visual.add(box);

  const lid = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.14, 0.86), mats.gunDark);
  lid.position.y = 0.82;
  visual.add(lid);

  const strip = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.12, 0.24), mats.neonAmber);
  strip.position.y = 0.46;
  visual.add(strip);

  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xfbbf24,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.26, 12, 8, 1, true), beamMat);
  beam.position.y = 6;
  group.add(beam);

  return group;
}

/**
 * Composite First-Person 3D Gun Viewmodels (Pistol, SMG, Shotgun, Rail Carbine).
 */
export function createFirstPersonGun(
  weapon: WeaponId,
  mats: CityMaterialLibrary
): { group: THREE.Group; flash: THREE.Mesh } {
  const group = new THREE.Group();

  if (weapon === 'pistol') {
    const slide = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, 0.28), mats.gunMetal);
    slide.position.set(0, 0.04, -0.08);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.05, 0.24), mats.gunDark);
    frame.position.set(0, -0.01, -0.06);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.16, 0.08), mats.gunDark);
    grip.position.set(0, -0.09, 0.03);
    grip.rotation.x = 0.25;
    const sight = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.018, 0.02), mats.neonCyan);
    sight.position.set(0, 0.08, -0.2);
    group.add(slide, frame, grip, sight);
  } else if (weapon === 'smg') {
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.11, 0.42), mats.gunDark);
    receiver.position.set(0, 0.02, -0.14);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.22, 8), mats.gunMetal);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.03, -0.42);
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.24, 0.06), mats.gunMetal);
    mag.position.set(0, -0.12, -0.18);
    mag.rotation.x = -0.15;
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.025, 0.26), mats.neonCyan);
    rail.position.set(0, 0.085, -0.14);
    group.add(receiver, barrel, mag, rail);
  } else if (weapon === 'shotgun') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.11, 0.36), mats.gunDark);
    body.position.set(0, 0.01, -0.08);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.52, 10), mats.gunMetal);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.045, -0.42);
    const pump = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.075, 0.22), mats.craftWood);
    pump.position.set(0, -0.01, -0.36);
    const accent = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.03, 0.14), mats.neonAmber);
    accent.position.set(0, 0.07, -0.1);
    group.add(body, barrel, pump, accent);
  } else {
    // Apex Rail Carbine
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.12, 0.56), mats.bossArmor);
    chassis.position.set(0, 0.02, -0.2);
    const railTop = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.55), mats.bossGold);
    railTop.position.set(0, 0.07, -0.44);
    const railBot = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.55), mats.bossGold);
    railBot.position.set(0, -0.01, -0.44);
    const core = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.45), mats.neonAmber);
    core.position.set(0, 0.03, -0.42);
    const scope = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.18), mats.gunMetal);
    scope.position.set(0, 0.11, -0.16);
    group.add(chassis, railTop, railBot, core, scope);
  }

  const flash = new THREE.Mesh(new THREE.OctahedronGeometry(0.085, 0), mats.muzzleFlash);
  flash.position.set(0, 0.04, weapon === 'pistol' ? -0.28 : -0.68);
  flash.visible = false;
  group.add(flash);

  return { group, flash };
}

/**
 * Composite 3D Alpine Mountain with rocky base, secondary ridge peak, and snow cap (low poly for Android 4+).
 */
export function createMountainModel(
  radius: number,
  height: number,
  mats: CityMaterialLibrary
): THREE.Group {
  const group = new THREE.Group();

  // Main rocky cone
  const mainPeak = new THREE.Mesh(
    new THREE.ConeGeometry(radius, height, 6),
    mats.mountainRock
  );
  mainPeak.position.y = height * 0.5;
  group.add(mainPeak);

  // Snow-capped summit
  const snowH = height * 0.34;
  const snowR = radius * 0.36;
  const snow = new THREE.Mesh(new THREE.ConeGeometry(snowR, snowH, 6), mats.snowCap);
  snow.position.y = height - snowH * 0.48;
  group.add(snow);

  // Secondary shoulder peak
  const sidePeak = new THREE.Mesh(
    new THREE.ConeGeometry(radius * 0.62, height * 0.62, 5),
    mats.mountainRock
  );
  sidePeak.position.set(radius * 0.48, height * 0.31, radius * 0.22);
  group.add(sidePeak);

  return group;
}

/**
 * Composite Stepped Sandstone Mesa for Golden Desert biome.
 */
export function createDesertMesaModel(
  width: number,
  height: number,
  depth: number,
  mats: CityMaterialLibrary
): THREE.Group {
  const group = new THREE.Group();

  const base = new THREE.Mesh(new THREE.BoxGeometry(width, height * 0.58, depth), mats.mesaRock);
  base.position.y = height * 0.29;
  group.add(base);

  const top = new THREE.Mesh(
    new THREE.BoxGeometry(width * 0.72, height * 0.46, depth * 0.72),
    mats.mesaRock
  );
  top.position.set(width * 0.05, height * 0.78, -depth * 0.04);
  group.add(top);

  return group;
}

/**
 * Composite 3-part Saguaro Cactus for Golden Desert biome.
 */
export function createCactusModel(mats: CityMaterialLibrary): THREE.Group {
  const group = new THREE.Group();

  const trunk = new THREE.Mesh(new THREE.BoxGeometry(0.46, 3.4, 0.46), mats.cactusGreen);
  trunk.position.y = 1.7;
  group.add(trunk);

  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.32, 1.25, 0.32), mats.cactusGreen);
  armL.position.set(-0.56, 2.25, 0);
  const armLJoin = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.3, 0.3), mats.cactusGreen);
  armLJoin.position.set(-0.34, 1.75, 0);

  const armR = new THREE.Mesh(new THREE.BoxGeometry(0.32, 1.05, 0.32), mats.cactusGreen);
  armR.position.set(0.56, 2.55, 0);
  const armRJoin = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.3, 0.3), mats.cactusGreen);
  armRJoin.position.set(0.34, 2.15, 0);

  group.add(armL, armLJoin, armR, armRJoin);
  return group;
}

/**
 * Composite 2-tier Tree for Green Plains & River Valley banks.
 */
export function createPlainsTreeModel(mats: CityMaterialLibrary): THREE.Group {
  const group = new THREE.Group();

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.28, 2.8, 6), mats.craftWood);
  trunk.position.y = 1.4;
  group.add(trunk);

  const lower = new THREE.Mesh(new THREE.ConeGeometry(2.1, 3.2, 6), mats.foliageMat);
  lower.position.y = 3.7;
  group.add(lower);

  const upper = new THREE.Mesh(new THREE.ConeGeometry(1.45, 2.5, 6), mats.foliageMat);
  upper.position.y = 5.4;
  group.add(upper);

  return group;
}

