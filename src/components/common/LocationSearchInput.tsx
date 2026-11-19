import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Building2, Train, Home, Plane, Navigation, ChevronDown, Check, X } from 'lucide-react';
import { bengaluruNodes, BengaluruNode } from '../../data/bengaluruTransit.ts';

interface LocationSearchInputProps {
  label?: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  iconColor?: string;
}

export const LocationSearchInput: React.FC<LocationSearchInputProps> = ({
  label,
  value,
  onChange,
  placeholder = 'Select from 52+ Bengaluru map hubs or type...',
  className = '',
  iconColor = 'text-cyan-400',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  // Keep filterText separate so opening a pre-filled input still shows ALL 52+ hubs
  const [filterText, setFilterText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsTyping(false);
        setFilterText('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const query = isTyping ? filterText : '';

  const filteredNodes = bengaluruNodes.filter((node) => {
    const q = query.trim().toLowerCase();
    const matchesSearch =
      !q ||
      node.name.toLowerCase().includes(q) ||
      node.zone.toLowerCase().includes(q) ||
      node.id.toLowerCase().includes(q);
    const matchesCategory =
      selectedCategory === 'all' || node.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryIcon = (category: BengaluruNode['category']) => {
    switch (category) {
      case 'tech_park':
        return <Building2 className="w-3.5 h-3.5 text-cyan-400" />;
      case 'metro_transit':
        return <Train className="w-3.5 h-3.5 text-emerald-400" />;
      case 'airport_rail':
        return <Plane className="w-3.5 h-3.5 text-amber-400" />;
      case 'residential':
        return <Home className="w-3.5 h-3.5 text-indigo-400" />;
      case 'arterial_junction':
      default:
        return <Navigation className="w-3.5 h-3.5 text-rose-400" />;
    }
  };

  const handleSelect = (nodeName: string) => {
    onChange(nodeName);
    setFilterText('');
    setIsTyping(false);
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFilterText(val);
    setIsTyping(true);
    onChange(val);
    setIsOpen(true);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setFilterText('');
    setIsTyping(false);
    setIsOpen(true);
  };

  const handleToggleOpen = () => {
    setIsTyping(false);
    setFilterText('');
    setIsOpen((prev) => !prev);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && (
        <div className="flex items-center justify-between mb-1">
          <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
            {label}
          </label>
          <span className="text-[10px] text-cyan-400 font-mono">{bengaluruNodes.length} Map Hubs</span>
        </div>
      )}

      <div className="relative group">
        <MapPin
          className={`w-4 h-4 ${iconColor} absolute left-3 top-1/2 -translate-y-1/2 transition-transform duration-200 group-focus-within:scale-110 pointer-events-none`}
        />
        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={() => {
            setIsTyping(false);
            setFilterText('');
            setIsOpen(true);
          }}
          placeholder={placeholder}
          className="w-full bg-[#0D1628]/95 border border-slate-700/80 hover:border-cyan-500/50 rounded-xl pl-9 pr-14 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 transition-all shadow-inner"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
          {value && (
            <button
              type="button"
              onClick={handleClear}
              title="Clear location"
              className="text-slate-400 hover:text-rose-400 p-1 rounded cursor-pointer transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={handleToggleOpen}
            title="Show all map locations"
            className="text-slate-400 hover:text-white p-1 rounded cursor-pointer transition-colors"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180 text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Suggestion Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 mt-2 z-[70] bg-[#0A1122] backdrop-blur-xl border border-cyan-500/40 rounded-2xl shadow-2xl shadow-black/70 p-2 text-slate-200 animate-in fade-in slide-in-from-top-2 duration-150 max-h-80 flex flex-col">
          {/* Quick Category Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-800/80 text-[10px] scrollbar-none px-1">
            {[
              { id: 'all', label: `All (${bengaluruNodes.length})` },
              { id: 'tech_park', label: 'Tech Parks' },
              { id: 'metro_transit', label: 'Metro' },
              { id: 'airport_rail', label: 'Airport & Rail' },
              { id: 'residential', label: 'Residential' },
              { id: 'arterial_junction', label: 'Junctions' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setSelectedCategory(cat.id);
                }}
                className={`px-2.5 py-1 rounded-lg whitespace-nowrap font-medium transition-colors cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'bg-[#111D35] text-slate-400 hover:text-white hover:bg-[#162544]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Custom user typed place notice */}
          {isTyping && filterText.trim() && !bengaluruNodes.some((n) => n.name.toLowerCase() === filterText.trim().toLowerCase()) && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(filterText.trim());
              }}
              className="mt-2 p-2 rounded-xl bg-cyan-950/50 border border-cyan-500/35 hover:bg-cyan-900/40 text-xs text-cyan-300 flex items-center justify-between cursor-pointer transition-colors text-left w-full"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Navigation className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <div className="truncate">
                  <p className="font-semibold text-white truncate">Use Custom Place: &ldquo;{filterText.trim()}&rdquo;</p>
                  <p className="text-[10px] text-cyan-400/80">Search or publish with this address</p>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-200 font-mono shrink-0 ml-2">Custom</span>
            </button>
          )}

          {/* Node items list */}
          <div className="overflow-y-auto space-y-1 mt-1 pr-1 flex-1">
            {filteredNodes.length > 0 ? (
              filteredNodes.map((node) => {
                const isSelected = value.toLowerCase() === node.name.toLowerCase();
                return (
                  <button
                    key={node.id}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(node.name);
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-left text-xs transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-500/20 text-white border border-cyan-500/50 shadow-sm'
                        : 'text-slate-300 hover:bg-[#111D35] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <div className="p-1.5 rounded-lg bg-[#162544] shrink-0">
                        {getCategoryIcon(node.category)}
                      </div>
                      <div className="truncate">
                        <p className="font-medium text-white truncate text-xs">{node.name}</p>
                        <p className="text-[10px] text-slate-400 truncate flex items-center gap-1.5">
                          <span>{node.zone}</span>
                          <span className="text-slate-600">·</span>
                          <span className="text-amber-400/90 font-mono">~{node.avgDelayMin}m peak delay</span>
                        </p>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-cyan-400 shrink-0 ml-2" />}
                  </button>
                );
              })
            ) : (
              <div className="py-4 text-center text-xs text-slate-400">
                <p>No hub matching &ldquo;{filterText}&rdquo;</p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Click the Custom Place card above to use &ldquo;{filterText}&rdquo; anyway.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
