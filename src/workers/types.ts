import type {
  Coordinates,
  GraphStats,
  RouteComputationTelemetry,
  RouteOption,
  TransitNode,
} from '../algorithms/types';

export interface TriggerIncidentPayload {
  center: Coordinates; // [lng, lat]
  radiusKm: number;
  severityMultiplier: number;
  name: string;
}

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

export interface TriggerIncidentMessage {
  type: 'TRIGGER_INCIDENT';
  id?: string;
  payload: TriggerIncidentPayload;
}

export interface ClearIncidentMessage {
  type: 'CLEAR_INCIDENT';
  id?: string;
}

export interface MonsoonFloodPayload {
  floodedZones: {
    name: string;
    center: Coordinates;
    radiusKm: number;
    severityMultiplier: number;
  }[];
}

export interface TriggerMonsoonFloodMessage {
  type: 'TRIGGER_MONSOON_FLOOD';
  id?: string;
  payload?: MonsoonFloodPayload;
}

export interface ClearMonsoonFloodMessage {
  type: 'CLEAR_MONSOON_FLOOD';
  id?: string;
}

export interface GetStatsMessage {
  type: 'GET_STATS';
}

export type RoutingWorkerInboundMessage =
  | CalculateRouteMessage
  | SnapPointMessage
  | SetPeakHourMessage
  | TriggerIncidentMessage
  | ClearIncidentMessage
  | TriggerMonsoonFloodMessage
  | ClearMonsoonFloodMessage
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

export interface IncidentStatusResponse {
  type: 'INCIDENT_STATUS';
  payload: {
    activeIncident: TriggerIncidentPayload | null;
    affectedEdgesCount: number;
  };
}

export interface FloodStatusResponse {
  type: 'FLOOD_STATUS';
  payload: {
    isMonsoonFlooded: boolean;
    floodedEdgesCount: number;
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
  | IncidentStatusResponse
  | FloodStatusResponse
  | WorkerErrorResponse;
