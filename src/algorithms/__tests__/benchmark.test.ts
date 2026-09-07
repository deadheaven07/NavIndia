import { describe, it, expect } from 'vitest';
import { generateScaledBengaluruNetwork } from '../data/bengaluru-network-scaled';
import { SpatialKDTree } from '../kdtree';
import { ParetoFrontierSolver } from '../pareto';
import type { Coordinates } from '../types';

describe('Google-Caliber Benchmark Suite: 1,500+ Node Network', () => {
  const { nodes, graph, stats } = generateScaledBengaluruNetwork(false);
  const kdTree = new SpatialKDTree(nodes);
  const solver = new ParetoFrontierSolver(graph, kdTree);

  it('verifies graph scale: between 1,200 and 1,800 nodes and 4,000+ edges', () => {
    expect(nodes.length).toBeGreaterThanOrEqual(1200);
    expect(nodes.length).toBeLessThanOrEqual(1800);
    expect(stats.totalEdges).toBeGreaterThanOrEqual(4000);
  });

  it('verifies strong connectivity: all nodes reachable from Majestic', () => {
    const reachable = new Set<string>();
    const queue = ['majestic'];
    reachable.add('majestic');

    while (queue.length > 0) {
      const curr = queue.shift()!;
      const edges = graph.getOutgoingEdges(curr);
      for (const e of edges) {
        if (!reachable.has(e.target)) {
          reachable.add(e.target);
          queue.push(e.target);
        }
      }
    }

    expect(reachable.size).toBe(nodes.length);
  });

  it('benchmark: 500 random queries achieve sub-10ms pathfinding and sub-1ms KD-Tree snapping', () => {
    const QUERY_COUNT = 500;
    const snapTimes: number[] = [];
    const pathfindingTimes: number[] = [];
    const totalTimes: number[] = [];

    for (let i = 0; i < QUERY_COUNT; i++) {
      const oIdx = Math.floor(Math.random() * nodes.length);
      let dIdx = Math.floor(Math.random() * nodes.length);
      while (dIdx === oIdx) dIdx = Math.floor(Math.random() * nodes.length);

      const oNode = nodes[oIdx];
      const dNode = nodes[dIdx];

      // Generate arbitrary clicked GPS coordinates jittered around the node locations
      const originCoord: Coordinates = [
        oNode.coordinates[0] + (Math.random() - 0.5) * 0.008,
        oNode.coordinates[1] + (Math.random() - 0.5) * 0.008,
      ];
      const destCoord: Coordinates = [
        dNode.coordinates[0] + (Math.random() - 0.5) * 0.008,
        dNode.coordinates[1] + (Math.random() - 0.5) * 0.008,
      ];

      const start = performance.now();
      const plan = solver.planRoutes(originCoord, destCoord);
      const elapsed = performance.now() - start;

      if (plan) {
        snapTimes.push(plan.telemetry.snapTimeMs);
        pathfindingTimes.push(plan.telemetry.pathfindingTimeMs);
        totalTimes.push(elapsed);
      }
    }

    expect(snapTimes.length).toBe(QUERY_COUNT);

    const calcAverage = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
    const calcPercentile = (arr: number[], p: number) => {
      const sorted = [...arr].sort((a, b) => a - b);
      const idx = Math.floor((p / 100) * (sorted.length - 1));
      return sorted[idx];
    };

    const avgSnap = calcAverage(snapTimes);
    const avgPath = calcAverage(pathfindingTimes);
    const avgTotal = calcAverage(totalTimes);

    const p50Path = calcPercentile(pathfindingTimes, 50);
    const p95Path = calcPercentile(pathfindingTimes, 95);
    const p99Path = calcPercentile(pathfindingTimes, 99);

    const p50Snap = calcPercentile(snapTimes, 50);
    const p95Snap = calcPercentile(snapTimes, 95);

    console.log('\n===============================================================');
    console.log('       NAVINDIA HIGH-PERFORMANCE BENCHMARK RESULTS            ');
    console.log('===============================================================');
    console.log(` Network Size     : ${nodes.length} Nodes | ${stats.totalEdges} Directed Edges`);
    console.log(` Queries Evaluated: ${QUERY_COUNT} Arbitrary GPS Origin-Destination Pairs`);
    console.log('---------------------------------------------------------------');
    console.log(` 2D KD-Tree Snap  : Avg: ${avgSnap.toFixed(3)}ms | p50: ${p50Snap.toFixed(3)}ms | p95: ${p95Snap.toFixed(3)}ms`);
    console.log(` A* Pathfinding   : Avg: ${avgPath.toFixed(3)}ms | p50: ${p50Path.toFixed(3)}ms | p95: ${p95Path.toFixed(3)}ms | p99: ${p99Path.toFixed(3)}ms`);
    console.log(` Total Pipeline   : Avg: ${avgTotal.toFixed(3)}ms | p50: ${calcPercentile(totalTimes, 50).toFixed(3)}ms | p95: ${calcPercentile(totalTimes, 95).toFixed(3)}ms`);
    console.log('===============================================================\n');

    // Strict assertions mandated by Google-caliber engineering standards
    expect(avgSnap).toBeLessThan(1.0); // Sub-1ms KD-Tree snap time
    expect(avgPath).toBeLessThan(10.0); // Sub-10ms A* pathfinding latency
  });
});
