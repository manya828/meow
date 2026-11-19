import React, { useState, useMemo } from 'react';
import {
  X,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  User,
  ArrowRight,
  Wallet,
  PlusCircle,
} from 'lucide-react';
import { Ride, RideStop } from '../../types';
import { api } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { bengaluruNodes } from '../../data/bengaluruTransit.ts';
import { WalletQrRechargePanel } from '../wallet/WalletQrRechargePanel.tsx';

interface BookRideModalProps {
  ride: Ride;
  preferredPickup?: string;
  preferredDropoff?: string;
  onClose: () => void;
  onSuccess: () => void;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function resolveCoords(label: string, ride: Ride, fallbackLat: number, fallbackLng: number) {
  const clean = (label || '').trim().toLowerCase();
  if (!clean) return { lat: fallbackLat, lng: fallbackLng };
  if (ride.origin_name.toLowerCase() === clean) return { lat: ride.origin_lat, lng: ride.origin_lng };
  if (ride.destination_name.toLowerCase() === clean) return { lat: ride.destination_lat, lng: ride.destination_lng };
  const stopMatch = (ride.stops || []).find((s) => s.stop_name.toLowerCase() === clean);
  if (stopMatch) return { lat: stopMatch.stop_lat, lng: stopMatch.stop_lng };
  const node = bengaluruNodes.find(
    (n) =>
      n.name.toLowerCase() === clean ||
      n.name.toLowerCase().includes(clean.split('(')[0].trim())
  );
  if (node) return { lat: node.lat, lng: node.lng };
  return { lat: fallbackLat, lng: fallbackLng };
}

function getOrderedStops(ride: Ride): RideStop[] {
  return [...(ride.stops || [])].sort((a, b) => a.stop_order - b.stop_order);
}

function getPointRankAndFare(
  ride: Ride,
  orderedStops: RideStop[],
  point: string,
  role: 'pickup' | 'dropoff'
): { rank: number | null; cumulativeFare: number } {
  const clean = (point || '').trim().toLowerCase();
  if (role === 'pickup' && clean === ride.origin_name.trim().toLowerCase()) {
    return { rank: 0, cumulativeFare: 0 };
  }
  if (role === 'dropoff' && clean === ride.destination_name.trim().toLowerCase()) {
    return { rank: orderedStops.length + 1, cumulativeFare: Number(ride.fare_per_seat) };
  }
  const idx = orderedStops.findIndex((s) => s.stop_name.trim().toLowerCase() === clean);
  if (idx !== -1) {
    return { rank: idx + 1, cumulativeFare: Number(orderedStops[idx].fare_from_origin) };
  }
  return { rank: null, cumulativeFare: role === 'pickup' ? 0 : Number(ride.fare_per_seat) };
}

function calculateUnitSegmentFare(
  ride: Ride,
  pickupPoint: string,
  dropoffPoint: string
): { unitFare: number; validSegment: boolean } {
  const orderedStops = getOrderedStops(ride);
  const p = getPointRankAndFare(ride, orderedStops, pickupPoint, 'pickup');
  const d = getPointRankAndFare(ride, orderedStops, dropoffPoint, 'dropoff');

  if (p.rank !== null && d.rank !== null && d.rank <= p.rank) {
    return { unitFare: 0, validSegment: false };
  }
  if (p.rank === 0 && d.rank === orderedStops.length + 1) {
    return { unitFare: Number(ride.fare_per_seat), validSegment: true };
  }

  const pCoords = resolveCoords(pickupPoint, ride, ride.origin_lat, ride.origin_lng);
  const dCoords = resolveCoords(dropoffPoint, ride, ride.destination_lat, ride.destination_lng);
  const roadKm = Math.max(2.0, haversineKm(pCoords.lat, pCoords.lng, dCoords.lat, dCoords.lng) * 1.32);

  if (p.rank !== null && d.rank !== null && d.rank > p.rank) {
    const rawDiff = Number((d.cumulativeFare - p.cumulativeFare).toFixed(2));
    const fare =
      rawDiff > 0
        ? rawDiff
        : Math.max(
            20,
            Math.round(((roadKm / Math.max(4, ride.estimated_distance_km || 18)) * ride.fare_per_seat) / 5) * 5
          );
    return { unitFare: fare, validSegment: true };
  }

  const baseDist = Math.max(4, ride.estimated_distance_km || 18);
  const perKmRate = ride.fare_per_seat / baseDist;
  const rawPerSeat = Math.round((roadKm * perKmRate) / 5) * 5;
  const fare = Math.max(30, Math.min(Math.round(ride.fare_per_seat * 1.85), rawPerSeat));
  return { unitFare: fare, validSegment: true };
}

export const BookRideModal: React.FC<BookRideModalProps> = ({
  ride,
  preferredPickup,
  preferredDropoff,
  onClose,
  onSuccess,
}) => {
  const { user, isPassenger, refreshMe, openLoginModal, openRegisterModal } = useAuth();
  const [seatsRequested, setSeatsRequested] = useState<number>(1);
  const [pickupPoint, setPickupPoint] = useState<string>(preferredPickup || ride.origin_name);
  const [dropoffPoint, setDropoffPoint] = useState<string>(preferredDropoff || ride.destination_name);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Inline QR Add Money panel state (backed by server-verified QR payment flow)
  const [showTopUp, setShowTopUp] = useState(false);
  const [topUpNotice, setTopUpNotice] = useState<string | null>(null);

  const [bookingSuccess, setBookingSuccess] = useState<{
    bookingId: number;
    totalFare: number;
    status: string;
    transactionId?: string;
    remainingBalance?: number;
  } | null>(null);

  const orderedStops = useMemo(() => getOrderedStops(ride), [ride]);

  const pickupRankInfo = useMemo(
    () => getPointRankAndFare(ride, orderedStops, pickupPoint, 'pickup'),
    [ride, orderedStops, pickupPoint]
  );

  // Compute exact segment fare between pickupPoint and dropoffPoint (mirrors backend logic)
  const segmentPricing = useMemo(
    () => calculateUnitSegmentFare(ride, pickupPoint, dropoffPoint),
    [ride, pickupPoint, dropoffPoint]
  );

  const unitFare = segmentPricing.unitFare;
  const totalFare = Number((unitFare * seatsRequested).toFixed(2));
  const walletBalance = Number((user?.wallet_balance ?? 0).toFixed(2));
  const remainingBalance = Number((walletBalance - totalFare).toFixed(2));
  const hasSufficientBalance = walletBalance >= totalFare;
  const shortfall = hasSufficientBalance ? 0 : Number((totalFare - walletBalance).toFixed(2));
  const isOwnRide = Boolean(user && ride.driver_id === user.user_id);

  const handlePickupChange = (nextPickup: string) => {
    setPickupPoint(nextPickup);
    setError(null);
    const nextPickupInfo = getPointRankAndFare(ride, orderedStops, nextPickup, 'pickup');
    const currentDropInfo = getPointRankAndFare(ride, orderedStops, dropoffPoint, 'dropoff');
    if (
      nextPickupInfo.rank !== null &&
      currentDropInfo.rank !== null &&
      currentDropInfo.rank <= nextPickupInfo.rank
    ) {
      setDropoffPoint(ride.destination_name);
    }
  };

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!user || !isPassenger) {
      setError('Please sign in or create a Passenger account before booking a ride.');
      return;
    }
    if (isOwnRide) {
      setError('You cannot book seats on a ride you published yourself.');
      return;
    }
    if (!segmentPricing.validSegment) {
      setError('Dropoff stop must come after the selected pickup stop along the route.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await api.bookRide(ride.ride_id, {
        seatsRequested,
        pickupPoint,
        dropoffPoint,
      });

