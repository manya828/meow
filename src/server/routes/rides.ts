import { Router } from 'express';
import type { Request, Response } from 'express';
import { db } from '../db.ts';
import { getRequestUser, isPassenger, isDriver } from '../auth-utils.ts';

export const ridesRouter = Router();

// Helper to extract clean location keywords for flexible corridor & hub matching
function extractLocationTokens(query: string): string[] {
  const stopWords = new Set([
    'phase', 'road', 'rd', 'gate', 'metro', 'station', 'junction', 'signal',
    'complex', 'park', 'tech', 'hub', 'main', 'cross', 'layout', 'stage',
    'sector', 'flyover', 'bridge', 'mall', 'international', 'corporate', 'office',
    'bus', 'stop', 'terminal', 'satellite', 'town', 'campus', 'block', 'the', 'and',
  ]);
  const cleaned = query
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ') // strip parenthetical qualifiers
    .replace(/[^a-z0-9\s]/g, ' ');
  return cleaned
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 2 && !stopWords.has(w));
}

function rideMatchesQuery(rideText: string, query: string): boolean {
  const normalizedTarget = rideText.toLowerCase();
  const raw = query.toLowerCase().trim();
  if (normalizedTarget.includes(raw)) return true;
  const tokens = extractLocationTokens(query);
  if (tokens.length === 0) return true;
  // Require at least the primary keyword(s) to match
  return tokens.some((tok) => normalizedTarget.includes(tok));
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isRideNearCoords(ride: any, lat: number, lng: number, radiusKm = 6.5): boolean {
  if (haversineKm(lat, lng, ride.origin_lat, ride.origin_lng) <= radiusKm) return true;
  if (haversineKm(lat, lng, ride.destination_lat, ride.destination_lng) <= radiusKm) return true;
  if (ride.stops && ride.stops.some((s: any) => haversineKm(lat, lng, s.stop_lat, s.stop_lng) <= radiusKm)) {
    return true;
  }
  return false;
}

// Search rides with intelligent matching & automatic connecting corridor fallback
ridesRouter.get('/', (req: Request, res: Response) => {
  const { origin, destination, seats, date, corridor, pickupLat, pickupLng, dropoffLat, dropoffLng } = req.query;
  const authUser = getRequestUser(req);

  // Exclude the authenticated user's own offered rides so drivers acting as passengers never see their own rides
  const activePool = db.rides.filter(
    (r) =>
      r.status === 'active' &&
      r.available_seats > 0 &&
      (!authUser || r.driver_id !== authUser.user_id)
  );
  const reqSeats = seats && !isNaN(Number(seats)) ? Number(seats) : 1;
  const seatPool = activePool.filter((r) => r.available_seats >= reqSeats);

  const originStr = typeof origin === 'string' ? origin.trim() : '';
  const destStr = typeof destination === 'string' ? destination.trim() : '';
  const corridorStr = typeof corridor === 'string' ? corridor.trim() : '';

  const pLat = pickupLat ? Number(pickupLat) : undefined;
  const pLng = pickupLng ? Number(pickupLng) : undefined;
  const dLat = dropoffLat ? Number(dropoffLat) : undefined;
  const dLng = dropoffLng ? Number(dropoffLng) : undefined;

  const buildSearchableOrigin = (r: any) =>
    [r.origin_name, r.corridor_name, ...(r.stops || []).map((s: any) => s.stop_name)].join(' ');
  const buildSearchableDest = (r: any) =>
    [r.destination_name, r.corridor_name, ...(r.stops || []).map((s: any) => s.stop_name)].join(' ');

  let filtered = [...seatPool];

  if (originStr) {
    filtered = filtered.filter(
      (r) =>
        rideMatchesQuery(buildSearchableOrigin(r), originStr) ||
        (pLat !== undefined && pLng !== undefined && isRideNearCoords(r, pLat, pLng, 5.5))
    );
  }
  if (destStr) {
    filtered = filtered.filter(
      (r) =>
        rideMatchesQuery(buildSearchableDest(r), destStr) ||
        (dLat !== undefined && dLng !== undefined && isRideNearCoords(r, dLat, dLng, 5.5))
    );
  }
  if (corridorStr) {
    filtered = filtered.filter((r) =>
      rideMatchesQuery(`${r.corridor_name} ${r.origin_name} ${r.destination_name}`, corridorStr)
    );
  }

  let matchType: 'exact' | 'corridor' | 'nearby' = 'exact';
  let matchBanner: string | null = null;

  // Smart fallback 1: If origin AND destination returned 0, show rides matching either endpoint or corridor
  if (filtered.length === 0 && (originStr || destStr || corridorStr)) {
    const partialMatches = seatPool.filter((r) => {
      const fullText = `${r.origin_name} ${r.destination_name} ${r.corridor_name} ${(r.stops || [])
        .map((s: any) => s.stop_name)
        .join(' ')}`;
      const matchO = originStr
        ? rideMatchesQuery(fullText, originStr) ||
          (pLat !== undefined && pLng !== undefined && isRideNearCoords(r, pLat, pLng, 7.5))
        : false;
      const matchD = destStr
        ? rideMatchesQuery(fullText, destStr) ||
          (dLat !== undefined && dLng !== undefined && isRideNearCoords(r, dLat, dLng, 7.5))
        : false;
      const matchC = corridorStr ? rideMatchesQuery(fullText, corridorStr) : false;
      return matchO || matchD || matchC;
    });

    if (partialMatches.length > 0) {
      filtered = partialMatches;
      matchType = 'corridor';
      matchBanner = `Showing ${partialMatches.length} connecting Bengaluru carpool(s) intersecting your requested hubs (${originStr || 'Any'} → ${destStr || 'Any'}).`;
    } else if (seatPool.length > 0) {
      // Smart fallback 2: Always surface active available rides sorted by spatial compatibility instead of dead-ending
      filtered = [...seatPool];
      matchType = 'nearby';
      matchBanner = `No exact direct match for "${originStr || 'origin'} → ${destStr || 'destination'}". Showing ${seatPool.length} active Bengaluru corridor carpools ranked by proximity.`;
    }
  }

  // Compute intelligent route compatibility score for each ride
  const desTime = typeof date === 'string' ? date : undefined;

  const enriched = filtered.map((ride) => {
    const compat = db.calculateRideCompatibility(ride, pLat, pLng, dLat, dLng, desTime);
    return {
      ...ride,
      compatibility_score: compat.score,
      compatibility_reason: compat.reason,
    };
  });

  // Sort by compatibility score descending, then departure time
  enriched.sort((a, b) => (b.compatibility_score || 0) - (a.compatibility_score || 0));

  db.logSql('SELECT * FROM view_active_rides WHERE available_seats > 0;', [], 0.8, 'SUCCESS');

  res.json({
    total: enriched.length,
    matchType,
    matchBanner,
    rides: enriched,
  });
});

// Get single ride details
ridesRouter.get('/:id', (req: Request, res: Response) => {
  const rideId = Number(req.params.id);
  const ride = db.rides.find((r) => r.ride_id === rideId);
  if (!ride) {
    return res.status(404).json({ error: 'Ride not found' });
  }

  // Fetch stops
  const stops = db.stops.filter((s) => s.ride_id === rideId).sort((a, b) => a.stop_order - b.stop_order);
  res.json({
    ...ride,
    stops,
  });
});

// Book seats on a ride (ACID Transaction — reserves seats & creates PENDING unpaid booking; Wallet paid after ride completion)
ridesRouter.post('/:id/book', async (req: Request, res: Response) => {
  const authUser = getRequestUser(req);
  if (!authUser) {
    return res.status(401).json({ error: 'Please sign in or create a Passenger account before booking a ride.' });
  }
  if (!isPassenger(authUser)) {
    return res.status(403).json({ error: 'Only Passenger accounts can book rides. Sign in with a Passenger account to reserve seats.' });
  }

  const rideId = Number(req.params.id);
  const { seatsRequested, pickupPoint, dropoffPoint, dropoffLat, dropoffLng } = req.body;

  if (!seatsRequested || Number(seatsRequested) <= 0) {
    return res.status(400).json({ error: 'Positive seatsRequested is required.' });
  }

  const result = await db.executeSafeBooking({
    passengerId: authUser.user_id,
    rideId,
    seatsRequested: Number(seatsRequested),
    pickupPoint: pickupPoint || '',
    dropoffPoint: dropoffPoint || '',
    dropoffLat: dropoffLat !== undefined ? Number(dropoffLat) : undefined,
    dropoffLng: dropoffLng !== undefined ? Number(dropoffLng) : undefined,
  });

  if (!result.success) {
    const statusCode =
      result.statusCode === 'INSUFFICIENT_SEATS' || result.statusCode === 'CONCURRENT_LOCK_CONFLICT'
        ? 409
        : 400;
    return res.status(statusCode).json({
      error: result.message,
      statusCode: result.statusCode,
    });
  }

  res.status(201).json({
    message: result.message,
    booking: result.booking,
    transaction: result.transaction,
    walletBalance: result.walletBalance,
  });
});

// Publish a new ride (verified Driver accounts only)
ridesRouter.post('/', async (req: Request, res: Response) => {
  const authUser = getRequestUser(req);
  if (!authUser) {
    return res.status(401).json({ error: 'Please sign in with a Driver account to offer a ride.' });
  }
  if (!isDriver(authUser)) {
    return res.status(403).json({ error: 'Only verified Driver accounts can publish rides. Sign in with a Driver account.' });
  }

  const driverProfile = db.drivers.find((d) => d.driver_id === authUser.user_id);
  const driverVehicle = db.vehicles.find((v) => v.driver_id === authUser.user_id);
  if (!driverProfile || !driverVehicle) {
    return res.status(400).json({
      error: 'Please complete your vehicle & driving license registration in the Driver Console before publishing a ride.',
      statusCode: 'DRIVER_PROFILE_REQUIRED',
    });
  }

  const {
    vehicleId,
    originName,
    originLat,
    originLng,
    destinationName,
    destinationLat,
    destinationLng,
    departureTime,
    estimatedArrival,
    distanceKm,
    durationMin,
    totalSeats,
    farePerSeat,
    corridorName,
    notes,
    stops,
  } = req.body;

  if (!originName || !destinationName || !departureTime || !totalSeats || !farePerSeat) {
    return res.status(400).json({ error: 'Missing mandatory ride parameters.' });
  }

  const newRide = await db.publishRide({
    driverId: authUser.user_id,
    vehicleId: driverVehicle.vehicle_id || Number(vehicleId) || 1,
    originName,
    originLat: Number(originLat) || 12.9716,
    originLng: Number(originLng) || 77.5946,
    destinationName,
    destinationLat: Number(destinationLat) || 12.9863,
    destinationLng: Number(destinationLng) || 77.7344,
    departureTime,
    estimatedArrival: estimatedArrival || new Date(new Date(departureTime).getTime() + 60 * 60000).toISOString(),
    distanceKm: Number(distanceKm) || 18.5,
    durationMin: Number(durationMin) || 45,
    totalSeats: Number(totalSeats),
    farePerSeat: Number(farePerSeat),
    corridorName: corridorName || 'Bengaluru Tech Corridor',
    notes,
    stops,
  });

  res.status(201).json({
    message: 'Ride published successfully.',
    ride: newRide,
  });
});

