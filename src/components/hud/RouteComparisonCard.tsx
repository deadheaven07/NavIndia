import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Clock,
  IndianRupee,
  Leaf,
  Milestone,
  Sparkles,
  CheckCircle2,
  Flame,
  ArrowRight,
  TrendingDown,
} from 'lucide-react';
import type { RouteOption, TransitMode } from '../../algorithms/types';
import { TransportLegBadge } from './TransportLegBadge';

interface RouteComparisonCardProps {
  route: RouteOption;
  isSelected: boolean;
  onSelect: (route: RouteOption) => void;
}

export const RouteComparisonCard: React.FC<RouteComparisonCardProps> = ({
  route,
  isSelected,
  onSelect,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const getModeColor = (mode: TransitMode) => {
    switch (mode) {
      case 'METRO': return '#0284c7';
      case 'CAB': return '#059669';
      case 'AUTO': return '#d97706';
      case 'BUS': return '#e11d48';
      case 'WALK': return '#64748b';
    }
  };

  return (
    <div
      onClick={() => onSelect(route)}
      className={`group cursor-pointer rounded-2xl transition-all duration-300 relative overflow-hidden border p-4.5 ${
        isSelected
          ? 'glass-panel border-sky-500 dark:border-cyan-400/80 shadow-[0_12px_32px_-8px_rgba(2,132,199,0.22)] bg-white/95 dark:bg-slate-900/90 ring-2 ring-sky-400/30'
          : 'glass-panel-subtle border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white/75 dark:bg-slate-950/60 hover:bg-white dark:hover:bg-slate-900/75 shadow-sm'
      }`}
    >
      {/* Top Header: Badge, Transfers, and Status */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-2xs"
            style={{
              backgroundColor: `${route.accentColor}18`,
              color: route.accentColor,
              border: `1px solid ${route.accentColor}40`,
            }}
          >
            <Sparkles className="w-2.5 h-2.5" />
            {route.tag}
          </span>
          {route.transfersCount === 0 ? (
            <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/40 font-bold">
              Direct Route
            </span>
          ) : (
            <span className="text-[10px] font-mono text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800/40 font-bold">
              {route.transfersCount} {route.transfersCount === 1 ? 'Transfer' : 'Transfers'}
            </span>
          )}
        </div>

        {/* Selected Check Pill */}
        {isSelected ? (
          <div className="flex items-center gap-1 text-xs font-bold text-sky-700 dark:text-cyan-400 bg-sky-50 dark:bg-cyan-950/60 px-2 py-0.5 rounded-full border border-sky-200 dark:border-cyan-800/40">
            <CheckCircle2 className="w-3.5 h-3.5 fill-sky-600 dark:fill-cyan-400 text-white dark:text-slate-950" />
            <span>Active 3D</span>
          </div>
        ) : (
          <span className="text-xs text-slate-400 group-hover:text-sky-700 dark:group-hover:text-slate-200 font-semibold transition-colors flex items-center gap-1">
            Select <ArrowRight className="w-3 h-3" />
          </span>
        )}
      </div>

      {/* Main Title, Subtitle, and ETA */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <h4 className="text-base font-black text-slate-900 dark:text-slate-100 group-hover:text-sky-800 dark:group-hover:text-white transition-colors">
            {route.title}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5 font-medium">
            {route.subtitle}
          </p>
        </div>

        {/* Arrival ETA Tag */}
        <div className="text-right shrink-0">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
            ETA
          </span>
          <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200 font-mono">
            {route.arrivalEta}
          </span>
        </div>
      </div>

      {/* Proportional Multi-Modal Duration Timeline Bar */}
      <div className="mb-3">
        <div className="w-full h-2 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 flex gap-0.5 p-0.5 border border-slate-200 dark:border-slate-700/60">
          {route.legs.map((leg, idx) => {
            const ratio = Math.max(8, (leg.durationMinutes / (route.totalDurationMinutes || 1)) * 100);
            return (
              <div
                key={idx}
                title={`${leg.mode}: ${leg.durationMinutes} mins (${leg.distanceKm} km)`}
                className="h-full rounded-xs transition-all duration-300"
                style={{
                  width: `${ratio}%`,
                  backgroundColor: getModeColor(leg.mode),
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Primary Metrics Strip: Travel Time, Fare, Distance */}
      <div className="grid grid-cols-3 gap-2 py-2.5 px-3.5 rounded-xl bg-slate-50/90 dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800/80 mb-3 shadow-2xs">
        {/* Travel Time */}
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-400 flex items-center gap-1">
            <Clock className="w-3 h-3 text-sky-600 dark:text-cyan-400" />
            Duration
          </span>
          <span className="text-lg font-black text-slate-900 dark:text-slate-100 font-mono tracking-tight">
            {route.totalDurationMinutes} <span className="text-xs font-normal text-slate-500">mins</span>
          </span>
        </div>

        {/* Fare (INR) */}
        <div className="flex flex-col border-x border-slate-200 dark:border-slate-800 px-2.5">
          <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-400 flex items-center gap-1">
            <IndianRupee className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            Total Fare
          </span>
          <span className="text-lg font-black text-emerald-700 dark:text-emerald-400 font-mono tracking-tight">
            ₹{route.totalCostINR}
          </span>
        </div>

        {/* Distance & Eco Savings */}
        <div className="flex flex-col pl-1.5">
          <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-400 flex items-center gap-1">
            <Milestone className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
            Distance
          </span>
          <span className="text-sm font-black text-slate-800 dark:text-slate-200 font-mono">
            {route.totalDistanceKm} <span className="text-[10px] font-normal text-slate-500">km</span>
          </span>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400/90 flex items-center gap-0.5 font-mono font-bold">
            <Leaf className="w-2.5 h-2.5 text-emerald-500" />
            {route.carbonKg}kg CO₂
          </span>
        </div>
      </div>

      {/* Fare Breakdown Chips & Calories */}
      <div className="flex items-center justify-between text-[11px] mb-3 text-slate-500 dark:text-slate-400 font-medium">
        <div className="flex items-center gap-1.5 flex-wrap">
          {route.fareBreakdown.map((item, idx) => (
            <span key={idx} className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px] font-mono">
              {item.mode}: ₹{item.cost}
            </span>
          ))}
        </div>
        {route.caloriesBurned > 0 && (
          <span className="text-[10px] font-mono text-orange-600 dark:text-orange-400 flex items-center gap-0.5 shrink-0">
            <Flame className="w-3 h-3 text-orange-500" />
            {route.caloriesBurned} kcal
          </span>
        )}
      </div>

      {/* Mode Leg Badges Sequence */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {route.legs.map((leg, idx) => (
          <React.Fragment key={idx}>
            <TransportLegBadge
              mode={leg.mode}
              distanceKm={leg.distanceKm}
              durationMinutes={leg.durationMinutes}
              size="sm"
            />
            {idx < route.legs.length - 1 && (
              <span className="text-slate-300 dark:text-slate-600 font-black text-xs">&rsaquo;</span>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Expandable Detailed Step-by-Step Itinerary */}
      <div className="mt-3 pt-2.5 border-t border-slate-200/90 dark:border-slate-800/80">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className="w-full flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors py-1 font-bold"
        >
          <span>
            {isExpanded ? 'Hide Step-by-Step Itinerary' : `View ${route.legs.length} Transit Steps & Transfers`}
          </span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {isExpanded && (
          <div className="mt-2.5 space-y-3 text-xs border-l-2 border-sky-400 dark:border-cyan-500/40 pl-3.5 pt-1">
            {route.legs.map((leg, idx) => (
              <div key={idx} className="relative pb-1">
                {/* Node Junction */}
                <div className="font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: getModeColor(leg.mode) }}
                  />
                  <span>{leg.fromNode.name}</span>
                  <span className="text-slate-400">&rarr;</span>
                  <span>{leg.toNode.name}</span>
                </div>
                {/* Leg Instruction */}
                <p className="text-[11px] text-slate-600 dark:text-slate-400 ml-3.5 mt-0.5 font-medium leading-relaxed">
                  {leg.instruction}
                </p>
                {/* Submetrics */}
                <div className="text-[10px] font-mono text-slate-500 ml-3.5 mt-1 flex gap-3 font-semibold">
                  <span>{leg.distanceKm} km</span>
                  <span>•</span>
                  <span>{leg.durationMinutes} mins</span>
                  <span>•</span>
                  <span>₹{leg.costINR}</span>
                  {leg.trafficMultiplier > 1.2 && (
                    <>
                      <span>•</span>
                      <span className="text-rose-600 dark:text-rose-400 flex items-center gap-0.5">
                        <TrendingDown className="w-2.5 h-2.5" />
                        {leg.trafficMultiplier.toFixed(1)}x Traffic Delays
                      </span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
