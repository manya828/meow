import React, { useState, useEffect, useCallback } from 'react';
import QRCode from 'qrcode';
import {
  QrCode,
  Wallet,
  CheckCircle,
  AlertCircle,
  Clock,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  XCircle,
  ScanLine,
  X,
  ExternalLink,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import { WalletPaymentConfig, WalletRechargeOrder } from '../../types';

interface WalletQrRechargePanelProps {
  currentBalance: number;
  onVerifiedSuccess?: () => Promise<void> | void;
  onClose?: () => void;
  closeLabel?: string;
  initialAmount?: number;
  compact?: boolean;
  showHistory?: boolean;
}

const getOrderStatusBadge = (status: WalletRechargeOrder['status']) => {
  switch (status) {
    case 'SUCCESS':
      return 'bg-emerald-950/90 text-emerald-300 border border-emerald-600/60';
    case 'SCANNED':
      return 'bg-cyan-950/90 text-cyan-300 border border-cyan-600/60';
    case 'FAILED':
      return 'bg-rose-950/90 text-rose-300 border border-rose-600/60';
    case 'EXPIRED':
      return 'bg-slate-800 text-slate-400 border border-slate-700';
    default:
      return 'bg-amber-950/90 text-amber-300 border border-amber-600/60';
  }
};

export const WalletQrRechargePanel: React.FC<WalletQrRechargePanelProps> = ({
  currentBalance,
  onVerifiedSuccess,
  onClose,
  closeLabel = 'Close',
  initialAmount = 500,
  compact = false,
  showHistory = false,
}) => {
  const [amount, setAmount] = useState<number>(initialAmount);
  const [config, setConfig] = useState<WalletPaymentConfig | null>(null);
  const [activeOrder, setActiveOrder] = useState<WalletRechargeOrder | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [history, setHistory] = useState<WalletRechargeOrder[]>([]);
  const [isInitiating, setIsInitiating] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isVerifyingDemo, setIsVerifyingDemo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(0);

  const loadConfigAndHistory = useCallback(async () => {
    try {
      const [cfgRes, histRes] = await Promise.all([
        api.getWalletConfig(),
        showHistory ? api.getWalletRecharges() : Promise.resolve({ orders: [] }),
      ]);
      setConfig(cfgRes.config);
      if (showHistory) {
        setHistory(histRes.orders || []);
      }
    } catch (err: any) {
      setError(err.message || 'Unable to load wallet payment configuration.');
    }
  }, [showHistory]);

  useEffect(() => {
    loadConfigAndHistory();
  }, [loadConfigAndHistory]);

  useEffect(() => {
    if (initialAmount && initialAmount >= 10) {
      setAmount(initialAmount);
    }
  }, [initialAmount]);

  // Render QR image whenever activeOrder updates
  useEffect(() => {
    let cancelled = false;
    const renderQr = async () => {
      if (!activeOrder?.qr_payload) {
        setQrDataUrl('');
        return;
      }
      if (
        activeOrder.qr_payload.startsWith('data:image/') ||
        (activeOrder.mode === 'razorpay' && /^https?:\/\//i.test(activeOrder.qr_payload))
      ) {
        setQrDataUrl(activeOrder.qr_payload);
        return;
      }
      try {
        const url = await QRCode.toDataURL(activeOrder.qr_payload, {
          width: 240,
          margin: 2,
          color: {
            dark: '#0f172a',
            light: '#ffffff',
          },
        });
        if (!cancelled) {
          setQrDataUrl(url);
        }
      } catch {
        if (!cancelled) {
          setQrDataUrl('');
          setError('Could not render QR code image.');
        }
      }
    };
    renderQr();
    return () => {
      cancelled = true;
    };
  }, [activeOrder?.order_id, activeOrder?.mode, activeOrder?.qr_payload]);

  // Countdown timer for active QR expiry
  useEffect(() => {
    if (!activeOrder || (activeOrder.status !== 'PENDING' && activeOrder.status !== 'SCANNED')) {
      setSecondsLeft(0);
      return;
    }
    const updateTimer = () => {
      const diff = Math.max(
        0,
        Math.floor((new Date(activeOrder.expires_at).getTime() - Date.now()) / 1000)
      );
      setSecondsLeft(diff);
    };
    updateTimer();
    const t = setInterval(updateTimer, 1000);
    return () => clearInterval(t);
  }, [activeOrder?.order_id, activeOrder?.status, activeOrder?.expires_at]);

  const pollStatus = useCallback(
    async (orderId: string) => {
      try {
        const res = await api.getRechargeStatus(orderId);
        setActiveOrder((prev) =>
          prev && prev.order_id === res.order.order_id
            ? { ...res.order, demo_auth_token: prev.demo_auth_token ?? res.order.demo_auth_token }
            : res.order
        );
        if (res.order.status === 'SUCCESS' && res.order.credited) {
          setStatusNotice(res.message);
          if (showHistory) {
            const hist = await api.getWalletRecharges();
            setHistory(hist.orders || []);
          }
          if (onVerifiedSuccess) {
            await onVerifiedSuccess();
          }
        } else if (res.order.status === 'FAILED' || res.order.status === 'EXPIRED') {
          setStatusNotice(res.message);
          if (showHistory) {
            const hist = await api.getWalletRecharges();
            setHistory(hist.orders || []);
          }
        }
      } catch {
        // Silent background poll failure
      }
    },
    [onVerifiedSuccess, showHistory]
  );

  // Poll backend payment status while order awaits payment verification
  useEffect(() => {
    if (!activeOrder || (activeOrder.status !== 'PENDING' && activeOrder.status !== 'SCANNED')) {
      return;
    }
    const interval = setInterval(() => {
      pollStatus(activeOrder.order_id);
    }, 1500);
    return () => clearInterval(interval);
  }, [activeOrder?.order_id, activeOrder?.status, pollStatus]);

  const handleAddMoney = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setStatusNotice(null);
    const numAmount = Number(amount);
    if (!Number.isFinite(numAmount) || numAmount < 10 || numAmount > 25000) {
      setError('Enter a valid recharge amount between ₹10 and ₹25,000.');
      return;
    }

    setIsInitiating(true);
    try {
      const res = await api.initiateWalletRecharge(numAmount);
      setConfig(res.config);
      setActiveOrder(res.order);
      setStatusNotice(res.message);
      if (showHistory) {
        const hist = await api.getWalletRecharges();
        setHistory(hist.orders || []);
      }
    } catch (err: any) {
      setError(err.message || 'Could not generate recharge QR code.');
    } finally {
      setIsInitiating(false);
    }
  };

  const handleMarkScanned = async () => {
    if (!activeOrder) return;
    setIsChecking(true);
    setError(null);
    try {
      const res = await api.markRechargeScanned(activeOrder.order_id);
      setActiveOrder((prev) =>
        prev
          ? { ...res.order, demo_auth_token: prev.demo_auth_token ?? res.order.demo_auth_token }
          : res.order
      );
      setStatusNotice(res.message);
      if (showHistory) {
        const hist = await api.getWalletRecharges();
        setHistory(hist.orders || []);
      }
    } catch (err: any) {
      setError(err.message || 'Could not update QR scan state.');
    } finally {
      setIsChecking(false);
    }
  };

  const handleVerifyGatewayPayment = async () => {
    if (!activeOrder) return;
    setIsChecking(true);
    setError(null);
    try {
      const res = await api.verifyWalletRecharge(activeOrder.order_id);
      setActiveOrder((prev) =>
        prev
          ? { ...res.order, demo_auth_token: prev.demo_auth_token ?? res.order.demo_auth_token }
          : res.order
      );
      setStatusNotice(res.message);
      if (res.verified && res.order.credited) {
        if (showHistory) {
          const hist = await api.getWalletRecharges();
          setHistory(hist.orders || []);
        }
        if (onVerifiedSuccess) {
          await onVerifiedSuccess();
        }
      }
    } catch (err: any) {
      setError(err.message || 'Payment verification failed.');
    } finally {
      setIsChecking(false);
    }
  };

  const handleDemoDecision = async (outcome: 'success' | 'fail') => {
    if (!activeOrder || !activeOrder.demo_auth_token) return;
    setIsVerifyingDemo(true);
    setError(null);
    try {
      const res = await api.completeDemoRecharge(
        activeOrder.order_id,
        activeOrder.demo_auth_token,
        outcome
      );
      setActiveOrder(res.order);
      setStatusNotice(res.message);
      if (showHistory) {
        const hist = await api.getWalletRecharges();
        setHistory(hist.orders || []);
      }
      if (outcome === 'success' && res.order?.credited && onVerifiedSuccess) {
        await onVerifiedSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Demo payment verification failed.');
    } finally {
      setIsVerifyingDemo(false);
    }
  };

  const mode = activeOrder?.mode || config?.mode || 'demo';
  const isDemoMode = mode === 'demo';
  const formattedTimer = `${String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:${String(
    secondsLeft % 60
  ).padStart(2, '0')}`;

  return (
    <div className={compact ? 'space-y-4' : 'space-y-6'}>
      {/* Wallet Recharge Card */}
      <div
        className={`rounded-2xl border ${
          isDemoMode ? 'border-amber-500/35' : 'border-cyan-500/35'
        } bg-[#0D1628] ${compact ? 'p-4' : 'p-6'} space-y-5`}
      >
        {/* Header Row */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-300 uppercase tracking-wider">
                <Wallet className="w-4 h-4 text-cyan-400" />
                <span>CarpoolX Passenger Wallet Recharge</span>
              </span>
              {isDemoMode ? (
                <span className="px-2 py-0.5 rounded bg-amber-950/90 text-amber-300 border border-amber-500/50 text-[10px] font-bold uppercase tracking-wider">
                  DEMO PAYMENT MODE
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded bg-emerald-950/90 text-emerald-300 border border-emerald-500/50 text-[10px] font-bold uppercase tracking-wider">
                  LIVE GATEWAY ({mode.toUpperCase()})
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {isDemoMode
                ? 'College Project Demonstration Mode (no real gateway credentials configured). Wallet updates strictly after backend HMAC verification.'
                : `Configured merchant: ${config?.merchantName || 'Merchant'} (${config?.gatewayProvider || 'UPI Gateway'}). Wallet credits only after server-side gateway/webhook verification.`}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="text-left sm:text-right bg-[#080E1C] border border-slate-800 rounded-xl px-4 py-2.5">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
                Current Wallet Balance
              </span>
              <p className="text-xl font-black font-mono text-emerald-400 tabular-nums">
                ₹{Number(currentBalance || 0).toFixed(2)}
              </p>
            </div>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 rounded-xl bg-[#111D35] hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white text-xs font-bold cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                <X className="w-3.5 h-3.5" />
                <span>{closeLabel}</span>
              </button>
            )}
          </div>
        </div>

        {/* Default ₹700 Welcome Balance Notice */}
        {!compact && (
          <div className="p-3 rounded-xl bg-cyan-950/35 border border-cyan-500/25 text-xs text-cyan-200 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              New passenger accounts start with <strong>₹700.00</strong> in their CarpoolX Wallet by default. Generating or scanning a QR code never adds funds until backend payment verification succeeds.
            </span>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {statusNotice && !error && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
              activeOrder?.status === 'SUCCESS'
                ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
                : activeOrder?.status === 'FAILED' || activeOrder?.status === 'EXPIRED'
                ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                : 'bg-[#111D35] border-cyan-500/35 text-cyan-200'
            }`}
          >
            {activeOrder?.status === 'SUCCESS' ? (
              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
            ) : activeOrder?.status === 'FAILED' || activeOrder?.status === 'EXPIRED' ? (
              <XCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            ) : (
              <Clock className="w-4 h-4 shrink-0 mt-0.5 text-cyan-400" />
            )}
            <span>{statusNotice}</span>
          </div>
        )}

        {/* Amount Input + "Add Money" Form */}
        <form onSubmit={handleAddMoney} className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
              Enter Recharge Amount (₹10 – ₹25,000)
            </label>
            <div className="flex items-center gap-1.5">
              {[100, 250, 500, 1000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(preset)}
                  className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold border cursor-pointer transition-colors ${
                    Number(amount) === preset
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                      : 'bg-[#111D35] border-slate-700 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  +₹{preset}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400">
                ₹
              </span>
              <input
                type="number"
                min={10}
                max={25000}
                step="1"
                required
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                placeholder="Enter amount in INR"
                className="w-full bg-[#111D35] border border-slate-700 rounded-xl pl-8 pr-4 py-2.5 text-sm font-mono font-bold text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <button
              type="submit"
              disabled={isInitiating}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold text-xs cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shrink-0 shadow-md shadow-cyan-500/20"
            >
              <QrCode className="w-4 h-4" />
              <span>{isInitiating ? 'Generating QR...' : 'Add Money'}</span>
            </button>
          </div>
        </form>

        {/* Generated QR Code & Verification Status Box */}
        {activeOrder && (
          <div className="p-5 rounded-2xl bg-[#080E1C] border border-slate-700/80 grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
            {/* Left: Crisp QR Image */}
            <div className="md:col-span-5 flex flex-col items-center justify-center space-y-2">
              <div className="p-3 rounded-2xl bg-white shadow-xl border-2 border-cyan-400/50">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={`UPI QR code for ₹${activeOrder.amount.toFixed(2)}`}
                    className={`${compact ? 'w-40 h-40' : 'w-48 h-48'} object-contain`}
                  />
                ) : (
                  <div className="w-44 h-44 flex items-center justify-center text-slate-800 text-xs font-mono">
                    Generating QR...
                  </div>
                )}
              </div>
              <span className="text-[11px] font-mono text-slate-300 text-center">
                {isDemoMode
                  ? `Scan with Phone Camera · Opens ₹${activeOrder.amount.toFixed(2)} Web Checkout`
                  : `Scan with Google Pay, PhonePe, Paytm or BHIM · ₹${activeOrder.amount.toFixed(2)}`}
              </span>
            </div>

            {/* Right: Order Metadata, Status & Verification Controls */}
            <div className="md:col-span-7 space-y-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
                    Payment Request Amount
                  </span>
                  <p className="text-2xl font-black font-mono text-cyan-300 tabular-nums">
                    ₹{activeOrder.amount.toFixed(2)}
                  </p>
                </div>

                <span
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold font-mono uppercase ${getOrderStatusBadge(
                    activeOrder.status
                  )}`}
                >
                  STATUS: {activeOrder.status}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#0D1628] border border-slate-800 space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between gap-2">
                  <span className="text-slate-400">Order ID:</span>
                  <span className="text-white font-bold">{activeOrder.order_id}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-400">Merchant Txn Ref:</span>
                  <span className="text-cyan-300">{activeOrder.merchant_txn_ref}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-400">Wallet Credited:</span>
                  <span
                    className={`font-bold ${
                      activeOrder.credited ? 'text-emerald-400' : 'text-amber-300'
                    }`}
                  >
                    {activeOrder.credited ? 'YES (Verified)' : 'NO (Awaiting Backend Verification)'}
                  </span>
                </div>
                {(activeOrder.status === 'PENDING' || activeOrder.status === 'SCANNED') && (
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-400">QR Expires In:</span>
                    <span className="text-amber-300 font-bold">{formattedTimer}</span>
                  </div>
                )}
              </div>

              {(activeOrder.status === 'PENDING' || activeOrder.status === 'SCANNED') && (
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    {activeOrder.status === 'PENDING' && (
                      <button
                        type="button"
                        disabled={isChecking}
                        onClick={handleMarkScanned}
                        className="px-3 py-1.5 rounded-lg bg-[#111D35] hover:bg-[#162544] border border-cyan-500/40 text-cyan-300 text-[11px] font-semibold cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <ScanLine className="w-3.5 h-3.5" />
                        <span>Mark QR Scanned (Does Not Credit)</span>
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={isChecking}
                      onClick={() => pollStatus(activeOrder.order_id)}
                      className="px-3 py-1.5 rounded-lg bg-[#111D35] hover:bg-[#162544] border border-slate-700 text-slate-300 text-[11px] font-semibold cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                      <span>Refresh Status</span>
                    </button>

                    {!isDemoMode && (
                      <button
                        type="button"
                        disabled={isChecking}
                        onClick={handleVerifyGatewayPayment}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[11px] font-bold cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Verify Payment with Gateway</span>
                      </button>
                    )}
                  </div>

                  {!isDemoMode && (
                    <div className="p-3 rounded-xl bg-cyan-950/35 border border-cyan-500/35 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold text-cyan-300 uppercase flex items-center gap-1.5">
                          <Smartphone className="w-3.5 h-3.5" />
                          <span>Google Pay / UPI App Instructions</span>
                        </span>
                        <span className="text-[10px] font-mono text-cyan-200/80">
                          {config?.merchantName || 'Configured Merchant'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        Open <strong>Google Pay</strong> (or PhonePe / Paytm) and scan this QR code. Your UPI app will display <strong>₹{activeOrder.amount.toFixed(2)}</strong> and ask for your UPI PIN to authorize payment.
                      </p>
                      {activeOrder.mode === 'upi_gateway' && config?.webhookConfigured === false && (
                        <p className="text-[10px] text-amber-300 font-mono leading-relaxed">
                          Note: Set <code>PAYMENT_GATEWAY_WEBHOOK_SECRET</code> on the server so your payment gateway webhook automatically verifies and credits the wallet after PIN entry.
                        </p>
                      )}
                    </div>
                  )}

                  {isDemoMode && activeOrder.demo_auth_token && (
                    <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/40 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold text-amber-300 uppercase flex items-center gap-1.5">
                          <Smartphone className="w-3.5 h-3.5" />
                          <span>External Web Checkout (Phone / Browser)</span>
                        </span>
                        <span className="text-[10px] font-mono text-amber-200/80">
                          HMAC-Signed Backend Check
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-200 leading-relaxed">
                        Scan this QR with your <strong>Phone Camera</strong> (or open the checkout link below) to launch the external web browser page showing <strong>₹{activeOrder.amount.toFixed(2)}</strong>. Clicking <strong>Add Money</strong> there atomically updates your CarpoolX Wallet here within 2 seconds.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {activeOrder.demo_terminal_url && (
                          <a
                            href={activeOrder.demo_terminal_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-2 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 font-bold text-[11px] inline-flex items-center gap-1.5"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Open Checkout Website</span>
                          </a>
                        )}
                        <button
                          type="button"
                          disabled={isVerifyingDemo}
                          onClick={() => handleDemoDecision('success')}
                          className="flex-1 px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-[11px] cursor-pointer disabled:opacity-50"
                        >
                          {isVerifyingDemo
                            ? 'Verifying...'
                            : `Add ₹${activeOrder.amount.toFixed(2)} Now`}
                        </button>
                        <button
                          type="button"
                          disabled={isVerifyingDemo}
                          onClick={() => handleDemoDecision('fail')}
                          className="px-3 py-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-semibold text-[11px] cursor-pointer disabled:opacity-50"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeOrder.status === 'SUCCESS' && activeOrder.credited && (
                <div className="p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-500/50 text-emerald-200 text-xs flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      Backend verified! <strong>+₹{activeOrder.amount.toFixed(2)}</strong> credited to wallet.
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveOrder(null)}
                      className="px-3 py-1.5 rounded-lg bg-[#111D35] border border-slate-700 text-slate-200 hover:text-white text-[11px] font-semibold cursor-pointer"
                    >
                      Add More
                    </button>
                    {onClose && (
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-[11px] cursor-pointer"
                      >
                        Done &amp; Close
                      </button>
                    )}
                  </div>
                </div>
              )}

              {(activeOrder.status === 'FAILED' || activeOrder.status === 'EXPIRED') && (
                <div className="p-3 rounded-xl bg-rose-950/35 border border-rose-500/40 text-rose-200 text-xs flex flex-wrap items-center justify-between gap-2">
                  <span>{activeOrder.failure_reason || `Order ${activeOrder.status.toLowerCase()}.`}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveOrder(null)}
                      className="px-3 py-1.5 rounded-lg bg-[#111D35] border border-slate-700 text-white text-[11px] font-semibold cursor-pointer"
                    >
                      Try Again
                    </button>
                    {onClose && (
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 text-[11px] font-semibold cursor-pointer"
                      >
                        {closeLabel}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* QR Recharge Requests History Table */}
      {showHistory && (
        <div className="rounded-2xl border border-slate-800 bg-[#0D1628] overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                QR Wallet Recharge Orders
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Every QR generation, scan, failure, expiry, and server-verified credit is tracked here.
              </p>
            </div>
            <button
              type="button"
              onClick={loadConfigAndHistory}
              className="px-3 py-1 rounded-lg bg-[#111D35] border border-slate-700 text-slate-300 hover:text-white text-[11px] font-semibold cursor-pointer flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Sync</span>
            </button>
          </div>
          {history.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              No QR recharge orders initiated yet. Enter an amount above and click &ldquo;Add Money&rdquo;.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left font-mono">
                <thead className="bg-[#111D35] text-slate-300 border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Order ID</th>
                    <th className="px-4 py-3">Mode</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Wallet Credited</th>
                    <th className="px-4 py-3">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {history.map((ord) => (
                    <tr key={ord.order_id} className="hover:bg-[#162544]/60 transition-colors">
                      <td className="px-4 py-3 text-cyan-300 font-bold">{ord.order_id}</td>
                      <td className="px-4 py-3 uppercase text-[10px]">{ord.mode}</td>
                      <td className="px-4 py-3 font-bold text-white tabular-nums">
                        ₹{ord.amount.toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getOrderStatusBadge(
                            ord.status
                          )}`}
                        >
                          {ord.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {ord.credited ? (
                          <span className="text-emerald-400 font-bold">YES</span>
                        ) : (
                          <span className="text-slate-400">NO</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[11px] text-slate-400 whitespace-nowrap">
                        {new Date(ord.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
