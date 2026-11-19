import React, { useState, useEffect } from 'react';
import {
  X,
  Lock,
  Mail,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  UserCheck,
  Car,
  Compass,
  ShieldCheck,
  UserPlus,
  LogIn,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { UserRole } from '../../types';

export const LoginModal: React.FC = () => {
  const {
    isLoginModalOpen,
    closeLoginModal,
    login,
    register,
    authModalStep,
    setAuthModalStep,
    selectedAuthRole,
    setSelectedAuthRole,
    authModalMode,
    setAuthModalMode,
  } = useAuth();

  // Sign-in form state (always blank — no hardcoded/pre-filled passwords)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Shared registration fields
  const [fullName, setFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [phone, setPhone] = useState('+91 ');
  const [regPassword, setRegPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Passenger-specific fields
  const [corporateDomain, setCorporateDomain] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('+91 ');

  // Driver-specific fields (required when registering as Driver)
  const [licenseNumber, setLicenseNumber] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [vehicleType, setVehicleType] = useState<'sedan' | 'suv' | 'hatchback' | 'ev_crossover'>('sedan');
  const [fuelType, setFuelType] = useState<'electric' | 'petrol' | 'diesel' | 'cng'>('electric');
  const [vehicleColor, setVehicleColor] = useState('');
  const [totalCapacity, setTotalCapacity] = useState<number>(4);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setError(null);
    setPassword('');
    setEmail('');
  }, [isLoginModalOpen, selectedAuthRole, authModalMode, authModalStep]);

  if (!isLoginModalOpen) return null;

  const handleSelectRole = (roleChoice: UserRole) => {
    setSelectedAuthRole(roleChoice);
    setError(null);
    if (roleChoice === 'coordinator' || roleChoice === 'admin') {
      setAuthModalMode('login');
    } else if (authModalMode !== 'register' && authModalMode !== 'login') {
      setAuthModalMode('login');
    }
    setAuthModalStep('auth');
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await login(email.trim(), password, selectedAuthRole || undefined);
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your email and password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedAuthRole !== 'passenger' && selectedAuthRole !== 'driver') {
      setError('Coordinator and Admin accounts cannot be created via signup.');
      return;
    }
    if (regPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (regPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (
      selectedAuthRole === 'driver' &&
      (!licenseNumber.trim() || !vehicleModel.trim() || !registrationNumber.trim())
    ) {
      setError('Driver registration requires your driving license number, vehicle model, and registration number.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await register({
        role: selectedAuthRole,
        fullName: fullName.trim(),
        email: regEmail.trim(),
        phone: phone.trim(),
        password: regPassword,
        ...(selectedAuthRole === 'passenger'
          ? {
              corporateDomain: corporateDomain.trim() || undefined,
              emergencyContact: emergencyContact.trim() !== '+91' ? emergencyContact.trim() : phone.trim(),
            }
          : {
              licenseNumber: licenseNumber.trim(),
              vehicleModel: vehicleModel.trim(),
              registrationNumber: registrationNumber.trim(),
              vehicleType,
              fuelType,
              vehicleColor: vehicleColor.trim() || 'Titanium Grey',
              totalCapacity,
            }),
      });
    } catch (err: any) {
      setError(err.message || 'Account creation failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isPrivileged = selectedAuthRole === 'coordinator' || selectedAuthRole === 'admin';
  const isDriverRole = selectedAuthRole === 'driver';

  const roleCards: {
    id: UserRole;
    title: string;
    subtitle: string;
    badge: string;
    icon: React.ReactNode;
    accent: string;
  }[] = [
    {
      id: 'passenger',
      title: 'Passenger',
      subtitle:
        'Existing Passenger Sign In or New Registration — search active carpools, edit pending dropoffs, and pay via Wallet after ride completion.',
      badge: 'Passenger Portal · ₹700 Wallet',
      icon: <UserCheck className="w-5 h-5 text-cyan-400" />,
      accent: 'border-cyan-500/30 hover:border-cyan-400/70 hover:bg-[#132242]',
    },
    {
      id: 'driver',
      title: 'Driver',
      subtitle:
        'Existing Driver Sign In or New Registration — verify your license & vehicle once, publish rides, manage requests, and track settled earnings.',
      badge: 'Driver Portal · Vehicle Verified',
      icon: <Car className="w-5 h-5 text-emerald-400" />,
      accent: 'border-emerald-500/30 hover:border-emerald-400/70 hover:bg-[#10293d]',
    },
    {
      id: 'coordinator',
      title: 'Coordinator',
      subtitle: 'Single authorized Bengaluru corridor coordinator desk.',
      badge: 'Single Operator · Password Only',
      icon: <Compass className="w-5 h-5 text-amber-400" />,
      accent: 'hover:border-amber-400/60 hover:bg-[#1E1D33]',
    },
    {
      id: 'admin',
      title: 'Admin',
      subtitle: 'Single authorized platform & database administrator console.',
      badge: 'Single Operator · Password Only',
      icon: <ShieldCheck className="w-5 h-5 text-rose-400" />,
      accent: 'hover:border-rose-400/60 hover:bg-[#241630]',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div
        className={`border rounded-3xl w-full p-6 sm:p-7 shadow-2xl relative text-slate-200 transition-all my-auto ${
          authModalStep === 'role_select'
            ? 'max-w-2xl bg-[#0B1428] border-slate-700'
            : isPrivileged
            ? 'max-w-md bg-[#0B1428] border-cyan-500/50 shadow-cyan-950/60 ring-1 ring-cyan-500/30'
            : 'max-w-lg bg-[#0D1628] border-slate-700'
        }`}
      >
        <button
          onClick={closeLoginModal}
          aria-label="Close authentication modal"
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* STEP 1: IDENTITY GATEWAY */}
        {authModalStep === 'role_select' && (
          <div className="space-y-5">
            <div>
              <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">
                CarpoolX Identity Gateway
              </span>
              <h3 className="text-2xl font-extrabold text-white mt-1">
                Select Your Portal to Sign In or Register
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Passenger and Driver accounts are strictly separated. Existing Passengers sign in via the Passenger portal, existing Drivers via the Driver portal.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {roleCards.map((card) => (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => handleSelectRole(card.id)}
                  className={`p-4 rounded-2xl bg-[#111D35] border border-slate-800 text-left transition-all cursor-pointer flex flex-col justify-between gap-3 ${card.accent}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-10 h-10 rounded-xl bg-[#080E1C] border border-slate-800 flex items-center justify-center shrink-0">
                      {card.icon}
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#080E1C] border border-slate-800 text-slate-300">
                      {card.badge}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white flex items-center justify-between">
                      <span>{card.title}</span>
                      <ArrowRight className="w-4 h-4 text-slate-400" />
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{card.subtitle}</p>
                  </div>
                </button>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>Want to look around first?</span>
              <button
                type="button"
                onClick={closeLoginModal}
                className="text-cyan-400 hover:underline font-semibold cursor-pointer"
              >
                Browse Public Rides as Guest →
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: ACCOUNT AUTH */}
        {authModalStep === 'auth' && selectedAuthRole && (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => {
                setAuthModalStep('role_select');
                setSelectedAuthRole(null);
                setError(null);
              }}
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Portal Selection</span>
            </button>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">
                  {isPrivileged
                    ? 'Restricted Operator Access'
                    : isDriverRole
                    ? 'Dedicated Driver Portal'
                    : 'Dedicated Passenger Portal'}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold uppercase ${
                    isDriverRole
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : isPrivileged
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-cyan-500/20 text-cyan-300'
                  }`}
                >
                  {selectedAuthRole}
                </span>
              </div>
              <h3 className="text-xl font-extrabold text-white">
                {isPrivileged
                  ? `${selectedAuthRole === 'admin' ? 'Administrator' : 'Coordinator'} Sign In`
                  : authModalMode === 'register'
                  ? isDriverRole
                    ? 'Create Driver Account'
                    : 'Create Passenger Account'
                  : isDriverRole
                  ? 'Existing Driver Sign In'
                  : 'Existing Passenger Sign In'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {isPrivileged
                  ? `Single authorized ${selectedAuthRole} account only. Enter your credentials manually to unlock this dashboard.`
                  : authModalMode === 'register'
                  ? isDriverRole
                    ? 'Register your driving license and vehicle details to publish rides and receive passenger payouts.'
                    : 'The first time you create an account as a Passenger, you start with ₹700 in your CarpoolX Wallet by default for post-ride settlements.'
                  : isDriverRole
                  ? 'Sign in with your existing Driver email and password to manage rides and passenger requests.'
                  : 'Sign in with your existing Passenger email and password to book rides and manage your Wallet.'}
              </p>
            </div>

            {!isPrivileged && (
              <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#080E1C] border border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setAuthModalMode('login');
                    setError(null);
                  }}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    authModalMode === 'login'
                      ? isDriverRole
                        ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                        : 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>{isDriverRole ? 'Driver Sign In' : 'Passenger Sign In'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthModalMode('register');
                    setError(null);
                  }}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    authModalMode === 'register'
                      ? isDriverRole
                        ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                        : 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{isDriverRole ? 'New Driver Signup' : 'New Passenger Signup'}</span>
                </button>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* LOGIN FORM */}
            {(isPrivileged || authModalMode === 'login') && (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    {isPrivileged
                      ? 'Authorized Operator Email'
                      : isDriverRole
                      ? 'Registered Driver Email'
                      : 'Registered Passenger Email'}
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={
                        selectedAuthRole === 'admin'
                          ? 'Enter administrator email'
                          : selectedAuthRole === 'coordinator'
                          ? 'Enter coordinator email'
                          : isDriverRole
                          ? 'Enter your Driver email'
                          : 'Enter your Passenger email'
                      }
                      className="w-full bg-[#111D35] border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="password"
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password manually"
                      className="w-full bg-[#111D35] border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full py-2.5 px-4 rounded-xl text-white font-bold text-xs transition-all shadow-md disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 ${
                    isDriverRole
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 shadow-emerald-500/20'
                      : 'bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 shadow-cyan-500/20'
                  }`}
                >
                  {isSubmitting
                    ? 'Verifying Credentials...'
                    : isPrivileged
                    ? `Sign In as ${selectedAuthRole}`
                    : isDriverRole
                    ? 'Sign In to Driver Portal'
                    : 'Sign In to Passenger Portal'}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>
            )}

            {/* DEDICATED REGISTRATION FORM */}
            {!isPrivileged && authModalMode === 'register' && (
              <form onSubmit={handleRegisterSubmit} className="space-y-3.5 max-h-[65vh] overflow-y-auto pr-1">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={isDriverRole ? 'e.g. Rajesh Kumar' : 'e.g. Pooja Annapureddy'}
                    className="w-full bg-[#111D35] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full bg-[#111D35] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Mobile Number
                    </label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98450 00000"
                      className="w-full bg-[#111D35] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                {!isDriverRole && (
                  <>
                    <div className="p-3 rounded-xl bg-cyan-950/35 border border-cyan-500/35 text-xs text-cyan-200 flex items-center justify-between gap-2">
                      <span>First-time Passenger accounts start with <strong className="text-white">₹700.00</strong> in your CarpoolX Wallet by default.</span>
                      <span className="font-mono font-bold text-emerald-300 shrink-0">₹700 Default</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                          Organization / Workplace (Optional)
                        </label>
                        <input
                          type="text"
                          value={corporateDomain}
                          onChange={(e) => setCorporateDomain(e.target.value)}
                          placeholder="e.g. Infosys, TechCorp"
                          className="w-full bg-[#111D35] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                          Emergency Contact (Optional)
                        </label>
                        <input
                          type="tel"
                          value={emergencyContact}
                          onChange={(e) => setEmergencyContact(e.target.value)}
                          placeholder="+91 98800 00000"
                          className="w-full bg-[#111D35] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                        />
                      </div>
                    </div>
                  </>
                )}

                {isDriverRole && (
                  <div className="p-3.5 rounded-xl bg-[#111D35] border border-emerald-500/30 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
                      <Car className="w-4 h-4 text-emerald-400" />
                      <span>Required Driver License &amp; Vehicle Details</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-0.5">
                          Driving License Number *
                        </label>
                        <input
                          type="text"
                          required
                          value={licenseNumber}
                          onChange={(e) => setLicenseNumber(e.target.value)}
                          placeholder="KA-01-2022-0091823"
                          className="w-full bg-[#080E1C] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-0.5">
                          Vehicle Registration Number *
                        </label>
                        <input
                          type="text"
                          required
                          value={registrationNumber}
                          onChange={(e) => setRegistrationNumber(e.target.value)}
                          placeholder="KA-04-AB-1234"
                          className="w-full bg-[#080E1C] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-0.5">
                          Vehicle Make &amp; Model *
                        </label>
                        <input
                          type="text"
                          required
                          value={vehicleModel}
                          onChange={(e) => setVehicleModel(e.target.value)}
                          placeholder="e.g. Tata Nexon EV"
                          className="w-full bg-[#080E1C] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-0.5">
                          Vehicle Color
                        </label>
                        <input
                          type="text"
                          value={vehicleColor}
                          onChange={(e) => setVehicleColor(e.target.value)}
                          placeholder="e.g. Pearl White"
                          className="w-full bg-[#080E1C] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-0.5">Body Type</label>
                        <select
                          value={vehicleType}
                          onChange={(e) => setVehicleType(e.target.value as any)}
                          className="w-full bg-[#080E1C] border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white"
                        >
                          <option value="sedan">Sedan</option>
                          <option value="suv">SUV</option>
                          <option value="hatchback">Hatchback</option>
                          <option value="ev_crossover">EV Crossover</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-0.5">Fuel</label>
                        <select
                          value={fuelType}
                          onChange={(e) => setFuelType(e.target.value as any)}
                          className="w-full bg-[#080E1C] border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white"
                        >
                          <option value="electric">Electric</option>
                          <option value="petrol">Petrol</option>
                          <option value="diesel">Diesel</option>
                          <option value="cng">CNG</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-0.5">Total Seats</label>
                        <select
                          value={totalCapacity}
                          onChange={(e) => setTotalCapacity(Number(e.target.value))}
                          className="w-full bg-[#080E1C] border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white font-mono"
                        >
                          {[2, 3, 4, 5, 6].map((n) => (
                            <option key={n} value={n}>
                              {n} Seats
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Create Password (min 6 chars)
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="w-full bg-[#111D35] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-[#111D35] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full py-2.5 px-4 rounded-xl text-white font-bold text-xs transition-all shadow-md disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 mt-2 ${
                    isDriverRole
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 shadow-emerald-500/20'
                      : 'bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 shadow-cyan-500/20'
                  }`}
                >
                  {isSubmitting
                    ? 'Creating Account...'
                    : isDriverRole
                    ? 'Create Driver Account'
                    : 'Create Passenger Account'}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

