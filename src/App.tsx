import { useEffect, useRef, useState } from 'react';
import { CinematicOverlay } from './components/CinematicOverlay';
import { CraftingModal } from './components/CraftingModal';
import { EndModal } from './components/EndModal';
import { HudOverlay } from './components/HudOverlay';
import { TitleOverlay } from './components/TitleOverlay';
import { TouchControls } from './components/TouchControls';
import { InfiniteCityEngine } from './game/engine';
import { HudSnapshot, STORY_CHAPTERS, WeaponId } from './game/types';

const INITIAL_HUD: HudSnapshot = {
  phase: 'title',
  chapterIndex: 0,
  chapterTitle: STORY_CHAPTERS[0].title,
  objectiveText: STORY_CHAPTERS[0].objective,
  objectiveProgress: '0 / 3 Crates',
  level: 1,
  rank: STORY_CHAPTERS[0].rank,
  xp: 0,
  xpToNext: 120,
  health: 100,
  maxHealth: 100,
  armor: 25,
  cash: 40,
  scrap: 2,
  tech: 0,
  equippedWeapon: 'pistol',
  unlockedWeapons: ['pistol'],
  ammo: 12,
  maxAmmo: 12,
  isReloading: false,
  isInCar: false,
  carSpeedKmh: 0,
  nearCar: false,
  nearCraftTable: false,
  timeOfDayLabel: '06:45',
  dayCount: 1,
  weather: 'rain',
  cinematicHeadline: STORY_CHAPTERS[0].cinematicHeadline,
  cinematicSubtitle: STORY_CHAPTERS[0].cinematicSubtitle,
  hitMarker: false,
  kills: 0,
  toastMessage: null,
};

export default function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<InfiniteCityEngine | null>(null);

  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [craftOpen, setCraftOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [touchEnabled, setTouchEnabled] = useState(true);
  const [gyroEnabled, setGyroEnabled] = useState(false);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const engine = new InfiniteCityEngine(container, (snapshot) => {
      setHud(snapshot);
    });
    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (hud.phase !== 'playing') return;
      if (e.code === 'KeyC') {
        e.preventDefault();
        setCraftOpen((open) => !open);
      } else if (e.code === 'Escape' && craftOpen) {
        setCraftOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [hud.phase, craftOpen]);

  const handleStart = () => {
    setCraftOpen(false);
    engineRef.current?.startNewStory();
  };

  const handleToggleMute = () => {
    if (!engineRef.current) return;
    setMuted(engineRef.current.audio.toggleMute());
  };

  const handleToggleGyro = () => {
    if (!engineRef.current) return;
    setGyroEnabled(engineRef.current.toggleGyro());
  };

  const handleCraftWeapon = (id: WeaponId) => {
    engineRef.current?.craftWeapon(id);
  };

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#090c12] touch-none select-none">
      {/* Isolated WebGL Canvas Container */}
      <div ref={mountRef} className="fixed inset-0 w-full h-full" />

      {hud.phase === 'title' && <TitleOverlay onStart={handleStart} />}

      {hud.phase === 'cinematic' && (
        <CinematicOverlay
          headline={hud.cinematicHeadline}
          subtitle={hud.cinematicSubtitle}
          onSkip={() => engineRef.current?.skipCinematic()}
        />
      )}

      {hud.phase === 'playing' && touchEnabled && !craftOpen && (
        <TouchControls
          isInCar={hud.isInCar}
          nearCar={hud.nearCar}
          nearCraftTable={hud.nearCraftTable}
          onMove={(nx, nz, sprint) => engineRef.current?.setVirtualMove(nx, nz, sprint)}
          onLookDelta={(dx, dy) => engineRef.current?.applyLookDelta(dx, dy)}
          onFireChange={(active) => engineRef.current?.setFiring(active)}
          onJump={() => engineRef.current?.triggerJump()}
          onReload={() => engineRef.current?.triggerReload()}
          onToggleCar={() => engineRef.current?.toggleCar()}
          onOpenCraft={() => setCraftOpen(true)}
        />
      )}

      {hud.phase === 'playing' && (
        <HudOverlay
          hud={hud}
          muted={muted}
          touchEnabled={touchEnabled}
          gyroEnabled={gyroEnabled}
          onToggleTouch={() => setTouchEnabled((t) => !t)}
          onToggleGyro={handleToggleGyro}
          onToggleMute={handleToggleMute}
          onPause={() => {
            setCraftOpen(false);
            engineRef.current?.setPaused(true);
          }}
          onEquipWeapon={(id) => engineRef.current?.equipWeapon(id)}
        />
      )}

      {hud.phase === 'playing' && craftOpen && (
        <CraftingModal
          hud={hud}
          onCraftWeapon={handleCraftWeapon}
          onCraftMedkit={() => engineRef.current?.craftMedkit()}
          onClose={() => setCraftOpen(false)}
        />
      )}

      {(hud.phase === 'paused' || hud.phase === 'victory' || hud.phase === 'gameover') && (
        <EndModal
          hud={hud}
          onResume={() => engineRef.current?.setPaused(false)}
          onRestart={handleStart}
          onContinueFreeRoam={() => engineRef.current?.continueFreeRoam()}
        />
      )}
    </main>
  );
}
