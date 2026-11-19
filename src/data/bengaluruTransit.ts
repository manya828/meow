export interface BengaluruNode {
  id: string;
  name: string;
  lat: number;
  lng: number;
  zone: string;
  category: 'tech_park' | 'metro_transit' | 'residential' | 'airport_rail' | 'arterial_junction';
  avgDelayMin: number;
}

export interface TransitCorridor {
  id: string;
  name: string;
  from: string;
  to: string;
  distanceKm: number;
  freeFlowMin: number;
  currentDurationMin: number;
  congestionLevel: string;
  recommendedDeparture: string;
  zone: string;
}

// 52+ comprehensive nodes across all major Bengaluru zones & tech clusters
export const bengaluruNodes: BengaluruNode[] = [
  // --- South Tech & Electronic City Corridor ---
  { id: 'ecity_1', name: 'Electronic City Phase 1 (Infosys/Wipro Gate)', lat: 12.839939, lng: 77.677003, zone: 'South Tech Hub', category: 'tech_park', avgDelayMin: 8 },
  { id: 'ecity_2', name: 'Electronic City Phase 2 (Tech Mahindra/TCS)', lat: 12.846512, lng: 77.689234, zone: 'South Tech Hub', category: 'tech_park', avgDelayMin: 7 },
  { id: 'silkboard', name: 'Central Silk Board Junction', lat: 12.917415, lng: 77.623773, zone: 'South Arterial Choke Point', category: 'arterial_junction', avgDelayMin: 22 },
  { id: 'hsr_sec1', name: 'HSR Layout Sector 1 (27th Main)', lat: 12.911582, lng: 77.644321, zone: 'South Residential & Startups', category: 'residential', avgDelayMin: 11 },
  { id: 'hsr_sec4', name: 'HSR Layout Sector 4 (Agara Lake)', lat: 12.923145, lng: 77.651289, zone: 'South Residential & Startups', category: 'residential', avgDelayMin: 9 },
  { id: 'btm_2nd', name: 'BTM Layout 2nd Stage (Udupi Garden)', lat: 12.916578, lng: 77.610112, zone: 'South Transit Link', category: 'residential', avgDelayMin: 10 },
  { id: 'koramangala_sony', name: 'Koramangala Sony World Signal', lat: 12.935193, lng: 77.624481, zone: 'Central Commute & Startups', category: 'residential', avgDelayMin: 12 },
  { id: 'koramangala_5th', name: 'Koramangala 5th Block (80ft Road)', lat: 12.934412, lng: 77.619023, zone: 'Central Commute & Startups', category: 'residential', avgDelayMin: 10 },
  { id: 'bommanahalli', name: 'Bommanahalli Junction', lat: 12.903829, lng: 77.625121, zone: 'Hosur Road Corridor', category: 'arterial_junction', avgDelayMin: 15 },
  { id: 'kudlu_gate', name: 'Kudlu Gate (Hosur Main Rd)', lat: 12.889412, lng: 77.643892, zone: 'Hosur Road Corridor', category: 'arterial_junction', avgDelayMin: 12 },
  { id: 'bannerghatta_iimb', name: 'Bannerghatta Road (IIMB / Fortis)', lat: 12.895312, lng: 77.599182, zone: 'South Arterial Spine', category: 'tech_park', avgDelayMin: 14 },
  { id: 'arekere', name: 'Arekere MICO Layout (Bannerghatta Rd)', lat: 12.882194, lng: 77.595431, zone: 'South Residential', category: 'residential', avgDelayMin: 8 },
  { id: 'jpnagar_6th', name: 'JP Nagar 6th Phase (Ring Road)', lat: 12.906421, lng: 77.578912, zone: 'South Residential', category: 'residential', avgDelayMin: 7 },
  { id: 'jayanagar_4th', name: 'Jayanagar 4th Block (Shopping Complex)', lat: 12.929869, lng: 77.583344, zone: 'South Residential & Cultural', category: 'residential', avgDelayMin: 6 },
  { id: 'banashankari_bda', name: 'Banashankari BDA Complex (Bus Hub)', lat: 12.925453, lng: 77.546757, zone: 'South Ring Road', category: 'metro_transit', avgDelayMin: 8 },
  { id: 'kanakapura_metro', name: 'Kanakapura Road (Yelachenahalli Metro)', lat: 12.895212, lng: 77.570189, zone: 'South Metro Extension', category: 'metro_transit', avgDelayMin: 6 },

  // --- East & Outer Ring Road (ORR) Tech Spine ---
  { id: 'bellandur_ecospace', name: 'Bellandur RMZ EcoSpace (ORR)', lat: 12.926031, lng: 77.676246, zone: 'ORR Tech Corridor', category: 'tech_park', avgDelayMin: 21 },
  { id: 'rmz_ecoworld', name: 'RMZ Ecoworld Tech Campus (Bellandur)', lat: 12.922145, lng: 77.684123, zone: 'ORR Tech Corridor', category: 'tech_park', avgDelayMin: 22 },
  { id: 'kadubeesanahalli', name: 'Kadubeesanahalli (Prestige Tech Park)', lat: 12.935812, lng: 77.693145, zone: 'ORR Tech Corridor', category: 'tech_park', avgDelayMin: 19 },
  { id: 'marathahalli_bridge', name: 'Marathahalli Multiplex Bridge', lat: 12.956924, lng: 77.701127, zone: 'ORR Spine & Junction', category: 'arterial_junction', avgDelayMin: 18 },
  { id: 'kalamandir', name: 'Marathahalli Kalamandir (ORR)', lat: 12.951234, lng: 77.699823, zone: 'ORR Spine', category: 'arterial_junction', avgDelayMin: 16 },
  { id: 'whitefield_itpl', name: 'Whitefield ITPL (International Tech Park)', lat: 12.986345, lng: 77.734458, zone: 'East Tech Hub', category: 'tech_park', avgDelayMin: 15 },
  { id: 'brookefield', name: 'Brookefield (AECS Layout / SAP Labs)', lat: 12.965412, lng: 77.717892, zone: 'East Tech & Residential', category: 'tech_park', avgDelayMin: 11 },
  { id: 'hoodi', name: 'Hoodi Junction Metro Station', lat: 12.991234, lng: 77.714521, zone: 'East Tech Hub', category: 'metro_transit', avgDelayMin: 10 },
  { id: 'varthur_kodi', name: 'Varthur Kodi Junction', lat: 12.942189, lng: 77.746123, zone: 'East Growth Suburb', category: 'residential', avgDelayMin: 13 },
  { id: 'mahadevapura', name: 'Mahadevapura (Bagmane Constellation)', lat: 12.990145, lng: 77.685231, zone: 'ORR North Extension', category: 'tech_park', avgDelayMin: 14 },
  { id: 'krpuram_rail', name: 'KR Puram Railway Station & Hanging Bridge', lat: 12.998412, lng: 77.684152, zone: 'East Transit Gateway', category: 'airport_rail', avgDelayMin: 20 },
  { id: 'tin_factory', name: 'Tin Factory / Baiyappanahalli Metro', lat: 12.994212, lng: 77.662145, zone: 'East Metro Intermodal', category: 'metro_transit', avgDelayMin: 25 },
  { id: 'indiranagar_100ft', name: 'Indiranagar 100ft Road (CMH Metro)', lat: 12.978369, lng: 77.640836, zone: 'East Metro & High Street', category: 'metro_transit', avgDelayMin: 8 },
  { id: 'domlur_egl', name: 'Domlur Flyover / Embassy GolfLinks (EGL)', lat: 12.958912, lng: 77.644123, zone: 'Central-East Tech Park', category: 'tech_park', avgDelayMin: 13 },
  { id: 'old_airport_rd', name: 'Old Airport Road (Manipal Hospital)', lat: 12.960145, lng: 77.652134, zone: 'Central-East Transit', category: 'arterial_junction', avgDelayMin: 12 },
  { id: 'cv_raman_nagar', name: 'CV Raman Nagar (Bagmane World Tech)', lat: 12.984123, lng: 77.668912, zone: 'East Tech Park', category: 'tech_park', avgDelayMin: 9 },

  // --- North Aerocity & Industrial Corridor ---
  { id: 'hebbal_flyover', name: 'Hebbal Flyover / Esteem Mall', lat: 13.035847, lng: 77.597022, zone: 'North Gateway & Choke Point', category: 'arterial_junction', avgDelayMin: 19 },
  { id: 'manyata_tech', name: 'Manyata Tech Park (Nagawara ORR)', lat: 13.047812, lng: 77.620145, zone: 'North Tech Mega-Campus', category: 'tech_park', avgDelayMin: 18 },
  { id: 'nagawara_junction', name: 'Nagawara Junction (Ring Road)', lat: 13.041234, lng: 77.624156, zone: 'North Ring Road', category: 'arterial_junction', avgDelayMin: 16 },
  { id: 'sahakar_nagar', name: 'Sahakar Nagar Main Road', lat: 13.061234, lng: 77.589123, zone: 'North Residential', category: 'residential', avgDelayMin: 7 },
  { id: 'yelahanka_town', name: 'Yelahanka Satellite Town (NES Bus Stop)', lat: 13.100693, lng: 77.596345, zone: 'North Aerocity Suburb', category: 'residential', avgDelayMin: 6 },
  { id: 'jakkur_flying', name: 'Jakkur Aerodrome (Bellary Road)', lat: 13.078912, lng: 77.599145, zone: 'North Airport Highway', category: 'residential', avgDelayMin: 7 },
  { id: 'airport_blr', name: 'Kempegowda International Airport (BLR T1/T2)', lat: 13.198635, lng: 77.706593, zone: 'International Aviation Hub', category: 'airport_rail', avgDelayMin: 5 },
  { id: 'devanahalli_sez', name: 'Devanahalli Aero IT SEZ', lat: 13.242134, lng: 77.712145, zone: 'North Tech Corridor', category: 'tech_park', avgDelayMin: 4 },
  { id: 'peenya_industrial', name: 'Peenya Industrial Area 1st Stage', lat: 13.032145, lng: 77.518923, zone: 'North-West Industrial Hub', category: 'tech_park', avgDelayMin: 14 },
  { id: 'yeshwanthpur_metro', name: 'Yeshwanthpur Metro & Railway Junction', lat: 13.023412, lng: 77.550123, zone: 'North-West Transit Intermodal', category: 'metro_transit', avgDelayMin: 13 },
  { id: 'rt_nagar', name: 'RT Nagar Post Office (Dinnur Main Rd)', lat: 13.024156, lng: 77.593145, zone: 'North Central Residential', category: 'residential', avgDelayMin: 8 },

  // --- Central CBD & Transit Gateways ---
  { id: 'mg_road_metro', name: 'MG Road Metro Station (Trinity Circle)', lat: 12.975631, lng: 77.606628, zone: 'Central CBD Hub', category: 'metro_transit', avgDelayMin: 9 },
  { id: 'brigade_road', name: 'Brigade Road / Residency Road', lat: 12.971234, lng: 77.607812, zone: 'Central CBD Hub', category: 'residential', avgDelayMin: 11 },
  { id: 'richmond_circle', name: 'Richmond Circle Flyover', lat: 12.964512, lng: 77.598912, zone: 'Central CBD', category: 'arterial_junction', avgDelayMin: 13 },
  { id: 'vidhana_soudha', name: 'Vidhana Soudha (Dr. Ambedkar Veedhi)', lat: 12.979693, lng: 77.590654, zone: 'Central Civic & Metro', category: 'metro_transit', avgDelayMin: 7 },
  { id: 'majestic_ksr', name: 'Majestic / KSR Bengaluru Central Station', lat: 12.978123, lng: 77.569812, zone: 'State Transit Intermodal', category: 'airport_rail', avgDelayMin: 17 },
  { id: 'malleshwaram_8th', name: 'Malleshwaram 8th Cross (Sampige Rd)', lat: 13.003145, lng: 77.571234, zone: 'North-West Cultural & Hub', category: 'residential', avgDelayMin: 9 },
  { id: 'rajajinagar_1st', name: 'Rajajinagar 1st Block (Lulu Mall / Metro)', lat: 12.998912, lng: 77.554123, zone: 'West Commercial Hub', category: 'metro_transit', avgDelayMin: 10 },
  { id: 'basavanagudi', name: 'Basavanagudi Bull Temple Road', lat: 12.941234, lng: 77.568912, zone: 'South Central Heritage', category: 'residential', avgDelayMin: 6 },

  // --- West & Satellite Satellites ---
  { id: 'kengeri_satellite', name: 'Kengeri Satellite Town (Metro Terminal)', lat: 12.909123, lng: 77.485123, zone: 'West Metro & Mysuru Gateway', category: 'metro_transit', avgDelayMin: 5 },
  { id: 'vijayanagar_metro', name: 'Vijayanagar Metro Station', lat: 12.971234, lng: 77.538912, zone: 'West Commercial & Metro', category: 'metro_transit', avgDelayMin: 8 },
  { id: 'mysore_road_bus', name: 'Mysore Road Satellite Bus Station (MCTC)', lat: 12.951234, lng: 77.528912, zone: 'South-West Regional Gateway', category: 'airport_rail', avgDelayMin: 14 },
  { id: 'rr_nagar', name: 'RR Nagar (Global Village Tech Park)', lat: 12.923412, lng: 77.502134, zone: 'West Tech Mega-Campus', category: 'tech_park', avgDelayMin: 8 },
  { id: 'sarjapur_wipro', name: 'Sarjapur Road (Wipro Corporate Office)', lat: 12.911234, lng: 77.689123, zone: 'South-East Tech Corridor', category: 'tech_park', avgDelayMin: 17 },
];

