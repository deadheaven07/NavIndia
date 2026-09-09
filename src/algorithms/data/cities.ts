import type { Coordinates } from '../types';

export type CityId = 'bengaluru' | 'delhi';

export interface CityConfig {
  id: CityId;
  name: string;
  state: string;
  tagline: string;
  bounds: {
    minLon: number;
    maxLon: number;
    minLat: number;
    maxLat: number;
  };
  center: Coordinates;
  zoom: number;
  pitch: number;
  bearing: number;
  defaultOriginId: string;
  defaultDestId: string;
  currency: string;
  metroBrand: string;
  busBrand: string;
  monsoonIncidentName: string;
}

export const CITIES: Record<CityId, CityConfig> = {
  bengaluru: {
    id: 'bengaluru',
    name: 'Bengaluru',
    state: 'Karnataka',
    tagline: 'Silicon Valley Transit Corridor',
    bounds: {
      minLon: 77.5000,
      maxLon: 77.7800,
      minLat: 12.8200,
      maxLat: 13.0800,
    },
    center: [77.625, 12.965],
    zoom: 12.5,
    pitch: 60,
    bearing: -20,
    defaultOriginId: 'majestic',
    defaultDestId: 'whitefield_itpl',
    currency: '₹',
    metroBrand: 'Namma Metro',
    busBrand: 'BMTC',
    monsoonIncidentName: 'Silk Board Central Gridlock',
  },
  delhi: {
    id: 'delhi',
    name: 'Delhi NCR',
    state: 'National Capital Region',
    tagline: 'Capital Metro & Cyber City Expressway',
    bounds: {
      minLon: 76.9500,
      maxLon: 77.4500,
      minLat: 28.4000,
      maxLat: 28.8000,
    },
    center: [77.218, 28.630], // Centered at Connaught Place
    zoom: 12.2,
    pitch: 60,
    bearing: -15,
    defaultOriginId: 'delhi_rajiv_chowk',
    defaultDestId: 'delhi_cyber_city',
    currency: '₹',
    metroBrand: 'Delhi Metro (DMRC)',
    busBrand: 'DTC',
    monsoonIncidentName: 'DND Flyway & Minto Bridge Waterlogging',
  },
};
