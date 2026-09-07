import { WeightedDirectedMultigraph } from '../multigraph';
import { haversineDistanceKm, SpatialKDTree } from '../kdtree';
import type { TransitNode, Coordinates, GraphStats } from '../types';

/**
 * Bengaluru Bounding Coordinates:
 * Latitude:  [12.8200, 13.0800]
 * Longitude: [77.5000, 77.7800]
 */
export const BENGALURU_BOUNDS = {
  minLon: 77.5000,
  maxLon: 77.7800,
  minLat: 12.8200,
  maxLat: 13.0800,
} as const;

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function round5(num: number): number {
  return Math.round(num * 100000) / 100000;
}

// 1. REAL NAMMA METRO PURPLE LINE STATIONS
const PURPLE_LINE_STATIONS: { id: string; name: string; coord: Coordinates }[] = [
  { id: 'purple_challaghatta', name: 'Challaghatta', coord: [77.4810, 12.9050] },
  { id: 'purple_kengeri', name: 'Kengeri', coord: [77.5020, 12.9100] },
  { id: 'purple_kengeri_ttmc', name: 'Kengeri Bus Terminal', coord: [77.5080, 12.9150] },
  { id: 'purple_jnanabharathi', name: 'Jnanabharathi', coord: [77.5180, 12.9230] },
  { id: 'purple_rr_nagar', name: 'Rajarajeshwari Nagar', coord: [77.5250, 12.9340] },
  { id: 'purple_nayandahalli', name: 'Nayandahalli', coord: [77.5340, 12.9460] },
  { id: 'purple_mysuru_rd', name: 'Mysuru Road', coord: [77.5420, 12.9530] },
  { id: 'purple_deepanjali', name: 'Deepanjali Nagar', coord: [77.5490, 12.9580] },
  { id: 'purple_attiguppe', name: 'Attiguppe', coord: [77.5560, 12.9620] },
  { id: 'purple_vijayanagar', name: 'Vijayanagar', coord: [77.5610, 12.9660] },
  { id: 'purple_hosahalli', name: 'Hosahalli', coord: [77.5640, 12.9700] },
  { id: 'purple_magadi_rd', name: 'Magadi Road', coord: [77.5670, 12.9740] },
  { id: 'majestic', name: 'Majestic (Kempegowda Stn)', coord: [77.5726, 12.9774] },
  { id: 'purple_central_college', name: 'Sir M Visvesvaraya', coord: [77.5830, 12.9785] },
  { id: 'purple_vidhana_soudha', name: 'Vidhana Soudha', coord: [77.5906, 12.9796] },
  { id: 'purple_cubbon_park', name: 'Cubbon Park', coord: [77.5980, 12.9790] },
  { id: 'purple_mg_road', name: 'MG Road Metro', coord: [77.6083, 12.9756] },
  { id: 'purple_trinity', name: 'Trinity', coord: [77.6171, 12.9729] },
  { id: 'purple_halasuru', name: 'Halasuru', coord: [77.6267, 12.9765] },
  { id: 'indiranagar_metro', name: 'Indiranagar Metro', coord: [77.6387, 12.9784] },
  { id: 'purple_sv_road', name: 'Swami Vivekananda Road', coord: [77.6490, 12.9810] },
  { id: 'purple_baiyappanahalli', name: 'Baiyappanahalli', coord: [77.6590, 12.9840] },
  { id: 'purple_benniganahalli', name: 'Benniganahalli', coord: [77.6690, 12.9880] },
  { id: 'purple_kr_puram', name: 'KR Puram Metro', coord: [77.6850, 12.9960] },
  { id: 'purple_singayyanapalya', name: 'Singayyanapalya (Mahadevapura)', coord: [77.6970, 12.9940] },
  { id: 'purple_garudacharpalya', name: 'Garudacharpalya', coord: [77.7080, 12.9920] },
  { id: 'purple_hoodi', name: 'Hoodi', coord: [77.7170, 12.9900] },
  { id: 'purple_seetharampalya', name: 'Seetharampalya', coord: [77.7240, 12.9880] },
  { id: 'purple_kundalahalli', name: 'Kundalahalli Metro', coord: [77.7310, 12.9840] },
  { id: 'purple_nallurhalli', name: 'Nallurhalli', coord: [77.7390, 12.9810] },
  { id: 'purple_sathya_sai', name: 'Sri Sathya Sai Hospital', coord: [77.7470, 12.9780] },
  { id: 'purple_itpl', name: 'Pattandur Agrahara (ITPL)', coord: [77.7520, 12.9830] },
  { id: 'purple_kadugodi_tree', name: 'Kadugodi Tree Park', coord: [77.7560, 12.9880] },
  { id: 'purple_hopefarm', name: 'Hopefarm Channasandra', coord: [77.7590, 12.9920] },
  { id: 'whitefield_itpl', name: 'Whitefield (Kadugodi)', coord: [77.7610, 12.9960] },
];

