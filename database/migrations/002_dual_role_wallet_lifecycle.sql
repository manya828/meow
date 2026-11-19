-- ==============================================================================
-- CARPOOLX MIGRATION 002:
--   1. Unified single user account (Driver + Passenger on same user_id)
--   2. Independent per-booking lifecycle (pending -> accepted -> completed / rejected / cancelled)
--   3. Wallet & Driver Earnings balances + Double-entry wallet_ledger + Duplicate payment lock
-- Safe to run against existing carpoolx database without losing existing rows.
-- ==============================================================================

USE carpoolx;

-- 1. Extend users table with unified role + wallet/earnings balances
ALTER TABLE users
  MODIFY COLUMN role ENUM('user', 'passenger', 'driver', 'admin', 'coordinator') NOT NULL DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS wallet_balance DECIMAL(10, 2) NOT NULL DEFAULT 1500.00 AFTER role,
  ADD COLUMN IF NOT EXISTS earnings_balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00 AFTER wallet_balance;

-- Sync existing driver earnings into users.earnings_balance
UPDATE users u
INNER JOIN drivers d ON u.user_id = d.driver_id
SET u.earnings_balance = d.total_earnings;

-- Ensure all normal users (existing drivers and passengers) have a passengers profile row
INSERT IGNORE INTO passengers (passenger_id, emergency_contact, preferred_payment_mode)
SELECT user_id, phone, 'wallet'
FROM users
WHERE role IN ('user', 'passenger', 'driver');

-- 2. Update bookings table for independent status & payment lifecycle
ALTER TABLE bookings
  MODIFY COLUMN status ENUM('pending', 'accepted', 'confirmed', 'rejected', 'cancelled', 'completed') NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payment_status ENUM('unpaid', 'pending', 'paid', 'refunded', 'failed') NOT NULL DEFAULT 'unpaid' AFTER status,
  ADD COLUMN IF NOT EXISTS completed_at DATETIME NULL AFTER booking_time,
  ADD COLUMN IF NOT EXISTS paid_at DATETIME NULL AFTER completed_at;

-- Migrate legacy 'confirmed' bookings to 'accepted'
UPDATE bookings SET status = 'accepted' WHERE status = 'confirmed';

-- 3. Update transactions table with debit/credit tracking & duplicate-charge prevention
ALTER TABLE transactions
  MODIFY COLUMN transaction_type ENUM('fare_payment', 'cancellation_refund', 'driver_payout', 'wallet_topup') NOT NULL DEFAULT 'fare_payment',
  ADD COLUMN IF NOT EXISTS entry_type ENUM('debit', 'credit') NULL AFTER transaction_type,
  ADD COLUMN IF NOT EXISTS passenger_balance_before DECIMAL(10, 2) NULL AFTER entry_type,
  ADD COLUMN IF NOT EXISTS passenger_balance_after DECIMAL(10, 2) NULL AFTER passenger_balance_before,
  ADD COLUMN IF NOT EXISTS driver_balance_before DECIMAL(10, 2) NULL AFTER passenger_balance_after,
  ADD COLUMN IF NOT EXISTS driver_balance_after DECIMAL(10, 2) NULL AFTER driver_balance_before;

-- Prevent duplicate successful fare_payment rows per booking at database constraint level
ALTER TABLE transactions
  ADD UNIQUE KEY uq_booking_fare_payment (booking_id, transaction_type);

-- 4. Create wallet_ledger table for full DEBIT / CREDIT audit trail per user
CREATE TABLE IF NOT EXISTS wallet_ledger (
  ledger_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  booking_id INT NULL,
  transaction_id VARCHAR(64) NOT NULL,
  entry_type ENUM('DEBIT', 'CREDIT') NOT NULL,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
  balance_before DECIMAL(10, 2) NOT NULL,
  balance_after DECIMAL(10, 2) NOT NULL,
  description VARCHAR(255) NOT NULL,
  status ENUM('PENDING', 'SUCCESS', 'FAILED') NOT NULL DEFAULT 'SUCCESS',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ledger_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_ledger_booking FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE SET NULL,
  INDEX idx_ledger_user (user_id, created_at),
  INDEX idx_ledger_booking (booking_id)
) ENGINE=InnoDB;
