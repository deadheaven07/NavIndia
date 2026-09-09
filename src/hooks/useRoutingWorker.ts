import { useState, useEffect, useRef, useCallback } from 'react';
import type {
  Coordinates,
  GraphStats,
  RouteComputationTelemetry,
  RouteOption,
  TransitNode,
} from '../algorithms/types';
import type {
  CalculateRouteMessage,
  ClearIncidentMessage,
  RoutingWorkerOutboundMessage,
  SnapPointMessage,
  TriggerIncidentMessage,
  TriggerIncidentPayload,
} from '../workers/types';

export interface UseRoutingWorkerReturn {
  isReady: boolean;
  isCalculating: boolean;
  routes: RouteOption[];
  selectedRoute: RouteOption | null;
  telemetry: RouteComputationTelemetry | null;
  graphStats: GraphStats;
  snappedOrigin: TransitNode | null;
  snappedDest: TransitNode | null;
  activeIncident: TriggerIncidentPayload | null;
  affectedEdgesCount: number;
  isMonsoonFlooded: boolean;
  floodedEdgesCount: number;
  error: string | null;
  currentCity: 'bengaluru' | 'delhi';
  cityNodes: TransitNode[] | null;
  switchCity: (cityId: 'bengaluru' | 'delhi') => void;
  calculateRoute: (
    origin: string | Coordinates,
    destination: string | Coordinates,
    isPeakHour?: boolean
  ) => void;
  triggerIncident: (payload: TriggerIncidentPayload) => void;
  clearIncident: () => void;
  triggerMonsoonFlood: () => void;
  clearMonsoonFlood: () => void;
  setSelectedRoute: (route: RouteOption | null) => void;
  snapCoordinate: (coord: Coordinates) => Promise<{ node: TransitNode; distanceKm: number }>;
}

const DEFAULT_GRAPH_STATS: GraphStats = {
  totalNodes: 1567,
  totalEdges: 11986,
  totalNetworkKm: 4451.6,
  modeCounts: {
    METRO: 122,
    CAB: 6004,
    AUTO: 5178,
    BUS: 736,
    WALK: 508,
  },
};

