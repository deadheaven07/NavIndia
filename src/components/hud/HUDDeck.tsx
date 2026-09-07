import React, { useState } from 'react';
import {
  MapPin,
  Compass,
  ArrowUpDown,
  Sparkles,
  Flame,
  Play,
  Square,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  ShieldCheck,
  Zap,
  CloudRain,
} from 'lucide-react';
import type { RouteOption, TransitNode } from '../../algorithms/types';
import type { TriggerIncidentPayload } from '../../workers/types';
import { RouteComparisonCard } from './RouteComparisonCard';

interface HUDDeckProps {
  nodes: TransitNode[];
  originNodeId: string;
  destNodeId: string;
  onOriginChange: (nodeId: string) => void;
  onDestChange: (nodeId: string) => void;
  onSwapNodes: () => void;
  routes: RouteOption[];
  selectedRoute: RouteOption | null;
  onSelectRoute: (route: RouteOption) => void;
  isSimulating: boolean;
  onToggleSimulation: () => void;
  onResetSimulation: () => void;
  simulationProgress: number; // 0 to 1
  isPeakHour: boolean;
  onTogglePeakHour: () => void;
  activeIncident?: TriggerIncidentPayload | null;
  onToggleIncident?: () => void;
  isMonsoonFlooded?: boolean;
  onToggleMonsoonFlood?: () => void;
  floodedEdgesCount?: number;
}

