"""
NavIndia (SuperRoute) - Python Core Transit Engine
Standalone implementation of:
1. Weighted Directed Multigraph (Dual-weighted: Time in mins, Cost in INR)
2. 2D Spatial KD-Tree (O(log N) nearest neighbor search)
3. A* Search Algorithm with Euclidean/Haversine Heuristic (Min-Heap driven)
4. Multi-Modal Pareto Frontier Solver (Fastest Cab, Smart Multi-Modal, Budget Bus)
"""

import math
import heapq
import time
from typing import List, Dict, Tuple, Optional, Set

# [Longitude, Latitude]
Coordinates = Tuple[float, float]

class TransitNode:
    def __init__(self, node_id: str, name: str, coordinates: Coordinates, zone: str, node_type: str):
        self.id = node_id
        self.name = name
        self.coordinates = coordinates
        self.zone = zone
        self.type = node_type

    def __repr__(self):
        return f"<Node {self.id}: {self.name}>"

class TransitEdge:
    def __init__(self, edge_id: str, source: str, target: str, mode: str,
                 distance_km: float, time_minutes: float, cost_inr: float,
                 traffic_multiplier: float = 1.0, instruction: str = ""):
        self.id = edge_id
        self.source = source
        self.target = target
        self.mode = mode # METRO, CAB, AUTO, BUS, WALK
        self.distance_km = distance_km
        self.time_minutes = time_minutes
        self.cost_inr = cost_inr
        self.traffic_multiplier = traffic_multiplier
        self.instruction = instruction

def haversine_distance_km(c1: Coordinates, c2: Coordinates) -> float:
    lon1, lat1 = c1
    lon2, lat2 = c2
    R = 6371.0 # Earth's radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

class WeightedDirectedMultigraph:
    def __init__(self):
        self.nodes: Dict[str, TransitNode] = {}
        self.adj: Dict[str, List[TransitEdge]] = {}
        self.edges: List[TransitEdge] = []

    def add_node(self, node: TransitNode):
        if node.id not in self.nodes:
            self.nodes[node.id] = node
            self.adj[node.id] = []

    def add_edge(self, edge: TransitEdge, bidirectional: bool = True):
        self.adj[edge.source].append(edge)
        self.edges.append(edge)
        if bidirectional:
            rev_edge = TransitEdge(
                edge_id=f"{edge.id}-rev",
                source=edge.target,
                target=edge.source,
                mode=edge.mode,
                distance_km=edge.distance_km,
                time_minutes=edge.time_minutes,
                cost_inr=edge.cost_inr,
                traffic_multiplier=edge.traffic_multiplier,
                instruction=edge.instruction
            )
            self.adj[edge.target].append(rev_edge)
            self.edges.append(rev_edge)

    def get_outgoing(self, node_id: str) -> List[TransitEdge]:
        return self.adj.get(node_id, [])

class KDNode:
    def __init__(self, point: TransitNode, axis: int, left=None, right=None):
        self.point = point
        self.axis = axis # 0: lon, 1: lat
        self.left = left
        self.right = right

class SpatialKDTree:
    def __init__(self, nodes: List[TransitNode]):
        self.root = self._build_tree(nodes, depth=0)

    def _build_tree(self, nodes: List[TransitNode], depth: int) -> Optional[KDNode]:
        if not nodes:
            return None
        axis = depth % 2
        nodes_sorted = sorted(nodes, key=lambda n: n.coordinates[axis])
        mid = len(nodes_sorted) // 2
        return KDNode(
            point=nodes_sorted[mid],
            axis=axis,
            left=self._build_tree(nodes_sorted[:mid], depth + 1),
            right=self._build_tree(nodes_sorted[mid + 1:], depth + 1)
        )

    def find_nearest(self, query: Coordinates) -> Tuple[TransitNode, float]:
        best_node = self.root.point
        best_dist = haversine_distance_km(query, best_node.coordinates)

        def search(curr: Optional[KDNode]):
            nonlocal best_node, best_dist
            if not curr:
                return

            dist = haversine_distance_km(query, curr.point.coordinates)
            if dist < best_dist:
                best_dist = dist
                best_node = curr.point

            axis = curr.axis
            diff = query[axis] - curr.point.coordinates[axis]

            first = curr.left if diff < 0 else curr.right
            second = curr.right if diff < 0 else curr.left

            search(first)

            # Earth coordinates approximate degree difference threshold
            plane_diff_km = abs(diff) * 111.0 # ~111km per degree
            if plane_diff_km < best_dist:
                search(second)

        search(self.root)
        return best_node, best_dist