export function useRoutingWorker(): UseRoutingWorkerReturn {
  const workerRef = useRef<Worker | null>(null);
  const activeRequestIdRef = useRef<string | null>(null);
  const requestStartTimesRef = useRef<Map<string, number>>(new Map());
  const snapPromisesRef = useRef<
    Map<string, { resolve: (val: { node: TransitNode; distanceKm: number }) => void; reject: (err: Error) => void }>
  >(new Map());

  const [isReady, setIsReady] = useState<boolean>(false);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<RouteOption | null>(null);
  const [telemetry, setTelemetry] = useState<RouteComputationTelemetry | null>(null);
  const [graphStats, setGraphStats] = useState<GraphStats>(DEFAULT_GRAPH_STATS);
  const [currentCity, setCurrentCity] = useState<'bengaluru' | 'delhi'>('bengaluru');
  const [cityNodes, setCityNodes] = useState<TransitNode[] | null>(null);
  const [snappedOrigin, setSnappedOrigin] = useState<TransitNode | null>(null);
  const [snappedDest, setSnappedDest] = useState<TransitNode | null>(null);
  const [activeIncident, setActiveIncident] = useState<TriggerIncidentPayload | null>(null);
  const [affectedEdgesCount, setAffectedEdgesCount] = useState<number>(0);
  const [isMonsoonFlooded, setIsMonsoonFlooded] = useState<boolean>(false);
  const [floodedEdgesCount, setFloodedEdgesCount] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  // Initialize Web Worker
  useEffect(() => {
    const worker = new Worker(
      new URL('../workers/routing.worker.ts', import.meta.url),
      { type: 'module' }
    );
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<RoutingWorkerOutboundMessage>) => {
      const msg = event.data;

      switch (msg.type) {
        case 'WORKER_READY': {
          setIsReady(true);
          setGraphStats(msg.payload.graphStats);
          break;
        }

        case 'CITY_SWITCHED': {
          setCurrentCity(msg.payload.cityId);
          setGraphStats(msg.payload.graphStats);
          setCityNodes(msg.payload.nodes);
          setRoutes([]);
          setSelectedRoute(null);
          setSnappedOrigin(null);
          setSnappedDest(null);
          setIsCalculating(false);
          break;
        }

        case 'INCIDENT_STATUS': {
          setActiveIncident(msg.payload.activeIncident);
          setAffectedEdgesCount(msg.payload.affectedEdgesCount);
          break;
        }

        case 'FLOOD_STATUS': {
          setIsMonsoonFlooded(msg.payload.isMonsoonFlooded);
          setFloodedEdgesCount(msg.payload.floodedEdgesCount);
          break;
        }

        case 'ROUTE_RESULT': {
          // Compute Worker IPC Roundtrip latency
          const startTime = requestStartTimesRef.current.get(msg.id);
          const roundtripMs = startTime
            ? Math.round((performance.now() - startTime) * 10) / 10
            : Math.round((msg.payload.telemetry.totalPipelineTimeMs + 0.5) * 10) / 10;
          requestStartTimesRef.current.delete(msg.id);

          const fullTelemetry: RouteComputationTelemetry = {
            ...msg.payload.telemetry,
            workerIpcRoundtripMs: roundtripMs,
          };

          setIsCalculating(false);
          setRoutes(msg.payload.routes);
          setTelemetry(fullTelemetry);
          setSnappedOrigin(msg.payload.snappedOrigin);
          setSnappedDest(msg.payload.snappedDest);
          setError(null);

          // Select Smart Multi-Modal by default if present
          const smart = msg.payload.routes.find((r) => r.archetype === 'SMART_MULTIMODAL');
          setSelectedRoute(smart || msg.payload.routes[0]);
          break;
        }

        case 'SNAP_RESULT': {
          const promise = snapPromisesRef.current.get(msg.id);
          if (promise) {
            promise.resolve(msg.payload);
            snapPromisesRef.current.delete(msg.id);
          }
          break;
        }

        case 'ERROR': {
          if (!msg.id || msg.id === activeRequestIdRef.current) {
            setIsCalculating(false);
            setError(msg.payload.message);
          }
          if (msg.id && snapPromisesRef.current.has(msg.id)) {
            snapPromisesRef.current.get(msg.id)!.reject(new Error(msg.payload.message));
            snapPromisesRef.current.delete(msg.id);
          }
          break;
        }
      }
    };

    worker.onerror = (err) => {
      console.error('Routing Web Worker fatal error:', err);
      setError('Routing Web Worker encountered an error.');
      setIsCalculating(false);
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  // Dispatch route calculation off the main thread
  const calculateRoute = useCallback(
    (
      origin: string | Coordinates,
      destination: string | Coordinates,
      isPeakHour: boolean = false
    ) => {
      if (!workerRef.current) return;

      const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      activeRequestIdRef.current = requestId;
      requestStartTimesRef.current.set(requestId, performance.now());
      setIsCalculating(true);
      setError(null);

      const msg: CalculateRouteMessage = {
        type: 'CALCULATE_ROUTE',
        id: requestId,
        payload: {
          origin,
          destination,
          isPeakHour,
        },
      };

      workerRef.current.postMessage(msg);
    },
    []
  );

  // Trigger dynamic spatial traffic incident (e.g. Silk Board Gridlock)
  const triggerIncident = useCallback((payload: TriggerIncidentPayload) => {
    if (!workerRef.current) return;

    setIsCalculating(true);
    const msg: TriggerIncidentMessage = {
      type: 'TRIGGER_INCIDENT',
      payload,
    };
    workerRef.current.postMessage(msg);
  }, []);

  // Clear active traffic incident
  const clearIncident = useCallback(() => {
    if (!workerRef.current) return;

    setIsCalculating(true);
    const msg: ClearIncidentMessage = {
      type: 'CLEAR_INCIDENT',
    };
    workerRef.current.postMessage(msg);
  }, []);

  // Trigger Monsoon Flood Shockwave across low-lying Bengaluru basins
  const triggerMonsoonFlood = useCallback(() => {
    if (!workerRef.current) return;

    setIsCalculating(true);
    workerRef.current.postMessage({
      type: 'TRIGGER_MONSOON_FLOOD',
    });
  }, []);

  // Clear Monsoon Flood
  const clearMonsoonFlood = useCallback(() => {
    if (!workerRef.current) return;

    setIsCalculating(true);
    workerRef.current.postMessage({
      type: 'CLEAR_MONSOON_FLOOD',
    });
  }, []);

  // Snap arbitrary coordinate to junction via KD-Tree on background thread
  const snapCoordinate = useCallback((coord: Coordinates): Promise<{ node: TransitNode; distanceKm: number }> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        reject(new Error('Routing worker not initialized.'));
        return;
      }

      const snapId = `snap_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      snapPromisesRef.current.set(snapId, { resolve, reject });

      const msg: SnapPointMessage = {
        type: 'SNAP_POINT',
        id: snapId,
        payload: { coord },
      };

      workerRef.current.postMessage(msg);
    });
  }, []);

  // Switch active city in Web Worker
  const switchCity = useCallback((cityId: 'bengaluru' | 'delhi') => {
    if (!workerRef.current) return;
    workerRef.current.postMessage({
      type: 'SWITCH_CITY',
      payload: { cityId },
    });
  }, []);

  return {
    isReady,
    isCalculating,
    routes,
    selectedRoute,
    telemetry,
    graphStats,
    currentCity,
    cityNodes,
    switchCity,
    snappedOrigin,
    snappedDest,
    activeIncident,
    affectedEdgesCount,
    isMonsoonFlooded,
    floodedEdgesCount,
    error,
    calculateRoute,
    triggerIncident,
    clearIncident,
    triggerMonsoonFlood,
    clearMonsoonFlood,
    setSelectedRoute,
    snapCoordinate,
  };
}