export const keyCorridors: TransitCorridor[] = [
  {
    id: 'corr-01',
    name: 'Silk Board & Hosur Rd Express',
    from: 'Electronic City Phase 1 (Infosys/Wipro Gate)',
    to: 'Indiranagar 100ft Road (CMH Metro)',
    distanceKm: 22.4,
    freeFlowMin: 32,
    currentDurationMin: 52,
    congestionLevel: 'Moderate to Heavy',
    recommendedDeparture: '08:45 AM or 10:15 AM',
    zone: 'South to East',
  },
  {
    id: 'corr-02',
    name: 'Outer Ring Road (ORR) Tech Spine',
    from: 'Whitefield ITPL (International Tech Park)',
    to: 'Koramangala Sony World Signal',
    distanceKm: 18.6,
    freeFlowMin: 28,
    currentDurationMin: 48,
    congestionLevel: 'Heavy (Bellandur Choke Point)',
    recommendedDeparture: '09:00 AM',
    zone: 'East Tech Corridor',
  },
  {
    id: 'corr-03',
    name: 'North-South Tech Meridian',
    from: 'Hebbal Flyover / Esteem Mall',
    to: 'Electronic City Phase 1 (Infosys/Wipro Gate)',
    distanceKm: 34.8,
    freeFlowMin: 50,
    currentDurationMin: 80,
    congestionLevel: 'Heavy (Tin Factory & Silk Board)',
    recommendedDeparture: '07:30 AM',
    zone: 'North to South',
  },
  {
    id: 'corr-04',
    name: 'Airport Tech Express Hyperline',
    from: 'Kempegowda International Airport (BLR T1/T2)',
    to: 'Bellandur RMZ EcoSpace (ORR)',
    distanceKm: 46.2,
    freeFlowMin: 55,
    currentDurationMin: 78,
    congestionLevel: 'Moderate (Hebbal & Nagawara)',
    recommendedDeparture: 'Flight Sync / 08:00 AM',
    zone: 'Airport Express',
  },
  {
    id: 'corr-05',
    name: 'Manyata - Electronic City Tech Shuttle',
    from: 'Manyata Tech Park (Nagawara ORR)',
    to: 'Electronic City Phase 2 (Tech Mahindra/TCS)',
    distanceKm: 31.5,
    freeFlowMin: 45,
    currentDurationMin: 72,
    congestionLevel: 'Heavy at Silk Board',
    recommendedDeparture: '08:15 AM',
    zone: 'North to South',
  },
  {
    id: 'corr-06',
    name: 'South Central Commuter Line',
    from: 'Banashankari BDA Complex (Bus Hub)',
    to: 'MG Road Metro Station (Trinity Circle)',
    distanceKm: 11.2,
    freeFlowMin: 22,
    currentDurationMin: 35,
    congestionLevel: 'Smooth',
    recommendedDeparture: '09:30 AM',
    zone: 'South Central',
  },
  {
    id: 'corr-07',
    name: 'HSR - Prestige Tech Park Commute',
    from: 'HSR Layout Sector 1 (27th Main)',
    to: 'Kadubeesanahalli (Prestige Tech Park)',
    distanceKm: 8.5,
    freeFlowMin: 16,
    currentDurationMin: 32,
    congestionLevel: 'Moderate (Agara Choke Point)',
    recommendedDeparture: '09:15 AM',
    zone: 'ORR Sector',
  },
  {
    id: 'corr-08',
    name: 'Majestic Central - Whitefield ITPL Arc',
    from: 'Majestic / KSR Bengaluru Central Station',
    to: 'Whitefield ITPL (International Tech Park)',
    distanceKm: 23.8,
    freeFlowMin: 40,
    currentDurationMin: 65,
    congestionLevel: 'Heavy at Old Madras Road',
    recommendedDeparture: '08:30 AM',
    zone: 'Central to East',
  },
];
