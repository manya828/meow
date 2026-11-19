import React from 'react';
import { ShieldCheck, TrendingUp, Users, DollarSign, Award, Quote } from 'lucide-react';

export const StatsAndProof: React.FC = () => {
  const stats = [
    { label: 'Registered Commuters', value: '1,280+', subtext: 'Verified Tech Employees' },
    { label: 'Bengaluru Rides Coordinated', value: '3,450', subtext: 'High-Occupancy Carpools' },
    { label: 'CO₂ Emissions Offset', value: '14.8 Tons', subtext: 'Environmental Green Ledger' },
    { label: 'Average Commuter Savings', value: '58%', subtext: 'Compared to Solo Cabs' },
  ];

  const testimonials = [
    {
      name: 'Karthik Rao',
      role: 'Lead Systems Architect',
      org: 'Infosys (Electronic City)',
      quote:
        'Before CarpoolX, I spent ₹900 every day on solo cabs from Indiranagar to E-City. Sharing an EV carpool reduced my daily commute cost to ₹180 while saving 142 kg of CO₂ monthly.',
      avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=120',
    },
    {
      name: 'Sunita Hegde',
      role: 'Senior Staff Engineer & EV Driver',
      org: 'Whitefield Tech Spine',
      quote:
        'Offering 3 seats in my Ioniq 5 along the Marathahalli Outer Ring Road covers 100% of my charging costs. The automated seat capacity locking means zero booking disputes.',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120',
    },
    {
      name: 'Priya Nair',
      role: 'Corporate Carpool Coordinator',
      org: 'Outer Ring Road Mobility Cell',
      quote:
        'The intelligent matching matrix allows us to pair hundreds of commuters with zero manual spreadsheets. The relational database views give us complete visibility over trip occupancy.',
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120',
    },
  ];

  return (
    <section className="py-20 bg-[#060A14] border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-6">
        {/* KPI Strip */}
        <div className="rounded-2xl bg-[#0D1628] border border-slate-800 p-8 mb-16 shadow-xl">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((s, idx) => (
              <div key={idx} className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  {s.label}
                </span>
                <p className="text-3xl sm:text-4xl font-extrabold font-mono text-cyan-400 tracking-tight">
                  {s.value}
                </p>
                <p className="text-xs text-slate-500">{s.subtext}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Testimonials */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-2">
            Commuter Testimonials
          </p>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">
            Trusted by Bengaluru's Tech Workforce
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, idx) => (
            <div
              key={idx}
              className="rounded-2xl bg-[#0D1628] border border-slate-800/90 p-6 flex flex-col justify-between hover:border-slate-700 transition-colors"
            >
              <div>
                <Quote className="w-6 h-6 text-cyan-500/30 mb-3" />
                <p className="text-xs text-slate-300 leading-relaxed mb-6 italic">
                  "{t.quote}"
                </p>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-slate-800">
                <img
                  src={t.avatar}
                  alt={t.name}
                  className="w-10 h-10 rounded-full object-cover border border-cyan-500/30"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <h4 className="text-xs font-bold text-white">{t.name}</h4>
                  <p className="text-[11px] text-slate-400">{t.role}</p>
                  <p className="text-[10px] text-cyan-400 font-mono mt-0.5">{t.org}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
