import React from 'react';
import { Search, Compass, ShieldCheck, Leaf } from 'lucide-react';

export const HowItWorks: React.FC = () => {
  const steps = [
    {
      num: '01',
      title: 'Find or Publish Your Route',
      desc: 'Passengers search by Bengaluru origin, destination, and departure time. Drivers publish regular daily commutes along tech corridors.',
      icon: Search,
    },
    {
      num: '02',
      title: 'Intelligent Spatial Matching',
      desc: 'Our algorithm evaluates corridor overlap, intermediate waypoints, and proximity scores to pair compatible co-travellers.',
      icon: Compass,
    },
    {
      num: '03',
      title: 'ACID Transactional Booking',
      desc: 'Pessimistic row locking ensures zero overbooking or dirty reads. Fares are held securely and settled upon verified arrival.',
      icon: ShieldCheck,
    },
    {
      num: '04',
      title: 'Decongest Bengaluru Roads',
      desc: 'Each shared ride eliminates single-occupancy vehicles, reducing commute expenses by up to 60% and offsetting CO₂.',
      icon: Leaf,
    },
  ];

  return (
    <section className="py-20 bg-[#080E1C] border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <p className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-2">
            Seamless Commute Architecture
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            How CarpoolX Transforms Your Commute
          </h2>
          <p className="text-sm text-slate-400 mt-3 leading-relaxed">
            From smart pickup matching along the Outer Ring Road to verified transactional reservations, experience next-generation mobility.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.num}
                className="relative rounded-2xl bg-[#0D1628] border border-slate-800/90 p-6 hover:border-slate-700 transition-all group"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono text-2xl font-black text-cyan-500/40 group-hover:text-cyan-400 transition-colors">
                    {s.num}
                  </span>
                  <div className="w-10 h-10 rounded-xl bg-blue-600/15 border border-blue-500/20 flex items-center justify-center text-cyan-400">
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
                <h3 className="text-base font-bold text-white mb-2">{s.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{s.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