      setBookingSuccess({
        bookingId: res.booking.booking_id,
        totalFare: res.booking.total_fare,
        status: res.booking.status,
        remainingBalance: res.walletBalance,
      });
      await refreshMe();
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Booking transaction could not be completed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#0D1628] border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative text-slate-200 my-6">
        <button
          onClick={onClose}
          aria-label="Close booking modal"
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {bookingSuccess ? (
          <div className="text-center py-4 space-y-4">
            <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8" />
            </div>

            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
                Seat Reserved · ₹0.00 Deducted Now (Pay After Ride Completion)
              </span>
              <h3 className="text-xl font-bold text-white mt-1">Seat Request Submitted!</h3>
              <p className="text-xs text-slate-300 mt-1">
                {ride.driver_name} has received your request for {seatsRequested} seat(s) ({pickupPoint} → {dropoffPoint}).
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#111D35] border border-slate-800 text-xs text-left space-y-2 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Booking ID:</span>
                <span className="text-cyan-300 font-bold">#{bookingSuccess.bookingId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Booking Status:</span>
                <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 uppercase font-bold text-[10px]">
                  {bookingSuccess.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Charged Now:</span>
                <span className="text-emerald-300 font-bold">₹0.00 (Unpaid until completed)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Estimated Post-Ride Fare:</span>
                <span className="text-cyan-300 font-bold">₹{bookingSuccess.totalFare.toFixed(2)}</span>
              </div>
              {bookingSuccess.remainingBalance !== undefined && (
                <div className="flex justify-between border-t border-slate-800 pt-2">
                  <span className="text-slate-400">Current Wallet Balance:</span>
                  <span className="text-white font-bold">₹{bookingSuccess.remainingBalance.toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/25 text-[11px] text-cyan-200 text-left flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <span>
                You can edit your dropoff destination while status is <strong>PENDING</strong>, or cancel cleanly with no wallet charge needed. Once the driver marks the trip <strong>COMPLETED</strong>, settle ₹{bookingSuccess.totalFare.toFixed(2)} directly from your CarpoolX Wallet.
              </span>
            </div>

            <button
              onClick={onClose}
              className="w-full py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
            >
              Done &amp; View My Bookings
            </button>
          </div>
        ) : !user || !isPassenger ? (
          <div className="text-center py-4 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mx-auto">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Passenger Account Required</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                {user
                  ? `You are signed in as ${user.full_name} (${user.role}). Only dedicated Passenger accounts can book seats. Please sign in with a Passenger account or create a Passenger account.`
                  : `To book ${seatsRequested} seat(s) with ${ride.driver_name} on Ride #${ride.ride_id}, please sign in with an existing Passenger account or create one. First-time Passenger accounts start with ₹700 in their wallet by default.`}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  openRegisterModal('passenger');
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs cursor-pointer"
              >
                Create Passenger Account
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  openLoginModal('passenger', 'login');
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#111D35] hover:bg-[#162544] border border-slate-700 text-slate-200 font-semibold text-xs cursor-pointer"
              >
                Sign In as Passenger
              </button>
            </div>
          </div>
        ) : isOwnRide ? (
          <div className="text-center py-4 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">You Published This Ride</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Ride #{ride.ride_id} is offered under your account ({user.full_name}, ID #{user.user_id}). You cannot book your own ride.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 px-4 rounded-xl bg-[#111D35] hover:bg-[#162544] border border-slate-700 text-slate-200 font-semibold text-xs cursor-pointer"
            >
              Close &amp; Browse Other Rides
            </button>
          </div>
        ) : (
          <form onSubmit={handleBook} className="space-y-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-cyan-400 font-semibold mb-1">
                <ShieldCheck className="w-4 h-4" />
                <span>Safe ACID Seat Reservation · Pay After Ride Completion</span>
              </div>
              <h3 className="text-lg font-bold text-white">Book Seats on Ride #{ride.ride_id}</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Passenger: <strong className="text-cyan-300">{user.full_name}</strong> · Driver: <strong className="text-white">{ride.driver_name}</strong>
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {topUpNotice && (
              <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2">
                <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{topUpNotice}</span>
              </div>
            )}

            {/* Ride Details */}
            <div className="p-3.5 rounded-xl bg-[#111D35] border border-slate-800 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Corridor Route:</span>
                <span className="font-medium text-white truncate max-w-[235px]">
                  {ride.origin_name} → {ride.destination_name}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Departure:</span>
                <span className="font-mono text-cyan-300">
                  {new Date(ride.departure_time).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Available Seats:</span>
                <span className="font-mono text-emerald-400 font-bold">{ride.available_seats} remaining</span>
              </div>
            </div>

            {/* Seat Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Number of Seats
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4]
                  .filter((num) => num <= ride.available_seats)
                  .map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setSeatsRequested(num)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${
                        seatsRequested === num
                          ? 'bg-cyan-500 text-slate-950'
                          : 'bg-[#111D35] text-slate-300 border border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {num} {num === 1 ? 'Seat' : 'Seats'}
                    </button>
                  ))}
              </div>
            </div>

            {/* Pickup / Dropoff Waypoints */}
            <div className="space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Pickup Stop</label>
                  <select
                    value={pickupPoint}
                    onChange={(e) => handlePickupChange(e.target.value)}
                    className="w-full bg-[#111D35] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
                  >
                    {preferredPickup &&
                      preferredPickup !== ride.origin_name &&
                      !orderedStops.some((s) => s.stop_name === preferredPickup) && (
                        <option value={preferredPickup}>{preferredPickup} (Selected Pickup)</option>
                      )}
                    <option value={ride.origin_name}>
                      {ride.origin_name} (Origin · Full ₹{ride.fare_per_seat})
                    </option>
                    {orderedStops.map((s) => {
                      const fromStopToDest = Math.max(0, ride.fare_per_seat - s.fare_from_origin);
                      return (
                        <option key={s.stop_id} value={s.stop_name}>
                          {s.stop_name} (Stop {s.stop_order} · ₹{fromStopToDest} to Dest)
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Dropoff Destination</label>
                  <select
                    value={dropoffPoint}
                    onChange={(e) => setDropoffPoint(e.target.value)}
                    className="w-full bg-[#111D35] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
                  >
                    {preferredDropoff &&
                      preferredDropoff !== ride.destination_name &&
                      !orderedStops.some((s) => s.stop_name === preferredDropoff) && (
                        <option value={preferredDropoff}>
                          {preferredDropoff} (Selected Drop · ₹{calculateUnitSegmentFare(ride, pickupPoint, preferredDropoff).unitFare})
                        </option>
                      )}
                    <option value={ride.destination_name}>
                      {ride.destination_name} (Destination · ₹{calculateUnitSegmentFare(ride, pickupPoint, ride.destination_name).unitFare})
                    </option>
                    {orderedStops.map((s, idx) => {
                      const stopRank = idx + 1;
                      const isDisabled = pickupRankInfo.rank !== null && stopRank <= pickupRankInfo.rank;
                      const segFare = calculateUnitSegmentFare(ride, pickupPoint, s.stop_name).unitFare;
                      return (
                        <option key={s.stop_id} value={s.stop_name} disabled={isDisabled}>
                          {s.stop_name} {isDisabled ? '(Before pickup)' : `(₹${segFare})`}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {segmentPricing.validSegment && unitFare !== ride.fare_per_seat && (
                <div className="p-2.5 rounded-xl bg-emerald-950/35 border border-emerald-500/35 text-[11px] text-emerald-200 flex items-center justify-between gap-2">
                  <span>
                    Segment pricing applied for <strong>{pickupPoint}</strong> → <strong>{dropoffPoint}</strong>
                  </span>
                  <span className="font-mono font-bold text-emerald-300 shrink-0">
                    ₹{unitFare}/seat (vs ₹{ride.fare_per_seat} full route)
                  </span>
                </div>
              )}
            </div>

            {/* Post-Completion CarpoolX Wallet Summary (₹0 Deducted Now) */}
            <div className="p-4 rounded-xl border bg-[#081223] border-cyan-500/35 space-y-2 text-xs">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                <span className="flex items-center gap-1.5 font-semibold text-white">
                  <Wallet className="w-4 h-4 text-cyan-400" />
                  <span>Payment Method: CarpoolX Wallet (Post-Ride)</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowTopUp((v) => !v)}
                  className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>{showTopUp ? 'Hide Recharge QR' : 'Add Money'}</span>
                </button>
              </div>

              <div className="flex justify-between font-mono">
                <span className="text-slate-400">
                  Segment Fare (₹{unitFare.toFixed(0)} × {seatsRequested} seat{seatsRequested > 1 ? 's' : ''}):
                </span>
                <span className="text-white font-bold tabular-nums">₹{totalFare.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-mono">
                <span className="text-slate-400">Deducted Now at Booking:</span>
                <span className="text-emerald-400 font-bold tabular-nums">₹0.00 (Pay after completion)</span>
              </div>
              <div className="flex justify-between font-mono">
                <span className="text-slate-400">Current Wallet Balance:</span>
                <span className={`font-bold tabular-nums ${hasSufficientBalance ? 'text-emerald-400' : 'text-amber-300'}`}>
                  ₹{walletBalance.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between font-mono border-t border-slate-800 pt-1.5">
                <span className="text-slate-300 font-semibold">Projected Balance After Ride Payment:</span>
                <span className={`font-bold tabular-nums ${hasSufficientBalance ? 'text-cyan-300' : 'text-amber-300'}`}>
                  {hasSufficientBalance ? `₹${remainingBalance.toFixed(2)}` : `Top-up ₹${shortfall.toFixed(2)} needed before pay`}
                </span>
              </div>

              {!hasSufficientBalance && (
                <p className="text-[11px] text-amber-300 pt-1">
                  You can reserve your seat now with ₹0 upfront. Remember to add at least ₹{shortfall.toFixed(2)} via QR recharge before settling after ride completion.
                </p>
              )}
            </div>

            {/* Verified QR Wallet Recharge Panel */}
            {showTopUp && (
              <WalletQrRechargePanel
                compact={true}
                showHistory={false}
                currentBalance={walletBalance}
                initialAmount={shortfall > 0 ? Math.max(50, Math.ceil(shortfall / 10) * 10) : 500}
                onClose={() => setShowTopUp(false)}
                onVerifiedSuccess={async () => {
                  await refreshMe();
                  setTopUpNotice('Wallet recharge verified by backend and credited to your CarpoolX Wallet!');
                  setShowTopUp(false);
                }}
              />
            )}

            {/* Confirm CTA */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-3">
              <div>
                <span className="text-[11px] text-slate-400">Due After Ride</span>
                <p className="text-xl font-black font-mono text-cyan-300 tabular-nums">₹{totalFare.toFixed(2)}</p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || ride.available_seats < seatsRequested || !segmentPricing.validSegment}
                className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs transition-all shadow-md shadow-cyan-500/20 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
              >
                {isSubmitting ? (
                  <span>Reserving Seat(s)...</span>
                ) : (
                  <>
                    <span>Confirm Seat Request (Pay After Ride)</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
