import { generateScaledBengaluruNetwork } from '../algorithms/data/bengaluru-network-scaled';
import { SpatialKDTree } from '../algorithms/kdtree';
import { ParetoFrontierSolver } from '../algorithms/pareto';
import type {
  RoutingWorkerInboundMessage,
  RoutingWorkerOutboundMessage,
} from './types';

// State maintained inside dedicated worker background thread
let isPeakHourState = false;
let { nodes, graph, stats } = generateScaledBengaluruNetwork(isPeakHourState);
let kdTree = new SpatialKDTree(nodes);
let paretoSolver = new ParetoFrontierSolver(graph, kdTree);

function rebuildGraphIfTrafficChanged(newPeakHour: boolean) {
  if (isPeakHourState !== newPeakHour) {
    isPeakHourState = newPeakHour;
    const generated = generateScaledBengaluruNetwork(isPeakHourState);
    nodes = generated.nodes;
    graph = generated.graph;
    stats = generated.stats;
    kdTree = new SpatialKDTree(nodes);
    paretoSolver = new ParetoFrontierSolver(graph, kdTree);
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
        message: error instanceof Error ? error.message : 'Unknown routing worker error occurred',
      },
    };
    self.postMessage(errorMsg);
  }
};
