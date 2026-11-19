import React, { useState, useEffect } from 'react';
import {
  Search,
  MapPin,
  Users,
  Calendar,
  Clock,
  ArrowRight,
  ShieldCheck,
  Zap,
  SlidersHorizontal,
  ChevronDown,
  Car,
  Filter,
  ArrowLeftRight,
  AlertCircle,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { Ride } from '../types';
import { BookRideModal } from '../components/rides/BookRideModal.tsx';
import { Footer } from '../components/common/Footer.tsx';
import { LocationSearchInput } from '../components/common/LocationSearchInput.tsx';
import { bengaluruNodes } from '../data/bengaluruTransit.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface ExploreRidesPageProps {
  initialOrigin?: string;
  initialDestination?: string;
  initialSeats?: number;
}

function resolveNodeCoords(locationName: string): { lat?: number; lng?: number } {
  const clean = locationName.trim().toLowerCase();
  if (!clean) return {};
  const match = bengaluruNodes.find(
    (n) =>
      n.name.toLowerCase() === clean ||
      n.name.toLowerCase().includes(clean.split('(')[0].trim()) ||
      clean.includes(n.name.toLowerCase().split('(')[0].trim())
  );
  return match ? { lat: match.lat, lng: match.lng } : {};
}

export const ExploreRidesPage: React.FC<ExploreRidesPageProps> = ({
  initialOrigin = '',
  initialDestination = '',
  initialSeats = 1,
}) => {
  const { user } = useAuth();
  const [origin, setOrigin] = useState(initialOrigin);
  const [destination, setDestination] = useState(initialDestination);
  const [seats, setSeats] = useState(initialSeats);
  const [corridorFilter, setCorridorFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'compat' | 'time' | 'fare'>('compat');
  const [rides, setRides] = useState<Ride[]>([]);
  const [matchBanner, setMatchBanner] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRideForBooking, setSelectedRideForBooking] = useState<Ride | null>(null);
  const [expandedRideId, setExpandedRideId] = useState<number | null>(null);

  const fetchRides = async (
    o = origin,
    d = destination,
    s = seats,
    c = corridorFilter
  ) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const pCoords = resolveNodeCoords(o);
      const dCoords = resolveNodeCoords(d);
      const res = await api.getRides({
        origin: o || undefined,
        destination: d || undefined,
        seats: s || undefined,
        corridor: c !== 'all' ? c : undefined,
        pickupLat: pCoords.lat,
        pickupLng: pCoords.lng,
        dropoffLat: dCoords.lat,
        dropoffLng: dCoords.lng,
      });
      const visibleRides = (res.rides || []).filter((r) => !user || r.driver_id !== user.user_id);
      setRides(visibleRides);
      setMatchBanner(res.matchBanner || null);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to load available carpools right now.');
      setRides([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setOrigin(initialOrigin);
    setDestination(initialDestination);
    setSeats(initialSeats);
    fetchRides(initialOrigin, initialDestination, initialSeats, corridorFilter);
  }, [initialOrigin, initialDestination, initialSeats, user?.user_id]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRides(origin, destination, seats, corridorFilter);
  };

  // Sorting (and defensive exclusion of user's own offered rides)
  const sortedRides = rides
    .filter((r) => !user || r.driver_id !== user.user_id)
    .sort((a, b) => {
      if (sortBy === 'compat') {
        return (b.compatibility_score || 0) - (a.compatibility_score || 0);
      }
      if (sortBy === 'time') {
        return new Date(a.departure_time).getTime() - new Date(b.departure_time).getTime();
      }
      if (sortBy === 'fare') {
        return a.fare_per_seat - b.fare_per_seat;
      }
      return 0;
    });

  return (
    <div className="min-h-screen bg-[#080E1C] text-[#F8FAFC]">
      {/* Header Search Section */}
      <div className="bg-gradient-to-b from-[#0C152B] to-[#080E1C] border-b border-cyan-500/20 py-10 px-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <span className="text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400 uppercase tracking-wider">
              Bengaluru Commuter Grid · {bengaluruNodes.length} Map Hubs
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
              Explore Active Bengaluru Carpools
            </h1>
            <p className="text-xs text-slate-300 mt-1">
              Select any Pickup and Drop location from the {bengaluruNodes.length} Bengaluru map hubs to find matching rides along your corridor.
            </p>
          </div>

          {/* Search Inputs */}
          <form
            onSubmit={handleSearchSubmit}
            className="p-5 rounded-2xl bg-[#0D1628]/95 border border-cyan-500/30 shadow-xl shadow-cyan-950/30 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3.5 items-end"
          >
            <div className="lg:col-span-4">
              <LocationSearchInput
                label="Pickup Location"
                value={origin}
                onChange={(val) => {
                  setOrigin(val);
                  if (!val || bengaluruNodes.some((n) => n.name === val)) {
                    fetchRides(val, destination, seats, corridorFilter);
                  }
                }}
                placeholder="Select any pickup hub from map..."
                iconColor="text-cyan-400"
              />
            </div>

            <div className="lg:col-span-4 flex items-end gap-2">
              <button
                type="button"
                onClick={() => {
                  const nextO = destination;
                  const nextD = origin;
                  setOrigin(nextO);
                  setDestination(nextD);
                  fetchRides(nextO, nextD, seats, corridorFilter);
                }}
                title="Swap Pickup & Drop Locations"
                className="mb-0.5 p-2.5 rounded-xl bg-[#111D35] hover:bg-cyan-500/20 border border-slate-700 hover:border-cyan-400 text-cyan-400 transition-colors cursor-pointer shrink-0"
              >
                <ArrowLeftRight className="w-4 h-4" />
              </button>
              <div className="flex-1 min-w-0">
                <LocationSearchInput
                  label="Drop Location"
                  value={destination}
                  onChange={(val) => {
                    setDestination(val);
                    if (!val || bengaluruNodes.some((n) => n.name === val)) {
                      fetchRides(origin, val, seats, corridorFilter);
                    }
                  }}
                  placeholder="Select any drop hub from map..."
                  iconColor="text-emerald-400"
                />
              </div>
            </div>

            <div className="lg:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-300 mb-1 uppercase tracking-wider">
                Passengers
              </label>
              <select
                value={seats}
                onChange={(e) => {
                  const s = Number(e.target.value);
                  setSeats(s);
                  fetchRides(origin, destination, s, corridorFilter);
                }}
                className="w-full bg-[#0D1628] border border-slate-700/80 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
              >
                <option value={1}>1 Seat</option>
                <option value={2}>2 Seats</option>
                <option value={3}>3 Seats</option>
                <option value={4}>4 Seats</option>
              </select>
            </div>

            <div className="lg:col-span-2 flex items-end">
              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-xs transition-all shadow-lg shadow-cyan-500/25 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Find Rides</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Main Content & Results */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Filter and Sort Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-800 text-xs">
          <div className="flex items-center gap-2 overflow-x-auto">
            <span className="text-slate-400 font-semibold text-[11px] uppercase tracking-wider whitespace-nowrap">
              Filter Corridor:
            </span>
            {[
              'all',
              'Silk Board',
              'Outer Ring Road',
              'Meridian',
              'Airport',
              'Manyata',
              'Majestic',
              'HSR',
              'South Central',
              'North-East',
            ].map((corr) => (
              <button
                key={corr}
                onClick={() => {
                  setCorridorFilter(corr);
                  fetchRides(origin, destination, seats, corr);
                }}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  corridorFilter === corr
                    ? 'bg-gradient-to-r from-cyan-500/25 to-blue-600/25 border border-cyan-400/50 text-cyan-200 font-semibold'
                    : 'bg-[#0D1628] border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {corr === 'all' ? 'All Corridors' : corr}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-[11px]">Sort By:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-[#0D1628] border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
            >
              <option value="compat">Route Compatibility (Best Match)</option>
              <option value="time">Departure Time (Earliest First)</option>
              <option value="fare">Fare (Lowest First)</option>
            </select>
          </div>
        </div>

        {/* Summary & Active Filter Bar */}
        {!isLoading && !errorMsg && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
            <span>
              Showing <strong className="text-white font-mono">{sortedRides.length}</strong> active Bengaluru carpool{sortedRides.length === 1 ? '' : 's'}
              {corridorFilter !== 'all' ? ` in "${corridorFilter}"` : ''}
            </span>
            {(origin || destination || corridorFilter !== 'all' || seats > 1) && (
              <button
                type="button"
                onClick={() => {
                  setOrigin('');
                  setDestination('');
                  setSeats(1);
                  setCorridorFilter('all');
                  fetchRides('', '', 1, 'all');
                }}
                className="text-[11px] font-semibold text-cyan-300 hover:text-white underline cursor-pointer"
              >
                Clear All Filters
              </button>
            )}
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && !isLoading && (
          <div className="mt-6 p-4 rounded-xl bg-rose-500/15 border border-rose-500/35 text-xs text-rose-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => fetchRides(origin, destination, seats, corridorFilter)}
              className="px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 font-semibold cursor-pointer shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {/* Helpful Corridor Match Banner */}
        {matchBanner && !isLoading && !errorMsg && (
          <div className="mt-4 p-3.5 rounded-xl bg-gradient-to-r from-cyan-950/60 via-indigo-950/50 to-[#0D1628] border border-cyan-500/35 text-xs text-cyan-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Zap className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>{matchBanner}</span>
            </div>
            {(origin || destination || corridorFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setOrigin('');
                  setDestination('');
                  setCorridorFilter('all');
                  fetchRides('', '', seats, 'all');
                }}
                className="text-[11px] font-semibold text-cyan-300 hover:text-white underline cursor-pointer shrink-0"
              >
                Clear Search & Show All Rides
              </button>
            )}
          </div>
        )}

        {/* Results List */}
        <div className="mt-6 space-y-4">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-slate-400 italic">
              Evaluating Bengaluru geospatial coordinates & active rides...
            </div>
          ) : sortedRides.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[#0D1628] border border-slate-800 space-y-3">
              <Car className="w-10 h-10 text-cyan-400/60 mx-auto" />
              <h3 className="text-sm font-bold text-white">No Matching Active Rides Found</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Reset location, corridor, or seat filters to view all active Bengaluru rides.
              </p>
              <button
                onClick={() => {
                  setOrigin('');
                  setDestination('');
                  setSeats(1);
                  setCorridorFilter('all');
                  fetchRides('', '', 1, 'all');
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-600/20 hover:from-cyan-500/30 hover:to-blue-600/30 text-cyan-300 font-semibold text-xs border border-cyan-500/40 cursor-pointer"
              >
                Show All Active Bengaluru Rides
              </button>
            </div>
          ) : (
            sortedRides.map((ride) => {
              const isExpanded = expandedRideId === ride.ride_id;
              return (
                <div
                  key={ride.ride_id}
                  className="rounded-2xl bg-[#0D1628] border border-slate-800/90 hover:border-slate-700 p-6 transition-all shadow-lg space-y-4"
                >
                  {/* Top Bar: Driver Info & Score */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center font-bold text-white text-sm">
                        {ride.driver_name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-white">{ride.driver_name}</h3>
                          <span className="font-mono text-[11px] text-amber-300 font-semibold">
                            {ride.driver_rating} ★
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          {ride.vehicle_model} · <span className="font-mono uppercase">{ride.registration_number}</span> · {ride.fuel_type}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      {ride.compatibility_score && (
                        <div className="px-3 py-1 rounded-xl bg-cyan-950/70 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-semibold">
                          {ride.compatibility_score}% Spatial Match
                        </div>
                      )}
                      <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-[#111D35] text-emerald-400 border border-slate-800">
                        {ride.available_seats} / {ride.total_seats} Seats Avail
                      </span>
                    </div>
                  </div>

                  {/* Route & Timings */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-[#111D35]/60 p-4 rounded-xl border border-slate-800/80">
                    <div className="md:col-span-8 space-y-2">
                      <div className="flex items-center gap-2 text-sm font-bold text-white">
                        <span>{ride.origin_name}</span>
                        <ArrowRight className="w-4 h-4 text-cyan-400 shrink-0" />
                        <span>{ride.destination_name}</span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Corridor: <strong className="text-slate-300">{ride.corridor_name}</strong> · Distance: <span className="font-mono">{ride.estimated_distance_km} km</span> (~{ride.estimated_duration_min}m)
                      </p>
                    </div>

                    <div className="md:col-span-4 flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 pt-2 md:pt-0 border-slate-800">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Departure</span>
                        <span className="font-mono text-sm font-bold text-white">
                          {new Date(ride.departure_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Per Seat</span>
                        <span className="font-mono text-xl font-extrabold text-cyan-300">
                          ₹{ride.fare_per_seat}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Compatibility Explanation Note */}
                  {ride.compatibility_reason && (
                    <div className="text-[11px] text-slate-400 flex items-center gap-2 px-1">
                      <Zap className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span>{ride.compatibility_reason}</span>
                    </div>
                  )}

                  {/* Accordion Waypoints */}
                  {isExpanded && ride.stops && ride.stops.length > 0 && (
                    <div className="p-4 rounded-xl bg-[#080E1C] border border-slate-800 space-y-2 animate-in fade-in duration-150">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                        Intermediate Waypoint Schedule & Sub-fares:
                      </span>
                      <div className="space-y-1.5 text-xs font-mono">
                        {ride.stops.map((s) => {
                          const fromStopToDest = Math.max(0, ride.fare_per_seat - s.fare_from_origin);
                          return (
                            <div key={s.stop_id} className="flex flex-wrap items-center justify-between gap-2 text-slate-300 py-1 border-b border-slate-800/60 last:border-0">
                              <span className="font-sans text-white">Stop {s.stop_order}: {s.stop_name}</span>
                              <div className="flex items-center gap-3">
                                <span className="text-slate-500">~{new Date(s.estimated_stop_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                <span className="text-cyan-400 font-bold" title="Fare from Origin to this stop">
                                  Origin→Stop ₹{s.fare_from_origin}
                                </span>
                                <span className="text-emerald-400 font-bold" title="Fare if boarding at this stop to Destination">
                                  Board→Dest ₹{fromStopToDest}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {ride.notes && (
                        <p className="text-[11px] text-slate-400 italic pt-2 border-t border-slate-800">
                          Driver Note: "{ride.notes}"
                        </p>
                      )}
                    </div>
                  )}

                  {/* Bottom Actions */}
                  <div className="pt-2 flex items-center justify-between text-xs">
                    <button
                      onClick={() => setExpandedRideId(isExpanded ? null : ride.ride_id)}
                      className="text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer flex items-center gap-1"
                    >
                      <span>{isExpanded ? 'Hide Waypoints' : 'View Intermediate Stops'}</span>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>

                    <button
                      onClick={() => setSelectedRideForBooking(ride)}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs transition-all shadow-md shadow-cyan-500/20 cursor-pointer flex items-center gap-1.5"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Book Seat (Safe ACID)</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {selectedRideForBooking && (
        <BookRideModal
          ride={selectedRideForBooking}
          preferredPickup={origin}
          preferredDropoff={destination}
          onClose={() => setSelectedRideForBooking(null)}
          onSuccess={() => {
            fetchRides(origin, destination, seats, corridorFilter);
          }}
        />
      )}

      <Footer />
    </div>
  );
};
