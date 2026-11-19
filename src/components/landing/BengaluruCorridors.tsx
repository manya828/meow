import React from 'react';
import { keyCorridors } from '../../data/bengaluruTransit.ts';
import { ArrowRight, Navigation, Clock, Fuel, ShieldCheck } from 'lucide-react';

interface BengaluruCorridorsProps {
  onSelectCorridor: (origin: string, destination: string) => void;
}

export const BengaluruCorridors: React.FC<BengaluruCorridorsProps> = ({ onSelectCorridor }) => {
  return (
    <section className="py-20 bg-[#080E1C] border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <p className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-2">
              Primary Transit Arteries
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              High-Occupancy Bengaluru Corridors
            </h2>
            <p className="text-sm text-slate-400 mt-2">
              Serving Electronic City, Whitefield ITPL, Marathahalli, Hebbal, Koramangala & Banashankari.
            </p>
          </div>
          <span className="text-xs text-slate-500 font-mono">Real GIS Coordinates · Active 2026 Fleet</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {keyCorridors.map((c) => (
            <div
              key={c.id}
              className="rounded-2xl bg-gradient-to-b from-[#0F1B36] to-[#0B1325] border border-cyan-500/20 p-5 hover:border-cyan-400/60 transition-all flex flex-col justify-between group shadow-lg shadow-cyan-950/20"
            >
              <div>
                <div className="flex items-center justify-between text-xs text-slate-400 mb-3 font-mono">
                  <span className="text-cyan-400 font-bold">{c.id.toUpperCase()}</span>
                  <span className="text-amber-300 font-semibold text-[11px]">{c.congestionLevel.split(' ')[0]}</span>
                </div>

                <h3 className="text-sm font-bold text-white mb-2 group-hover:text-cyan-300 transition-colors">
                  {c.name}
                </h3>

                <div className="space-y-1.5 text-xs text-slate-300 mb-4 bg-[#090F1E]/90 p-3 rounded-xl border border-slate-800/80">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-cyan-400/80 text-[10px] font-mono">FROM:</span>
                    <span className="font-medium text-slate-100 truncate">{c.from}</span>
                  </div>
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-emerald-400/80 text-[10px] font-mono">TO:</span>
                    <span className="font-medium text-slate-100 truncate">{c.to}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-400 mb-4">
                  <div className="bg-[#090F1E] p-2 rounded-lg border border-slate-800/60">
                    <span className="text-slate-500 text-[10px] block">Distance</span>
                    <span className="font-bold text-white">{c.distanceKm} km</span>
                  </div>
                  <div className="bg-[#090F1E] p-2 rounded-lg border border-slate-800/60">
                    <span className="text-slate-500 text-[10px] block">Est. Time</span>
                    <span className="font-bold text-cyan-300">{c.currentDurationMin} min</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => onSelectCorridor(c.from, c.to)}
                className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-500/15 to-blue-600/15 hover:from-cyan-500 hover:to-indigo-600 text-cyan-200 hover:text-white font-semibold text-xs transition-all border border-cyan-500/30 hover:border-transparent flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Find Rides on Route</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
