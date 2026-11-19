import React from 'react';
import { Car, ShieldCheck, Database } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';

export const Footer: React.FC = () => {
  const { openSqlWorkbench, canAccessDbmsStudio } = useAuth();

  return (
    <footer className="bg-[#060A14] border-t border-slate-800/80 text-slate-400 text-xs py-12 px-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
        <div className="space-y-3 md:col-span-1">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
              <Car className="w-4 h-4" />
            </div>
            <span className="text-white font-bold text-lg tracking-tight">
              CARPOOL<span className="text-cyan-400">X</span>
            </span>
          </div>
          <p className="text-slate-400 text-xs leading-relaxed">
            Move Together. Go Further. Intelligent carpooling platform engineered for Bengaluru commuters.
          </p>
          <div className="pt-2 flex items-center gap-3 text-slate-400">
            <span className="flex items-center gap-1.5 font-mono text-[11px] text-slate-300">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Verified Corporate Network
            </span>
          </div>
        </div>

        <div>
          <h4 className="text-white font-semibold text-xs tracking-wider uppercase mb-3">Bengaluru Corridors</h4>
          <ul className="space-y-2 text-slate-400">
            <li>Electronic City Expressway</li>
            <li>Outer Ring Road (ORR) Spine</li>
            <li>Whitefield ITPL Corridor</li>
            <li>Hebbal Aerocity Link</li>
            <li>Banashankari — MG Road CBD</li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-semibold text-xs tracking-wider uppercase mb-3">Platform Roles</h4>
          <ul className="space-y-2 text-slate-400">
            <li>Passenger Ride Search & Booking</li>
            <li>Driver Corridor Publishing</li>
            <li>Coordinator Intelligent Matching</li>
            <li>Administrator Control & Audit Logs</li>
          </ul>
        </div>

        {canAccessDbmsStudio ? (
          <div>
            <h4 className="text-white font-semibold text-xs tracking-wider uppercase mb-3">DBMS Studio</h4>
            <p className="text-slate-400 text-xs mb-3">
              Restricted to Coordinator & Administrator roles. Includes SQL console, relational views, transaction simulator, and 22 test cases.
            </p>
            <button
              onClick={openSqlWorkbench}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#0D1628] hover:bg-[#111D35] border border-cyan-500/30 text-cyan-300 text-xs font-medium transition-colors cursor-pointer"
            >
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              Launch DBMS Studio
            </button>
          </div>
        ) : (
          <div>
            <h4 className="text-white font-semibold text-xs tracking-wider uppercase mb-3">Commuter Safety</h4>
            <ul className="space-y-2 text-slate-400">
              <li>Verified Tech Park Badges</li>
              <li>Real-Time Route Waypoints</li>
              <li>Instant Seat Confirmation</li>
              <li>24/7 Coordinator Escalation</li>
            </ul>
          </div>
        )}
      </div>

      <div className="max-w-7xl mx-auto pt-6 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
        <p>© 2026 CarpoolX Mobility Technologies. Built for Academic DBMS Evaluation & VS Code Portability.</p>
        <div className="flex items-center gap-4">
          <span className="hover:text-slate-300 transition-colors">GitHub Repository Compatible</span>
          <span>·</span>
          <span className="hover:text-slate-300 transition-colors">VS Code & Node.js Native</span>
          <span>·</span>
          <span className="hover:text-slate-300 transition-colors">Bengaluru, India</span>
        </div>
      </div>
    </footer>
  );
};
