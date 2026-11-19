import React, { useRef, useState } from 'react';
import { ArrowUp, Car, Crosshair, Hammer, RotateCcw } from 'lucide-react';

interface TouchControlsProps {
  isInCar: boolean;
  nearCar: boolean;
  nearCraftTable: boolean;
  onMove: (nx: number, nz: number, sprint: boolean) => void;
  onLookDelta: (dx: number, dy: number) => void;
  onFireChange: (active: boolean) => void;
  onJump: () => void;
  onReload: () => void;
  onToggleCar: () => void;
  onOpenCraft: () => void;
}

const STICK_RADIUS = 44;

export const TouchControls: React.FC<TouchControlsProps> = ({
  isInCar,
  nearCar,
  nearCraftTable,
  onMove,
  onLookDelta,
  onFireChange,
  onJump,
  onReload,
  onToggleCar,
  onOpenCraft,
}) => {
  const stickPointerId = useRef<number | null>(null);
  const stickCenter = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [knobOffset, setKnobOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isSprinting, setIsSprinting] = useState(false);

  const lookPointerId = useRef<number | null>(null);
  const lastLookPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleStickDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (stickPointerId.current !== null) return;
    stickPointerId.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = e.currentTarget.getBoundingClientRect();
    stickCenter.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
    updateStick(e.clientX, e.clientY);
  };

  const handleStickMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== stickPointerId.current) return;
    e.stopPropagation();
    updateStick(e.clientX, e.clientY);
  };

  const handleStickUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== stickPointerId.current) return;
    e.stopPropagation();
    stickPointerId.current = null;
    setKnobOffset({ x: 0, y: 0 });
    setIsSprinting(false);
    onMove(0, 0, false);
  };

  const updateStick = (clientX: number, clientY: number) => {
    const dx = clientX - stickCenter.current.x;
    const dy = clientY - stickCenter.current.y;
    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(dist, STICK_RADIUS);
    const angle = Math.atan2(dy, dx);
    const ox = Math.cos(angle) * clampedDist;
    const oy = Math.sin(angle) * clampedDist;

    setKnobOffset({ x: ox, y: oy });
    const nx = ox / STICK_RADIUS;
    const nz = -oy / STICK_RADIUS;
    const sprint = dist > STICK_RADIUS * 0.85;
    setIsSprinting(sprint);
    onMove(nx, nz, sprint);
  };

  const handleLookDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (lookPointerId.current !== null) return;
    lookPointerId.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    lastLookPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleLookMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== lookPointerId.current) return;
    const dx = e.clientX - lastLookPos.current.x;
    const dy = e.clientY - lastLookPos.current.y;
    lastLookPos.current = { x: e.clientX, y: e.clientY };
    onLookDelta(dx * 1.2, dy * 1.2);
  };

  const handleLookUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== lookPointerId.current) return;
    lookPointerId.current = null;
  };

  return (
    <>
      {/* Full-viewport swipe-to-look capture layer */}
      <div
        className="fixed inset-0 z-[5] touch-none"
        onPointerDown={handleLookDown}
        onPointerMove={handleLookMove}
        onPointerUp={handleLookUp}
        onPointerCancel={handleLookUp}
      />

      {/* Bottom-Left: Virtual Analog Movement / Steering Stick */}
      <div className="fixed left-4 bottom-20 sm:bottom-24 z-20 pointer-events-auto touch-none select-none">
        <div
          onPointerDown={handleStickDown}
          onPointerMove={handleStickMove}
          onPointerUp={handleStickUp}
          onPointerCancel={handleStickUp}
          className={`relative w-[112px] h-[112px] rounded-full border-2 flex items-center justify-center transition-colors ${
            isSprinting
              ? 'bg-[#0f1219]/72 border-amber-400/80'
              : 'bg-[#0f1219]/58 border-white/25'
          }`}
        >
          <div className="w-6 h-[1px] bg-white/15 pointer-events-none" />
          <div className="absolute h-6 w-[1px] bg-white/15 pointer-events-none" />
          <div
            className={`absolute w-11 h-11 rounded-full border shadow-md pointer-events-none ${
              isSprinting ? 'bg-amber-400 border-amber-100' : 'bg-stone-200/90 border-white'
            }`}
            style={{ transform: `translate3d(${knobOffset.x}px, ${knobOffset.y}px, 0)` }}
          />
        </div>
        <div className="text-center text-[10px] text-stone-300/85 mt-1 font-semibold tracking-wide pointer-events-none">
          {isInCar ? 'STEER / GAS' : isSprinting ? 'SPRINT' : 'MOVE'}
        </div>
      </div>

      {/* Bottom-Right: Adaptive Thumb Action Cluster (Works in Portrait & Landscape) */}
      <div className="fixed right-4 bottom-20 sm:bottom-24 z-20 pointer-events-auto touch-none select-none flex flex-col items-end gap-2">
        {/* Contextual Row: Drive Car + Craft Table */}
        <div className="flex items-center gap-2">
          {(nearCar || isInCar) && (
            <button
              type="button"
              onPointerDown={(e) => {
                e.stopPropagation();
                onToggleCar();
              }}
              aria-label={isInCar ? 'Exit car' : 'Drive car'}
              className="h-12 px-3.5 rounded-full bg-sky-500 active:bg-sky-400 border border-sky-200/70 text-stone-950 font-bold text-xs flex items-center gap-1.5 shadow-lg cursor-pointer"
            >
              <Car className="w-4 h-4" />
              <span>{isInCar ? 'EXIT CAR' : 'DRIVE'}</span>
            </button>
          )}

          {!isInCar && (
            <button
              type="button"
              onPointerDown={(e) => {
                e.stopPropagation();
                onOpenCraft();
              }}
              aria-label="Open Craft Table"
              className={`h-12 px-3 rounded-full border flex items-center gap-1.5 text-xs font-bold cursor-pointer ${
                nearCraftTable
                  ? 'bg-amber-500 border-amber-200 text-stone-950 shadow-lg'
                  : 'bg-[#0f1219]/82 border-white/20 text-stone-100'
              }`}
            >
              <Hammer className="w-4 h-4" />
              <span>CRAFT</span>
            </button>
          )}
        </div>

        {/* Combat & Movement Row */}
        {!isInCar && (
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onPointerDown={(e) => {
                e.stopPropagation();
                onReload();
              }}
              aria-label="Reload weapon"
              className="w-12 h-12 rounded-full bg-[#0f1219]/85 active:bg-stone-700 border border-white/20 text-stone-200 flex flex-col items-center justify-center cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="text-[9px] font-semibold">RLD</span>
            </button>

            <button
              type="button"
              onPointerDown={(e) => {
                e.stopPropagation();
                onJump();
              }}
              aria-label="Jump"
              className="w-13 h-13 rounded-full bg-[#0f1219]/85 active:bg-stone-700 border border-white/25 text-stone-100 flex flex-col items-center justify-center cursor-pointer"
            >
              <ArrowUp className="w-4 h-4" />
              <span className="text-[9px] font-bold">JUMP</span>
            </button>

            <button
              type="button"
              onPointerDown={(e) => {
                e.stopPropagation();
                e.currentTarget.setPointerCapture(e.pointerId);
                onFireChange(true);
              }}
              onPointerUp={(e) => {
                e.stopPropagation();
                onFireChange(false);
              }}
              onPointerCancel={(e) => {
                e.stopPropagation();
                onFireChange(false);
              }}
              aria-label="Fire weapon"
              className="w-16 h-16 rounded-full bg-red-600/95 active:bg-red-500 border-2 border-red-300/80 text-white flex flex-col items-center justify-center shadow-lg cursor-pointer"
            >
              <Crosshair className="w-6 h-6" />
              <span className="text-[10px] font-bold mt-0.5">FIRE</span>
            </button>
          </div>
        )}
      </div>
    </>
  );
};