// 2. REAL NAMMA METRO GREEN LINE STATIONS
const GREEN_LINE_STATIONS: { id: string; name: string; coord: Coordinates }[] = [
  { id: 'green_nagasandra', name: 'Nagasandra', coord: [77.5020, 13.0480] },
  { id: 'green_dasarahalli', name: 'Dasarahalli', coord: [77.5080, 13.0400] },
  { id: 'green_jalahalli', name: 'Jalahalli', coord: [77.5140, 13.0330] },
  { id: 'green_peenya_industry', name: 'Peenya Industry', coord: [77.5210, 13.0270] },
  { id: 'green_peenya', name: 'Peenya', coord: [77.5270, 13.0200] },
  { id: 'green_goraguntepalya', name: 'Goraguntepalya Metro', coord: [77.5350, 13.0130] },
  { id: 'green_yeshwanthpur', name: 'Yeshwanthpur Metro', coord: [77.5450, 13.0070] },
  { id: 'green_sandal_soap', name: 'Sandal Soap Factory', coord: [77.5520, 13.0010] },
  { id: 'green_mahalakshmi', name: 'Mahalakshmi', coord: [77.5560, 12.9950] },
  { id: 'green_rajajinagar', name: 'Rajajinagar Metro', coord: [77.5600, 12.9890] },
  { id: 'green_kuvempu', name: 'Kuvempu Road', coord: [77.5630, 12.9830] },
  { id: 'green_srirampura', name: 'Srirampura', coord: [77.5660, 12.9790] },
  { id: 'green_sampige', name: 'Sampige Road', coord: [77.5690, 12.9760] },
  // Majestic is the central interchange
  { id: 'green_chickpet', name: 'Chickpet', coord: [77.5750, 12.9710] },
  { id: 'green_kr_market', name: 'KR Market', coord: [77.5760, 12.9640] },
  { id: 'green_national_college', name: 'National College', coord: [77.5750, 12.9550] },
  { id: 'green_lalbagh', name: 'Lalbagh', coord: [77.5770, 12.9460] },
  { id: 'green_south_end', name: 'South End Circle', coord: [77.5780, 12.9380] },
  { id: 'green_jayanagar', name: 'Jayanagar Metro', coord: [77.5800, 12.9300] },
  { id: 'green_rv_road', name: 'RV Road (Interchange)', coord: [77.5800, 12.9210] },
  { id: 'green_banashankari', name: 'Banashankari Metro', coord: [77.5780, 12.9150] },
  { id: 'green_jp_nagar', name: 'JP Nagar Metro', coord: [77.5750, 12.9070] },
  { id: 'green_yelachenahalli', name: 'Yelachenahalli', coord: [77.5710, 12.8950] },
  { id: 'green_konanakunte', name: 'Konanakunte Cross', coord: [77.5650, 12.8850] },
  { id: 'green_doddakallasandra', name: 'Doddakallasandra', coord: [77.5580, 12.8770] },
  { id: 'green_vajrahalli', name: 'Vajrahalli', coord: [77.5500, 12.8700] },
  { id: 'green_thalaghattapura', name: 'Thalaghattapura', coord: [77.5420, 12.8640] },
  { id: 'green_silk_institute', name: 'Silk Institute', coord: [77.5350, 12.8580] },
];

// 3. KEY LANDMARK HUBS & CORRIDORS FOR QUICK PRESETS
export const KEY_LANDMARK_HUBS: {
  id: string;
  name: string;
  coord: Coordinates;
  zone: string;
  type: 'LANDMARK' | 'JUNCTION';
  description: string;
}[] = [
  {
    id: 'silk_board',
    name: 'Central Silk Board',
    coord: [77.6230, 12.9170],
    zone: 'South East',
    type: 'JUNCTION',
    description: 'Major junction connecting Hosur Road, BTM, and HSR Outer Ring Road',
  },
  {
    id: 'electronic_city',
    name: 'Electronic City (Infosys Gate)',
    coord: [77.6680, 12.8390],
    zone: 'South / Electronic City',
    type: 'LANDMARK',
    description: 'Silicon City hardware & tech hub on Elevated Expressway',
  },
  {
    id: 'hebbal',
    name: 'Hebbal Flyover',
    coord: [77.5920, 13.0360],
    zone: 'North / Airport Corridor',
    type: 'JUNCTION',
    description: 'Northern gateway linking Outer Ring Road and Bellary Road Expressway',
  },
  {
    id: 'bellandur',
    name: 'Bellandur EcoSpace',
    coord: [77.6830, 12.9290],
    zone: 'ORR Corridor',
    type: 'LANDMARK',
    description: 'Prime Outer Ring Road high-tech corporate campus corridor',
  },
  {
    id: 'koramangala_sony',
    name: 'Koramangala (Sony Signal)',
    coord: [77.6271, 12.9344],
    zone: 'South East',
    type: 'LANDMARK',
    description: 'Epicenter of Bengaluru startup ecosystem and 80ft Road boulevard',
  },
  {
    id: 'vidhana_soudha',
    name: 'Vidhana Soudha / Cubbon Park',
    coord: [77.5906, 12.9796],
    zone: 'Central',
    type: 'LANDMARK',
    description: 'Karnataka State Secretariat & Historic Cubbon Park Greens',
  },
];

