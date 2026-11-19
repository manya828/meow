import { Router } from 'express';
import type { Request, Response } from 'express';
import { db } from '../db.ts';
import { getRequestUser, isDriver } from '../auth-utils.ts';

export const driverRouter = Router();

const mapStatusCodeToHttp = (statusCode: string) => {
  if (statusCode === 'UNAUTHORIZED') return 403;
  if (statusCode === 'NOT_FOUND' || statusCode === 'RIDE_MISSING') return 404;
  if (statusCode === 'LOCK_CONFLICT') return 409;
  return 400;
};

// Allow verified Driver accounts to register or update their driving license & vehicle
driverRouter.post('/profile', (req: Request, res: Response) => {
  const authUser = getRequestUser(req);
  if (!authUser || !isDriver(authUser)) {
    return res.status(403).json({ error: 'Only Driver accounts can manage a driver vehicle profile.' });
  }

  const {
    licenseNumber,
    vehicleModel,
    registrationNumber,
    vehicleType,
    fuelType,
    vehicleColor,
    totalCapacity,
  } = req.body;

  if (!licenseNumber?.trim() || !vehicleModel?.trim() || !registrationNumber?.trim()) {
    return res.status(400).json({
      error: 'Driving license number, vehicle model, and registration number are required.',
    });
  }

  const cleanLicense = String(licenseNumber).trim().toUpperCase();
  const cleanReg = String(registrationNumber).trim().toUpperCase();
  const capacityNum = Math.min(7, Math.max(1, Number(totalCapacity) || 4));

  let driverProfile = db.drivers.find((d) => d.driver_id === authUser.user_id);
  if (driverProfile) {
    driverProfile.license_number = cleanLicense;
  } else {
    driverProfile = {
      driver_id: authUser.user_id,
      license_number: cleanLicense,
      license_expiry: '2032-12-31',
      is_verified: true,
      total_earnings: authUser.earnings_balance || 0,
      pending_settlement: 0,
      acceptance_rate: 100.0,
    };
    db.drivers.push(driverProfile);
  }

  let vehicle = db.vehicles.find((v) => v.driver_id === authUser.user_id);
  if (vehicle) {
    vehicle.make_model = String(vehicleModel).trim();
    vehicle.registration_number = cleanReg;
    vehicle.vehicle_type = vehicleType || vehicle.vehicle_type;
    vehicle.fuel_type = fuelType || vehicle.fuel_type;
    vehicle.color = (vehicleColor && String(vehicleColor).trim()) || vehicle.color;
    vehicle.total_capacity = capacityNum;
  } else {
    const newVehicleId = db.vehicles.length > 0 ? Math.max(...db.vehicles.map((v) => v.vehicle_id)) + 1 : 1;
    vehicle = {
      vehicle_id: newVehicleId,
      driver_id: authUser.user_id,
      make_model: String(vehicleModel).trim(),
      registration_number: cleanReg,
      vehicle_type: vehicleType || 'sedan',
      fuel_type: fuelType || 'electric',
      color: (vehicleColor && String(vehicleColor).trim()) || 'Titanium Grey',
      total_capacity: capacityNum,
      is_active: true,
    };
    db.vehicles.push(vehicle);
  }

  db.logSql(
    'INSERT INTO drivers / vehicles ON DUPLICATE KEY UPDATE for user_id = ?;',
    [authUser.user_id],
    0.7,
    'SUCCESS'
  );

  res.json({
    message: 'Vehicle and driving license registered on your account. You can now offer rides!',
    driverProfile,
    vehicle,
  });
});

// Get driver's published rides (for Driver accounts or Admin)
driverRouter.get('/rides', (req: Request, res: Response) => {
  const authUser = getRequestUser(req);
  if (!authUser || (!isDriver(authUser) && authUser.role !== 'admin')) {
    return res.status(403).json({ error: 'Driver authentication required.' });
  }

  const driverId = authUser.role === 'admin' && req.query.driverId
    ? Number(req.query.driverId)
    : authUser.user_id;

  const driverRides = db.rides.filter((r) => r.driver_id === driverId);

  const enriched = driverRides.map((ride) => {
    const rideBookings = db.bookings.filter((b) => b.ride_id === ride.ride_id);
    return {
      ...ride,
      bookings: rideBookings,
    };
  });

  db.logSql('SELECT * FROM rides WHERE driver_id = ? ORDER BY departure_time DESC;', [driverId], 0.7, 'SUCCESS');

  res.json({
    rides: enriched,
    total: enriched.length,
  });
});

