import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  MessageSquare,
  Plus,
  Send,
  Clock,
  CheckCircle,
  ShieldAlert,
  RefreshCw,
  X,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import { IssueReport, IssueCategory, Booking, Ride } from '../../types';

interface IssueSupportPanelProps {
  role: 'passenger' | 'driver';
  bookings?: Booking[];
  rides?: Ride[];
}

export const ISSUE_CATEGORY_OPTIONS: { value: IssueCategory; label: string }[] = [
  { value: 'driver_delay', label: 'Driver Delay' },
  { value: 'passenger_no_show', label: 'Passenger No-Show' },
  { value: 'driver_unresponsive', label: 'Driver Unresponsive' },
  { value: 'wrong_pickup', label: 'Wrong Pickup Location' },
  { value: 'incorrect_destination', label: 'Incorrect Destination' },
  { value: 'route_deviation', label: 'Route Deviation' },
  { value: 'payment_issue', label: 'Payment / Wallet Deduction Issue' },
  { value: 'refund_not_received', label: 'Refund Not Received' },
  { value: 'cancellation_dispute', label: 'Cancellation Dispute' },
  { value: 'safety_concern', label: 'Safety Concern' },
  { value: 'booking_conflict', label: 'Booking Conflict' },
  { value: 'overbooking_conflict', label: 'Overbooking Conflict' },
  { value: 'vehicle_condition', label: 'Vehicle Condition / Cleanliness' },
  { value: 'billing_issue', label: 'Billing / Fare Calculation Issue' },
  { value: 'technical_error', label: 'Technical App Error' },
  { value: 'misconduct', label: 'Driver / Passenger Misconduct' },
];

export const getIssueStatusStyle = (status: IssueReport['status']) => {
  switch (status) {
    case 'open':
      return 'bg-amber-950/80 text-amber-300 border border-amber-700/70';
    case 'investigating':
      return 'bg-cyan-950/80 text-cyan-300 border border-cyan-700/70';
    case 'escalated':
      return 'bg-rose-950/80 text-rose-300 border border-rose-700/70';
    case 'resolved':
      return 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/70';
    case 'closed':
      return 'bg-slate-800 text-slate-300 border border-slate-700';
    default:
      return 'bg-slate-800 text-slate-300 border border-slate-700';
  }
};

export const getSeverityBadgeStyle = (severity: IssueReport['severity']) => {
  switch (severity) {
    case 'critical':
      return 'bg-red-950 text-red-300 border border-red-700';
    case 'high':
      return 'bg-rose-950 text-rose-300 border border-rose-800';
    case 'medium':
      return 'bg-amber-950 text-amber-300 border border-amber-800';
    case 'low':
    default:
      return 'bg-slate-800 text-slate-300 border border-slate-700';
  }
};

