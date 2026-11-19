import React, { useState } from 'react';
import { ArrowRight, Search, ShieldCheck, Sparkles } from 'lucide-react';
import heroEvImage from '../../assets/images/hero_carpoolx_ev_1794490423156.jpg';
import { LocationSearchInput } from '../common/LocationSearchInput.tsx';

interface HeroSectionProps {
  onSearch: (origin: string, destination: string, seats: number) => void;
  onOfferRide: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onSearch, onOfferRide }) => {
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [seats, setSeats] = useState(1);

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(pickup.trim(), dropoff.trim(), seats);
  };

  return (
    <section className="relative overflow-x-clip pt-10 pb-16 lg:pt-16 lg:pb-24 border-b border-slate-800/80">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[720px] h-[360px] bg-gradient-to-r from-cyan-500/15 via-blue-600/15 to-violet-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 right-10 w-[420px] h-[300px] bg-indigo-500/15 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left Column: Value Proposition & Find Rides Search Box */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-cyan-950/80 to-indigo-950/80 border border-cyan-400/30 text-cyan-300 text-xs font-medium shadow-sm shadow-cyan-500/10">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Smart Mobility Architecture · 52+ Bengaluru Transit Nodes</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.1] text-balance">
              Move Together. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-400 to-violet-400">
                Go Further.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-300 max-w-xl leading-relaxed">
              Discover smarter journeys, connect with verified drivers &amp; passengers travelling your way, and pay only after ride completion across Bengaluru&apos;s tech hubs.
            </p>

            {/* Quick Find Rides Search Card */}
            <form
              onSubmit={handleHeroSearch}
              className="p-4 rounded-2xl bg-[#0D1628]/95 border border-cyan-500/30 shadow-xl space-y-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <LocationSearchInput
                  label="Pickup Location"
                  value={pickup}
                  onChange={setPickup}
                  placeholder="e.g. Electronic City, Silk Board"
                  iconColor="text-cyan-400"
                />
                <LocationSearchInput
                  label="Drop Location"
                  value={dropoff}
                  onChange={setDropoff}
                  placeholder="e.g. Whitefield ITPL, Indiranagar"
                  iconColor="text-emerald-400"
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="w-32">
                  <select
                    value={seats}
                    onChange={(e) => setSeats(Number(e.target.value))}
                    aria-label="Number of seats"
                    className="w-full bg-[#111D35] border border-slate-700/80 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
                  >
                    <option value={1}>1 Seat</option>
                    <option value={2}>2 Seats</option>
                    <option value={3}>3 Seats</option>
                    <option value={4}>4 Seats</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="flex-1 min-w-[150px] px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:via-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Find Rides</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={onOfferRide}
                  className="px-4 py-2.5 rounded-xl bg-[#111D35]/90 hover:bg-[#18294A] border border-emerald-500/35 hover:border-emerald-400/60 text-emerald-300 hover:text-white font-semibold text-xs transition-all cursor-pointer"
                >
                  Offer a Ride
                </button>
              </div>
            </form>

            {/* Micro Highlights */}
            <div className="pt-5 grid grid-cols-3 gap-4 border-t border-slate-800/80 text-xs text-slate-400">
              <div>
                <p className="font-bold text-sm font-mono text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-400">
                  100% ACID
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">Transactional Integrity</p>
              </div>
              <div>
                <p className="font-bold text-sm font-mono text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-cyan-400">
                  52+ Hubs
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">Bengaluru Active Grid</p>
              </div>
              <div>
                <p className="font-bold text-sm font-mono text-transparent bg-clip-text bg-gradient-to-r from-violet-300 to-cyan-300">
                  ₹0 Overbooking
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">Row-level Pessimistic Lock</p>
              </div>
            </div>
          </div>

          {/* Right Column: High-Impact 3D EV Render & Telemetry Overlay */}
          <div className="lg:col-span-6 relative">
            <div className="relative rounded-3xl overflow-hidden border border-cyan-500/25 shadow-2xl shadow-cyan-950/50 group">
              <img
                src={heroEvImage}
                alt="CarpoolX Futuristic Electric Vehicle Cruising Bengaluru High-Tech Corridor"
                className="w-full h-[380px] sm:h-[430px] object-cover transition-transform duration-700 group-hover:scale-105"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#080E1C] via-[#080E1C]/20 to-transparent" />

              {/* Floating Journey Card 1: Silk Board to Indiranagar */}
              <div className="absolute top-6 left-6 max-w-xs bg-[#0D1628]/90 backdrop-blur-md border border-cyan-500/35 rounded-2xl p-3.5 shadow-xl animate-in fade-in slide-in-from-left duration-500">
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                  <span className="font-mono text-cyan-300 font-semibold">RIDE #01 · ACTIVE</span>
                  <span className="text-emerald-400 font-medium">Tata Nexon EV</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                  <span>Electronic City</span>
                  <ArrowRight className="w-3 h-3 text-cyan-400" />
                  <span>Indiranagar</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-300 border-t border-slate-800/80 pt-1.5 font-mono">
                  <span>₹180 / seat</span>
                  <span className="text-cyan-400 font-bold">2 Seats Left</span>
                </div>
              </div>

              {/* Floating Telemetry Card 2: Environmental Offset */}
              <div className="absolute bottom-6 right-6 bg-[#0D1628]/95 backdrop-blur-md border border-emerald-500/30 rounded-2xl px-4 py-3 shadow-xl flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white font-mono">142.5 kg CO₂</p>
                  <p className="text-[10px] text-slate-400">Average Commuter Monthly Offset</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
