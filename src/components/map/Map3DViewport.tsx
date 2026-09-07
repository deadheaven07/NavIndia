import React, { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { Feature, LineString } from 'geojson';
import type { Coordinates, RouteOption, TransitNode } from '../../algorithms/types';
import { generateBengaluru3DBuildings } from '../../algorithms/data/bengaluru-network';
import {
  Layers,
  Compass,
  Sun,
  Moon,
  Train,
  Car,
} from 'lucide-react';

interface Map3DViewportProps {
  nodes: TransitNode[];
  selectedRoute: RouteOption | null;
  originNode: TransitNode | null;
  destNode: TransitNode | null;
  onMapCoordinateClick: (coord: Coordinates) => void;
  simulationProgress: number; // 0 to 1
  isSimulating: boolean;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

export const Map3DViewport: React.FC<Map3DViewportProps> = ({
  nodes,
  selectedRoute,
  originNode,
  destNode,
  onMapCoordinateClick,
  simulationProgress,
  isSimulating,
  isDarkMode,
  onToggleTheme,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const simVehicleMarkerRef = useRef<maplibregl.Marker | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [is3DBuildingsVisible, setIs3DBuildingsVisible] = useState<boolean>(true);
  const [isMapReady, setIsMapReady] = useState<boolean>(false);
  const [currentPitch, setCurrentPitch] = useState<number>(60);
  const [currentBearing, setCurrentBearing] = useState<number>(-20);
  const [cameraMode, setCameraMode] = useState<'3D' | 'CHASE' | 'PLAN'>('3D');

  // Active step calculation during simulation or static view
  const currentStep = React.useMemo(() => {
    if (!selectedRoute || selectedRoute.legs.length === 0) return null;
    const totalLegs = selectedRoute.legs.length;
    const legIdx = Math.min(totalLegs - 1, Math.floor(simulationProgress * totalLegs));
    return selectedRoute.legs[legIdx];
  }, [selectedRoute, simulationProgress]);

  // Initialize MapLibre with light theme tiles by default
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const tileUrl = isDarkMode
      ? 'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png'
      : 'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png';

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {
          'osm-tiles': {
            type: 'raster',
            tiles: [
              tileUrl,
              tileUrl.replace('//a.', '//b.'),
              tileUrl.replace('//a.', '//c.'),
            ],
            tileSize: 256,
            attribution: '© CartoDB, © OpenStreetMap',
          },
        },
        layers: [
          {
            id: 'osm-tiles-layer',
            type: 'raster',
            source: 'osm-tiles',
            minzoom: 0,
            maxzoom: 20,
          },
        ],
      },
      center: [77.625, 12.965], // Center of Bengaluru transit corridor
      zoom: 12.6,
      pitch: 60, // 3D Camera Tilt
      bearing: -20, // 3D Angled Perspective
    });

    mapRef.current = map;

    // Navigation Controls
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');

    map.on('load', () => {
      // 1. Add 3D Extruded Buildings Layer
      const buildingsGeoJSON = generateBengaluru3DBuildings();

      map.addSource('3d-buildings-source', {
        type: 'geojson',
        data: buildingsGeoJSON,
      });

      map.addLayer({
        id: '3d-buildings-extrusion',
        type: 'fill-extrusion',
        source: '3d-buildings-source',
        paint: {
          'fill-extrusion-height': ['get', 'height'],
          'fill-extrusion-base': ['get', 'base_height'],
          'fill-extrusion-color': [
            'interpolate',
            ['linear'],
            ['get', 'height'],
            20, isDarkMode ? '#1e293b' : '#cbd5e1',
            50, isDarkMode ? '#0284c7' : '#93c5fd',
            80, isDarkMode ? '#06b6d4' : '#38bdf8',
            110, isDarkMode ? '#38bdf8' : '#0284c7',
          ],
          'fill-extrusion-opacity': isDarkMode ? 0.88 : 0.92,
        },
      });

      // 2. Add Sources and Layers for 3D Glowing Light-Trails
      map.addSource('route-light-trail-source', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      });

      // Outer Glow Stream
      map.addLayer({
        id: 'route-glow-stream',
        type: 'line',
        source: 'route-light-trail-source',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 14,
          'line-opacity': isDarkMode ? 0.35 : 0.35,
          'line-blur': 6,
        },
      });

      // Core Laser Light Stream
      map.addLayer({
        id: 'route-core-stream',
        type: 'line',
        source: 'route-light-trail-source',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#ffffff',
          'line-width': 4,
          'line-opacity': 0.98,
        },
      });

      // Mode-specific Colored Stream
      map.addLayer({
        id: 'route-mode-stream',
        type: 'line',
        source: 'route-light-trail-source',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 7,
          'line-opacity': 0.92,
        },
      });

      // Animated Pulsing Dash Line
      map.addLayer({
        id: 'route-pulse-stream',
        type: 'line',
        source: 'route-light-trail-source',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#ffffff',
          'line-width': 3.5,
          'line-dasharray': [0, 4, 3],
          'line-opacity': 0.95,
        },
      });

      // Start Light-Trail Pulse Animation Loop (throttled to avoid GPU buffer thrashing)
      let step = 0;
      let lastDashTime = 0;
      const animateDashArray = (time: number) => {
        if (time - lastDashTime > 60) {
          lastDashTime = time;
          step = (step + 0.25) % 12;
          const dash1 = (step) % 8;
          const dash2 = (step + 2) % 8;
          if (map.getLayer('route-pulse-stream')) {
            map.setPaintProperty('route-pulse-stream', 'line-dasharray', [dash1, dash2, 4]);
          }
        }
        animationFrameRef.current = requestAnimationFrame(animateDashArray);
      };
      animationFrameRef.current = requestAnimationFrame(animateDashArray);

      // Signal map is ready for dynamic layers and routes
      setIsMapReady(true);
    });

    map.on('click', (e) => {
      onMapCoordinateClick([e.lngLat.lng, e.lngLat.lat]);
    });

    map.on('rotate', () => {
      setCurrentBearing(Math.round(map.getBearing()));
    });

    map.on('pitch', () => {
      setCurrentPitch(Math.round(map.getPitch()));
    });

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
  }, [isDarkMode]);

  // Update Route Polyline & Dynamic Camera Fly-To when Selected Route Changes or Map Becomes Ready
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) return;

    const source = map.getSource('route-light-trail-source') as maplibregl.GeoJSONSource;
    if (!source) return;

    if (!selectedRoute || selectedRoute.fullGeometry.length < 2) {
      source.setData({
        type: 'FeatureCollection',
        features: [],
      });
      return;
    }

    const lineFeature: Feature<LineString> = {
      type: 'Feature',
      properties: {
        color: selectedRoute.accentColor,
      },
      geometry: {
        type: 'LineString',
        coordinates: selectedRoute.fullGeometry,
      },
    };

    source.setData({
      type: 'FeatureCollection',
      features: [lineFeature],
    });

    // Dynamic Camera Fly-To
    const coords = selectedRoute.fullGeometry;
    let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
    for (const [lng, lat] of coords) {
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }

    const centerLng = (minLng + maxLng) / 2;
    const centerLat = (minLat + maxLat) / 2;

    map.flyTo({
      center: [centerLng, centerLat],
      zoom: 12.8,
      pitch: cameraMode === 'PLAN' ? 0 : cameraMode === 'CHASE' ? 75 : 62,
      bearing: cameraMode === 'PLAN' ? 0 : -25,
      speed: 0.9,
      curve: 1.4,
      essential: true,
      easing: (t: number) => t * (2 - t),
    });
  }, [selectedRoute, cameraMode, isMapReady]);

  // Update Node Markers on the Map with Metro Badges
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Add Markers for Origin and Destination
    if (originNode) {
      const originEl = document.createElement('div');
      originEl.className = 'flex flex-col items-center cursor-pointer group pointer-events-auto';
      originEl.innerHTML = `
        <div class="px-2 py-0.5 rounded-full bg-emerald-600 text-white font-extrabold text-[10px] shadow-md mb-1 flex items-center gap-1 border border-white">
          <span>ORIGIN</span>
        </div>
        <div class="relative flex items-center justify-center">
          <div class="absolute w-7 h-7 rounded-full bg-emerald-500/30 animate-ping"></div>
          <div class="w-5 h-5 rounded-full bg-emerald-600 border-2 border-white shadow-md flex items-center justify-center text-white font-bold text-[9px]">A</div>
        </div>
      `;
      const marker = new maplibregl.Marker({ element: originEl })
        .setLngLat(originNode.coordinates)
        .addTo(map);
      markersRef.current.push(marker);
    }

    if (destNode) {
      const destEl = document.createElement('div');
      destEl.className = 'flex flex-col items-center cursor-pointer group pointer-events-auto';
      destEl.innerHTML = `
        <div class="px-2 py-0.5 rounded-full bg-sky-600 text-white font-extrabold text-[10px] shadow-md mb-1 flex items-center gap-1 border border-white">
          <span>DEST</span>
        </div>
        <div class="relative flex items-center justify-center">
          <div class="absolute w-7 h-7 rounded-full bg-sky-500/30 animate-ping"></div>
          <div class="w-5 h-5 rounded-full bg-sky-600 border-2 border-white shadow-md flex items-center justify-center text-white font-bold text-[9px]">B</div>
        </div>
      `;
      const marker = new maplibregl.Marker({ element: destEl })
        .setLngLat(destNode.coordinates)
        .addTo(map);
      markersRef.current.push(marker);
    }

    // Metro station and junction pill markers
    nodes.forEach((node) => {
      if (node.id === originNode?.id || node.id === destNode?.id) return;

      const isMetro = node.type === 'METRO_STATION';
      const el = document.createElement('div');

      if (isMetro) {
        el.className = 'px-1.5 py-0.5 rounded-full bg-white/95 dark:bg-slate-900 border border-sky-400 dark:border-cyan-500 text-[10px] font-bold text-sky-800 dark:text-cyan-300 shadow-md flex items-center gap-1 cursor-pointer hover:scale-110 transition-transform';
        el.innerHTML = `
          <span class="w-2 h-2 rounded-full bg-purple-600 inline-block"></span>
          <span class="whitespace-nowrap">${node.name.split(' ')[0]}</span>
        `;
      } else {
        el.className = 'w-2.5 h-2.5 rounded-full bg-slate-400 border border-white hover:scale-150 transition-transform cursor-pointer shadow-sm';
        el.title = `${node.name} (${node.zone})`;
      }

      el.onclick = (e: globalThis.MouseEvent) => {
        e.stopPropagation();
        onMapCoordinateClick(node.coordinates);
      };

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(node.coordinates)
        .addTo(map);
      markersRef.current.push(marker);
    });
  }, [nodes, originNode, destNode]);

  // Simulation Vehicle Gliding Marker with Directional Bearing
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
    const totalSegments = coords.length - 1;
    const clampedProgress = Math.min(1.0, Math.max(0, simulationProgress));
    const targetIdx = Math.min(
      totalSegments - 1,
      Math.floor(clampedProgress * totalSegments)
    );
    const fraction = (clampedProgress * totalSegments) - targetIdx;

    const p1 = coords[targetIdx];
    const p2 = coords[Math.min(targetIdx + 1, totalSegments)];

    const curLng = p1[0] + (p2[0] - p1[0]) * fraction;
    const curLat = p1[1] + (p2[1] - p1[1]) * fraction;

    // Calculate heading angle
    const dLng = p2[0] - p1[0];
    const dLat = p2[1] - p1[1];
    const angleRad = Math.atan2(dLng, dLat); // Angle from North clockwise
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

  const handleToggle3DBuildings = () => {
    const map = mapRef.current;
    if (!map) return;
    const visibility = !is3DBuildingsVisible;
    setIs3DBuildingsVisible(visibility);
    map.setLayoutProperty(
      '3d-buildings-extrusion',
      'visibility',
      visibility ? 'visible' : 'none'
    );
  };

  const handleSetCameraMode = (mode: '3D' | 'CHASE' | 'PLAN') => {
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
  };

  return (
    <div className="relative w-full h-full bg-slate-100 dark:bg-slate-950">
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Turn-by-Turn Real-Time Navigation Banner (Top Center below LatencyHUD) */}
      {selectedRoute && currentStep && (
        <div className="absolute top-18 left-1/2 -translate-x-1/2 z-20 pointer-events-auto max-w-[90vw] md:max-w-xl">
          <div className="glass-panel px-4 py-2.5 rounded-2xl shadow-xl border border-sky-200 dark:border-slate-800 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-md">
              {currentStep.mode === 'METRO' ? (
                <Train className="w-4 h-4" />
              ) : (
                <Car className="w-4 h-4" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-700 dark:text-cyan-400">
                  {isSimulating ? 'Live Navigation' : 'Next Step'}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {currentStep.distanceKm} km · {currentStep.durationMinutes} mins
                </span>
              </div>
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                {currentStep.instruction}
              </p>
            </div>
            <div className="text-right shrink-0 pr-1">
              <span className="text-xs font-mono font-black text-slate-800 dark:text-slate-200">
                ₹{currentStep.costINR}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Floating 3D Perspective & Camera Controls (Top Right) */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 pointer-events-auto">
        {/* Theme Toggle Pill */}
        <button
          type="button"
          onClick={onToggleTheme}
          className="glass-panel px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between gap-2 shadow-md border border-slate-200 dark:border-slate-800"
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
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            {isDarkMode ? 'DARK' : 'LIGHT'}
          </span>
        </button>

        {/* Camera Perspective Mode Selector */}
        <div className="glass-panel p-1 rounded-xl shadow-md border border-slate-200 dark:border-slate-800 flex gap-1">
          <button
            type="button"
            onClick={() => handleSetCameraMode('3D')}
            className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all ${
              cameraMode === '3D'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
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
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
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
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            2D Plan (0°)
          </button>
        </div>

        {/* 3D Buildings Toggle Button */}
        <button
          type="button"
          onClick={handleToggle3DBuildings}
          className={`glass-button px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs ${
            is3DBuildingsVisible
              ? 'text-sky-700 dark:text-cyan-300 border-sky-300 dark:border-cyan-500/40'
              : 'text-slate-500 dark:text-slate-400'
          }`}
          title="Toggle 3D Extruded Buildings"
        >
          <Layers className="w-3.5 h-3.5 text-sky-600 dark:text-cyan-400" />
          <span>3D Buildings {is3DBuildingsVisible ? 'ON' : 'OFF'}</span>
        </button>

        {/* Pitch & Bearing Telemetry Pill */}
        <div className="glass-panel px-3 py-1.5 rounded-xl text-[11px] font-mono text-slate-700 dark:text-slate-300 flex items-center justify-between gap-2 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-1">
            <Compass className="w-3 h-3 text-sky-600 dark:text-cyan-400" />
            <span>PITCH: <span className="font-bold">{currentPitch}°</span></span>
          </div>
          <span className="text-slate-300">|</span>
          <span>AZ: <span className="font-bold">{currentBearing}°</span></span>
        </div>
      </div>

      {/* Interactive Helper Overlay Tip (Bottom Center) */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
        <div className="glass-panel px-4 py-1.5 rounded-full text-xs text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-2 font-medium">
          <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse"></span>
          <span>Click anywhere on 3D map to snap GPS coordinates using 2D KD-Tree</span>
        </div>
      </div>
    </div>
  );
};
