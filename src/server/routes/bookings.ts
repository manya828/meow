import { Router } from 'express';
import type { Request, Response } from 'express';
import { db } from '../db.ts';
import { getRequestUser, isPassenger } from '../auth-utils.ts';

export const bookingsRouter = Router();

// Get bookings for logged-in user (acting as passenger), hydrated with edit history
bookingsRouter.get('/my-bookings', (req: Request, res: Response) => {
  const authUser = getRequestUser(req);
  if (!authUser) {
    return res.status(401).json({ error: 'Authentication required to view bookings.' });
  }

  if (!isPassenger(authUser) && authUser.role !== 'admin') {
    return res.status(403).json({ error: 'Only Passenger accounts can view personal ride bookings.' });
  }

  const passengerId =
    authUser.role === 'admin' && req.query.passengerId
      ? Number(req.query.passengerId)
      : authUser.user_id;

  const userBookings = db.bookings
    .filter((b) => b.passenger_id === passengerId)
    .map((b) => {
      const ratingEntry = db.ratings.find((r) => r.booking_id === b.booking_id);
      return {
        ...b,
        edit_history: db.editHistory.filter((e) => e.booking_id === b.booking_id),
        driver_rating: ratingEntry?.rating ?? b.driver_rating ?? null,
        driver_review: ratingEntry?.review_comment ?? b.driver_review ?? null,
        rated_at: ratingEntry?.created_at ?? b.rated_at ?? null,
      };
    });

  db.logSql('SELECT * FROM bookings WHERE passenger_id = ? ORDER BY booking_time DESC;', [passengerId], 0.6, 'SUCCESS');

  res.json({
    bookings: userBookings,
    total: userBookings.length,
  });
});

// Preview pending booking destination edit (recalculates distance & fare delta without mutating state)
bookingsRouter.post('/:id/edit-preview', (req: Request, res: Response) => {
  const authUser = getRequestUser(req);
  if (!authUser) {
    return res.status(401).json({ error: 'Authentication required to preview booking edit.' });
  }
  if (!isPassenger(authUser)) {
    return res.status(403).json({ error: 'Only Passenger accounts can edit ride bookings.' });
  }

  const bookingId = Number(req.params.id);
  const { dropoffPoint, dropoffLat, dropoffLng } = req.body;

  const result = db.previewPendingBookingEdit({
    bookingId,
    passengerId: authUser.user_id,
    newDropoffPoint: dropoffPoint || '',
    newDropoffLat: dropoffLat !== undefined ? Number(dropoffLat) : undefined,
    newDropoffLng: dropoffLng !== undefined ? Number(dropoffLng) : undefined,
  });

  if (!result.success) {
    const httpStatus =
      result.statusCode === 'UNAUTHORIZED'
        ? 403
        : result.statusCode === 'NOT_FOUND' || result.statusCode === 'RIDE_MISSING'
        ? 404
        : result.statusCode === 'EDIT_LOCKED'
        ? 409
        : 400;
    return res.status(httpStatus).json({ error: result.message, statusCode: result.statusCode });
  }

  res.json(result);
});

// Edit pending booking destination in place (pickup locked, recalculates fare for post-ride payment)
bookingsRouter.patch('/:id/edit', async (req: Request, res: Response) => {
  const authUser = getRequestUser(req);
  if (!authUser) {
    return res.status(401).json({ error: 'Authentication required to edit booking.' });
  }
  if (!isPassenger(authUser)) {
    return res.status(403).json({ error: 'Only Passenger accounts can edit ride bookings.' });
  }

  const bookingId = Number(req.params.id);
  const { dropoffPoint, dropoffLat, dropoffLng } = req.body;

  const result = await db.editPendingBooking({
    bookingId,
    passengerId: authUser.user_id,
    newDropoffPoint: dropoffPoint || '',
    newDropoffLat: dropoffLat !== undefined ? Number(dropoffLat) : undefined,
    newDropoffLng: dropoffLng !== undefined ? Number(dropoffLng) : undefined,
  });

  if (!result.success) {
    const httpStatus =
      result.statusCode === 'UNAUTHORIZED'
        ? 403
        : result.statusCode === 'NOT_FOUND' || result.statusCode === 'RIDE_MISSING'
        ? 404
        : result.statusCode === 'EDIT_LOCKED' || result.statusCode === 'LOCK_CONFLICT'
        ? 409
        : 400;
    return res.status(httpStatus).json({ error: result.message, statusCode: result.statusCode });
  }

  res.json({
    message: result.message,
    booking: result.booking,
    editEntry: result.editEntry,
    transaction: result.transaction,
    walletBalance: result.walletBalance,
  });
});

