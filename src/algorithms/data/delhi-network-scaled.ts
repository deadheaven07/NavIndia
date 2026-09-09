import { WeightedDirectedMultigraph } from '../multigraph';
import { haversineDistanceKm } from '../kdtree';
import type { TransitNode, Coordinates, GraphStats } from '../types';

export const DELHI_BOUNDS = {
  minLon: 76.9500,
  maxLon: 77.4500,
  minLat: 28.4000,
  maxLat: 28.8000,
} as const;

function round5(num: number): number {
  return Math.round(num * 100000) / 100000;
}

// 1. DMRC YELLOW LINE STATIONS (Kashmere Gate -> Rajiv Chowk -> Cyber City / Millennium City)
const YELLOW_LINE_STATIONS: { id: string; name: string; coord: Coordinates }[] = [
  { id: 'delhi_kashmere_gate', name: 'Kashmere Gate ISBT', coord: [77.2285, 28.6675] },
  { id: 'delhi_chandni_chowk', name: 'Chandni Chowk', coord: [77.2301, 28.6578] },
  { id: 'delhi_chawri_bazar', name: 'Chawri Bazar', coord: [77.2267, 28.6493] },
  { id: 'delhi_new_delhi', name: 'New Delhi Railway Station', coord: [77.2219, 28.6431] },
  { id: 'delhi_rajiv_chowk', name: 'Rajiv Chowk (Connaught Place)', coord: [77.2183, 28.6328] },
  { id: 'delhi_patel_chowk', name: 'Patel Chowk', coord: [77.2136, 28.6231] },
  { id: 'delhi_central_sec', name: 'Central Secretariat', coord: [77.2119, 28.6145] },
  { id: 'delhi_udyog_bhawan', name: 'Udyog Bhawan', coord: [77.2123, 28.6105] },
  { id: 'delhi_lok_kalyan', name: 'Lok Kalyan Marg', coord: [77.2093, 28.5985] },
  { id: 'delhi_jor_bagh', name: 'Jor Bagh', coord: [77.2120, 28.5880] },
  { id: 'delhi_dilli_haat', name: 'Dilli Haat INA', coord: [77.2090, 28.5745] },
  { id: 'delhi_aiims', name: 'AIIMS Metro', coord: [77.2078, 28.5684] },
  { id: 'delhi_green_park', name: 'Green Park', coord: [77.2063, 28.5587] },
  { id: 'delhi_hauz_khas', name: 'Hauz Khas Interchange', coord: [77.2060, 28.5432] },
  { id: 'delhi_malviya_nagar', name: 'Malviya Nagar', coord: [77.2069, 28.5280] },
  { id: 'delhi_saket', name: 'Saket Metro', coord: [77.2014, 28.5204] },
  { id: 'delhi_qutab_minar', name: 'Qutab Minar', coord: [77.1860, 28.5126] },
  { id: 'delhi_chhatarpur', name: 'Chhatarpur Temple', coord: [77.1746, 28.5065] },
  { id: 'delhi_sultanpur', name: 'Sultanpur', coord: [77.1610, 28.4988] },
  { id: 'delhi_ghitorni', name: 'Ghitorni', coord: [77.1495, 28.4938] },
  { id: 'delhi_arjan_garh', name: 'Arjan Garh', coord: [77.1265, 28.4810] },
  { id: 'delhi_guru_drona', name: 'Guru Dronacharya', coord: [77.1025, 28.4815] },
  { id: 'delhi_sikanderpur', name: 'Sikanderpur Interchange', coord: [77.0926, 28.4818] },
  { id: 'delhi_mg_road_ggn', name: 'MG Road Gurgaon', coord: [77.0805, 28.4795] },
  { id: 'delhi_iffco_chowk', name: 'IFFCO Chowk', coord: [77.0715, 28.4721] },
  { id: 'delhi_millennium_city', name: 'Millennium City Centre (Huda)', coord: [77.0725, 28.4593] },
];

