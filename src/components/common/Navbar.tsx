import React, { useState } from 'react';
import { Car, ChevronDown, LogOut, LayoutDashboard, UserCheck, Users, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { UserRole } from '../../types';
import { DbStatusBadge } from './DbStatusBadge.tsx';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate }) => {
  const {
    user,
    role,
    isPassenger,
    isDriver,
    logout,
    openLoginModal,
    openRegisterModal,
  } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const roleLabels: Record<UserRole, string> = {
    passenger: 'Passenger',
    driver: 'Driver',
    coordinator: 'Coordinator',
    admin: 'Administrator',
  };

  return (
    <header className="sticky top-0 z-40 bg-[#080E1C]/90 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 py-3.5 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 sm:gap-8">
        {/* ZONE 1: Brand wordmark */}
        <button
          onClick={() => onNavigate('landing')}
          className="flex items-center gap-2.5 text-left text-lg font-bold tracking-tight text-white hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Car className="w-4.5 h-4.5 text-white" />
          </div>
          <span className="font-extrabold text-xl tracking-tight text-white">
            CARPOOL<span className="text-cyan-400">X</span>
          </span>
        </button>

        {/* ZONE 2: Navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
          <button
            onClick={() => onNavigate('landing')}
            className={`transition-colors whitespace-nowrap shrink-0 hover:text-white cursor-pointer ${
              currentView === 'landing' ? 'text-cyan-400 font-semibold' : 'text-slate-300'
            }`}
          >
            Home
          </button>
          <button
            onClick={() => onNavigate('explore')}
            className={`transition-colors whitespace-nowrap shrink-0 hover:text-white cursor-pointer ${
              currentView === 'explore' ? 'text-cyan-400 font-semibold' : 'text-slate-300'
            }`}
          >
            Find Rides
          </button>
          <button
            onClick={() => onNavigate('corridors')}
            className={`transition-colors whitespace-nowrap shrink-0 hover:text-white cursor-pointer ${
              currentView === 'corridors' ? 'text-cyan-400 font-semibold' : 'text-slate-300'
            }`}
          >
            Bengaluru Corridors
          </button>
          {user && role && (
            <button
              onClick={() => onNavigate('dashboard')}
              className={`flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 hover:text-white cursor-pointer ${
                currentView === 'dashboard' ? 'text-cyan-400 font-semibold' : 'text-slate-300'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-cyan-400" />
              {`${roleLabels[role]} Console`}
            </button>
          )}
        </nav>

        {/* ZONE 3: Mobile Find Rides + Account Menu */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('explore')}
            className={`md:hidden px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 cursor-pointer ${
              currentView === 'explore'
                ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-300'
                : 'bg-[#111D35] border-slate-700 text-slate-200'
            }`}
          >
            <Search className="w-3.5 h-3.5 text-cyan-400" />
            <span>Find Rides</span>
          </button>

          <DbStatusBadge />

          {user && role ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#111D35] hover:bg-[#162544] border border-slate-700/80 text-xs font-medium text-white transition-all cursor-pointer whitespace-nowrap shrink-0"
              >
                <div className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-[10px]">
                  {user.full_name.charAt(0).toUpperCase()}
                </div>
                <span className="hidden sm:inline font-medium">{user.full_name}</span>
                {isPassenger && (
                  <>
                    <span className="text-slate-500 text-[10px]">·</span>
                    <span className="font-mono text-[11px] text-emerald-400 font-bold">
                      ₹{(user.wallet_balance ?? 0).toFixed(0)}
                    </span>
                  </>
                )}
                {isDriver && (
                  <>
                    <span className="text-slate-500 text-[10px]">·</span>
                    <span className="font-mono text-[11px] text-emerald-400 font-bold">
                      ₹{(user.earnings_balance ?? 0).toFixed(0)}
                    </span>
                  </>
                )}
                <span className="text-slate-500 text-[10px] hidden sm:inline">·</span>
                <span className="text-cyan-400 capitalize text-[11px] font-semibold hidden sm:inline">
                  {roleLabels[role]}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-xl bg-[#0D1628] border border-slate-700/90 shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3 py-2 border-b border-slate-800 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-white">{user.full_name}</p>
                      <span className="font-mono text-[10px] text-cyan-300">ID #{user.user_id}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                    {isPassenger ? (
                      <div className="p-2 rounded bg-[#111D35] border border-slate-800 font-mono text-[10px] flex items-center justify-between mt-1">
                        <span className="text-slate-400">Passenger Wallet</span>
                        <span className="text-emerald-400 font-bold">
                          ₹{(user.wallet_balance ?? 0).toFixed(2)}
                        </span>
                      </div>
                    ) : isDriver ? (
                      <div className="p-2 rounded bg-[#111D35] border border-slate-800 font-mono text-[10px] flex items-center justify-between mt-1">
                        <span className="text-slate-400">Driver Earnings</span>
                        <span className="text-emerald-400 font-bold">
                          ₹{(user.earnings_balance ?? 0).toFixed(2)}
                        </span>
                      </div>
                    ) : (
                      <p className="text-[10px] text-cyan-400 uppercase font-mono mt-0.5">{roleLabels[role]}</p>
                    )}
                  </div>

                  <div className="py-1 space-y-1">
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onNavigate('dashboard');
                      }}
                      className="w-full flex items-center justify-between px-3 py-1.5 rounded-md text-xs text-slate-200 hover:bg-[#162544] hover:text-white transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
                        {`${roleLabels[role]} Profile & Console`}
                      </span>
                    </button>

                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        openLoginModal();
                      }}
                      className="w-full flex items-center justify-between px-3 py-1.5 rounded-md text-xs text-slate-300 hover:bg-[#162544] hover:text-white transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        Switch Account / Portal
                      </span>
                    </button>
                  </div>

                  <div className="pt-1 mt-1 border-t border-slate-800">
                    <button
                      onClick={() => {
                        logout();
                        setMenuOpen(false);
                        onNavigate('landing');
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-xs text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => openLoginModal()}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                Sign In
              </button>
              <button
                onClick={() => openRegisterModal()}
                className="px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 rounded-lg shadow-md shadow-blue-500/20 transition-all cursor-pointer whitespace-nowrap shrink-0"
              >
                Create Account
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

