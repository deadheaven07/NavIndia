import { describe, it, expect } from 'vitest';
import { PriorityQueue } from '../priority-queue';
import { SpatialKDTree, haversineDistanceKm } from '../kdtree';
import { ParetoFrontierSolver } from '../pareto';
import { BENGALURU_NODES, buildBengaluruTransitGraph } from '../data/bengaluru-network';

describe('PriorityQueue (Min-Heap)', () => {
  it('should pop elements in strictly ascending order', () => {
    const pq = new PriorityQueue<number>((a, b) => a - b);
    [45, 12, 89, 3, 22, 7, 100, 1].forEach(n => pq.push(n));

    const sorted: number[] = [];
    while (!pq.isEmpty()) {
      sorted.push(pq.pop()!);
    }

    expect(sorted).toEqual([1, 3, 7, 12, 22, 45, 89, 100]);
  });

  it('should return correct size and peek accurately', () => {
    const pq = new PriorityQueue<{ cost: number }>((a, b) => a.cost - b.cost);
    expect(pq.isEmpty()).toBe(true);
    pq.push({ cost: 30 });
    pq.push({ cost: 10 });
    expect(pq.size()).toBe(2);
    expect(pq.peek()).toEqual({ cost: 10 });
  });
});

describe('Spatial 2D KD-Tree', () => {
  it('should correctly snap exact node coordinates to itself in O(log N)', () => {
    const kdTree = new SpatialKDTree(BENGALURU_NODES);
    const indiranagar = BENGALURU_NODES.find(n => n.id === 'indiranagar_metro')!;

    const nearest = kdTree.findNearest(indiranagar.coordinates);
    expect(nearest.node.id).toBe('indiranagar_metro');
    expect(nearest.distanceKm).toBeLessThan(0.01);
  });

  it('should snap an arbitrary GPS coordinate to the closest geographic junction', () => {
    const kdTree = new SpatialKDTree(BENGALURU_NODES);
    // Point near Indiranagar 100ft road: [77.6410, 12.9700]
    const clickedCoord: [number, number] = [77.6410, 12.9700];

    const nearest = kdTree.findNearest(clickedCoord);
    expect(nearest.node.id).toBe('indiranagar_100ft');
    expect(nearest.distanceKm).toBeLessThan(0.2);
  });

  it('matches brute-force linear search on random coordinates', () => {
    const kdTree = new SpatialKDTree(BENGALURU_NODES);

    const testCoords: [number, number][] = [
      [77.6000, 12.9700], // Near MG Road / Cubbon
      [77.6800, 12.9250], // Near Bellandur
      [77.6600, 12.8500], // Near Electronic City
      [77.5800, 13.0300], // Near Hebbal
    ];

    for (const coord of testCoords) {
      const kdResult = kdTree.findNearest(coord);

      // Brute-force linear scan
      let minLinearDist = Infinity;
      let closestNode = BENGALURU_NODES[0];
      for (const node of BENGALURU_NODES) {
        const d = haversineDistanceKm(coord, node.coordinates);
        if (d < minLinearDist) {
          minLinearDist = d;
          closestNode = node;
        }
      }

      expect(kdResult.node.id).toBe(closestNode.id);
    }
  });
});

describe('Weighted Directed Multigraph', () => {
  it('should build graph and store dual-weight multimodal edges correctly', () => {
    const graph = buildBengaluruTransitGraph();
    const stats = graph.getStats();

    expect(stats.totalNodes).toBe(BENGALURU_NODES.length);
    expect(stats.totalEdges).toBeGreaterThan(30);
    expect(stats.modeCounts.METRO).toBeGreaterThan(0);
    expect(stats.modeCounts.CAB).toBeGreaterThan(0);
    expect(stats.modeCounts.AUTO).toBeGreaterThan(0);
    expect(stats.modeCounts.BUS).toBeGreaterThan(0);
  });

  it('should return multiple outgoing edges for a multimodal junction', () => {
    const graph = buildBengaluruTransitGraph();
    const outgoing = graph.getOutgoingEdges('majestic');

    const modes = new Set(outgoing.map(e => e.mode));
    expect(modes.has('METRO')).toBe(true);
    expect(modes.has('CAB')).toBe(true);
    expect(modes.has('BUS')).toBe(true);
  });
});

describe('A* Pathfinding & Multi-Modal Pareto Frontier', () => {
  const graph = buildBengaluruTransitGraph();
  const kdTree = new SpatialKDTree(BENGALURU_NODES);
  const paretoSolver = new ParetoFrontierSolver(graph, kdTree);

  it('should calculate 3 Pareto routes from Majestic to Whitefield ITPL', () => {
    const plan = paretoSolver.planRoutes('majestic', 'whitefield_itpl');
    expect(plan).not.toBeNull();
    expect(plan!.routes.length).toBe(3);

    const cabRoute = plan!.routes.find(r => r.archetype === 'FASTEST_CAB');
    const smartRoute = plan!.routes.find(r => r.archetype === 'SMART_MULTIMODAL');
    const busRoute = plan!.routes.find(r => r.archetype === 'BUDGET_BUS');

    expect(cabRoute).toBeDefined();
    expect(smartRoute).toBeDefined();
    expect(busRoute).toBeDefined();

    // Verification of Pareto trade-offs:
    // 1. Bus should be the cheapest
    expect(busRoute!.totalCostINR).toBeLessThan(cabRoute!.totalCostINR);

    // 2. Smart Multi-Modal uses Metro Purple Line directly bypassing traffic
    expect(smartRoute!.modesUsed.includes('METRO')).toBe(true);

    // 3. Telemetry values should be positive and fast (< 50ms)
    expect(plan!.telemetry.totalPipelineTimeMs).toBeGreaterThan(0);
    expect(plan!.telemetry.totalPipelineTimeMs).toBeLessThan(50);
  });

  it('handles GPS coordinate input using KD-Tree snapping', () => {
    // Click near Indiranagar [77.64, 12.97] to click near Koramangala [77.63, 12.93]
    const plan = paretoSolver.planRoutes([77.64, 12.97], [77.63, 12.93]);
    expect(plan).not.toBeNull();
    expect(plan!.routes.length).toBeGreaterThanOrEqual(1);
    expect(plan!.snappedOriginNodeId).toBe('indiranagar_100ft');
  });
});