// 2. DMRC BLUE LINE STATIONS (Dwarka -> Connaught Place -> Noida Electronic City)
const BLUE_LINE_STATIONS: { id: string; name: string; coord: Coordinates }[] = [
  { id: 'delhi_dwarka_21', name: 'Dwarka Sector 21', coord: [77.0583, 28.5523] },
  { id: 'delhi_dwarka_mor', name: 'Dwarka Mor', coord: [77.0345, 28.6190] },
  { id: 'delhi_janakpuri_west', name: 'Janakpuri West', coord: [77.0778, 28.6294] },
  { id: 'delhi_tilak_nagar', name: 'Tilak Nagar', coord: [77.0955, 28.6366] },
  { id: 'delhi_rajouri_garden', name: 'Rajouri Garden', coord: [77.1228, 28.6492] },
  { id: 'delhi_moti_nagar', name: 'Moti Nagar', coord: [77.1420, 28.6575] },
  { id: 'delhi_shadipur', name: 'Shadipur', coord: [77.1578, 28.6517] },
  { id: 'delhi_patel_nagar', name: 'Patel Nagar', coord: [77.1685, 28.6534] },
  { id: 'delhi_karol_bagh', name: 'Karol Bagh Market', coord: [77.1904, 28.6443] },
  { id: 'delhi_jhandewalan', name: 'Jhandewalan', coord: [77.1989, 28.6441] },
  { id: 'delhi_rk_ashram', name: 'RK Ashram Marg', coord: [77.2090, 28.6390] },
  // delhi_rajiv_chowk is interchange
  { id: 'delhi_barakhamba', name: 'Barakhamba Road', coord: [77.2274, 28.6312] },
  { id: 'delhi_mandi_house', name: 'Mandi House Cultural Hub', coord: [77.2341, 28.6258] },
  { id: 'delhi_supreme_court', name: 'Supreme Court (Pragati Maidan)', coord: [77.2435, 28.6180] },
  { id: 'delhi_indraprastha', name: 'Indraprastha', coord: [77.2515, 28.6200] },
  { id: 'delhi_yamuna_bank', name: 'Yamuna Bank Depot', coord: [77.2625, 28.6235] },
  { id: 'delhi_akshardham', name: 'Akshardham Temple', coord: [77.2785, 28.6178] },
  { id: 'delhi_mayur_vihar_1', name: 'Mayur Vihar Phase 1', coord: [77.2915, 28.6045] },
  { id: 'delhi_botanical_garden', name: 'Botanical Garden Noida', coord: [77.3342, 28.5642] },
  { id: 'delhi_noida_sec_18', name: 'Noida Sector 18 (Atta Market)', coord: [77.3240, 28.5707] },
  { id: 'delhi_noida_sec_16', name: 'Noida Sector 16 Film City', coord: [77.3180, 28.5785] },
  { id: 'delhi_noida_city_centre', name: 'Noida City Centre', coord: [77.3560, 28.5745] },
  { id: 'delhi_noida_sec_62', name: 'Noida Sector 62 Tech Zone', coord: [77.3645, 28.6280] },
  { id: 'delhi_noida_electronic_city', name: 'Noida Electronic City', coord: [77.3725, 28.6270] },
];

// 3. DMRC AIRPORT EXPRESS (ORANGE LINE)
const AIRPORT_EXPRESS_STATIONS: { id: string; name: string; coord: Coordinates }[] = [
  // delhi_new_delhi is origin
  { id: 'delhi_shivaji_stadium', name: 'Shivaji Stadium CP', coord: [77.2140, 28.6285] },
  { id: 'delhi_dhaula_kuan', name: 'Dhaula Kuan Army Hub', coord: [77.1620, 28.5915] },
  { id: 'delhi_aerocity', name: 'Delhi Aerocity Hospitality District', coord: [77.1215, 28.5495] },
  { id: 'delhi_igi_airport_t3', name: 'IGI Airport Terminal 3', coord: [77.0855, 28.5562] },
  // delhi_dwarka_21 is terminal
];

