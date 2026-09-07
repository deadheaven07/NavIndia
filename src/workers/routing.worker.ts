import { generateScaledBengaluruNetwork } from '../algorithms/data/bengaluru-network-scaled';
import { SpatialKDTree } from '../algorithms/kdtree';
import { ParetoFrontierSolver } from '../algorithms/pareto';
import type { Coordinates } from '../algorithms/types';
import type {
  RoutingWorkerInboundMessage,
  RoutingWorkerOutboundMessage,
  TriggerIncidentPayload,
} from './types';

// State maintained inside dedicated worker background thread
let isPeakHourState = false;
let isMonsoonFloodedState = false;
let activeIncident: TriggerIncidentPayload | null = null;
let lastOrigin: string | Coordinates | null = null;
let lastDestination: string | Coordinates | null = null;
let lastRequestId: string = 'req_init';

export const BENGALURU_MONSOON_FLOOD_ZONES = [
  { name: 'Bellandur / EcoSpace ORR Basin', center: [77.6844, 12.9260] as Coordinates, radiusKm: 1.8, severityMultiplier: 6.0 },
  { name: 'Silk Board & Madiwala Lake Basin', center: [77.6229, 12.9177] as Coordinates, radiusKm: 2.0, severityMultiplier: 5.5 },
  { name: 'Hebbal Underpass & Nagavara Lake', center: [77.5925, 13.0358] as Coordinates, radiusKm: 2.2, severityMultiplier: 5.0 },
  { name: 'Rainbow Drive / Sarjapur Choke', center: [77.7085, 12.9080] as Coordinates, radiusKm: 1.5, severityMultiplier: 6.0 },
];

let { nodes, graph, stats } = generateScaledBengaluruNetwork(isPeakHourState);
let kdTree = new SpatialKDTree(nodes);
let paretoSolver = new ParetoFrontierSolver(graph, kdTree);