// Pay for a completed ride booking via CarpoolX Wallet (post-completion settlement)
bookingsRouter.post('/:id/pay', async (req: Request, res: Response) => {
  const authUser = getRequestUser(req);
  if (!authUser) {
    return res.status(401).json({ error: 'Authentication required to complete payment.' });
  }
  if (!isPassenger(authUser)) {
    return res.status(403).json({ error: 'Only Passenger accounts can pay for completed ride bookings.' });
  }

  const bookingId = Number(req.params.id);
  const result = await db.executeCompletedRidePayment({
    bookingId,
    passengerId: authUser.user_id,
  });

  if (!result.success) {
    const httpStatus =
      result.statusCode === 'UNAUTHORIZED'
        ? 403
        : result.statusCode === 'NOT_FOUND' || result.statusCode === 'RIDE_MISSING'
        ? 404
        : result.statusCode === 'DUPLICATE_PAYMENT' || result.statusCode === 'PAYMENT_IN_PROGRESS'
        ? 409
        : 400;
    return res.status(httpStatus).json({
      error: result.message,
      statusCode: result.statusCode,
    });
  }

  res.json({
    message: result.message,
    booking: result.booking,
    transaction: result.transaction,
    debitEntry: result.debitEntry,
    creditEntry: result.creditEntry,
    passengerBalanceBefore: result.passengerBalanceBefore,
    passengerBalanceAfter: result.passengerBalanceAfter,
    driverBalanceBefore: result.driverBalanceBefore,
    driverBalanceAfter: result.driverBalanceAfter,
  });
});

// Payment Gateway / QR Recharge Configuration (No secrets exposed)
bookingsRouter.get('/wallet/config', (req: Request, res: Response) => {
  const authUser = getRequestUser(req);
  if (!authUser) {
    return res.status(401).json({ error: 'Authentication required to inspect wallet configuration.' });
  }
  const config = db.getWalletPaymentConfig();
  res.json({
    config,
    walletBalance: authUser.wallet_balance,
  });
});

// List passenger's QR recharge attempts/orders
bookingsRouter.get('/wallet/recharges', (req: Request, res: Response) => {
  const authUser = getRequestUser(req);
  if (!authUser) {
    return res.status(401).json({ error: 'Authentication required to view recharge history.' });
  }
  if (!isPassenger(authUser)) {
    return res.status(403).json({ error: 'Only Passenger accounts maintain a CarpoolX Wallet.' });
  }
  const orders = db.getPassengerRechargeOrders(authUser.user_id).map((o) => {
    const { demo_auth_token: _tok, ...safeOrder } = o;
    return safeOrder;
  });
  res.json({ orders });
});

// Initiate QR Wallet Recharge (creates PENDING order + QR payload; NEVER credits wallet here)
bookingsRouter.post('/wallet/recharge/initiate', async (req: Request, res: Response) => {
  const authUser = getRequestUser(req);
  if (!authUser) {
    return res.status(401).json({ error: 'Authentication required to recharge wallet.' });
  }
  if (!isPassenger(authUser)) {
    return res.status(403).json({ error: 'Only Passenger accounts maintain a CarpoolX Wallet for ride payments.' });
  }

  const amount = Number(req.body?.amount);
  const protoHeader = String(req.headers['x-forwarded-proto'] || req.protocol || 'https').split(',')[0].trim();
  const originHeader = typeof req.headers.origin === 'string' ? req.headers.origin.trim() : '';
  const refererHeader = typeof req.headers.referer === 'string' ? req.headers.referer.trim() : '';
  const xfHostHeader = String(req.headers['x-forwarded-host'] || '').split(',')[0].trim();
  const hostHeader = req.get('host');
  const publicEnvUrl = (process.env.PUBLIC_APP_URL || '').trim().replace(/\/+$/, '');
  const rawClientOrigin = typeof req.body?.clientOrigin === 'string' ? req.body.clientOrigin.trim() : '';

  let refererOrigin = '';
  if (refererHeader) {
    try {
      refererOrigin = new URL(refererHeader).origin;
    } catch {
      refererOrigin = '';
    }
  }

  let safeClientOrigin = '';
  if (rawClientOrigin && /^https?:\/\/[a-zA-Z0-9.-]+(:\d+)?$/.test(rawClientOrigin.replace(/\/+$/, ''))) {
    safeClientOrigin = rawClientOrigin.replace(/\/+$/, '');
  }

  const candidates = [
    publicEnvUrl && /^https?:\/\//i.test(publicEnvUrl) ? publicEnvUrl : '',
    originHeader && /^https?:\/\//i.test(originHeader) ? originHeader.replace(/\/+$/, '') : '',
    refererOrigin && /^https?:\/\//i.test(refererOrigin) ? refererOrigin : '',
    xfHostHeader ? `${protoHeader}://${xfHostHeader}` : '',
    safeClientOrigin,
    hostHeader ? `${protoHeader}://${hostHeader}` : '',
  ].filter(Boolean);

  // Prefer a public non-localhost origin so mobile phones scanning the QR can reach the external page
  const baseUrl =
    candidates.find((c) => !/localhost|127\.0\.0\.1/i.test(c)) || candidates[0];

  const result = await db.initiateWalletRecharge({
    userId: authUser.user_id,
    amount,
    baseUrl,
  });

  if (!result.success) {
    return res.status(400).json({ error: result.message, config: result.config });
  }

  res.status(201).json({
    message: result.message,
    order: result.order,
    config: result.config,
    walletBalance: authUser.wallet_balance,
  });
});