// 4. MAJOR DELHI NCR ROAD HUBS & TECH PARKS
const DELHI_LANDMARKS_AND_HUBS: { id: string; name: string; coord: Coordinates; type: TransitNode['type'] }[] = [
  { id: 'delhi_connaught_place', name: 'Connaught Place Central Park', coord: [77.2190, 28.6315], type: 'LANDMARK' },
  { id: 'delhi_india_gate', name: 'India Gate Kartavya Path', coord: [77.2295, 28.6129], type: 'LANDMARK' },
  { id: 'delhi_cyber_city', name: 'DLF Cyber City Tech Park (Gurugram)', coord: [77.0885, 28.4912], type: 'TECH_PARK' },
  { id: 'delhi_cyber_hub', name: 'DLF CyberHub Dining & Offices', coord: [77.0898, 28.4950], type: 'TECH_PARK' },
  { id: 'delhi_nehru_place', name: 'Nehru Place IT & Electronics Market', coord: [77.2510, 28.5492], type: 'TECH_PARK' },
  { id: 'delhi_saket_select_city', name: 'Select Citywalk Saket', coord: [77.2185, 28.5285], type: 'LANDMARK' },
  { id: 'delhi_dnd_toll', name: 'DND Flyway Yamuna Bridge', coord: [77.2750, 28.5810], type: 'JUNCTION' },
  { id: 'delhi_minto_bridge', name: 'Minto Road Underpass (Flood Spot)', coord: [77.2255, 28.6375], type: 'JUNCTION' },
  { id: 'delhi_aiims_flyover', name: 'AIIMS Ring Road Flyover', coord: [77.2085, 28.5710], type: 'JUNCTION' },
  { id: 'delhi_dhaula_kuan_flyover', name: 'Dhaula Kuan NH48 Interchange', coord: [77.1645, 28.5930], type: 'JUNCTION' },
  { id: 'delhi_iffco_chowk_flyover', name: 'IFFCO Chowk NH48 Flyover', coord: [77.0730, 28.4735], type: 'JUNCTION' },
  { id: 'delhi_shankar_chowk', name: 'Shankar Chowk Cyber City Entry', coord: [77.0850, 28.5020], type: 'JUNCTION' },
  { id: 'delhi_ashram_chowk', name: 'Ashram Chowk Ring Road', coord: [77.2580, 28.5710], type: 'JUNCTION' },
  { id: 'delhi_lajpat_nagar', name: 'Lajpat Nagar Central Market', coord: [77.2420, 28.5700], type: 'LANDMARK' },
  { id: 'delhi_hauz_khas_village', name: 'Hauz Khas Social & Deer Park', coord: [77.1950, 28.5520], type: 'LANDMARK' },
];

