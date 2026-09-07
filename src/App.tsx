import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  PRIMARY_TRANSIT_HUBS,
  SCALED_BENGALURU_NODES,
} from './algorithms/data/bengaluru-network-scaled';
import type {
  Coordinates,
  RouteOption,
} from './algorithms/types';
import { useRoutingWorker } from './hooks/useRoutingWorker';
import { Map3DViewport } from './components/map/Map3DViewport';
import { HUDDeck } from './components/hud/HUDDeck';
import { LatencyHUD } from './components/hud/LatencyHUD';
import { EngineeringTelemetryHUD } from './components/hud/EngineeringTelemetryHUD';
import { NaturalLanguageSearchBar } from './components/ai/NaturalLanguageSearchBar';
import { CommuteCopilotDrawer } from './components/ai/CommuteCopilotDrawer';
import { Zap, CloudRain } from 'lucide-react';

export function App() {
  // Theme State: Defaults to Light Theme
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Traffic / Peak hour state
  const [isPeakHour, setIsPeakHour] = useState<boolean>(false);

  // Dedicated Web Worker Hook for Graph building, KD-Tree Snapping & Pareto A* Routing
  const {
    isReady,
    isCalculating,
    routes,
    selectedRoute,
    telemetry,
    graphStats,
    snappedOrigin,
    snappedDest,
    activeIncident,
    affectedEdgesCount,
    isMonsoonFlooded,
    floodedEdgesCount,
    error: routingError,
    calculateRoute,
    triggerIncident,
    clearIncident,
    triggerMonsoonFlood,
    clearMonsoonFlood,
    setSelectedRoute,
  } = useRoutingWorker();

  // Toggle Dynamic Incident Shockwave at Silk Board Junction
  const handleToggleSilkBoardIncident = useCallback(() => {
    if (activeIncident) {
      clearIncident();
    } else {
      triggerIncident({
        center: [77.6229, 12.9177], // Central Silk Board Interchange
        radiusKm: 2.5,
        severityMultiplier: 3.5,
        name: 'Silk Board Central Gridlock',
      });
    }
  }, [activeIncident, triggerIncident, clearIncident]);

  // Toggle Monsoon Flood Shockwave across low-lying Bengaluru basins
  const handleToggleMonsoonFlood = useCallback(() => {
    if (isMonsoonFlooded) {
      clearMonsoonFlood();
    } else {
      triggerMonsoonFlood();
    }
  }, [isMonsoonFlooded, triggerMonsoonFlood, clearMonsoonFlood]);

  // Origin & Destination targets (can be either node ID string or raw [lng, lat] Coordinates)
  const [originTarget, setOriginTarget] = useState<string | Coordinates>('majestic');
  const [destTarget, setDestTarget] = useState<string | Coordinates>('whitefield_itpl');
  const [customOriginCoord, setCustomOriginCoord] = useState<Coordinates | null>(null);
  const [customDestCoord, setCustomDestCoord] = useState<Coordinates | null>(null);

  // Pin click mode: clicking on the 3D map canvas sets Origin or Destination
  const [pinTargetMode, setPinTargetMode] = useState<'ORIGIN' | 'DESTINATION'>('DESTINATION');

  // 3D Path Simulation State
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simulationProgress, setSimulationProgress] = useState<number>(0);
  const simulationRef = useRef<number | null>(null);

  // Trigger initial route calculation once Web Worker finishes instantiation
  useEffect(() => {
    if (isReady) {
      calculateRoute(originTarget, destTarget, isPeakHour);
    }
  }, [isReady]);

  // Sync custom coordinates with snapped nodes once worker responds
  useEffect(() => {
    if (snappedOrigin && !customOriginCoord) {
      setCustomOriginCoord(snappedOrigin.coordinates);
    }
  }, [snappedOrigin]);

  useEffect(() => {
    if (snappedDest && !customDestCoord) {
      setCustomDestCoord(snappedDest.coordinates);
    }
  }, [snappedDest]);

  // Simulation Animation Loop
  useEffect(() => {
    if (!isSimulating) {
      if (simulationRef.current) {
        cancelAnimationFrame(simulationRef.current);
        simulationRef.current = null;
      }
      return;
    }

    let lastTime = performance.now();
    const speed = 0.08; // Full trajectory traversal in ~12.5 seconds

    const loop = (now: number) => {
      const delta = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      let reachedEnd = false;
      setSimulationProgress((prev) => {
        const next = prev + speed * delta;
        if (next >= 1.0) {
          reachedEnd = true;
          return 1.0;
        }
        return next;
      });

      if (reachedEnd) {
        setIsSimulating(false);
        simulationRef.current = null;
        return;
      }

      simulationRef.current = requestAnimationFrame(loop);
    };

    simulationRef.current = requestAnimationFrame(loop);

    return () => {
      if (simulationRef.current) {
        cancelAnimationFrame(simulationRef.current);
        simulationRef.current = null;
      }
    };
  }, [isSimulating]);

  const handleToggleSimulation = useCallback(() => {
    setIsSimulating((prevSim) => {
      if (!prevSim) {
        setSimulationProgress((prevProg) => (prevProg >= 0.98 ? 0 : prevProg));
        return true;
      }
      return false;
    });
  }, []);

  const handleResetSimulation = useCallback(() => {
    setIsSimulating(false);
    setSimulationProgress(0);
  }, []);

  // Handle arbitrary 3D Map Canvas Click
  // Dispatches directly to Web Worker: KD-Tree snaps in O(log N) and re-routes without dropping a frame
  const handleMapCoordinateClick = useCallback(
    (coord: Coordinates) => {
      if (pinTargetMode === 'ORIGIN') {
        setCustomOriginCoord(coord);
        setOriginTarget(coord);
        calculateRoute(coord, destTarget, isPeakHour);
      } else {
        setCustomDestCoord(coord);
        setDestTarget(coord);
        calculateRoute(originTarget, coord, isPeakHour);
      }
      setSimulationProgress(0);
      setIsSimulating(false);
    },
    [pinTargetMode, originTarget, destTarget, isPeakHour, calculateRoute]
  );

  // Handle dragging Origin or Destination pin directly on the MapLibre canvas
  const handlePinDrag = useCallback(
    (target: 'ORIGIN' | 'DESTINATION', coord: Coordinates) => {
      if (target === 'ORIGIN') {
        setCustomOriginCoord(coord);
        setOriginTarget(coord);
        calculateRoute(coord, destTarget, isPeakHour);
      } else {
        setCustomDestCoord(coord);
        setDestTarget(coord);
        calculateRoute(originTarget, coord, isPeakHour);
      }
      setSimulationProgress(0);
      setIsSimulating(false);
    },
    [originTarget, destTarget, isPeakHour, calculateRoute]
  );

  // Handle Origin selection from HUD dropdown or quick corridors
  const handleOriginChange = useCallback(
    (nodeId: string) => {
      setCustomOriginCoord(null);
      setOriginTarget(nodeId);
      calculateRoute(nodeId, destTarget, isPeakHour);
      setSimulationProgress(0);
      setIsSimulating(false);
    },
    [destTarget, isPeakHour, calculateRoute]
  );

  // Handle Destination selection from HUD dropdown or quick corridors
  const handleDestChange = useCallback(
    (nodeId: string) => {
      setCustomDestCoord(null);
      setDestTarget(nodeId);
      calculateRoute(originTarget, nodeId, isPeakHour);
      setSimulationProgress(0);
      setIsSimulating(false);
    },
    [originTarget, isPeakHour, calculateRoute]
  );

  // Swap Origin and Destination
  const handleSwapNodes = useCallback(() => {
    const nextOriginTarget = destTarget;
    const nextDestTarget = originTarget;
    const nextOriginCoord = customDestCoord;
    const nextDestCoord = customOriginCoord;

    setOriginTarget(nextOriginTarget);
    setDestTarget(nextDestTarget);
    setCustomOriginCoord(nextOriginCoord);
    setCustomDestCoord(nextDestCoord);

    calculateRoute(nextOriginTarget, nextDestTarget, isPeakHour);
    setSimulationProgress(0);
    setIsSimulating(false);
  }, [originTarget, destTarget, customOriginCoord, customDestCoord, isPeakHour, calculateRoute]);

  // Toggle Peak Hour congestion multiplier and recalculate
  const handleTogglePeakHour = useCallback(() => {
    const nextPeak = !isPeakHour;
    setIsPeakHour(nextPeak);
    calculateRoute(originTarget, destTarget, nextPeak);
  }, [isPeakHour, originTarget, destTarget, calculateRoute]);

  // Combined nodes for HUD dropdowns: primary metro/landmark hubs + snapped custom points
  const hudNodes = useMemo(() => {
    const base = [...PRIMARY_TRANSIT_HUBS];
    if (snappedOrigin && !base.some((n) => n.id === snappedOrigin.id)) {
      base.unshift(snappedOrigin);
    }
    if (snappedDest && !base.some((n) => n.id === snappedDest.id)) {
      base.unshift(snappedDest);
    }
    return base;
  }, [snappedOrigin, snappedDest]);

  const originId = typeof originTarget === 'string' ? originTarget : snappedOrigin?.id || 'origin_point';
  const destId = typeof destTarget === 'string' ? destTarget : snappedDest?.id || 'dest_point';

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 select-none">
      {/* 3D Map Viewport Layer */}
      <Map3DViewport
        nodes={SCALED_BENGALURU_NODES}
        selectedRoute={selectedRoute}
        originNode={snappedOrigin}
        destNode={snappedDest}
        originCoord={customOriginCoord}
        destCoord={customDestCoord}
        onMapCoordinateClick={handleMapCoordinateClick}
        onPinDrag={handlePinDrag}
        pinTargetMode={pinTargetMode}
        onTogglePinTargetMode={() =>
          setPinTargetMode((prev) => (prev === 'DESTINATION' ? 'ORIGIN' : 'DESTINATION'))
        }
        isCalculating={isCalculating}
        simulationProgress={simulationProgress}
        isSimulating={isSimulating}
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode(!isDarkMode)}
        activeIncident={activeIncident}
        isMonsoonFlooded={isMonsoonFlooded}
      />

      {/* Top Floating Natural Language Search Bar */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 w-full max-w-xl px-4 pointer-events-auto">
        <NaturalLanguageSearchBar
          nodes={hudNodes}
          onRouteDispatched={(origin, dest) => {
            setOriginTarget(origin);
            setDestTarget(dest);
            setCustomOriginCoord(null);
            setCustomDestCoord(null);
            calculateRoute(origin, dest, isPeakHour);
            setSimulationProgress(0);
            setIsSimulating(false);
          }}
          isCalculating={isCalculating}
        />
      </div>

      {/* Top Telemetry HUD */}
      <LatencyHUD telemetry={telemetry} graphStats={graphStats} />

      {/* Quick-Action Buttons: Silk Board & Monsoon Flood Shockwaves */}
      <div className="absolute top-3.5 right-48 z-20 pointer-events-auto hidden md:flex items-center gap-2">
        <button
          type="button"
          onClick={handleToggleSilkBoardIncident}
          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-lg flex items-center gap-1.5 border cursor-pointer ${
            activeIncident
              ? 'bg-rose-600 text-white border-rose-400 animate-pulse shadow-rose-900/40'
              : 'glass-panel text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:border-amber-400 hover:text-amber-500'
          }`}
          title="⚡ Trigger severe real-time traffic disruption at Central Silk Board"
        >
          <Zap className={`w-3.5 h-3.5 ${activeIncident ? 'text-amber-300' : 'text-amber-500'}`} />
          <span>
            {activeIncident
              ? `⚡ Clear Silk Board Gridlock (${affectedEdgesCount} Edges)`
              : '⚡ Trigger Silk Board Gridlock'}
          </span>
        </button>

        <button
          type="button"
          onClick={handleToggleMonsoonFlood}
          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-lg flex items-center gap-1.5 border cursor-pointer ${
            isMonsoonFlooded
              ? 'bg-blue-600 text-white border-blue-400 animate-pulse shadow-blue-900/40 ring-2 ring-blue-300/60'
              : 'glass-panel text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:border-blue-400 hover:text-blue-500'
          }`}
          title="🌧️ Trigger severe monsoon flood shockwave across low-lying underpasses"
        >
          <CloudRain className={`w-3.5 h-3.5 ${isMonsoonFlooded ? 'text-blue-200' : 'text-blue-400'}`} />
          <span>
            {isMonsoonFlooded
              ? `🌧️ Clear Monsoon Flood (${floodedEdgesCount} Flooded)`
              : '🌧️ Trigger Monsoon Flood'}
          </span>
        </button>
      </div>

      {/* AI Commute Copilot Slide-out Drawer */}
      <CommuteCopilotDrawer
        selectedRoute={selectedRoute}
        activeIncident={activeIncident}
        isPeakHour={isPeakHour}
        isMonsoonFlooded={isMonsoonFlooded}
      />

      {/* Navigation HUD Deck Cockpit */}
      <HUDDeck
        nodes={hudNodes}
        originNodeId={originId}
        destNodeId={destId}
        onOriginChange={handleOriginChange}
        onDestChange={handleDestChange}
        onSwapNodes={handleSwapNodes}
        routes={routes}
        selectedRoute={selectedRoute}
        onSelectRoute={(route: RouteOption) => {
          setSelectedRoute(route);
          setSimulationProgress(0);
          setIsSimulating(false);
        }}
        isSimulating={isSimulating}
        onToggleSimulation={handleToggleSimulation}
        onResetSimulation={handleResetSimulation}
        simulationProgress={simulationProgress}
        isPeakHour={isPeakHour}
        onTogglePeakHour={handleTogglePeakHour}
        activeIncident={activeIncident}
        onToggleIncident={handleToggleSilkBoardIncident}
        isMonsoonFlooded={isMonsoonFlooded}
        onToggleMonsoonFlood={handleToggleMonsoonFlood}
        floodedEdgesCount={floodedEdgesCount}
      />

      {/* Live Engineering Telemetry & Observability HUD (Bottom Right) */}
      <EngineeringTelemetryHUD
        telemetry={telemetry}
        graphStats={graphStats}
        isCalculating={isCalculating}
        activeIncident={activeIncident}
        affectedEdgesCount={affectedEdgesCount}
      />

      {/* Worker Error Notification Toast if any */}
      {routingError && (
        <div className="absolute top-20 right-4 z-50 glass-panel px-4 py-3 rounded-2xl border border-rose-300 dark:border-rose-900 bg-rose-50/90 dark:bg-rose-950/80 text-rose-800 dark:text-rose-200 shadow-xl max-w-sm">
          <p className="text-xs font-bold">{routingError}</p>
        </div>
      )}
    </div>
  );
}

export default App;