interface CorridorConfig {
  prefix: string;
  name: string;
  zone: string;
  speedKmH: number;
  trafficMultiplier: number;
  waypoints: Coordinates[];
}

const ARTERIAL_CORRIDORS: CorridorConfig[] = [
  {
    prefix: 'orr',
    name: 'Outer Ring Road (ORR)',
    zone: 'ORR Corridor',
    speedKmH: 50,
    trafficMultiplier: 1.15,
    waypoints: [
      [77.5920, 13.0360], // Hebbal Flyover
      [77.6190, 13.0420], // Nagavara
      [77.6410, 13.0310], // Hennur Cross
      [77.6490, 13.0180], // Banaswadi
      [77.6650, 13.0100], // Ramamurthy Nagar
      [77.6740, 12.9980], // Kasturi Nagar
      [77.6850, 12.9960], // KR Puram Hanging Bridge
      [77.6940, 12.9870], // Mahadevapura
      [77.6980, 12.9730], // Doddanekundi
      [77.7010, 12.9560], // Marathahalli Bridge
      [77.6970, 12.9420], // Kadubeesanahalli
      [77.6830, 12.9290], // Bellandur Ecospace
      [77.6750, 12.9250], // Devarabisanahalli
      [77.6650, 12.9210], // Ibblur
      [77.6490, 12.9220], // Agara
      [77.6360, 12.9190], // HSR ORR
      [77.6230, 12.9170], // Central Silk Board
      [77.6100, 12.9150], // BTM ORR
      [77.5980, 12.9160], // Jayadeva Underpass
      [77.5870, 12.9150], // Delmia Circle
      [77.5740, 12.9150], // Banashankari ORR
      [77.5550, 12.9240], // Kathriguppe
      [77.5340, 12.9460], // Nayandahalli
      [77.5270, 12.9700], // Chandra Layout
      [77.5150, 12.9780], // Nagarabhavi
      [77.525, 13.0020],  // Rajkumar Road ORR
      [77.5350, 13.0130], // Goraguntepalya
      [77.5580, 13.0320], // BEL Circle
      [77.5920, 13.0360], // Loop closure at Hebbal
    ],
  },
  {
    prefix: 'hosur_rd',
    name: 'Hosur Road / EC Tollway',
    zone: 'South / Electronic City',
    speedKmH: 52,
    trafficMultiplier: 1.2,
    waypoints: [
      [77.6230, 12.9170], // Silk Board
      [77.6260, 12.9060], // Bommanahalli
      [77.6360, 12.8890], // Garebhavipalya
      [77.6410, 12.8800], // Kudlu Gate
      [77.6460, 12.8710], // Singasandra
      [77.6520, 12.8620], // Hosa Road
      [77.6650, 12.8460], // Electronic City Toll
      [77.6680, 12.8390], // EC Phase 1 (Infosys)
      [77.6850, 12.8380], // EC Phase 2 (Wipro)
      [77.6930, 12.8250], // Hebbagodi / Narayana Hrudayalaya
    ],
  },
  {
    prefix: 'old_airport_rd',
    name: 'Old Airport Road & Varthur Rd',
    zone: 'East / Whitefield',
    speedKmH: 42,
    trafficMultiplier: 1.35,
    waypoints: [
      [77.6171, 12.9729], // Trinity
      [77.6400, 12.9610], // Domlur Flyover
      [77.6530, 12.9580], // Murugeshpalya
      [77.6650, 12.9560], // HAL Main Gate
      [77.7010, 12.9560], // Marathahalli
      [77.7150, 12.9600], // Kundalahalli Gate
      [77.7420, 12.9560], // Varthur Kodi
      [77.7500, 12.9680], // Whitefield Main
      [77.7590, 12.9920], // Hopefarm ITPL
    ],
  },
  {
    prefix: 'bellary_rd',
    name: 'Bellary Road / Airport Expressway',
    zone: 'North',
    speedKmH: 55,
    trafficMultiplier: 1.15,
    waypoints: [
      [77.5920, 13.0360], // Hebbal
      [77.5910, 13.0520], // Kodigehalli
      [77.5920, 13.0640], // Sahakara Nagar
      [77.5940, 13.0760], // Byatarayanapura / Yelahanka Bypass
    ],
  },
  {
    prefix: 'tumkur_rd',
    name: 'Tumkur Road (NH 48)',
    zone: 'North West',
    speedKmH: 48,
    trafficMultiplier: 1.25,
    waypoints: [
      [77.5726, 12.9774], // Majestic
      [77.5450, 13.0070], // Yeshwanthpur
      [77.5250, 13.0230], // Peenya
      [77.5140, 13.0330], // Jalahalli Cross
      [77.5020, 13.0480], // Nagasandra
    ],
  },
  {
    prefix: 'mysore_rd',
    name: 'Mysuru Road (SH 17)',
    zone: 'South West',
    speedKmH: 45,
    trafficMultiplier: 1.25,
    waypoints: [
      [77.5726, 12.9774], // Majestic
      [77.5490, 12.9580], // Deepanjali Nagar
      [77.5340, 12.9460], // Nayandahalli
      [77.5250, 12.9340], // RR Nagar
      [77.5020, 12.9100], // Kengeri
    ],
  },
  {
    prefix: 'bannerghatta_rd',
    name: 'Bannerghatta Road',
    zone: 'South',
    speedKmH: 38,
    trafficMultiplier: 1.4,
    waypoints: [
      [77.5980, 12.9380], // Dairy Circle
      [77.5980, 12.9160], // Jayadeva
      [77.5990, 12.9010], // Bilekahalli
      [77.5970, 12.8850], // Hulimavu
      [77.5950, 12.8730], // Meenakshi Mall
      [77.5920, 12.8550], // Gottigere
    ],
  },
  {
    prefix: 'sarjapur_rd',
    name: 'Sarjapur Main Road',
    zone: 'South East',
    speedKmH: 40,
    trafficMultiplier: 1.35,
    waypoints: [
      [77.6200, 12.9240], // St Johns Koramangala
      [77.6490, 12.9220], // Agara
      [77.6650, 12.9210], // Ibblur
      [77.6730, 12.9150], // Bellandur Gate
      [77.6820, 12.9090], // Kaikondrahalli
      [77.6950, 12.9010], // Carmelaram
      [77.7050, 12.8940], // Doddakannelli
      [77.7150, 12.8860], // Wipro Sarjapur
    ],
  },
  {
    prefix: 'kanakapura_rd',
    name: 'Kanakapura Road (NH 209)',
    zone: 'South',
    speedKmH: 45,
    trafficMultiplier: 1.25,
    waypoints: [
      [77.5780, 12.9380], // South End
      [77.5780, 12.9150], // Banashankari
      [77.5650, 12.8850], // Konanakunte
      [77.5420, 12.8640], // Thalaghattapura
      [77.5350, 12.8580], // Silk Institute
    ],
  },
  {
    prefix: 'irr',
    name: 'Inner Ring Road & CMH 100ft',
    zone: 'East Central',
    speedKmH: 42,
    trafficMultiplier: 1.3,
    waypoints: [
      [77.6171, 12.9729], // Trinity
      [77.6387, 12.9784], // Indiranagar
      [77.6410, 12.9698], // 100ft Rd
      [77.6400, 12.9610], // Domlur Flyover
      [77.6320, 12.9420], // Koramangala IRR
      [77.6200, 12.9240], // St John's
    ],
  },
];