export function generateScaledDelhiNetwork(isPeakHour: boolean = false): {
  nodes: TransitNode[];
  graph: WeightedDirectedMultigraph;
  stats: GraphStats;
} {
  const nodesMap = new Map<string, TransitNode>();
  const graph = new WeightedDirectedMultigraph();

  // 1. Add Yellow Line Stations
  for (const st of YELLOW_LINE_STATIONS) {
    const node: TransitNode = {
      id: st.id,
      name: st.name,
      coordinates: st.coord,
      zone: 'DELHI_YELLOW_LINE',
      type: 'METRO_STATION',
    };
    nodesMap.set(st.id, node);
    graph.addNode(node);
  }

  // 2. Add Blue Line Stations
  for (const st of BLUE_LINE_STATIONS) {
    if (!nodesMap.has(st.id)) {
      const node: TransitNode = {
        id: st.id,
        name: st.name,
        coordinates: st.coord,
        zone: 'DELHI_BLUE_LINE',
        type: 'METRO_STATION',
      };
      nodesMap.set(st.id, node);
      graph.addNode(node);
    }
  }

  // 3. Add Airport Express Stations
  for (const st of AIRPORT_EXPRESS_STATIONS) {
    if (!nodesMap.has(st.id)) {
      const node: TransitNode = {
        id: st.id,
        name: st.name,
        coordinates: st.coord,
        zone: 'DELHI_AIRPORT_EXPRESS',
        type: 'METRO_STATION',
      };
      nodesMap.set(st.id, node);
      graph.addNode(node);
    }
  }

  // 4. Add Landmarks & Hubs
  for (const lm of DELHI_LANDMARKS_AND_HUBS) {
    if (!nodesMap.has(lm.id)) {
      const node: TransitNode = {
        id: lm.id,
        name: lm.name,
        coordinates: lm.coord,
        zone: 'DELHI_NCR_LANDMARK',
        type: lm.type,
      };
      nodesMap.set(lm.id, node);
      graph.addNode(node);
    }
  }

  // 5. Connect Yellow Line Sequential Metro Edges (Both directions)
  for (let i = 0; i < YELLOW_LINE_STATIONS.length - 1; i++) {
    const u = YELLOW_LINE_STATIONS[i];
    const v = YELLOW_LINE_STATIONS[i + 1];
    const dist = haversineDistanceKm(u.coord, v.coord);
    const speedKmH = 45; // Rapid underground & elevated DMRC
    const timeMins = (dist / speedKmH) * 60 + 0.5; // +30s dwell
    const cost = Math.max(10, Math.round(dist * 2.8));

    // Forward
    graph.addEdge({
      id: `metro_yellow_${u.id}_${v.id}`,
      source: u.id,
      target: v.id,
      mode: 'METRO',
      distanceKm: round5(dist),
      timeMinutes: round5(timeMins),
      costINR: cost,
      trafficMultiplier: 1.0,
      pathCoordinates: [u.coord, v.coord],
      metroLineName: 'Yellow Line',
      instruction: `Take Delhi Metro Yellow Line towards Millennium City Centre to ${v.name}`,
    });

    // Reverse
    graph.addEdge({
      id: `metro_yellow_${v.id}_${u.id}`,
      source: v.id,
      target: u.id,
      mode: 'METRO',
      distanceKm: round5(dist),
      timeMinutes: round5(timeMins),
      costINR: cost,
      trafficMultiplier: 1.0,
      pathCoordinates: [v.coord, u.coord],
      metroLineName: 'Yellow Line',
      instruction: `Take Delhi Metro Yellow Line towards Samaypur Badli to ${u.name}`,
    });
  }

  // 6. Connect Blue Line Sequential Metro Edges
  for (let i = 0; i < BLUE_LINE_STATIONS.length - 1; i++) {
    const u = BLUE_LINE_STATIONS[i];
    const v = BLUE_LINE_STATIONS[i + 1];
    const dist = haversineDistanceKm(u.coord, v.coord);
    const speedKmH = 42;
    const timeMins = (dist / speedKmH) * 60 + 0.5;
    const cost = Math.max(10, Math.round(dist * 2.8));

    graph.addEdge({
      id: `metro_blue_${u.id}_${v.id}`,
      source: u.id,
      target: v.id,
      mode: 'METRO',
      distanceKm: round5(dist),
      timeMinutes: round5(timeMins),
      costINR: cost,
      trafficMultiplier: 1.0,
      pathCoordinates: [u.coord, v.coord],
      metroLineName: 'Blue Line',
      instruction: `Take Delhi Metro Blue Line towards Noida Electronic City to ${v.name}`,
    });

    graph.addEdge({
      id: `metro_blue_${v.id}_${u.id}`,
      source: v.id,
      target: u.id,
      mode: 'METRO',
      distanceKm: round5(dist),
      timeMinutes: round5(timeMins),
      costINR: cost,
      trafficMultiplier: 1.0,
      pathCoordinates: [v.coord, u.coord],
      metroLineName: 'Blue Line',
      instruction: `Take Delhi Metro Blue Line towards Dwarka to ${u.name}`,
    });
  }

  // 7. Connect Airport Express (Orange Line) - High Speed (80 km/h)
  for (let i = 0; i < AIRPORT_EXPRESS_STATIONS.length - 1; i++) {
    const u = AIRPORT_EXPRESS_STATIONS[i];
    const v = AIRPORT_EXPRESS_STATIONS[i + 1];
    const dist = haversineDistanceKm(u.coord, v.coord);
    const speedKmH = 80;
    const timeMins = (dist / speedKmH) * 60 + 0.4;
    const cost = Math.max(20, Math.round(dist * 3.5));

    graph.addEdge({
      id: `metro_airport_${u.id}_${v.id}`,
      source: u.id,
      target: v.id,
      mode: 'METRO',
      distanceKm: round5(dist),
      timeMinutes: round5(timeMins),
      costINR: cost,
      trafficMultiplier: 1.0,
      pathCoordinates: [u.coord, v.coord],
      metroLineName: 'Airport Express',
      instruction: `Board High-Speed Airport Express Line towards IGI T3 / Dwarka to ${v.name}`,
    });

    graph.addEdge({
      id: `metro_airport_${v.id}_${u.id}`,
      source: v.id,
      target: u.id,
      mode: 'METRO',
      distanceKm: round5(dist),
      timeMinutes: round5(timeMins),
      costINR: cost,
      trafficMultiplier: 1.0,
      pathCoordinates: [v.coord, u.coord],
      metroLineName: 'Airport Express',
      instruction: `Board High-Speed Airport Express Line towards New Delhi Railway Station to ${u.name}`,
    });
  }

  // 8. Generate Multimodal Road Edges (Cab, Auto, Bus, Walk) between nearby nodes (< 4.5km)
  const nodesArray = Array.from(nodesMap.values());
  const roadTrafficMultiplier = isPeakHour ? 1.6 : 1.0;

  for (let i = 0; i < nodesArray.length; i++) {
    const n1 = nodesArray[i];
    for (let j = i + 1; j < nodesArray.length; j++) {
      const n2 = nodesArray[j];
      const dist = haversineDistanceKm(n1.coordinates, n2.coordinates);

      // Walk edge for very close nodes (< 1.2km)
      if (dist <= 1.2) {
        const walkTime = (dist / 4.5) * 60; // 4.5 km/h walking
        graph.addEdge({
          id: `walk_${n1.id}_${n2.id}`,
          source: n1.id,
          target: n2.id,
          mode: 'WALK',
          distanceKm: round5(dist),
          timeMinutes: round5(walkTime),
          costINR: 0,
          trafficMultiplier: 1.0,
          pathCoordinates: [n1.coordinates, n2.coordinates],
          instruction: `Walk towards ${n2.name} (${Math.round(dist * 1000)}m)`,
        });
        graph.addEdge({
          id: `walk_${n2.id}_${n1.id}`,
          source: n2.id,
          target: n1.id,
          mode: 'WALK',
          distanceKm: round5(dist),
          timeMinutes: round5(walkTime),
          costINR: 0,
          trafficMultiplier: 1.0,
          pathCoordinates: [n2.coordinates, n1.coordinates],
          instruction: `Walk towards ${n1.name} (${Math.round(dist * 1000)}m)`,
        });
      }

      // Road Edges (Cab, Auto, Bus) for nodes within 6km corridor
      if (dist > 0.3 && dist <= 5.5) {
        const cabSpeed = 35;
        const autoSpeed = 26;
        const busSpeed = 20;

        const cabTime = (dist / cabSpeed) * 60 * roadTrafficMultiplier;
        const autoTime = (dist / autoSpeed) * 60 * roadTrafficMultiplier;
        const busTime = (dist / busSpeed) * 60 * roadTrafficMultiplier + 3.0; // bus stop dwell

        const cabCost = Math.round(50 + dist * 16);
        const autoCost = Math.round(30 + dist * 10);
        const busCost = Math.max(10, Math.min(30, Math.round(dist * 2.5)));

        // CAB
        graph.addEdge({
          id: `cab_${n1.id}_${n2.id}`,
          source: n1.id,
          target: n2.id,
          mode: 'CAB',
          distanceKm: round5(dist),
          timeMinutes: round5(cabTime),
          costINR: cabCost,
          trafficMultiplier: roadTrafficMultiplier,
          pathCoordinates: [n1.coordinates, n2.coordinates],
          instruction: `Drive via Expressway / Ring Road to ${n2.name}`,
        });
        graph.addEdge({
          id: `cab_${n2.id}_${n1.id}`,
          source: n2.id,
          target: n1.id,
          mode: 'CAB',
          distanceKm: round5(dist),
          timeMinutes: round5(cabTime),
          costINR: cabCost,
          trafficMultiplier: roadTrafficMultiplier,
          pathCoordinates: [n2.coordinates, n1.coordinates],
          instruction: `Drive via Expressway / Ring Road to ${n1.name}`,
        });

        // AUTO
        graph.addEdge({
          id: `auto_${n1.id}_${n2.id}`,
          source: n1.id,
          target: n2.id,
          mode: 'AUTO',
          distanceKm: round5(dist),
          timeMinutes: round5(autoTime),
          costINR: autoCost,
          trafficMultiplier: roadTrafficMultiplier,
          pathCoordinates: [n1.coordinates, n2.coordinates],
          instruction: `Take Auto-Rickshaw to ${n2.name}`,
        });
        graph.addEdge({
          id: `auto_${n2.id}_${n1.id}`,
          source: n2.id,
          target: n1.id,
          mode: 'AUTO',
          distanceKm: round5(dist),
          timeMinutes: round5(autoTime),
          costINR: autoCost,
          trafficMultiplier: roadTrafficMultiplier,
          pathCoordinates: [n2.coordinates, n1.coordinates],
          instruction: `Take Auto-Rickshaw to ${n1.name}`,
        });

        // BUS (DTC Green/Red AC buses)
        if (dist <= 4.0) {
          graph.addEdge({
            id: `bus_${n1.id}_${n2.id}`,
            source: n1.id,
            target: n2.id,
            mode: 'BUS',
            distanceKm: round5(dist),
            timeMinutes: round5(busTime),
            costINR: busCost,
            trafficMultiplier: roadTrafficMultiplier,
            pathCoordinates: [n1.coordinates, n2.coordinates],
            instruction: `Board DTC City Bus to ${n2.name}`,
          });
          graph.addEdge({
            id: `bus_${n2.id}_${n1.id}`,
            source: n2.id,
            target: n1.id,
            mode: 'BUS',
            distanceKm: round5(dist),
            timeMinutes: round5(busTime),
            costINR: busCost,
            trafficMultiplier: roadTrafficMultiplier,
            pathCoordinates: [n2.coordinates, n1.coordinates],
            instruction: `Board DTC City Bus to ${n1.name}`,
          });
        }
      }
    }
  }

  const nodes = Array.from(nodesMap.values());
  const stats = graph.getStats();

  return { nodes, graph, stats };
}

