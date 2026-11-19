export type GamePhase = 'title' | 'cinematic' | 'playing' | 'paused' | 'victory' | 'gameover';

export type WeaponId = 'pistol' | 'smg' | 'shotgun' | 'railgun';

export type WeatherState = 'clear' | 'cloudy' | 'rain';

export interface WeaponDef {
  id: WeaponId;
  name: string;
  shortName: string;
  damage: number;
  fireRate: number; // shots per second
  range: number;
  spread: number;
  pellets: number;
  magSize: number;
  color: string;
  craftScrap: number;
  craftTech: number;
  craftCash: number;
  description: string;
}

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  pistol: {
    id: 'pistol',
    name: '9mm Street Pistol',
    shortName: 'Pistol',
    damage: 26,
    fireRate: 3.2,
    range: 46,
    spread: 0.014,
    pellets: 1,
    magSize: 12,
    color: '#cbd5e1',
    craftScrap: 0,
    craftTech: 0,
    craftCash: 0,
    description: 'Reliable sidearm. Accurate semi-auto shots.',
  },
  smg: {
    id: 'smg',
    name: 'Viper SMG',
    shortName: 'SMG',
    damage: 17,
    fireRate: 9.5,
    range: 42,
    spread: 0.032,
    pellets: 1,
    magSize: 28,
    color: '#38bdf8',
    craftScrap: 4,
    craftTech: 1,
    craftCash: 60,
    description: 'High-RPM street submachine gun for fast gunfights.',
  },
  shotgun: {
    id: 'shotgun',
    name: 'Breacher Shotgun',
    shortName: 'Shotgun',
    damage: 16,
    fireRate: 1.4,
    range: 26,
    spread: 0.068,
    pellets: 6,
    magSize: 6,
    color: '#f97316',
    craftScrap: 6,
    craftTech: 2,
    craftCash: 120,
    description: 'Devastating 6-pellet spread blast at close range.',
  },
  railgun: {
    id: 'railgun',
    name: 'Apex Rail Carbine',
    shortName: 'Railgun',
    damage: 85,
    fireRate: 1.8,
    range: 90,
    spread: 0.004,
    pellets: 1,
    magSize: 8,
    color: '#f59e0b',
    craftScrap: 10,
    craftTech: 5,
    craftCash: 240,
    description: 'High-velocity electromagnetic rifle built to topple bosses.',
  },
};

export const WEAPON_LIST: WeaponDef[] = [
  WEAPONS.pistol,
  WEAPONS.smg,
  WEAPONS.shotgun,
  WEAPONS.railgun,
];

export interface StoryChapter {
  index: number; // 0..4
  level: number;
  rank: string;
  title: string;
  objective: string;
  cinematicHeadline: string;
  cinematicSubtitle: string;
}

export const STORY_CHAPTERS: StoryChapter[] = [
  {
    index: 0,
    level: 1,
    rank: 'Street Outcast',
    title: 'Chapter 1: Rock Bottom',
    objective: 'Scavenge 3 glowing supply crates in the city streets',
    cinematicHeadline: 'CHAPTER 01 · ROCK BOTTOM',
    cinematicSubtitle:
      'Exiled with nothing but a worn 9mm. Scavenge scrap from the rain-slick avenues to start your climb.',
  },
  {
    index: 1,
    level: 2,
    rank: 'Alley Runner',
    title: 'Chapter 2: First Iron',
    objective: 'Use a Craft Table (or Craft button) to forge the Viper SMG',
    cinematicHeadline: 'CHAPTER 02 · FIRST IRON',
    cinematicSubtitle:
      'Scrap is power in this endless city. Hit a Craft Table and forge real firepower.',
  },
  {
    index: 2,
    level: 3,
    rank: 'Night Wheelman',
    title: 'Chapter 3: Own the Streets',
    objective: 'Enter any city car and drive 120m across the avenues',
    cinematicHeadline: 'CHAPTER 03 · OWN THE STREETS',
    cinematicSubtitle:
      'Walking is for survivors. Take a car, tear through traffic, and claim the highway.',
  },
  {
    index: 3,
    level: 4,
    rank: 'District Enforcer',
    title: 'Chapter 4: Syndicate Takedown',
    objective: 'Eliminate 5 Syndicate Enforcers patrolling the city blocks',
    cinematicHeadline: 'CHAPTER 04 · SYNDICATE TAKEDOWN',
    cinematicSubtitle:
      'The Syndicate owns these towers. Break their patrols and take their tech cores.',
  },
  {
    index: 4,
    level: 5,
    rank: 'Apex Legend',
    title: 'Chapter 5: Crown of the Skyline',
    objective: 'Defeat the Armored Syndicate Boss marked by the golden beacon',
    cinematicHeadline: 'FINAL CHAPTER · CROWN OF THE SKYLINE',
    cinematicSubtitle:
      'From zero to the top of the skyline. Bring down the Syndicate Boss and rule the infinite city.',
  },
];

export interface HudSnapshot {
  phase: GamePhase;
  chapterIndex: number;
  chapterTitle: string;
  objectiveText: string;
  objectiveProgress: string;
  level: number;
  rank: string;
  xp: number;
  xpToNext: number;
  health: number;
  maxHealth: number;
  armor: number;
  cash: number;
  scrap: number;
  tech: number;
  equippedWeapon: WeaponId;
  unlockedWeapons: WeaponId[];
  ammo: number;
  maxAmmo: number;
  isReloading: boolean;
  isInCar: boolean;
  carSpeedKmh: number;
  nearCar: boolean;
  nearCraftTable: boolean;
  timeOfDayLabel: string;
  dayCount: number;
  weather: WeatherState;
  cinematicHeadline: string;
  cinematicSubtitle: string;
  hitMarker: boolean;
  kills: number;
  toastMessage: string | null;
}
