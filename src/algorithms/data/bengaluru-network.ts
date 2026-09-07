import type { TransitNode } from '../types';
import { WeightedDirectedMultigraph } from '../multigraph';

export const BENGALURU_NODES: TransitNode[] = [
  {
    id: 'majestic',
    name: 'Majestic (Kempegowda Stn)',
    coordinates: [77.5726, 12.9774],
    zone: 'Central',
    type: 'METRO_STATION',
    description: 'Central Transit Hub - Purple & Green Line Interchange and KSRTC Bus Terminal',
  },
  {
    id: 'vidhana_soudha',
    name: 'Vidhana Soudha / Cubbon Park',
    coordinates: [77.5906, 12.9796],
    zone: 'Central',
    type: 'LANDMARK',
    description: 'Karnataka State Secretariat & Historic Cubbon Park Greens',
  },
  {
    id: 'mg_road',
    name: 'MG Road Metro Station',
    coordinates: [77.6083, 12.9756],
    zone: 'CBD',
    type: 'METRO_STATION',
    description: 'Central Business District, Brigade Road & Commercial Street Corridor',
  },
  {
    id: 'trinity',
    name: 'Trinity Circle',
    coordinates: [77.6171, 12.9729],
    zone: 'CBD',
    type: 'METRO_STATION',
    description: 'Major arterial junction leading to Old Airport Road and Indiranagar',
  },
  {
    id: 'halasuru',
    name: 'Halasuru (Ulsoor)',
    coordinates: [77.6267, 12.9765],
    zone: 'East',
    type: 'METRO_STATION',
    description: 'Ulsoor Lake heritage zone and Metro Purple Line stop',
  },
  {
    id: 'indiranagar_metro',
    name: 'Indiranagar Metro (CMH Rd)',
    coordinates: [77.6387, 12.9784],
    zone: 'East',
    type: 'METRO_STATION',
    description: 'Purple Line station serving Indiranagar high-street lifestyle hub',
  },
  {
    id: 'indiranagar_100ft',
    name: 'Indiranagar 100ft Road',
    coordinates: [77.6412, 12.9698],
    zone: 'East',
    type: 'JUNCTION',
    description: 'Famous food, retail, and tech startup lounge boulevard',
  },
  {
    id: 'domlur',
    name: 'Domlur Flyover / EGL',
    coordinates: [77.6432, 12.9598],
    zone: 'East',
    type: 'JUNCTION',
    description: 'Embassy GolfLinks Tech Park & Inner Ring Road connectivity',
  },
  {
    id: 'koramangala_sony',
    name: 'Koramangala Sony World Signal',
    coordinates: [77.6271, 12.9344],
    zone: 'South-East',
    type: 'TECH_PARK',
    description: 'Vibrant startup unicorn hub, cafés, and coworking district',
  },
  {
    id: 'koramangala_forum',
    name: 'Koramangala Forum / Dairy Circle',
    coordinates: [77.6115, 12.9352],
    zone: 'South-East',
    type: 'JUNCTION',
    description: 'Transit crossroad connecting Hosur Road to South Bengaluru',
  },
  {
    id: 'silk_board',
    name: 'Central Silk Board Junction',
    coordinates: [77.6229, 12.9176],
    zone: 'South',
    type: 'JUNCTION',
    description: 'Infamous high-density junction uniting ORR, Hosur Road, and BTM',
  },
  {
    id: 'hsr_layout',
    name: 'HSR Layout (Sector 1 BDA)',
    coordinates: [77.6394, 12.9116],
    zone: 'South-East',
    type: 'TECH_PARK',
    description: 'Venture Capital row and residential startup ecosystem',
  },
  {
    id: 'bellandur',
    name: 'Bellandur EcoSpace / ORR',
    coordinates: [77.6834, 12.9260],
    zone: 'East',
    type: 'TECH_PARK',
    description: 'Outer Ring Road mega tech park corridor (Intel, Cisco, Accenture)',
  },
  {
    id: 'marathahalli',
    name: 'Marathahalli Bridge',
    coordinates: [77.7011, 12.9568],
    zone: 'East',
    type: 'JUNCTION',
    description: 'Critical flyover intersection joining HAL Old Airport Rd & Varthur Rd',
  },
  {
    id: 'kr_puram',
    name: 'KR Puram Interchange',
    coordinates: [77.6865, 12.9982],
    zone: 'East',
    type: 'METRO_STATION',
    description: 'Hanging bridge & multimodal interchange station to Whitefield',
  },
  {
    id: 'whitefield_itpl',
    name: 'Whitefield (ITPL Pattandur Agrahara)',
    coordinates: [77.7475, 12.9866],
    zone: 'East',
    type: 'METRO_STATION',
    description: 'International Tech Park Bangalore (ITPL) and East IT nerve center',
  },
  {
    id: 'electronic_city',
    name: 'Electronic City Phase 1 (Infosys Gate)',
    coordinates: [77.6649, 12.8452],
    zone: 'South',
    type: 'TECH_PARK',
    description: 'India’s pioneer electronics city via 9.9km Elevated Toll Expressway',
  },
  {
    id: 'jayanagar',
    name: 'Jayanagar 4th Block Metro',
    coordinates: [77.5801, 12.9298],
    zone: 'South',
    type: 'METRO_STATION',
    description: 'Green Line station in traditional cultural and shopping district',
  },
  {
    id: 'hebbal',
    name: 'Hebbal Flyover (Manyata Tech Park)',
    coordinates: [77.5925, 13.0358],
    zone: 'North',
    type: 'JUNCTION',
    description: 'Gateway to Kempegowda International Airport and North IT belt',
  },
];