export const DELHI_PRIMARY_TRANSIT_HUBS: TransitNode[] = [
  { id: 'delhi_rajiv_chowk', name: 'Rajiv Chowk (Connaught Place)', coordinates: [77.2183, 28.6328], zone: 'CP', type: 'METRO_STATION' },
  { id: 'delhi_cyber_city', name: 'DLF Cyber City Tech Park', coordinates: [77.0885, 28.4912], zone: 'GURGAON', type: 'TECH_PARK' },
  { id: 'delhi_new_delhi', name: 'New Delhi Railway Station', coordinates: [77.2219, 28.6431], zone: 'NDLS', type: 'METRO_STATION' },
  { id: 'delhi_igi_airport_t3', name: 'IGI Airport Terminal 3', coordinates: [77.0855, 28.5562], zone: 'AIRPORT', type: 'LANDMARK' },
  { id: 'delhi_hauz_khas', name: 'Hauz Khas Interchange', coordinates: [77.2060, 28.5432], zone: 'SOUTH_DELHI', type: 'METRO_STATION' },
  { id: 'delhi_kashmere_gate', name: 'Kashmere Gate ISBT', coordinates: [77.2285, 28.6675], zone: 'NORTH_DELHI', type: 'BUS_TERMINAL' },
  { id: 'delhi_noida_sec_18', name: 'Noida Sector 18 Market', coordinates: [77.3240, 28.5707], zone: 'NOIDA', type: 'METRO_STATION' },
  { id: 'delhi_nehru_place', name: 'Nehru Place IT Hub', coordinates: [77.2510, 28.5492], zone: 'SOUTH_DELHI', type: 'TECH_PARK' },
  { id: 'delhi_aerocity', name: 'Aerocity Hospitality District', coordinates: [77.1215, 28.5495], zone: 'AEROCITY', type: 'LANDMARK' },
  { id: 'delhi_india_gate', name: 'India Gate Kartavya Path', coordinates: [77.2295, 28.6129], zone: 'CENTRAL_DELHI', type: 'LANDMARK' },
];

