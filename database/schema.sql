-- ==============================================================================
-- CARPOOLX - Smart, Intelligent and Database-Driven Ride-Sharing Platform
-- DBMS Academic Project & Production Relational Schema
-- Database Name: carpoolx
-- Target RDBMS: MySQL 8.0+ / InnoDB Engine (ACID Compliant)
-- Primary Location: Bengaluru, Karnataka, India
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS carpoolx
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE carpoolx;

SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------------------------
-- 1. USERS TABLE
-- Core identity table for all platform actors (Single commuter account + Coordinator/Admin)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS users;
CREATE TABLE users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  phone VARCHAR(20) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('user', 'passenger', 'driver', 'admin', 'coordinator') NOT NULL DEFAULT 'user',
  wallet_balance DECIMAL(10, 2) NOT NULL DEFAULT 700.00 CHECK (wallet_balance >= 0),
  earnings_balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00 CHECK (earnings_balance >= 0),
  avatar_url VARCHAR(255) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  rating DECIMAL(3, 2) DEFAULT 5.00,
  total_rides_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_email (email),
  INDEX idx_users_role (role)
) ENGINE=InnoDB;

-- ------------------------------------------------------------------------------
-- 2. PASSENGERS TABLE (1-to-1 extension of users for commuter preferences)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS passengers;
CREATE TABLE passengers (
  passenger_id INT PRIMARY KEY,
  emergency_contact VARCHAR(20) NULL,
  preferred_payment_mode ENUM('wallet') NOT NULL DEFAULT 'wallet',
  corporate_domain VARCHAR(100) NULL,
  total_spent DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  carbon_saved_kg DECIMAL(8, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_passenger_user FOREIGN KEY (passenger_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------------------------
-- 3. DRIVERS TABLE (Optional 1-to-1 extension of users when offering rides)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS drivers;
CREATE TABLE drivers (
  driver_id INT PRIMARY KEY,
  license_number VARCHAR(50) NOT NULL UNIQUE,
  license_expiry DATE NOT NULL,
  is_verified BOOLEAN NOT NULL DEFAULT TRUE,
  total_earnings DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  pending_settlement DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  acceptance_rate DECIMAL(5, 2) NOT NULL DEFAULT 98.50,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_driver_user FOREIGN KEY (driver_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------------------------
-- 4. VEHICLES TABLE
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS vehicles;
CREATE TABLE vehicles (
  vehicle_id INT AUTO_INCREMENT PRIMARY KEY,
  driver_id INT NOT NULL,
  make_model VARCHAR(100) NOT NULL,
  registration_number VARCHAR(30) NOT NULL UNIQUE,
  vehicle_type ENUM('sedan', 'suv', 'hatchback', 'ev_crossover') NOT NULL DEFAULT 'ev_crossover',
  fuel_type ENUM('electric', 'petrol', 'diesel', 'cng') NOT NULL DEFAULT 'electric',
  color VARCHAR(40) NOT NULL DEFAULT 'Silver',
  total_capacity INT NOT NULL CHECK (total_capacity BETWEEN 1 AND 8),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_vehicle_driver FOREIGN KEY (driver_id) REFERENCES drivers(driver_id) ON DELETE CASCADE,
  INDEX idx_vehicle_driver (driver_id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------------------------
-- 5. RIDES TABLE
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS rides;
CREATE TABLE rides (
  ride_id INT AUTO_INCREMENT PRIMARY KEY,
  driver_id INT NOT NULL,
  vehicle_id INT NOT NULL,
  origin_name VARCHAR(150) NOT NULL,
  origin_lat DECIMAL(10, 7) NOT NULL,
  origin_lng DECIMAL(10, 7) NOT NULL,
  destination_name VARCHAR(150) NOT NULL,
  destination_lat DECIMAL(10, 7) NOT NULL,
  destination_lng DECIMAL(10, 7) NOT NULL,
  departure_time DATETIME NOT NULL,
  estimated_arrival DATETIME NOT NULL,
  estimated_distance_km DECIMAL(6, 2) NOT NULL,
  estimated_duration_min INT NOT NULL,
  total_seats INT NOT NULL CHECK (total_seats BETWEEN 1 AND 8),
  available_seats INT NOT NULL CHECK (available_seats >= 0),
  fare_per_seat DECIMAL(8, 2) NOT NULL CHECK (fare_per_seat >= 0),
  status ENUM('active', 'completed', 'cancelled', 'in_transit') NOT NULL DEFAULT 'active',
  corridor_name VARCHAR(100) DEFAULT 'Bengaluru Urban Corridor',
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_ride_driver FOREIGN KEY (driver_id) REFERENCES drivers(driver_id) ON DELETE CASCADE,
  CONSTRAINT fk_ride_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id) ON DELETE RESTRICT,
  CONSTRAINT chk_available_seats CHECK (available_seats <= total_seats),
  INDEX idx_rides_status_time (status, departure_time),
  INDEX idx_rides_origin_dest (origin_name, destination_name)
) ENGINE=InnoDB;

-- ------------------------------------------------------------------------------
-- 6. RIDE_STOPS TABLE
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS ride_stops;
CREATE TABLE ride_stops (
  stop_id INT AUTO_INCREMENT PRIMARY KEY,
  ride_id INT NOT NULL,
  stop_name VARCHAR(150) NOT NULL,
  stop_order INT NOT NULL,
  stop_lat DECIMAL(10, 7) NOT NULL,
  stop_lng DECIMAL(10, 7) NOT NULL,
  estimated_stop_time DATETIME NOT NULL,
  fare_from_origin DECIMAL(8, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_stop_ride FOREIGN KEY (ride_id) REFERENCES rides(ride_id) ON DELETE CASCADE,
  INDEX idx_stop_ride (ride_id, stop_order)
) ENGINE=InnoDB;

-- ------------------------------------------------------------------------------
-- 7. BOOKINGS TABLE
-- Upfront CarpoolX Wallet payment at confirmation; independent per booking_id.
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS bookings;
CREATE TABLE bookings (
  booking_id INT AUTO_INCREMENT PRIMARY KEY,
  ride_id INT NOT NULL,
  passenger_id INT NOT NULL,
  seats_booked INT NOT NULL DEFAULT 1 CHECK (seats_booked > 0),
  pickup_point VARCHAR(150) NOT NULL,
  dropoff_point VARCHAR(150) NOT NULL,
  dropoff_lat DECIMAL(10, 7) NULL,
  dropoff_lng DECIMAL(10, 7) NULL,
  estimated_distance_km DECIMAL(6, 2) NULL,
  total_fare DECIMAL(8, 2) NOT NULL CHECK (total_fare >= 0),
  status ENUM('pending', 'accepted', 'rejected', 'cancelled', 'completed') NOT NULL DEFAULT 'pending',
  payment_method ENUM('wallet') NOT NULL DEFAULT 'wallet',
  payment_status ENUM('paid', 'refunded', 'failed') NOT NULL DEFAULT 'paid',
  transaction_id VARCHAR(64) NULL,
  driver_settled BOOLEAN NOT NULL DEFAULT FALSE,
  edit_count INT NOT NULL DEFAULT 0,
  booking_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME NULL,
  paid_at DATETIME NULL,
  cancellation_reason VARCHAR(255) NULL,
  cancelled_at DATETIME NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_booking_ride FOREIGN KEY (ride_id) REFERENCES rides(ride_id) ON DELETE CASCADE,
  CONSTRAINT fk_booking_passenger FOREIGN KEY (passenger_id) REFERENCES users(user_id) ON DELETE CASCADE,
  INDEX idx_booking_passenger (passenger_id),
  INDEX idx_booking_ride (ride_id),
  INDEX idx_booking_status (status)
) ENGINE=InnoDB;

-- ------------------------------------------------------------------------------
-- 7B. BOOKING_EDIT_HISTORY TABLE (Audit trail for pending destination edits)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS booking_edit_history;
CREATE TABLE booking_edit_history (
  edit_id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  passenger_id INT NOT NULL,
  previous_destination VARCHAR(150) NOT NULL,
  new_destination VARCHAR(150) NOT NULL,
  previous_distance_km DECIMAL(6, 2) NOT NULL,
  new_distance_km DECIMAL(6, 2) NOT NULL,
  previous_fare DECIMAL(8, 2) NOT NULL,
  new_fare DECIMAL(8, 2) NOT NULL,
  fare_difference DECIMAL(8, 2) NOT NULL,
  edited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_edit_booking FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE,
  CONSTRAINT fk_edit_passenger FOREIGN KEY (passenger_id) REFERENCES users(user_id) ON DELETE CASCADE,
  INDEX idx_edit_booking (booking_id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------------------------
-- 7C. BOOKING_ATTEMPTS TABLE (Records failed / overbooking attempts after ROLLBACK)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS booking_attempts;
CREATE TABLE booking_attempts (
  attempt_id INT AUTO_INCREMENT PRIMARY KEY,
  ride_id INT NOT NULL,
  passenger_id INT NOT NULL,
  seats_requested INT NOT NULL,
  attempted_fare DECIMAL(8, 2) NOT NULL DEFAULT 0.00,
  attempt_status ENUM('failed', 'overbooking') NOT NULL,
  failure_code VARCHAR(64) NOT NULL,
  failure_reason VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_attempt_ride (ride_id),
  INDEX idx_attempt_passenger (passenger_id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------------------------
-- 8. TRANSACTIONS & WALLET_LEDGER TABLES
-- Double-entry financial ledger: CarpoolX Wallet for rides; external methods for top-ups
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS transactions;
CREATE TABLE transactions (
  transaction_id VARCHAR(64) PRIMARY KEY,
  booking_id INT NULL,
  passenger_id INT NOT NULL,
  driver_id INT NULL,
  amount DECIMAL(8, 2) NOT NULL CHECK (amount >= 0),
  payment_method ENUM('wallet', 'upi', 'card', 'netbanking', 'external_topup') NOT NULL DEFAULT 'wallet',
  topup_source ENUM('upi', 'card', 'netbanking') NULL,
  payment_status ENUM('success', 'refunded', 'failed') NOT NULL DEFAULT 'success',
  gateway_reference VARCHAR(100) NOT NULL UNIQUE,
  transaction_type ENUM('fare_payment', 'fare_adjustment', 'cancellation_refund', 'driver_payout', 'wallet_topup') NOT NULL DEFAULT 'fare_payment',
  parent_transaction_id VARCHAR(64) NULL,
  failure_reason VARCHAR(255) NULL,
  entry_type ENUM('debit', 'credit') NULL,
  passenger_balance_before DECIMAL(10, 2) NULL,
  passenger_balance_after DECIMAL(10, 2) NULL,
  driver_balance_before DECIMAL(10, 2) NULL,
  driver_balance_after DECIMAL(10, 2) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_tx_booking FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE SET NULL,
  CONSTRAINT fk_tx_passenger FOREIGN KEY (passenger_id) REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_tx_driver FOREIGN KEY (driver_id) REFERENCES users(user_id) ON DELETE SET NULL,
  INDEX idx_tx_booking (booking_id),
  INDEX idx_tx_passenger (passenger_id),
  INDEX idx_tx_status (payment_status)
) ENGINE=InnoDB;

DROP TABLE IF EXISTS wallet_ledger;
CREATE TABLE wallet_ledger (
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

-- ------------------------------------------------------------------------------
-- 9. CARPOOL_GROUPS & CARPOOL_MEMBERS
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS carpool_groups;
CREATE TABLE carpool_groups (
  group_id INT AUTO_INCREMENT PRIMARY KEY,
  group_name VARCHAR(120) NOT NULL,
  corridor_name VARCHAR(100) NOT NULL,
  coordinator_id INT NULL,
  ride_id INT NOT NULL,
  status ENUM('forming', 'active', 'completed', 'disbanded') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_group_coordinator FOREIGN KEY (coordinator_id) REFERENCES users(user_id) ON DELETE SET NULL,
  CONSTRAINT fk_group_ride FOREIGN KEY (ride_id) REFERENCES rides(ride_id) ON DELETE CASCADE
) ENGINE=InnoDB;

DROP TABLE IF EXISTS carpool_members;
CREATE TABLE carpool_members (
  member_id INT AUTO_INCREMENT PRIMARY KEY,
  group_id INT NOT NULL,
  passenger_id INT NOT NULL,
  seats INT NOT NULL DEFAULT 1,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_member_group FOREIGN KEY (group_id) REFERENCES carpool_groups(group_id) ON DELETE CASCADE,
  CONSTRAINT fk_member_passenger FOREIGN KEY (passenger_id) REFERENCES passengers(passenger_id) ON DELETE CASCADE,
  UNIQUE KEY uq_group_passenger (group_id, passenger_id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------------------------
-- 10. NOTIFICATIONS TABLE
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS notifications;
CREATE TABLE notifications (
  notification_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(150) NOT NULL,
  message TEXT NOT NULL,
  type ENUM('booking_confirmed', 'booking_cancelled', 'seat_request', 'ride_update', 'payment_success', 'issue_update', 'system_alert') NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notification_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  INDEX idx_notif_user_unread (user_id, is_read)
) ENGINE=InnoDB;

-- ------------------------------------------------------------------------------
-- 11. ISSUE_REPORTS, ISSUE_MESSAGES & ISSUE_RESOLUTION_HISTORY TABLES
-- Real-time Issue Resolution & Support Center managed by Coordinators & Escalated to Admin
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS issue_reports;
CREATE TABLE issue_reports (
  issue_id INT AUTO_INCREMENT PRIMARY KEY,
  reporter_id INT NOT NULL,
  reported_by_role ENUM('passenger', 'driver') NOT NULL DEFAULT 'passenger',
  ride_id INT NULL,
  booking_id INT NULL,
  category ENUM(
    'driver_delay',
    'passenger_no_show',
    'driver_unresponsive',
    'wrong_pickup',
    'incorrect_destination',
    'route_deviation',
    'payment_issue',
    'refund_not_received',
    'cancellation_dispute',
    'safety_concern',
    'booking_conflict',
    'overbooking_conflict',
    'vehicle_condition',
    'billing_issue',
    'technical_error',
    'misconduct'
  ) NOT NULL,
  severity ENUM('low', 'medium', 'high', 'critical') NOT NULL DEFAULT 'medium',
  status ENUM('open', 'investigating', 'resolved', 'closed', 'escalated') NOT NULL DEFAULT 'open',
  description TEXT NOT NULL,
  assigned_coordinator_id INT NULL,
  resolution_notes TEXT NULL,
  escalated_to_admin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  resolved_at DATETIME NULL,
  CONSTRAINT fk_issue_reporter FOREIGN KEY (reporter_id) REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_issue_coordinator FOREIGN KEY (assigned_coordinator_id) REFERENCES users(user_id) ON DELETE SET NULL,
  INDEX idx_issue_status (status),
  INDEX idx_issue_priority (severity)
) ENGINE=InnoDB;

DROP TABLE IF EXISTS issue_messages;
CREATE TABLE issue_messages (
  message_id INT AUTO_INCREMENT PRIMARY KEY,
  issue_id INT NOT NULL,
  sender_id INT NOT NULL,
  sender_name VARCHAR(120) NOT NULL,
  sender_role ENUM('passenger', 'driver', 'coordinator', 'admin') NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_issue_msg_issue FOREIGN KEY (issue_id) REFERENCES issue_reports(issue_id) ON DELETE CASCADE,
  CONSTRAINT fk_issue_msg_sender FOREIGN KEY (sender_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

DROP TABLE IF EXISTS issue_resolution_history;
CREATE TABLE issue_resolution_history (
  history_id INT AUTO_INCREMENT PRIMARY KEY,
  issue_id INT NOT NULL,
  actor_id INT NOT NULL,
  actor_name VARCHAR(120) NOT NULL,
  actor_role VARCHAR(30) NOT NULL,
  action VARCHAR(80) NOT NULL,
  previous_status VARCHAR(30) NULL,
  new_status VARCHAR(30) NOT NULL,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_issue_hist_issue FOREIGN KEY (issue_id) REFERENCES issue_reports(issue_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------------------------
-- 12. AUDIT_LOGS TABLE
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS audit_logs;
CREATE TABLE audit_logs (
  log_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(50) NOT NULL,
  ip_address VARCHAR(45) DEFAULT '127.0.0.1',
  details JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_action (action),
  INDEX idx_audit_entity (entity_type, entity_id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------------------------
-- 13. DRIVER_RATINGS TABLE
-- Post-completion passenger ratings & reviews for drivers (1 rating per booking)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS driver_ratings;
CREATE TABLE driver_ratings (
  rating_id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL UNIQUE,
  ride_id INT NOT NULL,
  passenger_id INT NOT NULL,
  driver_id INT NOT NULL,
  rating TINYINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_comment VARCHAR(500) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_rating_booking FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE,
  CONSTRAINT fk_rating_ride FOREIGN KEY (ride_id) REFERENCES rides(ride_id) ON DELETE CASCADE,
  CONSTRAINT fk_rating_passenger FOREIGN KEY (passenger_id) REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_rating_driver FOREIGN KEY (driver_id) REFERENCES users(user_id) ON DELETE CASCADE,
  INDEX idx_rating_driver (driver_id),
  INDEX idx_rating_passenger (passenger_id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------------------------
-- 14. WALLET_RECHARGE_ORDERS TABLE
-- Tracks QR wallet recharge requests verified via backend gateway/webhook checks
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS wallet_recharge_orders;
CREATE TABLE wallet_recharge_orders (
  order_id VARCHAR(64) PRIMARY KEY,
  user_id INT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 10),
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  mode ENUM('demo', 'upi_gateway', 'razorpay') NOT NULL DEFAULT 'demo',
  status ENUM('PENDING', 'SCANNED', 'SUCCESS', 'FAILED', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
  merchant_txn_ref VARCHAR(100) NOT NULL UNIQUE,
  gateway_order_id VARCHAR(100) NULL,
  gateway_payment_id VARCHAR(100) NULL,
  qr_payload TEXT NOT NULL,
  credited BOOLEAN NOT NULL DEFAULT FALSE,
  failure_reason VARCHAR(255) NULL,
  expires_at DATETIME NOT NULL,
  verified_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_recharge_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  INDEX idx_recharge_user (user_id, created_at),
  INDEX idx_recharge_status (status)
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;