interface GridConfig {
  prefix: string;
  name: string;
  zone: string;
  minLng: number;
  maxLng: number;
  minLat: number;
  maxLat: number;
  cols: number;
  rows: number;
}

const URBAN_GRIDS: GridConfig[] = [
  { prefix: 'cbd', name: 'CBD & Richmond', zone: 'Central', minLng: 77.585, maxLng: 77.615, minLat: 12.965, maxLat: 12.985, cols: 10, rows: 10 },
  { prefix: 'ind', name: 'Indiranagar', zone: 'East', minLng: 77.630, maxLng: 77.655, minLat: 12.965, maxLat: 12.985, cols: 9, rows: 10 },
  { prefix: 'kor', name: 'Koramangala', zone: 'South East', minLng: 77.610, maxLng: 77.638, minLat: 12.920, maxLat: 12.942, cols: 10, rows: 10 },
  { prefix: 'hsr', name: 'HSR Layout', zone: 'South East', minLng: 77.630, maxLng: 77.660, minLat: 12.900, maxLat: 12.922, cols: 10, rows: 11 },
  { prefix: 'wtf', name: 'Whitefield & EPIP', zone: 'East', minLng: 77.720, maxLng: 77.765, minLat: 12.965, maxLat: 12.995, cols: 11, rows: 11 },
  { prefix: 'ec', name: 'Electronic City', zone: 'South', minLng: 77.655, maxLng: 77.690, minLat: 12.830, maxLat: 12.850, cols: 10, rows: 10 },
  { prefix: 'jyn', name: 'Jayanagar & JP Nagar', zone: 'South', minLng: 77.570, maxLng: 77.595, minLat: 12.900, maxLat: 12.935, cols: 10, rows: 11 },
  { prefix: 'mal', name: 'Malleshwaram & Rajajinagar', zone: 'North West', minLng: 77.550, maxLng: 77.575, minLat: 12.975, maxLat: 13.010, cols: 10, rows: 10 },
  { prefix: 'mrt', name: 'Marathahalli & Bellandur', zone: 'East', minLng: 77.675, maxLng: 77.710, minLat: 12.935, maxLat: 12.965, cols: 10, rows: 10 },
  { prefix: 'heb', name: 'Hebbal & RT Nagar', zone: 'North', minLng: 77.580, maxLng: 77.610, minLat: 13.010, maxLat: 13.040, cols: 9, rows: 10 },
  { prefix: 'btm', name: 'BTM Layout', zone: 'South', minLng: 77.600, maxLng: 77.625, minLat: 12.905, maxLat: 12.925, cols: 8, rows: 9 },
];

/**
 * Procedural Topological Generator for Bengaluru's Road & Rapid Transit Network.
 * Scales the graph to 1,500+ nodes and 12,000+ directed multi-modal edges.
 */
