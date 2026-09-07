import type {
  Coordinates,
  GraphStats,
  RouteComputationTelemetry,
  RouteOption,
  TransitNode,
} from '../algorithms/types';

// Inbound messages (Main Thread -> Worker)
export interface CalculateRouteMessage {
  type: 'CALCULATE_ROUTE';
  id: string;
  payload: {
    origin: string | Coordinates;
    destination: string | Coordinates;
    isPeakHour?: boolean;
  };
}

export interface SnapPointMessage {
  type: 'SNAP_POINT';
  id: string;
  payload: {
    coord: Coordinates;
  };
}

export interface SetPeakHourMessage {
  type: 'SET_PEAK_HOUR';
  payload: {
    isPeakHour: boolean;
  };
}

export interface GetStatsMessage {
  type: 'GET_STATS';
}

export type RoutingWorkerInboundMessage =
  | CalculateRouteMessage
  | SnapPointMessage
  | SetPeakHourMessage
  | GetStatsMessage;

// Outbound messages (Worker -> Main Thread)
export interface WorkerReadyResponse {
  type: 'WORKER_READY';
  payload: {
    graphStats: GraphStats;
    nodeCount: number;
    edgeCount: number;
  };
}

export interface RouteResultResponse {
  type: 'ROUTE_RESULT';
  id: string;
  payload: {
    routes: RouteOption[];
    telemetry: RouteComputationTelemetry;
    snappedOrigin: TransitNode;
    snappedDest: TransitNode;
  };
}

export interface SnapResultResponse {
  type: 'SNAP_RESULT';
  id: string;
  payload: {
    node: TransitNode;
    distanceKm: number;
  };
}

export interface WorkerErrorResponse {
  type: 'ERROR';
  id?: string;
  payload: {
    message: string;
  };
}

export type RoutingWorkerOutboundMessage =
  | WorkerReadyResponse
  | RouteResultResponse
  | SnapResultResponse
  | WorkerErrorResponse;