export const HUDDeck: React.FC<HUDDeckProps> = ({
  nodes,
  originNodeId,
  destNodeId,
  onOriginChange,
  onDestChange,
  onSwapNodes,
  routes,
  selectedRoute,
  onSelectRoute,
  isSimulating,
  onToggleSimulation,
  onResetSimulation,
  simulationProgress,
  isPeakHour,
  onTogglePeakHour,
  activeIncident,
  onToggleIncident,
  isMonsoonFlooded = false,
  onToggleMonsoonFlood,
  floodedEdgesCount = 0,
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'ROUTES' | 'MATRIX'>('ROUTES');
  const [modeFilter, setModeFilter] = useState<'ALL' | 'METRO' | 'CAB' | 'BUDGET'>('ALL');

  const quickCorridors = [
    {
      title: 'Majestic ➔ Whitefield ITPL',
      from: 'majestic',
      to: 'whitefield_itpl',
      desc: 'CBD to Silicon Suburb',
    },
    {
      title: 'Indiranagar ➔ Electronic City',
      from: 'indiranagar_metro',
      to: 'electronic_city',
      desc: 'Startup strip to IT Tollway',
    },
    {
      title: 'Koramangala ➔ Manyata Park',
      from: 'koramangala_sony',
      to: 'hebbal',
      desc: 'Unicorn belt to Airport corridor',
    },
    {
      title: 'Silk Board ➔ EcoSpace Bellandur',
      from: 'silk_board',
      to: 'bellandur',
      desc: 'Outer Ring Road choke point',
    },
  ];

  const filteredRoutes = routes.filter((route) => {
    if (modeFilter === 'ALL') return true;
    if (modeFilter === 'METRO') return route.archetype === 'SMART_MULTIMODAL';
    if (modeFilter === 'CAB') return route.archetype === 'FASTEST_CAB';
    if (modeFilter === 'BUDGET') return route.archetype === 'BUDGET_BUS';
    return true;
  });

  return (
    <div
      className={`fixed top-4 left-4 bottom-4 z-40 flex transition-all duration-500 ease-out pointer-events-none ${
        isCollapsed ? '-translate-x-[calc(100%-2.5rem)]' : 'translate-x-0'
      }`}
    >
      {/* Main Glass Deck Container */}
      <div className="w-[450px] max-w-[calc(100vw-2rem)] h-full glass-panel rounded-3xl p-5 flex flex-col pointer-events-auto border border-slate-200/90 dark:border-white/10 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.14)] dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] backdrop-blur-2xl overflow-hidden">
        {/* Brand Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200/90 dark:border-slate-800/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 dark:from-cyan-500 dark:to-indigo-600 flex items-center justify-center shadow-md shadow-sky-500/25">
              <Compass className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-base font-black tracking-tight text-slate-900 dark:text-white">
                  NavIndia
                </h1>
                <span className="text-[10px] font-mono font-extrabold bg-sky-100 dark:bg-cyan-500/20 text-sky-800 dark:text-cyan-300 border border-sky-300 dark:border-cyan-500/40 px-1.5 py-0.2 rounded">
                  SuperRoute
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Enterprise 3D Multi-Modal Engine · Bengaluru
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Incident Trigger */}
            {onToggleIncident && (
              <button
                type="button"
                onClick={onToggleIncident}
                title="Toggle Incident"
                className={`p-2 rounded-full border transition-all cursor-pointer ${
                  activeIncident
                    ? 'bg-rose-500 border-rose-600 text-white animate-pulse'
                    : 'bg-amber-100 dark:bg-amber-900/40 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Monsoon Flood Trigger */}
            {onToggleMonsoonFlood && (
              <button
                type="button"
                onClick={onToggleMonsoonFlood}
                title="Toggle Monsoon Flood Shockwave (simulates low-lying road waterlogging)"
                className={`p-2 rounded-full border transition-all cursor-pointer ${
                  isMonsoonFlooded
                    ? 'bg-blue-600 border-blue-500 text-white animate-pulse shadow-lg shadow-blue-500/30 ring-2 ring-blue-300/60'
                    : 'bg-blue-100 dark:bg-blue-950/50 border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-400 hover:scale-105'
                }`}
              >
                <CloudRain className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Peak Traffic Mode Switcher */}
            <button
              type="button"
              onClick={onTogglePeakHour}
              title="Toggle Peak Rush Hour Jam (multiplies road delay to showcase Metro resilience)"
              className={`flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full border transition-all shadow-2xs cursor-pointer ${
                isPeakHour
                  ? 'bg-rose-100 dark:bg-rose-500/20 border-rose-300 dark:border-rose-500/60 text-rose-800 dark:text-rose-300 animate-pulse'
                  : 'bg-slate-100 dark:bg-slate-800/60 border-slate-300 dark:border-slate-700/60 text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Flame className={`w-3.5 h-3.5 ${isPeakHour ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500'}`} />
              <span>{isPeakHour ? 'Peak Congestion' : 'Normal Traffic'}</span>
            </button>
          </div>
        </div>

        {/* Dynamic Incident Alert Banner */}
        {activeIncident && (
          <div className="mt-3 px-3 py-2 rounded-xl bg-rose-100 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-700 flex items-center justify-between text-[11px] text-rose-800 dark:text-rose-300 animate-pulse">
            <div className="flex items-center gap-1.5 font-bold">
              <span>⚠️ {activeIncident.name}</span>
            </div>
            <span className="font-mono font-extrabold">{activeIncident.severityMultiplier}x Delay</span>
          </div>
        )}

        {/* Dynamic Monsoon Flood Alert Banner */}
        {isMonsoonFlooded && (
          <div className="mt-2 px-3 py-2 rounded-xl bg-blue-100 dark:bg-blue-950/60 border border-blue-300 dark:border-blue-700 flex items-center justify-between text-[11px] text-blue-800 dark:text-blue-300 animate-pulse">
            <div className="flex items-center gap-1.5 font-bold">
              <span>🌧️ Bengaluru Monsoon Waterlogging Alert</span>
            </div>
            <span className="font-mono font-extrabold">{floodedEdgesCount || 34} Road Chokepoints (6x Penalty)</span>
          </div>
        )}

        {/* Origin & Destination Cockpit */}
        <div className="pt-3 pb-2 shrink-0">
          <div className="relative space-y-2 bg-slate-50 dark:bg-slate-900/70 p-3.5 rounded-2xl border border-slate-200/90 dark:border-slate-800">
            {/* Origin Input */}
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-300 dark:border-emerald-400/50 flex items-center justify-center shrink-0">
                <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex-1">
                <label className="text-[10px] uppercase tracking-wider text-slate-400 font-extrabold block">
                  Origin (Or Click Map)
                </label>
                <select
                  value={originNodeId}
                  onChange={(e) => onOriginChange(e.target.value)}
                  className="w-full bg-transparent text-xs font-bold text-slate-800 dark:text-slate-100 outline-none cursor-pointer hover:text-sky-700 dark:hover:text-white"
                >
                  {nodes.map((node) => (
                    <option key={node.id} value={node.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                      {node.name} ({node.zone})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Swap Button */}
            <button
              type="button"
              onClick={onSwapNodes}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full glass-button flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white shadow-md z-10"
              title="Swap Origin & Destination"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>

            <div className="h-px bg-slate-200 dark:bg-slate-800/80 my-1"></div>

            {/* Destination Input */}
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-full bg-sky-100 dark:bg-cyan-500/20 border border-sky-300 dark:border-cyan-400/50 flex items-center justify-center shrink-0">
                <MapPin className="w-3.5 h-3.5 text-sky-600 dark:text-cyan-400" />
              </div>
              <div className="flex-1 pr-8">
                <label className="text-[10px] uppercase tracking-wider text-slate-400 font-extrabold block">
                  Destination (Or Click Map)
                </label>
                <select
                  value={destNodeId}
                  onChange={(e) => onDestChange(e.target.value)}
                  className="w-full bg-transparent text-xs font-bold text-slate-800 dark:text-slate-100 outline-none cursor-pointer hover:text-sky-700 dark:hover:text-white"
                >
                  {nodes.map((node) => (
                    <option key={node.id} value={node.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                      {node.name} ({node.zone})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Corridor Presets Bar */}
        <div className="shrink-0 mb-2">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1 mb-1.5">
            <Sparkles className="w-3 h-3 text-sky-600 dark:text-cyan-400" />
            High-Density Urban Corridors
          </span>
          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {quickCorridors.map((corridor, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  onOriginChange(corridor.from);
                  onDestChange(corridor.to);
                }}
                className="text-left px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900/60 hover:bg-slate-200 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white shrink-0 transition-all"
              >
                <div className="font-extrabold whitespace-nowrap">{corridor.title}</div>
                <div className="text-[9px] text-slate-500 dark:text-slate-400 font-mono">{corridor.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* View Tabs & Mode Filters */}
        <div className="shrink-0 mb-3 space-y-2">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('ROUTES')}
                className={`text-xs font-bold pb-1 transition-all border-b-2 ${
                  activeTab === 'ROUTES'
                    ? 'border-sky-600 text-sky-700 dark:text-cyan-400 dark:border-cyan-400'
                    : 'border-transparent text-slate-400 hover:text-slate-700'
                }`}
              >
                Routes ({routes.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('MATRIX')}
                className={`text-xs font-bold pb-1 transition-all border-b-2 flex items-center gap-1 ${
                  activeTab === 'MATRIX'
                    ? 'border-sky-600 text-sky-700 dark:text-cyan-400 dark:border-cyan-400'
                    : 'border-transparent text-slate-400 hover:text-slate-700'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                Pareto Matrix
              </button>
            </div>

            {/* Filter Pills */}
            <div className="flex gap-1">
              {(['ALL', 'METRO', 'CAB', 'BUDGET'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setModeFilter(mode)}
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded transition-all ${
                    modeFilter === mode
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content Area: Route Cards OR Pareto Matrix */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3 min-h-0">
          {activeTab === 'ROUTES' ? (
            filteredRoutes.map((route) => (
              <RouteComparisonCard
                key={route.id}
                route={route}
                isSelected={selectedRoute?.id === route.id}
                onSelect={onSelectRoute}
                onToggleSimulation={onToggleSimulation}
                isSimulating={isSimulating}
              />
            ))
          ) : (
            /* Pareto Trade-Off Matrix View */
            <div className="space-y-3">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <h5 className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider mb-2">
                  Multi-Modal Pareto Trade-Off Table
                </h5>
                <div className="overflow-x-auto text-xs">
                  <table className="w-full text-left font-mono">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] text-slate-400 uppercase">
                        <th className="pb-1.5 font-bold">Route</th>
                        <th className="pb-1.5 font-bold">Time</th>
                        <th className="pb-1.5 font-bold">Fare</th>
                        <th className="pb-1.5 font-bold">Transfers</th>
                        <th className="pb-1.5 font-bold">CO₂</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-[11px]">
                      {routes.map((r) => (
                        <tr
                          key={r.id}
                          onClick={() => onSelectRoute(r)}
                          className={`cursor-pointer hover:bg-sky-50 dark:hover:bg-slate-800/60 transition-colors ${
                            selectedRoute?.id === r.id ? 'bg-sky-50 dark:bg-slate-800/80 font-bold' : ''
                          }`}
                        >
                          <td className="py-2 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: r.accentColor }} />
                            <span className="truncate max-w-[90px]">{r.archetype.replace('_', ' ')}</span>
                          </td>
                          <td className="py-2 text-slate-800 dark:text-slate-200 font-bold">{r.totalDurationMinutes}m</td>
                          <td className="py-2 text-emerald-600 font-bold">₹{r.totalCostINR}</td>
                          <td className="py-2">{r.transfersCount}</td>
                          <td className="py-2 text-emerald-600">{r.carbonKg}kg</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Commuter Recommendation Insight Box */}
              <div className="p-3 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900 text-xs">
                <div className="flex items-center gap-1.5 text-sky-800 dark:text-cyan-300 font-bold mb-1">
                  <ShieldCheck className="w-4 h-4 text-sky-600" />
                  <span>Optimal Pareto Recommendation</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                  The <strong>Smart Multi-Modal</strong> option saves up to <strong>₹320+</strong> compared to a direct cab while dodging surface bottlenecks across Silk Board & Indiranagar via Namma Metro.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Simulation & Playback Cockpit */}
        {selectedRoute && (
          <div className="pt-3 mt-2 border-t border-slate-200/90 dark:border-slate-800/80 shrink-0">
            <div className="bg-slate-50 dark:bg-slate-900/80 p-3 rounded-2xl border border-slate-200/90 dark:border-slate-800 flex items-center justify-between gap-3 shadow-xs">
              <div className="flex-1">
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedRoute.accentColor }} />
                    3D Trajectory Stream
                  </span>
                  <span className="font-mono text-sky-700 dark:text-cyan-300 text-[10px] font-bold">
                    {Math.round(simulationProgress * 100)}% Traversed
                  </span>
                </div>
                {/* Progress bar */}
                <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full transition-all duration-200"
                    style={{
                      width: `${simulationProgress * 100}%`,
                      backgroundColor: selectedRoute.accentColor,
                    }}
                  />
                </div>
              </div>

              {/* Simulation Controls */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={onToggleSimulation}
                  className="p-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-extrabold shadow-md shadow-sky-600/25 transition-all flex items-center gap-1.5 text-xs"
                >
                  {isSimulating ? (
                    <>
                      <Square className="w-3.5 h-3.5 fill-current" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Fly 3D Path</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={onResetSimulation}
                  className="p-2.5 rounded-xl glass-button text-slate-600 dark:text-slate-400 hover:text-slate-900 text-xs font-bold"
                  title="Reset Simulation"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Toggle Collapse Button */}
      <button
        type="button"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="pointer-events-auto self-center -ml-1 w-7 h-14 rounded-r-xl glass-panel border-l-0 border-slate-200/90 dark:border-white/10 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white shadow-xl transition-all"
        title={isCollapsed ? 'Expand HUD Deck' : 'Collapse HUD Deck'}
      >
        {isCollapsed ? (
          <ChevronRight className="w-4 h-4 text-sky-600 dark:text-cyan-400" />
        ) : (
          <ChevronLeft className="w-4 h-4 text-sky-600 dark:text-cyan-400" />
        )}
      </button>
    </div>
  );
};
