# NavIndia (SuperRoute) 🇮🇳
> **Interactive 3D Multi-Modal Urban Transit Engine for Indian Metros**

[![Vite](https://img.shields.io/badge/Vite-8.2-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![MapLibre GL](https://img.shields.io/badge/MapLibre_GL-3D_Vector-396B94)](https://maplibre.org/)
[![Vitest](https://img.shields.io/badge/Vitest-Unit_Tested-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev/)

NavIndia (SuperRoute) is a production-grade 3D multi-modal urban navigation and routing engine designed for Indian megacities (featuring Bengaluru's complex transit and tech corridors). It mathematically solves the real-world commuter dilemma across disparate modes: **Metro Rail**, **App Cabs/Taxis**, **Auto-Rickshaws**, **BMTC City Buses**, and **Pedestrian Links**.

---

## 🚀 Key Highlights & Architecture

```
                                  [ User GPS Click ]
                                          │
                                          ▼
                                ┌──────────────────┐
                                │   2D KD-Tree     │ O(log N) Spatial Snapping
                                └─────────┬────────┘
                                          │
                   ┌──────────────────────┴──────────────────────┐
                   ▼                                             ▼
       ┌───────────────────────┐                     ┌───────────────────────┐
       │   A* Euclidean Solver │                     │ Multimodal Multigraph │
       └───────────┬───────────┘                     └───────────────────────┘
                   │
                   ▼
       ┌────────────────────────────────────────────────────────┐
       │             Pareto Frontier Generator                  │
       ├─────────────────┬───────────────────┬──────────────────┤
       │ 1. Direct Cab   │ 2. Smart Transit  │ 3. Budget Bus    │
       │    (Fastest)    │    (Auto + Metro) │    (Max Savings) │
       └─────────┬───────┴─────────┬─────────┴─────────┬────────┘
                 │                 │                   │
                 ▼                 ▼                   ▼
       ┌────────────────────────────────────────────────────────┐
       │           3D Mapbox / MapLibre GL JS Viewport          │
       │  • Angled Perspective (pitch: 60°, bearing: -20°)      │
       │  • 3D Extruded City Buildings (15m - 110m)             │
       │  • Glowing Animated 3D Light-Trails (Cyan/Emerald/Amber)│
       │  • Cinematic Dynamic Camera Fly-To & Trajectory Follow │
       └────────────────────────────────────────────────────────┘
```

### 1. 3D Geospatial Engine (`/components/map/`)
- **3D Building Extrusions**: Generates architectural 3D building blocks (`fill-extrusion-height` up to 110m) around key IT parks and CBD zones (ITPL Whitefield, EcoSpace Bellandur, Infosys Campus Electronic City, MG Road CBD).
- **Animated 3D Light-Trails**: Route polylines pulse as glowing laser streams winding between city blocks:
  - 🚆 **Royal Azure / Cyan**: Namma Metro Rapid Rail
  - 🚕 **Emerald Forest**: Direct Highway / Arterial Cab
  - 🛺 **Warm Amber**: Agile Auto-Rickshaw
  - 🚌 **Crimson Ruby**: BMTC City Bus
- **Multi-Perspective Camera System**:
  - `3D Tilt (60°)`: Angled perspective showcasing city extrusions.
  - `Chase Follow (75°)`: Low-altitude vehicle tracking view.
  - `2D Plan (0°)`: Top-down orthographic navigation view.
- **Turn-by-Turn Dynamic HUD**: Top floating navigation banner with live step directions, distance remaining, and transit fares.

### 2. Live Moving Transit Fleet Engine (`/components/map/TransitFleetLayer.ts`)
- **Real-Time Moving Metro Trains & Electric Buses**: Simulates active metro trains (Purple Line, Green Line, DMRC Yellow Line, Airport Express) and city buses traversing actual track and road geometry at authentic transit velocities.
- **Dynamic Dwell Times**: Realistic 20-30s station dwell times for passenger boarding/alighting with acceleration and deceleration profiles.
- **Interactive Telemetry Popups**: Hover over any live vehicle on the 3D map to inspect real-time speed (km/h), next station ETA, line color, and crowd occupancy levels.

### 3. Voice Input & Hands-Free Audio Commute Copilot (`/components/ai/`)
- **Speech-to-Text Natural Language Search**: Integrated microphone button utilizing native browser `webkitSpeechRecognition` / `SpeechRecognition` to dictate routes hands-free (e.g. *"Route from Rajiv Chowk to Cyber City"* or *"Majestic to Whitefield avoiding Silk Board"*).
- **Text-to-Speech Audio Commute Advisor**: Listen to AI-generated route summaries, traffic warnings, and multimodal transfer instructions via `window.speechSynthesis` audio playback.

### 4. Pan-India Multi-City Expansion: Delhi NCR Multimodal Network (`/algorithms/data/delhi-network-scaled.ts`)
- **DMRC Metro Network**: DMRC Yellow Line (Kashmere Gate to Gurgaon Millennium City Centre), Blue Line (Dwarka to Noida Electronic City), and high-speed Orange Line Airport Express (New Delhi Railway Station to IGI Airport Terminal 3).
- **3D Extruded Delhi Landmarks**: Architectural 3D buildings around DLF Cyber City (up to 125m high-rises), Connaught Place inner/outer circles, Aerocity tech parks, and Nehru Place IT district.
- **One-Click City Switcher**: Seamlessly toggle between **Bengaluru** (Namma Metro + BMTC) and **Delhi NCR** (DMRC + DTC) with instantaneous camera fly-to animations and route recalculations.

### 5. Live GPS Location Tracking & Mobile Turn-by-Turn Navigation HUD (`/components/hud/TurnByTurnNavOverlay.tsx`)
- **Live Device Geolocation (`navigator.geolocation`)**: One-tap "Locate Me" button instantly centers the camera on the user's current GPS position, snaps to the nearest transit network junction in $<1\text{ms}$ via 2D KD-Tree, and designates it as the origin.
- **Mobile Turn-by-Turn Commuter HUD**: Floating navigational HUD with mode badges (Train, Bus, Cab, Auto, Walk), distance counters, next maneuver preview, and native mobile haptic feedback (`navigator.vibrate`).

### 6. Dynamic 3D Canvas Monsoon Rain & Flood Risk Heatmap (`/components/map/RainCanvasOverlay.tsx`)
- **60 FPS Monsoon Rain Particles**: Hardware-accelerated 2D/3D canvas particle system rendering dynamic angled raindrops and expanding splash impact ripples over the map.
- **Low-Lying Waterlogging Shockwaves**: Pulsing semi-transparent flood risk danger zones covering known urban choke points (Bengaluru: Bellandur EcoSpace, Silk Board; Delhi NCR: Minto Bridge Underpass, DND Yamuna Floodplain).

### 7. Glassmorphic HUD Deck (`/components/hud/`)
- **Light Theme Default**: Crisp white glassmorphism (`rgba(255, 255, 255, 0.88)` with `backdrop-filter: blur(20px)`), high-contrast slate typography, and instant dark mode toggle.
- **Proportional Multi-Modal Timeline Bar**: Visual segmented duration indicator showing exact percentage of Metro vs Cab vs Auto vs Walk.
- **Pareto Trade-Off Matrix**: Side-by-side comparative table analyzing Duration, Total Fare (₹), Transfers Count, and CO₂ footprint across all 3 archetypes.
- **Live Latency HUD**: Monospace telemetry pill tracking $O(\log N)$ KD-Tree snap time, A* pathfinding latency in milliseconds, and network graph density ($V/E$).
- **Peak Hour Congestion Calibration**: Toggles realistic 1.55x road delays to demonstrate the zero-traffic advantage of Namma Metro.

### 3. Core Computer Science Algorithms (`/algorithms/`)
- **Weighted Directed Multigraph**: Dual-weighted edges representing Indian transit (Travel Time in mins, Monetary Cost in INR, Distances in km, Traffic Multipliers).
- **2D Spatial KD-Tree**: Snaps clicked GPS coordinates to the nearest graph junction in $O(\log N)$ time using the spherical Haversine metric.
- **A* Search Algorithm**: Admissible Euclidean / Haversine distance heuristic ($h(n) = \text{distance} / v_{\max}$) driven by a custom Binary Min-Heap Priority Queue.
- **Multi-Modal Pareto Frontier Solver**: Computes the 3 canonical Indian transit archetypes with interchange transfer penalties.
- **Dual-Stack Python Engine**: Full standalone Python counterpart available in `backend/transit_engine.py`.

---

## 🛠️ Tech Stack
- **Frontend**: React 19, TypeScript 5.0+, Vite 8, Tailwind CSS v4, Lucide React
- **Geospatial**: MapLibre GL JS (with Mapbox GL 3D vector tile & extrusion compatibility)
- **Algorithms**: Pure TypeScript / Binary Min-Heap / 2D KD-Tree / A* Multi-Criteria
- **Testing**: Vitest (100% automated test coverage for core algorithms)

---

## 📦 Installation & Setup

```bash
# 1. Clone the repository
git clone https://github.com/deadheaven07/NavIndia.git
cd NavIndia

# 2. Install dependencies
npm install

# 3. Run automated algorithm test suite
npx vitest run

# 4. Start local 3D development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🧪 Automated Test Suite

Run the Vitest test suite to verify graph operations, KD-Tree nearest neighbor queries, and Pareto optimality:

```bash
npx vitest run
```

```
✓ src/algorithms/__tests__/algorithms.test.ts (9 tests) 5ms
  ✓ PriorityQueue (Min-Heap)
    ✓ should pop elements in strictly ascending order
    ✓ should return correct size and peek accurately
  ✓ Spatial 2D KD-Tree
    ✓ should correctly snap exact node coordinates to itself in O(log N)
    ✓ should snap an arbitrary GPS coordinate to the closest geographic junction
    ✓ matches brute-force linear search on random coordinates
  ✓ Weighted Directed Multigraph
    ✓ should build graph and store dual-weight multimodal edges correctly
    ✓ should return multiple outgoing edges for a multimodal junction
  ✓ A* Pathfinding & Multi-Modal Pareto Frontier
    ✓ should calculate 3 Pareto routes from Majestic to Whitefield ITPL
    ✓ handles GPS coordinate input using KD-Tree snapping
```

---