export function generateScaledBengaluruNetwork(isPeakHour: boolean = false): {
  nodes: TransitNode[];
  graph: WeightedDirectedMultigraph;
  stats: GraphStats;
} {
  const nodes: TransitNode[] = [];
  const nodeMap = new Map<string, TransitNode>();
  const graph = new WeightedDirectedMultigraph();

  const trafficFactor = isPeakHour ? 1.55 : 1.0;

  function addNode(node: TransitNode) {
    if (!nodeMap.has(node.id)) {
      nodeMap.set(node.id, node);
      nodes.push(node);
      graph.addNode(node);
    }
  }

  // 1. Add Metro Purple Line Stations
  const purpleNodeIds: string[] = [];
  PURPLE_LINE_STATIONS.forEach((stn) => {
    const node: TransitNode = {
      id: stn.id,
      name: stn.name,
      coordinates: [
        round5(clamp(stn.coord[0], BENGALURU_BOUNDS.minLon, BENGALURU_BOUNDS.maxLon)),
        round5(clamp(stn.coord[1], BENGALURU_BOUNDS.minLat, BENGALURU_BOUNDS.maxLat)),
      ],
      zone: 'Metro Purple',
      type: 'METRO_STATION',
      metroLine: 'PURPLE',
      description: `Namma Metro Purple Line: ${stn.name}`,
    };
    addNode(node);
    purpleNodeIds.push(stn.id);
  });

  // Purple Line Track Edges (rapid transit, speed ~60 km/h, trafficMultiplier = 1.0)
  for (let i = 0; i < purpleNodeIds.length - 1; i++) {
    const u = purpleNodeIds[i];
    const v = purpleNodeIds[i + 1];
    const nodeU = nodeMap.get(u)!;
    const nodeV = nodeMap.get(v)!;
    const dist = haversineDistanceKm(nodeU.coordinates, nodeV.coordinates);
    const minutes = Math.max(1.5, Math.round((dist / 60) * 60 * 10) / 10);
    const cost = Math.max(10, Math.round(dist * 3.2));

    graph.addEdge({
      id: `edge_${u}_${v}_metro`,
      source: u,
      target: v,
      mode: 'METRO',
      distanceKm: Math.round(dist * 100) / 100,
      timeMinutes: minutes,
      costINR: cost,
      trafficMultiplier: 1.0, // Metro is impervious to surface traffic jams
      metroLineName: 'Purple Line',
      instruction: `Board Purple Line Metro from ${nodeU.name} to ${nodeV.name}`,
    }, true);
  }

  // 2. Add Metro Green Line Stations
  const greenNodeIds: string[] = [];
  GREEN_LINE_STATIONS.forEach((stn) => {
    const node: TransitNode = {
      id: stn.id,
      name: stn.name,
      coordinates: [
        round5(clamp(stn.coord[0], BENGALURU_BOUNDS.minLon, BENGALURU_BOUNDS.maxLon)),
        round5(clamp(stn.coord[1], BENGALURU_BOUNDS.minLat, BENGALURU_BOUNDS.maxLat)),
      ],
      zone: 'Metro Green',
      type: 'METRO_STATION',
      metroLine: 'GREEN',
      description: `Namma Metro Green Line: ${stn.name}`,
    };
    addNode(node);
    greenNodeIds.push(stn.id);
  });

  // Green line sequence with Majestic central interchange
  const fullGreenSequence: string[] = [];
  for (let i = 0; i < greenNodeIds.length; i++) {
    if (i === 13) {
      fullGreenSequence.push('majestic'); // Central Cross-Platform Interchange
    }
    fullGreenSequence.push(greenNodeIds[i]);
  }

  for (let i = 0; i < fullGreenSequence.length - 1; i++) {
    const u = fullGreenSequence[i];
    const v = fullGreenSequence[i + 1];
    const nodeU = nodeMap.get(u)!;
    const nodeV = nodeMap.get(v)!;
    const dist = haversineDistanceKm(nodeU.coordinates, nodeV.coordinates);
    const minutes = Math.max(1.5, Math.round((dist / 60) * 60 * 10) / 10);
    const cost = Math.max(10, Math.round(dist * 3.2));

    graph.addEdge({
      id: `edge_${u}_${v}_green_metro`,
      source: u,
      target: v,
      mode: 'METRO',
      distanceKm: Math.round(dist * 100) / 100,
      timeMinutes: minutes,
      costINR: cost,
      trafficMultiplier: 1.0,
      metroLineName: 'Green Line',
      instruction: `Board Green Line Metro from ${nodeU.name} to ${nodeV.name}`,
    }, true);
  }

  // 3. Add Key Landmark Hubs
  KEY_LANDMARK_HUBS.forEach((landmark) => {
    const node: TransitNode = {
      id: landmark.id,
      name: landmark.name,
      coordinates: [
        round5(clamp(landmark.coord[0], BENGALURU_BOUNDS.minLon, BENGALURU_BOUNDS.maxLon)),
        round5(clamp(landmark.coord[1], BENGALURU_BOUNDS.minLat, BENGALURU_BOUNDS.maxLat)),
      ],
      zone: landmark.zone,
      type: landmark.type,
      description: landmark.description,
    };
    addNode(node);
  });

  // 4. Add Arterial Highway Corridors
  ARTERIAL_CORRIDORS.forEach((corridor) => {
    const corridorNodes: string[] = [];
    for (let w = 0; w < corridor.waypoints.length - 1; w++) {
      const p1 = corridor.waypoints[w];
      const p2 = corridor.waypoints[w + 1];
      const segDist = haversineDistanceKm(p1, p2);
      // Interpolate roughly every 380m along highways
      const subSteps = Math.max(1, Math.round(segDist / 0.38));

      for (let s = 0; s < subSteps; s++) {
        const fraction = s / subSteps;
        const lng = round5(clamp(p1[0] + (p2[0] - p1[0]) * fraction, BENGALURU_BOUNDS.minLon, BENGALURU_BOUNDS.maxLon));
        const lat = round5(clamp(p1[1] + (p2[1] - p1[1]) * fraction, BENGALURU_BOUNDS.minLat, BENGALURU_BOUNDS.maxLat));
        const nodeId = `${corridor.prefix}_seg_${w}_${s}`;
        const node: TransitNode = {
          id: nodeId,
          name: `${corridor.name} (Junction ${w + 1}.${s + 1})`,
          coordinates: [lng, lat],
          zone: corridor.zone,
          type: 'JUNCTION',
          description: `Arterial road junction on ${corridor.name}`,
        };
        addNode(node);
        corridorNodes.push(nodeId);
      }
    }

    // Connect along highway corridor
    for (let i = 0; i < corridorNodes.length - 1; i++) {
      const u = corridorNodes[i];
      const v = corridorNodes[i + 1];
      const nodeU = nodeMap.get(u)!;
      const nodeV = nodeMap.get(v)!;
      const dist = haversineDistanceKm(nodeU.coordinates, nodeV.coordinates);

      const effectiveTraffic = corridor.trafficMultiplier * trafficFactor;
      const cabMinutes = Math.max(0.5, Math.round((dist / corridor.speedKmH) * 60 * 10) / 10);
      const autoMinutes = Math.max(0.7, Math.round((dist / (corridor.speedKmH * 0.75)) * 60 * 10) / 10);
      const busMinutes = Math.max(1.0, Math.round((dist / (corridor.speedKmH * 0.6)) * 60 * 10) / 10);

      // Cab edge
      graph.addEdge({
        id: `edge_${u}_${v}_cab`,
        source: u,
        target: v,
        mode: 'CAB',
        distanceKm: Math.round(dist * 100) / 100,
        timeMinutes: cabMinutes,
        costINR: Math.max(15, Math.round(dist * 18)),
        trafficMultiplier: effectiveTraffic,
        instruction: `Drive along ${corridor.name} to ${nodeV.name}`,
      }, true);

      // Auto-rickshaw edge
      graph.addEdge({
        id: `edge_${u}_${v}_auto`,
        source: u,
        target: v,
        mode: 'AUTO',
        distanceKm: Math.round(dist * 100) / 100,
        timeMinutes: autoMinutes,
        costINR: Math.max(10, Math.round(dist * 12)),
        trafficMultiplier: effectiveTraffic * 1.1,
        instruction: `Take auto along ${corridor.name}`,
      }, true);

      // BMTC Bus edge along major corridors
      graph.addEdge({
        id: `edge_${u}_${v}_bus`,
        source: u,
        target: v,
        mode: 'BUS',
        distanceKm: Math.round(dist * 100) / 100,
        timeMinutes: busMinutes,
        costINR: Math.max(6, Math.round(dist * 3.5)),
        trafficMultiplier: effectiveTraffic * 1.25,
        instruction: `BMTC Bus along ${corridor.name}`,
      }, true);
    }
  });

  // 4. Add Urban Collector Neighborhood Grids
  URBAN_GRIDS.forEach((grid) => {
    const gridMatrix: string[][] = [];
    const stepLng = (grid.maxLng - grid.minLng) / (grid.cols - 1);
    const stepLat = (grid.maxLat - grid.minLat) / (grid.rows - 1);

    for (let r = 0; r < grid.rows; r++) {
      gridMatrix[r] = [];
      for (let c = 0; c < grid.cols; c++) {
        const lng = round5(clamp(grid.minLng + c * stepLng, BENGALURU_BOUNDS.minLon, BENGALURU_BOUNDS.maxLon));
        const lat = round5(clamp(grid.minLat + r * stepLat, BENGALURU_BOUNDS.minLat, BENGALURU_BOUNDS.maxLat));
        const nodeId = `${grid.prefix}_r${r}_c${c}`;
        const isBorder = (r === 0 || c === 0 || r === grid.rows - 1 || c === grid.cols - 1);
        const node: TransitNode = {
          id: nodeId,
          name: `${grid.name} - ${r * 2 + 1}th Cross / ${c * 3 + 2}th Main`,
          coordinates: [lng, lat],
          zone: grid.zone,
          type: isBorder ? 'JUNCTION' : 'LANDMARK',
          description: `Urban collector road in ${grid.name}`,
        };
        addNode(node);
        gridMatrix[r][c] = nodeId;
      }
    }

    // Connect internal grid horizontal and vertical edges (speed ~25 km/h)
    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        const currId = gridMatrix[r][c];
        const nodeCurr = nodeMap.get(currId)!;

        // Horizontal neighbor (East)
        if (c < grid.cols - 1) {
          const nextId = gridMatrix[r][c + 1];
          const nodeNext = nodeMap.get(nextId)!;
          const dist = haversineDistanceKm(nodeCurr.coordinates, nodeNext.coordinates);
          const time = Math.max(0.5, Math.round((dist / 25) * 60 * 10) / 10);
          const traffic = 1.4 * trafficFactor;

          graph.addEdge({
            id: `edge_${currId}_${nextId}_cab`,
            source: currId,
            target: nextId,
            mode: 'CAB',
            distanceKm: Math.round(dist * 100) / 100,
            timeMinutes: time,
            costINR: Math.max(15, Math.round(dist * 20)),
            trafficMultiplier: traffic,
            instruction: `Drive through ${grid.name}`,
          }, true);

          graph.addEdge({
            id: `edge_${currId}_${nextId}_auto`,
            source: currId,
            target: nextId,
            mode: 'AUTO',
            distanceKm: Math.round(dist * 100) / 100,
            timeMinutes: Math.round(time * 1.15 * 10) / 10,
            costINR: Math.max(10, Math.round(dist * 14)),
            trafficMultiplier: traffic * 1.1,
            instruction: `Take auto through ${grid.name}`,
          }, true);
        }

        // Vertical neighbor (North)
        if (r < grid.rows - 1) {
          const nextId = gridMatrix[r + 1][c];
          const nodeNext = nodeMap.get(nextId)!;
          const dist = haversineDistanceKm(nodeCurr.coordinates, nodeNext.coordinates);
          const time = Math.max(0.5, Math.round((dist / 25) * 60 * 10) / 10);
          const traffic = 1.4 * trafficFactor;

          graph.addEdge({
            id: `edge_${currId}_${nextId}_cab`,
            source: currId,
            target: nextId,
            mode: 'CAB',
            distanceKm: Math.round(dist * 100) / 100,
            timeMinutes: time,
            costINR: Math.max(15, Math.round(dist * 20)),
            trafficMultiplier: traffic,
            instruction: `Drive through ${grid.name}`,
          }, true);

          graph.addEdge({
            id: `edge_${currId}_${nextId}_auto`,
            source: currId,
            target: nextId,
            mode: 'AUTO',
            distanceKm: Math.round(dist * 100) / 100,
            timeMinutes: Math.round(time * 1.15 * 10) / 10,
            costINR: Math.max(10, Math.round(dist * 14)),
            trafficMultiplier: traffic * 1.1,
            instruction: `Take auto through ${grid.name}`,
          }, true);
        }
      }
    }
  });

  // 5. Cross-Connect Grids to Metro Stations and Highways via Spatial KD-Tree
  const kdTree = new SpatialKDTree(nodes);

  // Link metro stations to adjacent road junctions within 700m via WALK and AUTO
  const allMetroNodes = nodes.filter((n) => n.type === 'METRO_STATION');
  allMetroNodes.forEach((metroNode) => {
    const nearby = kdTree.findKNearest(metroNode.coordinates, 6);
    for (const item of nearby) {
      if (item.node.id === metroNode.id) continue;
      if (item.distanceKm > 0.8) continue;

      const walkTime = Math.max(1, Math.round((item.distanceKm / 4.8) * 60 * 10) / 10);
      graph.addEdge({
        id: `walk_${metroNode.id}_${item.node.id}`,
        source: metroNode.id,
        target: item.node.id,
        mode: 'WALK',
        distanceKm: item.distanceKm,
        timeMinutes: walkTime,
        costINR: 0,
        trafficMultiplier: 1.0,
        instruction: `Walk between ${metroNode.name} and ${item.node.name}`,
      }, true);

      // Auto feeder
      graph.addEdge({
        id: `auto_${metroNode.id}_${item.node.id}`,
        source: metroNode.id,
        target: item.node.id,
        mode: 'AUTO',
        distanceKm: item.distanceKm,
        timeMinutes: Math.max(1.5, Math.round((item.distanceKm / 22) * 60 * 10) / 10),
        costINR: 30,
        trafficMultiplier: 1.3 * trafficFactor,
        instruction: `Auto feeder from ${metroNode.name} to ${item.node.name}`,
      }, true);
    }
  });

  // Connect isolated or perimeter nodes to nearby road networks
  for (const node of nodes) {
    if (graph.getOutgoingEdges(node.id).length < 2) {
      const nearest = kdTree.findKNearest(node.coordinates, 4);
      for (const item of nearest) {
        if (item.node.id === node.id) continue;
        if (item.distanceKm > 2.0) continue;

        graph.addEdge({
          id: `conn_${node.id}_${item.node.id}_cab`,
          source: node.id,
          target: item.node.id,
          mode: 'CAB',
          distanceKm: item.distanceKm,
          timeMinutes: Math.max(1, Math.round((item.distanceKm / 35) * 60 * 10) / 10),
          costINR: Math.max(20, Math.round(item.distanceKm * 18)),
          trafficMultiplier: 1.3 * trafficFactor,
          instruction: `Link from ${node.name} to ${item.node.name}`,
        }, true);
      }
    }
  }

  // 6. Strong Connectivity & Reachability Validator (BFS)
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

  // Bridge any isolated nodes to the main connected network
  for (const node of nodes) {
    if (!reachable.has(node.id)) {
      const nearestReachable = Array.from(reachable)
        .map((rId) => {
          const rNode = nodeMap.get(rId)!;
          return { id: rId, dist: haversineDistanceKm(node.coordinates, rNode.coordinates) };
        })
        .sort((a, b) => a.dist - b.dist)[0];

      if (nearestReachable) {
        graph.addEdge({
          id: `bridge_${node.id}_${nearestReachable.id}`,
          source: node.id,
          target: nearestReachable.id,
          mode: 'CAB',
          distanceKm: Math.round(nearestReachable.dist * 100) / 100,
          timeMinutes: Math.max(1, Math.round((nearestReachable.dist / 30) * 60 * 10) / 10),
          costINR: Math.max(20, Math.round(nearestReachable.dist * 18)),
          trafficMultiplier: 1.3 * trafficFactor,
        }, true);
        reachable.add(node.id);
      }
    }
  }

  const stats = graph.getStats();

  return { nodes, graph, stats };
}

