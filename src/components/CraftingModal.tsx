import React from 'react';
import { Check, Hammer, HeartPulse, X } from 'lucide-react';
import { HudSnapshot, WEAPON_LIST, WeaponId } from '../game/types';

interface CraftingModalProps {
  hud: HudSnapshot;
  onCraftWeapon: (id: WeaponId) => void;
  onCraftMedkit: () => void;
  onClose: () => void;
}

export const CraftingModal: React.FC<CraftingModalProps> = ({
  hud,
  onCraftWeapon,
  onCraftMedkit,
  onClose,
}) => {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-4 bg-[#070a10]/80"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#111520] border border-white/15 rounded-xl p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3.5 border-b border-white/10">
          <div>
            <h2 className="font-display font-bold text-xl sm:text-2xl text-stone-100">
              Weapon Craft Table
            </h2>
            <p className="text-xs text-stone-400 mt-0.5">
              Forge street firepower and armor using Scrap, Tech Cores, and Cash.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close craft table"
            className="w-10 h-10 flex items-center justify-center rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Inventory Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 py-3 border-b border-white/10 text-xs font-mono-tabular">
          <div className="flex items-center gap-5">
            <span className="text-emerald-400 font-bold text-sm">Cash: ${hud.cash}</span>
            <span className="text-stone-200 font-bold text-sm">Scrap: {hud.scrap}</span>
            <span className="text-sky-400 font-bold text-sm">Tech: {hud.tech}</span>
          </div>

          <button
            type="button"
            onClick={onCraftMedkit}
            disabled={hud.scrap < 2 && hud.cash < 30}
            className={`min-h-[38px] px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 whitespace-nowrap ${
              hud.scrap >= 2 || hud.cash >= 30
                ? 'bg-emerald-500 hover:bg-emerald-400 text-stone-950 cursor-pointer'
                : 'bg-stone-800 text-stone-500 cursor-not-allowed'
            }`}
          >
            <HeartPulse className="w-4 h-4" />
            <span>Medkit + Armor (2 Scrap / $30)</span>
          </button>
        </div>

        {/* Guns Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          {WEAPON_LIST.map((w) => {
            const owned = hud.unlockedWeapons.includes(w.id);
            const equipped = hud.equippedWeapon === w.id;
            const affordable =
              hud.scrap >= w.craftScrap && hud.tech >= w.craftTech && hud.cash >= w.craftCash;

            return (
              <div
                key={w.id}
                className="flex flex-col justify-between p-4 rounded-lg bg-[#171d2c] border border-white/10"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-xs shrink-0"
                        style={{ backgroundColor: w.color }}
                      />
                      <h3 className="font-semibold text-sm text-stone-100">{w.name}</h3>
                    </div>
                    <span className="text-[11px] font-mono-tabular text-stone-400">
                      DMG {w.damage}
                      {w.pellets > 1 ? `×${w.pellets}` : ''}
                    </span>
                  </div>
                  <p className="text-xs text-stone-400 mt-1.5 leading-relaxed">{w.description}</p>
                </div>

                <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-white/8">
                  <div className="flex flex-wrap items-center gap-2.5 text-[11px] font-mono-tabular">
                    {owned ? (
                      <span className="text-emerald-400">Unlocked</span>
                    ) : (
                      <>
                        <span className={hud.scrap >= w.craftScrap ? 'text-stone-200' : 'text-red-400'}>
                          {w.craftScrap} Scrap
                        </span>
                        <span className={hud.tech >= w.craftTech ? 'text-sky-300' : 'text-red-400'}>
                          {w.craftTech} Tech
                        </span>
                        <span className={hud.cash >= w.craftCash ? 'text-emerald-300' : 'text-red-400'}>
                          ${w.craftCash}
                        </span>
                      </>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={!owned && !affordable}
                    onClick={() => onCraftWeapon(w.id)}
                    className={`min-h-[36px] px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                      equipped
                        ? 'bg-stone-700 text-stone-200 cursor-default'
                        : owned
                          ? 'bg-sky-500 hover:bg-sky-400 text-stone-950 cursor-pointer'
                          : affordable
                            ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 cursor-pointer'
                            : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                    }`}
                  >
                    {equipped ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Equipped</span>
                      </>
                    ) : owned ? (
                      <span>Equip</span>
                    ) : (
                      <>
                        <Hammer className="w-3.5 h-3.5" />
                        <span>Craft</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
