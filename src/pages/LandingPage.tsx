import React from 'react';
import { HeroSection } from '../components/landing/HeroSection.tsx';
import { HowItWorks } from '../components/landing/HowItWorks.tsx';
import { SmartMatchingShowcase } from '../components/landing/SmartMatchingShowcase.tsx';
import { BengaluruCorridors } from '../components/landing/BengaluruCorridors.tsx';
import { StatsAndProof } from '../components/landing/StatsAndProof.tsx';
import { Footer } from '../components/common/Footer.tsx';
import { ArrowRight, ShieldCheck, Database, Zap, Leaf } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface LandingPageProps {
  onNavigate: (view: string, params?: any) => void;
  onOpenPublishModal: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate, onOpenPublishModal }) => {
  const { openSqlWorkbench, canAccessDbmsStudio } = useAuth();

  const handleHeroSearch = (origin: string, destination: string, seats: number) => {
    onNavigate('explore', { origin, destination, seats });
  };

  const handleCorridorSelect = (origin: string, destination: string) => {
    onNavigate('explore', { origin, destination });
  };

  return (
    <div className="min-h-screen bg-[#080E1C] text-[#F8FAFC]">
      {/* 1. Cinematic Hero */}
      <HeroSection onSearch={handleHeroSearch} onOfferRide={onOpenPublishModal} />

      {/* 2. How It Works */}
      <HowItWorks />

      {/* 3. Smart Matching Showcase */}
      <SmartMatchingShowcase />

      {/* 4. Bengaluru Corridors */}
      <BengaluruCorridors onSelectCorridor={handleCorridorSelect} />

      {/* 5. Benefits of Shared Mobility */}
      <section className="py-20 bg-[#080E1C] border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <p className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-2">
              Economic & Environmental Advantages
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Why Bengaluru Chooses CarpoolX
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-gradient-to-b from-[#0F1B35] to-[#0B1325] border border-cyan-500/20 hover:border-cyan-400/50 transition-all space-y-3 shadow-lg">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600/30 to-cyan-500/30 border border-cyan-400/30 text-cyan-300 flex items-center justify-center">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Save Up to 60% Commute Cost</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Split fuel and toll expenses transparently. Daily solo cab expenses of ₹900 drop to ₹180 along the Hosur Road elevated expressway.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-gradient-to-b from-[#0E212B] to-[#0B1325] border border-emerald-500/20 hover:border-emerald-400/50 transition-all space-y-3 shadow-lg">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600/30 to-teal-500/30 border border-emerald-400/30 text-emerald-300 flex items-center justify-center">
                <Leaf className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Green & Clean Commutes</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Prioritizes electric vehicles (EVs) and high-occupancy crossovers. Each full carpool prevents over 140 kg of greenhouse gases monthly.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-gradient-to-b from-[#171838] to-[#0B1325] border border-violet-500/20 hover:border-violet-400/50 transition-all space-y-3 shadow-lg">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600/30 to-violet-500/30 border border-violet-400/30 text-violet-300 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Verified Tech Workforce</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Every commuter is verified with corporate credentials (Infosys, Wipro, Accenture, Flipkart), with emergency contacts and driver ratings.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Platform Statistics & Proof */}
      <StatsAndProof />

      {/* 8. Call to Action Banner */}
      <section className="py-20 bg-gradient-to-b from-[#060A14] to-[#080E1C] border-b border-slate-800">
        <div className="max-w-5xl mx-auto px-6 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-xs font-medium">
            <span>Production Mobility-Tech Architecture</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Ready to Experience Intelligent Bengaluru Commutes?
          </h2>
          <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto leading-relaxed">
            Join thousands of professionals commuting smarter along Bengaluru's tech corridors with guaranteed ACID reservation safety.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <button
              onClick={() => onNavigate('explore')}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-sm shadow-lg shadow-cyan-500/25 transition-all transform hover:-translate-y-0.5 cursor-pointer flex items-center gap-2"
            >
              <span>Explore Active Rides</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            {canAccessDbmsStudio && (
              <button
                onClick={openSqlWorkbench}
                className="px-6 py-3 rounded-xl bg-[#111D35] hover:bg-[#162544] border border-slate-700 text-slate-200 hover:text-white font-semibold text-sm transition-all cursor-pointer flex items-center gap-2"
              >
                <Database className="w-4 h-4 text-cyan-400" />
                <span>Launch DBMS Studio</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 9. Footer */}
      <Footer />
    </div>
  );
};