export function buildBengaluruTransitGraph(): WeightedDirectedMultigraph {
  const graph = new WeightedDirectedMultigraph();

  for (const node of BENGALURU_NODES) {
    graph.addNode(node);
  }

  // Helper to add multi-mode connections
  // 1. METRO PURPLE LINE (High-Speed, Zero Traffic Multiplier, ₹30 - ₹45)
  const metroPurpleRoute: [string, string, number, number, number][] = [
    ['majestic', 'vidhana_soudha', 2.1, 4.0, 20],
    ['vidhana_soudha', 'mg_road', 2.3, 4.0, 20],
    ['mg_road', 'trinity', 1.2, 2.5, 15],
    ['trinity', 'halasuru', 1.3, 2.5, 15],
    ['halasuru', 'indiranagar_metro', 1.7, 3.5, 20],
    ['indiranagar_metro', 'kr_puram', 6.2, 9.0, 30],
    ['kr_puram', 'whitefield_itpl', 7.5, 11.0, 35],
  ];

  metroPurpleRoute.forEach(([src, tgt, dist, time, cost], idx) => {
    graph.addEdge({
      id: `metro-purple-${idx}`,
      source: src,
      target: tgt,
      mode: 'METRO',
      distanceKm: dist,
      timeMinutes: time,
      costINR: cost,
      trafficMultiplier: 1.0,
      metroLineName: 'Purple Line (Namma Metro)',
      instruction: `Board Namma Metro Purple Line towards ${tgt === 'whitefield_itpl' ? 'Whitefield' : 'Majestic'}`,
    });
  });

  // 2. METRO GREEN LINE (Majestic -> Jayanagar)
  graph.addEdge({
    id: 'metro-green-1',
    source: 'majestic',
    target: 'jayanagar',
    mode: 'METRO',
    distanceKm: 6.8,
    timeMinutes: 12.0,
    costINR: 30,
    trafficMultiplier: 1.0,
    metroLineName: 'Green Line (Namma Metro)',
    instruction: 'Board Namma Metro Green Line towards Silk Institute / Jayanagar',
  });

  // 3. CAB / TAXI ROAD NETWORK (Direct, High Comfort, Peak Congestion Multiplier, ₹25/km + ₹120 base)
  const cabRoads: [string, string, number, number, number, number, string][] = [
    ['majestic', 'vidhana_soudha', 2.4, 10.0, 140, 1.4, 'Take Seshadri Rd past Maharani College'],
    ['vidhana_soudha', 'mg_road', 2.6, 11.0, 150, 1.5, 'Head east along Kasturba Rd & MG Rd'],
    ['mg_road', 'trinity', 1.4, 6.0, 100, 1.6, 'Drive down MG Road via Trinity Circle'],
    ['trinity', 'indiranagar_100ft', 3.1, 14.0, 180, 1.7, 'Follow Old Airport Rd into 100ft Rd Indiranagar'],
    ['indiranagar_100ft', 'indiranagar_metro', 1.2, 5.0, 90, 1.3, 'Drive along 100ft Rd towards CMH Rd'],
    ['indiranagar_100ft', 'domlur', 1.8, 8.0, 120, 1.5, 'Drive south on 100ft Rd to Domlur Flyover'],
    ['domlur', 'koramangala_sony', 3.8, 16.0, 210, 1.8, 'Take Inner Ring Road past EGL Tech Park'],
    ['koramangala_sony', 'koramangala_forum', 2.2, 10.0, 130, 1.6, 'Follow 80ft Rd to Forum Mall'],
    ['koramangala_sony', 'hsr_layout', 3.2, 14.0, 190, 1.7, 'Take 100ft Rd south into HSR Layout Sector 1'],
    ['hsr_layout', 'silk_board', 2.4, 13.0, 150, 2.2, 'Proceed along 14th Main to Central Silk Board'],
    ['silk_board', 'koramangala_forum', 3.1, 15.0, 170, 2.0, 'Take Hosur Main Road past Madivala'],
    ['silk_board', 'electronic_city', 11.5, 18.0, 360, 1.1, 'Take Electronic City Elevated Toll Expressway'],
    ['koramangala_forum', 'jayanagar', 3.5, 15.0, 180, 1.5, 'Take Dairy Circle past Bannerghatta Rd into Jayanagar'],
    ['hsr_layout', 'bellandur', 4.5, 18.0, 230, 1.9, 'Drive down Outer Ring Road towards Bellandur EcoSpace'],
    ['bellandur', 'marathahalli', 4.8, 20.0, 240, 2.0, 'Continue along ORR tech corridor to Marathahalli'],
    ['marathahalli', 'whitefield_itpl', 7.8, 26.0, 340, 1.8, 'Take Varthur Main Rd & ITPL Main Rd into Whitefield'],
    ['kr_puram', 'whitefield_itpl', 8.2, 28.0, 350, 1.7, 'Drive along Old Madras Rd into ITPL'],
    ['majestic', 'hebbal', 8.5, 26.0, 360, 1.6, 'Take Bellary Rd past Mekhri Circle to Hebbal Flyover'],
    ['vidhana_soudha', 'hebbal', 7.9, 24.0, 340, 1.5, 'Follow Palace Rd and Bellary Rd to Hebbal'],
    ['kr_puram', 'hebbal', 11.0, 32.0, 420, 1.8, 'Follow Outer Ring Road North to Hebbal'],
    ['domlur', 'bellandur', 6.2, 22.0, 270, 1.9, 'Take Wind Tunnel Rd & Yamalur to Bellandur'],
  ];

  cabRoads.forEach(([src, tgt, dist, time, cost, traffic, inst], idx) => {
    graph.addEdge({
      id: `cab-road-${idx}`,
      source: src,
      target: tgt,
      mode: 'CAB',
      distanceKm: dist,
      timeMinutes: time,
      costINR: cost,
      trafficMultiplier: traffic,
      instruction: `Cab: ${inst}`,
    });
  });

  // 4. AUTO-RICKSHAW ROAD NETWORK (Affordable first/last-mile, nimble in traffic, ~₹15/km + ₹30 base)
  cabRoads.forEach(([src, tgt, dist, time, , traffic, inst], idx) => {
    // Autos are slightly cheaper than cabs and slightly faster in heavy traffic jams due to agility
    const autoTraffic = Math.max(1.1, traffic * 0.88);
    const autoCost = Math.round(30 + dist * 16);
    graph.addEdge({
      id: `auto-road-${idx}`,
      source: src,
      target: tgt,
      mode: 'AUTO',
      distanceKm: dist,
      timeMinutes: Math.round(time * 0.95 * 10) / 10,
      costINR: autoCost,
      trafficMultiplier: autoTraffic,
      instruction: `Auto: ${inst}`,
    });
  });

  // 5. BUS NETWORK (BMTC Vajra AC / Ordinary Bus, Ultra-cheap, Frequent, Fixed stops, ₹10-₹35)
  const busRoutes: [string, string, number, number, number, number, string][] = [
    ['majestic', 'vidhana_soudha', 2.4, 12.0, 15, 1.4, 'BMTC Route 13: Majestic to Vidhana Soudha'],
    ['vidhana_soudha', 'mg_road', 2.6, 14.0, 15, 1.5, 'BMTC Route 335E: Vidhana Soudha to MG Road'],
    ['mg_road', 'trinity', 1.4, 8.0, 10, 1.6, 'BMTC Route G3: Trinity Circle'],
    ['trinity', 'indiranagar_100ft', 3.1, 18.0, 20, 1.7, 'BMTC Route 314E: Indiranagar 100ft Rd'],
    ['indiranagar_100ft', 'domlur', 1.8, 11.0, 15, 1.6, 'BMTC Route 201: Domlur TTMC'],
    ['domlur', 'koramangala_sony', 3.8, 22.0, 25, 1.9, 'BMTC Route 201MD: Koramangala'],
    ['koramangala_sony', 'silk_board', 3.6, 20.0, 20, 2.1, 'BMTC Route 500D: Silk Board Junction'],
    ['silk_board', 'bellandur', 5.2, 26.0, 25, 2.2, 'BMTC Route 500A (ORR AC Bus): Bellandur EcoSpace'],
    ['bellandur', 'marathahalli', 4.8, 24.0, 20, 2.0, 'BMTC Route 500D: Marathahalli Bridge'],
    ['marathahalli', 'whitefield_itpl', 7.8, 35.0, 30, 1.8, 'BMTC Route 335E: Whitefield ITPL Bus Stand'],
    ['silk_board', 'electronic_city', 11.5, 28.0, 35, 1.2, 'BMTC Route 356C (Expressway Bus): E-City'],
    ['majestic', 'jayanagar', 7.2, 32.0, 25, 1.6, 'BMTC Route 215: Jayanagar 4th Block'],
    ['majestic', 'hebbal', 8.5, 34.0, 25, 1.7, 'BMTC Route 280: Hebbal Bus Stand'],
    ['kr_puram', 'whitefield_itpl', 8.2, 36.0, 25, 1.8, 'BMTC Route 304: ITPL'],
  ];

  busRoutes.forEach(([src, tgt, dist, time, cost, traffic, inst], idx) => {
    graph.addEdge({
      id: `bus-route-${idx}`,
      source: src,
      target: tgt,
      mode: 'BUS',
      distanceKm: dist,
      timeMinutes: time,
      costINR: cost,
      trafficMultiplier: traffic,
      instruction: `Bus: Board ${inst}`,
    });
  });

  // 6. PEDESTRIAN / WALKING CONNECTIONS (First/Last Mile, Free, 0 Traffic, ~5 km/h = 12 mins/km)
  const walkShortcuts: [string, string, number][] = [
    ['indiranagar_metro', 'indiranagar_100ft', 0.9],
    ['vidhana_soudha', 'mg_road', 1.8],
    ['trinity', 'mg_road', 1.2],
    ['koramangala_sony', 'koramangala_forum', 1.6],
    ['hsr_layout', 'silk_board', 1.9],
    ['domlur', 'indiranagar_100ft', 1.5],
  ];

  walkShortcuts.forEach(([src, tgt, dist], idx) => {
    graph.addEdge({
      id: `walk-conn-${idx}`,
      source: src,
      target: tgt,
      mode: 'WALK',
      distanceKm: dist,
      timeMinutes: Math.round(dist * 12.0 * 10) / 10,
      costINR: 0,
      trafficMultiplier: 1.0,
      instruction: `Walk: Follow pedestrian footway towards ${tgt}`,
    });
  });

  return graph;
}

