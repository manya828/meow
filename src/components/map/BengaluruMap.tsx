import React, { useState } from 'react';
import { MapPin, Navigation, Compass, Layers, ArrowRight, Zap, AlertCircle, ArrowLeftRight } from 'lucide-react';
import { bengaluruNodes, keyCorridors, BengaluruNode } from '../../data/bengaluruTransit.ts';
import { LocationSearchInput } from '../common/LocationSearchInput.tsx';

interface BengaluruMapProps {
  selectedOrigin?: string;
  selectedDestination?: string;
  onSelectCorridor?: (from: string, to: string) => void;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
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

export const BengaluruMap: React.FC<BengaluruMapProps> = ({
  selectedOrigin,
  selectedDestination,
  onSelectCorridor,
}) => {
  const [activeCorridorId, setActiveCorridorId] = useState<string>('corr-01');
  const [customPickup, setCustomPickup] = useState<string>(selectedOrigin || keyCorridors[0].from);
  const [customDrop, setCustomDrop] = useState<string>(selectedDestination || keyCorridors[0].to);
  const [selectionMode, setSelectionMode] = useState<'pickup' | 'drop'>('pickup');
  const [hoveredNode, setHoveredNode] = useState<BengaluruNode | null>(null);
  const [tomtomKey, setTomtomKey] = useState<string>('');
  const [showTomtomConfig, setShowTomtomConfig] = useState<boolean>(false);

  const activeCorridor = keyCorridors.find((c) => c.id === activeCorridorId) || keyCorridors[0];

  // SVG coordinate transformation for Bengaluru bounding box
  // Covers Devanahalli/Airport (13.24) down to E-City (12.83), Kengeri (77.48) across to Whitefield (77.75)
  const minLat = 12.82;
  const maxLat = 13.26;
  const minLng = 77.47;
  const maxLng = 77.77;

  const toSvgX = (lng: number) => ((lng - minLng) / (maxLng - minLng)) * 550 + 25;
  const toSvgY = (lat: number) => (1 - (lat - minLat) / (maxLat - minLat)) * 410 + 25;

  const findNodeByName = (label?: string) => {
    if (!label) return undefined;
    const clean = label.toLowerCase().trim();
    return bengaluruNodes.find(
      (n) =>
        n.name.toLowerCase() === clean ||
        n.name.toLowerCase().includes(clean.split('(')[0].trim()) ||
        clean.includes(n.name.toLowerCase().split('(')[0].trim())
    );
  };

  const fromNode = findNodeByName(customPickup) || findNodeByName(activeCorridor.from);
  const toNode = findNodeByName(customDrop) || findNodeByName(activeCorridor.to);

  const computedDistanceKm =
    fromNode && toNode
      ? Number((haversineKm(fromNode.lat, fromNode.lng, toNode.lat, toNode.lng) * 1.32).toFixed(1))
      : activeCorridor.distanceKm;

  const computedDurationMin =
    fromNode && toNode
      ? Math.max(15, Math.round(computedDistanceKm * 2.2 + (fromNode.avgDelayMin + toNode.avgDelayMin) * 0.45))
      : activeCorridor.currentDurationMin;

  const handleSelectCorridorTab = (corridorId: string) => {
    setActiveCorridorId(corridorId);
    const corr = keyCorridors.find((c) => c.id === corridorId);
    if (corr) {
      setCustomPickup(corr.from);
      setCustomDrop(corr.to);
    }
  };

  const handleMapNodeClick = (node: BengaluruNode) => {
    if (selectionMode === 'pickup') {
      setCustomPickup(node.name);
      setSelectionMode('drop');
    } else {
      setCustomDrop(node.name);
      setSelectionMode('pickup');
    }
  };

  return (
    <div className="rounded-2xl bg-[#0D1628] border border-cyan-500/25 overflow-visible shadow-2xl">
      {/* Map Header */}
      <div className="px-6 py-4 border-b border-slate-800/90 flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-[#0D1628] via-[#111D35] to-[#0D1628] rounded-t-2xl">
        <div>
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white">Bengaluru Intelligent Transit Network</h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Click any hub dot on the map or choose from all {bengaluruNodes.length} hubs below to find rides
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectionMode('pickup')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer border ${
              selectionMode === 'pickup'
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                : 'bg-[#111D35] border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            Click Map: Set Pickup
          </button>
          <button
            type="button"
            onClick={() => setSelectionMode('drop')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer border ${
              selectionMode === 'drop'
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                : 'bg-[#111D35] border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            Click Map: Set Drop
          </button>
          <button
            onClick={() => setShowTomtomConfig(!showTomtomConfig)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#111D35] hover:bg-[#162544] border border-slate-700 text-[11px] text-slate-300 transition-colors cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">TomTom Key</span>
          </button>
        </div>
      </div>

      {showTomtomConfig && (
        <div className="bg-[#111D35]/90 border-b border-cyan-500/20 px-6 py-3.5 text-xs text-slate-300 flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              Configured with native Bengaluru GIS coordinates. You can provide your personal TomTom Maps Key for live vector tiles.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Paste TOMTOM_API_KEY"
              value={tomtomKey}
              onChange={(e) => setTomtomKey(e.target.value)}
              className="bg-[#080E1C] border border-slate-700 rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-cyan-400 w-48 font-mono"
            />
            <button
              onClick={() => setShowTomtomConfig(false)}
              className="px-2.5 py-1 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition-colors cursor-pointer"
            >
              Apply
            </button>
          </div>
        </div>
      )}

      {/* Corridor Segment Selector */}
      <div className="bg-[#090F1E] px-6 py-3 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto text-xs">
        <span className="text-slate-500 font-semibold text-[11px] uppercase tracking-wider whitespace-nowrap shrink-0">
          Preset Corridors:
        </span>
        {keyCorridors.map((c) => (
          <button
            key={c.id}
            onClick={() => handleSelectCorridorTab(c.id)}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap shrink-0 transition-all cursor-pointer font-medium text-xs ${
              activeCorridorId === c.id
                ? 'bg-gradient-to-r from-cyan-500/25 to-blue-600/25 border border-cyan-400/50 text-cyan-200 font-semibold shadow-sm'
                : 'bg-[#111D35]/50 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Visual Canvas Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
        {/* Interactive SVG City Canvas */}
        <div className="lg:col-span-2 relative bg-[#070C18] p-4 flex items-center justify-center min-h-[380px] border-b lg:border-b-0 lg:border-r border-slate-800/80 rounded-bl-2xl">
          <svg viewBox="0 0 600 460" className="w-full h-auto max-h-[460px] drop-shadow-md select-none">
            <defs>
              <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#16223B" strokeWidth="0.5" />
              </pattern>
              <linearGradient id="routeGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#22D3EE" stopOpacity="1" />
                <stop offset="100%" stopColor="#34D399" stopOpacity="1" />
              </linearGradient>
            </defs>

            <rect width="600" height="460" fill="url(#grid)" />

            {/* City Boundary Contour */}
            <circle cx="300" cy="250" r="155" fill="none" stroke="#1B2844" strokeWidth="1.5" strokeDasharray="4 4" />
            <circle cx="300" cy="250" r="75" fill="none" stroke="#1A2A48" strokeWidth="1" />

            {/* Dynamic Active Highlighted Corridor Line */}
            {fromNode && toNode && (
              <>
                <line
                  x1={toSvgX(fromNode.lng)}
                  y1={toSvgY(fromNode.lat)}
                  x2={toSvgX(toNode.lng)}
                  y2={toSvgY(toNode.lat)}
                  stroke="#22D3EE"
                  strokeOpacity="0.22"
                  strokeWidth="10"
                  strokeLinecap="round"
                />
                <line
                  x1={toSvgX(fromNode.lng)}
                  y1={toSvgY(fromNode.lat)}
                  x2={toSvgX(toNode.lng)}
                  y2={toSvgY(toNode.lat)}
                  stroke="url(#routeGlow)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeDasharray="8 4"
                  className="animate-pulse"
                />
              </>
            )}

            {/* Nodes */}
            {bengaluruNodes.map((node) => {
              const x = toSvgX(node.lng);
              const y = toSvgY(node.lat);
              const isPickup = node.id === fromNode?.id;
              const isDrop = node.id === toNode?.id;
              const isHovered = hoveredNode?.id === node.id;
              const isHighlighted = isPickup || isDrop || isHovered;
              const showLabel = isHighlighted || node.category === 'tech_park' || node.category === 'airport_rail';

              const dotColor = isPickup ? '#22D3EE' : isDrop ? '#34D399' : isHovered ? '#A78BFA' : '#3B82F6';

              return (
                <g
                  key={node.id}
                  onClick={() => handleMapNodeClick(node)}
                  onMouseEnter={() => setHoveredNode(node)}
                  onMouseLeave={() => setHoveredNode(null)}
                  className="cursor-pointer group"
                >
                  {isHighlighted && (
                    <circle cx={x} cy={y} r="13" fill={dotColor} fillOpacity="0.2" className="animate-ping" />
                  )}
                  <circle
                    cx={x}
                    cy={y}
                    r={isHighlighted ? '7.5' : '4.5'}
                    fill={dotColor}
                    fillOpacity={isHighlighted ? 1 : 0.8}
                    stroke="#080E1C"
                    strokeWidth="1.5"
                  />
                  {showLabel && (
                    <text
                      x={x + 8}
                      y={y + 3}
                      fill={isHighlighted ? '#F8FAFC' : '#94A3B8'}
                      fontSize={isHighlighted ? '10.5' : '8.5'}
                      fontWeight={isHighlighted ? 'bold' : 'normal'}
                      fontFamily="sans-serif"
                      className="pointer-events-none"
                    >
                      {node.name.split('(')[0].trim().split(' ').slice(0, 2).join(' ')}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Hovered Node Quick Pill */}
          {hoveredNode && (
            <div className="absolute top-3 left-3 bg-[#0D1628]/95 backdrop-blur-md border border-cyan-500/40 rounded-xl px-3 py-2 text-xs shadow-xl pointer-events-none">
              <p className="font-bold text-white">{hoveredNode.name}</p>
              <p className="text-[10px] text-cyan-300">
                {hoveredNode.zone} · Click dot to set {selectionMode === 'pickup' ? 'Pickup' : 'Drop'}
              </p>
            </div>
          )}

          {/* Legend */}
          <div className="absolute bottom-3 left-3 bg-[#080E1C]/85 backdrop-blur-md border border-slate-800 rounded-lg px-3 py-1.5 text-[10px] text-slate-300 font-mono flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" /> Pickup
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" /> Drop
            </span>
            <span className="text-slate-500 hidden sm:inline">· {bengaluruNodes.length} Active Hubs</span>
          </div>
        </div>

        {/* Corridor Telemetry & Direct Route Picker Panel */}
        <div className="p-6 bg-[#0D1628] flex flex-col justify-between rounded-br-2xl space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-mono text-cyan-400 font-bold">ROUTE SELECTOR</span>
              <span className="text-[11px] text-emerald-400 font-medium">All {bengaluruNodes.length} Map Places</span>
            </div>

            {/* Interactive Pickup & Drop Dropdowns synced with the map */}
            <div className="space-y-3">
              <LocationSearchInput
                label="Pickup Location"
                value={customPickup}
                onChange={(val) => setCustomPickup(val)}
                placeholder="Select pickup hub from map..."
                iconColor="text-cyan-400"
              />

              <div className="flex justify-center -my-1">
                <button
                  type="button"
                  onClick={() => {
                    const tmp = customPickup;
                    setCustomPickup(customDrop);
                    setCustomDrop(tmp);
                  }}
                  title="Swap Pickup and Drop"
                  className="p-1.5 rounded-lg bg-[#111D35] hover:bg-cyan-500/20 border border-slate-700 text-cyan-400 transition-colors cursor-pointer"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <LocationSearchInput
                label="Drop Location"
                value={customDrop}
                onChange={(val) => setCustomDrop(val)}
                placeholder="Select drop hub from map..."
                iconColor="text-emerald-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-3 rounded-xl bg-[#111D35] border border-slate-800">
                <span className="text-[11px] text-slate-400">Est. Distance</span>
                <p className="text-lg font-bold font-mono text-white mt-0.5">{computedDistanceKm} km</p>
              </div>
              <div className="p-3 rounded-xl bg-[#111D35] border border-slate-800">
                <span className="text-[11px] text-slate-400">Peak Travel Time</span>
                <p className="text-lg font-bold font-mono text-cyan-300 mt-0.5">{computedDurationMin} min</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-500/20">
              <div className="flex items-center gap-2 text-xs text-cyan-300 font-semibold mb-1">
                <Zap className="w-3.5 h-3.5" />
                <span>Smart Corridor Match</span>
              </div>
              <p className="text-[11px] text-slate-300">
                Ready to search rides from <strong className="text-white">{customPickup || 'Any Hub'}</strong> to{' '}
                <strong className="text-white">{customDrop || 'Any Hub'}</strong>.
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800">
            <button
              onClick={() => {
                if (onSelectCorridor) onSelectCorridor(customPickup, customDrop);
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-xs transition-all shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Find Rides for Selected Route</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
