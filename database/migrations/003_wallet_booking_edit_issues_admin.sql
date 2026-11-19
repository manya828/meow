-- ==============================================================================
-- MIGRATION 003: Wallet Booking Consistency, Pending Edits, Issues & Analytics
-- ==============================================================================

USE carpoolx;

-- 1. Enforce non-negative wallet & earnings balances
ALTER TABLE users
  MODIFY COLUMN wallet_balance DECIMAL(10, 2) NOT NULL DEFAULT 700.00,
  MODIFY COLUMN earnings_balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00;

-- 2. Extend bookings for pending destination edit tracking & driver escrow settlement
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS dropoff_lat DECIMAL(10, 7) NULL,
  ADD COLUMN IF NOT EXISTS dropoff_lng DECIMAL(10, 7) NULL,
  ADD COLUMN IF NOT EXISTS estimated_distance_km DECIMAL(6, 2) NULL,
  ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(64) NULL,
  ADD COLUMN IF NOT EXISTS driver_settled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS edit_count INT NOT NULL DEFAULT 0;

-- 3. Create booking_edit_history audit table
CREATE TABLE IF NOT EXISTS booking_edit_history (
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
  CONSTRAINT fk_mig_edit_booking FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE,
  CONSTRAINT fk_mig_edit_passenger FOREIGN KEY (passenger_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 4. Create failed/overbooking attempt telemetry table
CREATE TABLE IF NOT EXISTS booking_attempts (
  attempt_id INT AUTO_INCREMENT PRIMARY KEY,
  ride_id INT NOT NULL,
  passenger_id INT NOT NULL,
  seats_requested INT NOT NULL,
  attempted_fare DECIMAL(8, 2) NOT NULL DEFAULT 0.00,
  attempt_status ENUM('failed', 'overbooking') NOT NULL,
  failure_code VARCHAR(64) NOT NULL,
  failure_reason VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 5. Expand transactions for top-up source tracking, parent refund linkage & failure reason
ALTER TABLE transactions
  MODIFY COLUMN booking_id INT NULL,
  MODIFY COLUMN driver_id INT NULL,
  ADD COLUMN IF NOT EXISTS topup_source ENUM('upi', 'card', 'netbanking') NULL,
  ADD COLUMN IF NOT EXISTS parent_transaction_id VARCHAR(64) NULL,
  ADD COLUMN IF NOT EXISTS failure_reason VARCHAR(255) NULL;

-- 6. Expand issue_reports & add two-way messages + resolution history
ALTER TABLE issue_reports
  ADD COLUMN IF NOT EXISTS reported_by_role ENUM('passenger', 'driver') NOT NULL DEFAULT 'passenger',
  ADD COLUMN IF NOT EXISTS escalated_to_admin BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS issue_messages (
  message_id INT AUTO_INCREMENT PRIMARY KEY,
  issue_id INT NOT NULL,
  sender_id INT NOT NULL,
  sender_name VARCHAR(120) NOT NULL,
  sender_role ENUM('passenger', 'driver', 'coordinator', 'admin') NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_mig_msg_issue FOREIGN KEY (issue_id) REFERENCES issue_reports(issue_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS issue_resolution_history (
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
  CONSTRAINT fk_mig_hist_issue FOREIGN KEY (issue_id) REFERENCES issue_reports(issue_id) ON DELETE CASCADE
) ENGINE=InnoDB;
