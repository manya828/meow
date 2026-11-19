import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, PassengerProfile, DriverProfile, Vehicle, WalletLedgerEntry } from '../types';
import { api, setApiAuthToken } from '../services/api.ts';

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  isPassenger: boolean;
  isDriver: boolean;
  hasDriverProfile: boolean;
  passengerProfile: PassengerProfile | null;
  driverProfile: DriverProfile | null;
  vehicle: Vehicle | null;
  walletLedger: WalletLedgerEntry[];
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAuthChecking: boolean;
  canAccessDbmsStudio: boolean;
  login: (email: string, pass: string, expectedRole?: UserRole) => Promise<User>;
  register: (payload: any) => Promise<User>;
  logout: () => void;
  refreshMe: () => Promise<void>;
  openLoginModal: (targetRole?: UserRole, initialMode?: 'login' | 'register') => void;
  closeLoginModal: () => void;
  isLoginModalOpen: boolean;
  authModalStep: 'role_select' | 'auth';
  setAuthModalStep: (step: 'role_select' | 'auth') => void;
  selectedAuthRole: UserRole | null;
  setSelectedAuthRole: (role: UserRole | null) => void;
  authModalMode: 'login' | 'register';
  setAuthModalMode: (mode: 'login' | 'register') => void;
  privilegedRoleTarget: 'coordinator' | 'admin' | null;
  openRegisterModal: (targetRole?: 'passenger' | 'driver') => void;
  closeRegisterModal: () => void;
  isRegisterModalOpen: boolean;
  openSqlWorkbench: () => void;
  closeSqlWorkbench: () => void;
  isSqlWorkbenchOpen: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [passengerProfile, setPassengerProfile] = useState<PassengerProfile | null>(null);
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [walletLedger, setWalletLedger] = useState<WalletLedgerEntry[]>([]);

  const [token, setToken] = useState<string | null>(() =>
    typeof window !== 'undefined' ? window.localStorage.getItem('carpoolx_token') : null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [authModalStep, setAuthModalStep] = useState<'role_select' | 'auth'>('role_select');
  const [selectedAuthRole, setSelectedAuthRole] = useState<UserRole | null>(null);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [isSqlWorkbenchOpen, setIsSqlWorkbenchOpen] = useState(false);

  const isPassenger = Boolean(user && user.role === 'passenger');
  const isDriver = Boolean(user && user.role === 'driver');
  const hasDriverProfile = Boolean(driverProfile && vehicle);
  const canAccessDbmsStudio = Boolean(user && user.role === 'admin');

  const applySession = (data: {
    user: User | null;
    passengerProfile?: PassengerProfile | null;
    driverProfile?: DriverProfile | null;
    vehicle?: Vehicle | null;
    walletLedger?: WalletLedgerEntry[];
    token?: string | null;
  }) => {
    setUser(data.user);
    setPassengerProfile(data.passengerProfile || null);
    setDriverProfile(data.driverProfile || null);
    setVehicle(data.vehicle || null);
    setWalletLedger(data.walletLedger || []);
    if (data.token !== undefined) {
      setApiAuthToken(data.token);
      setToken(data.token);
    }
  };

  const refreshMe = async () => {
    if (!token) {
      setIsAuthChecking(false);
      return;
    }
    try {
      const data = await api.getMe();
      if (data?.user) {
        applySession({
          user: data.user,
          passengerProfile: data.passengerProfile,
          driverProfile: data.driverProfile,
          vehicle: data.vehicle,
          walletLedger: data.walletLedger || [],
        });
      } else {
        applySession({ user: null, token: null });
      }
    } catch {
      applySession({ user: null, token: null });
    } finally {
      setIsAuthChecking(false);
    }
  };

  useEffect(() => {
    setApiAuthToken(token);
  }, [token]);

  useEffect(() => {
    if (!canAccessDbmsStudio && isSqlWorkbenchOpen) {
      setIsSqlWorkbenchOpen(false);
    }
  }, [canAccessDbmsStudio, isSqlWorkbenchOpen]);

  useEffect(() => {
    refreshMe();
  }, []);

  // Prompt unauthenticated visitors first with identity gateway
  useEffect(() => {
    if (!isAuthChecking && !user) {
      const seen =
        typeof window !== 'undefined' ? window.sessionStorage.getItem('carpoolx_role_prompt_seen') : null;
      if (!seen) {
        setAuthModalStep('role_select');
        setSelectedAuthRole(null);
        setAuthModalMode('login');
        setIsLoginModalOpen(true);
        if (typeof window !== 'undefined') {
          window.sessionStorage.setItem('carpoolx_role_prompt_seen', '1');
        }
      }
    }
  }, [isAuthChecking, user]);

  const login = async (email: string, pass: string, expectedRole?: UserRole): Promise<User> => {
    setIsLoading(true);
    try {
      const res = await api.login(email, pass, expectedRole);
      applySession({
        user: res.user,
        passengerProfile: res.passengerProfile,
        driverProfile: res.driverProfile,
        vehicle: res.vehicle,
        walletLedger: res.walletLedger || [],
        token: res.token,
      });
      setIsLoginModalOpen(false);
      setSelectedAuthRole(null);
      if (res.user?.role !== 'admin') {
        setIsSqlWorkbenchOpen(false);
      }
      return res.user;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (payload: any): Promise<User> => {
    setIsLoading(true);
    try {
      const res = await api.register(payload);
      applySession({
        user: res.user,
        passengerProfile: res.passengerProfile,
        driverProfile: res.driverProfile,
        vehicle: res.vehicle,
        walletLedger: res.walletLedger || [],
        token: res.token,
      });
      setIsLoginModalOpen(false);
      setSelectedAuthRole(null);
      setIsSqlWorkbenchOpen(false);
      return res.user;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    applySession({
      user: null,
      passengerProfile: null,
      driverProfile: null,
      vehicle: null,
      walletLedger: [],
      token: null,
    });
    setSelectedAuthRole(null);
    setIsSqlWorkbenchOpen(false);
  };

  const handleOpenLoginModal = (targetRole?: UserRole, initialMode: 'login' | 'register' = 'login') => {
    if (targetRole) {
      setSelectedAuthRole(targetRole);
      setAuthModalStep('auth');
      setAuthModalMode(
        targetRole === 'coordinator' || targetRole === 'admin' ? 'login' : initialMode
      );
    } else {
      setSelectedAuthRole(null);
      setAuthModalStep('role_select');
      setAuthModalMode(initialMode);
    }
    setIsLoginModalOpen(true);
  };

  const handleCloseLoginModal = () => {
    setIsLoginModalOpen(false);
    setSelectedAuthRole(null);
  };

  const handleOpenRegisterModal = (targetRole?: 'passenger' | 'driver') => {
    if (targetRole) {
      setSelectedAuthRole(targetRole);
      setAuthModalStep('auth');
      setAuthModalMode('register');
    } else {
      setSelectedAuthRole(null);
      setAuthModalStep('role_select');
      setAuthModalMode('register');
    }
    setIsLoginModalOpen(true);
  };

  const handleOpenSqlWorkbench = () => {
    if (!canAccessDbmsStudio) return;
    setIsSqlWorkbenchOpen(true);
  };

  const privilegedRoleTarget: 'coordinator' | 'admin' | null =
    selectedAuthRole === 'coordinator' || selectedAuthRole === 'admin' ? selectedAuthRole : null;

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
        isPassenger,
        isDriver,
        hasDriverProfile,
        passengerProfile,
        driverProfile,
        vehicle,
        walletLedger,
        token,
        isAuthenticated: Boolean(user),
        isLoading,
        isAuthChecking,
        canAccessDbmsStudio,
        login,
        register,
        logout,
        refreshMe,
        openLoginModal: handleOpenLoginModal,
        closeLoginModal: handleCloseLoginModal,
        isLoginModalOpen,
        authModalStep,
        setAuthModalStep,
        selectedAuthRole,
        setSelectedAuthRole,
        authModalMode,
        setAuthModalMode,
        privilegedRoleTarget,
        openRegisterModal: handleOpenRegisterModal,
        closeRegisterModal: handleCloseLoginModal,
        isRegisterModalOpen: false,
        openSqlWorkbench: handleOpenSqlWorkbench,
        closeSqlWorkbench: () => setIsSqlWorkbenchOpen(false),
        isSqlWorkbenchOpen,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

