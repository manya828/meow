import React, { useState, useEffect } from 'react';
import {
  Leaf,
  Search,
  ArrowRight,
  Car,
  User,
  Phone,
  Mail,
  Building2,
  ShieldAlert,
  Wallet,
  CheckCircle,
  AlertCircle,
  Plus,
  Pencil,
  Lock,
  History,
  X,
  Star,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { api } from '../../services/api.ts';
import { Booking, Transaction, WalletLedgerEntry } from '../../types';
import { LocationSearchInput } from '../../components/common/LocationSearchInput.tsx';
import { IssueSupportPanel } from '../../components/issues/IssueSupportPanel.tsx';
import { WalletQrRechargePanel } from '../../components/wallet/WalletQrRechargePanel.tsx';

interface PassengerDashboardProps {
  onFindRide: () => void;
}

const getStatusBadgeStyle = (status: Booking['status']) => {
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

export const PassengerDashboard: React.FC<PassengerDashboardProps> = ({ onFindRide }) => {
  const {
    user,
    isPassenger,
    passengerProfile,
    refreshMe,
    openLoginModal,
    openRegisterModal,
  } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'bookings' | 'payments' | 'issues'>('overview');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [walletLedger, setWalletLedger] = useState<WalletLedgerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionBanner, setActionBanner] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Add Money QR Modal state
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);

  // Edit Pending Booking Modal (Destination only — Pickup stays locked)
  const [editModalBooking, setEditModalBooking] = useState<Booking | null>(null);
  const [editDropoffPoint, setEditDropoffPoint] = useState('');
  const [editPreview, setEditPreview] = useState<any>(null);
  const [isPreviewingEdit, setIsPreviewingEdit] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Cancellation modal state
  const [cancelModalBooking, setCancelModalBooking] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState('Change in morning office schedule');
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Post-completion CarpoolX Wallet payment modal state
  const [payModalBooking, setPayModalBooking] = useState<Booking | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [showPayTopUp, setShowPayTopUp] = useState(false);
  const [payTopUpAmount, setPayTopUpAmount] = useState<number>(500);

  // Post-completion Driver Rating modal state
  const [rateModalBooking, setRateModalBooking] = useState<Booking | null>(null);
  const [ratingValue, setRatingValue] = useState<number>(5);
  const [ratingHover, setRatingHover] = useState<number>(0);
  const [ratingComment, setRatingComment] = useState<string>('');
  const [isSubmittingRating, setIsSubmittingRating] = useState<boolean>(false);
  const [rateError, setRateError] = useState<string | null>(null);

  const loadData = async () => {
    if (!user || !isPassenger) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [bookingsData, txnsData] = await Promise.all([
        api.getPassengerBookings(),
        api.getPassengerTransactions(),
      ]);
      setBookings(bookingsData.bookings || []);
      setTransactions(txnsData.transactions || []);
      setWalletLedger(txnsData.walletLedger || []);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.user_id, isPassenger]);

  if (!user || !isPassenger) {
    return (
      <div className="max-w-lg mx-auto my-12 p-8 rounded-3xl bg-[#0D1628] border border-slate-800 text-center space-y-4">
        <User className="w-10 h-10 text-cyan-400 mx-auto" />
        <h2 className="text-2xl font-extrabold text-white">Passenger Account Required</h2>
        <p className="text-xs text-slate-400">
          {user
            ? `You are signed in as ${user.full_name} (${user.role}). Sign in with a Passenger account to find rides and manage bookings.`
            : 'Create your Passenger account or sign in to book rides, manage requests, and pay from your wallet.'}
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => openRegisterModal('passenger')}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold text-xs cursor-pointer"
          >
            Create Passenger Account
          </button>
          <button
            onClick={() => openLoginModal('passenger', 'login')}
            className="px-5 py-2.5 rounded-xl bg-[#111D35] border border-slate-700 text-slate-200 font-semibold text-xs cursor-pointer"
          >
            Sign In as Passenger
          </button>
        </div>
      </div>
    );
  }

  const walletBalance = user.wallet_balance ?? 0;

  const openEditBookingModal = (booking: Booking) => {
    setEditModalBooking(booking);
    setEditDropoffPoint(booking.dropoff_point);
    setEditPreview(null);
    setEditError(null);
  };

  const handlePreviewEdit = async (targetDest?: string) => {
    if (!editModalBooking) return;
    const dest = (targetDest ?? editDropoffPoint).trim();
    if (!dest) return;
    setIsPreviewingEdit(true);
    setEditError(null);
    try {
      const res = await api.previewBookingEdit(editModalBooking.booking_id, { dropoffPoint: dest });
      setEditPreview(res.preview);
    } catch (err: any) {
      setEditError(err.message || 'Could not calculate updated fare.');
    } finally {
      setIsPreviewingEdit(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editModalBooking || !editDropoffPoint.trim() || isSavingEdit) return;
    setIsSavingEdit(true);
    setEditError(null);
    try {
      const res = await api.editPendingBooking(editModalBooking.booking_id, {
        dropoffPoint: editDropoffPoint.trim(),
      });
      setEditModalBooking(null);
      setEditPreview(null);
      setActionBanner(res.message);
      await Promise.all([loadData(), refreshMe()]);
      setTimeout(() => setActionBanner(null), 5000);
    } catch (err: any) {
      setEditError(err.message || 'Could not update pending booking.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!cancelModalBooking) return;
    setIsCancelling(true);
    setCancelError(null);
    try {
      const res = await api.cancelBooking(cancelModalBooking.booking_id, {
        reason: cancelReason,
      });
      setCancelModalBooking(null);
      setActionBanner(res.message);
      await Promise.all([loadData(), refreshMe()]);
      setTimeout(() => setActionBanner(null), 4500);
    } catch (err: any) {
      setCancelError(err.message || 'Failed to cancel booking.');
    } finally {
      setIsCancelling(false);
    }
  };

  const openPayModal = (booking: Booking) => {
    setPayModalBooking(booking);
    setPayError(null);
    const shortfall = Math.max(0, booking.total_fare - walletBalance);
    setShowPayTopUp(shortfall > 0);
    setPayTopUpAmount(shortfall > 0 ? Math.max(50, Math.ceil(shortfall / 10) * 10) : 500);
  };

  const handleConfirmPayBooking = async () => {
    if (!payModalBooking || isPaying) return;
    setIsPaying(true);
    setPayError(null);
    try {
      const res = await api.payBooking(payModalBooking.booking_id);
      setPayModalBooking(null);
      setActionBanner(res.message);
      await Promise.all([loadData(), refreshMe()]);
      setTimeout(() => setActionBanner(null), 5000);
    } catch (err: any) {
      setPayError(err.message || 'Could not process wallet payment.');
      await loadData();
    } finally {
      setIsPaying(false);
    }
  };

  const openRateModal = (booking: Booking) => {
    setRateModalBooking(booking);
    setRatingValue(5);
    setRatingHover(0);
    setRatingComment('');
    setRateError(null);
  };

  const handleSubmitRating = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rateModalBooking || isSubmittingRating) return;
    setIsSubmittingRating(true);
    setRateError(null);
    try {
      const res = await api.rateDriver(rateModalBooking.booking_id, ratingValue, ratingComment);
      setRateModalBooking(null);
      setActionBanner(res.message);
      await Promise.all([loadData(), refreshMe()]);
      setTimeout(() => setActionBanner(null), 5000);
    } catch (err: any) {
      setRateError(err.message || 'Could not submit driver rating.');
    } finally {
      setIsSubmittingRating(false);
    }
  };

  const totalBooked = bookings.length;
  const activeRequests = bookings.filter((b) => b.status === 'pending' || b.status === 'accepted');
  const completedBookings = bookings.filter((b) => b.status === 'completed');
  const unratedCompletedBookings = completedBookings.filter((b) => !b.driver_rating);
  const awaitingPaymentBookings = bookings.filter(
    (b) => b.status === 'completed' && b.payment_status !== 'paid' && b.payment_status !== 'refunded'
  );
  const totalSpent = bookings
    .filter((b) => b.payment_status === 'paid')
    .reduce((sum, b) => sum + b.total_fare, 0);
  const carbonSavedKg = passengerProfile?.carbon_saved_kg ?? 0;

  return (
    <div className="space-y-8">
      {/* Dashboard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
            Passenger Operations Console
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-0.5">
            Welcome, {user.full_name}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {passengerProfile?.corporate_domain ? `${passengerProfile.corporate_domain} · ` : ''}
            Passenger ID <span className="font-mono text-cyan-300">#{user.user_id}</span> · Rating: {user.rating.toFixed(1)} ★
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onFindRide}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs transition-all shadow-md shadow-cyan-500/20 cursor-pointer flex items-center gap-2"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Find a Ride</span>
          </button>
        </div>
      </div>

      {actionBanner && (
        <div className="p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{actionBanner}</span>
        </div>
      )}

      {actionError && (
        <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Profile & CarpoolX Wallet Strip */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 p-5 rounded-2xl bg-[#0D1628] border border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-300 font-bold text-sm shrink-0">
              {user.full_name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Passenger</span>
              <p className="font-bold text-white truncate">{user.full_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 min-w-0">
            <Mail className="w-4 h-4 text-slate-400 shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Email</span>
              <p className="text-slate-200 truncate">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 min-w-0">
            <Phone className="w-4 h-4 text-slate-400 shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Mobile</span>
              <p className="text-slate-200 font-mono truncate">{user.phone}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 min-w-0">
            <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Organization</span>
              <p className="text-slate-200 truncate">
                {passengerProfile?.corporate_domain || 'Personal Commuter'}
              </p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 p-5 rounded-2xl bg-gradient-to-br from-[#0E1E38] to-[#0D1628] border border-cyan-500/30 flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-cyan-400 uppercase tracking-wider">
              <Wallet className="w-3.5 h-3.5" />
              <span>CarpoolX Wallet</span>
            </div>
            <p className="text-2xl font-black font-mono text-white mt-0.5 tabular-nums">
              ₹{walletBalance.toFixed(2)}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Starts at ₹700 default · QR verified recharge</p>
          </div>
          <button
            type="button"
            onClick={() => setIsTopUpModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs cursor-pointer flex items-center gap-1 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Money</span>
          </button>
        </div>
      </div>

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
          onClick={() => setActiveTab('bookings')}
          className={`py-2.5 px-4 font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 border-b-2 ${
            activeTab === 'bookings'
              ? 'border-cyan-400 text-cyan-300'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          My Bookings ({bookings.length})
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`py-2.5 px-4 font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 border-b-2 ${
            activeTab === 'payments'
              ? 'border-cyan-400 text-cyan-300'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Wallet &amp; QR Recharge ({transactions.length})
        </button>
        <button
          onClick={() => setActiveTab('issues')}
          className={`py-2.5 px-4 font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 border-b-2 ${
            activeTab === 'issues'
              ? 'border-cyan-400 text-cyan-300'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Issues & Support
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="p-4 rounded-2xl bg-[#0D1628] border border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 block">Total Bookings</span>
              <p className="text-2xl font-bold font-mono text-white mt-1 tabular-nums">{totalBooked}</p>
            </div>
            <div className="p-4 rounded-2xl bg-[#0D1628] border border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 block">Pending / Accepted</span>
              <p className="text-2xl font-bold font-mono text-cyan-300 mt-1 tabular-nums">{activeRequests.length}</p>
            </div>
            <div className="p-4 rounded-2xl bg-[#0D1628] border border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 block">Completed Rides</span>
              <p className="text-2xl font-bold font-mono text-emerald-400 mt-1 tabular-nums">{completedBookings.length}</p>
            </div>
            <div className="p-4 rounded-2xl bg-[#0D1628] border border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 block">Awaiting Wallet Pay</span>
              <p className="text-2xl font-bold font-mono text-amber-300 mt-1 tabular-nums">
                {awaitingPaymentBookings.length}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-[#0D1628] border border-slate-800 col-span-2 lg:col-span-1">
              <span className="text-[11px] font-semibold text-slate-400 block">Wallet Paid Total</span>
              <p className="text-2xl font-bold font-mono text-white mt-1 tabular-nums">₹{totalSpent.toFixed(2)}</p>
            </div>
          </div>

          {/* Completed Rides Awaiting Post-Ride Wallet Payment */}
          {awaitingPaymentBookings.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-amber-300">
                  Completed Rides Awaiting Wallet Payment ({awaitingPaymentBookings.length})
                </h3>
                <span className="text-[11px] text-slate-400">
                  Pay only after ride completion using your CarpoolX Wallet
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {awaitingPaymentBookings.map((b) => (
                  <div
                    key={b.booking_id}
                    className="p-5 rounded-2xl bg-[#0E1B32] border border-amber-500/45 space-y-3"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-cyan-300 font-bold">BOOKING #{b.booking_id}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono bg-amber-950/90 text-amber-300 border border-amber-600/60">
                        COMPLETED · PAYMENT DUE
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 text-sm font-bold text-white">
                        <span>{b.pickup_point}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span>{b.dropoff_point}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Driver: <strong className="text-white">{b.driver_name}</strong> · {b.seats_booked} Seat(s)
                      </p>
                    </div>
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Final Ride Fare</span>
                        <span className="text-lg font-extrabold font-mono text-amber-300 tabular-nums">
                          ₹{b.total_fare.toFixed(2)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => openPayModal(b)}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-extrabold text-xs cursor-pointer flex items-center gap-1.5"
                      >
                        <Wallet className="w-3.5 h-3.5" />
                        <span>Pay ₹{b.total_fare.toFixed(2)} via Wallet</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed Rides Awaiting Driver Rating */}
          {unratedCompletedBookings.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-cyan-300 flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <span>Completed Rides — Rate Your Driver ({unratedCompletedBookings.length})</span>
                </h3>
                <span className="text-[11px] text-slate-400">
                  Share feedback on your driver&apos;s punctuality and ride quality
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {unratedCompletedBookings.map((b) => (
                  <div
                    key={`rate-${b.booking_id}`}
                    className="p-5 rounded-2xl bg-[#0D1A30] border border-cyan-500/35 space-y-3"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-cyan-300 font-bold">BOOKING #{b.booking_id}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono bg-emerald-950/90 text-emerald-300 border border-emerald-700/70">
                        COMPLETED
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 text-sm font-bold text-white">
                        <span>{b.pickup_point}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span>{b.dropoff_point}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Driver: <strong className="text-white">{b.driver_name}</strong> · {b.vehicle_model} ({b.registration_number})
                      </p>
                    </div>
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-3">
                      <span className="text-[11px] text-slate-400">
                        {b.completed_at
                          ? `Completed ${new Date(b.completed_at).toLocaleDateString()}`
                          : 'Trip completed'}
                      </span>
                      <button
                        type="button"
                        onClick={() => openRateModal(b)}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold text-xs cursor-pointer flex items-center gap-1.5"
                      >
                        <Star className="w-3.5 h-3.5 fill-slate-950" />
                        <span>Rate Driver</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Carbon Impact */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-[#0D1628] to-[#111D35] border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                <Leaf className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Your Verified CO₂e Contribution</h4>
                <p className="text-xs text-slate-300 mt-0.5">
                  Computed across your <strong>completed</strong> carpool rides using DEFRA/IEA 0.192 kg CO₂e/km displaced per solo trip.
                </p>
              </div>
            </div>
            <span className="font-mono text-xl font-extrabold text-emerald-400 shrink-0 tabular-nums">
              {carbonSavedKg.toFixed(1)} kg CO₂e
            </span>
          </div>

          {/* Active & Pending Rides */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Active & Pending Ride Requests</h3>
              <span className="text-[11px] text-slate-400">
                Destination editable while PENDING · Locked after driver acceptance
              </span>
            </div>

            {isLoading ? (
              <div className="p-8 rounded-2xl bg-[#0D1628] border border-slate-800 text-center text-xs text-slate-400">
                Loading your bookings...
              </div>
            ) : activeRequests.length === 0 ? (
              <div className="p-8 rounded-2xl bg-[#0D1628] border border-slate-800 text-center space-y-3">
                <Car className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400">No pending or accepted rides scheduled for {user.full_name} right now.</p>
                <button
                  onClick={onFindRide}
                  className="px-4 py-2 rounded-xl bg-[#111D35] hover:bg-[#162544] text-cyan-400 font-semibold text-xs border border-cyan-500/30 cursor-pointer"
                >
                  Browse Bengaluru Rides
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeRequests.map((b) => (
                  <div
                    key={b.booking_id}
                    className="p-5 rounded-2xl bg-[#0D1628] border border-slate-800 hover:border-slate-700 transition-colors space-y-3"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-cyan-300 font-semibold">BOOKING #{b.booking_id}</span>
                      <div className="flex items-center gap-1.5">
                        {(b.edit_count ?? 0) > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">
                            Edited ×{b.edit_count}
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${getStatusBadgeStyle(b.status)}`}>
                          {b.status === 'pending' ? 'PENDING APPROVAL' : 'ACCEPTED'}
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 text-sm font-bold text-white">
                        <span>{b.pickup_point}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span>{b.dropoff_point}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Driver: <strong className="text-white">{b.driver_name}</strong> · {b.vehicle_model} ({b.registration_number})
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                      <div>
                        <span className="text-slate-400 text-[10px] block">Seats & Post-Ride Fare (Pay After Trip)</span>
                        <span className="text-white font-bold tabular-nums">
                          {b.seats_booked} Seat(s) · ₹{b.total_fare.toFixed(2)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {b.status === 'pending' ? (
                          <button
                            type="button"
                            onClick={() => openEditBookingModal(b)}
                            className="px-3 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 text-xs font-semibold border border-cyan-500/35 flex items-center gap-1 cursor-pointer"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>Edit Destination</span>
                          </button>
                        ) : (
                          <span
                            title="Destination cannot be edited once accepted by driver"
                            className="px-2.5 py-1.5 rounded-lg bg-slate-900 text-slate-500 text-[11px] border border-slate-800 flex items-center gap-1"
                          >
                            <Lock className="w-3 h-3" />
                            <span>Edit Locked</span>
                          </span>
                        )}

                        <button
                          onClick={() => {
                            setCancelError(null);
                            setCancelModalBooking(b);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-medium border border-rose-500/30 transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: MY BOOKINGS TABLE */}
      {activeTab === 'bookings' && (
        <div className="rounded-2xl border border-slate-800 bg-[#0D1628] overflow-hidden">
          {bookings.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">No bookings recorded yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#111D35] text-slate-300 font-mono border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Booking ID</th>
                    <th className="px-4 py-3">Pickup → Dropoff</th>
                    <th className="px-4 py-3">Driver & Vehicle</th>
                    <th className="px-4 py-3">Seats</th>
                    <th className="px-4 py-3">Post-Ride Fare</th>
                    <th className="px-4 py-3">Booking Status</th>
                    <th className="px-4 py-3">Payment Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {bookings.map((b) => (
                    <tr key={b.booking_id} className="hover:bg-[#162544]/60 transition-colors">
                      <td className="px-4 py-3 font-mono">
                        <span className="font-bold text-cyan-300 block">#{b.booking_id}</span>
                        {(b.edit_count ?? 0) > 0 && (
                          <span className="text-[10px] text-slate-400">Edited ×{b.edit_count}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-white">
                          {b.pickup_point} → {b.dropoff_point}
                        </p>
                        <p className="text-[11px] text-slate-400 font-mono">
                          {b.estimated_distance_km ? `${b.estimated_distance_km.toFixed(1)} km · ` : ''}
                          Ride #{b.ride_id}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-white">{b.driver_name}</p>
                        <p className="text-[11px] text-slate-400">{b.vehicle_model}</p>
                      </td>
                      <td className="px-4 py-3 font-mono tabular-nums">{b.seats_booked}</td>
                      <td className="px-4 py-3 font-mono font-bold text-white tabular-nums">₹{b.total_fare.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${getStatusBadgeStyle(b.status)}`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[10px] uppercase">
                        {b.payment_status === 'paid' ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                            WALLET PAID
                          </span>
                        ) : b.payment_status === 'refunded' ? (
                          <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold">
                            REFUNDED
                          </span>
                        ) : b.status === 'completed' ? (
                          <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700 font-bold">
                            PAYMENT DUE
                          </span>
                        ) : b.status === 'cancelled' || b.status === 'rejected' ? (
                          <span className="text-slate-500">NO CHARGE</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-slate-900 text-cyan-300 border border-slate-700">
                            PAY AFTER RIDE
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap space-x-2">
                        {b.status === 'pending' && (
                          <button
                            type="button"
                            onClick={() => openEditBookingModal(b)}
                            className="px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/35 text-[11px] font-semibold cursor-pointer"
                          >
                            Edit Ride
                          </button>
                        )}
                        {b.status === 'accepted' && (
                          <span
                            title="Edits disabled once driver confirms ride"
                            className="px-2 py-1 rounded bg-slate-900 text-slate-500 text-[10px] font-mono border border-slate-800 inline-flex items-center gap-1"
                          >
                            <Lock className="w-3 h-3" /> Locked
                          </span>
                        )}
                        {(b.status === 'pending' || b.status === 'accepted') && (
                          <button
                            onClick={() => {
                              setCancelError(null);
                              setCancelModalBooking(b);
                            }}
                            className="text-rose-400 hover:text-rose-300 text-xs font-semibold cursor-pointer"
                          >
                            Cancel
                          </button>
                        )}
                        {b.status === 'completed' && b.payment_status !== 'paid' && b.payment_status !== 'refunded' && (
                          <button
                            type="button"
                            onClick={() => openPayModal(b)}
                            className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[11px] font-bold cursor-pointer inline-flex items-center gap-1"
                          >
                            <Wallet className="w-3 h-3" />
                            <span>Pay via Wallet</span>
                          </button>
                        )}
                        {b.status === 'completed' && !b.driver_rating && (
                          <button
                            type="button"
                            onClick={() => openRateModal(b)}
                            className="px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-bold cursor-pointer inline-flex items-center gap-1"
                          >
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            <span>Rate Driver</span>
                          </button>
                        )}
                        {b.status === 'completed' && b.driver_rating && (
                          <span
                            title={b.driver_review || `You rated ${b.driver_name} ${b.driver_rating}★`}
                            className="px-2.5 py-1 rounded-lg bg-amber-950/60 text-amber-300 border border-amber-700/60 text-[11px] font-mono font-bold inline-flex items-center gap-1"
                          >
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            <span>{b.driver_rating}/5 Rated</span>
                          </span>
                        )}
                        {(b.status === 'cancelled' || b.status === 'rejected') && (
                          <span className="text-slate-500 text-[11px]">Closed</span>
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

      {/* TAB 3: WALLET QR RECHARGE, LEDGER & FULL TRANSACTION HISTORY */}
      {activeTab === 'payments' && (
        <div className="space-y-6">
          <WalletQrRechargePanel
            currentBalance={walletBalance}
            showHistory={true}
            closeLabel="Close Wallet Tab"
            onClose={() => setActiveTab('overview')}
            onVerifiedSuccess={async () => {
              await Promise.all([refreshMe(), loadData()]);
              setActionBanner('Wallet recharge verified and credited to your CarpoolX Wallet!');
              setTimeout(() => setActionBanner(null), 4500);
            }}
          />

          <div className="rounded-2xl border border-slate-800 bg-[#0D1628] overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Complete Transaction History (Payments, Adjustments, Refunds, Verified Top-Ups &amp; Failed Attempts)
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Includes TXN ID, Booking ID, Passenger ID, Previous &amp; New Wallet Balance, Status, and Failure/Refund Reason.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsTopUpModalOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Money</span>
              </button>
            </div>
            {transactions.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">No wallet transactions recorded yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left font-mono">
                  <thead className="bg-[#111D35] text-slate-300 border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Transaction ID</th>
                      <th className="px-4 py-3">Booking / Passenger</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Prev Bal</th>
                      <th className="px-4 py-3">New Bal</th>
                      <th className="px-4 py-3">Reason / Route</th>
                      <th className="px-4 py-3">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {transactions.map((t) => (
                      <tr key={t.transaction_id} className="hover:bg-[#162544]/60 transition-colors">
                        <td className="px-4 py-3 text-cyan-300 font-bold whitespace-nowrap">{t.transaction_id}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span>{t.booking_id ? `BK #${t.booking_id}` : 'Wallet'}</span>
                          <span className="text-[10px] text-slate-500 block">UID #{t.passenger_id}</span>
                        </td>
                        <td className="px-4 py-3 uppercase text-[10px] whitespace-nowrap">
                          {t.transaction_type.replace(/_/g, ' ')}
                        </td>
                        <td className="px-4 py-3 font-bold text-white tabular-nums whitespace-nowrap">
                          ₹{t.amount.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              t.payment_status === 'success'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : t.payment_status === 'refunded'
                                ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                                : t.payment_status === 'failed'
                                ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                : 'bg-amber-950 text-amber-300 border border-amber-800'
                            }`}
                          >
                            {t.payment_status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-400 tabular-nums whitespace-nowrap">
                          {t.passenger_balance_before !== undefined ? `₹${t.passenger_balance_before.toFixed(2)}` : '—'}
                        </td>
                        <td className="px-4 py-3 text-white font-bold tabular-nums whitespace-nowrap">
                          {t.passenger_balance_after !== undefined ? `₹${t.passenger_balance_after.toFixed(2)}` : '—'}
                        </td>
                        <td className="px-4 py-3 font-sans text-[11px] max-w-[240px]">
                          {t.failure_reason ? (
                            <span className={t.payment_status === 'failed' ? 'text-rose-300' : 'text-cyan-200'}>
                              {t.failure_reason}
                            </span>
                          ) : (
                            <span className="text-slate-400">{t.route_summary || '—'}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-[11px] whitespace-nowrap">
                          {new Date(t.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Wallet Ledger Table */}
          <div className="rounded-2xl border border-slate-800 bg-[#0D1628] overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Wallet Ledger (Debits & Credits)</h3>
              <span className="text-xs font-mono text-cyan-300 font-bold">Available: ₹{walletBalance.toFixed(2)}</span>
            </div>
            {walletLedger.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">No wallet ledger entries yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left font-mono">
                  <thead className="bg-[#111D35] text-slate-300 border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3">TXN Ref</th>
                      <th className="px-4 py-3">Entry</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Prev Balance</th>
                      <th className="px-4 py-3">New Balance</th>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {walletLedger.map((entry) => (
                      <tr key={entry.ledger_id} className="hover:bg-[#162544]/60 transition-colors">
                        <td className="px-4 py-3 text-cyan-300 font-bold">{entry.transaction_id}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              entry.entry_type === 'CREDIT'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : 'bg-rose-950 text-rose-300 border border-rose-800'
                            }`}
                          >
                            {entry.entry_type}
                          </span>
                        </td>
                        <td className={`px-4 py-3 font-bold tabular-nums ${entry.entry_type === 'CREDIT' ? 'text-emerald-400' : 'text-rose-300'}`}>
                          {entry.entry_type === 'CREDIT' ? '+' : '-'}₹{entry.amount.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-slate-400 tabular-nums">₹{entry.balance_before.toFixed(2)}</td>
                        <td className="px-4 py-3 text-white font-bold tabular-nums">₹{entry.balance_after.toFixed(2)}</td>
                        <td className="px-4 py-3 font-sans text-slate-300">{entry.description}</td>
                        <td className="px-4 py-3 text-slate-400 text-[11px] whitespace-nowrap">
                          {new Date(entry.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: ISSUES & SUPPORT */}
      {activeTab === 'issues' && <IssueSupportPanel role="passenger" bookings={bookings} />}

      {/* Add Money to CarpoolX Wallet QR Modal (Server-Verified Payment Flow) */}
      {isTopUpModalOpen && (
        <div
          onClick={() => setIsTopUpModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#080E1C] border border-cyan-500/40 rounded-2xl max-w-2xl w-full p-5 shadow-2xl relative space-y-3 text-slate-200 my-6"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div>
                <span className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider">
                  CarpoolX Wallet · QR Recharge
                </span>
                <h3 className="text-lg font-bold text-white">Add Money via QR Payment</h3>
              </div>
              <button
                type="button"
                aria-label="Close wallet recharge modal"
                onClick={() => setIsTopUpModalOpen(false)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#111D35] border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold cursor-pointer"
              >
                <X className="w-4 h-4" />
                <span>Close</span>
              </button>
            </div>

            <WalletQrRechargePanel
              currentBalance={walletBalance}
              showHistory={false}
              closeLabel="Done & Close"
              onClose={() => setIsTopUpModalOpen(false)}
              onVerifiedSuccess={async () => {
                await Promise.all([refreshMe(), loadData()]);
                setActionBanner('Wallet recharge verified and credited to your CarpoolX Wallet!');
                setTimeout(() => setActionBanner(null), 4500);
              }}
            />

            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setIsTopUpModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#111D35] hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs cursor-pointer"
              >
                Close Payment Window
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Pending Ride Destination Modal (Pickup Locked, Same Booking ID, Fare Delta) */}
      {editModalBooking && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0D1628] border border-cyan-500/40 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative space-y-4 text-slate-200 my-6">
            <button
              type="button"
              onClick={() => setEditModalBooking(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider">
                Edit Pending Request · Booking #{editModalBooking.booking_id}
              </span>
              <h3 className="text-lg font-bold text-white mt-0.5">Update Dropoff Destination</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Pickup point remains locked. Updating destination recalculates distance & post-ride fare in place on Booking #{editModalBooking.booking_id} (₹0.00 deducted until ride completion).
              </p>
            </div>

            {editError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            {/* Locked Pickup */}
            <div className="p-3 rounded-xl bg-[#111D35] border border-slate-800 text-xs">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1">
                  <Lock className="w-3 h-3 text-amber-400" />
                  Locked Pickup Point
                </span>
                <span className="font-mono text-[10px]">{editModalBooking.seats_booked} Seat(s)</span>
              </div>
              <p className="text-white font-semibold">{editModalBooking.pickup_point}</p>
            </div>

            {/* Editable Destination */}
            <div className="space-y-2">
              <LocationSearchInput
                label="New Dropoff Destination"
                value={editDropoffPoint}
                onChange={(val) => {
                  setEditDropoffPoint(val);
                  setEditPreview(null);
                }}
                placeholder="Select new dropoff stop or hub..."
              />
              <button
                type="button"
                disabled={isPreviewingEdit || !editDropoffPoint.trim()}
                onClick={() => handlePreviewEdit()}
                className="px-3.5 py-1.5 rounded-lg bg-[#111D35] hover:bg-[#162544] border border-cyan-500/40 text-cyan-300 text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                {isPreviewingEdit ? 'Recalculating Distance & Fare...' : 'Preview Updated Distance & Fare'}
              </button>
            </div>

            {/* Recalculated Fare Preview */}
            {editPreview && (
              <div className="p-4 rounded-xl bg-[#081223] border border-cyan-500/35 space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Estimated Distance:</span>
                  <span className="text-white">
                    {editPreview.previousDistanceKm} km → <strong className="text-cyan-300">{editPreview.newDistanceKm} km</strong>
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Post-Ride Fare Update:</span>
                  <span className="text-white">
                    ₹{editPreview.previousFare.toFixed(2)} → <strong className="text-cyan-300">₹{editPreview.newFare.toFixed(2)}</strong>
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">
                    {editPreview.paymentStatus === 'paid' ? 'Wallet Adjustment:' : 'Post-Ride Fare Difference:'}
                  </span>
                  <span
                    className={
                      editPreview.fareDifference > 0
                        ? 'text-amber-300 font-bold'
                        : editPreview.fareDifference < 0
                        ? 'text-emerald-400 font-bold'
                        : 'text-slate-300'
                    }
                  >
                    {editPreview.fareDifference > 0
                      ? `+₹${editPreview.fareDifference.toFixed(2)}`
                      : editPreview.fareDifference < 0
                      ? `-₹${Math.abs(editPreview.fareDifference).toFixed(2)}`
                      : '₹0.00 (No difference)'}
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-800 pt-2">
                  <span className="text-slate-300">
                    {editPreview.paymentStatus === 'paid' ? 'Projected Wallet Balance:' : 'Deducted Now:'}
                  </span>
                  <span className={editPreview.paymentStatus !== 'paid' || editPreview.canAfford ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                    {editPreview.paymentStatus === 'paid'
                      ? `₹${editPreview.projectedWalletBalance.toFixed(2)}`
                      : '₹0.00 (Pay after ride completion)'}
                  </span>
                </div>
              </div>
            )}

            {/* Existing Edit History */}
            {editModalBooking.edit_history && editModalBooking.edit_history.length > 0 && (
              <div className="p-3 rounded-xl bg-[#080E1C] border border-slate-800 text-[11px] font-mono space-y-1">
                <span className="text-slate-400 uppercase flex items-center gap-1 text-[10px]">
                  <History className="w-3 h-3" /> Previous Destination Edits
                </span>
                {editModalBooking.edit_history.map((h) => (
                  <p key={h.edit_id} className="text-slate-300">
                    {h.previous_destination} → {h.new_destination} (₹{h.previous_fare} → ₹{h.new_fare})
                  </p>
                ))}
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditModalBooking(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  isSavingEdit ||
                  !editDropoffPoint.trim() ||
                  editDropoffPoint.trim().toLowerCase() === editModalBooking.dropoff_point.toLowerCase() ||
                  (editPreview?.paymentStatus === 'paid' && !editPreview.canAfford)
                }
                onClick={handleSaveEdit}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold text-xs cursor-pointer disabled:opacity-40"
              >
                {isSavingEdit ? 'Saving Changes...' : 'Save Destination Update'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Confirmation Modal */}
      {cancelModalBooking && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0D1628] border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div>
              <span className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider">
                {cancelModalBooking.payment_status === 'paid'
                  ? 'Independent Booking Cancellation, Seat Restoration & Refund'
                  : 'Independent Booking Cancellation & Seat Restoration'}
              </span>
              <h3 className="text-lg font-bold text-white mt-1">
                Cancel Booking #{cancelModalBooking.booking_id}?
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {cancelModalBooking.payment_status === 'paid' ? (
                  <>
                    Cancelling restores <strong>{cancelModalBooking.seats_booked} seat(s)</strong> back to {cancelModalBooking.driver_name}&apos;s ride and refunds{' '}
                    <strong className="text-emerald-300">₹{cancelModalBooking.total_fare.toFixed(2)}</strong> to your CarpoolX Wallet.
                  </>
                ) : (
                  <>
                    Cancelling restores <strong>{cancelModalBooking.seats_booked} seat(s)</strong> back to {cancelModalBooking.driver_name}&apos;s ride cleanly. Because payment occurs only after ride completion, no wallet deduction was made and no refund is needed.
                  </>
                )}
              </p>
            </div>

            {cancelError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{cancelError}</span>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Reason for Cancellation
              </label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full bg-[#111D35] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-400"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                onClick={() => setCancelModalBooking(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Keep Booking
              </button>
              <button
                onClick={handleCancelBooking}
                disabled={isCancelling}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isCancelling ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post-Completion CarpoolX Wallet Payment Modal */}
      {payModalBooking && (() => {
        const fare = Number(payModalBooking.total_fare);
        const hasFunds = walletBalance >= fare;
        const shortfall = Math.max(0, Number((fare - walletBalance).toFixed(2)));
        const remainingAfter = Number((walletBalance - fare).toFixed(2));
        return (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-[#0D1628] border border-emerald-500/40 rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-4 text-slate-200 my-6">
              <button
                type="button"
                onClick={() => setPayModalBooking(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div>
                <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
                  Completed Ride Settlement · CarpoolX Wallet
                </span>
                <h3 className="text-lg font-bold text-white mt-0.5">
                  Pay Booking #{payModalBooking.booking_id}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {payModalBooking.pickup_point} → {payModalBooking.dropoff_point} with{' '}
                  <strong className="text-white">{payModalBooking.driver_name}</strong>
                </p>
              </div>

              {payError && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{payError}</span>
                </div>
              )}

              <div className="p-4 rounded-xl bg-[#081223] border border-cyan-500/35 space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 font-sans">
                  <span className="flex items-center gap-1.5 font-semibold text-white">
                    <Wallet className="w-4 h-4 text-cyan-400" />
                    <span>CarpoolX Wallet Settlement</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPayTopUp((v) => !v)}
                    className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 cursor-pointer"
                  >
                    {showPayTopUp ? 'Hide Top-Up' : '+ Add Money'}
                  </button>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Ride Fare:</span>
                  <span className="text-white font-bold tabular-nums">₹{fare.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Available Wallet Balance:</span>
                  <span className={`font-bold tabular-nums ${hasFunds ? 'text-emerald-400' : 'text-rose-400'}`}>
                    ₹{walletBalance.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Amount to be Deducted:</span>
                  <span className="text-amber-300 font-bold tabular-nums">-₹{fare.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-800 pt-1.5">
                  <span className="text-slate-300 font-semibold">Remaining Balance After Payment:</span>
                  <span className={`font-bold tabular-nums ${hasFunds ? 'text-cyan-300' : 'text-rose-400'}`}>
                    {hasFunds ? `₹${remainingAfter.toFixed(2)}` : `Shortfall ₹${shortfall.toFixed(2)}`}
                  </span>
                </div>
              </div>

              {!hasFunds && (
                <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/30 text-[11px] text-rose-200">
                  Insufficient CarpoolX Wallet balance. Add at least <strong>₹{shortfall.toFixed(2)}</strong> below to complete this payment.
                </div>
              )}

              {showPayTopUp && (
                <WalletQrRechargePanel
                  compact={true}
                  showHistory={false}
                  currentBalance={walletBalance}
                  initialAmount={payTopUpAmount}
                  onClose={() => setShowPayTopUp(false)}
                  onVerifiedSuccess={async () => {
                    await Promise.all([refreshMe(), loadData()]);
                    setShowPayTopUp(false);
                    setActionBanner('Wallet recharged via verified QR payment!');
                    setTimeout(() => setActionBanner(null), 4000);
                  }}
                />
              )}

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setPayModalBooking(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  disabled={isPaying || !hasFunds}
                  onClick={handleConfirmPayBooking}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-extrabold text-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isPaying
                    ? 'Processing Payment...'
                    : !hasFunds
                    ? 'Insufficient Wallet Balance'
                    : `Confirm & Pay ₹${fare.toFixed(2)}`}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Post-Completion Driver Rating Modal */}
      {rateModalBooking && (() => {
        const displayRating = ratingHover || ratingValue;
        const ratingLabels: Record<number, string> = {
          1: 'Poor — Major issues during the ride',
          2: 'Fair — Below expectations',
          3: 'Good — Smooth & satisfactory trip',
          4: 'Very Good — Punctual & comfortable',
          5: 'Excellent — Outstanding carpool experience!',
        };
        const quickCompliments = [
          'Punctual pickup',
          'Smooth & safe drive',
          'Clean & comfortable car',
          'Polite & friendly',
        ];
        return (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-[#0D1628] border border-amber-500/40 rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-5 text-slate-200 my-6">
              <button
                type="button"
                onClick={() => setRateModalBooking(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div>
                <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">
                  Completed Ride Feedback · Booking #{rateModalBooking.booking_id}
                </span>
                <h3 className="text-lg font-bold text-white mt-0.5">
                  Rate {rateModalBooking.driver_name}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {rateModalBooking.pickup_point} → {rateModalBooking.dropoff_point} ·{' '}
                  <span className="text-slate-300">{rateModalBooking.vehicle_model}</span>
                </p>
              </div>

              {rateError && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{rateError}</span>
                </div>
              )}

              <form onSubmit={handleSubmitRating} className="space-y-4">
                <div className="p-4 rounded-xl bg-[#081223] border border-slate-800 text-center space-y-2.5">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Select Star Rating
                  </span>
                  <div className="flex items-center justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const active = star <= displayRating;
                      return (
                        <button
                          key={star}
                          type="button"
                          onMouseEnter={() => setRatingHover(star)}
                          onMouseLeave={() => setRatingHover(0)}
                          onClick={() => setRatingValue(star)}
                          aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                          className="p-1.5 rounded-xl hover:bg-slate-800/70 transition-transform hover:scale-110 cursor-pointer"
                        >
                          <Star
                            className={`w-8 h-8 transition-colors ${
                              active
                                ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.35)]'
                                : 'text-slate-600'
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs font-semibold text-amber-300">
                    {ratingValue}/5 · {ratingLabels[displayRating]}
                  </p>
                </div>

                <div>
                  <span className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                    Quick Highlights (Optional)
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {quickCompliments.map((tag) => {
                      const isIncluded = ratingComment.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => {
                            if (isIncluded) return;
                            setRatingComment((prev) => (prev.trim() ? `${prev.trim()}, ${tag}` : tag));
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[11px] border cursor-pointer transition-colors ${
                            isIncluded
                              ? 'bg-amber-500/20 border-amber-400/60 text-amber-200'
                              : 'bg-[#111D35] border-slate-700 text-slate-300 hover:border-amber-400/50 hover:text-white'
                          }`}
                        >
                          + {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                    Review Comment (Optional)
                  </label>
                  <textarea
                    rows={3}
                    maxLength={500}
                    value={ratingComment}
                    onChange={(e) => setRatingComment(e.target.value)}
                    placeholder={`Share your ride experience with ${rateModalBooking.driver_name}...`}
                    className="w-full bg-[#111D35] border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 resize-none"
                  />
                </div>

                <div className="pt-1 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setRateModalBooking(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingRating}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold text-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Star className="w-3.5 h-3.5 fill-slate-950" />
                    <span>{isSubmittingRating ? 'Submitting...' : `Submit ${ratingValue}★ Rating`}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