// Get individual booking requests for rides offered by this driver
driverRouter.get('/requests', (req: Request, res: Response) => {
  const authUser = getRequestUser(req);
  if (!authUser || (!isDriver(authUser) && authUser.role !== 'admin')) {
    return res.status(403).json({ error: 'Driver authentication required.' });
  }

  const driverId = authUser.role === 'admin' && req.query.driverId
    ? Number(req.query.driverId)
    : authUser.user_id;

  const driverRideIds = db.rides.filter((r) => r.driver_id === driverId).map((r) => r.ride_id);
  const requests = db.bookings
    .filter((b) => driverRideIds.includes(b.ride_id))
    .map((b) => {
      const ratingEntry = db.ratings.find((r) => r.booking_id === b.booking_id);
      return {
        ...b,
        driver_rating: ratingEntry?.rating ?? b.driver_rating ?? null,
        driver_review: ratingEntry?.review_comment ?? b.driver_review ?? null,
        rated_at: ratingEntry?.created_at ?? b.rated_at ?? null,
      };
    });

  res.json({
    requests,
    total: requests.length,
  });
});

// Independent per-booking actions (NEVER batch-update other bookings)
driverRouter.post('/bookings/:bookingId/accept', async (req: Request, res: Response) => {
  const authUser = getRequestUser(req);
  if (!authUser || !isDriver(authUser)) {
    return res.status(403).json({ error: 'Driver authentication required.' });
  }
  const result = await db.acceptBooking({
    bookingId: Number(req.params.bookingId),
    driverId: authUser.user_id,
  });
  if (!result.success) {
    return res.status(mapStatusCodeToHttp(result.statusCode)).json({ error: result.message, statusCode: result.statusCode });
  }
  res.json({ message: result.message, booking: result.booking });
});

driverRouter.post('/bookings/:bookingId/reject', async (req: Request, res: Response) => {
  const authUser = getRequestUser(req);
  if (!authUser || !isDriver(authUser)) {
    return res.status(403).json({ error: 'Driver authentication required.' });
  }
  const result = await db.rejectBooking({
    bookingId: Number(req.params.bookingId),
    driverId: authUser.user_id,
    reason: req.body?.reason,
  });
  if (!result.success) {
    return res.status(mapStatusCodeToHttp(result.statusCode)).json({ error: result.message, statusCode: result.statusCode });
  }
  res.json({ message: result.message, booking: result.booking });
});

driverRouter.post('/bookings/:bookingId/complete', async (req: Request, res: Response) => {
  const authUser = getRequestUser(req);
  if (!authUser || !isDriver(authUser)) {
    return res.status(403).json({ error: 'Driver authentication required.' });
  }
  const result = await db.completeBooking({
    bookingId: Number(req.params.bookingId),
    driverId: authUser.user_id,
  });
  if (!result.success) {
    return res.status(mapStatusCodeToHttp(result.statusCode)).json({ error: result.message, statusCode: result.statusCode });
  }
  res.json({ message: result.message, booking: result.booking });
});

driverRouter.post('/bookings/:bookingId/cancel', async (req: Request, res: Response) => {
  const authUser = getRequestUser(req);
  if (!authUser || !isDriver(authUser)) {
    return res.status(403).json({ error: 'Driver authentication required.' });
  }
  const bookingId = Number(req.params.bookingId);
  const booking = db.bookings.find((b) => b.booking_id === bookingId);
  if (!booking) {
    return res.status(404).json({ error: 'Booking not found.' });
  }
  const ride = db.rides.find((r) => r.ride_id === booking.ride_id);
  if (!ride || ride.driver_id !== authUser.user_id) {
    return res.status(403).json({ error: 'You are not authorized to cancel another driver’s booking.' });
  }
  const result = await db.executeSafeCancellation({
    bookingId,
    requestingUserId: authUser.user_id,
    reason: req.body?.reason || 'Cancelled by driver',
  });
  if (!result.success) {
    return res.status(mapStatusCodeToHttp(result.statusCode)).json({ error: result.message, statusCode: result.statusCode });
  }
  res.json({ message: result.message, booking: result.booking });
});

