import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  BENGALURU_NODES,
  buildBengaluruTransitGraph,
} from './algorithms/data/bengaluru-network';
import { SpatialKDTree } from './algorithms/kdtree';
import { ParetoFrontierSolver } from './algorithms/pareto';
import type {
  Coordinates,
  RouteOption,
  RouteComputationTelemetry,
} from './algorithms/types';
import { Map3DViewport } from './components/map/Map3DViewport';
import { HUDDeck } from './components/hud/HUDDeck';
import { LatencyHUD } from './components/hud/LatencyHUD';

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

  // Graph and KD-Tree instances (memoized for performance)
  const [isPeakHour, setIsPeakHour] = useState<boolean>(false);

  const graph = useMemo(() => {
    const g = buildBengaluruTransitGraph();
    // If peak hour is enabled, increase traffic multipliers on road edges
    if (isPeakHour) {
      for (const edge of g.getAllEdges()) {
        if (edge.mode === 'CAB' || edge.mode === 'AUTO' || edge.mode === 'BUS') {
          edge.trafficMultiplier = (edge.trafficMultiplier || 1.2) * 1.55;
        }
      }
    }
    return g;
  }, [isPeakHour]);

  const kdTree = useMemo(() => new SpatialKDTree(BENGALURU_NODES), []);
  const paretoSolver = useMemo(() => new ParetoFrontierSolver(graph, kdTree), [graph, kdTree]);
  const graphStats = useMemo(() => graph.getStats(), [graph]);

  // Routing State
  const [originNodeId, setOriginNodeId] = useState<string>('majestic');
  const [destNodeId, setDestNodeId] = useState<string>('whitefield_itpl');
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<RouteOption | null>(null);
  const [telemetry, setTelemetry] = useState<RouteComputationTelemetry | null>(null);

  // 3D Path Simulation State
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simulationProgress, setSimulationProgress] = useState<number>(0);
  const simulationRef = useRef<number | null>(null);

  // Compute Pareto Routes whenever origin, destination, or traffic multiplier changes
  const computeRoutes = useCallback(() => {
    if (!originNodeId || !destNodeId) return;

    const result = paretoSolver.planRoutes(originNodeId, destNodeId);
    if (result && result.routes.length > 0) {
      setRoutes(result.routes);
      setTelemetry(result.telemetry);

      // Select Smart Multi-Modal by default if available, otherwise first
      const smartRoute = result.routes.find((r) => r.archetype === 'SMART_MULTIMODAL');
      const targetRoute = smartRoute || result.routes[0];
      setSelectedRoute(targetRoute);
      setSimulationProgress(0);
      setIsSimulating(false);
    }
  }, [originNodeId, destNodeId, paretoSolver]);

  useEffect(() => {
    computeRoutes();
  }, [computeRoutes]);

  // Simulation Animation Loop
  useEffect(() => {
    if (!isSimulating) {
      if (simulationRef.current) cancelAnimationFrame(simulationRef.current);
      return;
    }

    let lastTime = performance.now();
    const speed = 0.08; // Duration ~12 seconds to complete full route

    const loop = (now: number) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      setSimulationProgress((prev) => {
        const next = prev + speed * delta;
        if (next >= 1.0) {
          setIsSimulating(false);
          return 1.0;
        }
        return next;
      });

      simulationRef.current = requestAnimationFrame(loop);
    };

    simulationRef.current = requestAnimationFrame(loop);

    return () => {
      if (simulationRef.current) cancelAnimationFrame(simulationRef.current);
    };
  }, [isSimulating]);

  // Handle Map Coordinate Click: Snap to closest node via KD-Tree
  const handleMapCoordinateClick = (coord: Coordinates) => {
    const snapResult = kdTree.findNearest(coord);
    const clickedNodeId = snapResult.node.id;

    if (clickedNodeId === originNodeId) {
      return;
    }
    setDestNodeId(clickedNodeId);
  };

  const handleSwapNodes = () => {
    const temp = originNodeId;
    setOriginNodeId(destNodeId);
    setDestNodeId(temp);
  };

  const originNode = useMemo(
    () => graph.getNode(originNodeId) || null,
    [graph, originNodeId]
  );
  const destNode = useMemo(
    () => graph.getNode(destNodeId) || null,
    [graph, destNodeId]
  );

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 select-none">
      {/* 3D Map Viewport Layer */}
      <Map3DViewport
        nodes={BENGALURU_NODES}
        selectedRoute={selectedRoute}
        originNode={originNode}
        destNode={destNode}
        onMapCoordinateClick={handleMapCoordinateClick}
        simulationProgress={simulationProgress}
        isSimulating={isSimulating}
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode(!isDarkMode)}
      />

      {/* Top Telemetry HUD */}
      <LatencyHUD telemetry={telemetry} graphStats={graphStats} />

      {/* Navigation HUD Deck Cockpit */}
      <HUDDeck
        nodes={BENGALURU_NODES}
        originNodeId={originNodeId}
        destNodeId={destNodeId}
        onOriginChange={setOriginNodeId}
        onDestChange={setDestNodeId}
        onSwapNodes={handleSwapNodes}
        routes={routes}
        selectedRoute={selectedRoute}
        onSelectRoute={(route) => {
          setSelectedRoute(route);
          setSimulationProgress(0);
          setIsSimulating(false);
        }}
        isSimulating={isSimulating}
        onToggleSimulation={() => setIsSimulating(!isSimulating)}
        onResetSimulation={() => {
          setIsSimulating(false);
          setSimulationProgress(0);
        }}
        simulationProgress={simulationProgress}
        isPeakHour={isPeakHour}
        onTogglePeakHour={() => setIsPeakHour(!isPeakHour)}
      />
    </div>
  );
}

export default App;
