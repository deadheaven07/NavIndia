import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { Coordinates, RouteOption, TransitNode } from '../../algorithms/types';
import type { TriggerIncidentPayload } from '../../workers/types';
import { generateBengaluru3DBuildings } from '../../algorithms/data/bengaluru-network-scaled';
import {
  Layers,
  Compass,
  Train,
  Car,
  Zap,
  Eye,
  Navigation,
  Sun,
  Moon,
} from 'lucide-react';

function round5(num: number): number {
  return Math.round(num * 100000) / 100000;
}

function getRouteGeoJSON(route: RouteOption | null): GeoJSON.FeatureCollection<GeoJSON.LineString> {
  if (!route || route.fullGeometry.length < 2) {
    return { type: 'FeatureCollection', features: [] };
  }

  const modeColors: Record<string, string> = {
    METRO: '#a855f7',
    CAB: '#f59e0b',
    AUTO: '#10b981',
    BUS: '#06b6d4',
    WALK: '#94a3b8',
  };

  if (route.legs && route.legs.length > 0) {
    return {
      type: 'FeatureCollection',
      features: route.legs.map((leg, index) => ({
        type: 'Feature',
        properties: {
          mode: leg.mode,
          color: modeColors[leg.mode] || route.accentColor || '#06b6d4',
          legIndex: index,
        },
        geometry: {
          type: 'LineString',
          coordinates: leg.pathCoordinates,
        },
      })),
    };
  }

  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          mode: 'MULTI',
          color: route.accentColor || '#06b6d4',
          legIndex: 0,
        },
        geometry: {
          type: 'LineString',
          coordinates: route.fullGeometry,
        },
      },
    ],
  };
}

interface Map3DViewportProps {
  nodes: TransitNode[];
  selectedRoute: RouteOption | null;
  originNode: TransitNode | null;
  destNode: TransitNode | null;
  originCoord?: Coordinates | null;
  destCoord?: Coordinates | null;
  onMapCoordinateClick: (coord: Coordinates) => void;
  onPinDrag?: (target: 'ORIGIN' | 'DESTINATION', coord: Coordinates) => void;
  pinTargetMode: 'ORIGIN' | 'DESTINATION';
  onTogglePinTargetMode: () => void;
  isCalculating?: boolean;
  simulationProgress: number; // 0 to 1
  isSimulating: boolean;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  activeIncident?: TriggerIncidentPayload | null;
}

// 8 Curated Iconic Transit Hubs that deserve permanent landmark badges (Tier 2)
const CURATED_LANDMARK_IDS = new Set([
  'majestic',
  'silk_board',
  'whitefield_itpl',
  'hebbal',
  'bellandur',
  'electronic_city',
  'purple_mg_road',
  'indiranagar_metro',
]);