// Unified status endpoint (accepts: accepted | confirmed | rejected | completed | cancelled)
driverRouter.post('/requests/:bookingId/status', async (req: Request, res: Response) => {
  const authUser = getRequestUser(req);
  if (!authUser || !isDriver(authUser)) {
    return res.status(403).json({ error: 'Driver authentication required.' });
  }

  const bookingId = Number(req.params.bookingId);
  const { status, reason } = req.body;

  let result;
  if (status === 'accepted' || status === 'confirmed') {
    result = await db.acceptBooking({ bookingId, driverId: authUser.user_id });
  } else if (status === 'rejected') {
    result = await db.rejectBooking({ bookingId, driverId: authUser.user_id, reason });
  } else if (status === 'completed') {
    result = await db.completeBooking({ bookingId, driverId: authUser.user_id });
  } else if (status === 'cancelled') {
    result = await db.executeSafeCancellation({ bookingId, requestingUserId: authUser.user_id, reason: reason || 'Cancelled by driver' });
  } else {
    return res.status(400).json({ error: `Unsupported booking action '${status}'.` });
  }

  if (!result.success) {
    return res.status(mapStatusCodeToHttp(result.statusCode)).json({ error: result.message, statusCode: result.statusCode });
  }

  res.json({
    message: result.message,
    booking: result.booking,
  });
});

// Close/complete the ride container ONLY after individual bookings are resolved (NEVER mass-updates bookings!)
driverRouter.post('/rides/:rideId/complete', (req: Request, res: Response) => {
  const authUser = getRequestUser(req);
  if (!authUser || (!isDriver(authUser) && authUser.role !== 'admin')) {
    return res.status(403).json({ error: 'Driver authentication required.' });
  }

  const rideId = Number(req.params.rideId);
  const ride = db.rides.find((r) => r.ride_id === rideId);
  if (!ride) {
    return res.status(404).json({ error: 'Ride not found' });
  }

  if (authUser.role !== 'admin' && ride.driver_id !== authUser.user_id) {
    return res.status(403).json({ error: 'You are not authorized to complete another driver’s ride.' });
  }

  const unresolvedBookings = db.bookings.filter(
    (b) => b.ride_id === rideId && (b.status === 'pending' || b.status === 'accepted')
  );
  if (unresolvedBookings.length > 0) {
    return res.status(400).json({
      error: `This ride still has ${unresolvedBookings.length} pending or accepted passenger booking(s). Accept/complete or cancel each passenger booking individually first.`,
    });
  }

  ride.status = 'completed';
  db.logSql('UPDATE rides SET status = ? WHERE ride_id = ?;', ['completed', rideId], 0.6, 'SUCCESS');

  res.json({
    message: `Ride #${rideId} closed as completed.`,
    ride,
  });
});

// Cancel an entire active ride (if no completed bookings exist)
driverRouter.post('/rides/:rideId/cancel', async (req: Request, res: Response) => {
  const authUser = getRequestUser(req);
  if (!authUser || (!isDriver(authUser) && authUser.role !== 'admin')) {
    return res.status(403).json({ error: 'Driver authentication required.' });
  }

  const rideId = Number(req.params.rideId);
  const ride = db.rides.find((r) => r.ride_id === rideId);
  if (!ride) {
    return res.status(404).json({ error: 'Ride not found.' });
  }
  if (authUser.role !== 'admin' && ride.driver_id !== authUser.user_id) {
    return res.status(403).json({ error: 'You are not authorized to cancel another driver’s ride.' });
  }
  if (ride.status !== 'active') {
    return res.status(400).json({ error: `Cannot cancel ride in '${ride.status}' status.` });
  }

  const activeBookings = db.bookings.filter(
    (b) => b.ride_id === rideId && (b.status === 'pending' || b.status === 'accepted')
  );
  for (const b of activeBookings) {
    await db.executeSafeCancellation({
      bookingId: b.booking_id,
      requestingUserId: authUser.user_id,
      reason: req.body?.reason || 'Ride cancelled by driver',
    });
  }

  ride.status = 'cancelled';
  db.logSql('UPDATE rides SET status = ? WHERE ride_id = ?;', ['cancelled', rideId], 0.5, 'SUCCESS');

  res.json({
    message: `Ride #${rideId} cancelled (${activeBookings.length} open booking(s) cancelled and seats restored).`,
    ride,
  });
});

