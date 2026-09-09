import { describe, it, expect } from 'vitest';
import { generateScaledDelhiNetwork } from '../data/delhi-network-scaled';
import { SpatialKDTree } from '../kdtree';
import { ParetoFrontierSolver } from '../pareto';

describe('Delhi NCR Multimodal Transit Network', () => {
  const { nodes, graph, stats } = generateScaledDelhiNetwork(false);
  const kdTree = new SpatialKDTree(nodes);
  const solver = new ParetoFrontierSolver(graph, kdTree);

  it('builds Delhi NCR network with Metro, Road and Landmark nodes', () => {
    expect(nodes.length).toBeGreaterThan(50);
    expect(stats.totalEdges).toBeGreaterThan(100);
    expect(stats.modeCounts.METRO).toBeGreaterThan(0);
    expect(stats.modeCounts.CAB).toBeGreaterThan(0);
  });

  it('finds valid multimodal route from Rajiv Chowk (Connaught Place) to DLF Cyber City Gurugram', () => {
    const plan = solver.planRoutes('delhi_rajiv_chowk', 'delhi_cyber_city');
    expect(plan).not.toBeNull();
    if (plan) {
      expect(plan.routes.length).toBeGreaterThanOrEqual(2);
      const fastestCab = plan.routes.find((r) => r.archetype === 'FASTEST_CAB');
      const multimodal = plan.routes.find((r) => r.archetype === 'SMART_MULTIMODAL');
      expect(fastestCab).toBeDefined();
      expect(multimodal).toBeDefined();
      // Distance from CP to Cyber City is ~24-28km
      expect(fastestCab!.totalDistanceKm).toBeGreaterThan(15);
      expect(fastestCab!.totalDistanceKm).toBeLessThan(40);
    }
  });

  it('finds Airport Express route from New Delhi Railway Station to IGI Airport T3', () => {
    const plan = solver.planRoutes('delhi_new_delhi', 'delhi_igi_airport_t3');
    expect(plan).not.toBeNull();
    if (plan) {
      const metroRoute = plan.routes.find((r) => r.modesUsed.includes('METRO'));
      expect(metroRoute).toBeDefined();
      expect(metroRoute!.totalDurationMinutes).toBeLessThan(45);
    }
  });
});
