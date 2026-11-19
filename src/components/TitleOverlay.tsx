import React from 'react';

interface TitleOverlayProps {
  onStart: () => void;
}

export const TitleOverlay: React.FC<TitleOverlayProps> = ({ onStart }) => {
  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-between p-6 sm:p-10 md:p-12 pointer-events-none bg-gradient-to-t from-[#090c12]/92 via-[#090c12]/35 to-[#090c12]/60">
      <div className="flex items-center justify-between text-xs tracking-wide text-stone-300/90">
        <span>Infinite Open-World City</span>
        <span className="font-mono-tabular text-amber-400/95">Zero to Apex Legend</span>
      </div>

      <div className="max-w-xl my-auto">
        {/* Bespoke inline SVG Title Lockup */}
        <svg
          viewBox="0 0 490 96"
          className="w-full max-w-[440px] h-auto mb-5"
          role="img"
          aria-label="Skyline Zero"
        >
          <defs>
            <linearGradient id="skylineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="55%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
          </defs>
          {/* City Skyline Emblem */}
          <rect x="6" y="34" width="11" height="52" fill="#38bdf8" opacity="0.85" />
          <rect x="20" y="14" width="14" height="72" fill="url(#skylineGrad)" />
          <rect x="37" y="26" width="11" height="60" fill="#f59e0b" opacity="0.9" />
          <rect x="4" y="88" width="46" height="4" fill="#fafaf9" opacity="0.8" />

          <text
            x="64"
            y="60"
            fill="#fafaf9"
            fontFamily="Chakra Petch, sans-serif"
            fontWeight="700"
            fontSize="50"
            letterSpacing="2.5"
          >
            SKYLINE
          </text>
          <text
            x="306"
            y="60"
            fill="url(#skylineGrad)"
            fontFamily="Chakra Petch, sans-serif"
            fontWeight="700"
            fontSize="50"
            letterSpacing="2"
          >
            ZERO
          </text>
          <line x1="64" y1="74" x2="466" y2="74" stroke="#38bdf8" strokeOpacity="0.45" strokeWidth="1.5" />
          <text
            x="64"
            y="90"
            fill="#d6d3d1"
            fontFamily="Plus Jakarta Sans, sans-serif"
            fontWeight="500"
            fontSize="11.5"
            letterSpacing="2.1"
          >
            DRIVE · CRAFT GUNS · RISE FROM NOTHING
          </text>
        </svg>

        <p className="text-stone-200/90 text-sm sm:text-base leading-relaxed max-w-md mb-7">
          Step into an endless rain-soaked metropolis in First-Person. Scavenge the streets, forge
          high-caliber weapons at Craft Tables, hijack cars through live traffic, and fight your way
          from Street Outcast to Apex Legend.
        </p>

        <div className="flex items-center gap-4 pointer-events-auto">
          <button
            type="button"
            onClick={onStart}
            className="min-h-[48px] px-7 py-3 bg-amber-500 hover:bg-amber-400 active:translate-y-0.5 text-stone-950 font-display font-bold text-base tracking-wide rounded-lg transition-all cursor-pointer shadow-lg shadow-amber-950/50 whitespace-nowrap shrink-0"
          >
            Start Story
          </button>
          <span className="text-xs text-stone-400 font-mono-tabular hidden sm:inline">
            Portrait & Landscape Ready
          </span>
        </div>
      </div>

      <div className="text-xs text-stone-400 tracking-wide">
        Left Stick / WASD Move & Drive · Swipe / Drag Look · Fire Shoot · Drive Enter Car · Craft Table Guns
      </div>
    </div>
  );
};
