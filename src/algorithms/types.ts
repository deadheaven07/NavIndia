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
