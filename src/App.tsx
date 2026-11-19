/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Navbar } from './components/common/Navbar.tsx';
import { LandingPage } from './pages/LandingPage.tsx';
import { ExploreRidesPage } from './pages/ExploreRidesPage.tsx';
import { PassengerDashboard } from './pages/dashboards/PassengerDashboard.tsx';
import { DriverDashboard } from './pages/dashboards/DriverDashboard.tsx';
import { CoordinatorDashboard } from './pages/dashboards/CoordinatorDashboard.tsx';
import { AdminDashboard } from './pages/dashboards/AdminDashboard.tsx';
import { SqlWorkbenchModal } from './pages/dbms/SqlWorkbenchModal.tsx';
import { LoginModal } from './components/auth/LoginModal.tsx';
import { RegisterModal } from './components/auth/RegisterModal.tsx';
import { PublishRideModal } from './components/rides/PublishRideModal.tsx';
import { BengaluruMap } from './components/map/BengaluruMap.tsx';

function MainApp() {
  const { role, user, openLoginModal } = useAuth();
  const [currentView, setCurrentView] = useState<'landing' | 'explore' | 'corridors' | 'dashboard'>('landing');
  const [exploreParams, setExploreParams] = useState<{ origin?: string; destination?: string; seats?: number }>({});
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const prevUserIdRef = useRef<number | null>(null);

  useEffect(() => {
    const currentId = user?.user_id ?? null;
    if (prevUserIdRef.current === null && currentId !== null && currentView === 'landing') {
      setCurrentView('dashboard');
    }
    prevUserIdRef.current = currentId;
  }, [user?.user_id, currentView]);

  const handleNavigate = (view: string, params?: any) => {
    if (view === 'explore' && params) {
      setExploreParams(params);
    }
    setCurrentView(view as any);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderDashboard = () => {
    if (!user || !role) {
      return (
        <div className="max-w-lg mx-auto my-12 p-8 rounded-3xl bg-[#0D1628] border border-slate-800 text-center space-y-4">
          <h2 className="text-2xl font-extrabold text-white">Sign In or Create Your Account</h2>
          <p className="text-xs text-slate-400">
            Choose Passenger, Driver, Coordinator, or Admin to open your dedicated CarpoolX console.
          </p>
          <button
            onClick={() => openLoginModal()}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold text-xs cursor-pointer"
          >
            Sign In / Create Account
          </button>
        </div>
      );
    }

    if (role === 'coordinator') {
      return <CoordinatorDashboard onNavigateHome={() => handleNavigate('landing')} />;
    }
    if (role === 'admin') {
      return <AdminDashboard onNavigateHome={() => handleNavigate('landing')} />;
    }
    if (role === 'driver') {
      return <DriverDashboard />;
    }
    return <PassengerDashboard onFindRide={() => handleNavigate('explore')} />;
  };

  return (
    <div className="min-h-screen bg-[#080E1C] text-[#F8FAFC] flex flex-col font-sans">
      <Navbar currentView={currentView} onNavigate={handleNavigate} />

      <main className="flex-1">
        {currentView === 'landing' && (
          <LandingPage
            onNavigate={handleNavigate}
            onOpenPublishModal={() => setIsPublishModalOpen(true)}
          />
        )}

        {currentView === 'explore' && (
          <ExploreRidesPage
            initialOrigin={exploreParams.origin}
            initialDestination={exploreParams.destination}
            initialSeats={exploreParams.seats}
          />
        )}

        {currentView === 'corridors' && (
          <div className="max-w-7xl mx-auto px-6 py-12 space-y-8">
            <div className="text-center max-w-2xl mx-auto">
              <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
                Bengaluru Transit Grid
              </span>
              <h1 className="text-3xl font-extrabold text-white mt-1">
                Bengaluru Tech Corridor Arteries
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Geographic coordinates and live corridor delay telemetry for major employment zones.
              </p>
            </div>
            <BengaluruMap
              onSelectCorridor={(from, to) => handleNavigate('explore', { origin: from, destination: to })}
            />
          </div>
        )}

        {currentView === 'dashboard' && (
          <div className="max-w-7xl mx-auto px-6 py-10">
            {renderDashboard()}
          </div>
        )}
      </main>

      {/* Global Modals */}
      <LoginModal />
      <RegisterModal />
      <SqlWorkbenchModal />

      {isPublishModalOpen && (
        <PublishRideModal
          onClose={() => setIsPublishModalOpen(false)}
          onSuccess={() => {
            handleNavigate('explore');
          }}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

