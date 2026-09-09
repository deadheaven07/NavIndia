import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  PRIMARY_TRANSIT_HUBS,
  SCALED_BENGALURU_NODES,
} from './algorithms/data/bengaluru-network-scaled';
import {
  DELHI_PRIMARY_TRANSIT_HUBS,
} from './algorithms/data/delhi-network-scaled';
import { CITIES, type CityId } from './algorithms/data/cities';
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
import { TurnByTurnNavOverlay } from './components/hud/TurnByTurnNavOverlay';
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

  // Turn-by-turn Commuter Navigation HUD State
  const [isNavOverlayOpen, setIsNavOverlayOpen] = useState<boolean>(false);

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
    currentCity,
    cityNodes,
    switchCity,
    calculateRoute,
    triggerIncident,
    clearIncident,
    triggerMonsoonFlood,
    clearMonsoonFlood,
    setSelectedRoute,
  } = useRoutingWorker();

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

  // Switch City Handler
  const handleSwitchCity = useCallback(
    (newCity: CityId) => {
      if (newCity === currentCity) return;
      const config = CITIES[newCity];
      switchCity(newCity);
      setOriginTarget(config.defaultOriginId);
      setDestTarget(config.defaultDestId);
      setCustomOriginCoord(null);
      setCustomDestCoord(null);
      setSimulationProgress(0);
      setIsSimulating(false);
      setIsNavOverlayOpen(false);
      calculateRoute(config.defaultOriginId, config.defaultDestId, isPeakHour);
    },
    [currentCity, switchCity, isPeakHour, calculateRoute]
  );

  // Toggle Dynamic Incident Shockwave (Silk Board in Bengaluru / Rajiv Chowk in Delhi)
  const handleToggleIncident = useCallback(() => {
    if (activeIncident) {
      clearIncident();
    } else {
      if (currentCity === 'delhi') {
        triggerIncident({
          center: [77.2183, 28.6328], // Central Rajiv Chowk / CP Inner Circle
          radiusKm: 2.2,
          severityMultiplier: 3.5,
          name: 'Connaught Place Inner Circle Jam',
        });
      } else {
        triggerIncident({
          center: [77.6229, 12.9177], // Central Silk Board Interchange
          radiusKm: 2.5,
          severityMultiplier: 3.5,
          name: 'Silk Board Central Gridlock',
        });
      }
    }
  }, [activeIncident, currentCity, triggerIncident, clearIncident]);

  // Toggle Monsoon Flood Shockwave across low-lying basins
  const handleToggleMonsoonFlood = useCallback(() => {
    if (isMonsoonFlooded) {
      clearMonsoonFlood();
    } else {
      triggerMonsoonFlood();
    }
  }, [isMonsoonFlooded, triggerMonsoonFlood, clearMonsoonFlood]);

  // Handle GPS location tracking
  const handleLocateUser = useCallback(
    (coord: Coordinates) => {
      setCustomOriginCoord(coord);
      setOriginTarget(coord);
      calculateRoute(coord, destTarget, isPeakHour);
      setSimulationProgress(0);
      setIsSimulating(false);
    },
    [destTarget, isPeakHour, calculateRoute]
  );

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

  // Handle Turn-by-Turn Navigation toggle
  const handleToggleNavigation = useCallback(() => {
    setIsNavOverlayOpen((prev) => {
      const next = !prev;
      if (next && !isSimulating) {
        setIsSimulating(true);
      }
      return next;
    });
  }, [isSimulating]);

  // Handle arbitrary 3D Map Canvas Click
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

  // Active nodes for the 3D Map Viewport based on selected city
  const activeCityNodes = useMemo(() => {
    if (currentCity === 'delhi') {
      return cityNodes && cityNodes.length > 0 ? cityNodes : DELHI_PRIMARY_TRANSIT_HUBS;
    }
    return SCALED_BENGALURU_NODES;
  }, [currentCity, cityNodes]);

  // Combined nodes for HUD dropdowns: primary metro/landmark hubs + snapped custom points
  const hudNodes = useMemo(() => {
    const base = currentCity === 'delhi'
      ? (cityNodes && cityNodes.length > 0 ? cityNodes.slice(0, 35) : [...DELHI_PRIMARY_TRANSIT_HUBS])
      : [...PRIMARY_TRANSIT_HUBS];
    if (snappedOrigin && !base.some((n) => n.id === snappedOrigin.id)) {
      base.unshift(snappedOrigin);
    }
    if (snappedDest && !base.some((n) => n.id === snappedDest.id)) {
      base.unshift(snappedDest);
    }
    return base;
  }, [currentCity, cityNodes, snappedOrigin, snappedDest]);

  const originId = typeof originTarget === 'string' ? originTarget : snappedOrigin?.id || 'origin_point';
  const destId = typeof destTarget === 'string' ? destTarget : snappedDest?.id || 'dest_point';

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 select-none">
      {/* 3D Map Viewport Layer */}
      <Map3DViewport
        nodes={activeCityNodes}
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
        currentCity={currentCity}
        onLocateUser={handleLocateUser}
      />

      {/* Top Left: Pan-India Multi-City Switcher */}
      <div className="absolute top-3.5 left-4 z-30 pointer-events-auto flex items-center gap-2">
        <div className="glass-panel px-3 py-1.5 rounded-2xl flex items-center gap-2.5 border border-slate-200 dark:border-slate-800 shadow-xl backdrop-blur-xl">
          <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800 dark:text-slate-100">
            <span className="text-base leading-none">🇮🇳</span>
            <span>{CITIES[currentCity].name}</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800 hidden sm:inline">
              {CITIES[currentCity].metroBrand}
            </span>
          </div>

          <div className="flex items-center bg-slate-200/80 dark:bg-slate-800/80 p-0.5 rounded-xl text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => handleSwitchCity('bengaluru')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                currentCity === 'bengaluru'
                  ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-cyan-400 shadow-sm font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Bengaluru
            </button>
            <button
              type="button"
              onClick={() => handleSwitchCity('delhi')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                currentCity === 'delhi'
                  ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-cyan-400 shadow-sm font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Delhi NCR
            </button>
          </div>
        </div>
      </div>

      {/* Top Floating Natural Language Search Bar with Voice Input */}
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

      {/* Quick-Action Buttons: Gridlock Incident & Monsoon Flood Shockwaves */}
      <div className="absolute top-3.5 right-48 z-20 pointer-events-auto hidden md:flex items-center gap-2">
        <button
          type="button"
          onClick={handleToggleIncident}
          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-lg flex items-center gap-1.5 border cursor-pointer ${
            activeIncident
              ? 'bg-rose-600 text-white border-rose-400 animate-pulse shadow-rose-900/40'
              : 'glass-panel text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:border-amber-400 hover:text-amber-500'
          }`}
          title={
            currentCity === 'delhi'
              ? '⚡ Trigger severe real-time traffic disruption at Connaught Place Inner Circle'
              : '⚡ Trigger severe real-time traffic disruption at Central Silk Board'
          }
        >
          <Zap className={`w-3.5 h-3.5 ${activeIncident ? 'text-amber-300' : 'text-amber-500'}`} />
          <span>
            {activeIncident
              ? `⚡ Clear Gridlock (${affectedEdgesCount} Edges)`
              : currentCity === 'delhi'
              ? '⚡ Trigger CP Gridlock'
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
          title={
            currentCity === 'delhi'
              ? '🌧️ Trigger severe monsoon flood shockwave across Minto Bridge & Yamuna floodplains'
              : '🌧️ Trigger severe monsoon flood shockwave across low-lying underpasses'
          }
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
        onToggleIncident={handleToggleIncident}
        isMonsoonFlooded={isMonsoonFlooded}
        onToggleMonsoonFlood={handleToggleMonsoonFlood}
        floodedEdgesCount={floodedEdgesCount}
        currentCity={currentCity}
        onStartNavigation={handleToggleNavigation}
        isNavActive={isNavOverlayOpen}
      />

      {/* Mobile & Desktop Turn-by-Turn Commuter Navigation HUD Overlay */}
      <TurnByTurnNavOverlay
        route={selectedRoute}
        isOpen={isNavOverlayOpen}
        onClose={() => setIsNavOverlayOpen(false)}
        simulationProgress={simulationProgress}
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
