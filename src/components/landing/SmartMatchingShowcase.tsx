import React from 'react';
import { Route, CheckCircle2, Clock, Users, ShieldAlert, Cpu } from 'lucide-react';
import networkImage from '../../assets/images/smart_mobility_network_1794490423824.jpg';

export const SmartMatchingShowcase: React.FC = () => {
  return (
    <section className="py-20 bg-[#060A14] border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Image Asset */}
          <div className="lg:col-span-6 relative">
            <div className="rounded-2xl overflow-hidden border border-slate-700/80 shadow-2xl relative group">
              <img
                src={networkImage}
                alt="CarpoolX Intelligent Spatial Ride Matching Network"
                className="w-full h-[360px] sm:h-[420px] object-cover transition-transform duration-700 group-hover:scale-105"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#060A14] via-transparent to-transparent" />

              <div className="absolute bottom-5 left-5 right-5 p-4 rounded-xl bg-[#0D1628]/95 backdrop-blur-md border border-cyan-500/30">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-white">Spatial Corroboration Engine</span>
                  <span className="font-mono text-cyan-400 font-bold">96.8% Match Rate</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Haversine geospatial calculations prevent false pairings, matching riders strictly along true transit vectors.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Intelligent Matching Architecture */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/60 border border-blue-500/30 text-cyan-300 text-xs font-medium">
              <Cpu className="w-3.5 h-3.5" />
              <span>DBMS Algorithmic Logic</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Intelligent Ride Matching Beyond Simple Location Names
            </h2>

            <p className="text-sm text-slate-300 leading-relaxed">
              CarpoolX implements a robust multi-factor compatibility matrix that evaluates real Bengaluru geographic coordinates, intermediate waypoints, and travel time buffers rather than simplistic keyword searches.
            </p>

            <div className="space-y-3 pt-2">
              <div className="p-3.5 rounded-xl bg-[#0D1628] border border-slate-800 flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-white">1. Pickup & Waypoint Proximity (within 2km)</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Evaluates origin proximity and intermediate bus bays along Silk Board, Bellandur EcoSpace, and Marathahalli Bridge.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0D1628] border border-slate-800 flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-white">2. Corridor Destination Vectors (within 2.5km)</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Verifies whether the passenger dropoff aligns with the driver's ultimate destination or exit flyover.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0D1628] border border-slate-800 flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-white">3. Departure Schedule Synchronization (within 30m)</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Filters out rides with conflicting peak morning or evening office commute shifts.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0D1628] border border-slate-800 flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-white">4. Atomic Seat Capacity Enforcement</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Evaluates live available seat inventory with pessimistic locks before surfacing matches to commuters.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
