import type { TransitNode, TransitEdge, TransitMode, GraphStats } from './types';

/**
 * Weighted Directed Multigraph representing complex Indian multi-modal transit networks.
 * Allows multiple edges between any pair of nodes with distinct modes, travel times, and monetary costs.
 */
export class WeightedDirectedMultigraph {
  private nodes: Map<string, TransitNode> = new Map();
  private adjacencyList: Map<string, TransitEdge[]> = new Map();
  private allEdges: TransitEdge[] = [];

  public addNode(node: TransitNode): void {
    if (!this.nodes.has(node.id)) {
      this.nodes.set(node.id, node);
      this.adjacencyList.set(node.id, []);
    }
  }

  public addEdge(edge: TransitEdge, bidirectional: boolean = true): void {
    if (!this.nodes.has(edge.source) || !this.nodes.has(edge.target)) {
      throw new Error(
        `Cannot add edge ${edge.id}: source (${edge.source}) or target (${edge.target}) does not exist in graph.`
      );
    }

    this.adjacencyList.get(edge.source)!.push(edge);
    this.allEdges.push(edge);

    if (bidirectional) {
      const reversedCoords = edge.pathCoordinates ? [...edge.pathCoordinates].reverse() : undefined;
      const reverseEdge: TransitEdge = {
        ...edge,
        id: `${edge.id}-rev`,
        source: edge.target,
        target: edge.source,
        pathCoordinates: reversedCoords,
      };
      this.adjacencyList.get(edge.target)!.push(reverseEdge);
      this.allEdges.push(reverseEdge);
    }
  }

  public getNode(id: string): TransitNode | undefined {
    return this.nodes.get(id);
  }

  public getOutgoingEdges(id: string): TransitEdge[] {
    return this.adjacencyList.get(id) || [];
  }

  public getAllNodes(): TransitNode[] {
    return Array.from(this.nodes.values());
  }

  public getAllEdges(): TransitEdge[] {
    return this.allEdges;
  }

  public hasNode(id: string): boolean {
    return this.nodes.has(id);
  }

  public getStats(): GraphStats {
    const modeCounts: Record<TransitMode, number> = {
      METRO: 0,
      CAB: 0,
      AUTO: 0,
      BUS: 0,
      WALK: 0,
    };

    let totalKm = 0;
    for (const edge of this.allEdges) {
      modeCounts[edge.mode] = (modeCounts[edge.mode] || 0) + 1;
      totalKm += edge.distanceKm;
    }

    return {
      totalNodes: this.nodes.size,
      totalEdges: this.allEdges.length,
      modeCounts,
      totalNetworkKm: Math.round(totalKm * 10) / 10,
    };
  }
}