// Poll authoritative backend payment verification status
bookingsRouter.get('/wallet/recharge/:orderId/status', async (req: Request, res: Response) => {
  const authUser = getRequestUser(req);
  if (!authUser) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  if (!isPassenger(authUser)) {
    return res.status(403).json({ error: 'Passenger account required.' });
  }

  const result = await db.getRechargeOrderStatus(String(req.params.orderId), authUser.user_id);
  if (!result.success) {
    return res.status(404).json({ error: result.message });
  }

  res.json({
    message: result.message,
    order: result.order,
    walletBalance: result.walletBalance,
  });
});

// Mark QR as SCANNED only — explicitly does NOT credit the wallet!
bookingsRouter.post('/wallet/recharge/:orderId/mark-scanned', (req: Request, res: Response) => {
  const authUser = getRequestUser(req);
  if (!authUser) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  if (!isPassenger(authUser)) {
    return res.status(403).json({ error: 'Passenger account required.' });
  }

  const result = db.markRechargeOrderScanned(String(req.params.orderId), authUser.user_id);
  if (!result.success) {
    return res.status(400).json({ error: result.message, order: result.order });
  }

  res.json({
    message: result.message,
    order: result.order,
    walletCredited: false,
    walletBalance: authUser.wallet_balance,
  });
});

// Server-side Gateway Verification (NEVER trusts a success flag sent only by the frontend)
bookingsRouter.post('/wallet/recharge/:orderId/verify', async (req: Request, res: Response) => {
  const authUser = getRequestUser(req);
  if (!authUser) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  if (!isPassenger(authUser)) {
    return res.status(403).json({ error: 'Passenger account required.' });
  }

  const result = await db.verifyGatewayOrderWithProvider(String(req.params.orderId), authUser.user_id);
  const httpStatus = result.success
    ? 200
    : result.statusCode === 'UNAUTHORIZED'
    ? 403
    : result.statusCode === 'NOT_FOUND'
    ? 404
    : result.statusCode === 'PAYMENT_PENDING' || result.statusCode === 'AWAITING_WEBHOOK'
    ? 202
    : 400;

  res.status(httpStatus).json({
    verified: result.success,
    statusCode: result.statusCode,
    message: result.message,
    order: result.order,
    walletBalance: result.walletBalance,
  });
});

// Signed Payment Gateway Webhook (HMAC-SHA256 verified using PAYMENT_GATEWAY_WEBHOOK_SECRET)
bookingsRouter.post('/wallet/recharge/webhook', (req: Request, res: Response) => {
  const signature = String(
    req.headers['x-razorpay-signature'] ||
      req.headers['x-payment-signature'] ||
      req.headers['x-webhook-signature'] ||
      ''
  );
  const rawBody = (req as any).rawBody || JSON.stringify(req.body || {});
  const result = db.verifyGatewayWebhook({
    rawBody,
    signature,
    payload: req.body,
  });

  if (!result.success) {
    const code =
      result.statusCode === 'INVALID_SIGNATURE'
        ? 401
        : result.statusCode === 'WEBHOOK_NOT_CONFIGURED'
        ? 403
        : 400;
    return res.status(code).json({ error: result.message, statusCode: result.statusCode });
  }

  res.json({
    received: true,
    statusCode: result.statusCode,
    message: result.message,
    order: result.order,
  });
});

