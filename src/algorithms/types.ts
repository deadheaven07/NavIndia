export type TransitMode = 'METRO' | 'CAB' | 'AUTO' | 'BUS' | 'WALK';

export type Coordinates = [number, number]; // [longitude, latitude]

export interface TransitNode {
  id: string;
  name: string;
  coordinates: Coordinates;
  zone: string;
  type: 'METRO_STATION' | 'JUNCTION' | 'BUS_TERMINAL' | 'TECH_PARK' | 'LANDMARK';
  description?: string;
  metroLine?: 'PURPLE' | 'GREEN';
}

export interface TransitEdge {
  id: string;
  source: string;
  target: string;
  mode: TransitMode;
  distanceKm: number;
  timeMinutes: number;
  costINR: number;
  trafficMultiplier: number;
  pathCoordinates?: Coordinates[];
  metroLineName?: string;
  instruction?: string;
  surgeMultiplier?: number;
  co2Grams?: number;
  isFlooded?: boolean;
}

export interface TriggerIncidentPayload {
  center: Coordinates; // [lng, lat]
  radiusKm: number;
  severityMultiplier: number;
  name: string;
}

export interface MonsoonFloodZone {
  name: string;
  center: Coordinates;
  radiusKm: number;
  severityMultiplier: number;
}

export interface RouteLeg {
  mode: TransitMode;
  fromNode: TransitNode;
  toNode: TransitNode;
  distanceKm: number;
  durationMinutes: number;
  costINR: number;
  trafficMultiplier: number;
  instruction: string;
  pathCoordinates: Coordinates[];
  co2Grams?: number;
  surgeMultiplier?: number;
  isFlooded?: boolean;
}

export type RouteArchetype = 'FASTEST_CAB' | 'SMART_MULTIMODAL' | 'BUDGET_BUS';

export interface RouteOption {
  id: string;
  archetype: RouteArchetype;
  title: string;
  subtitle: string;
  tag: string;
  accentColor: string; // Hex or CSS color
  glowClass: string;
  totalDurationMinutes: number;
  totalCostINR: number;
  totalDistanceKm: number;
  transfersCount: number;
  carbonKg: number;
  co2Grams?: number;
  isSurgeApplied?: boolean;
  isFloodedRoute?: boolean;
  caloriesBurned: number;
  arrivalEta: string;
  legs: RouteLeg[];
  fullGeometry: Coordinates[];
  modesUsed: TransitMode[];
  fareBreakdown: { mode: TransitMode; cost: number }[];
}

export interface GraphStats {
  totalNodes: number;
  totalEdges: number;
  modeCounts: Record<TransitMode, number>;
  totalNetworkKm: number;
}

export interface RouteComputationTelemetry {
  snapTimeMs: number;
  pathfindingTimeMs: number;
  paretoEvaluationTimeMs: number;
  totalPipelineTimeMs: number;
  visitedNodesCount: number;
  pruningEfficiencyPercent: number;
  paretoCandidatesEvaluated: number;
  paretoNonDominatedCount: number;
  graphTotalNodes: number;
  workerIpcRoundtripMs?: number;
}