/**
 * 3D Building polygon footprints surrounding Delhi NCR business districts:
 * Connaught Place colonnade, DLF Cyber City high-rises, Aerocity, Nehru Place.
 */
export function generateDelhi3DBuildings(): GeoJSON.FeatureCollection<GeoJSON.Polygon> {
  const buildingCenters = [
    { center: [77.0885, 28.4912], count: 26, radius: 0.007, heightRange: [55, 125], name: 'Cyber City DLF Towers' },
    { center: [77.2183, 28.6328], count: 24, radius: 0.006, heightRange: [30, 85], name: 'Connaught Place Blocks' },
    { center: [77.1215, 28.5495], count: 18, radius: 0.005, heightRange: [35, 75], name: 'Aerocity Tech World' },
    { center: [77.2510, 28.5492], count: 16, radius: 0.005, heightRange: [40, 95], name: 'Nehru Place IT Towers' },
    { center: [77.3240, 28.5707], count: 16, radius: 0.005, heightRange: [40, 90], name: 'Noida Sector 18 Commercial' },
  ];

  const features: GeoJSON.Feature<GeoJSON.Polygon>[] = [];
  let buildingId = 5000;

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
          color: height > 80 ? '#0284c7' : height > 50 ? '#38bdf8' : '#94a3b8',
          name: `${group.name} Building ${String.fromCharCode(65 + (i % 8))}`,
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
