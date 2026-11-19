import React, { useState } from 'react';
import { ShieldAlert, Lock, Mail, ArrowRight, AlertCircle, ArrowLeft, KeyRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';

interface PrivilegedAuthGateProps {
  requiredRole: 'coordinator' | 'admin';
  onNavigateHome: () => void;
  onSuccess?: () => void;
}

export const PrivilegedAuthGate: React.FC<PrivilegedAuthGateProps> = ({
  requiredRole,
  onNavigateHome,
  onSuccess,
}) => {
  const { login } = useAuth();
  const isCoordinator = requiredRole === 'coordinator';

  const defaultTitle = isCoordinator
    ? 'Corporate Mobility Coordinator Portal'
    : 'Platform Database & System Administration';
  const defaultSubtitle = isCoordinator
    ? 'Single-operator real-time incident desk for passenger & driver issue resolution and Admin escalations.'
    : 'Single-operator master RDBMS console, concurrency management, and platform audit logs.';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await login(email.trim(), password, requiredRole);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify your operator credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto my-12 px-4 animate-in fade-in zoom-in-95 duration-200">
      <div className="bg-gradient-to-b from-[#0F1B38] to-[#0A1226] border-2 border-cyan-500/40 rounded-3xl p-8 sm:p-10 shadow-2xl shadow-cyan-950/60 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 text-xs font-semibold">
            <Lock className="w-3.5 h-3.5 text-cyan-400" />
            <span className="uppercase tracking-wider">Restricted Security Perimeter</span>
          </div>

          <span className="px-2.5 py-1 rounded-lg bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 font-mono text-[11px] font-bold uppercase">
            RBAC: {requiredRole}
          </span>
        </div>

        <div className="space-y-2 mb-6">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {defaultTitle}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {defaultSubtitle}
          </p>
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-200 text-xs flex items-center gap-2 mt-3">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Strictly locked to the single authorized {requiredRole}. Enter your email and dedicated password manually to proceed.
            </span>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Authorized Operational Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={isCoordinator ? 'Enter coordinator email' : 'Enter administrator email'}
                className="w-full bg-[#080E1C] border border-slate-700 focus:border-cyan-400 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Security Key / Password
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter security password manually"
                className="w-full bg-[#080E1C] border border-slate-700 focus:border-cyan-400 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors font-mono"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-cyan-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting
                ? 'Verifying Security Clearance...'
                : `Authenticate as ${isCoordinator ? 'Coordinator' : 'Administrator'}`}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-800 text-center">
          <button
            type="button"
            onClick={onNavigateHome}
            className="text-xs text-slate-400 hover:text-white inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Public Commute Portal</span>
          </button>
        </div>
      </div>
    </div>
  );
};