function haversineDistance(c1: Coordinates, c2: Coordinates): number {
  const R = 6371; // Earth's mean radius in km
  const [lon1, lat1] = c1;
  const [lon2, lat2] = c2;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function rebuildGraphWithIncident(): { affectedIncident: number; affectedFlooded: number } {
  const generated = generateScaledBengaluruNetwork(isPeakHourState);
  nodes = generated.nodes;
  graph = generated.graph;
  stats = generated.stats;

  let affectedIncident = 0;
  let affectedFlooded = 0;

  for (const edge of graph.getAllEdges()) {
    // Dynamic surge pricing based on peak hours
    if (isPeakHourState) {
      if (edge.mode === 'CAB') {
        edge.surgeMultiplier = 1.8;
        edge.costINR = Math.round(edge.costINR * 1.8);
      } else if (edge.mode === 'AUTO') {
        edge.surgeMultiplier = 1.35;
        edge.costINR = Math.round(edge.costINR * 1.35);
      }
    }

    const isRoad = edge.mode === 'CAB' || edge.mode === 'AUTO' || edge.mode === 'BUS';

    if (isRoad) {
      const srcNode = graph.getNode(edge.source);
      const tgtNode = graph.getNode(edge.target);
      if (!srcNode || !tgtNode) continue;

      // 1. Incident shockwave (e.g. Silk Board gridlock)
      if (activeIncident) {
        const { center, radiusKm, severityMultiplier } = activeIncident;
        const d1 = haversineDistance(srcNode.coordinates, center);
        const d2 = haversineDistance(tgtNode.coordinates, center);

        if (d1 <= radiusKm || d2 <= radiusKm) {
          edge.trafficMultiplier = (edge.trafficMultiplier || 1.0) * severityMultiplier;
          edge.timeMinutes = edge.timeMinutes * severityMultiplier;
          affectedIncident++;
        }
      }

      // 2. Monsoon flood shockwave (waterlogged low-lying catchment zones)
      if (isMonsoonFloodedState) {
        for (const zone of BENGALURU_MONSOON_FLOOD_ZONES) {
          const d1 = haversineDistance(srcNode.coordinates, zone.center);
          const d2 = haversineDistance(tgtNode.coordinates, zone.center);

          if (d1 <= zone.radiusKm || d2 <= zone.radiusKm) {
            edge.isFlooded = true;
            edge.trafficMultiplier = (edge.trafficMultiplier || 1.0) * zone.severityMultiplier;
            edge.timeMinutes = edge.timeMinutes * zone.severityMultiplier;
            // Flooded road cab fares face extreme 2.2x surge
            if (edge.mode === 'CAB') {
              edge.surgeMultiplier = 2.2;
              edge.costINR = Math.round(edge.costINR * 2.2);
            }
            affectedFlooded++;
            break;
          }
        }
      }
    }
  }

  kdTree = new SpatialKDTree(nodes);
  paretoSolver = new ParetoFrontierSolver(graph, kdTree);
  return { affectedIncident, affectedFlooded };
}

function rebuildGraphIfTrafficChanged(newPeakHour: boolean) {
  if (isPeakHourState !== newPeakHour) {
    isPeakHourState = newPeakHour;
    rebuildGraphWithIncident();
  }
}

// Initial broadcast when worker initializes
const initialReadyMsg: RoutingWorkerOutboundMessage = {
  type: 'WORKER_READY',
  payload: {
    graphStats: stats,
    nodeCount: nodes.length,
    edgeCount: stats.totalEdges,
  },
};
self.postMessage(initialReadyMsg);

// Handle inbound messages from main React UI thread
self.onmessage = (e: MessageEvent<RoutingWorkerInboundMessage>) => {
  const message = e.data;

  try {
    switch (message.type) {
      case 'CALCULATE_ROUTE': {
        const { origin, destination, isPeakHour } = message.payload;
        lastOrigin = origin;
        lastDestination = destination;
        lastRequestId = message.id;

        if (isPeakHour !== undefined) {
          rebuildGraphIfTrafficChanged(isPeakHour);
        }

        const result = paretoSolver.planRoutes(origin, destination);

        if (!result || result.routes.length === 0) {
          const errMsg: RoutingWorkerOutboundMessage = {
            type: 'ERROR',
            id: message.id,
            payload: { message: 'No viable multi-modal routes found between selected points.' },
          };
          self.postMessage(errMsg);
          return;
        }

        const snappedOrigin = graph.getNode(result.snappedOriginNodeId) || nodes[0];
        const snappedDest = graph.getNode(result.snappedDestNodeId) || nodes[1];

        const response: RoutingWorkerOutboundMessage = {
          type: 'ROUTE_RESULT',
          id: message.id,
          payload: {
            routes: result.routes,
            telemetry: result.telemetry,
            snappedOrigin,
            snappedDest,
          },
        };
        self.postMessage(response);
        break;
      }

      case 'TRIGGER_INCIDENT': {
        activeIncident = message.payload;
        const { affectedIncident } = rebuildGraphWithIncident();

        const statusResponse: RoutingWorkerOutboundMessage = {
          type: 'INCIDENT_STATUS',
          payload: {
            activeIncident,
            affectedEdgesCount: affectedIncident,
          },
        };
        self.postMessage(statusResponse);

        // Dynamically recalculate the active route under the incident shockwave
        if (lastOrigin && lastDestination) {
          const result = paretoSolver.planRoutes(lastOrigin, lastDestination);
          if (result && result.routes.length > 0) {
            const snappedOrigin = graph.getNode(result.snappedOriginNodeId) || nodes[0];
            const snappedDest = graph.getNode(result.snappedDestNodeId) || nodes[1];

            const response: RoutingWorkerOutboundMessage = {
              type: 'ROUTE_RESULT',
              id: lastRequestId,
              payload: {
                routes: result.routes,
                telemetry: result.telemetry,
                snappedOrigin,
                snappedDest,
              },
            };
            self.postMessage(response);
          }
        }
        break;
      }

      case 'CLEAR_INCIDENT': {
        activeIncident = null;
        rebuildGraphWithIncident();

        const statusResponse: RoutingWorkerOutboundMessage = {
          type: 'INCIDENT_STATUS',
          payload: {
            activeIncident: null,
            affectedEdgesCount: 0,
          },
        };
        self.postMessage(statusResponse);

        // Dynamically recalculate route back to normal condition
        if (lastOrigin && lastDestination) {
          const result = paretoSolver.planRoutes(lastOrigin, lastDestination);
          if (result && result.routes.length > 0) {
            const snappedOrigin = graph.getNode(result.snappedOriginNodeId) || nodes[0];
            const snappedDest = graph.getNode(result.snappedDestNodeId) || nodes[1];

            const response: RoutingWorkerOutboundMessage = {
              type: 'ROUTE_RESULT',
              id: lastRequestId,
              payload: {
                routes: result.routes,
                telemetry: result.telemetry,
                snappedOrigin,
                snappedDest,
              },
            };
            self.postMessage(response);
          }
        }
        break;
      }

      case 'TRIGGER_MONSOON_FLOOD': {
        isMonsoonFloodedState = true;
        const { affectedFlooded } = rebuildGraphWithIncident();

        const statusResponse: RoutingWorkerOutboundMessage = {
          type: 'FLOOD_STATUS',
          payload: {
            isMonsoonFlooded: true,
            floodedEdgesCount: affectedFlooded,
          },
        };
        self.postMessage(statusResponse);

        if (lastOrigin && lastDestination) {
          const result = paretoSolver.planRoutes(lastOrigin, lastDestination);
          if (result && result.routes.length > 0) {
            const snappedOrigin = graph.getNode(result.snappedOriginNodeId) || nodes[0];
            const snappedDest = graph.getNode(result.snappedDestNodeId) || nodes[1];

            const response: RoutingWorkerOutboundMessage = {
              type: 'ROUTE_RESULT',
              id: lastRequestId,
              payload: {
                routes: result.routes,
                telemetry: result.telemetry,
                snappedOrigin,
                snappedDest,
              },
            };
            self.postMessage(response);
          }
        }
        break;
      }

      case 'CLEAR_MONSOON_FLOOD': {
        isMonsoonFloodedState = false;
        rebuildGraphWithIncident();

        const statusResponse: RoutingWorkerOutboundMessage = {
          type: 'FLOOD_STATUS',
          payload: {
            isMonsoonFlooded: false,
            floodedEdgesCount: 0,
          },
        };
        self.postMessage(statusResponse);

        if (lastOrigin && lastDestination) {
          const result = paretoSolver.planRoutes(lastOrigin, lastDestination);
          if (result && result.routes.length > 0) {
            const snappedOrigin = graph.getNode(result.snappedOriginNodeId) || nodes[0];
            const snappedDest = graph.getNode(result.snappedDestNodeId) || nodes[1];

            const response: RoutingWorkerOutboundMessage = {
              type: 'ROUTE_RESULT',
              id: lastRequestId,
              payload: {
                routes: result.routes,
                telemetry: result.telemetry,
                snappedOrigin,
                snappedDest,
              },
            };
            self.postMessage(response);
          }
        }
        break;
      }

      case 'SNAP_POINT': {
        const nearest = kdTree.findNearest(message.payload.coord);
        const response: RoutingWorkerOutboundMessage = {
          type: 'SNAP_RESULT',
          id: message.id,
          payload: nearest,
        };
        self.postMessage(response);
        break;
      }

      case 'SET_PEAK_HOUR': {
        rebuildGraphIfTrafficChanged(message.payload.isPeakHour);
        const readyMsg: RoutingWorkerOutboundMessage = {
          type: 'WORKER_READY',
          payload: {
            graphStats: stats,
            nodeCount: nodes.length,
            edgeCount: stats.totalEdges,
          },
        };
        self.postMessage(readyMsg);
        break;
      }

      case 'GET_STATS': {
        const statsMsg: RoutingWorkerOutboundMessage = {
          type: 'WORKER_READY',
          payload: {
            graphStats: stats,
            nodeCount: nodes.length,
            edgeCount: stats.totalEdges,
          },
        };
        self.postMessage(statsMsg);
        break;
      }
    }
  } catch (error) {
    const errorMsg: RoutingWorkerOutboundMessage = {
      type: 'ERROR',
      id: 'id' in message ? message.id : undefined,
      payload: {
        message: error instanceof Error ? error.message : 'Unknown routing worker error occurred.',
      },
    };
    self.postMessage(errorMsg);
  }
};