export const Map3DViewport: React.FC<Map3DViewportProps> = ({
  nodes,
  selectedRoute,
  originNode,
  destNode,
  originCoord,
  destCoord,
  onMapCoordinateClick,
  onPinDrag,
  pinTargetMode,
  onTogglePinTargetMode,
  isCalculating = false,
  simulationProgress,
  isSimulating,
  isDarkMode,
  onToggleTheme,
  activeIncident,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const landmarkMarkersRef = useRef<maplibregl.Marker[]>([]);
  const odMarkersRef = useRef<{ origin?: maplibregl.Marker; dest?: maplibregl.Marker }>({});
  const incidentMarkerRef = useRef<maplibregl.Marker | null>(null);
  const simVehicleMarkerRef = useRef<maplibregl.Marker | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const currentStyleRef = useRef<string>('');

  const [is3DBuildingsVisible, setIs3DBuildingsVisible] = useState<boolean>(true);
  const [isNetworkGridVisible, setIsNetworkGridVisible] = useState<boolean>(true);
  const [isMapReady, setIsMapReady] = useState<boolean>(false);
  const [currentPitch, setCurrentPitch] = useState<number>(60);
  const [currentBearing, setCurrentBearing] = useState<number>(-20);
  const [cameraMode, setCameraMode] = useState<'3D' | 'CHASE' | 'PLAN'>('3D');

  // Active step calculation during simulation or navigation
  const currentStep = useMemo(() => {
    if (!selectedRoute || selectedRoute.legs.length === 0) return null;
    const totalLegs = selectedRoute.legs.length;
    const legIdx = Math.min(totalLegs - 1, Math.floor(simulationProgress * totalLegs));
    return selectedRoute.legs[legIdx];
  }, [selectedRoute, simulationProgress]);

  // Setup all custom WebGL GPU layers (3D buildings, 1,500+ nodes, glowing route streams)
  const setupCustomLayers = useCallback(
    (map: maplibregl.Map, isDark: boolean) => {
      try {
        // A. 3D Extruded Buildings Layer
        if (!map.getSource('3d-buildings-source')) {
          const buildingsGeoJSON = generateBengaluru3DBuildings();
          map.addSource('3d-buildings-source', {
            type: 'geojson',
            data: buildingsGeoJSON,
          });
        }

        if (!map.getLayer('3d-buildings-extrusion')) {
          map.addLayer({
            id: '3d-buildings-extrusion',
            type: 'fill-extrusion',
            source: '3d-buildings-source',
            layout: {
              visibility: is3DBuildingsVisible ? 'visible' : 'none',
            },
            paint: {
              'fill-extrusion-height': ['get', 'height'],
              'fill-extrusion-base': ['get', 'base_height'],
              'fill-extrusion-color': [
                'interpolate',
                ['linear'],
                ['get', 'height'],
                20, isDark ? '#1e293b' : '#cbd5e1',
                50, isDark ? '#0284c7' : '#94a3b8',
                80, isDark ? '#06b6d4' : '#38bdf8',
                110, isDark ? '#38bdf8' : '#0284c7',
              ],
              'fill-extrusion-opacity': isDark ? 0.85 : 0.72,
            },
          });
        } else {
          map.setPaintProperty('3d-buildings-extrusion', 'fill-extrusion-color', [
            'interpolate',
            ['linear'],
            ['get', 'height'],
            20, isDark ? '#1e293b' : '#cbd5e1',
            50, isDark ? '#0284c7' : '#94a3b8',
            80, isDark ? '#06b6d4' : '#38bdf8',
            110, isDark ? '#38bdf8' : '#0284c7',
          ]);
          map.setPaintProperty('3d-buildings-extrusion', 'fill-extrusion-opacity', isDark ? 0.85 : 0.72);
        }

        // B. GPU-Accelerated 1,500+ Node Network Grid (WebGL Circles - Tier 3)
        if (!map.getSource('transit-nodes-source')) {
          map.addSource('transit-nodes-source', {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: nodes.map((n) => ({
                type: 'Feature',
                geometry: { type: 'Point', coordinates: n.coordinates },
                properties: { id: n.id, name: n.name, type: n.type },
              })),
            },
          });
        } else {
          const s = map.getSource('transit-nodes-source') as maplibregl.GeoJSONSource;
          s.setData({
            type: 'FeatureCollection',
            features: nodes.map((n) => ({
              type: 'Feature',
              geometry: { type: 'Point', coordinates: n.coordinates },
              properties: { id: n.id, name: n.name, type: n.type },
            })),
          });
        }

        if (!map.getLayer('transit-nodes-glow')) {
          map.addLayer({
            id: 'transit-nodes-glow',
            type: 'circle',
            source: 'transit-nodes-source',
            layout: {
              visibility: isNetworkGridVisible ? 'visible' : 'none',
            },
            paint: {
              'circle-radius': [
                'interpolate',
                ['linear'],
                ['zoom'],
                11, 1.5,
                13, 2.5,
                15, 4.5,
              ],
              'circle-color': [
                'match',
                ['get', 'type'],
                'METRO_STATION', '#a855f7',
                'JUNCTION', isDark ? '#06b6d4' : '#0284c7',
                isDark ? '#38bdf8' : '#0ea5e9',
              ],
              'circle-opacity': [
                'interpolate',
                ['linear'],
                ['zoom'],
                11, 0.35,
                13, 0.65,
                16, 0.9,
              ],
              'circle-stroke-width': 1,
              'circle-stroke-color': isDark ? '#0ea5e9' : '#0284c7',
              'circle-stroke-opacity': 0.4,
            },
          });
        } else {
          map.setPaintProperty('transit-nodes-glow', 'circle-color', [
            'match',
            ['get', 'type'],
            'METRO_STATION', '#a855f7',
            'JUNCTION', isDark ? '#06b6d4' : '#0284c7',
            isDark ? '#38bdf8' : '#0ea5e9',
          ]);
          map.setPaintProperty('transit-nodes-glow', 'circle-stroke-color', isDark ? '#0ea5e9' : '#0284c7');
        }

        // C. Multi-Modal Laser Light-Trail Sources & Layers
        if (!map.getSource('route-light-trail-source')) {
          map.addSource('route-light-trail-source', {
            type: 'geojson',
            data: getRouteGeoJSON(selectedRoute),
          });
        } else {
          const s = map.getSource('route-light-trail-source') as maplibregl.GeoJSONSource;
          s.setData(getRouteGeoJSON(selectedRoute));
        }

        // Outer Neon Glow
        if (!map.getLayer('route-glow-stream')) {
          map.addLayer({
            id: 'route-glow-stream',
            type: 'line',
            source: 'route-light-trail-source',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
              'line-color': ['get', 'color'],
              'line-width': 14,
              'line-opacity': isDark ? 0.35 : 0.25,
              'line-blur': 6,
            },
          });
        }

        // Mode-Specific Solid Line
        if (!map.getLayer('route-mode-stream')) {
          map.addLayer({
            id: 'route-mode-stream',
            type: 'line',
            source: 'route-light-trail-source',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
              'line-color': ['get', 'color'],
              'line-width': 6,
              'line-opacity': 0.95,
            },
          });
        }

        // White Center Laser Core
        if (!map.getLayer('route-core-stream')) {
          map.addLayer({
            id: 'route-core-stream',
            type: 'line',
            source: 'route-light-trail-source',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
              'line-color': '#ffffff',
              'line-width': 2.5,
              'line-opacity': 0.98,
            },
          });
        }

        // Animated Pulse Stream
        if (!map.getLayer('route-pulse-stream')) {
          map.addLayer({
            id: 'route-pulse-stream',
            type: 'line',
            source: 'route-light-trail-source',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
              'line-color': '#ffffff',
              'line-width': 3,
              'line-dasharray': [0, 4, 3],
              'line-opacity': 0.9,
            },
          });
        }
      } catch (err) {
        console.warn('Transient error attaching custom layers:', err);
      }
    },
    [nodes, selectedRoute, is3DBuildingsVisible, isNetworkGridVisible]
  );

  // 1. Initialize MapLibre 3D Viewport with GPU WebGL layers
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const initialStyle = isDarkMode
      ? 'https://tiles.openfreemap.org/styles/dark'
      : 'https://tiles.openfreemap.org/styles/positron';

    currentStyleRef.current = initialStyle;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: initialStyle,
      center: [77.625, 12.965], // Center of Bengaluru transit corridor
      zoom: 12.5,
      pitch: 60,
      bearing: -20,
    });

    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');

    map.on('load', () => {
      setupCustomLayers(map, isDarkMode);

      // Pulse Animation Loop (throttled 60ms with safe try/catch for style transitions)
      let step = 0;
      let lastTime = 0;
      const animateDash = (time: number) => {
        if (time - lastTime > 60) {
          lastTime = time;
          step = (step + 0.3) % 12;
          try {
            const currentMap = mapRef.current;
            if (
              currentMap &&
              currentMap.isStyleLoaded() &&
              currentMap.getLayer('route-pulse-stream')
            ) {
              currentMap.setPaintProperty('route-pulse-stream', 'line-dasharray', [
                step % 8,
                (step + 2) % 8,
                4,
              ]);
            }
          } catch {
            // Ignore transient sprite/dashatlas initialization during style reloading
          }
        }
        animationFrameRef.current = requestAnimationFrame(animateDash);
      };
      animationFrameRef.current = requestAnimationFrame(animateDash);

      setIsMapReady(true);
    });

    // Map Click Listener for GPS junction snapping
    map.on('click', (e) => {
      onMapCoordinateClick([e.lngLat.lng, e.lngLat.lat]);
    });

    map.on('rotate', () => setCurrentBearing(Math.round(map.getBearing())));
    map.on('pitch', () => setCurrentPitch(Math.round(map.getPitch())));

    const resizeObserver = new ResizeObserver(() => {
      map.resize();
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (simVehicleMarkerRef.current) {
        simVehicleMarkerRef.current.remove();
        simVehicleMarkerRef.current = null;
      }
      setIsMapReady(false);
      map.remove();
    };
  }, []);

  // 2. Dynamic Style Switching on isDarkMode Toggle
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) return;

    const targetStyle = isDarkMode
      ? 'https://tiles.openfreemap.org/styles/dark'
      : 'https://tiles.openfreemap.org/styles/positron';

    if (currentStyleRef.current === targetStyle) return;
    currentStyleRef.current = targetStyle;

    map.setStyle(targetStyle);
    map.once('style.load', () => {
      setupCustomLayers(map, isDarkMode);
    });
  }, [isDarkMode, isMapReady, setupCustomLayers]);

  // 3. Feed 1,500+ Nodes into GPU WebGL Source
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) return;
    try {
      if (!map.isStyleLoaded()) return;
      const source = map.getSource('transit-nodes-source') as maplibregl.GeoJSONSource;
      if (source && nodes.length > 0) {
        source.setData({
          type: 'FeatureCollection',
          features: nodes.map((n) => ({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: n.coordinates },
            properties: { id: n.id, name: n.name, type: n.type },
          })),
        });
      }
    } catch {
      // transient during style reload
    }
  }, [nodes, isMapReady]);

  // 4. Render Curated Landmark Badges ONLY (Max 8 Hubs across entire Bengaluru - Tier 2)
  useEffect(() => {
    if (!mapRef.current || !isMapReady) return;

    // Clear old landmark markers
    landmarkMarkersRef.current.forEach((m) => m.remove());
    landmarkMarkersRef.current = [];

    // Filter strictly to curated landmark stations
    const landmarkNodes = nodes.filter((n) => CURATED_LANDMARK_IDS.has(n.id));

    landmarkNodes.forEach((node) => {
      const el = document.createElement('div');
      el.className =
        'group flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/90 dark:bg-slate-900/85 backdrop-blur-md border border-slate-300/80 dark:border-cyan-500/40 shadow-md shadow-slate-300/40 dark:shadow-cyan-950/50 cursor-pointer hover:border-sky-500 dark:hover:border-cyan-400 hover:scale-105 transition-all select-none';
      el.innerHTML = `
        <span class="w-2 h-2 rounded-full ${
          node.type === 'METRO_STATION' ? 'bg-purple-600 dark:bg-purple-400 shadow-purple-500/50' : 'bg-sky-500 dark:bg-cyan-400 shadow-cyan-500/50'
        } shadow-sm"></span>
        <span class="text-[11px] font-semibold text-slate-800 dark:text-slate-200 tracking-wide select-none">${node.name}</span>
      `;

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        onMapCoordinateClick(node.coordinates);
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(node.coordinates)
        .addTo(mapRef.current!);

      landmarkMarkersRef.current.push(marker);
    });
  }, [nodes, isMapReady, onMapCoordinateClick, isDarkMode]);

  // 5. Render Explicit Origin (A - Emerald) & Destination (B - Rose) Interactive Draggable Pins (Tier 1)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) return;

    // Clean up previous OD markers
    if (odMarkersRef.current.origin) odMarkersRef.current.origin.remove();
    if (odMarkersRef.current.dest) odMarkersRef.current.dest.remove();

    const originTarget = originCoord || (originNode ? originNode.coordinates : null);
    const destTarget = destCoord || (destNode ? destNode.coordinates : null);

    // Origin Pin (Emerald Green, Draggable)
    if (originTarget) {
      const el = document.createElement('div');
      el.className = 'flex flex-col items-center cursor-grab active:cursor-grabbing group pointer-events-auto select-none -translate-y-4';
      el.innerHTML = `
        <div class="flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-600 dark:bg-emerald-950/95 border border-white dark:border-emerald-400/80 shadow-xl text-[11px] font-bold text-white dark:text-emerald-300">
          <span class="w-2 h-2 rounded-full bg-white dark:bg-emerald-400 animate-pulse"></span>
          <span>A: ${originNode ? originNode.name : 'Origin'}</span>
        </div>
        <div class="w-2 h-2 bg-emerald-600 dark:bg-emerald-400 rotate-45 -mt-1 shadow-sm"></div>
      `;
      const originMarker = new maplibregl.Marker({ element: el, draggable: true })
        .setLngLat(originTarget)
        .addTo(map);

      originMarker.on('dragend', () => {
        const lngLat = originMarker.getLngLat();
        onPinDrag?.('ORIGIN', [round5(lngLat.lng), round5(lngLat.lat)]);
      });

      odMarkersRef.current.origin = originMarker;
    }

    // Destination Pin (Rose Red, Draggable)
    if (destTarget) {
      const el = document.createElement('div');
      el.className = 'flex flex-col items-center cursor-grab active:cursor-grabbing group pointer-events-auto select-none -translate-y-4';
      el.innerHTML = `
        <div class="flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-600 dark:bg-rose-950/95 border border-white dark:border-rose-400/80 shadow-xl text-[11px] font-bold text-white dark:text-rose-300">
          <span class="w-2 h-2 rounded-full bg-white dark:bg-rose-400 animate-pulse"></span>
          <span>B: ${destNode ? destNode.name : 'Destination'}</span>
        </div>
        <div class="w-2 h-2 bg-rose-600 dark:bg-rose-400 rotate-45 -mt-1 shadow-sm"></div>
      `;
      const destMarker = new maplibregl.Marker({ element: el, draggable: true })
        .setLngLat(destTarget)
        .addTo(map);

      destMarker.on('dragend', () => {
        const lngLat = destMarker.getLngLat();
        onPinDrag?.('DESTINATION', [round5(lngLat.lng), round5(lngLat.lat)]);
      });

      odMarkersRef.current.dest = destMarker;
    }
  }, [originNode, destNode, originCoord, destCoord, onPinDrag, isMapReady, isDarkMode]);

  // 5.1 Render Dynamic Incident Shockwave Chokepoint on Map
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) return;

    if (incidentMarkerRef.current) {
      incidentMarkerRef.current.remove();
      incidentMarkerRef.current = null;
    }

    if (activeIncident) {
      const el = document.createElement('div');
      el.className = 'relative flex items-center justify-center pointer-events-none -translate-y-4 select-none';
      el.innerHTML = `
        <div class="absolute w-28 h-28 rounded-full bg-rose-500/25 animate-ping"></div>
        <div class="absolute w-16 h-16 rounded-full bg-rose-600/35 animate-pulse"></div>
        <div class="px-2.5 py-1 rounded-full bg-rose-950/95 border border-rose-400 text-rose-200 font-extrabold text-[10px] shadow-2xl flex items-center gap-1.5 backdrop-blur-md">
          <span class="w-2 h-2 rounded-full bg-rose-400 animate-ping"></span>
          <span>⚡ GRIDLOCK: ${activeIncident.name} (${activeIncident.severityMultiplier}x)</span>
        </div>
      `;
      incidentMarkerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat(activeIncident.center)
        .addTo(map);
    }
  }, [activeIncident, isMapReady]);

  // 6. Update Light-Trail Trajectory & Camera on Route Selection
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) return;

    try {
      if (map.isStyleLoaded()) {
        const source = map.getSource('route-light-trail-source') as maplibregl.GeoJSONSource;
        if (source) {
          source.setData(getRouteGeoJSON(selectedRoute));
        }
      }
    } catch {
      // transient during style reload
    }

    if (!selectedRoute || selectedRoute.fullGeometry.length < 2) return;

    // Smoothly fly camera to frame the calculated route
    const allCoords = selectedRoute.fullGeometry;
    if (allCoords.length > 0) {
      const bounds = allCoords.reduce(
        (acc, coord) => acc.extend(coord as [number, number]),
        new maplibregl.LngLatBounds(allCoords[0] as [number, number], allCoords[0] as [number, number])
      );
      map.fitBounds(bounds, {
        padding: { top: 120, bottom: 180, left: 460, right: 80 },
        pitch: cameraMode === 'PLAN' ? 0 : cameraMode === 'CHASE' ? 70 : 58,
        bearing: cameraMode === 'PLAN' ? 0 : -20,
        duration: 1400,
        maxZoom: 14.5,
      });
    }
  }, [selectedRoute, cameraMode, isMapReady]);

  // 7. Simulation Vehicle Gliding Marker with Heading Bearing
  const lastCameraFollowRef = useRef<number>(0);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady || !selectedRoute || selectedRoute.fullGeometry.length < 2) return;

    if (!simVehicleMarkerRef.current) {
      const simEl = document.createElement('div');
      simEl.className = 'relative flex items-center justify-center';
      simEl.innerHTML = `
        <div class="absolute w-12 h-12 rounded-full bg-sky-400/40 animate-ping pointer-events-none"></div>
        <div class="sim-vehicle-icon w-8 h-8 rounded-full bg-gradient-to-tr from-sky-600 to-indigo-600 border-2 border-white shadow-xl flex items-center justify-center text-white font-black text-sm pointer-events-none transition-transform duration-75">
          ▲
        </div>
      `;
      simVehicleMarkerRef.current = new maplibregl.Marker({ element: simEl })
        .setLngLat(selectedRoute.fullGeometry[0])
        .addTo(map);
    }

    const coords = selectedRoute.fullGeometry;
    if (!coords || coords.length < 2) return;

    const totalSegments = coords.length - 1;
    const clampedProgress = Math.min(1.0, Math.max(0, Number.isFinite(simulationProgress) ? simulationProgress : 0));
    const targetIdx = Math.max(
      0,
      Math.min(totalSegments - 1, Math.floor(clampedProgress * totalSegments))
    );
    const fraction = Math.max(0, Math.min(1, (clampedProgress * totalSegments) - targetIdx));

    const p1 = coords[targetIdx];
    const p2 = coords[Math.min(targetIdx + 1, totalSegments)];
    if (!p1 || !p2) return;

    const curLng = p1[0] + (p2[0] - p1[0]) * fraction;
    const curLat = p1[1] + (p2[1] - p1[1]) * fraction;

    // Calculate heading angle
    const dLng = p2[0] - p1[0];
    const dLat = p2[1] - p1[1];
    const angleRad = Math.atan2(dLng, dLat);
    const angleDeg = (angleRad * 180) / Math.PI;

    const markerEl = simVehicleMarkerRef.current.getElement();
    const iconEl = markerEl?.querySelector('.sim-vehicle-icon') as HTMLElement | null;
    if (iconEl) {
      iconEl.style.transform = `rotate(${Math.round(angleDeg)}deg)`;
    }

    simVehicleMarkerRef.current.setLngLat([curLng, curLat]);

    // Smooth camera tracking while simulating
    if (isSimulating) {
      const now = performance.now();
      if (now - lastCameraFollowRef.current > 100) {
        lastCameraFollowRef.current = now;
        map.easeTo({
          center: [curLng, curLat],
          duration: 120,
          pitch: cameraMode === 'PLAN' ? 0 : cameraMode === 'CHASE' ? 75 : 62,
          easing: (t) => t,
        });
      }
    }
  }, [simulationProgress, selectedRoute, isSimulating, cameraMode, isMapReady]);

  // Camera Presets
  const handleResetBearing = useCallback(() => {
    if (!mapRef.current) return;
    mapRef.current.easeTo({ bearing: 0, pitch: 0, duration: 800 });
  }, []);

  const handleSetCameraMode = useCallback((mode: '3D' | 'CHASE' | 'PLAN') => {
    setCameraMode(mode);
    const map = mapRef.current;
    if (!map) return;

    if (mode === '3D') {
      map.flyTo({ pitch: 60, bearing: -20, zoom: 13, speed: 1.0 });
    } else if (mode === 'CHASE') {
      map.flyTo({ pitch: 75, bearing: -10, zoom: 14.5, speed: 1.0 });
    } else if (mode === 'PLAN') {
      map.flyTo({ pitch: 0, bearing: 0, zoom: 12.5, speed: 1.0 });
    }
  }, []);

  const toggleBuildingLayer = useCallback(() => {
    if (!mapRef.current) return;
    const nextVal = !is3DBuildingsVisible;
    setIs3DBuildingsVisible(nextVal);
    if (mapRef.current.isStyleLoaded() && mapRef.current.getLayer('3d-buildings-extrusion')) {
      mapRef.current.setLayoutProperty(
        '3d-buildings-extrusion',
        'visibility',
        nextVal ? 'visible' : 'none'
      );
    }
  }, [is3DBuildingsVisible]);

  const toggleNetworkGrid = useCallback(() => {
    if (!mapRef.current) return;
    const nextVal = !isNetworkGridVisible;
    setIsNetworkGridVisible(nextVal);
    if (mapRef.current.isStyleLoaded() && mapRef.current.getLayer('transit-nodes-glow')) {
      mapRef.current.setLayoutProperty(
        'transit-nodes-glow',
        'visibility',
        nextVal ? 'visible' : 'none'
      );
    }
  }, [isNetworkGridVisible]);

  return (
    <div className="relative w-full h-full overflow-hidden select-none bg-slate-100 dark:bg-slate-950 transition-colors duration-300">
      {/* MapLibre WebGL Canvas Container */}
      <div ref={mapContainerRef} className="w-full h-full cursor-crosshair" />

      {/* Turn-by-Turn Real-Time Navigation Banner (Top Center below LatencyHUD) */}
      {selectedRoute && currentStep && (
        <div className="absolute top-18 left-1/2 -translate-x-1/2 z-20 pointer-events-auto max-w-[90vw] md:max-w-xl">
          <div className="glass-panel px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-md">
              {currentStep.mode === 'METRO' ? (
                <Train className="w-4 h-4" />
              ) : (
                <Car className="w-4 h-4" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-600 dark:text-cyan-400">
                  {isSimulating ? 'Live Navigation' : 'Next Step'}
                </span>
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                  {currentStep.distanceKm} km · {currentStep.durationMinutes} mins
                </span>
              </div>
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                {currentStep.instruction}
              </p>
            </div>
            <div className="text-right shrink-0 pr-1">
              <span className="text-xs font-mono font-black text-slate-900 dark:text-slate-200">
                ₹{currentStep.costINR}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 3D Map Viewport Floating Toolbar (Top Right) */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 pointer-events-auto">
        {/* Theme Toggle Button */}
        <button
          type="button"
          onClick={onToggleTheme}
          className="glass-panel px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between gap-2 shadow-md cursor-pointer"
          title="Toggle Light / Dark theme"
        >
          <div className="flex items-center gap-1.5">
            {isDarkMode ? (
              <Moon className="w-3.5 h-3.5 text-indigo-400" />
            ) : (
              <Sun className="w-3.5 h-3.5 text-amber-500" />
            )}
            <span>{isDarkMode ? 'Dark Theme' : 'Light Theme'}</span>
          </div>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-extrabold">
            {isDarkMode ? 'DARK' : 'LIGHT'}
          </span>
        </button>

        {/* Camera Perspective Mode Selector */}
        <div className="glass-panel p-1 rounded-xl shadow-md flex gap-1">
          <button
            type="button"
            onClick={() => handleSetCameraMode('3D')}
            className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all ${
              cameraMode === '3D'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            3D Tilt (60°)
          </button>
          <button
            type="button"
            onClick={() => handleSetCameraMode('CHASE')}
            className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all ${
              cameraMode === 'CHASE'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            Chase (75°)
          </button>
          <button
            type="button"
            onClick={() => handleSetCameraMode('PLAN')}
            className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all ${
              cameraMode === 'PLAN'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            2D Plan (0°)
          </button>
        </div>

        {/* Action Button Row: 3D Buildings, 1,500-Node WebGL Grid, Compass */}
        <div className="flex items-center gap-2 self-end">
          {/* Toggle 3D Buildings */}
          <button
            type="button"
            onClick={toggleBuildingLayer}
            title="Toggle 3D Extruded Buildings"
            className={`p-2.5 rounded-xl backdrop-blur-md border transition-all shadow-lg cursor-pointer ${
              is3DBuildingsVisible
                ? 'bg-sky-100 dark:bg-cyan-950/80 border-sky-400 dark:border-cyan-500/50 text-sky-700 dark:text-cyan-300'
                : 'glass-button'
            }`}
          >
            <Layers className="w-4 h-4" />
          </button>

          {/* Toggle 1,500+ Node Network Grid */}
          <button
            type="button"
            onClick={toggleNetworkGrid}
            title="Toggle 1,500-Node GPU WebGL Grid"
            className={`p-2.5 rounded-xl backdrop-blur-md border transition-all shadow-lg cursor-pointer ${
              isNetworkGridVisible
                ? 'bg-sky-100 dark:bg-cyan-950/80 border-sky-400 dark:border-cyan-500/50 text-sky-700 dark:text-cyan-300'
                : 'glass-button'
            }`}
          >
            <Eye className="w-4 h-4" />
          </button>

          {/* Compass Reset North */}
          <button
            type="button"
            onClick={handleResetBearing}
            title="Reset North Facing"
            className="glass-button p-2.5 rounded-xl cursor-pointer"
          >
            <Compass
              className="w-4 h-4 transition-transform duration-300"
              style={{ transform: `rotate(${-currentBearing}deg)` }}
            />
          </button>
        </div>
      </div>

      {/* Floating Status / Target Mode Banner (Bottom Center) */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 pointer-events-auto flex items-center gap-2">
        <div className="glass-panel px-4 py-1.5 rounded-full text-xs text-slate-700 dark:text-slate-200 shadow-md flex items-center gap-2.5 font-medium backdrop-blur-xl">
          <div className="flex items-center gap-1.5">
            {isCalculating ? (
              <Zap className="w-3.5 h-3.5 text-amber-500 animate-spin" />
            ) : (
              <Navigation className="w-3.5 h-3.5 text-sky-600 dark:text-cyan-400 animate-pulse" />
            )}
            <span className="text-[11px] font-semibold">
              {isCalculating ? 'Computing Pareto routes via Web Worker...' : 'Click map to snap GPS junction & route:'}
            </span>
          </div>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <button
            type="button"
            onClick={onTogglePinTargetMode}
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold transition-all border cursor-pointer ${
              pinTargetMode === 'DESTINATION'
                ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800 hover:bg-rose-100'
                : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100'
            }`}
            title="Click to toggle whether map clicks update Origin or Destination"
          >
            Clicking Sets: {pinTargetMode === 'DESTINATION' ? 'DESTINATION (B)' : 'ORIGIN (A)'}
          </button>
        </div>
      </div>

      {/* Real-Time HUD Coordinate & GPU WebGL Telemetry Readout (Bottom Left) */}
      <div className="absolute bottom-3 left-4 z-20 flex items-center gap-3 px-3 py-1.5 rounded-lg bg-white/90 dark:bg-slate-950/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 text-[10px] font-mono text-slate-600 dark:text-slate-400 pointer-events-none shadow-sm">
        <div className="flex items-center gap-1 text-sky-600 dark:text-cyan-400">
          <Zap className="w-3 h-3" />
          <span>GPU WebGL Locked 60 FPS</span>
        </div>
        <span className="text-slate-300 dark:text-slate-600">|</span>
        <div>PITCH: {currentPitch}°</div>
        <span className="text-slate-300 dark:text-slate-600">|</span>
        <div>AZ: {currentBearing}°</div>
        <span className="text-slate-300 dark:text-slate-600">|</span>
        <div>NODES: {nodes.length}</div>
      </div>
    </div>
  );
};
