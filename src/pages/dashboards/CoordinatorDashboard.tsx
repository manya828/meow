import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Search,
  Send,
  RefreshCw,
  UserCheck,
  ArrowUpRight,
  ShieldAlert,
  Layers,
  Clock,
  FileText,
  Radio,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { api } from '../../services/api.ts';
import { CarpoolGroup, IssueReport, IssueStatus } from '../../types';
import { PrivilegedAuthGate } from '../../components/auth/PrivilegedAuthGate.tsx';
import {
  ISSUE_CATEGORY_OPTIONS,
  getIssueStatusStyle,
  getSeverityBadgeStyle,
} from '../../components/issues/IssueSupportPanel.tsx';

interface CoordinatorDashboardProps {
  onNavigateHome?: () => void;
}

export const CoordinatorDashboard: React.FC<CoordinatorDashboardProps> = ({
  onNavigateHome = () => {},
}) => {
  const { user } = useAuth();

  if (!user || user.role !== 'coordinator') {
    return <PrivilegedAuthGate requiredRole="coordinator" onNavigateHome={onNavigateHome} />;
  }

  const [activeTab, setActiveTab] = useState<'issues' | 'groups'>('issues');
  const [overview, setOverview] = useState<any>(null);
  const [issues, setIssues] = useState<IssueReport[]>([]);
  const [groups, setGroups] = useState<CarpoolGroup[]>([]);
  const [selectedIssueId, setSelectedIssueId] = useState<number | null>(null);
  const [syncedAt, setSyncedAt] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Resolution & Reply controls
  const [replyText, setReplyText] = useState('');
  const [statusChoice, setStatusChoice] = useState<IssueStatus>('investigating');
  const [resolutionNotesInput, setResolutionNotesInput] = useState('');
  const [escalateReasonInput, setEscalateReasonInput] = useState('');
  const [showEscalateBox, setShowEscalateBox] = useState(false);

  const [isSyncing, setIsSyncing] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadData = useCallback(
    async (silent = false) => {
      if (!silent) setIsSyncing(true);
      try {
        const [ovRes, issRes, grpRes] = await Promise.all([
          api.getCoordinatorOverview(),
          api.getCoordinatorIssues({
            status: statusFilter,
            severity: severityFilter,
            role: roleFilter,
            category: categoryFilter,
            q: searchQuery,
          }),
          api.getCoordinatorGroups(),
        ]);
        if (ovRes) setOverview(ovRes);
        const list = issRes.issues || [];
        setIssues(list);
        setSyncedAt(issRes.syncedAt || new Date().toISOString());
        setGroups(grpRes.groups || []);
        if (list.length > 0 && (!selectedIssueId || !list.some((i) => i.issue_id === selectedIssueId))) {
          setSelectedIssueId(list[0].issue_id);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!silent) setIsSyncing(false);
      }
    },
    [statusFilter, severityFilter, roleFilter, categoryFilter, searchQuery, selectedIssueId]
  );

  useEffect(() => {
    loadData();
    const timer = setInterval(() => {
      loadData(true);
    }, 4500);
    return () => clearInterval(timer);
  }, [loadData]);

  const selectedIssue = issues.find((i) => i.issue_id === selectedIssueId) || null;

  useEffect(() => {
    if (selectedIssue) {
      setStatusChoice(selectedIssue.status);
      setResolutionNotesInput(selectedIssue.resolution_notes || '');
      setShowEscalateBox(false);
      setEscalateReasonInput('');
    }
  }, [selectedIssue?.issue_id, selectedIssue?.status]);

  const showToast = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 4000);
  };

  const handleAssignSelf = async () => {
    if (!selectedIssue || isMutating) return;
    setIsMutating(true);
    setActionError(null);
    try {
      const res = await api.coordinatorAssignIssue(selectedIssue.issue_id);
      showToast(res.message);
      await loadData(true);
    } catch (err: any) {
      setActionError(err.message || 'Could not assign ticket.');
    } finally {
      setIsMutating(false);
    }
  };

  const handleSaveStatusAndNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIssue || isMutating) return;
    setIsMutating(true);
    setActionError(null);
    try {
      const res = await api.coordinatorUpdateIssueStatus(
        selectedIssue.issue_id,
        statusChoice,
        resolutionNotesInput
      );
      showToast(res.message);
      await loadData(true);
    } catch (err: any) {
      setActionError(err.message || 'Could not update issue status.');
    } finally {
      setIsMutating(false);
    }
  };

  const handleEscalateToAdmin = async () => {
    if (!selectedIssue || isMutating) return;
    setIsMutating(true);
    setActionError(null);
    try {
      const res = await api.coordinatorEscalateIssue(
        selectedIssue.issue_id,
        escalateReasonInput.trim() ||
          resolutionNotesInput.trim() ||
          'Escalated by Coordinator for Administrator policy or financial review.'
      );
      showToast(res.message);
      setShowEscalateBox(false);
      await loadData(true);
    } catch (err: any) {
      setActionError(err.message || 'Escalation failed.');
    } finally {
      setIsMutating(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIssue || !replyText.trim() || isMutating) return;
    setIsMutating(true);
    setActionError(null);
    try {
      await api.coordinatorReplyIssue(selectedIssue.issue_id, replyText.trim());
      setReplyText('');
      await loadData(true);
    } catch (err: any) {
      setActionError(err.message || 'Failed to send reply.');
    } finally {
      setIsMutating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header (Strictly NO DBMS Studio / NO Spatial Matcher) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
            Real-Time Issue Resolution Center · Coordinator
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-0.5">
            Support & Incident Desk · {user.full_name}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Authenticated Coordinator: <span className="text-slate-200 font-mono">{user.email}</span> · Live 4.5s Issue Sync
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <div className="px-3 py-2 rounded-xl bg-[#0D1628] border border-slate-800 text-[11px] font-mono text-slate-300 flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>
              Live Sync {syncedAt ? new Date(syncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '...'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => loadData(false)}
            disabled={isSyncing}
            className="px-4 py-2 rounded-xl bg-[#111D35] hover:bg-[#162544] border border-cyan-500/40 text-cyan-300 font-semibold text-xs transition-colors cursor-pointer flex items-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>Sync Queue</span>
          </button>
        </div>
      </div>

      {/* Live Issue KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="p-3.5 rounded-2xl bg-[#0D1628] border border-slate-800">
          <span className="text-[10px] font-semibold uppercase text-slate-400 block">Total Tickets</span>
          <p className="text-xl font-bold font-mono text-white mt-1 tabular-nums">{overview?.totalIssues ?? issues.length}</p>
        </div>
        <div className="p-3.5 rounded-2xl bg-[#0D1628] border border-amber-500/30">
          <span className="text-[10px] font-semibold uppercase text-amber-300 block">Open / Awaiting</span>
          <p className="text-xl font-bold font-mono text-amber-300 mt-1 tabular-nums">{overview?.openIssues ?? 0}</p>
        </div>
        <div className="p-3.5 rounded-2xl bg-[#0D1628] border border-cyan-500/30">
          <span className="text-[10px] font-semibold uppercase text-cyan-300 block">Investigating</span>
          <p className="text-xl font-bold font-mono text-cyan-300 mt-1 tabular-nums">{overview?.investigatingIssues ?? 0}</p>
        </div>
        <div className="p-3.5 rounded-2xl bg-[#0D1628] border border-rose-500/30">
          <span className="text-[10px] font-semibold uppercase text-rose-300 block">Escalated Admin</span>
          <p className="text-xl font-bold font-mono text-rose-300 mt-1 tabular-nums">{overview?.escalatedIssues ?? 0}</p>
        </div>
        <div className="p-3.5 rounded-2xl bg-[#0D1628] border border-emerald-500/30">
          <span className="text-[10px] font-semibold uppercase text-emerald-400 block">Resolved / Closed</span>
          <p className="text-xl font-bold font-mono text-emerald-400 mt-1 tabular-nums">{overview?.resolvedIssues ?? 0}</p>
        </div>
        <div className="p-3.5 rounded-2xl bg-[#0D1628] border border-slate-800">
          <span className="text-[10px] font-semibold uppercase text-slate-400 block">High / Critical</span>
          <p className="text-xl font-bold font-mono text-rose-400 mt-1 tabular-nums">{overview?.highPriorityIssues ?? 0}</p>
        </div>
        <div className="p-3.5 rounded-2xl bg-[#0D1628] border border-slate-800">
          <span className="text-[10px] font-semibold uppercase text-slate-400 block">Safety Alerts</span>
          <p className="text-xl font-bold font-mono text-red-400 mt-1 tabular-nums">{overview?.safetyIssues ?? 0}</p>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 text-xs">
        <button
          onClick={() => setActiveTab('issues')}
          className={`py-2.5 px-4 font-semibold transition-colors cursor-pointer border-b-2 flex items-center gap-2 ${
            activeTab === 'issues'
              ? 'border-cyan-400 text-cyan-300'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Real-Time Issue Queue ({issues.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('groups')}
          className={`py-2.5 px-4 font-semibold transition-colors cursor-pointer border-b-2 flex items-center gap-2 ${
            activeTab === 'groups'
              ? 'border-cyan-400 text-cyan-300'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Active Carpool Groups ({groups.length})</span>
        </button>
      </div>

      {/* TAB 1: REAL-TIME ISSUE RESOLUTION CENTER */}
      {activeTab === 'issues' && (
        <div className="space-y-4">
          {/* Search & Filters Bar */}
          <div className="p-4 rounded-2xl bg-[#0D1628] border border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs">
            <div className="lg:col-span-2 relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Ticket #, Reporter, Booking #, Description..."
                className="w-full bg-[#111D35] border border-slate-700 rounded-xl pl-8 pr-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#111D35] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
            >
              <option value="all">Status: All</option>
              <option value="open">Open</option>
              <option value="investigating">Investigating</option>
              <option value="escalated">Escalated</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="bg-[#111D35] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
            >
              <option value="all">Severity: All</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-[#111D35] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
            >
              <option value="all">Reporter: All</option>
              <option value="passenger">Passenger</option>
              <option value="driver">Driver</option>
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-[#111D35] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
            >
              <option value="all">Category: All</option>
              {ISSUE_CATEGORY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Queue List */}
            <div className="lg:col-span-5 rounded-2xl bg-[#0D1628] border border-slate-800 p-3 space-y-2 max-h-[720px] overflow-y-auto">
              {issues.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No issue tickets match the selected filters.
                </div>
              ) : (
                issues.map((issue) => (
                  <button
                    key={issue.issue_id}
                    type="button"
                    onClick={() => setSelectedIssueId(issue.issue_id)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                      selectedIssue?.issue_id === issue.issue_id
                        ? 'bg-cyan-950/35 border-cyan-500/60'
                        : 'bg-[#111D35]/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="font-bold text-cyan-300">
                        #{issue.issue_id} · {issue.reported_by_role.toUpperCase()}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${getSeverityBadgeStyle(issue.severity)}`}>
                          {issue.severity}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${getIssueStatusStyle(issue.status)}`}>
                          {issue.status}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs font-bold text-white">
                      {issue.reporter_name}{' '}
                      <span className="text-slate-400 font-normal capitalize">
                        — {issue.category.replace(/_/g, ' ')}
                      </span>
                    </p>
                    <p className="text-[11px] text-slate-400 line-clamp-2">{issue.description}</p>
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1">
                      <span>
                        {issue.booking_id ? `BK #${issue.booking_id}` : issue.ride_id ? `Ride #${issue.ride_id}` : 'General'}
                      </span>
                      <span>
                        {issue.assigned_coordinator_name
                          ? `Assigned: ${issue.assigned_coordinator_name}`
                          : 'Unassigned'}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Detail & Resolution Workspace */}
            <div className="lg:col-span-7">
              {!selectedIssue ? (
                <div className="rounded-2xl bg-[#0D1628] border border-slate-800 p-10 text-center text-xs text-slate-400">
                  Select an issue ticket from the queue to inspect booking/ride context and resolve it.
                </div>
              ) : (
                <div className="rounded-2xl bg-[#0D1628] border border-slate-800 p-5 space-y-5">
                  {/* Ticket Header */}
                  <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-slate-800">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                        <span className="text-cyan-300 font-bold">TICKET #{selectedIssue.issue_id}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getIssueStatusStyle(selectedIssue.status)}`}>
                          {selectedIssue.status}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getSeverityBadgeStyle(selectedIssue.severity)}`}>
                          {selectedIssue.severity}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-200">
                          {selectedIssue.reported_by_role}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-white mt-1.5 capitalize">
                        {selectedIssue.category.replace(/_/g, ' ')}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Reporter: <strong className="text-white">{selectedIssue.reporter_name}</strong> ·{' '}
                        {selectedIssue.assigned_coordinator_name
                          ? `Assigned Coordinator: ${selectedIssue.assigned_coordinator_name}`
                          : 'Unassigned'}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={isMutating}
                        onClick={handleAssignSelf}
                        className="px-3 py-1.5 rounded-xl bg-[#111D35] hover:bg-[#162544] border border-cyan-500/40 text-cyan-300 font-semibold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>
                          {selectedIssue.assigned_coordinator_id === user.user_id ? 'Assigned to You' : 'Assign to Me'}
                        </span>
                      </button>
                      <button
                        type="button"
                        disabled={isMutating}
                        onClick={() => setShowEscalateBox((v) => !v)}
                        className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 font-semibold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" />
                        <span>Escalate to Admin</span>
                      </button>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="p-3.5 rounded-xl bg-[#111D35] border border-slate-800 text-xs text-slate-200 space-y-1">
                    <span className="text-[10px] font-mono uppercase text-slate-400 block">
                      Reported Incident Description
                    </span>
                    <p>{selectedIssue.description}</p>
                  </div>

                  {/* Escalation inline panel */}
                  {showEscalateBox && (
                    <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-500/40 space-y-2.5 text-xs">
                      <span className="text-[11px] font-bold text-rose-300 uppercase tracking-wider block">
                        Escalate Ticket #{selectedIssue.issue_id} to Administrator
                      </span>
                      <input
                        type="text"
                        value={escalateReasonInput}
                        onChange={(e) => setEscalateReasonInput(e.target.value)}
                        placeholder="Escalation justification (policy breach, safety dispute, or financial adjustment review)..."
                        className="w-full bg-[#080E1C] border border-rose-500/40 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setShowEscalateBox(false)}
                          className="px-3 py-1.5 text-slate-400 hover:text-white cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={isMutating}
                          onClick={handleEscalateToAdmin}
                          className="px-4 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-white font-bold cursor-pointer"
                        >
                          Confirm Escalation to Admin
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Read-Only Booking / Ride / Transaction Context */}
                  {(selectedIssue.related_booking ||
                    selectedIssue.related_ride ||
                    (selectedIssue.related_transactions && selectedIssue.related_transactions.length > 0)) && (
                    <div className="p-3.5 rounded-xl bg-[#080E1C] border border-slate-800 space-y-2.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                          Linked Trip & Payment Context (Read-Only)
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">No wallet mutation rights</span>
                      </div>

                      {selectedIssue.related_booking && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2.5 rounded-lg bg-[#111D35] text-[11px]">
                          <div>
                            <span className="text-slate-500 block">Booking</span>
                            <span className="font-mono font-bold text-white">
                              #{selectedIssue.related_booking.booking_id} ({selectedIssue.related_booking.status})
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Segment</span>
                            <span className="text-slate-200">
                              {selectedIssue.related_booking.pickup_point} → {selectedIssue.related_booking.dropoff_point}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Fare & Wallet Status</span>
                            <span className="font-mono text-cyan-300">
                              ₹{Number(selectedIssue.related_booking.total_fare || 0).toFixed(2)} ·{' '}
                              {selectedIssue.related_booking.payment_status?.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      )}

                      {selectedIssue.related_ride && (
                        <div className="p-2.5 rounded-lg bg-[#111D35] text-[11px] flex flex-wrap items-center justify-between gap-2">
                          <span>
                            <strong className="font-mono text-cyan-300">Ride #{selectedIssue.related_ride.ride_id}:</strong>{' '}
                            {selectedIssue.related_ride.origin_name} → {selectedIssue.related_ride.destination_name}
                          </span>
                          <span className="font-mono text-slate-400">
                            {selectedIssue.related_ride.driver_name} · {selectedIssue.related_ride.vehicle_model} (
                            {selectedIssue.related_ride.status})
                          </span>
                        </div>
                      )}

                      {selectedIssue.related_transactions && selectedIssue.related_transactions.length > 0 && (
                        <div className="space-y-1">
                          {selectedIssue.related_transactions.map((txn) => (
                            <div
                              key={txn.transaction_id}
                              className="flex items-center justify-between px-2.5 py-1.5 rounded bg-[#111D35] font-mono text-[10px] text-slate-300"
                            >
                              <span>
                                {txn.transaction_id} · {txn.transaction_type}
                              </span>
                              <span>
                                ₹{txn.amount.toFixed(2)} ({txn.payment_status.toUpperCase()})
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Status & Resolution Notes Update Form */}
                  <form onSubmit={handleSaveStatusAndNotes} className="p-4 rounded-xl bg-[#111D35] border border-slate-800 space-y-3 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Update Status & Resolution Notes</span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        {(['open', 'investigating', 'resolved', 'closed'] as IssueStatus[]).map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => setStatusChoice(st)}
                            className={`px-2.5 py-1 rounded-lg font-mono text-[10px] font-bold uppercase cursor-pointer border ${
                              statusChoice === st
                                ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                                : 'bg-[#080E1C] text-slate-300 border-slate-700 hover:border-slate-500'
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    </div>

                    <textarea
                      rows={2}
                      value={resolutionNotesInput}
                      onChange={(e) => setResolutionNotesInput(e.target.value)}
                      placeholder="Document operational findings, passenger/driver outreach, or final resolution notes..."
                      className="w-full bg-[#080E1C] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                    />

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={isMutating}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs cursor-pointer disabled:opacity-50"
                      >
                        Save Status & Notes
                      </button>
                    </div>
                  </form>

                  {/* Two-Way Conversation Thread */}
                  <div className="space-y-2.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                      Two-Way Ticket Conversation
                    </span>
                    <div className="space-y-2 max-h-56 overflow-y-auto p-3 rounded-xl bg-[#080E1C] border border-slate-800">
                      {(selectedIssue.messages || []).map((m) => {
                        const isStaff = m.sender_role === 'coordinator' || m.sender_role === 'admin';
                        return (
                          <div
                            key={m.message_id}
                            className={`p-2.5 rounded-xl text-xs border ${
                              isStaff
                                ? 'bg-cyan-950/30 border-cyan-500/30 text-cyan-100'
                                : 'bg-[#111D35] border-slate-800 text-slate-200'
                            }`}
                          >
                            <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                              <span className={isStaff ? 'text-cyan-300 font-bold' : 'text-slate-300 font-bold'}>
                                {m.sender_name} ({m.sender_role})
                              </span>
                              <span className="text-slate-500">
                                {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p>{m.message}</p>
                          </div>
                        );
                      })}
                    </div>

                    <form onSubmit={handleSendReply} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder={`Reply to ${selectedIssue.reporter_name} (${selectedIssue.reported_by_role})...`}
                        className="flex-1 bg-[#111D35] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                      />
                      <button
                        type="submit"
                        disabled={isMutating || !replyText.trim()}
                        className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Send Reply</span>
                      </button>
                    </form>
                  </div>

                  {/* Audit Resolution History */}
                  {selectedIssue.resolution_history && selectedIssue.resolution_history.length > 0 && (
                    <div className="pt-3 border-t border-slate-800 space-y-1.5">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        <span>Resolution Audit History</span>
                      </span>
                      <div className="space-y-1">
                        {selectedIssue.resolution_history.map((h) => (
                          <div key={h.history_id} className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-400">
                            <span>
                              <strong className="text-slate-200">{h.action}</strong> by {h.actor_name} ({h.actor_role}) →{' '}
                              <span className="text-cyan-300">{h.new_status}</span>
                              {h.notes ? ` · "${h.notes}"` : ''}
                            </span>
                            <span className="text-slate-500">
                              {new Date(h.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ACTIVE CARPOOL GROUPS (Secondary Operational View) */}
      {activeTab === 'groups' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {groups.map((g) => (
            <div key={g.group_id} className="p-5 rounded-2xl bg-[#0D1628] border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-mono text-cyan-300 text-xs font-bold">GROUP #{g.group_id}</span>
                  <h4 className="text-sm font-bold text-white mt-0.5">{g.group_name}</h4>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 uppercase font-mono">
                  {g.status}
                </span>
              </div>

              <div className="text-xs text-slate-300 space-y-1 bg-[#111D35] p-3 rounded-xl border border-slate-800">
                <p>
                  <span className="text-slate-500">Corridor:</span> {g.corridor_name}
                </p>
                <p>
                  <span className="text-slate-500">Designated Driver:</span>{' '}
                  <strong className="text-white">{g.driver_name}</strong> ({g.vehicle_model})
                </p>
                <p>
                  <span className="text-slate-500">Coordinator:</span> {g.coordinator_name || user.full_name}
                </p>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                  Active Commuter Members:
                </span>
                <div className="space-y-1.5">
                  {g.members.map((m) => (
                    <div key={m.member_id} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-[#080E1C] text-xs">
                      <span className="font-medium text-white">{m.passenger_name}</span>
                      <span className="font-mono text-cyan-400">{m.seats} Seat(s)</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