/**
 * Realistic 3D Building polygon footprints surrounding Bengaluru tech hubs & landmarks.
 * Rendered with dynamic extrusion heights (15m to 120m) in Mapbox/MapLibre.
 */
export function generateBengaluru3DBuildings(): GeoJSON.FeatureCollection<GeoJSON.Polygon> {
  const buildingCenters = [
    // Whitefield ITPL & Tech Parks (High-rise glass complexes, 70m - 120m)
    { center: [77.7475, 12.9866], count: 18, radius: 0.007, heightRange: [50, 110], name: 'ITPL High-Rise Complex' },
    // Bellandur EcoSpace (Massive commercial campus, 40m - 85m)
    { center: [77.6834, 12.9260], count: 16, radius: 0.006, heightRange: [40, 85], name: 'EcoSpace Tech Park' },
    // Electronic City Infosys / Wipro (Campus clusters, 30m - 75m)
    { center: [77.6649, 12.8452], count: 14, radius: 0.006, heightRange: [35, 75], name: 'E-City Tech Campus' },
    // Indiranagar 100ft Road (Boutique commercial towers & restaurants, 20m - 45m)
    { center: [77.6412, 12.9698], count: 15, radius: 0.005, heightRange: [20, 50], name: 'Indiranagar Commercials' },
    // MG Road / CBD (Classic modern corporate offices & hotels, 45m - 95m)
    { center: [77.6083, 12.9756], count: 20, radius: 0.006, heightRange: [45, 100], name: 'CBD Towers & Towers' },
    // Koramangala Startup Strip (Low & Mid-rise tech offices, 25m - 60m)
    { center: [77.6271, 12.9344], count: 16, radius: 0.005, heightRange: [25, 60], name: 'Koramangala Startup Hub' },
    // Hebbal Manyata Tech Park (Prominent glass blocks, 45m - 90m)
    { center: [77.5925, 13.0358], count: 15, radius: 0.006, heightRange: [45, 95], name: 'Manyata Embassy Park' },
  ];

  const features: GeoJSON.Feature<GeoJSON.Polygon>[] = [];
  let buildingId = 1;

  for (const group of buildingCenters) {
    const [cLng, cLat] = group.center;
    for (let i = 0; i < group.count; i++) {
      // Scatter buildings in group
      const angle = (i / group.count) * 2 * Math.PI + (i % 3) * 0.3;
      const dist = (0.2 + (i % 4) * 0.25) * group.radius;
      const bLng = cLng + Math.cos(angle) * dist;
      const bLat = cLat + Math.sin(angle) * dist;

      // Create rectangular building footprint (approx 40m - 80m across)
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
          color: height > 70 ? '#0ea5e9' : height > 40 ? '#38bdf8' : '#64748b',
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
