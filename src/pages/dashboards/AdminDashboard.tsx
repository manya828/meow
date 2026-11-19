import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Car,
  DollarSign,
  ShieldCheck,
  Search,
  CheckCircle,
  AlertCircle,
  Database,
  RefreshCw,
  AlertTriangle,
  Eye,
  X,
  BarChart3,
  Receipt,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { api } from '../../services/api.ts';
import {
  Booking,
  Ride,
  Transaction,
  AuditLog,
  BookingAttemptLog,
  IssueReport,
} from '../../types';
import { PrivilegedAuthGate } from '../../components/auth/PrivilegedAuthGate.tsx';
import {
  getIssueStatusStyle,
  getSeverityBadgeStyle,
} from '../../components/issues/IssueSupportPanel.tsx';

interface AdminDashboardProps {
  onNavigateHome?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigateHome = () => {} }) => {
  const { openSqlWorkbench, user } = useAuth();

  if (!user || user.role !== 'admin') {
    return <PrivilegedAuthGate requiredRole="admin" onNavigateHome={onNavigateHome} />;
  }

  const [activeTab, setActiveTab] = useState<
    'overview' | 'users' | 'operations' | 'financials' | 'issues' | 'reports' | 'audit'
  >('overview');
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [inspectedUser, setInspectedUser] = useState<any | null>(null);

  const [rides, setRides] = useState<Ride[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [attempts, setAttempts] = useState<BookingAttemptLog[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txnFilter, setTxnFilter] = useState<string>('all');
  const [adminIssuesData, setAdminIssuesData] = useState<{
    issues: IssueReport[];
    escalatedIssues: IssueReport[];
    coordinators: any[];
  }>({ issues: [], escalatedIssues: [], coordinators: [] });
  const [resolveTargetIssue, setResolveTargetIssue] = useState<IssueReport | null>(null);
  const [adminResolveNotes, setAdminResolveNotes] = useState('');
  const [adminResolveStatus, setAdminResolveStatus] = useState<'resolved' | 'closed'>('resolved');

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [reportData, setReportData] = useState<any>(null);
  const [activeReportType, setActiveReportType] = useState('corridor_summary');

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = useCallback(
    async (silent = false) => {
      if (!silent) setIsRefreshing(true);
      try {
        const [statsRes, usersRes, ridesRes, bRes, attRes, txRes, issRes, logsRes] = await Promise.all([
          api.getAdminStats(),
          api.getAdminUsers(userRoleFilter, userSearchQuery),
          api.getAdminRides(),
          api.getAdminBookings(),
          api.getAdminAttempts(),
          api.getAdminTransactions(),
          api.getAdminIssues(),
          api.getAdminAuditLogs(),
        ]);
        setStats(statsRes);
        setUsers(usersRes.users || []);
        setRides(ridesRes.rides || []);
        setBookings(bRes.bookings || []);
        setAttempts(attRes.attempts || []);
        setTransactions(txRes.transactions || []);
        setAdminIssuesData(issRes);
        setAuditLogs(logsRes.logs || []);
      } catch (err) {
        console.error(err);
      } finally {
        if (!silent) setIsRefreshing(false);
      }
    },
    [userRoleFilter, userSearchQuery]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    api.getAdminReport(activeReportType).then((res) => setReportData(res)).catch(() => {});
  }, [activeReportType]);

  const handleToggleUser = async (userId: number, currentStatus: boolean) => {
    setErrorMessage(null);
    try {
      const res = await api.toggleUserStatus(userId, !currentStatus);
      setStatusMessage(res.message);
      await loadData(true);
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Status change failed');
    }
  };

  const handleResolveEscalatedIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolveTargetIssue) return;
    setErrorMessage(null);
    try {
      const res = await api.resolveAdminIssue(
        resolveTargetIssue.issue_id,
        adminResolveNotes.trim() || 'Resolved by System Administrator after escalation review.',
        adminResolveStatus
      );
      setStatusMessage(res.message);
      setResolveTargetIssue(null);
      setAdminResolveNotes('');
      await loadData(true);
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not resolve escalated issue.');
    }
  };

  const uStats = stats?.users || {};
  const rStats = stats?.rides || {};
  const bStats = stats?.bookings || {};
  const fStats = stats?.financials || {};
  const iStats = stats?.issues || {};
  const charts = stats?.charts || {};

  const maxBookingOutcome = Math.max(1, ...(charts.bookingOutcomes || []).map((x: any) => Number(x.count || 0)));
  const maxUserComp = Math.max(1, ...(charts.userComposition || []).map((x: any) => Number(x.count || 0)));
  const maxTxnAmount = Math.max(1, ...(charts.transactionBreakdown || []).map((x: any) => Number(x.amount || 0)));
  const maxIssueStat = Math.max(1, ...(charts.issueResolutionStats || []).map((x: any) => Number(x.count || 0)));

  const filteredTransactions = transactions.filter((t) => {
    if (txnFilter === 'all') return true;
    if (txnFilter === 'failed') return t.payment_status === 'failed';
    return t.transaction_type === txnFilter;
  });

  return (
    <div className="space-y-8">
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
            System Administration & Control Center
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-0.5">
            Platform Master Console · {user.full_name}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Authenticated Admin: <span className="text-slate-200 font-mono">{user.email}</span> · Live Database Metrics (Zero Hardcoded Stats)
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => loadData(false)}
            disabled={isRefreshing}
            className="px-3.5 py-2.5 rounded-xl bg-[#111D35] hover:bg-[#162544] border border-slate-700 text-slate-200 font-semibold text-xs transition-colors cursor-pointer flex items-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh Live DB</span>
          </button>
          <button
            type="button"
            onClick={openSqlWorkbench}
            className="px-4 py-2.5 rounded-xl bg-[#111D35] hover:bg-[#162544] border border-cyan-500/40 text-cyan-300 font-semibold text-xs transition-colors cursor-pointer flex items-center gap-2"
          >
            <Database className="w-3.5 h-3.5 text-cyan-400" />
            <span>Launch DBMS Studio</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 text-xs overflow-x-auto">
        {[
          { id: 'overview', label: 'System Overview & Charts' },
          { id: 'users', label: `User Management (${users.length})` },
          { id: 'operations', label: `Rides, Bookings & Attempts (${attempts.length})` },
          { id: 'financials', label: `Wallet & Txn Ledger (${transactions.length})` },
          { id: 'issues', label: `Issues & Escalations (${adminIssuesData.escalatedIssues.length})` },
          { id: 'reports', label: 'Database Reports' },
          { id: 'audit', label: `Audit Logs (${auditLogs.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`py-2.5 px-4 font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === tab.id
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: SYSTEM OVERVIEW & 6 LIVE DB CHARTS */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* 1. Users & Rides & Bookings Live KPIs */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              <span>Live Platform Users, Rides & Booking Outcomes</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
              <div className="p-4 rounded-2xl bg-[#0D1628] border border-slate-800">
                <span className="text-[11px] font-semibold text-slate-400 block">Total Users</span>
                <p className="text-2xl font-bold font-mono text-white mt-1 tabular-nums">{uStats.totalUsers ?? 0}</p>
                <span className="text-[10px] text-slate-500 font-mono">
                  {uStats.activePassengersAndDrivers ?? ((uStats.totalPassengers ?? 0) + (uStats.totalDrivers ?? 0))} active · {uStats.suspendedUsers ?? 0} suspended
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-[#0D1628] border border-slate-800">
                <span className="text-[11px] font-semibold text-slate-400 block">Passengers / Drivers</span>
                <p className="text-2xl font-bold font-mono text-cyan-300 mt-1 tabular-nums">
                  {uStats.totalPassengers ?? 0} / {uStats.totalDrivers ?? 0}
                </p>
                <span className="text-[10px] text-slate-500 font-mono">Dedicated passenger &amp; driver accounts</span>
              </div>
              <div className="p-4 rounded-2xl bg-[#0D1628] border border-slate-800">
                <span className="text-[11px] font-semibold text-slate-400 block">Rides (Act / Comp / Can)</span>
                <p className="text-2xl font-bold font-mono text-white mt-1 tabular-nums">{rStats.totalRides ?? 0}</p>
                <span className="text-[10px] text-slate-500 font-mono">
                  {rStats.activeRides ?? 0} active · {rStats.completedRides ?? 0} done · {rStats.cancelledRides ?? 0} canc
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-[#0D1628] border border-slate-800">
                <span className="text-[11px] font-semibold text-slate-400 block">Total Bookings</span>
                <p className="text-2xl font-bold font-mono text-emerald-400 mt-1 tabular-nums">{bStats.totalBookings ?? 0}</p>
                <span className="text-[10px] text-slate-500 font-mono">
                  {bStats.completedBookings ?? 0} completed · {bStats.acceptedBookings ?? 0} accepted · {bStats.pendingBookings ?? 0} pend
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-[#0D1628] border border-slate-800">
                <span className="text-[11px] font-semibold text-slate-400 block">Cancellation Rate</span>
                <p className="text-2xl font-bold font-mono text-rose-300 mt-1 tabular-nums">
                  {bStats.cancellationRatePct ?? 0}%
                </p>
                <span className="text-[10px] text-slate-500 font-mono">
                  {bStats.cancelledBookings ?? 0} cancelled · {bStats.rejectedBookings ?? 0} rejected
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-[#0D1628] border border-rose-500/30">
                <span className="text-[11px] font-semibold text-rose-300 block">Failed / Overbookings</span>
                <p className="text-2xl font-bold font-mono text-rose-400 mt-1 tabular-nums">
                  {(bStats.failedBookingAttempts ?? 0) + (bStats.overbookingAttempts ?? 0)}
                </p>
                <span className="text-[10px] text-slate-400 font-mono">
                  {bStats.overbookingAttempts ?? 0} overbook · {bStats.failedBookingAttempts ?? 0} wallet/err
                </span>
              </div>
            </div>
          </div>

          {/* 2. Financial Reconciliation (Liability vs Completed Revenue) */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              <span>Financial Reconciliation (Wallet Liability vs Completed Ride Revenue)</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
              <div className="p-4 rounded-2xl bg-[#0D1628] border border-amber-500/30">
                <span className="text-[11px] font-semibold text-amber-300 block">User Wallet Liability</span>
                <p className="text-xl font-bold font-mono text-amber-200 mt-1 tabular-nums">
                  ₹{Number(fStats.totalUserWalletLiability ?? 0).toFixed(2)}
                </p>
                <span className="text-[10px] text-slate-400 font-mono">Stored user funds (NOT revenue)</span>
              </div>
              <div className="p-4 rounded-2xl bg-[#0D1628] border border-slate-800">
                <span className="text-[11px] font-semibold text-slate-400 block">External Top-Ups</span>
                <p className="text-xl font-bold font-mono text-cyan-300 mt-1 tabular-nums">
                  ₹{Number(fStats.totalWalletTopUps ?? 0).toFixed(2)}
                </p>
                <span className="text-[10px] text-slate-500 font-mono">UPI / Card / NetBanking</span>
              </div>
              <div className="p-4 rounded-2xl bg-[#0D1628] border border-slate-800">
                <span className="text-[11px] font-semibold text-slate-400 block">Awaiting Post-Ride Pay</span>
                <p className="text-xl font-bold font-mono text-white mt-1 tabular-nums">
                  ₹{Number(fStats.awaitingPostRidePayments ?? fStats.pendingEscrowPayments ?? 0).toFixed(2)}
                </p>
                <span className="text-[10px] text-slate-500 font-mono">Completed unpaid trips</span>
              </div>
              <div className="p-4 rounded-2xl bg-[#0D1628] border border-emerald-500/30">
                <span className="text-[11px] font-semibold text-emerald-400 block">Completed Ride Revenue</span>
                <p className="text-xl font-bold font-mono text-emerald-400 mt-1 tabular-nums">
                  ₹{Number(fStats.totalCompletedRidePayments ?? 0).toFixed(2)}
                </p>
                <span className="text-[10px] text-slate-400 font-mono">Settled completed trips only</span>
              </div>
              <div className="p-4 rounded-2xl bg-[#0D1628] border border-slate-800">
                <span className="text-[11px] font-semibold text-slate-400 block">Refunds Issued</span>
                <p className="text-xl font-bold font-mono text-rose-300 mt-1 tabular-nums">
                  ₹{Number(fStats.totalRefundsIssued ?? 0).toFixed(2)}
                </p>
                <span className="text-[10px] text-slate-500 font-mono">Overbooking rollbacks</span>
              </div>
              <div className="p-4 rounded-2xl bg-[#0D1628] border border-slate-800">
                <span className="text-[11px] font-semibold text-slate-400 block">Issues (Unres / Avg)</span>
                <p className="text-xl font-bold font-mono text-white mt-1 tabular-nums">
                  {iStats.unresolvedIssues ?? 0} /{' '}
                  {iStats.avgIssueResolutionMin !== null && iStats.avgIssueResolutionMin !== undefined
                    ? `${iStats.avgIssueResolutionMin}m`
                    : 'N/A'}
                </p>
                <span className="text-[10px] text-slate-500 font-mono">
                  {iStats.escalatedIssues ?? 0} escalated · {iStats.highPriorityIssues ?? 0} high/crit
                </span>
              </div>
            </div>
          </div>

          {/* 3. Six Real Database-Backed Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Ride Activity by Corridor */}
            <div className="rounded-2xl bg-[#0D1628] border border-slate-800 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-cyan-400" />
                    <span>1. Ride Activity by Corridor</span>
                  </h4>
                  <p className="text-[11px] text-slate-400">Active, Completed, and Cancelled rides from rides table</p>
                </div>
              </div>
              <div className="space-y-3">
                {(charts.rideActivity || []).map((c: any) => {
                  const total = Math.max(1, c.active + c.completed + c.cancelled);
                  return (
                    <div key={c.label} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-200 font-medium truncate pr-2">{c.label}</span>
                        <span className="font-mono text-[11px] text-slate-400 shrink-0 tabular-nums">
                          {c.active} Act · {c.completed} Done · {c.cancelled} Canc
                        </span>
                      </div>
                      <div className="h-2.5 w-full bg-[#111D35] rounded-full overflow-hidden flex">
                        <div style={{ width: `${(c.active / total) * 100}%` }} className="bg-cyan-400 h-full" />
                        <div style={{ width: `${(c.completed / total) * 100}%` }} className="bg-emerald-400 h-full" />
                        <div style={{ width: `${(c.cancelled / total) * 100}%` }} className="bg-rose-400 h-full" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Chart 2: Booking Outcomes */}
            <div className="rounded-2xl bg-[#0D1628] border border-slate-800 p-5 space-y-4">
              <div>
                <h4 className="text-sm font-bold text-white">2. Booking Lifecycle & Failure Outcomes</h4>
                <p className="text-[11px] text-slate-400">Live counts across bookings and booking_attempts tables</p>
              </div>
              <div className="space-y-2.5">
                {(charts.bookingOutcomes || []).map((item: any) => (
                  <div key={item.label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300">{item.label}</span>
                      <span className="font-mono font-bold text-white tabular-nums">{item.count}</span>
                    </div>
                    <div className="h-2 bg-[#111D35] rounded-full overflow-hidden">
                      <div
                        style={{ width: `${Math.round((item.count / maxBookingOutcome) * 100)}%` }}
                        className={`h-full rounded-full ${
                          item.tone === 'emerald'
                            ? 'bg-emerald-400'
                            : item.tone === 'cyan'
                            ? 'bg-cyan-400'
                            : item.tone === 'amber'
                            ? 'bg-amber-400'
                            : item.tone === 'rose' || item.tone === 'red'
                            ? 'bg-rose-400'
                            : 'bg-slate-400'
                        }`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Chart 3: User & Role Composition */}
            <div className="rounded-2xl bg-[#0D1628] border border-slate-800 p-5 space-y-4">
              <div>
                <h4 className="text-sm font-bold text-white">3. User &amp; Role Composition</h4>
                <p className="text-[11px] text-slate-400">Dedicated Passenger, Driver, Coordinator &amp; Admin accounts</p>
              </div>
              <div className="space-y-2.5">
                {(charts.userComposition || []).map((item: any) => (
                  <div key={item.label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300">{item.label}</span>
                      <span className="font-mono font-bold text-cyan-300 tabular-nums">{item.count}</span>
                    </div>
                    <div className="h-2 bg-[#111D35] rounded-full overflow-hidden">
                      <div
                        style={{ width: `${Math.round((item.count / maxUserComp) * 100)}%` }}
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Chart 4: Financial & Transaction Breakdown */}
            <div className="rounded-2xl bg-[#0D1628] border border-slate-800 p-5 space-y-4">
              <div>
                <h4 className="text-sm font-bold text-white">4. Wallet & Transaction Volume Breakdown</h4>
                <p className="text-[11px] text-slate-400">Live ledger totals across top-ups, debits, completed settlements & refunds</p>
              </div>
              <div className="space-y-2.5">
                {(charts.transactionBreakdown || []).map((item: any) => (
                  <div key={item.label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300">
                        {item.label} <span className="text-[10px] font-mono text-slate-500">({item.count} txns)</span>
                      </span>
                      <span className="font-mono font-bold text-white tabular-nums">
                        ₹{Number(item.amount || 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="h-2 bg-[#111D35] rounded-full overflow-hidden">
                      <div
                        style={{ width: `${Math.round((Number(item.amount || 0) / maxTxnAmount) * 100)}%` }}
                        className="h-full rounded-full bg-emerald-400"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Chart 5: Issue Resolution Status */}
            <div className="rounded-2xl bg-[#0D1628] border border-slate-800 p-5 space-y-4">
              <div>
                <h4 className="text-sm font-bold text-white">5. Real-Time Issue Resolution Breakdown</h4>
                <p className="text-[11px] text-slate-400">Live incident queue metrics across Coordinator & Admin escalation</p>
              </div>
              <div className="space-y-2.5">
                {(charts.issueResolutionStats || []).map((item: any) => (
                  <div key={item.label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300">{item.label}</span>
                      <span className="font-mono font-bold text-white tabular-nums">{item.count}</span>
                    </div>
                    <div className="h-2 bg-[#111D35] rounded-full overflow-hidden">
                      <div
                        style={{ width: `${Math.round((item.count / maxIssueStat) * 100)}%` }}
                        className={`h-full rounded-full ${
                          item.tone === 'emerald'
                            ? 'bg-emerald-400'
                            : item.tone === 'cyan'
                            ? 'bg-cyan-400'
                            : item.tone === 'amber'
                            ? 'bg-amber-400'
                            : 'bg-rose-400'
                        }`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Chart 6: Corridor Occupancy & Settled Revenue */}
            <div className="rounded-2xl bg-[#0D1628] border border-slate-800 p-5 space-y-4">
              <div>
                <h4 className="text-sm font-bold text-white">6. Corridor Occupancy &amp; Settled Revenue</h4>
                <p className="text-[11px] text-slate-400">Seat utilization and completed post-ride revenue across Bengaluru corridors</p>
              </div>
              {(!charts.corridorPerformance || charts.corridorPerformance.length === 0) ? (
                <div className="p-6 rounded-xl bg-[#111D35] border border-slate-800 text-center text-xs text-amber-300 font-mono">
                  No corridor utilization data recorded yet
                </div>
              ) : (
                <div className="space-y-2.5">
                  {charts.corridorPerformance.map((item: any) => (
                    <div key={item.corridor} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300 truncate pr-2">{item.corridor}</span>
                        <span className="font-mono font-bold text-cyan-300 tabular-nums shrink-0">
                          {item.bookedSeats}/{item.totalSeats} seats ({item.occupancyPct}%) · ₹{Number(item.settledRevenue || 0).toFixed(0)}
                        </span>
                      </div>
                      <div className="h-2 bg-[#111D35] rounded-full overflow-hidden">
                        <div
                          style={{ width: `${Math.min(100, Math.max(0, Number(item.occupancyPct || 0)))}%` }}
                          className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: USER MANAGEMENT & INSPECT */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#0D1628] p-4 rounded-xl border border-slate-800">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                placeholder="Search user name, email, or phone..."
                className="w-full bg-[#111D35] border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div className="flex items-center gap-2 self-stretch sm:self-auto overflow-x-auto text-xs">
              {(['all', 'passenger', 'driver', 'coordinator', 'admin'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setUserRoleFilter(r)}
                  className={`px-3 py-1.5 rounded-lg capitalize font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    userRoleFilter === r
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'bg-[#111D35] text-slate-300 hover:text-white border border-slate-800'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-[#0D1628] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#111D35] text-slate-300 font-mono border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">User ID</th>
                    <th className="px-4 py-3">Full Name</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Trips / Bookings</th>
                    <th className="px-4 py-3">Wallet / Earnings</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Inspect & Control</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {users.map((u) => (
                    <tr key={u.user_id} className="hover:bg-[#162544]/60 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-cyan-300">#{u.user_id}</td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-white">{u.full_name}</p>
                        <p className="text-[11px] font-mono text-slate-400">{u.email}</p>
                      </td>
                      <td className="px-4 py-3 capitalize font-mono text-[11px]">
                        <span className="text-cyan-200">{u.role}</span>
                        {u.isDriverVerified && (
                          <span className="block text-[10px] text-emerald-400">Driver Verified</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px]">
                        <span>Book: {u.passengerBookingsCount ?? 0}</span>
                        {' · '}
                        <span>Offer: {u.offeredRidesCount ?? 0}</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] tabular-nums">
                        <span className="text-cyan-300">W: ₹{(u.wallet_balance ?? 0).toFixed(2)}</span>
                        {' · '}
                        <span className="text-emerald-400">E: ₹{(u.earnings_balance ?? 0).toFixed(2)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                            u.is_active
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : 'bg-rose-950 text-rose-300 border border-rose-800'
                          }`}
                        >
                          {u.is_active ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap space-x-2">
                        <button
                          onClick={() => setInspectedUser(u)}
                          className="px-2.5 py-1 rounded-lg bg-[#111D35] hover:bg-[#162544] text-cyan-300 border border-slate-700 text-[11px] font-semibold cursor-pointer inline-flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Inspect</span>
                        </button>
                        {u.role !== 'admin' && (
                          <button
                            onClick={() => handleToggleUser(u.user_id, u.is_active)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                              u.is_active
                                ? 'text-rose-400 hover:bg-rose-500/15'
                                : 'text-emerald-400 hover:bg-emerald-500/15'
                            }`}
                          >
                            {u.is_active ? 'Suspend' : 'Activate'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: RIDES, BOOKINGS & FAILED / OVERBOOKING ATTEMPTS */}
      {activeTab === 'operations' && (
        <div className="space-y-8">
          {/* Failed & Overbooking Attempts Log */}
          <div className="rounded-2xl border border-rose-500/30 bg-[#0D1628] overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Failed Bookings & Overbooking Prevention Log ({attempts.length})
                </h3>
              </div>
              <span className="text-[11px] font-mono text-rose-300">ACID Rollback Audit</span>
            </div>
            {attempts.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">No failed or overbooking attempts recorded yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left font-mono">
                  <thead className="bg-[#111D35] text-slate-300 border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Attempt ID</th>
                      <th className="px-4 py-3">Passenger</th>
                      <th className="px-4 py-3">Ride</th>
                      <th className="px-4 py-3">Seats / Fare</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Rollback Reason</th>
                      <th className="px-4 py-3">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {attempts.map((a) => (
                      <tr key={a.attempt_id} className="hover:bg-[#162544]/60">
                        <td className="px-4 py-3 font-bold text-rose-300">#{a.attempt_id}</td>
                        <td className="px-4 py-3 font-sans text-white">
                          {a.passenger_name} <span className="text-slate-500 font-mono">(#{a.passenger_id})</span>
                        </td>
                        <td className="px-4 py-3">Ride #{a.ride_id}</td>
                        <td className="px-4 py-3 tabular-nums">
                          {a.seats_requested} seat · ₹{a.attempted_fare.toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 text-[10px] uppercase font-bold">
                            {a.attempt_status} ({a.failure_code})
                          </span>
                        </td>
                        <td className="px-4 py-3 font-sans text-rose-200 max-w-xs">{a.failure_reason}</td>
                        <td className="px-4 py-3 text-slate-500 text-[11px]">
                          {new Date(a.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* All Bookings Table */}
          <div className="rounded-2xl border border-slate-800 bg-[#0D1628] overflow-hidden">
            <div className="p-4 border-b border-slate-800 font-bold text-xs text-white uppercase tracking-wider">
              All Platform Bookings ({bookings.length})
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#111D35] text-slate-300 font-mono border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Booking</th>
                    <th className="px-4 py-3">Passenger → Driver</th>
                    <th className="px-4 py-3">Segment</th>
                    <th className="px-4 py-3">Fare</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Wallet Status</th>
                    <th className="px-4 py-3">Edits</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {bookings.map((b) => (
                    <tr key={b.booking_id} className="hover:bg-[#162544]/60">
                      <td className="px-4 py-3 font-mono font-bold text-cyan-300">
                        #{b.booking_id} <span className="text-slate-500 font-normal">(R#{b.ride_id})</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-white font-semibold">{b.passenger_name}</span> → {b.driver_name}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {b.pickup_point} → {b.dropoff_point}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-white tabular-nums">
                        ₹{b.total_fare.toFixed(2)} ({b.seats_booked}s)
                      </td>
                      <td className="px-4 py-3 font-mono uppercase text-[10px] font-bold">{b.status}</td>
                      <td className="px-4 py-3 font-mono uppercase text-[10px]">
                        {b.payment_status} {b.driver_settled ? '· SETTLED' : ''}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px]">{b.edit_count ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* All Rides Table */}
          <div className="rounded-2xl border border-slate-800 bg-[#0D1628] overflow-hidden">
            <div className="p-4 border-b border-slate-800 font-bold text-xs text-white uppercase tracking-wider flex items-center gap-2">
              <Car className="w-4 h-4 text-cyan-400" />
              <span>All Published Rides ({rides.length})</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#111D35] text-slate-300 font-mono border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Ride ID</th>
                    <th className="px-4 py-3">Driver</th>
                    <th className="px-4 py-3">Corridor & Route</th>
                    <th className="px-4 py-3">Seats Avail</th>
                    <th className="px-4 py-3">Seat Fare</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {rides.map((r) => (
                    <tr key={r.ride_id} className="hover:bg-[#162544]/60">
                      <td className="px-4 py-3 font-mono font-bold text-cyan-300">#{r.ride_id}</td>
                      <td className="px-4 py-3">
                        <span className="text-white font-semibold">{r.driver_name}</span>
                        <span className="block text-[10px] text-slate-400">{r.vehicle_model}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-white">{r.origin_name} → {r.destination_name}</span>
                        <span className="block text-[10px] text-slate-400">{r.corridor_name}</span>
                      </td>
                      <td className="px-4 py-3 font-mono">{r.available_seats} / {r.total_seats}</td>
                      <td className="px-4 py-3 font-mono font-bold text-white tabular-nums">₹{r.fare_per_seat.toFixed(2)}</td>
                      <td className="px-4 py-3 font-mono uppercase text-[10px] font-bold">{r.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: FINANCIAL & TRANSACTION LEDGER */}
      {activeTab === 'financials' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0D1628] p-4 rounded-2xl border border-slate-800 text-xs">
            <div className="flex items-center gap-2 font-semibold text-white">
              <Receipt className="w-4 h-4 text-cyan-400" />
              <span>Full Wallet, Booking, Refund & Settlement Ledger</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'all', label: 'All' },
                { id: 'fare_payment', label: 'Booking Debits' },
                { id: 'fare_adjustment', label: 'Edit Adjustments' },
                { id: 'wallet_topup', label: 'Wallet Top-Ups' },
                { id: 'cancellation_refund', label: 'Refunds' },
                { id: 'driver_payout', label: 'Driver Payouts' },
                { id: 'failed', label: 'Failed' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setTxnFilter(f.id)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer ${
                    txnFilter === f.id
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'bg-[#111D35] text-slate-300 border border-slate-800'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-[#0D1628] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left font-mono">
                <thead className="bg-[#111D35] text-slate-300 border-b border-slate-800">
                  <tr>
                    <th className="px-3.5 py-3">TXN ID</th>
                    <th className="px-3.5 py-3">Booking</th>
                    <th className="px-3.5 py-3">Passenger</th>
                    <th className="px-3.5 py-3">Type / Source</th>
                    <th className="px-3.5 py-3">Amount</th>
                    <th className="px-3.5 py-3">Status</th>
                    <th className="px-3.5 py-3">Prev → New Bal</th>
                    <th className="px-3.5 py-3">Reason / Route</th>
                    <th className="px-3.5 py-3">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {filteredTransactions.map((tx) => {
                    const prevBal = tx.passenger_balance_before ?? tx.driver_balance_before;
                    const newBal = tx.passenger_balance_after ?? tx.driver_balance_after;
                    return (
                      <tr key={tx.transaction_id} className="hover:bg-[#162544]/60">
                        <td className="px-3.5 py-3 font-bold text-cyan-300 whitespace-nowrap">{tx.transaction_id}</td>
                        <td className="px-3.5 py-3">{tx.booking_id ? `#${tx.booking_id}` : '—'}</td>
                        <td className="px-3.5 py-3 font-sans">
                          {tx.passenger_name || 'User'} <span className="font-mono text-slate-500">#{tx.passenger_id}</span>
                        </td>
                        <td className="px-3.5 py-3 uppercase text-[10px]">
                          {tx.transaction_type}
                          {tx.topup_source ? ` (${tx.topup_source})` : ''}
                        </td>
                        <td className="px-3.5 py-3 font-bold text-white tabular-nums">₹{tx.amount.toFixed(2)}</td>
                        <td className="px-3.5 py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              tx.payment_status === 'success'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : tx.payment_status === 'refunded'
                                ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                                : 'bg-rose-950 text-rose-300 border border-rose-800'
                            }`}
                          >
                            {tx.payment_status}
                          </span>
                        </td>
                        <td className="px-3.5 py-3 text-[11px] tabular-nums">
                          {prevBal !== undefined && newBal !== undefined
                            ? `₹${prevBal.toFixed(0)} → ₹${newBal.toFixed(0)}`
                            : '—'}
                        </td>
                        <td className="px-3.5 py-3 font-sans text-slate-300 max-w-xs">
                          {tx.failure_reason || tx.route_summary || '—'}
                        </td>
                        <td className="px-3.5 py-3 text-slate-500 text-[11px] whitespace-nowrap">
                          {new Date(tx.created_at).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: ESCALATED ISSUES & COORDINATOR PERFORMANCE */}
      {activeTab === 'issues' && (
        <div className="space-y-6">
          {/* Coordinator Performance Table */}
          <div className="rounded-2xl border border-slate-800 bg-[#0D1628] overflow-hidden">
            <div className="p-4 border-b border-slate-800 font-bold text-xs text-white uppercase tracking-wider">
              Coordinator Issue Resolution Workload
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#111D35] text-slate-300 font-mono border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Coordinator ID</th>
                    <th className="px-4 py-3">Name / Email</th>
                    <th className="px-4 py-3">Assigned Issues</th>
                    <th className="px-4 py-3">Active Investigating</th>
                    <th className="px-4 py-3">Resolved / Closed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300 font-mono">
                  {adminIssuesData.coordinators.map((c) => (
                    <tr key={c.coordinator_id} className="hover:bg-[#162544]/60">
                      <td className="px-4 py-3 text-cyan-300 font-bold">#{c.coordinator_id}</td>
                      <td className="px-4 py-3 font-sans">
                        <span className="text-white font-semibold">{c.full_name}</span>
                        <span className="block text-[11px] font-mono text-slate-400">{c.email}</span>
                      </td>
                      <td className="px-4 py-3">{c.assigned_count}</td>
                      <td className="px-4 py-3 text-cyan-300">{c.active_investigating}</td>
                      <td className="px-4 py-3 text-emerald-400 font-bold">{c.resolved_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Escalated Issues Queue */}
          <div className="rounded-2xl border border-rose-500/30 bg-[#0D1628] overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Escalated Complaints Requiring Admin Resolution ({adminIssuesData.escalatedIssues.length})
                </h3>
              </div>
            </div>
            {adminIssuesData.escalatedIssues.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No escalated complaints awaiting Administrator review.
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {adminIssuesData.escalatedIssues.map((issue) => (
                  <div key={issue.issue_id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1 text-xs">
                      <div className="flex flex-wrap items-center gap-2 font-mono">
                        <span className="text-cyan-300 font-bold">TICKET #{issue.issue_id}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getIssueStatusStyle(issue.status)}`}>
                          {issue.status}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getSeverityBadgeStyle(issue.severity)}`}>
                          {issue.severity}
                        </span>
                      </div>
                      <p className="text-white font-semibold capitalize">
                        {issue.reporter_name} ({issue.reported_by_role}) · {issue.category.replace(/_/g, ' ')}
                      </p>
                      <p className="text-slate-300">{issue.description}</p>
                      {issue.resolution_notes && (
                        <p className="text-[11px] text-amber-300">Escalation Note: {issue.resolution_notes}</p>
                      )}
                    </div>
                    {issue.status !== 'resolved' && issue.status !== 'closed' && (
                      <button
                        type="button"
                        onClick={() => {
                          setResolveTargetIssue(issue);
                          setAdminResolveNotes('');
                          setAdminResolveStatus('resolved');
                        }}
                        className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs cursor-pointer shrink-0"
                      >
                        Resolve Escalation
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* All Platform Issues Table */}
          <div className="rounded-2xl border border-slate-800 bg-[#0D1628] overflow-hidden">
            <div className="p-4 border-b border-slate-800 font-bold text-xs text-white uppercase tracking-wider">
              All Platform Support Tickets ({adminIssuesData.issues.length})
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#111D35] text-slate-300 font-mono border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Reporter</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Severity</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Coordinator</th>
                    <th className="px-4 py-3">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {adminIssuesData.issues.map((i) => (
                    <tr key={i.issue_id} className="hover:bg-[#162544]/60">
                      <td className="px-4 py-3 font-mono font-bold text-cyan-300">#{i.issue_id}</td>
                      <td className="px-4 py-3">
                        <span className="text-white font-semibold">{i.reporter_name}</span>
                        <span className="block text-[10px] font-mono text-slate-400 uppercase">{i.reported_by_role}</span>
                      </td>
                      <td className="px-4 py-3 capitalize">{i.category.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-3 font-mono uppercase text-[10px]">{i.severity}</td>
                      <td className="px-4 py-3 font-mono uppercase text-[10px]">{i.status}</td>
                      <td className="px-4 py-3 text-slate-400">{i.assigned_coordinator_name || 'Unassigned'}</td>
                      <td className="px-4 py-3 max-w-xs truncate">{i.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: DATABASE REPORTS */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveReportType('corridor_summary')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeReportType === 'corridor_summary'
                  ? 'bg-cyan-500 text-slate-950'
                  : 'bg-[#111D35] text-slate-300 hover:text-white'
              }`}
            >
              Corridor Performance Report
            </button>
            <button
              onClick={() => setActiveReportType('driver_performance')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeReportType === 'driver_performance'
                  ? 'bg-cyan-500 text-slate-950'
                  : 'bg-[#111D35] text-slate-300 hover:text-white'
              }`}
            >
              Driver Settlements Report
            </button>
            <button
              onClick={() => setActiveReportType('financial_reconciliation')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeReportType === 'financial_reconciliation'
                  ? 'bg-cyan-500 text-slate-950'
                  : 'bg-[#111D35] text-slate-300 hover:text-white'
              }`}
            >
              Wallet & Post-Ride Reconciliation
            </button>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-[#0D1628] overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-xs font-bold text-white">{reportData?.title || 'Report Output'}</h3>
              <span className="text-[11px] font-mono text-cyan-400">Live Database Engine Aggregation</span>
            </div>
            <div className="overflow-x-auto">
              {reportData?.rows && reportData.rows.length > 0 && (
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#111D35] text-slate-300 font-mono border-b border-slate-800">
                    <tr>
                      {Object.keys(reportData.rows[0]).map((col) => (
                        <th key={col} className="px-4 py-2.5 capitalize whitespace-nowrap">
                          {col.replace(/_/g, ' ')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300 font-mono">
                    {reportData.rows.map((row: any, idx: number) => (
                      <tr key={idx} className="hover:bg-[#162544]/60 transition-colors">
                        {Object.values(row).map((val: any, colIdx) => (
                          <td key={colIdx} className="px-4 py-2.5 whitespace-nowrap tabular-nums">
                            {String(val)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="rounded-2xl border border-slate-800 bg-[#0D1628] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left font-mono">
              <thead className="bg-[#111D35] text-slate-300 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Log ID</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Entity Type</th>
                  <th className="px-4 py-3">Entity ID</th>
                  <th className="px-4 py-3">IP Address</th>
                  <th className="px-4 py-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {auditLogs.map((log) => (
                  <tr key={log.log_id} className="hover:bg-[#162544]/60 transition-colors">
                    <td className="px-4 py-3 font-bold text-cyan-300">#{log.log_id}</td>
                    <td className="px-4 py-3 text-white font-bold">{log.action}</td>
                    <td className="px-4 py-3">{log.user_name || 'System Admin'}</td>
                    <td className="px-4 py-3 text-cyan-200">{log.entity_type}</td>
                    <td className="px-4 py-3">{log.entity_id}</td>
                    <td className="px-4 py-3 text-slate-400">{log.ip_address}</td>
                    <td className="px-4 py-3 text-slate-500 text-[11px]">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* INSPECT USER MODAL */}
      {inspectedUser && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0D1628] border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 relative text-xs">
            <button
              type="button"
              onClick={() => setInspectedUser(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div>
              <span className="text-[11px] font-mono uppercase text-cyan-400">Account Inspection</span>
              <h3 className="text-lg font-bold text-white mt-0.5">
                {inspectedUser.full_name} (#{inspectedUser.user_id})
              </h3>
              <p className="text-slate-400 font-mono">{inspectedUser.email} · {inspectedUser.phone}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-[#111D35] border border-slate-800 font-mono">
              <div>
                <span className="text-[10px] text-slate-500 block">Wallet Balance</span>
                <span className="text-sm font-bold text-cyan-300">₹{(inspectedUser.wallet_balance ?? 0).toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Driver Earnings</span>
                <span className="text-sm font-bold text-emerald-400">₹{(inspectedUser.earnings_balance ?? 0).toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Bookings Made</span>
                <span className="text-white font-bold">
                  {inspectedUser.passengerBookingsCount ?? 0} ({inspectedUser.completedPassengerTrips ?? 0} done)
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Rides Offered</span>
                <span className="text-white font-bold">{inspectedUser.offeredRidesCount ?? 0}</span>
              </div>
            </div>
            {inspectedUser.isDriverVerified && (
              <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>
                  Verified Driver Vehicle: <strong>{inspectedUser.vehicleModel}</strong> ({inspectedUser.registrationNumber})
                </span>
              </div>
            )}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setInspectedUser(null)}
                className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESOLVE ESCALATED ISSUE MODAL */}
      {resolveTargetIssue && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleResolveEscalatedIssue}
            className="bg-[#0D1628] border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs"
          >
            <div>
              <span className="text-[11px] font-mono uppercase text-emerald-400">Administrator Escalation Review</span>
              <h3 className="text-lg font-bold text-white mt-0.5">
                Resolve Escalated Ticket #{resolveTargetIssue.issue_id}
              </h3>
              <p className="text-slate-300 mt-1">{resolveTargetIssue.description}</p>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Final Status</label>
              <select
                value={adminResolveStatus}
                onChange={(e) => setAdminResolveStatus(e.target.value as any)}
                className="w-full bg-[#111D35] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              >
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Admin Resolution Notes</label>
              <textarea
                rows={3}
                required
                value={adminResolveNotes}
                onChange={(e) => setAdminResolveNotes(e.target.value)}
                placeholder="Document final administrative decision..."
                className="w-full bg-[#111D35] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={() => setResolveTargetIssue(null)}
                className="px-4 py-2 text-slate-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold cursor-pointer"
              >
                Confirm Resolution
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