// Get driver earnings analytics + profile/vehicle + credit ledger
driverRouter.get('/earnings', (req: Request, res: Response) => {
  const authUser = getRequestUser(req);
  if (!authUser || (!isDriver(authUser) && authUser.role !== 'admin')) {
    return res.status(403).json({ error: 'Driver authentication required.' });
  }

  const driverId = authUser.role === 'admin' && req.query.driverId
    ? Number(req.query.driverId)
    : authUser.user_id;

  const driverUser = db.users.find((u) => u.user_id === driverId);
  const profile = db.drivers.find((d) => d.driver_id === driverId) || null;
  const vehicle = db.vehicles.find((v) => v.driver_id === driverId) || null;
  const driverRides = db.rides.filter((r) => r.driver_id === driverId);

  const rideBreakdown = driverRides.map((r) => {
    const rideBookings = db.bookings.filter((b) => b.ride_id === r.ride_id);
    const paidAmount = rideBookings
      .filter((b) => b.status === 'completed' && b.payment_status === 'paid')
      .reduce((sum, b) => sum + b.total_fare, 0);
    const awaitingPaymentAmount = rideBookings
      .filter((b) => b.status === 'completed' && b.payment_status !== 'paid')
      .reduce((sum, b) => sum + b.total_fare, 0);
    const fare = rideBookings
      .filter((b) => b.status === 'accepted' || b.status === 'completed')
      .reduce((sum, b) => sum + b.total_fare, 0);
    return {
      ride_id: r.ride_id,
      route: `${r.origin_name} → ${r.destination_name}`,
      date: r.departure_time,
      status: r.status,
      passengersCount: rideBookings.length,
      paidAmount,
      awaitingPaymentAmount,
      earnings: fare,
    };
  });

  const creditLedger = db.walletLedger.filter((l) => l.user_id === driverId && l.entry_type === 'CREDIT');
  const receivedTransactions = db.transactions.filter(
    (t) =>
      t.driver_id === driverId &&
      (t.transaction_type === 'driver_payout' || t.transaction_type === 'fare_payment') &&
      t.payment_status === 'success'
  );

  const driverRatings = db.ratings
    .filter((r) => r.driver_id === driverId)
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
    .map((r) => {
      const bk = db.bookings.find((b) => b.booking_id === r.booking_id);
      return {
        ...r,
        pickup_point: bk?.pickup_point || null,
        dropoff_point: bk?.dropoff_point || null,
        route: bk ? `${bk.pickup_point} → ${bk.dropoff_point}` : `Ride #${r.ride_id}`,
      };
    });

  const ratingBreakdown: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  driverRatings.forEach((r) => {
    const score = Math.min(5, Math.max(1, Math.round(r.rating)));
    ratingBreakdown[score] = (ratingBreakdown[score] || 0) + 1;
  });

  db.logSql('SELECT * FROM view_driver_earnings_summary WHERE driver_id = ?;', [driverId], 0.7, 'SUCCESS');

  res.json({
    settledEarnings: driverUser?.earnings_balance ?? profile?.total_earnings ?? 0,
    pendingSettlement: profile?.pending_settlement || 0,
    acceptanceRate: profile?.acceptance_rate ?? 100,
    driverRating: driverUser?.rating ?? 5.0,
    recentRatings: driverRatings,
    ratingBreakdown,
    totalReviewsCount: driverRatings.length,
    driverProfile: profile,
    vehicle,
    rideBreakdown,
    creditLedger,
    receivedTransactions,
  });
});

