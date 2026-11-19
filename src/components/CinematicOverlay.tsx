import React from 'react';
import { FastForward } from 'lucide-react';

interface CinematicOverlayProps {
  headline: string;
  subtitle: string;
  onSkip: () => void;
}

export const CinematicOverlay: React.FC<CinematicOverlayProps> = ({
  headline,
  subtitle,
  onSkip,
}) => {
  return (
    <div
      className="fixed inset-0 z-30 flex flex-col justify-between pointer-events-auto cursor-pointer"
      onClick={onSkip}
    >
      {/* Top Cinema Letterbox Bar */}
      <div className="w-full h-[12vh] min-h-[54px] bg-black flex items-center justify-between px-5 sm:px-8">
        <span className="font-display font-bold text-xs sm:text-sm tracking-[0.22em] text-amber-400">
          {headline}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSkip();
          }}
          className="min-h-[36px] px-3 py-1 rounded bg-stone-900 hover:bg-stone-800 border border-white/15 text-stone-200 text-xs font-medium flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
        >
          <FastForward className="w-3.5 h-3.5 text-amber-400" />
          <span>Skip</span>
        </button>
      </div>

      {/* Bottom Cinema Letterbox Bar with Story Subtitle */}
      <div className="w-full min-h-[14vh] bg-black flex items-center justify-center px-6 py-4">
        <p className="max-w-2xl text-center text-stone-100 text-sm sm:text-base font-medium leading-relaxed">
          {subtitle}
        </p>
      </div>
    </div>
  );
};