export const IssueSupportPanel: React.FC<IssueSupportPanelProps> = ({
  role,
  bookings = [],
  rides = [],
}) => {
  const [issues, setIssues] = useState<IssueReport[]>([]);
  const [selectedIssueId, setSelectedIssueId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);

  // Create form state
  const [category, setCategory] = useState<IssueCategory>(
    role === 'driver' ? 'passenger_no_show' : 'driver_delay'
  );
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [selectedBookingId, setSelectedBookingId] = useState<string>('');
  const [selectedRideId, setSelectedRideId] = useState<string>('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadIssues = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const res = await api.getMyIssues(role);
      const list = res.issues || [];
      setIssues(list);
      if (list.length > 0 && (!selectedIssueId || !list.some((i) => i.issue_id === selectedIssueId))) {
        setSelectedIssueId(list[0].issue_id);
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    loadIssues();
    const timer = setInterval(() => loadIssues(true), 5000);
    return () => clearInterval(timer);
  }, [role]);

  const selectedIssue = issues.find((i) => i.issue_id === selectedIssueId) || null;

  const handleSubmitIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await api.createIssue({
        reportedByRole: role,
        bookingId: selectedBookingId ? Number(selectedBookingId) : undefined,
        rideId: selectedRideId ? Number(selectedRideId) : undefined,
        category,
        severity,
        description,
      });
      setIsModalOpen(false);
      setDescription('');
      setSelectedBookingId('');
      setSelectedRideId('');
      setBanner(res.message);
      await loadIssues(true);
      if (res.issue) setSelectedIssueId(res.issue.issue_id);
      setTimeout(() => setBanner(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Could not submit issue report.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIssue || !replyText.trim() || isReplying) return;
    setIsReplying(true);
    setError(null);
    try {
      await api.replyToIssue(selectedIssue.issue_id, replyText.trim(), role);
      setReplyText('');
      await loadIssues(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send reply.');
    } finally {
      setIsReplying(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-cyan-400" />
            <span>{role === 'driver' ? 'Driver Support & Operational Issues' : 'Passenger Issues & Coordinator Support'}</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Submit operational, booking, wallet/refund, or safety tickets directly to the Real-Time Coordinator Queue. Auto-syncs every 5s.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => loadIssues(false)}
            className="px-3 py-2 rounded-xl bg-[#111D35] hover:bg-[#162544] border border-slate-700 text-xs text-slate-300 flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setIsModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Report Issue</span>
          </button>
        </div>
      </div>

      {banner && (
        <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{banner}</span>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {isLoading ? (
        <div className="p-8 rounded-2xl bg-[#0D1628] border border-slate-800 text-center text-xs text-slate-400">
          Loading your support tickets...
        </div>
      ) : issues.length === 0 ? (
        <div className="p-8 rounded-2xl bg-[#0D1628] border border-slate-800 text-center space-y-3">
          <MessageSquare className="w-8 h-8 text-slate-600 mx-auto" />
          <p className="text-xs text-slate-400">
            No {role} support tickets submitted yet. Report any delay, pickup/destination mismatch, refund question, or safety concern anytime.
          </p>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-[#111D35] border border-cyan-500/40 text-cyan-300 font-semibold text-xs cursor-pointer"
          >
            Submit Your First Issue
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left: Ticket List */}
          <div className="lg:col-span-5 rounded-2xl bg-[#0D1628] border border-slate-800 p-3 space-y-2 max-h-[540px] overflow-y-auto">
            {issues.map((issue) => (
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
                  <span className="font-bold text-cyan-300">TICKET #{issue.issue_id}</span>
                  <div className="flex items-center gap-1.5">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${getSeverityBadgeStyle(issue.severity)}`}>
                      {issue.severity}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${getIssueStatusStyle(issue.status)}`}>
                      {issue.status}
                    </span>
                  </div>
                </div>
                <p className="text-xs font-bold text-white capitalize">
                  {issue.category.replace(/_/g, ' ')}
                </p>
                <p className="text-[11px] text-slate-400 line-clamp-2">{issue.description}</p>
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1">
                  <span>{issue.assigned_coordinator_name ? `Coord: ${issue.assigned_coordinator_name}` : 'Awaiting Coordinator'}</span>
                  <span>{(issue.messages || []).length} msg(s)</span>
                </div>
              </button>
            ))}
          </div>

          {/* Right: Ticket Detail & Two-Way Coordinator Thread */}
          {selectedIssue && (
            <div className="lg:col-span-7 rounded-2xl bg-[#0D1628] border border-slate-800 p-5 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-2 pb-3 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="text-cyan-300 font-bold">TICKET #{selectedIssue.issue_id}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getIssueStatusStyle(selectedIssue.status)}`}>
                      {selectedIssue.status}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getSeverityBadgeStyle(selectedIssue.severity)}`}>
                      {selectedIssue.severity}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white mt-1 capitalize">
                    {selectedIssue.category.replace(/_/g, ' ')}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                    {selectedIssue.booking_id ? `Booking #${selectedIssue.booking_id} · ` : ''}
                    {selectedIssue.ride_id ? `Ride #${selectedIssue.ride_id} · ` : ''}
                    {selectedIssue.assigned_coordinator_name
                      ? `Assigned to ${selectedIssue.assigned_coordinator_name}`
                      : 'Queued for Coordinator Assignment'}
                  </p>
                </div>
                <span className="text-[10px] font-mono text-slate-500">
                  Updated {new Date(selectedIssue.updated_at || selectedIssue.created_at).toLocaleString()}
                </span>
              </div>

              {selectedIssue.resolution_notes && (
                <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/35 text-xs space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                    Coordinator / Admin Resolution Notes
                  </span>
                  <p className="text-slate-200">{selectedIssue.resolution_notes}</p>
                </div>
              )}

              {/* Message Thread */}
              <div className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                  Live Coordinator Conversation Thread
                </span>
                <div className="space-y-2 max-h-60 overflow-y-auto p-3 rounded-xl bg-[#080E1C] border border-slate-800">
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
              </div>

              {/* Follow-up Reply */}
              <form onSubmit={handleSendReply} className="flex items-center gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write a follow-up update for the coordinator..."
                  className="flex-1 bg-[#111D35] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
                <button
                  type="submit"
                  disabled={isReplying || !replyText.trim()}
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isReplying ? 'Sending...' : 'Reply'}</span>
                </button>
              </form>

              {/* Status Timeline */}
              {selectedIssue.resolution_history && selectedIssue.resolution_history.length > 0 && (
                <div className="pt-2 border-t border-slate-800 space-y-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block">
                    Ticket Audit Timeline
                  </span>
                  <div className="space-y-1">
                    {selectedIssue.resolution_history.map((h) => (
                      <div key={h.history_id} className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                        <span>
                          <strong className="text-slate-200">{h.action}</strong> by {h.actor_name} →{' '}
                          <span className="text-cyan-300">{h.new_status}</span>
                        </span>
                        <span className="text-slate-500">{new Date(h.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Report Issue Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0D1628] border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative space-y-4 text-slate-200">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-cyan-400">
                Real-Time Coordinator Dispatch
              </span>
              <h3 className="text-lg font-bold text-white mt-0.5">
                Report {role === 'driver' ? 'Driver' : 'Passenger'} Issue
              </h3>
            </div>

            <form onSubmit={handleSubmitIssue} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Issue Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as IssueCategory)}
                    className="w-full bg-[#111D35] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    {ISSUE_CATEGORY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Priority / Severity</label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as any)}
                    className="w-full bg-[#111D35] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="low">Low — Advisory</option>
                    <option value="medium">Medium — Standard</option>
                    <option value="high">High — Urgent</option>
                    <option value="critical">Critical — Safety / Escalation</option>
                  </select>
                </div>
              </div>

              {bookings.length > 0 && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Related Booking (Optional)
                  </label>
                  <select
                    value={selectedBookingId}
                    onChange={(e) => {
                      setSelectedBookingId(e.target.value);
                      const found = bookings.find((b) => String(b.booking_id) === e.target.value);
                      if (found) setSelectedRideId(String(found.ride_id));
                    }}
                    className="w-full bg-[#111D35] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="">General Account / Not tied to a specific booking</option>
                    {bookings.map((b) => (
                      <option key={b.booking_id} value={b.booking_id}>
                        Booking #{b.booking_id} · {b.pickup_point} → {b.dropoff_point} ({b.status})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {role === 'driver' && rides.length > 0 && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Related Ride (Optional)
                  </label>
                  <select
                    value={selectedRideId}
                    onChange={(e) => setSelectedRideId(e.target.value)}
                    className="w-full bg-[#111D35] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="">All Rides / General Driver Issue</option>
                    {rides.map((r) => (
                      <option key={r.ride_id} value={r.ride_id}>
                        Ride #{r.ride_id} · {r.origin_name} → {r.destination_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Detailed Description
                </label>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe exactly what happened (location, delay minutes, transaction/booking ref, or safety concern)..."
                  className="w-full bg-[#111D35] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || description.trim().length < 5}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold text-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Dispatching Ticket...' : 'Submit Issue Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
