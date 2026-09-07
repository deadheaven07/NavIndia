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
  RoutingWorkerOutboundMessage,
  SnapPointMessage,
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
  error: string | null;
  calculateRoute: (
    origin: string | Coordinates,
    destination: string | Coordinates,
    isPeakHour?: boolean
  ) => void;
  setSelectedRoute: (route: RouteOption | null) => void;
  snapCoordinate: (coord: Coordinates) => Promise<{ node: TransitNode; distanceKm: number }>;
}

const DEFAULT_GRAPH_STATS: GraphStats = {
  totalNodes: 1533,
  totalEdges: 12548,
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
  const snapPromisesRef = useRef<
    Map<string, { resolve: (val: { node: TransitNode; distanceKm: number }) => void; reject: (err: Error) => void }>
  >(new Map());

  const [isReady, setIsReady] = useState<boolean>(false);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<RouteOption | null>(null);
  const [telemetry, setTelemetry] = useState<RouteComputationTelemetry | null>(null);
  const [graphStats, setGraphStats] = useState<GraphStats>(DEFAULT_GRAPH_STATS);
  const [snappedOrigin, setSnappedOrigin] = useState<TransitNode | null>(null);
  const [snappedDest, setSnappedDest] = useState<TransitNode | null>(null);
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

        case 'ROUTE_RESULT': {
          // Ignore outdated responses from fast repeated clicks
          if (msg.id === activeRequestIdRef.current) {
            setIsCalculating(false);
            setRoutes(msg.payload.routes);
            setTelemetry(msg.payload.telemetry);
            setSnappedOrigin(msg.payload.snappedOrigin);
            setSnappedDest(msg.payload.snappedDest);
            setError(null);

            // Select Smart Multi-Modal by default if present
            const smart = msg.payload.routes.find((r) => r.archetype === 'SMART_MULTIMODAL');
            setSelectedRoute(smart || msg.payload.routes[0]);
          }
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

  return {
    isReady,
    isCalculating,
    routes,
    selectedRoute,
    telemetry,
    graphStats,
    snappedOrigin,
    snappedDest,
    error,
    calculateRoute,
    setSelectedRoute,
    snapCoordinate,
  };
}