// External Mobile Browser Checkout Page opened when scanning the QR code on phone
bookingsRouter.get('/wallet/recharge/demo-terminal/:orderId', (req: Request, res: Response) => {
  const orderId = String(req.params.orderId);
  const sig = String(req.query.sig || '');
  const session = db.openDemoTerminalSession(orderId, sig);

  if (!session.success || !session.order) {
    return res
      .status(session.httpStatus)
      .set('Content-Type', 'text/html; charset=utf-8')
      .send(
        `<!doctype html><html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0" /><title>CarpoolX Checkout Error</title></head><body style="font-family:system-ui,sans-serif;background:#080e1c;color:#f8fafc;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px;margin:0;"><div style="max-width:400px;width:100%;background:#0d1628;border:1px solid #f43f5e66;border-radius:18px;padding:24px;text-align:center;"><h2 style="color:#fda4af;margin-top:0;">Unable to Load Checkout</h2><p style="color:#cbd5e1;font-size:14px;">${session.message}</p></div></body></html>`
      );
  }

  const order = session.order;
  const currentBal = Number(session.walletBalance ?? 0);
  const projectedBal = Number((currentBal + order.amount).toFixed(2));
  const safeName = (session.passengerName || 'Passenger').replace(/[<>&"]/g, '');

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Add ₹${order.amount.toFixed(2)} · CarpoolX Wallet</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #080e1c; color: #f8fafc; margin: 0; padding: 20px; display: flex; align-items: center; justify-content: center; min-height: 100vh; box-sizing: border-box; }
    .card { max-width: 420px; width: 100%; background: #0d1628; border: 1px solid #06b6d466; border-radius: 22px; padding: 24px; box-sizing: border-box; box-shadow: 0 24px 60px rgba(0,0,0,0.45); }
    .badge { display: inline-block; background: #083344; color: #67e8f9; border: 1px solid #06b6d488; padding: 4px 10px; border-radius: 8px; font-size: 11px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
    h1 { font-size: 20px; margin: 14px 0 4px; color: #fff; }
    .sub { font-size: 13px; color: #94a3b8; margin: 0 0 16px; }
    .amt-box { background: #080e1c; border: 1px solid #1e293b; border-radius: 14px; padding: 16px; text-align: center; margin-bottom: 16px; }
    .amt-label { font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: #94a3b8; }
    .amt { font-size: 36px; font-weight: 800; color: #38bdf8; font-family: ui-monospace, monospace; margin: 4px 0 0; }
    .meta { background: #111d35; border: 1px solid #1e293b; border-radius: 14px; padding: 14px; font-size: 12px; color: #cbd5e1; margin-bottom: 18px; }
    .meta div { display: flex; justify-content: space-between; margin: 6px 0; gap: 8px; }
    .meta strong { color: #f8fafc; text-align: right; }
    .btn { width: 100%; border: none; border-radius: 12px; padding: 14px 16px; font-weight: 800; font-size: 15px; cursor: pointer; margin-top: 8px; transition: opacity .15s; }
    .btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-pay { background: linear-gradient(90deg, #10b981, #06b6d4); color: #022c22; }
    .btn-fail { background: #1e293b; color: #fda4af; font-size: 13px; font-weight: 600; border: 1px solid #334155; }
    .note { font-size: 11px; color: #94a3b8; line-height: 1.5; margin-top: 14px; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">CarpoolX Wallet · External Web Checkout</span>
    <h1>Add Money to Wallet</h1>
    <p class="sub">Account: <strong style="color:#fff">${safeName}</strong></p>

    <div class="amt-box">
      <div class="amt-label">Amount Requested</div>
      <div class="amt">₹${order.amount.toFixed(2)}</div>
    </div>

    <div class="meta">
      <div><span>Current Wallet Balance</span><strong>₹${currentBal.toFixed(2)}</strong></div>
      <div><span>Balance After Adding</span><strong style="color:#34d399">₹${projectedBal.toFixed(2)}</strong></div>
      <div><span>Order ID</span><strong style="font-family:monospace">${order.order_id}</strong></div>
      <div><span>Status</span><strong style="color:#67e8f9">${order.status}</strong></div>
    </div>

    ${
      order.status === 'SUCCESS' && order.credited
        ? `<div style="padding:14px;border-radius:12px;background:#064e3b55;border:1px solid #10b98166;color:#6ee7b7;font-weight:700;font-size:13px;text-align:center;">✓ ₹${order.amount.toFixed(2)} already added to your CarpoolX Wallet!</div>`
        : order.status === 'EXPIRED' || order.status === 'FAILED'
        ? `<div style="padding:14px;border-radius:12px;background:#88133755;border:1px solid #f43f5e66;color:#fda4af;font-weight:700;font-size:13px;text-align:center;">Order is ${order.status}. Please generate a new QR code inside CarpoolX.</div>`
        : `<form method="POST" action="/api/bookings/wallet/recharge/demo-webhook" onsubmit="var btns=this.querySelectorAll('button');btns.forEach(function(b){b.disabled=true;});">
             <input type="hidden" name="orderId" value="${order.order_id}" />
             <input type="hidden" name="sig" value="${sig.replace(/"/g, '&quot;')}" />
             <button class="btn btn-pay" type="submit" name="outcome" value="success">Add ₹${order.amount.toFixed(2)} Money</button>
             <button class="btn btn-fail" type="submit" name="outcome" value="fail">Cancel / Decline</button>
           </form>`
    }
    <p class="note">Your CarpoolX Wallet is credited atomically by the server only after you confirm above.</p>
  </div>
</body>
</html>`;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

// Signed Demo Verification Callback (Atomic idempotent wallet credit)
bookingsRouter.post('/wallet/recharge/demo-webhook', (req: Request, res: Response) => {
  const orderId = String(req.body?.orderId || '');
  const sig = String(req.body?.sig || '');
  const outcome = req.body?.outcome === 'fail' ? 'fail' : 'success';

  const result = db.completeDemoRecharge({ orderId, sig, outcome });
  const wantsJson =
    String(req.headers.accept || '').includes('application/json') || req.is('application/json');

  if (!result.success) {
    const code =
      result.statusCode === 'DEMO_DISABLED'
        ? 403
        : result.statusCode === 'INVALID_SIGNATURE'
        ? 401
        : result.statusCode === 'NOT_FOUND'
        ? 404
        : result.statusCode === 'LOCK_CONFLICT'
        ? 409
        : 400;
    if (wantsJson) {
      return res.status(code).json({ error: result.message, statusCode: result.statusCode });
    }
    return res
      .status(code)
      .set('Content-Type', 'text/html; charset=utf-8')
      .send(
        `<!doctype html><html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0" /><title>Verification Error</title></head><body style="font-family:system-ui,sans-serif;background:#080e1c;color:#f8fafc;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px;margin:0;"><div style="max-width:400px;width:100%;background:#0d1628;border:1px solid #f43f5e66;border-radius:18px;padding:24px;text-align:center;"><h2 style="color:#fda4af;margin-top:0;">Transaction Not Completed</h2><p style="color:#cbd5e1;font-size:14px;">${result.message}</p></div></body></html>`
      );
  }

  if (wantsJson) {
    return res.json({
      message: result.message,
      statusCode: result.statusCode,
      order: result.order,
      walletBalance: result.walletBalance,
      transaction: result.transaction,
      ledgerEntry: result.ledgerEntry,
    });
  }

  const isFailed = outcome === 'fail' || result.statusCode === 'FAILED';
  const amountText = result.order ? `₹${result.order.amount.toFixed(2)}` : '';
  const balText = result.walletBalance !== undefined ? `₹${result.walletBalance.toFixed(2)}` : 'Updated';

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(
    `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${isFailed ? 'Payment Cancelled' : `${amountText} Added to Wallet`} · CarpoolX</title>
</head>
<body style="font-family:system-ui,-apple-system,sans-serif;background:#080e1c;color:#f8fafc;margin:0;padding:24px;display:flex;align-items:center;justify-content:center;min-height:100vh;box-sizing:border-box;">
  <div style="max-width:420px;width:100%;background:#0d1628;border:1px solid ${isFailed ? '#f43f5e66' : '#10b98188'};border-radius:22px;padding:26px;text-align:center;box-shadow:0 24px 60px rgba(0,0,0,0.45);">
    <div style="width:52px;height:52px;border-radius:50%;margin:0 auto 14px;display:flex;align-items:center;justify-content:center;font-size:24px;background:${isFailed ? '#881337' : '#064e3b'};color:${isFailed ? '#fda4af' : '#34d399'};">
      ${isFailed ? '✕' : '✓'}
    </div>
    <h2 style="margin:0 0 8px;color:#fff;font-size:20px;">${
      isFailed ? 'Payment Cancelled' : `${amountText} Added to Wallet!`
    }</h2>
    <p style="font-size:13px;color:#cbd5e1;line-height:1.5;margin:0 0 18px;">${result.message}</p>
    <div style="background:#111d35;border:1px solid #1e293b;border-radius:14px;padding:14px;font-size:12px;text-align:left;margin-bottom:16px;">
      <div style="display:flex;justify-content:space-between;margin:4px 0;"><span style="color:#94a3b8">Order ID</span><strong style="font-family:monospace;color:#67e8f9">${result.order?.order_id || orderId}</strong></div>
      <div style="display:flex;justify-content:space-between;margin:4px 0;"><span style="color:#94a3b8">Current Wallet Balance</span><strong style="font-family:monospace;color:#34d399">${balText}</strong></div>
    </div>
    <p style="font-size:12px;color:#94a3b8;margin:0;">Your CarpoolX app will update automatically. You may close this browser tab.</p>
  </div>
</body>
</html>`
  );
});

// Disallow legacy unverified instant wallet top-up endpoint
bookingsRouter.post('/wallet/topup', (_req: Request, res: Response) => {
  res.status(403).json({
    error:
      'Direct unverified wallet top-ups are disabled. Use QR Wallet Recharge (/api/bookings/wallet/recharge/initiate) with server-side verification.',
  });
});

// Cancel a booking (ACID transaction — restores seats; refunds only if an overbooking/paid charge existed)
bookingsRouter.post('/:id/cancel', async (req: Request, res: Response) => {
  const authUser = getRequestUser(req);
  if (!authUser) {
    return res.status(401).json({ error: 'Authentication required to cancel a booking.' });
  }

  const bookingId = Number(req.params.id);
  const { reason } = req.body;

  const result = await db.executeSafeCancellation({
    bookingId,
    requestingUserId: authUser.user_id,
    reason: reason || 'Commuter change of schedule',
  });

  if (!result.success) {
    const httpStatus =
      result.statusCode === 'UNAUTHORIZED'
        ? 403
        : result.statusCode === 'NOT_FOUND'
        ? 404
        : 400;
    return res.status(httpStatus).json({ error: result.message, statusCode: result.statusCode });
  }

  res.json({
    message: result.message,
    booking: result.booking,
    refundTransactionId: result.refundTransactionId,
  });
});

// Get passenger/user transactions (including top-ups, ride debits, refunds, failed attempts) and wallet ledger
bookingsRouter.get('/transactions', (req: Request, res: Response) => {
  const authUser = getRequestUser(req);
  if (!authUser) {
    return res.status(401).json({ error: 'Authentication required to view transactions.' });
  }

  const targetUserId =
    authUser.role === 'admin' && req.query.passengerId
      ? Number(req.query.passengerId)
      : authUser.user_id;

  const targetUser = db.users.find((u) => u.user_id === targetUserId);
  const userTxns = db.transactions.filter(
    (t) => t.passenger_id === targetUserId || t.driver_id === targetUserId
  );
  const walletLedger = db.walletLedger.filter((l) => l.user_id === targetUserId);

  res.json({
    transactions: userTxns,
    walletLedger,
    walletBalance: targetUser?.wallet_balance ?? 0,
    earningsBalance: targetUser?.earnings_balance ?? 0,
  });
});

// Rate a driver after a completed ride booking (1-5 stars + optional review comment)
bookingsRouter.post('/:id/rate', async (req: Request, res: Response) => {
  const authUser = getRequestUser(req);
  if (!authUser) {
    return res.status(401).json({ error: 'Authentication required to submit a driver rating.' });
  }
  if (!isPassenger(authUser)) {
    return res.status(403).json({ error: 'Only Passenger accounts can rate drivers.' });
  }

  const bookingId = Number(req.params.id);
  const { rating, comment } = req.body || {};

  const result = await db.rateDriverForBooking({
    bookingId,
    passengerId: authUser.user_id,
    rating: Number(rating),
    comment,
  });

  if (!result.success) {
    const httpStatus =
      result.statusCode === 'UNAUTHORIZED'
        ? 403
        : result.statusCode === 'NOT_FOUND' || result.statusCode === 'DRIVER_MISSING'
        ? 404
        : result.statusCode === 'ALREADY_RATED' || result.statusCode === 'LOCK_CONFLICT'
        ? 409
        : 400;
    return res.status(httpStatus).json({ error: result.message, statusCode: result.statusCode });
  }

  res.status(201).json({
    message: result.message,
    ratingEntry: result.ratingEntry,
    booking: result.booking,
    driverNewRating: result.driverNewRating,
  });
});
