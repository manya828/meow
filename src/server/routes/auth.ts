import { Router } from 'express';
import type { Request, Response } from 'express';
import { db } from '../db.ts';
import type { UserRole } from '../../types/index.ts';
import { hashPassword, verifyPassword, sanitizeUser, getRequestUser } from '../auth-utils.ts';

export const authRouter = Router();

const buildProfilePayload = (userId: number, role: UserRole) => {
  const passengerProfile =
    role === 'passenger' ? db.passengers.find((p) => p.passenger_id === userId) || null : null;
  const driverProfile =
    role === 'driver' ? db.drivers.find((d) => d.driver_id === userId) || null : null;
  const vehicle =
    role === 'driver' ? db.vehicles.find((v) => v.driver_id === userId) || null : null;
  const walletLedger =
    role === 'passenger' || role === 'driver'
      ? db.walletLedger.filter((l) => l.user_id === userId)
      : [];
  return { passengerProfile, driverProfile, vehicle, walletLedger };
};

// Register a dedicated Passenger or Driver account (strictly separated)
// Coordinator & Admin are strictly single-operator and cannot register
authRouter.post('/register', async (req: Request, res: Response) => {
  const {
    fullName,
    email,
    phone,
    password,
    role,
    corporateDomain,
    emergencyContact,
    preferredPaymentMode,
    licenseNumber,
    vehicleModel,
    registrationNumber,
    vehicleType,
    fuelType,
    vehicleColor,
    totalCapacity,
  } = req.body;

  if (role === 'coordinator' || role === 'admin') {
    return res.status(403).json({
      error: 'Coordinator and Administrator accounts are restricted to a single authorized operator and cannot be created via registration.',
    });
  }

  if (role !== 'passenger' && role !== 'driver') {
    return res.status(400).json({
      error: "Please select whether you are creating a 'passenger' or 'driver' account.",
    });
  }

  if (!fullName?.trim() || !email?.trim() || !phone?.trim() || !password) {
    return res.status(400).json({ error: 'Please provide your full name, email, mobile number, and password.' });
  }

  if (String(password).length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  if (role === 'driver') {
    if (!licenseNumber?.trim() || !vehicleModel?.trim() || !registrationNumber?.trim()) {
      return res.status(400).json({
        error: 'Driver registration requires driving license number, vehicle model, and registration number.',
      });
    }
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const existing = db.users.find((u) => u.email.toLowerCase() === normalizedEmail);
  if (existing) {
    return res.status(409).json({ error: 'Email is already registered in the CarpoolX network.' });
  }

  const newUserId = db.users.length > 0 ? Math.max(...db.users.map((u) => u.user_id)) + 1 : 1;
  const startingWallet = role === 'passenger' ? 700.0 : 0.0;
  const newUser = {
    user_id: newUserId,
    full_name: String(fullName).trim(),
    email: normalizedEmail,
    phone: String(phone).trim(),
    password_hash: hashPassword(String(password)),
    role: role as UserRole,
    wallet_balance: startingWallet,
    earnings_balance: 0.0,
    is_active: true,
    rating: 5.0,
    total_rides_count: 0,
    created_at: new Date().toISOString(),
  };

  db.users.push(newUser);

  if (role === 'passenger') {
    db.passengers.push({
      passenger_id: newUserId,
      emergency_contact: (emergencyContact && String(emergencyContact).trim()) || String(phone).trim(),
      preferred_payment_mode: preferredPaymentMode || 'wallet',
      corporate_domain: corporateDomain ? String(corporateDomain).trim() : undefined,
      total_spent: 0,
      carbon_saved_kg: 0,
    });

    db.walletLedger.unshift({
      ledger_id: db.walletLedger.length > 0 ? Math.max(...db.walletLedger.map((l) => l.ledger_id)) + 1 : 1,
      user_id: newUserId,
      transaction_id: `WELCOME-${newUserId}`,
      entry_type: 'CREDIT',
      amount: startingWallet,
      balance_before: 0,
      balance_after: startingWallet,
      description: 'Welcome CarpoolX Passenger Wallet Balance',
      status: 'SUCCESS',
      created_at: new Date().toISOString(),
    });
  } else {
    db.drivers.push({
      driver_id: newUserId,
      license_number: String(licenseNumber).trim().toUpperCase(),
      license_expiry: '2032-12-31',
      is_verified: true,
      total_earnings: 0,
      pending_settlement: 0,
      acceptance_rate: 100.0,
    });

    const newVehicleId = db.vehicles.length > 0 ? Math.max(...db.vehicles.map((v) => v.vehicle_id)) + 1 : 1;
    const capacityNum = Math.min(7, Math.max(1, Number(totalCapacity) || 4));
    db.vehicles.push({
      vehicle_id: newVehicleId,
      driver_id: newUserId,
      make_model: String(vehicleModel).trim(),
      registration_number: String(registrationNumber).trim().toUpperCase(),
      vehicle_type: vehicleType || 'sedan',
      fuel_type: fuelType || 'electric',
      color: (vehicleColor && String(vehicleColor).trim()) || 'Titanium Grey',
      total_capacity: capacityNum,
      is_active: true,
    });
  }

  db.auditLogs.unshift({
    log_id: Date.now(),
    user_id: newUserId,
    user_name: newUser.full_name,
    action: role === 'driver' ? 'DRIVER_REGISTERED' : 'PASSENGER_REGISTERED',
    entity_type: 'user',
    entity_id: String(newUserId),
    ip_address: req.ip || '127.0.0.1',
    details: { role },
    created_at: new Date().toISOString(),
  });

  db.logSql(
    'INSERT INTO users (full_name, email, phone, role, wallet_balance, earnings_balance) VALUES (?, ?, ?, ?, ?, ?);',
    [newUser.full_name, newUser.email, newUser.phone, role, startingWallet, 0],
    0.8,
    'SUCCESS'
  );

  const profiles = buildProfilePayload(newUserId, newUser.role);

  res.status(201).json({
    message:
      role === 'driver'
        ? 'Driver account and vehicle verified! You can now publish rides and manage passenger requests.'
        : 'Passenger account created with ₹700.00 default CarpoolX Wallet balance for post-ride settlements.',
    user: sanitizeUser(newUser),
    ...profiles,
    token: `carpoolx_token_${newUserId}_${Date.now()}`,
  });
});

// Login (verifies password cryptographically and enforces strict per-role portals across Passenger, Driver, Coordinator, and Admin)
authRouter.post('/login', async (req: Request, res: Response) => {
  const { email, password, expectedRole } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Please enter both email and password.' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const user = db.users.find((u) => u.email.toLowerCase() === normalizedEmail);
  if (!user || !verifyPassword(String(password), user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password credentials.' });
  }

  if (!user.is_active) {
    return res.status(403).json({ error: 'Your CarpoolX account has been deactivated by the administrator.' });
  }

  if (expectedRole) {
    if (expectedRole === 'admin' || expectedRole === 'coordinator') {
      if (user.role !== expectedRole) {
        return res.status(403).json({
          error: `Access denied: this account does not hold ${expectedRole} clearance.`,
        });
      }
    } else if (user.role !== expectedRole) {
      const registeredLabel =
        user.role === 'driver'
          ? 'Driver'
          : user.role === 'passenger'
          ? 'Passenger'
          : user.role === 'coordinator'
          ? 'Coordinator'
          : 'Administrator';
      return res.status(403).json({
        error: `This account is registered as a ${registeredLabel}. Please sign in through the ${registeredLabel} login portal.`,
      });
    }
  }

  db.logSql('SELECT * FROM users WHERE email = ? LIMIT 1;', [normalizedEmail], 0.5, 'SUCCESS');

  const profiles = buildProfilePayload(user.user_id, user.role);

  res.json({
    message: 'Authentication successful',
    user: sanitizeUser(user),
    ...profiles,
    token: `carpoolx_token_${user.user_id}_${Date.now()}`,
  });
});

// Disabled passwordless role switching to enforce strict Passenger/Driver account boundaries
authRouter.post('/switch-role', (_req: Request, res: Response) => {
  return res.status(403).json({
    error: 'Role switching is disabled. Passenger and Driver accounts are strictly separate — sign out and log in with the respective account.',
  });
});

// Current authenticated user profile
authRouter.get('/me', (req: Request, res: Response) => {
  const user = getRequestUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated', user: null });
  }
  const profiles = buildProfilePayload(user.user_id, user.role);
  res.json({
    user: sanitizeUser(user),
    ...profiles,
  });
});

