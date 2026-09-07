import type { Coordinates, TransitNode } from './types';

interface KDNode {
  point: TransitNode;
  left: KDNode | null;
  right: KDNode | null;
  axis: number; // 0 for longitude, 1 for latitude
}

/**
 * Calculates great-circle distance between two geographic coordinates using Haversine formula (km).
 */
export function haversineDistanceKm(coord1: Coordinates, coord2: Coordinates): number {
  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;

  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Quick Euclidean approximation for fast branch pruning in 2D KD-Tree (scaled for latitude).
 */
function fastDistanceSq(c1: Coordinates, c2: Coordinates): number {
  const dx = (c1[0] - c2[0]) * Math.cos(((c1[1] + c2[1]) / 2) * (Math.PI / 180));
  const dy = c1[1] - c2[1];
  return dx * dx + dy * dy;
}

/**
 * 2D KD-Tree for snapping GPS coordinates to the nearest graph junction in O(log N) time.
 */
export class SpatialKDTree {
  private root: KDNode | null = null;
  private totalNodes: number = 0;

  constructor(nodes: TransitNode[]) {
    this.totalNodes = nodes.length;
    this.root = this.buildTree(nodes, 0);
  }

  private buildTree(nodes: TransitNode[], depth: number): KDNode | null {
    if (nodes.length === 0) return null;

    const axis = depth % 2; // 0: longitude, 1: latitude

    // Sort by coordinate along current axis
    const sorted = [...nodes].sort((a, b) => a.coordinates[axis] - b.coordinates[axis]);
    const medianIndex = Math.floor(sorted.length / 2);

    return {
      point: sorted[medianIndex],
      axis,
      left: this.buildTree(sorted.slice(0, medianIndex), depth + 1),
      right: this.buildTree(sorted.slice(medianIndex + 1), depth + 1),
    };
  }

  /**
   * Snaps a query coordinate to the nearest TransitNode in O(log N) time.
   */
  public findNearest(query: Coordinates): { node: TransitNode; distanceKm: number } {
    if (!this.root) {
      throw new Error('KD-Tree is empty.');
    }

    let bestNode = this.root.point;
    let bestDistSq = fastDistanceSq(query, bestNode.coordinates);

    const search = (current: KDNode | null) => {
      if (!current) return;

      const currentDistSq = fastDistanceSq(query, current.point.coordinates);
      if (currentDistSq < bestDistSq) {
        bestDistSq = currentDistSq;
        bestNode = current.point;
      }

      const axis = current.axis;
      const diff = query[axis] - current.point.coordinates[axis];

      // Determine which branch to explore first
      const first = diff < 0 ? current.left : current.right;
      const second = diff < 0 ? current.right : current.left;

      search(first);

      // Check if candidate sphere crosses the splitting plane
      const planeDiffSq = diff * diff;
      if (planeDiffSq < bestDistSq) {
        search(second);
      }
    };

    search(this.root);

    const actualDistKm = haversineDistanceKm(query, bestNode.coordinates);
    return {
      node: bestNode,
      distanceKm: Math.round(actualDistKm * 100) / 100,
    };
  }

  /**
   * Finds k-nearest nodes within maxRadiusKm
   */
  public findKNearest(query: Coordinates, k: number = 3): { node: TransitNode; distanceKm: number }[] {
    if (!this.root || k <= 0) return [];

    const candidates: { node: TransitNode; distSq: number }[] = [];

    const search = (current: KDNode | null) => {
      if (!current) return;

      const distSq = fastDistanceSq(query, current.point.coordinates);
      candidates.push({ node: current.point, distSq });

      const axis = current.axis;
      const diff = query[axis] - current.point.coordinates[axis];

      const first = diff < 0 ? current.left : current.right;
      const second = diff < 0 ? current.right : current.left;

      search(first);
      search(second);
    };

    search(this.root);

    return candidates
      .sort((a, b) => a.distSq - b.distSq)
      .slice(0, k)
      .map((c) => ({
        node: c.node,
        distanceKm: Math.round(haversineDistanceKm(query, c.node.coordinates) * 100) / 100,
      }));
  }

  public size(): number {
    return this.totalNodes;
  }
}