// Pre-generated static nodes export
export const SCALED_BENGALURU_NODES: TransitNode[] = generateScaledBengaluruNetwork().nodes;

// Primary transit hubs (metro stations + landmarks) for clean UI dropdowns and markers
export const PRIMARY_TRANSIT_HUBS: TransitNode[] = SCALED_BENGALURU_NODES.filter(
  (n) => n.type === 'METRO_STATION' || n.type === 'LANDMARK'
);

export function buildScaledBengaluruTransitGraph(isPeakHour: boolean = false): WeightedDirectedMultigraph {
  return generateScaledBengaluruNetwork(isPeakHour).graph;
}

/**
 * 3D Building polygon footprints surrounding Bengaluru tech hubs & landmarks.
 * Rendered with dynamic extrusion heights (20m to 110m) in MapLibre.
 */
export function generateBengaluru3DBuildings(): GeoJSON.FeatureCollection<GeoJSON.Polygon> {
  const buildingCenters = [
    { center: [77.7475, 12.9866], count: 20, radius: 0.007, heightRange: [50, 110], name: 'ITPL High-Rise Complex' },
    { center: [77.6834, 12.9260], count: 18, radius: 0.006, heightRange: [40, 95], name: 'EcoSpace Tech Park' },
    { center: [77.6649, 12.8452], count: 16, radius: 0.006, heightRange: [35, 85], name: 'E-City Tech Campus' },
    { center: [77.6412, 12.9698], count: 16, radius: 0.005, heightRange: [25, 55], name: 'Indiranagar 100ft Towers' },
    { center: [77.6083, 12.9756], count: 22, radius: 0.006, heightRange: [45, 105], name: 'CBD Brigade Towers' },
    { center: [77.6271, 12.9344], count: 18, radius: 0.005, heightRange: [30, 70], name: 'Koramangala Startup Hub' },
    { center: [77.5925, 13.0358], count: 18, radius: 0.006, heightRange: [45, 100], name: 'Manyata Embassy Park' },
    { center: [77.6490, 12.9220], count: 16, radius: 0.005, heightRange: [35, 80], name: 'HSR Tech Towers' },
  ];

  const features: GeoJSON.Feature<GeoJSON.Polygon>[] = [];
  let buildingId = 1;

  for (const group of buildingCenters) {
    const [cLng, cLat] = group.center;
    for (let i = 0; i < group.count; i++) {
      const angle = (i / group.count) * 2 * Math.PI + (i % 3) * 0.3;
      const dist = (0.2 + (i % 4) * 0.25) * group.radius;
      const bLng = cLng + Math.cos(angle) * dist;
      const bLat = cLat + Math.sin(angle) * dist;

      const sizeLng = 0.00045 + ((i * 17) % 5) * 0.0001;
      const sizeLat = 0.00045 + ((i * 23) % 5) * 0.0001;

      const polyCoordinates = [
        [
          [bLng - sizeLng, bLat - sizeLat],
          [bLng + sizeLng, bLat - sizeLat],
          [bLng + sizeLng, bLat + sizeLat],
          [bLng - sizeLng, bLat + sizeLat],
          [bLng - sizeLng, bLat - sizeLat],
        ],
      ];

      const minH = group.heightRange[0];
      const maxH = group.heightRange[1];
      const height = minH + ((i * 31) % (maxH - minH));

      features.push({
        type: 'Feature',
        id: buildingId++,
        properties: {
          height: height,
          base_height: 0,
          color: height > 70 ? '#0284c7' : height > 40 ? '#38bdf8' : '#94a3b8',
          name: `${group.name} Block ${String.fromCharCode(65 + (i % 8))}`,
        },
        geometry: {
          type: 'Polygon',
          coordinates: polyCoordinates,
        },
      });
    }
  }

  return {
    type: 'FeatureCollection',
    features,
  };
}
