import React from 'react';
import { HudSnapshot } from '../game/types';

interface EndModalProps {
  hud: HudSnapshot;
  onResume: () => void;
  onRestart: () => void;
  onContinueFreeRoam: () => void;
}

export const EndModal: React.FC<EndModalProps> = ({
  hud,
  onResume,
  onRestart,
  onContinueFreeRoam,
}) => {
  const isPause = hud.phase === 'paused';
  const isVictory = hud.phase === 'victory';

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-[#070a10]/82">
      <div className="w-full max-w-md bg-[#111520] border border-white/15 rounded-xl p-6 shadow-2xl">
        <div className="text-xs font-mono-tabular text-amber-400 mb-1">
          {isPause
            ? `${hud.rank} · Level ${hud.level}`
            : isVictory
              ? 'Story Complete · Apex Legend'
              : 'Downed in the Streets'}
        </div>

        <h2 className="font-display font-bold text-3xl text-stone-100">
          {isPause ? 'Paused' : isVictory ? 'City Conquered' : 'Wasted'}
        </h2>

        <p className="text-sm text-stone-300 mt-2 leading-relaxed">
          {isPause
            ? 'Catch your breath before diving back into the endless city.'
            : isVictory
              ? 'You rose from Street Outcast to Apex Legend and defeated the Syndicate Boss. Continue in Free Roam to drive, fight, and explore infinitely!'
              : 'The Syndicate got the drop on you. Craft stronger weapons and medkits at any Craft Table and strike back.'}
        </p>

        <div className="grid grid-cols-3 gap-3 my-6 py-4 border-y border-white/10 text-center">
          <div>
            <div className="text-xs text-stone-400">Rank Level</div>
            <div className="font-mono-tabular font-bold text-xl text-amber-400 mt-0.5">
              LVL {hud.level}
            </div>
          </div>
          <div>
            <div className="text-xs text-stone-400">Takedowns</div>
            <div className="font-mono-tabular font-bold text-xl text-stone-100 mt-0.5">
              {hud.kills}
            </div>
          </div>
          <div>
            <div className="text-xs text-stone-400">Cash</div>
            <div className="font-mono-tabular font-bold text-xl text-emerald-400 mt-0.5">
              ${hud.cash}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5">
          {isPause && (
            <button
              type="button"
              onClick={onResume}
              className="flex-1 min-h-[44px] px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-display font-bold text-sm rounded-lg cursor-pointer"
            >
              Resume
            </button>
          )}

          {isVictory && (
            <button
              type="button"
              onClick={onContinueFreeRoam}
              className="flex-1 min-h-[44px] px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-display font-bold text-sm rounded-lg cursor-pointer"
            >
              Free Roam
            </button>
          )}

          <button
            type="button"
            onClick={onRestart}
            className={`flex-1 min-h-[44px] px-4 py-2.5 font-display font-bold text-sm rounded-lg cursor-pointer ${
              !isPause && !isVictory
                ? 'bg-amber-500 hover:bg-amber-400 text-stone-950'
                : 'bg-stone-800 hover:bg-stone-700 text-stone-100'
            }`}
          >
            New Story
          </button>
        </div>
      </div>
    </div>
  );
};
