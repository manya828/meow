import React, { useState, useEffect } from 'react';
import {
  Car,
  Plus,
  CheckCircle,
  ShieldCheck,
  AlertCircle,
  Mail,
  Phone,
  FileBadge2,
  Wallet,
  ShieldAlert,
  Star,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { api } from '../../services/api.ts';
import { Ride, Booking, WalletLedgerEntry } from '../../types';
import { PublishRideModal } from '../../components/rides/PublishRideModal.tsx';
import { IssueSupportPanel } from '../../components/issues/IssueSupportPanel.tsx';
import cockpitHudImage from '../../assets/images/driver_cockpit_hud_1794490424108.jpg';

const getBookingStatusBadge = (status: Booking['status']) => {
  switch (status) {
    case 'pending':
      return 'bg-amber-950/80 text-amber-300 border border-amber-700/70';
    case 'accepted':
      return 'bg-cyan-950/80 text-cyan-300 border border-cyan-700/70';
    case 'completed':
      return 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/70';
    case 'rejected':
    case 'cancelled':
      return 'bg-rose-950/80 text-rose-300 border border-rose-700/70';
    default:
      return 'bg-slate-800 text-slate-300 border border-slate-700';
  }
};

export const DriverDashboard: React.FC = () => {
  const {
    user,
    isDriver,
    hasDriverProfile,
    driverProfile,
    vehicle,
    refreshMe,
    openLoginModal,
    openRegisterModal,
  } = useAuth();
  const [activeTab, setActiveTab] = useState<
    'overview' | 'rides' | 'requests' | 'earnings' | 'ratings' | 'issues'
  >('overview');
  const [rides, setRides] = useState<Ride[]>([]);
  const [requests, setRequests] = useState<Booking[]>([]);
  const [earnings, setEarnings] = useState<any>(null);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [processingBookingId, setProcessingBookingId] = useState<number | null>(null);

  // Vehicle onboarding state on existing user_id
  const [licenseNumber, setLicenseNumber] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [vehicleType, setVehicleType] = useState<'sedan' | 'suv' | 'hatchback' | 'ev_crossover'>('ev_crossover');
  const [fuelType, setFuelType] = useState<'electric' | 'petrol' | 'diesel' | 'cng'>('electric');
  const [vehicleColor, setVehicleColor] = useState('Titanium Grey');
  const [totalCapacity, setTotalCapacity] = useState<number>(4);
  const [isSavingVehicle, setIsSavingVehicle] = useState(false);

  const loadData = async () => {
    if (!user || !isDriver) return;
    try {
      const [ridesRes, reqRes, earnRes] = await Promise.all([
        api.getDriverRides(),
        api.getDriverRequests(),
        api.getDriverEarnings(),
      ]);
      setRides(ridesRes.rides || []);
      setRequests(reqRes.requests || []);
      setEarnings(earnRes);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.user_id, isDriver, hasDriverProfile]);

  if (!user || !isDriver) {
    return (
      <div className="max-w-lg mx-auto my-12 p-8 rounded-3xl bg-[#0D1628] border border-slate-800 text-center space-y-4">
        <Car className="w-10 h-10 text-emerald-400 mx-auto" />
        <h2 className="text-2xl font-extrabold text-white">Driver Account Required</h2>
        <p className="text-xs text-slate-400">
          {user
            ? `You are signed in as ${user.full_name} (${user.role}). Sign in with a Driver account to publish rides and manage passenger requests.`
            : 'Sign in with your Driver account or register as a Driver to add your vehicle and offer carpool rides.'}
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => openRegisterModal('driver')}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold text-xs cursor-pointer"
          >
            Create Driver Account
          </button>
          <button
            onClick={() => openLoginModal('driver', 'login')}
            className="px-5 py-2.5 rounded-xl bg-[#111D35] border border-slate-700 text-slate-200 font-semibold text-xs cursor-pointer"
          >
            Sign In as Driver
          </button>
        </div>
      </div>
    );
  }

  const handleRegisterVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingVehicle(true);
    setActionError(null);
    try {
      const res = await api.saveDriverProfile({
        licenseNumber,
        vehicleModel,
        registrationNumber,
        vehicleType,
        fuelType,
        vehicleColor,
        totalCapacity,
      });
      setActionMessage(res.message);
      await Promise.all([refreshMe(), loadData()]);
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      setActionError(err.message || 'Could not save vehicle profile.');
    } finally {
      setIsSavingVehicle(false);
    }
  };

  if (!hasDriverProfile) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              Driver Console · Register Vehicle
            </span>
            <h2 className="text-2xl font-extrabold text-white mt-0.5">
              Add Your Vehicle on Driver Account #{user.user_id}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Signed in as {user.full_name} ({user.email}). Register your license &amp; vehicle once to start publishing rides.
            </p>
          </div>
        </div>

        {actionError && (
          <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        <form onSubmit={handleRegisterVehicle} className="p-6 rounded-2xl bg-[#0D1628] border border-slate-800 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Driving License Number</label>
              <input
                type="text"
                required
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                placeholder="e.g. KA01-20230098451"
                className="w-full bg-[#111D35] border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white font-mono uppercase focus:outline-none focus:border-cyan-400"
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
                className="w-full bg-[#111D35] border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white font-mono uppercase focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Vehicle Make & Model</label>
              <input
                type="text"
                required
                value={vehicleModel}
                onChange={(e) => setVehicleModel(e.target.value)}
                placeholder="e.g. Tata Nexon EV Max"
                className="w-full bg-[#111D35] border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Color</label>
              <input
                type="text"
                value={vehicleColor}
                onChange={(e) => setVehicleColor(e.target.value)}
                className="w-full bg-[#111D35] border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Body Type</label>
              <select
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value as any)}
                className="w-full bg-[#111D35] border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white"
              >
                <option value="ev_crossover">EV Crossover</option>
                <option value="sedan">Sedan</option>
                <option value="suv">SUV</option>
                <option value="hatchback">Hatchback</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Fuel Type</label>
              <select
                value={fuelType}
                onChange={(e) => setFuelType(e.target.value as any)}
                className="w-full bg-[#111D35] border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white"
              >
                <option value="electric">Electric</option>
                <option value="petrol">Petrol</option>
                <option value="diesel">Diesel</option>
                <option value="cng">CNG</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Passenger Seats</label>
              <input
                type="number"
                min={1}
                max={6}
                value={totalCapacity}
                onChange={(e) => setTotalCapacity(Number(e.target.value))}
                className="w-full bg-[#111D35] border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSavingVehicle}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-extrabold text-xs cursor-pointer disabled:opacity-50"
          >
            {isSavingVehicle ? 'Saving Vehicle Profile...' : 'Register Vehicle & Open Driver Console'}
          </button>
        </form>
      </div>
    );
  }

  const activeVehicle = earnings?.vehicle || vehicle;
  const activeDriverProfile = earnings?.driverProfile || driverProfile;
  const vehicleLabel = activeVehicle
    ? `${activeVehicle.make_model} (${activeVehicle.registration_number})`
    : 'Registered Partner Vehicle';
  const vehicleCapacity = activeVehicle?.total_capacity || 4;
  const licenseNum = activeDriverProfile?.license_number || 'Verified DL';

  const handleBookingAction = async (
    bookingId: number,
    action: 'accept' | 'reject' | 'complete' | 'cancel'
  ) => {
    setActionError(null);
    setProcessingBookingId(bookingId);
    try {
      let res;
      if (action === 'accept') {
        res = await api.acceptBooking(bookingId);
      } else if (action === 'reject') {
        res = await api.rejectBooking(bookingId);
      } else if (action === 'complete') {
        res = await api.completeBooking(bookingId);
      } else {
        res = await api.cancelDriverBooking(bookingId);
      }
      setActionMessage(res.message || `Booking #${bookingId} updated.`);
      await Promise.all([loadData(), refreshMe()]);
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      setActionError(err.message || 'Action could not be completed');
    } finally {
      setProcessingBookingId(null);
    }
  };

  const handleCompleteRide = async (rideId: number) => {
    setActionError(null);
    try {
      const res = await api.completeRide(rideId);
      setActionMessage(res.message);
      await Promise.all([loadData(), refreshMe()]);
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      setActionError(err.message || 'Failed to close ride');
    }
  };

  const handleCancelRide = async (rideId: number) => {
    setActionError(null);
    try {
      const res = await api.cancelRide(rideId, 'Driver cancelled published ride');
      setActionMessage(res.message);
      await Promise.all([loadData(), refreshMe()]);
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      setActionError(err.message || 'Failed to cancel ride');
    }
  };

  const pendingRequests = requests.filter((r) => r.status === 'pending');
  const acceptedRequests = requests.filter((r) => r.status === 'accepted');
  const activeActionableRequests = requests.filter((r) => r.status === 'pending' || r.status === 'accepted');
  const creditLedger: WalletLedgerEntry[] = earnings?.creditLedger || [];
  const totalRides = rides.length;
  const activeRides = rides.filter((r) => r.status === 'active').length;
  const settledEarnings = earnings?.settledEarnings ?? user.earnings_balance ?? 0;
  const awaitingPaymentAmount = Number(
    (
      earnings?.pendingSettlement ??
      requests
        .filter((r) => r.status === 'completed' && r.payment_status !== 'paid' && r.payment_status !== 'refunded')
        .reduce((sum, r) => sum + Number(r.total_fare || 0), 0)
    ).toFixed(2)
  );
  const recentRatings: any[] = earnings?.recentRatings || [];
  const driverOverallRating = Number(earnings?.driverRating ?? user.rating ?? 0);
  const totalReviewsCount: number = earnings?.totalReviewsCount ?? recentRatings.length;
  const ratingBreakdown: Record<number, number> = earnings?.ratingBreakdown || {
    5: recentRatings.filter((r: any) => Number(r.rating) === 5).length,
    4: recentRatings.filter((r: any) => Number(r.rating) === 4).length,
    3: recentRatings.filter((r: any) => Number(r.rating) === 3).length,
    2: recentRatings.filter((r: any) => Number(r.rating) === 2).length,
    1: recentRatings.filter((r: any) => Number(r.rating) === 1).length,
  };

  return (
    <div className="space-y-8">
      {/* Driver Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
            Driver Operations Console
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-0.5">
            Welcome, {user.full_name}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Driver ID <span className="font-mono text-cyan-300">#{user.user_id}</span> · {vehicleLabel} · License:{' '}
            <span className="font-mono">{licenseNum}</span> · Rating: {user.rating.toFixed(2)} ★
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsPublishModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs transition-all shadow-md shadow-cyan-500/20 cursor-pointer flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Publish New Ride</span>
          </button>
        </div>
      </div>

      {/* Driver Profile Summary Strip */}
      <div className="p-5 rounded-2xl bg-[#0D1628] border border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <Mail className="w-4 h-4 text-slate-400 shrink-0" />
          <div className="min-w-0">
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">Account Email</span>
            <p className="text-white truncate">{user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 min-w-0">
          <Phone className="w-4 h-4 text-slate-400 shrink-0" />
          <div className="min-w-0">
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">Contact Number</span>
            <p className="text-white font-mono truncate">{user.phone}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 min-w-0">
          <FileBadge2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="min-w-0">
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">Driving License</span>
            <p className="text-emerald-300 font-mono truncate">{licenseNum}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 min-w-0">
          <Car className="w-4 h-4 text-cyan-400 shrink-0" />
          <div className="min-w-0">
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">Vehicle & Fuel</span>
            <p className="text-cyan-200 truncate capitalize">
              {activeVehicle
                ? `${activeVehicle.make_model} · ${activeVehicle.fuel_type} (${vehicleCapacity} seats)`
                : 'Not specified'}
            </p>
          </div>
        </div>
      </div>

      {actionMessage && (
        <div className="p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0 text-cyan-400" />
          <span>{actionMessage}</span>
        </div>
      )}

      {actionError && (
        <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 text-xs overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`py-2.5 px-4 font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 border-b-2 ${
            activeTab === 'overview'
              ? 'border-cyan-400 text-cyan-300'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`py-2.5 px-4 font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 border-b-2 ${
            activeTab === 'requests'
              ? 'border-cyan-400 text-cyan-300'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Passenger Requests ({requests.length})
        </button>
        <button
          onClick={() => setActiveTab('rides')}
          className={`py-2.5 px-4 font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 border-b-2 ${
            activeTab === 'rides'
              ? 'border-cyan-400 text-cyan-300'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          My Rides ({rides.length})
        </button>
        <button
          onClick={() => setActiveTab('earnings')}
          className={`py-2.5 px-4 font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 border-b-2 ${
            activeTab === 'earnings'
              ? 'border-cyan-400 text-cyan-300'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Earnings &amp; Settlements
        </button>
        <button
          onClick={() => setActiveTab('ratings')}
          className={`py-2.5 px-4 font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 border-b-2 flex items-center gap-1.5 ${
            activeTab === 'ratings'
              ? 'border-amber-400 text-amber-300'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          <span>Ratings &amp; Reviews ({totalReviewsCount})</span>
        </button>
        <button
          onClick={() => setActiveTab('issues')}
          className={`py-2.5 px-4 font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 border-b-2 flex items-center gap-1.5 ${
            activeTab === 'issues'
              ? 'border-cyan-400 text-cyan-300'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Issues &amp; Support</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="p-4 rounded-2xl bg-[#0D1628] border border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 block">Total Rides</span>
              <p className="text-2xl font-bold font-mono text-white mt-1 tabular-nums">{totalRides}</p>
            </div>
            <div className="p-4 rounded-2xl bg-[#0D1628] border border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 block">Pending Requests</span>
              <p className="text-2xl font-bold font-mono text-amber-300 mt-1 tabular-nums">{pendingRequests.length}</p>
            </div>
            <div className="p-4 rounded-2xl bg-[#0D1628] border border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 block">Accepted Active</span>
              <p className="text-2xl font-bold font-mono text-emerald-400 mt-1 tabular-nums">{acceptedRequests.length}</p>
            </div>
            <div className="p-4 rounded-2xl bg-[#0D1628] border border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 block">Awaiting Passenger Pay</span>
              <p className="text-2xl font-bold font-mono text-amber-200 mt-1 tabular-nums">
                ₹{awaitingPaymentAmount.toFixed(2)}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-[#0D1628] border border-cyan-500/30">
              <span className="text-[11px] font-semibold text-cyan-300 block">Settled Earnings</span>
              <p className="text-2xl font-bold font-mono text-emerald-400 mt-1 tabular-nums">
                ₹{settledEarnings.toFixed(2)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('ratings')}
              className="p-4 rounded-2xl bg-[#0D1628] border border-amber-500/35 hover:border-amber-400/60 text-left transition-colors cursor-pointer"
            >
              <span className="text-[11px] font-semibold text-amber-300 flex items-center gap-1">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span>Passenger Rating</span>
              </span>
              <p className="text-2xl font-bold font-mono text-amber-300 mt-1 tabular-nums">
                {driverOverallRating.toFixed(2)} ★
              </p>
              <span className="text-[10px] text-slate-400 font-mono">
                {totalReviewsCount} review{totalReviewsCount === 1 ? '' : 's'}
              </span>
            </button>
          </div>

          {/* Individual Passenger Requests Requiring Action */}
          {activeActionableRequests.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white">
                  Individual Passenger Bookings Requiring Action ({activeActionableRequests.length})
                </h3>
                <span className="text-[11px] text-slate-400">
                  Each booking updates independently · Passenger pays via Wallet after completion
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeActionableRequests.map((req) => (
                  <div
                    key={req.booking_id}
                    className="p-4 rounded-2xl bg-[#0D1628] border border-slate-700/80 space-y-3"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-bold text-cyan-300">
                        BOOKING #{req.booking_id} · RIDE #{req.ride_id}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-900 text-cyan-300 border border-slate-700">
                          PAY AFTER RIDE
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${getBookingStatusBadge(req.status)}`}>
                          {req.status}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs">
                      <p className="font-bold text-white">
                        {req.passenger_name}{' '}
                        <span className="text-slate-400 font-normal font-mono">({req.passenger_phone})</span>
                      </p>
                      <p className="text-slate-400 mt-0.5">
                        {req.pickup_point} → {req.dropoff_point} · <strong className="text-white">{req.seats_booked} seat(s)</strong> ·{' '}
                        <strong className="text-cyan-300 font-mono">₹{req.total_fare.toFixed(2)}</strong>
                      </p>
                    </div>
                    <div className="pt-2 border-t border-slate-800 flex items-center justify-end gap-2">
                      {req.status === 'pending' && (
                        <>
                            <button
                            disabled={processingBookingId === req.booking_id}
                            onClick={() => handleBookingAction(req.booking_id, 'reject')}
                            className="px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-semibold cursor-pointer disabled:opacity-50"
                          >
                            Reject Request
                          </button>
                          <button
                            disabled={processingBookingId === req.booking_id}
                            onClick={() => handleBookingAction(req.booking_id, 'accept')}
                            className="px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold cursor-pointer disabled:opacity-50"
                          >
                            Accept Request
                          </button>
                        </>
                      )}
                      {req.status === 'accepted' && (
                        <>
                          <button
                            disabled={processingBookingId === req.booking_id}
                            onClick={() => handleBookingAction(req.booking_id, 'cancel')}
                            className="px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-semibold cursor-pointer disabled:opacity-50"
                          >
                            Cancel Booking
                          </button>
                          <button
                            disabled={processingBookingId === req.booking_id}
                            onClick={() => handleBookingAction(req.booking_id, 'complete')}
                            className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold cursor-pointer disabled:opacity-50"
                          >
                            Mark Completed
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Vehicle Banner */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center rounded-2xl bg-[#0D1628] border border-slate-800 p-6">
            <div className="lg:col-span-5 rounded-xl overflow-hidden border border-slate-700/80">
              <img
                src={cockpitHudImage}
                alt="Cockpit Navigation HUD in Bengaluru"
                className="w-full h-48 object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-center gap-2 text-xs text-cyan-400 font-semibold font-mono">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>BENGALURU CORRIDOR PARTNER VEHICLE</span>
              </div>
              <h3 className="text-lg font-bold text-white">
                {activeVehicle ? `${activeVehicle.make_model} · ${activeVehicle.registration_number}` : 'Driver Vehicle'}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Configured with {vehicleCapacity} passenger seats ({activeVehicle?.color || 'Standard'},{' '}
                {activeVehicle?.fuel_type || 'electric'}). Seats reserve safely via ACID transactions, and passengers pay via CarpoolX Wallet after you mark their booking as COMPLETED.
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-2 text-xs font-mono">
                <span className="px-2.5 py-1 rounded bg-[#111D35] text-cyan-300 border border-slate-700">
                  Acceptance Rate: {earnings?.acceptanceRate ?? 100}%
                </span>
                <span className="px-2.5 py-1 rounded bg-[#111D35] text-emerald-400 border border-slate-700">
                  Driver ID #{user.user_id}
                </span>
                <span className="px-2.5 py-1 rounded bg-[#111D35] text-cyan-300 border border-slate-700">
                  Active Rides: {activeRides}
                </span>
              </div>
            </div>
          </div>

          {/* Passenger Ratings & Feedback Showcase (Directly visible on Overview) */}
          <div className="rounded-2xl border border-amber-500/30 bg-[#0D1628] overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span className="font-bold text-sm text-white">
                  Recent Passenger Ratings &amp; Reviews
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-950/70 text-amber-300 border border-amber-700/60 font-mono text-[11px] font-bold">
                  {driverOverallRating.toFixed(2)} ★ Average · {totalReviewsCount} Review{totalReviewsCount === 1 ? '' : 's'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('ratings')}
                className="text-xs font-semibold text-amber-300 hover:text-amber-200 underline cursor-pointer"
              >
                View Full Breakdown &amp; All Reviews
              </button>
            </div>

            {recentRatings.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No passenger ratings submitted yet. Once passengers complete a ride and submit a star rating, their scores and feedback will appear here.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4">
                {recentRatings.slice(0, 4).map((r: any) => (
                  <div
                    key={r.rating_id}
                    className="p-3.5 rounded-xl bg-[#111D35] border border-slate-800 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="font-bold text-white block">{r.passenger_name}</span>
                        <span className="text-[10px] font-mono text-slate-400">
                          Booking #{r.booking_id}{r.route ? ` · ${r.route}` : ''}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-lg bg-amber-950/80 text-amber-300 border border-amber-700/60 font-mono font-bold inline-flex items-center gap-1 shrink-0">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span>{r.rating}/5</span>
                      </span>
                    </div>
                    {r.review_comment ? (
                      <p className="text-slate-300 italic">&ldquo;{r.review_comment}&rdquo;</p>
                    ) : (
                      <p className="text-slate-500 italic">Passenger left a {r.rating}-star rating without a written comment.</p>
                    )}
                    <span className="text-[10px] font-mono text-slate-500 block">
                      {new Date(r.created_at).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Published Rides */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-white">Your Published Rides</h3>
            {rides.length === 0 ? (
              <div className="p-8 rounded-2xl bg-[#0D1628] border border-slate-800 text-center space-y-3">
                <Car className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400">
                  You haven&apos;t published any rides yet, {user.full_name}. Publish your first Bengaluru commute now!
                </p>
                <button
                  onClick={() => setIsPublishModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs cursor-pointer"
                >
                  Publish Your First Ride
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {rides.map((r: any) => {
                  const rb: Booking[] = r.bookings || [];
                  const pCount = rb.filter((b) => b.status === 'pending').length;
                  const aCount = rb.filter((b) => b.status === 'accepted').length;
                  const cCount = rb.filter((b) => b.status === 'completed').length;
                  return (
                    <div key={r.ride_id} className="p-5 rounded-2xl bg-[#0D1628] border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono text-cyan-300 font-semibold">RIDE #{r.ride_id}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                            r.status === 'active'
                              ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                              : r.status === 'cancelled'
                              ? 'bg-rose-950 text-rose-300 border border-rose-800'
                              : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          }`}
                        >
                          {r.status}
                        </span>
                      </div>

                      <div>
                        <h4 className="text-sm font-bold text-white">
                          {r.origin_name} → {r.destination_name}
                        </h4>
                        <p className="text-xs text-slate-400 mt-0.5">Corridor: {r.corridor_name}</p>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-xs font-mono bg-[#111D35] p-2.5 rounded-xl border border-slate-800">
                        <div>
                          <span className="text-[10px] text-slate-500 block">Available</span>
                          <span className="font-bold text-white">
                            {r.available_seats} / {r.total_seats}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block">Seat Fare</span>
                          <span className="font-bold text-cyan-300">₹{r.fare_per_seat}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block">Bookings</span>
                          <span className="font-bold text-white text-[11px]">
                            {pCount}P · {aCount}A · {cCount}C
                          </span>
                        </div>
                      </div>

                      {r.status === 'active' && (
                        <div className="pt-2 flex justify-end gap-2">
                          <button
                            onClick={() => handleCancelRide(r.ride_id)}
                            className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold cursor-pointer"
                          >
                            Cancel Ride
                          </button>
                          <button
                            onClick={() => handleCompleteRide(r.ride_id)}
                            className="px-3.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-colors cursor-pointer"
                          >
                            Close Completed Ride
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: REQUESTS TABLE (PER-BOOKING ACTIONS) */}
      {activeTab === 'requests' && (
        <div className="rounded-2xl border border-slate-800 bg-[#0D1628] overflow-hidden">
          {requests.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">No passenger booking requests yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#111D35] text-slate-300 font-mono border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Booking / Ride</th>
                    <th className="px-4 py-3">Passenger</th>
                    <th className="px-4 py-3">Pickup / Dropoff</th>
                    <th className="px-4 py-3">Seats</th>
                    <th className="px-4 py-3">Fare</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Payment Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {requests.map((req) => (
                    <tr key={req.booking_id} className="hover:bg-[#162544]/60 transition-colors">
                      <td className="px-4 py-3 font-mono">
                        <span className="font-bold text-cyan-300 block">#{req.booking_id}</span>
                        <span className="text-[10px] text-slate-500">Ride #{req.ride_id}</span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-white">{req.passenger_name}</p>
                        <p className="text-[11px] text-slate-400 font-mono">{req.passenger_phone}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        <p>{req.pickup_point}</p>
                        <p className="text-[11px] text-slate-500">to {req.dropoff_point}</p>
                      </td>
                      <td className="px-4 py-3 font-mono">{req.seats_booked}</td>
                      <td className="px-4 py-3 font-mono font-bold text-white tabular-nums">₹{req.total_fare.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase ${getBookingStatusBadge(req.status)}`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[10px] uppercase">
                        {req.payment_status === 'refunded' ? (
                          <span className="text-rose-300 font-bold">REFUNDED</span>
                        ) : req.driver_settled || (req.status === 'completed' && req.payment_status === 'paid') ? (
                          <span className="text-emerald-400 font-bold">SETTLED ✓</span>
                        ) : req.status === 'completed' ? (
                          <span className="text-amber-300 font-bold">AWAITING PAY</span>
                        ) : req.status === 'cancelled' || req.status === 'rejected' ? (
                          <span className="text-slate-500">NO CHARGE</span>
                        ) : (
                          <span className="text-cyan-300">PAY AFTER RIDE</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap space-x-2">
                        {req.status === 'pending' && (
                          <>
                            <button
                              disabled={processingBookingId === req.booking_id}
                              onClick={() => handleBookingAction(req.booking_id, 'accept')}
                              className="px-2.5 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-[11px] cursor-pointer disabled:opacity-50"
                            >
                              Accept
                            </button>
                            <button
                              disabled={processingBookingId === req.booking_id}
                              onClick={() => handleBookingAction(req.booking_id, 'reject')}
                              className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 font-semibold text-[11px] cursor-pointer disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {req.status === 'accepted' && (
                          <>
                            <button
                              disabled={processingBookingId === req.booking_id}
                              onClick={() => handleBookingAction(req.booking_id, 'complete')}
                              className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[11px] cursor-pointer disabled:opacity-50"
                            >
                              Complete Ride
                            </button>
                            <button
                              disabled={processingBookingId === req.booking_id}
                              onClick={() => handleBookingAction(req.booking_id, 'cancel')}
                              className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 font-semibold text-[11px] cursor-pointer disabled:opacity-50"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                        {req.status === 'completed' && (
                          <div className="inline-flex items-center gap-2">
                            <span className={`text-[11px] font-semibold ${req.payment_status === 'paid' ? 'text-emerald-400' : 'text-amber-300'}`}>
                              {req.payment_status === 'paid' ? 'Settled to Earnings ✓' : 'Awaiting Wallet Pay'}
                            </span>
                            {req.driver_rating && (
                              <span
                                title={req.driver_review || `Rated ${req.driver_rating}★`}
                                className="px-2 py-0.5 rounded bg-amber-950/70 text-amber-300 border border-amber-700/60 text-[10px] font-mono font-bold inline-flex items-center gap-1"
                              >
                                <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                                {req.driver_rating}★
                              </span>
                            )}
                          </div>
                        )}
                        {(req.status === 'rejected' || req.status === 'cancelled') && (
                          <span className="text-[11px] text-slate-500">Closed · Seats Restored</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: MY RIDES TABLE */}
      {activeTab === 'rides' && (
        <div className="rounded-2xl border border-slate-800 bg-[#0D1628] overflow-hidden">
          {rides.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">No published rides yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#111D35] text-slate-300 font-mono border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Ride ID</th>
                    <th className="px-4 py-3">Route</th>
                    <th className="px-4 py-3">Departure</th>
                    <th className="px-4 py-3">Seats</th>
                    <th className="px-4 py-3">Fare</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300 font-mono">
                  {rides.map((r) => (
                    <tr key={r.ride_id} className="hover:bg-[#162544]/60 transition-colors">
                      <td className="px-4 py-3 font-bold text-cyan-300">#{r.ride_id}</td>
                      <td className="px-4 py-3 font-sans">
                        <p className="font-semibold text-white">
                          {r.origin_name} → {r.destination_name}
                        </p>
                        <p className="text-[11px] text-slate-400">{r.corridor_name}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {new Date(r.departure_time).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="px-4 py-3">
                        {r.available_seats} / {r.total_seats}
                      </td>
                      <td className="px-4 py-3 font-bold text-white">₹{r.fare_per_seat.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            r.status === 'active'
                              ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                              : r.status === 'cancelled'
                              ? 'bg-rose-950 text-rose-300 border border-rose-800'
                              : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        {r.status === 'active' && (
                          <>
                            <button
                              onClick={() => handleCancelRide(r.ride_id)}
                              className="px-2.5 py-1 rounded bg-rose-600/15 hover:bg-rose-600/25 text-rose-300 text-[11px] font-semibold border border-rose-500/30 cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleCompleteRide(r.ride_id)}
                              className="px-2.5 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-[11px] font-semibold border border-emerald-500/30 cursor-pointer"
                            >
                              Close Ride
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: EARNINGS & WALLET ESCROW LEDGER */}
      {activeTab === 'earnings' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-6 rounded-2xl bg-[#0D1628] border border-emerald-500/30 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                <Wallet className="w-4 h-4" />
                <span>Total Driver Earnings Balance (Settled)</span>
              </div>
              <p className="text-3xl font-extrabold font-mono text-emerald-400 tabular-nums">
                ₹{settledEarnings.toFixed(2)}
              </p>
              <p className="text-xs text-slate-400">
                Credited automatically to your Driver Earnings Balance when passengers complete their post-ride CarpoolX Wallet payment.
              </p>
            </div>
            <div className="p-6 rounded-2xl bg-[#0D1628] border border-slate-800 space-y-2">
              <span className="text-xs font-semibold text-amber-300 uppercase tracking-wider">
                Pending Passenger Payments (Completed Rides)
              </span>
              <p className="text-3xl font-extrabold font-mono text-amber-300 tabular-nums">
                ₹{awaitingPaymentAmount.toFixed(2)}
              </p>
              <p className="text-xs text-slate-400">
                Completed rides awaiting passenger settlement from their CarpoolX Wallet.
              </p>
            </div>
          </div>

          {/* Credit Ledger */}
          <div className="rounded-2xl border border-slate-800 bg-[#0D1628] overflow-hidden">
            <div className="p-4 border-b border-slate-800 font-bold text-xs text-white uppercase tracking-wider">
              Driver Earnings Settlement Ledger (Credits)
            </div>
            {creditLedger.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No completed ride payouts settled yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left font-mono">
                  <thead className="bg-[#111D35] text-slate-300 border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3">TXN Ref</th>
                      <th className="px-4 py-3">Booking</th>
                      <th className="px-4 py-3">Credit</th>
                      <th className="px-4 py-3">Balance Before</th>
                      <th className="px-4 py-3">Balance After</th>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {creditLedger.map((entry) => (
                      <tr key={entry.ledger_id} className="hover:bg-[#162544]/60 transition-colors">
                        <td className="px-4 py-3 font-bold text-cyan-300">{entry.transaction_id}</td>
                        <td className="px-4 py-3">#{entry.booking_id}</td>
                        <td className="px-4 py-3 font-bold text-emerald-400 tabular-nums">+₹{entry.amount.toFixed(2)}</td>
                        <td className="px-4 py-3 text-slate-400 tabular-nums">₹{entry.balance_before.toFixed(2)}</td>
                        <td className="px-4 py-3 text-white font-bold tabular-nums">₹{entry.balance_after.toFixed(2)}</td>
                        <td className="px-4 py-3 font-sans">{entry.description}</td>
                        <td className="px-4 py-3 text-slate-400 text-[11px]">
                          {new Date(entry.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-[#0D1628] overflow-hidden">
            <div className="p-4 border-b border-slate-800 font-bold text-xs text-white uppercase tracking-wider">
              Ride-Wise Settlement Breakdown
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#111D35] text-slate-300 font-mono border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Ride ID</th>
                    <th className="px-4 py-3">Route</th>
                    <th className="px-4 py-3">Bookings</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Settled (₹)</th>
                    <th className="px-4 py-3 text-right">Awaiting Pay (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono text-slate-300">
                  {earnings?.rideBreakdown?.map((rb: any) => (
                    <tr key={rb.ride_id} className="hover:bg-[#162544]/60 transition-colors">
                      <td className="px-4 py-3 font-bold text-cyan-300">#{rb.ride_id}</td>
                      <td className="px-4 py-3 font-sans text-white">{rb.route}</td>
                      <td className="px-4 py-3">{rb.passengersCount} Booking(s)</td>
                      <td className="px-4 py-3 capitalize">{rb.status}</td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-400 tabular-nums">
                        ₹{(rb.paidAmount ?? rb.earnings ?? 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-amber-300 tabular-nums">
                        ₹{(rb.awaitingPaymentAmount ?? 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Passenger Ratings & Reviews */}
          <div className="rounded-2xl border border-slate-800 bg-[#0D1628] overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <span className="font-bold text-xs text-white uppercase tracking-wider flex items-center gap-2">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span>Passenger Ratings &amp; Reviews</span>
              </span>
              <span className="text-xs font-mono font-bold text-amber-300">
                Overall Rating: {driverOverallRating.toFixed(2)} ★
              </span>
            </div>
            {recentRatings.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No passenger ratings submitted yet for recent trips.
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {recentRatings.map((r: any) => (
                  <div key={r.rating_id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-white">{r.passenger_name}</span>
                        <span className="font-mono text-[10px] text-cyan-300">Booking #{r.booking_id}</span>
                        {r.route && (
                          <span className="text-[11px] text-slate-400">· {r.route}</span>
                        )}
                      </div>
                      {r.review_comment && (
                        <p className="text-slate-300 italic">&ldquo;{r.review_comment}&rdquo;</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="px-2.5 py-1 rounded-lg bg-amber-950/70 text-amber-300 border border-amber-700/60 font-mono font-bold inline-flex items-center gap-1">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        {r.rating}/5
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {new Date(r.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: DRIVER RATINGS & PASSENGER FEEDBACK */}
      {activeTab === 'ratings' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Rating Hero Card */}
            <div className="lg:col-span-4 p-6 rounded-2xl bg-gradient-to-br from-[#1A160D] via-[#0D1628] to-[#0D1628] border border-amber-500/35 flex flex-col justify-between space-y-4">
              <div>
                <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                  Verified Passenger Feedback
                </span>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-4xl font-black font-mono text-white tabular-nums">
                    {driverOverallRating.toFixed(2)}
                  </span>
                  <span className="text-sm font-mono text-slate-400">/ 5.00</span>
                </div>
                <div className="flex items-center gap-1 mt-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${
                        star <= Math.round(driverOverallRating)
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-slate-700'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <p className="text-xs text-slate-400">
                Aggregated across <strong className="text-white">{totalReviewsCount}</strong> completed passenger trip review{totalReviewsCount === 1 ? '' : 's'}.
              </p>
            </div>

            {/* Star Distribution Bars */}
            <div className="lg:col-span-8 p-6 rounded-2xl bg-[#0D1628] border border-slate-800 space-y-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Star Rating Breakdown
              </h3>
              <div className="space-y-2.5">
                {[5, 4, 3, 2, 1].map((stars) => {
                  const count = Number(ratingBreakdown[stars] || 0);
                  const pct = totalReviewsCount > 0 ? Math.round((count / totalReviewsCount) * 100) : 0;
                  return (
                    <div key={stars} className="flex items-center gap-3 text-xs font-mono">
                      <span className="w-10 text-amber-300 font-bold flex items-center gap-1">
                        {stars} <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      </span>
                      <div className="flex-1 h-2.5 rounded-full bg-[#111D35] overflow-hidden border border-slate-800">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-20 text-right text-slate-400 tabular-nums">
                        {count} ({pct}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* All Reviews List */}
          <div className="rounded-2xl border border-slate-800 bg-[#0D1628] overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                All Passenger Reviews ({recentRatings.length})
              </h3>
              <span className="text-[11px] text-slate-400">Sorted newest first</span>
            </div>

            {recentRatings.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No passenger reviews recorded yet. Completed passengers can rate your trip from their Passenger Console.
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {recentRatings.map((r: any) => (
                  <div
                    key={r.rating_id}
                    className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-[#111D35]/50 transition-colors"
                  >
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-white text-sm">{r.passenger_name}</span>
                        <span className="px-2 py-0.5 rounded bg-cyan-950/70 text-cyan-300 border border-cyan-800/60 font-mono text-[10px]">
                          Booking #{r.booking_id}
                        </span>
                        {r.route && <span className="text-slate-400">{r.route}</span>}
                      </div>
                      {r.review_comment ? (
                        <p className="text-slate-200 leading-relaxed">&ldquo;{r.review_comment}&rdquo;</p>
                      ) : (
                        <p className="text-slate-500 italic">No written comment provided.</p>
                      )}
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1.5 shrink-0">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-3.5 h-3.5 ${
                              s <= Number(r.rating)
                                ? 'text-amber-400 fill-amber-400'
                                : 'text-slate-700'
                            }`}
                          />
                        ))}
                        <span className="ml-1.5 font-mono font-bold text-amber-300">
                          {r.rating}/5
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {new Date(r.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 6: DRIVER ISSUES & SUPPORT */}
      {activeTab === 'issues' && (
        <IssueSupportPanel role="driver" bookings={requests} rides={rides} />
      )}

      {isPublishModalOpen && (
        <PublishRideModal
          onClose={() => setIsPublishModalOpen(false)}
          onSuccess={() => {
            loadData();
            setActionMessage('New carpool published successfully to the Bengaluru network!');
            setTimeout(() => setActionMessage(null), 4000);
          }}
        />
      )}
    </div>
  );
};
