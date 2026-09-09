import React, { useEffect, useState } from 'react';
import type { RouteOption, RouteLeg } from '../../algorithms/types';
import {
  Navigation,
  Train,
  Car,
  Bus,
  Footprints,
  X,
  ChevronRight,
  ChevronLeft,
  Clock,
} from 'lucide-react';

interface TurnByTurnNavOverlayProps {
  route: RouteOption | null;
  isOpen: boolean;
  onClose: () => void;
  simulationProgress?: number; // 0 to 1
}

export const TurnByTurnNavOverlay: React.FC<TurnByTurnNavOverlayProps> = ({
  route,
  isOpen,
  onClose,
  simulationProgress = 0,
}) => {
  const [currentLegIndex, setCurrentLegIndex] = useState<number>(0);

  // Sync current leg with simulation progress if active
  useEffect(() => {
    if (!route || !route.legs || route.legs.length === 0) return;
    const legIdx = Math.min(
      Math.floor(simulationProgress * route.legs.length),
      route.legs.length - 1
    );
    if (legIdx !== currentLegIndex) {
      setCurrentLegIndex(legIdx);
      // Haptic feedback on leg change
      if ('vibrate' in navigator) {
        try {
          navigator.vibrate([70, 40, 70]);
        } catch {
          // Ignore if permission denied
        }
      }
    }
  }, [simulationProgress, route]);

  if (!isOpen || !route || !route.legs || route.legs.length === 0) return null;

  const currentLeg: RouteLeg = route.legs[currentLegIndex] || route.legs[0];
  const nextLeg: RouteLeg | undefined = route.legs[currentLegIndex + 1];

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'METRO':
        return <Train className="w-6 h-6 text-purple-400" />;
      case 'CAB':
        return <Car className="w-6 h-6 text-amber-400" />;
      case 'AUTO':
        return <Car className="w-6 h-6 text-emerald-400" />;
      case 'BUS':
        return <Bus className="w-6 h-6 text-cyan-400" />;
      case 'WALK':
      default:
        return <Footprints className="w-6 h-6 text-slate-300" />;
    }
  };

  const getModeBg = (mode: string) => {
    switch (mode) {
      case 'METRO':
        return 'from-purple-600/30 to-indigo-600/30 border-purple-500/50 text-purple-300';
      case 'CAB':
        return 'from-amber-600/30 to-orange-600/30 border-amber-500/50 text-amber-300';
      case 'AUTO':
        return 'from-emerald-600/30 to-teal-600/30 border-emerald-500/50 text-emerald-300';
      case 'BUS':
        return 'from-cyan-600/30 to-sky-600/30 border-cyan-500/50 text-cyan-300';
      case 'WALK':
      default:
        return 'from-slate-700/30 to-slate-800/30 border-slate-600/50 text-slate-300';
    }
  };

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-4 animate-slideDown">
      <div className="bg-slate-900/95 backdrop-blur-2xl border border-sky-500/50 rounded-2xl shadow-2xl p-4 text-white">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <h3 className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5 text-sky-400" />
              Live Turn-by-Turn Commuter HUD
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-slate-400">
              Leg {currentLegIndex + 1} of {route.legs.length}
            </span>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Exit Navigation"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Big Instruction Banner */}
        <div className={`p-3.5 rounded-xl border bg-gradient-to-r ${getModeBg(currentLeg.mode)} flex items-start gap-3.5 shadow-lg`}>
          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-700/80 shrink-0">
            {getModeIcon(currentLeg.mode)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-[11px] uppercase tracking-wider font-semibold opacity-80 flex items-center gap-1">
              <span>{currentLeg.mode}</span>
              <span>•</span>
              <span>{Math.round(currentLeg.distanceKm * 10) / 10} km</span>
              <span>•</span>
              <span>~{Math.round(currentLeg.durationMinutes)} min</span>
            </div>
            <h4 className="text-sm sm:text-base font-bold text-white mt-0.5 leading-snug">
              {currentLeg.instruction}
            </h4>
            <div className="text-xs text-slate-300 mt-1 flex items-center gap-1">
              <span>Towards:</span>
              <strong className="text-white font-medium">{currentLeg.toNode.name}</strong>
            </div>
          </div>
        </div>

        {/* Next Maneuver Preview */}
        {nextLeg && (
          <div className="mt-2.5 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/50 flex items-center justify-between text-xs text-slate-300">
            <span className="text-[10px] uppercase tracking-wider text-slate-400">Then:</span>
            <span className="font-medium truncate max-w-[280px]">{nextLeg.instruction}</span>
            <span className="text-[11px] font-mono text-sky-400 shrink-0">{nextLeg.mode}</span>
          </div>
        )}

        {/* Bottom Trip Progress & Controls */}
        <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
          <div className="flex items-center gap-3 text-slate-300 font-mono">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              ETA: <strong className="text-white">{route.arrivalEta}</strong>
            </span>
            <span>•</span>
            <span>Fare: <strong className="text-emerald-400">₹{route.totalCostINR}</strong></span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentLegIndex(Math.max(0, currentLegIndex - 1))}
              disabled={currentLegIndex === 0}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-200 cursor-pointer"
              title="Previous Step"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentLegIndex(Math.min(route.legs.length - 1, currentLegIndex + 1))}
              disabled={currentLegIndex >= route.legs.length - 1}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-200 cursor-pointer"
              title="Next Step"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
