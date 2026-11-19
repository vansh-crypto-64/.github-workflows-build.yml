import React from 'react';
import {
  Cloud,
  CloudRain,
  Compass,
  Gamepad2,
  Pause,
  Sun,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { HudSnapshot, WEAPON_LIST, WeaponId } from '../game/types';

interface HudOverlayProps {
  hud: HudSnapshot;
  muted: boolean;
  touchEnabled: boolean;
  gyroEnabled: boolean;
  onToggleTouch: () => void;
  onToggleGyro: () => void;
  onToggleMute: () => void;
  onPause: () => void;
  onEquipWeapon: (id: WeaponId) => void;
}

export const HudOverlay: React.FC<HudOverlayProps> = ({
  hud,
  muted,
  touchEnabled,
  gyroEnabled,
  onToggleTouch,
  onToggleGyro,
  onToggleMute,
  onPause,
  onEquipWeapon,
}) => {
  const hpPct = Math.max(0, Math.min(100, (hud.health / hud.maxHealth) * 100));
  const armorPct = Math.max(0, Math.min(100, hud.armor));

  return (
    <>
      {/* First-Person Center Crosshair + Hit Marker */}
      {!hud.isInCar && (
        <div className="fixed inset-0 z-10 pointer-events-none flex items-center justify-center">
          <div className="relative flex items-center justify-center">
            <div className="w-4 h-[2px] bg-white/90 rounded-full" />
            <div className="absolute h-4 w-[2px] bg-white/90 rounded-full" />
            <div className="absolute w-1 h-1 rounded-full bg-black/60" />
            {hud.hitMarker && (
              <>
                <div className="absolute w-5 h-[2px] bg-amber-400 rotate-45" />
                <div className="absolute w-5 h-[2px] bg-amber-400 -rotate-45" />
              </>
            )}
          </div>
        </div>
      )}

      {/* Perimeter HUD — Portrait & Landscape Responsive */}
      <div className="fixed inset-0 z-15 pointer-events-none flex flex-col justify-between p-2.5 sm:p-4">
        {/* TOP ROW */}
        <div className="flex items-start justify-between gap-2">
          {/* Top-Left: Story Mission Tracker & Zero-to-High Level Rank */}
          <div className="bg-[#0d1118]/88 border border-white/12 rounded-lg px-3 py-2 max-w-[230px] sm:max-w-[300px]">
            <div className="flex items-center justify-between gap-2 text-[11px] text-amber-400 font-semibold">
              <span className="truncate">{hud.chapterTitle}</span>
              <span className="font-mono-tabular text-stone-300 shrink-0">
                LVL {hud.level}
              </span>
            </div>
            <div className="text-[11px] sm:text-xs text-stone-200 leading-snug mt-0.5">
              {hud.objectiveText}
            </div>
            <div className="flex items-center justify-between gap-2 mt-1.5 pt-1.5 border-t border-white/10 text-[11px] font-mono-tabular">
              <span className="text-stone-400">{hud.rank}</span>
              <span className="text-sky-400 font-bold">{hud.objectiveProgress}</span>
            </div>
          </div>

          {/* Top-Center Toast */}
          <div className="hidden md:flex flex-col items-center max-w-sm">
            {hud.toastMessage && (
              <div className="bg-[#0d1118]/92 border border-amber-500/35 text-stone-100 text-xs font-medium px-3.5 py-2 rounded-lg text-center">
                {hud.toastMessage}
              </div>
            )}
          </div>

          {/* Top-Right: Day/Time/Weather + Health/Armor + Utility Buttons */}
          <div className="pointer-events-auto flex items-start gap-1.5">
            <div className="bg-[#0d1118]/88 border border-white/12 rounded-lg px-3 py-2 text-right min-w-[120px]">
              <div className="flex items-center justify-end gap-1.5 text-[11px] text-stone-300 font-mono-tabular">
                {hud.weather === 'rain' ? (
                  <CloudRain className="w-3.5 h-3.5 text-sky-400" />
                ) : hud.weather === 'cloudy' ? (
                  <Cloud className="w-3.5 h-3.5 text-stone-400" />
                ) : (
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span>D{hud.dayCount} · {hud.timeOfDayLabel}</span>
              </div>

              {/* Health Bar */}
              <div className="mt-1.5 flex items-center justify-end gap-1.5">
                <span className="text-[10px] text-stone-400 font-mono-tabular">HP {hud.health}</span>
                <div className="w-16 h-1.5 bg-stone-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full origin-left ${hpPct < 35 ? 'bg-red-500' : 'bg-emerald-400'}`}
                    style={{ transform: `scaleX(${hpPct / 100})` }}
                  />
                </div>
              </div>

              {/* Armor Bar */}
              <div className="mt-1 flex items-center justify-end gap-1.5">
                <span className="text-[10px] text-sky-400 font-mono-tabular">AR {hud.armor}</span>
                <div className="w-16 h-1 bg-stone-800 rounded-full overflow-hidden">
                  <div
                    className="h-full origin-left bg-sky-400"
                    style={{ transform: `scaleX(${armorPct / 100})` }}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={onPause}
                aria-label="Pause"
                className="w-10 h-10 flex items-center justify-center rounded-lg bg-[#0d1118]/88 border border-white/12 text-stone-100 cursor-pointer"
              >
                <Pause className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onToggleMute}
                aria-label="Mute toggle"
                className="w-10 h-10 flex items-center justify-center rounded-lg bg-[#0d1118]/88 border border-white/12 text-stone-100 cursor-pointer"
              >
                {muted ? <VolumeX className="w-4 h-4 text-stone-500" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={onToggleGyro}
                title="Toggle Mobile Gyroscope Rotation Look"
                aria-label="Toggle gyro look"
                className={`w-10 h-10 flex items-center justify-center rounded-lg border cursor-pointer ${
                  gyroEnabled
                    ? 'bg-sky-500/25 border-sky-400 text-sky-300'
                    : 'bg-[#0d1118]/88 border-white/12 text-stone-400'
                }`}
              >
                <Compass className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onToggleTouch}
                title="Toggle Mobile Touch Controls"
                aria-label="Toggle touch controls"
                className={`w-10 h-10 flex items-center justify-center rounded-lg border cursor-pointer ${
                  touchEnabled
                    ? 'bg-amber-500/20 border-amber-400/60 text-amber-300'
                    : 'bg-[#0d1118]/88 border-white/12 text-stone-400'
                }`}
              >
                <Gamepad2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* BOTTOM COMPACT BAR (Weapons / Speedometer + Cash & Scrap) */}
        <div className="flex flex-col items-center gap-1.5">
          {hud.toastMessage && (
            <div className="md:hidden bg-[#0d1118]/92 border border-amber-500/35 text-stone-100 text-[11px] font-medium px-3 py-1.5 rounded-lg text-center max-w-[90vw]">
              {hud.toastMessage}
            </div>
          )}

          <div className="pointer-events-auto w-full max-w-[540px] bg-[#0d1118]/92 border border-white/12 rounded-xl px-3 py-2 flex items-center justify-between gap-3">
            {/* Resources */}
            <div className="flex items-center gap-3 text-[11px] sm:text-xs font-mono-tabular shrink-0">
              <span className="text-emerald-400 font-bold">${hud.cash}</span>
              <span className="text-stone-300">Scrap {hud.scrap}</span>
              <span className="text-sky-400">Tech {hud.tech}</span>
            </div>

            {hud.isInCar ? (
              <div className="font-display font-bold text-lg text-amber-400 font-mono-tabular">
                {hud.carSpeedKmh} <span className="text-xs text-stone-400">KM/H</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                {WEAPON_LIST.map((w) => {
                  const unlocked = hud.unlockedWeapons.includes(w.id);
                  const active = hud.equippedWeapon === w.id;
                  return (
                    <button
                      key={w.id}
                      type="button"
                      disabled={!unlocked}
                      onClick={() => onEquipWeapon(w.id)}
                      className={`min-h-[34px] px-2 py-1 rounded text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 ${
                        active
                          ? 'bg-amber-500 text-stone-950 cursor-pointer'
                          : unlocked
                            ? 'bg-stone-800 text-stone-200 hover:bg-stone-700 cursor-pointer'
                            : 'bg-stone-900/60 text-stone-600 cursor-not-allowed'
                      }`}
                    >
                      {w.shortName}
                    </button>
                  );
                })}
                <span className="ml-1 font-mono-tabular text-xs font-bold text-stone-100 whitespace-nowrap">
                  {hud.isReloading ? 'RLD...' : `${hud.ammo}/${hud.maxAmmo}`}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