class AStarPathfinder:
    def __init__(self, graph: WeightedDirectedMultigraph):
        self.graph = graph

    def heuristic(self, from_c: Coordinates, to_c: Coordinates, criterion: str) -> float:
        dist_km = haversine_distance_km(from_c, to_c)
        if criterion == 'TIME':
            return dist_km / 1.33 # Max speed ~80km/h
        elif criterion == 'COST':
            return dist_km * 2.0
        return (dist_km / 1.33) + (dist_km * 2.0 * 0.1)

    def find_path(self, start_id: str, target_id: str, criterion: str = 'TIME',
                  allowed_modes: Optional[Set[str]] = None, transfer_penalty: float = 4.0):
        start_node = self.graph.nodes[start_id]
        target_node = self.graph.nodes[target_id]

        # Priority Queue holds (f_score, g_score, node_id, last_mode, path_edges)
        init_h = self.heuristic(start_node.coordinates, target_node.coordinates, criterion)
        pq = [(init_h, 0.0, start_id, None, [])]

        g_scores = {f"{start_id}_NONE": 0.0}

        while pq:
            f, g, u_id, last_mode, edges_so_far = heapq.heappop(pq)
            u_key = f"{u_id}_{last_mode or 'NONE'}"

            if g > g_scores.get(u_key, float('inf')):
                continue

            if u_id == target_id:
                # Calculate summary
                total_duration = sum(e.time_minutes * e.traffic_multiplier for e in edges_so_far)
                total_cost = sum(e.cost_inr for e in edges_so_far)
                total_distance = sum(e.distance_km for e in edges_so_far)
                transfers = sum(1 for i in range(1, len(edges_so_far)) if edges_so_far[i].mode != edges_so_far[i-1].mode)
                total_duration += transfers * transfer_penalty

                return {
                    'edges': edges_so_far,
                    'duration_mins': round(total_duration, 1),
                    'cost_inr': round(total_cost),
                    'distance_km': round(total_distance, 1),
                    'transfers': transfers
                }

            for edge in self.graph.get_outgoing(u_id):
                if allowed_modes and edge.mode not in allowed_modes:
                    continue

                penalty = transfer_penalty if (last_mode and last_mode != edge.mode) else 0.0
                effective_time = edge.time_minutes * edge.traffic_multiplier

                if criterion == 'TIME':
                    step_cost = effective_time + penalty
                elif criterion == 'COST':
                    step_cost = edge.cost_inr
                else: # BALANCED
                    step_cost = effective_time + (edge.cost_inr * 0.12) + (penalty * 1.5)

                tentative_g = g + step_cost
                neighbor_key = f"{edge.target}_{edge.mode}"

                if tentative_g < g_scores.get(neighbor_key, float('inf')):
                    g_scores[neighbor_key] = tentative_g
                    neighbor_node = self.graph.nodes[edge.target]
                    h = self.heuristic(neighbor_node.coordinates, target_node.coordinates, criterion)
                    heapq.heappush(pq, (tentative_g + h, tentative_g, edge.target, edge.mode, edges_so_far + [edge]))

        return None

if __name__ == '__main__':
    # Sample verification
    nodes = [
        TransitNode('majestic', 'Majestic', (77.5726, 12.9774), 'Central', 'METRO'),
        TransitNode('indiranagar', 'Indiranagar', (77.6387, 12.9784), 'East', 'METRO'),
        TransitNode('whitefield', 'Whitefield ITPL', (77.7475, 12.9866), 'East', 'METRO'),
    ]
    graph = WeightedDirectedMultigraph()
    for n in nodes:
        graph.add_node(n)

    # Metro edges
    graph.add_edge(TransitEdge('m1', 'majestic', 'indiranagar', 'METRO', 8.5, 12.0, 25.0))
    graph.add_edge(TransitEdge('m2', 'indiranagar', 'whitefield', 'METRO', 13.5, 20.0, 35.0))
    # Cab direct road
    graph.add_edge(TransitEdge('c1', 'majestic', 'whitefield', 'CAB', 22.0, 48.0, 450.0, 1.6))

    kdtree = SpatialKDTree(nodes)
    nearest, dist = kdtree.find_nearest((77.63, 12.97))
    print(f"2D KD-Tree snapped (77.63, 12.97) -> {nearest.name} ({dist:.2f} km)")

    solver = AStarPathfinder(graph)
    cab_route = solver.find_path('majestic', 'whitefield', criterion='TIME', allowed_modes={'CAB'})
    print(f"Cab Route: {cab_route['duration_mins']} mins, ₹{cab_route['cost_inr']}")

    metro_route = solver.find_path('majestic', 'whitefield', criterion='TIME', allowed_modes={'METRO'})
    print(f"Metro Route: {metro_route['duration_mins']} mins, ₹{metro_route['cost_inr']}")
