import { WeightedDirectedMultigraph } from './multigraph';
import { PriorityQueue } from './priority-queue';
import { haversineDistanceKm } from './kdtree';
import type { Coordinates, TransitEdge, TransitMode } from './types';

export type SearchCriterion = 'TIME' | 'COST' | 'MULTIMODAL_BALANCED';

export interface AStarConfig {
  criterion: SearchCriterion;
  allowedModes?: TransitMode[];
  modeTransferPenaltyMinutes?: number;
  maxVelocityKmPerMin?: number; // For admissible time heuristic (~80 km/h = 1.33 km/min)
}

export interface AStarResult {
  pathNodeIds: string[];
  edges: TransitEdge[];
  totalDurationMinutes: number;
  totalCostINR: number;
  totalDistanceKm: number;
  transfersCount: number;
  visitedNodesCount: number;
}

interface SearchNode {
  nodeId: string;
  gScore: number; // Cost from start to current node
  fScore: number; // gScore + heuristic
  lastMode?: TransitMode;
  incomingEdge?: TransitEdge;
}

/**
 * A* Pathfinding Engine for Multi-Modal Indian Transit Networks.
 * Uses a Binary Min-Heap Priority Queue and an admissible geospatial Euclidean/Haversine heuristic.
 */
export class AStarPathfinder {
  private graph: WeightedDirectedMultigraph;

  constructor(graph: WeightedDirectedMultigraph) {
    this.graph = graph;
  }

  /**
   * Admissible Heuristic: Computes minimum estimated remaining cost from node to target.
   */
  private heuristic(
    fromCoord: Coordinates,
    targetCoord: Coordinates,
    criterion: SearchCriterion,
    maxVelocityKmPerMin: number = 1.33 // ~80 km/h
  ): number {
    const distKm = haversineDistanceKm(fromCoord, targetCoord);

    switch (criterion) {
      case 'TIME':
        // Admissible: Distance divided by maximum possible transit speed
        return distKm / maxVelocityKmPerMin;
      case 'COST':
        // Admissible lower bound: ~₹2.5/km (lowest Indian transit bus rate)
        return distKm * 2.0;
      case 'MULTIMODAL_BALANCED':
        // Balanced combination
        return (distKm / maxVelocityKmPerMin) + (distKm * 2.0 * 0.1);
    }
  }

  /**
   * Calculates the edge traversal cost based on the search criterion and transfer penalty.
   */
  private calculateEdgeCost(
    edge: TransitEdge,
    prevMode: TransitMode | undefined,
    config: AStarConfig
  ): number {
    let cost = 0;
    const effectiveTime = edge.timeMinutes * (edge.trafficMultiplier || 1.0);

    // Mode transfer penalty (e.g. alighting from Auto and entering Metro station)
    let transferPenalty = 0;
    if (prevMode && prevMode !== edge.mode) {
      transferPenalty = config.modeTransferPenaltyMinutes ?? 4.0;
    }

    switch (config.criterion) {
      case 'TIME':
        cost = effectiveTime + transferPenalty;
        break;
      case 'COST':
        cost = edge.costINR;
        break;
      case 'MULTIMODAL_BALANCED':
        // Joint optimization: time in mins + normalized cost (₹10 = 1 min) + transfer resistance
        cost = effectiveTime + (edge.costINR * 0.12) + (transferPenalty * 1.5);
        break;
    }

    return cost;
  }

