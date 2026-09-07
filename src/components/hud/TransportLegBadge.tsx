import React from 'react';
import { Train, Car, Bus, Footprints, Navigation2 } from 'lucide-react';
import type { TransitMode } from '../../algorithms/types';

interface TransportLegBadgeProps {
  mode: TransitMode;
  distanceKm?: number;
  durationMinutes?: number;
  isTransfer?: boolean;
  size?: 'sm' | 'md';
}

export const TransportLegBadge: React.FC<TransportLegBadgeProps> = ({
  mode,
  distanceKm,
  durationMinutes,
  isTransfer = false,
  size = 'md',
}) => {
  const getModeConfig = (mode: TransitMode) => {
    switch (mode) {
      case 'METRO':
        return {
          label: 'Metro',
          icon: <Train className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />,
          bgClass: 'bg-sky-50 dark:bg-cyan-500/20 text-sky-800 dark:text-cyan-300 border-sky-300 dark:border-cyan-500/40',
          glowClass: 'shadow-[0_0_12px_rgba(2,132,199,0.15)] dark:shadow-[0_0_12px_rgba(6,182,212,0.3)]',
        };
      case 'CAB':
        return {
          label: 'Cab',
          icon: <Car className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />,
          bgClass: 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40',
          glowClass: 'shadow-[0_0_12px_rgba(5,150,105,0.15)] dark:shadow-[0_0_12px_rgba(16,185,129,0.3)]',
        };
      case 'AUTO':
        return {
          label: 'Auto',
          icon: <Navigation2 className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />,
          bgClass: 'bg-amber-50 dark:bg-amber-500/20 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-500/40',
          glowClass: 'shadow-[0_0_12px_rgba(217,119,6,0.15)] dark:shadow-[0_0_12px_rgba(245,158,11,0.3)]',
        };
      case 'BUS':
        return {
          label: 'Bus',
          icon: <Bus className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />,
          bgClass: 'bg-rose-50 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-500/40',
          glowClass: 'shadow-[0_0_12px_rgba(225,29,72,0.15)] dark:shadow-[0_0_12px_rgba(244,63,94,0.3)]',
        };
      case 'WALK':
        return {
          label: 'Walk',
          icon: <Footprints className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />,
          bgClass: 'bg-slate-100 dark:bg-slate-500/20 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-500/40',
          glowClass: '',
        };
    }
  };

  const config = getModeConfig(mode);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border font-semibold transition-all ${config.bgClass} ${config.glowClass} ${
        size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs'
      }`}
    >
      {config.icon}
      <span>{config.label}</span>
      {distanceKm !== undefined && (
        <span className="opacity-80 font-mono text-[10px]">
          ({distanceKm}km)
        </span>
      )}
      {durationMinutes !== undefined && (
        <span className="opacity-75 font-mono text-[10px]">
          {durationMinutes}m
        </span>
      )}
      {isTransfer && (
        <span className="ml-0.5 px-1 bg-amber-200 dark:bg-amber-400/30 text-amber-900 dark:text-amber-200 text-[9px] rounded font-mono">
          TRANS
        </span>
      )}
    </span>
  );
};
