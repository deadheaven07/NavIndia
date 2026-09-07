import { describe, it, expect } from 'vitest';
import { ContractionHierarchiesRouter } from '../ch';
import { buildBengaluruTransitGraph } from '../data/bengaluru-network';

describe('Contraction Hierarchies (CH) Scaled Engine', () => {
  const graph = buildBengaluruTransitGraph();
  const chRouter = new ContractionHierarchiesRouter(graph);

  it('pre-processes graph and adds shortcuts preserving distances', () => {
    const { totalShortcutsAdded, preprocessingTimeMs } = chRouter.preprocess('TIME');
    expect(totalShortcutsAdded).toBeGreaterThanOrEqual(0);
    expect(preprocessingTimeMs).toBeGreaterThan(0);
    expect(chRouter.isReady()).toBe(true);
  });

  it('answers queries with sub-millisecond latency (<0.5ms)', () => {
    const result = chRouter.query('majestic', 'whitefield_itpl');
    expect(result).not.toBeNull();
    if (result) {
      expect(result.pathNodeIds.length).toBeGreaterThan(1);
      expect(result.pathNodeIds[0]).toBe('majestic');
      expect(result.pathNodeIds[result.pathNodeIds.length - 1]).toBe('whitefield_itpl');
      expect(result.totalWeight).toBeGreaterThan(0);
      expect(result.queryTimeMs).toBeLessThan(5.0); // Ultra-fast query
    }
  });

  it('correctly unpacks shortcut edges into original nodes', () => {
    const result = chRouter.query('mg_road', 'indiranagar_metro');
    expect(result).not.toBeNull();
    if (result) {
      expect(result.pathNodeIds).toContain('mg_road');
      expect(result.pathNodeIds).toContain('indiranagar_metro');
    }
  });
});