  /**
   * Solves shortest path from startNodeId to targetNodeId using A*.
   */
  public findPath(
    startNodeId: string,
    targetNodeId: string,
    config: AStarConfig
  ): AStarResult | null {
    const startNode = this.graph.getNode(startNodeId);
    const targetNode = this.graph.getNode(targetNodeId);

    if (!startNode || !targetNode) {
      return null;
    }

    if (startNodeId === targetNodeId) {
      return {
        pathNodeIds: [startNodeId],
        edges: [],
        totalDurationMinutes: 0,
        totalCostINR: 0,
        totalDistanceKm: 0,
        transfersCount: 0,
        visitedNodesCount: 1,
      };
    }

    const pq = new PriorityQueue<SearchNode>((a, b) => a.fScore - b.fScore);

    // Track best gScores and predecessors: key format is `${nodeId}_${lastMode || 'NONE'}`
    const gScores = new Map<string, number>();
    const cameFrom = new Map<string, { prevKey: string; edge: TransitEdge }>();
    const visitedNodes = new Set<string>();

    const initialKey = `${startNodeId}_NONE`;
    gScores.set(initialKey, 0);

    const initialH = this.heuristic(
      startNode.coordinates,
      targetNode.coordinates,
      config.criterion,
      config.maxVelocityKmPerMin
    );

    pq.push({
      nodeId: startNodeId,
      gScore: 0,
      fScore: initialH,
      lastMode: undefined,
    });

    let bestEndKey: string | null = null;

    while (!pq.isEmpty()) {
      const current = pq.pop()!;
      visitedNodes.add(current.nodeId);

      const currentKey = `${current.nodeId}_${current.lastMode || 'NONE'}`;

      // If we popped a sub-optimal entry that was superseded in gScores, skip
      if (current.gScore > (gScores.get(currentKey) ?? Infinity)) {
        continue;
      }

      // Check if target reached
      if (current.nodeId === targetNodeId) {
        bestEndKey = currentKey;
        break;
      }

      const outgoing = this.graph.getOutgoingEdges(current.nodeId);
      for (const edge of outgoing) {
        // Filter by allowed modes if specified
        if (config.allowedModes && !config.allowedModes.includes(edge.mode)) {
          continue;
        }

        const stepCost = this.calculateEdgeCost(edge, current.lastMode, config);
        const tentativeG = current.gScore + stepCost;
        const neighborKey = `${edge.target}_${edge.mode}`;

        if (tentativeG < (gScores.get(neighborKey) ?? Infinity)) {
          gScores.set(neighborKey, tentativeG);
          cameFrom.set(neighborKey, { prevKey: currentKey, edge });

          const neighborNode = this.graph.getNode(edge.target);
          if (!neighborNode) continue;

          const h = this.heuristic(
            neighborNode.coordinates,
            targetNode.coordinates,
            config.criterion,
            config.maxVelocityKmPerMin
          );

          pq.push({
            nodeId: edge.target,
            gScore: tentativeG,
            fScore: tentativeG + h,
            lastMode: edge.mode,
            incomingEdge: edge,
          });
        }
      }
    }

    if (!bestEndKey) {
      return null;
    }

    // Reconstruct path
    const pathEdges: TransitEdge[] = [];
    const pathNodeIds: string[] = [targetNodeId];
    let currKey = bestEndKey;

    while (cameFrom.has(currKey)) {
      const step = cameFrom.get(currKey)!;
      pathEdges.unshift(step.edge);
      pathNodeIds.unshift(step.edge.source);
      currKey = step.prevKey;
    }

    // Compute totals
    let totalDuration = 0;
    let totalCost = 0;
    let totalDistance = 0;
    let transfers = 0;
    let previousMode: TransitMode | undefined = undefined;

    for (const edge of pathEdges) {
      totalDuration += edge.timeMinutes * (edge.trafficMultiplier || 1.0);
      totalCost += edge.costINR;
      totalDistance += edge.distanceKm;

      if (previousMode && previousMode !== edge.mode) {
        transfers++;
        totalDuration += config.modeTransferPenaltyMinutes ?? 4.0;
      }
      previousMode = edge.mode;
    }

    return {
      pathNodeIds,
      edges: pathEdges,
      totalDurationMinutes: Math.round(totalDuration * 10) / 10,
      totalCostINR: Math.round(totalCost),
      totalDistanceKm: Math.round(totalDistance * 10) / 10,
      transfersCount: transfers,
      visitedNodesCount: visitedNodes.size,
    };
  }
}
