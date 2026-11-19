import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Car, CheckCircle, AlertCircle } from 'lucide-react';
import { api } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { bengaluruNodes } from '../../data/bengaluruTransit.ts';
import { LocationSearchInput } from '../common/LocationSearchInput.tsx';

interface PublishRideModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const PublishRideModal: React.FC<PublishRideModalProps> = ({ onClose, onSuccess }) => {
  const {
    user,
    isDriver,
    hasDriverProfile,
    vehicle,
    refreshMe,
    openLoginModal,
    openRegisterModal,
  } = useAuth();
  const maxSeats = Math.max(1, Math.min(6, vehicle?.total_capacity || 4));
  const [originName, setOriginName] = useState('Electronic City Phase 1 (Infosys/Wipro Gate)');
  const [destinationName, setDestinationName] = useState('Indiranagar 100ft Road (CMH Metro)');
  const [departureTime, setDepartureTime] = useState(
    new Date(Date.now() + 2 * 3600000).toISOString().slice(0, 16)
  );
  const [totalSeats, setTotalSeats] = useState<number>(Math.min(3, maxSeats));
  const [farePerSeat, setFarePerSeat] = useState<number>(180);
  const [corridorName, setCorridorName] = useState('Silk Board & Hosur Rd Express');
  const [notes, setNotes] = useState('AC crossover ride. No smoking. On-time departure.');
  const [stops, setStops] = useState<{ name: string; lat: number; lng: number; fare: number }[]>([
    { name: 'Central Silk Board Junction', lat: 12.917415, lng: 77.623773, fare: 110 },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Quick vehicle onboarding state (same user_id)
  const [licenseNumber, setLicenseNumber] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [vehicleType, setVehicleType] = useState<'sedan' | 'suv' | 'hatchback' | 'ev_crossover'>('ev_crossover');
  const [fuelType, setFuelType] = useState<'electric' | 'petrol' | 'diesel' | 'cng'>('electric');
  const [vehicleColor, setVehicleColor] = useState('Titanium Grey');
  const [totalCapacity, setTotalCapacity] = useState<number>(4);
  const [isSavingVehicle, setIsSavingVehicle] = useState(false);

  useEffect(() => {
    if (vehicle?.total_capacity) {
      setTotalSeats((prev) => Math.min(prev, Math.max(1, vehicle.total_capacity)));
    }
  }, [vehicle?.total_capacity]);

  const addStop = () => {
    setStops([...stops, { name: 'Koramangala Sony World Signal', lat: 12.935193, lng: 77.624481, fare: Math.round(farePerSeat * 0.8) }]);
  };

  const removeStop = (index: number) => {
    setStops(stops.filter((_, i) => i !== index));
  };

  const handleRegisterVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingVehicle(true);
    setError(null);
    try {
      await api.saveDriverProfile({
        licenseNumber,
        vehicleModel,
        registrationNumber,
        vehicleType,
        fuelType,
        vehicleColor,
        totalCapacity,
      });
      await refreshMe();
    } catch (err: any) {
      setError(err.message || 'Could not register vehicle.');
    } finally {
      setIsSavingVehicle(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isDriver) {
      setError('Please sign in or create a Driver account to offer rides.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const oNode = bengaluruNodes.find((n) => n.name.toLowerCase() === originName.toLowerCase());
    const dNode = bengaluruNodes.find((n) => n.name.toLowerCase() === destinationName.toLowerCase());

    try {
      await api.publishRide({
        vehicleId: vehicle?.vehicle_id,
        originName,
        originLat: oNode?.lat || 12.839939,
        originLng: oNode?.lng || 77.677003,
        destinationName,
        destinationLat: dNode?.lat || 12.978369,
        destinationLng: dNode?.lng || 77.640836,
        departureTime: new Date(departureTime).toISOString(),
        totalSeats,
        farePerSeat,
        corridorName,
        notes,
        stops,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to publish ride.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user || !isDriver) {
    return (
      <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-[#0D1628] border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl relative text-slate-200 space-y-5">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="text-center space-y-2 pt-2">
            <div className="w-12 h-12 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center mx-auto">
              <Car className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Driver Account Required</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {user
                ? `You are signed in as ${user.full_name} (${user.role}). Only dedicated Driver accounts can publish rides. Please sign in with a Driver account or register as a Driver.`
                : 'Sign in with an existing Driver account or create a Driver account now to offer carpool rides across Bengaluru corridors.'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={() => {
                onClose();
                openRegisterModal('driver');
              }}
              className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs cursor-pointer"
            >
              Create Driver Account
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                openLoginModal('driver', 'login');
              }}
              className="flex-1 py-2.5 px-4 rounded-xl bg-[#111D35] hover:bg-[#162544] border border-slate-700 text-slate-200 font-semibold text-xs cursor-pointer"
            >
              Sign In as Driver
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!hasDriverProfile) {
    return (
      <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-[#0D1628] border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative text-slate-200 space-y-4">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center gap-2 text-xs text-cyan-400 font-semibold mb-1">
              <Car className="w-4 h-4" />
              <span>Enable Offer a Ride · Account #{user.user_id} ({user.full_name})</span>
            </div>
            <h3 className="text-lg font-bold text-white">Register Your Vehicle to Publish Rides</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Complete your driving license and vehicle details once to publish rides on your Driver account.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleRegisterVehicle} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Driving License Number</label>
                <input
                  type="text"
                  required
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  placeholder="e.g. KA01-20230098451"
                  className="w-full bg-[#111D35] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono uppercase focus:outline-none focus:border-cyan-400"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Registration Number</label>
                <input
                  type="text"
                  required
                  value={registrationNumber}
                  onChange={(e) => setRegistrationNumber(e.target.value)}
                  placeholder="e.g. KA03MW4819"
                  className="w-full bg-[#111D35] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono uppercase focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Vehicle Make & Model</label>
                <input
                  type="text"
                  required
                  value={vehicleModel}
                  onChange={(e) => setVehicleModel(e.target.value)}
                  placeholder="e.g. Tata Nexon EV Max"
                  className="w-full bg-[#111D35] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Color</label>
                <input
                  type="text"
                  value={vehicleColor}
                  onChange={(e) => setVehicleColor(e.target.value)}
                  className="w-full bg-[#111D35] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Body Type</label>
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value as any)}
                  className="w-full bg-[#111D35] border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white"
                >
                  <option value="ev_crossover">EV Crossover</option>
                  <option value="sedan">Sedan</option>
                  <option value="suv">SUV</option>
                  <option value="hatchback">Hatchback</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Fuel</label>
                <select
                  value={fuelType}
                  onChange={(e) => setFuelType(e.target.value as any)}
                  className="w-full bg-[#111D35] border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white"
                >
                  <option value="electric">Electric</option>
                  <option value="petrol">Petrol</option>
                  <option value="diesel">Diesel</option>
                  <option value="cng">CNG</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Seat Capacity</label>
                <input
                  type="number"
                  min={1}
                  max={6}
                  value={totalCapacity}
                  onChange={(e) => setTotalCapacity(Number(e.target.value))}
                  className="w-full bg-[#111D35] border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white font-mono"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingVehicle}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold text-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>{isSavingVehicle ? 'Saving Vehicle...' : 'Save Vehicle & Continue'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#0D1628] border border-slate-700 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative text-slate-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-cyan-400 font-semibold mb-1">
              <Car className="w-4 h-4" />
              <span>Offer a Ride · {user.full_name} (ID #{user.user_id})</span>
            </div>
            <h3 className="text-xl font-bold text-white">Publish Available Carpool</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Vehicle: <strong className="text-slate-200">{vehicle?.make_model || 'Registered Vehicle'}</strong>
              {vehicle?.registration_number ? ` · ${vehicle.registration_number}` : ''}
              {vehicle?.fuel_type ? ` (${vehicle.fuel_type.toUpperCase()})` : ''}
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <LocationSearchInput
              label="Origin Hub / Departure Point"
              value={originName}
              onChange={(val) => setOriginName(val)}
              placeholder="e.g. Manyata Tech Park, Electronic City"
              iconColor="text-cyan-400"
            />

            <LocationSearchInput
              label="Destination Hub / Arrival Point"
              value={destinationName}
              onChange={(val) => setDestinationName(val)}
              placeholder="e.g. Whitefield ITPL, Kempegowda Airport"
              iconColor="text-emerald-400"
            />
          </div>

          {/* Stops */}
          <div className="p-3.5 rounded-xl bg-[#111D35] border border-slate-800 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-slate-300">
              <div>
                <span>Intermediate Pick-up / Drop-off Waypoints</span>
                <p className="text-[10px] font-normal text-slate-400 mt-0.5">
                  Set cumulative fare from Origin (₹). Passengers boarding on the way pay only the remaining segment fare.
                </p>
              </div>
              <button
                type="button"
                onClick={addStop}
                className="text-cyan-400 hover:text-cyan-300 text-[11px] flex items-center gap-1 cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Waypoint
              </button>
            </div>

            {stops.map((s, idx) => {
              const prevStopFare = idx === 0 ? 0 : Number(stops[idx - 1].fare || 0);
              const stopCumulative = Number(s.fare || 0);
              const remainingToDest = Math.max(0, Number(farePerSeat || 0) - stopCumulative);
              return (
                <div key={idx} className="p-2.5 rounded-xl bg-[#080E1C] border border-slate-800 space-y-1.5">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs">
                    <div className="flex-1 min-w-0">
                      <LocationSearchInput
                        value={s.name}
                        onChange={(val) => {
                          const node = bengaluruNodes.find((n) => n.name.toLowerCase() === val.toLowerCase());
                          const updated = [...stops];
                          updated[idx] = {
                            ...updated[idx],
                            name: val,
                            lat: node?.lat ?? updated[idx].lat,
                            lng: node?.lng ?? updated[idx].lng,
                          };
                          setStops(updated);
                        }}
                        placeholder={`Stop ${idx + 1} location...`}
                        iconColor="text-amber-400"
                      />
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-2">
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                        <span>From Origin ₹</span>
                        <input
                          type="number"
                          min={10}
                          max={Math.max(10, Number(farePerSeat || 0) - 5)}
                          value={s.fare}
                          onChange={(e) => {
                            const updated = [...stops];
                            updated[idx] = { ...updated[idx], fare: Number(e.target.value) };
                            setStops(updated);
                          }}
                          className="w-20 bg-[#111D35] border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white font-mono"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeStop(idx)}
                        title="Remove waypoint"
                        className="text-slate-500 hover:text-rose-400 p-1.5 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-slate-400 px-1">
                    <span>
                      Origin → Stop {idx + 1}: <strong className="text-cyan-300">₹{stopCumulative}</strong>
                      {idx > 0 && (
                        <>
                          {' '}· Stop {idx} → {idx + 1}: <strong className="text-slate-200">₹{Math.max(0, stopCumulative - prevStopFare)}</strong>
                        </>
                      )}
                    </span>
                    <span>
                      Board at Stop {idx + 1} → Dest: <strong className="text-emerald-400">₹{remainingToDest}</strong>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Departure Time
              </label>
              <input
                type="datetime-local"
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
                className="w-full bg-[#111D35] border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Available Seats
              </label>
              <select
                value={totalSeats}
                onChange={(e) => setTotalSeats(Number(e.target.value))}
                className="w-full bg-[#111D35] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
              >
                {Array.from({ length: maxSeats }, (_, idx) => idx + 1).map((num) => (
                  <option key={num} value={num}>
                    {num} {num === 1 ? 'Passenger' : 'Passengers'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Fare Per Seat (INR)
              </label>
              <input
                type="number"
                value={farePerSeat}
                onChange={(e) => setFarePerSeat(Number(e.target.value))}
                className="w-full bg-[#111D35] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Instructions & Amenities
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Electric AC crossover, non-smoking, pickup near Metro gate"
              className="w-full bg-[#111D35] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs transition-all shadow-md shadow-cyan-500/20 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Publishing Ride...' : 'Publish to Bengaluru Network'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
