import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Bot,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Leaf,
  CloudRain,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import { generateCopilotAdvice } from '../../services/gemini';
import type { RouteOption, TriggerIncidentPayload } from '../../algorithms/types';

interface CommuteCopilotDrawerProps {
  selectedRoute: RouteOption | null;
  activeIncident: TriggerIncidentPayload | null;
  isPeakHour: boolean;
  isMonsoonFlooded: boolean;
}

export const CommuteCopilotDrawer: React.FC<CommuteCopilotDrawerProps> = ({
  selectedRoute,
  activeIncident,
  isPeakHour,
  isMonsoonFlooded,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [adviceText, setAdviceText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Fetch advice when selected route or environmental shockwaves change
  useEffect(() => {
    if (!selectedRoute) return;

    let isMounted = true;
    const fetchAdvice = async () => {
      setIsLoading(true);
      try {
        const text = await generateCopilotAdvice(
          selectedRoute,
          activeIncident,
          isPeakHour,
          isMonsoonFlooded
        );
        if (isMounted) setAdviceText(text);
      } catch (err) {
        console.error('[Copilot] Advice error:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchAdvice();
    return () => {
      isMounted = false;
    };
  }, [selectedRoute?.id, isPeakHour, activeIncident?.name, isMonsoonFlooded]);

  if (!selectedRoute) return null;

  const co2Grams = selectedRoute.co2Grams || Math.round(selectedRoute.carbonKg * 1000);
  const carComparisonGrams = Math.round(selectedRoute.totalDistanceKm * 150);
  const co2SavedPercent =
    carComparisonGrams > 0
      ? Math.max(0, Math.round(((carComparisonGrams - co2Grams) / carComparisonGrams) * 100))
      : 0;

  return (
    <aside
      aria-label="Bengaluru AI Commute Copilot"
      className={`fixed top-36 right-4 z-40 transition-all duration-300 ease-in-out ${
        isOpen ? 'w-80 sm:w-96 translate-x-0' : 'w-auto translate-x-0'
      }`}
    >
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 backdrop-blur-xl border border-sky-500/40 text-sky-400 font-semibold text-xs shadow-2xl shadow-sky-500/20 transition-all hover:scale-105 cursor-pointer"
          title="Open AI Commute Copilot"
        >
          <Sparkles className="w-4 h-4 text-sky-400 animate-pulse" />
          <span className="font-mono">AI COPILOT</span>
          <ChevronLeft className="w-4 h-4" />
        </button>
      ) : (
        <div className="bg-slate-900/95 backdrop-blur-2xl border border-slate-700/80 rounded-2xl p-4 shadow-2xl flex flex-col gap-3.5 text-slate-100 animate-fadeIn">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/30">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                  AI Commute Copilot
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </h2>
                <p className="text-[10px] text-slate-400 font-mono">Gemini 2.5 Flash Transit Advisor</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={async () => {
                  setIsLoading(true);
                  const text = await generateCopilotAdvice(
                    selectedRoute,
                    activeIncident,
                    isPeakHour,
                    isMonsoonFlooded
                  );
                  setAdviceText(text);
                  setIsLoading(false);
                }}
                disabled={isLoading}
                className="p-1.5 rounded-lg text-slate-400 hover:text-sky-400 hover:bg-slate-800/80 transition-colors cursor-pointer"
                title="Refresh Copilot Advice"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
                title="Collapse Copilot"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Environmental Shockwave Indicators */}
          {(isMonsoonFlooded || activeIncident || isPeakHour) && (
            <div className="flex flex-col gap-1.5">
              {isMonsoonFlooded && (
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-blue-950/60 border border-blue-700/50 text-[11px] text-blue-300 font-medium">
                  <CloudRain className="w-3.5 h-3.5 text-blue-400 shrink-0 animate-bounce" />
                  <span>Monsoon Chokepoints Flooded (6x Road Penalty)</span>
                </div>
              )}
              {activeIncident && (
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-amber-950/60 border border-amber-700/50 text-[11px] text-amber-300 font-medium">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>
                    {activeIncident.name} ({activeIncident.severityMultiplier}x Gridlock)
                  </span>
                </div>
              )}
              {isPeakHour && (
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-purple-950/60 border border-purple-700/50 text-[11px] text-purple-300 font-medium">
                  <Zap className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>Peak Surge Active (Cabs 1.8x, Autos 1.35x)</span>
                </div>
              )}
            </div>
          )}

          {/* Dynamic AI Advice Bubble */}
          <div className="relative rounded-xl bg-slate-800/60 border border-slate-700/60 p-3 text-xs leading-relaxed text-slate-300 font-sans">
            {isLoading ? (
              <div className="flex items-center justify-center py-6 gap-2 text-sky-400 text-xs font-mono">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Synthesizing multimodal commute telemetry...</span>
              </div>
            ) : (
              <div className="whitespace-pre-line space-y-1.5">
                {adviceText || 'Ready to analyze your journey corridor.'}
              </div>
            )}
          </div>

          {/* Eco / Sustainability Metric Card */}
          <div className="rounded-xl bg-gradient-to-r from-emerald-950/40 to-slate-800/40 border border-emerald-800/40 p-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Leaf className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                  Carbon Intelligence
                </p>
                <p className="text-xs font-mono font-semibold text-slate-200">
                  {co2Grams}g CO₂ ({co2SavedPercent}% vs. private car)
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold">
                {selectedRoute.archetype === 'BUDGET_BUS'
                  ? 'LEAST CO₂'
                  : selectedRoute.archetype === 'SMART_MULTIMODAL'
                  ? 'ECO OPTIMAL'
                  : 'DIRECT'}
              </span>
            </div>
          </div>

          {/* Footnote */}
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-sky-400" />
              Bengaluru Namma Transit Mesh
            </span>
            <span>Latency: &lt;5ms</span>
          </div>
        </div>
      )}
    </aside>
  );
};
