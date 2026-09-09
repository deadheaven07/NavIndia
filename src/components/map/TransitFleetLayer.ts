import type { Coordinates } from '../../algorithms/types';

export interface TransitVehicle {
  id: string;
  type: 'METRO' | 'BUS';
  city: 'bengaluru' | 'delhi';
  lineName: string;
  lineColor: string;
  waypoints: Coordinates[];
  stationNames: string[];
  currentIndex: number;
  direction: 1 | -1;
  progress: number; // 0 to 1 between waypoints[currentIndex] and waypoints[currentIndex + direction]
  speed: number; // progress increment per second
  dwellSeconds: number; // dwell time at station
  currentDwell: number;
  currentCoord: Coordinates;
  bearing: number;
  nextStation: string;
  occupancy: 'LOW' | 'MODERATE' | 'HIGH';
  speedKmh: number;
}

function calculateBearing(c1: Coordinates, c2: Coordinates): number {
  const [lon1, lat1] = c1;
  const [lon2, lat2] = c2;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.cos(dLon);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

function interpolateCoord(c1: Coordinates, c2: Coordinates, t: number): Coordinates {
  return [
    c1[0] + (c2[0] - c1[0]) * t,
    c1[1] + (c2[1] - c1[1]) * t,
  ];
}

export class TransitFleetSimulation {
  private vehicles: TransitVehicle[] = [];

  constructor() {
    this.initBengaluruFleet();
    this.initDelhiFleet();
  }

  private initBengaluruFleet() {
    // Purple Line Stations coordinates
    const purpleCoords: Coordinates[] = [
      [77.4810, 12.9050], // Challaghatta
      [77.5420, 12.9530], // Mysuru Road
      [77.5610, 12.9660], // Vijayanagar
      [77.5726, 12.9774], // Majestic
      [77.5906, 12.9796], // Vidhana Soudha
      [77.6083, 12.9756], // MG Road
      [77.6387, 12.9784], // Indiranagar
      [77.6590, 12.9840], // Baiyappanahalli
      [77.6850, 12.9960], // KR Puram
      [77.7470, 12.9780], // Sri Sathya Sai
      [77.7610, 12.9960], // Whitefield
    ];
    const purpleNames = [
      'Challaghatta', 'Mysuru Road', 'Vijayanagar', 'Majestic', 'Vidhana Soudha',
      'MG Road', 'Indiranagar', 'Baiyappanahalli', 'KR Puram', 'ITPL', 'Whitefield',
    ];

    // Green Line Stations coordinates
    const greenCoords: Coordinates[] = [
      [77.5020, 13.0480], // Nagasandra
      [77.5270, 13.0200], // Peenya
      [77.5500, 12.9980], // Yeshwanthpur
      [77.5726, 12.9774], // Majestic Interchange
      [77.5760, 12.9560], // National College
      [77.5810, 12.9340], // South End Circle
      [77.5840, 12.9150], // Banashankari
      [77.5680, 12.8750], // Silk Institute
    ];
    const greenNames = [
      'Nagasandra', 'Peenya', 'Yeshwanthpur', 'Majestic', 'National College',
      'South End Circle', 'Banashankari', 'Silk Institute',
    ];

    // BMTC Outer Ring Road Bus Route (Silk Board <-> KR Puram via Bellandur)
    const orrBusCoords: Coordinates[] = [
      [77.6229, 12.9177], // Silk Board
      [77.6490, 12.9220], // HSR Layout
      [77.6740, 12.9250], // Agara
      [77.6844, 12.9260], // EcoSpace Bellandur
      [77.6970, 12.9370], // Marathahalli
      [77.6850, 12.9960], // KR Puram
    ];
    const orrBusNames = ['Silk Board', 'HSR Layout', 'Agara', 'Bellandur EcoSpace', 'Marathahalli', 'KR Puram'];

    // 1. Purple Line Train (Majestic -> Whitefield)
    this.vehicles.push({
      id: 'blr_train_purple_1',
      type: 'METRO',
      city: 'bengaluru',
      lineName: 'Purple Line (Eastbound)',
      lineColor: '#a855f7',
      waypoints: purpleCoords,
      stationNames: purpleNames,
      currentIndex: 3, // Majestic
      direction: 1,
      progress: 0.2,
      speed: 0.08,
      dwellSeconds: 2.5,
      currentDwell: 0,
      currentCoord: purpleCoords[3],
      bearing: 85,
      nextStation: 'Vidhana Soudha',
      occupancy: 'MODERATE',
      speedKmh: 48,
    });

    // 2. Purple Line Train (Whitefield -> Majestic)
    this.vehicles.push({
      id: 'blr_train_purple_2',
      type: 'METRO',
      city: 'bengaluru',
      lineName: 'Purple Line (Westbound)',
      lineColor: '#a855f7',
      waypoints: purpleCoords,
      stationNames: purpleNames,
      currentIndex: 8, // KR Puram
      direction: -1,
      progress: 0.6,
      speed: 0.08,
      dwellSeconds: 2.5,
      currentDwell: 0,
      currentCoord: purpleCoords[8],
      bearing: 265,
      nextStation: 'Baiyappanahalli',
      occupancy: 'HIGH',
      speedKmh: 52,
    });

    // 3. Green Line Train (Nagasandra -> Silk Institute)
    this.vehicles.push({
      id: 'blr_train_green_1',
      type: 'METRO',
      city: 'bengaluru',
      lineName: 'Green Line (Southbound)',
      lineColor: '#10b981',
      waypoints: greenCoords,
      stationNames: greenNames,
      currentIndex: 2, // Yeshwanthpur
      direction: 1,
      progress: 0.4,
      speed: 0.07,
      dwellSeconds: 2.5,
      currentDwell: 0,
      currentCoord: greenCoords[2],
      bearing: 175,
      nextStation: 'Majestic',
      occupancy: 'MODERATE',
      speedKmh: 45,
    });

    // 4. BMTC Vajra Electric Bus 500D (Silk Board -> KR Puram)
    this.vehicles.push({
      id: 'blr_bus_500d_1',
      type: 'BUS',
      city: 'bengaluru',
      lineName: 'BMTC Vajra 500D (AC)',
      lineColor: '#06b6d4',
      waypoints: orrBusCoords,
      stationNames: orrBusNames,
      currentIndex: 1,
      direction: 1,
      progress: 0.5,
      speed: 0.05,
      dwellSeconds: 3.5,
      currentDwell: 0,
      currentCoord: orrBusCoords[1],
      bearing: 75,
      nextStation: 'Agara',
      occupancy: 'HIGH',
      speedKmh: 28,
    });

    // 5. BMTC Vajra Electric Bus 500D (KR Puram -> Silk Board)
    this.vehicles.push({
      id: 'blr_bus_500d_2',
      type: 'BUS',
      city: 'bengaluru',
      lineName: 'BMTC Vajra 500D (AC)',
      lineColor: '#06b6d4',
      waypoints: orrBusCoords,
      stationNames: orrBusNames,
      currentIndex: 4,
      direction: -1,
      progress: 0.3,
      speed: 0.05,
      dwellSeconds: 3.5,
      currentDwell: 0,
      currentCoord: orrBusCoords[4],
      bearing: 250,
      nextStation: 'EcoSpace Bellandur',
      occupancy: 'MODERATE',
      speedKmh: 24,
    });
  }

  private initDelhiFleet() {
    // DMRC Yellow Line
    const yellowCoords: Coordinates[] = [
      [77.2285, 28.6675], // Kashmere Gate
      [77.2219, 28.6431], // New Delhi
      [77.2183, 28.6328], // Rajiv Chowk
      [77.2078, 28.5684], // AIIMS
      [77.2060, 28.5432], // Hauz Khas
      [77.2014, 28.5204], // Saket
      [77.0926, 28.4818], // Sikanderpur
      [77.0725, 28.4593], // Millennium City
    ];
    const yellowNames = [
      'Kashmere Gate', 'New Delhi', 'Rajiv Chowk', 'AIIMS', 'Hauz Khas',
      'Saket', 'Sikanderpur', 'Millennium City Centre',
    ];

    // DMRC Airport Express
    const airportCoords: Coordinates[] = [
      [77.2219, 28.6431], // New Delhi
      [77.2140, 28.6285], // Shivaji Stadium
      [77.1620, 28.5915], // Dhaula Kuan
      [77.1215, 28.5495], // Aerocity
      [77.0855, 28.5562], // IGI Airport T3
      [77.0583, 28.5523], // Dwarka 21
    ];
    const airportNames = ['New Delhi', 'Shivaji Stadium', 'Dhaula Kuan', 'Aerocity', 'IGI Airport T3', 'Dwarka 21'];

    // DTC AC Route (Connaught Place -> DLF Cyber City)
    const dtcBusCoords: Coordinates[] = [
      [77.2183, 28.6328], // Rajiv Chowk
      [77.1645, 28.5930], // Dhaula Kuan
      [77.1215, 28.5495], // Aerocity
      [77.0850, 28.5020], // Shankar Chowk
      [77.0885, 28.4912], // Cyber City
    ];
    const dtcBusNames = ['Rajiv Chowk', 'Dhaula Kuan', 'Aerocity', 'Shankar Chowk', 'Cyber City'];

    // 1. Yellow Line Train (Southbound to Gurgaon)
    this.vehicles.push({
      id: 'del_train_yellow_1',
      type: 'METRO',
      city: 'delhi',
      lineName: 'DMRC Yellow Line (Southbound)',
      lineColor: '#eab308',
      waypoints: yellowCoords,
      stationNames: yellowNames,
      currentIndex: 2, // Rajiv Chowk
      direction: 1,
      progress: 0.1,
      speed: 0.08,
      dwellSeconds: 2.5,
      currentDwell: 0,
      currentCoord: yellowCoords[2],
      bearing: 185,
      nextStation: 'AIIMS',
      occupancy: 'HIGH',
      speedKmh: 50,
    });

    // 2. Yellow Line Train (Northbound to Kashmere Gate)
    this.vehicles.push({
      id: 'del_train_yellow_2',
      type: 'METRO',
      city: 'delhi',
      lineName: 'DMRC Yellow Line (Northbound)',
      lineColor: '#eab308',
      waypoints: yellowCoords,
      stationNames: yellowNames,
      currentIndex: 6, // Sikanderpur
      direction: -1,
      progress: 0.5,
      speed: 0.08,
      dwellSeconds: 2.5,
      currentDwell: 0,
      currentCoord: yellowCoords[6],
      bearing: 5,
      nextStation: 'Saket',
      occupancy: 'MODERATE',
      speedKmh: 48,
    });

    // 3. Airport Express Superfast (New Delhi -> IGI T3)
    this.vehicles.push({
      id: 'del_train_airport_1',
      type: 'METRO',
      city: 'delhi',
      lineName: 'Airport Express Orange Line',
      lineColor: '#f97316',
      waypoints: airportCoords,
      stationNames: airportNames,
      currentIndex: 1, // Shivaji Stadium
      direction: 1,
      progress: 0.4,
      speed: 0.12,
      dwellSeconds: 2.0,
      currentDwell: 0,
      currentCoord: airportCoords[1],
      bearing: 220,
      nextStation: 'Dhaula Kuan',
      occupancy: 'LOW',
      speedKmh: 80,
    });

    // 4. DTC Electric Bus (CP -> Cyber City)
    this.vehicles.push({
      id: 'del_bus_dtc_1',
      type: 'BUS',
      city: 'delhi',
      lineName: 'DTC Low-Floor AC Electric',
      lineColor: '#10b981',
      waypoints: dtcBusCoords,
      stationNames: dtcBusNames,
      currentIndex: 1,
      direction: 1,
      progress: 0.4,
      speed: 0.05,
      dwellSeconds: 3.0,
      currentDwell: 0,
      currentCoord: dtcBusCoords[1],
      bearing: 225,
      nextStation: 'Aerocity',
      occupancy: 'MODERATE',
      speedKmh: 35,
    });
  }

  public tick(deltaSeconds: number) {
    for (const v of this.vehicles) {
      if (v.currentDwell > 0) {
        v.currentDwell -= deltaSeconds;
        continue;
      }

      v.progress += v.speed * deltaSeconds;

      if (v.progress >= 1.0) {
        v.progress = 0;
        v.currentIndex += v.direction;

        // Reached line terminus: reverse direction
        if (v.currentIndex >= v.waypoints.length - 1) {
          v.currentIndex = v.waypoints.length - 1;
          v.direction = -1;
        } else if (v.currentIndex <= 0) {
          v.currentIndex = 0;
          v.direction = 1;
        }

        // Station dwell
        v.currentDwell = v.dwellSeconds;
      }

      const nextIndex = v.currentIndex + v.direction;
      const c1 = v.waypoints[v.currentIndex];
      const c2 = v.waypoints[nextIndex] || c1;

      v.currentCoord = interpolateCoord(c1, c2, v.progress);
      v.bearing = Math.round(calculateBearing(c1, c2));
      v.nextStation = v.stationNames[nextIndex] || v.stationNames[v.currentIndex];
    }
  }

  public getGeoJSON(city: 'bengaluru' | 'delhi'): GeoJSON.FeatureCollection<GeoJSON.Point> {
    const activeVehicles = this.vehicles.filter((v) => v.city === city);

    return {
      type: 'FeatureCollection',
      features: activeVehicles.map((v) => ({
        type: 'Feature',
        id: v.id,
        properties: {
          id: v.id,
          type: v.type,
          lineName: v.lineName,
          lineColor: v.lineColor,
          bearing: v.bearing,
          nextStation: v.nextStation,
          occupancy: v.occupancy,
          speedKmh: v.speedKmh,
          label: `${v.type === 'METRO' ? '🚆' : '🚌'} ${v.lineName}`,
        },
        geometry: {
          type: 'Point',
          coordinates: v.currentCoord,
        },
      })),
    };
  }

  public getActiveVehicles(city: 'bengaluru' | 'delhi'): TransitVehicle[] {
    return this.vehicles.filter((v) => v.city === city);
  }
}
