-- ==============================================================================
-- CARPOOLX - Safe Database Transaction Procedures & Workflows
-- ACID Implementation: Atomicity, Consistency, Isolation, Durability
-- ==============================================================================

USE carpoolx;

DELIMITER //

-- ------------------------------------------------------------------------------
-- PROCEDURE 1: SAFE BOOKING & UPFRONT WALLET DEBIT (ACID TRANSACTION)
-- Locks ride & user row, verifies seats & wallet balance, deducts CarpoolX Wallet,
-- creates PENDING booking, inserts fare_payment txn & DEBIT ledger, decrements seats.
-- Rolls back atomically on overbooking or insufficient balance.
-- ------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_safe_book_ride //
CREATE PROCEDURE sp_safe_book_ride (
  IN p_passenger_id INT,
  IN p_ride_id INT,
  IN p_seats_requested INT,
  IN p_pickup VARCHAR(150),
  IN p_dropoff VARCHAR(150),
  OUT p_booking_id INT,
  OUT p_status_code VARCHAR(30),
  OUT p_message VARCHAR(255)
)
proc_label: BEGIN
  DECLARE v_available_seats INT DEFAULT 0;
  DECLARE v_ride_status VARCHAR(20);
  DECLARE v_driver_id INT;
  DECLARE v_fare_per_seat DECIMAL(8, 2) DEFAULT 0.00;
  DECLARE v_total_fare DECIMAL(8, 2) DEFAULT 0.00;
  DECLARE v_wallet_before DECIMAL(10, 2) DEFAULT 0.00;
  DECLARE v_wallet_after DECIMAL(10, 2) DEFAULT 0.00;
  DECLARE v_txn_id VARCHAR(64);

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    SET p_booking_id = 0;
    SET p_status_code = 'SQL_ERROR';
    SET p_message = 'Database exception encountered. Booking & wallet transaction rolled back.';
  END;

  IF p_seats_requested <= 0 THEN
    SET p_booking_id = 0;
    SET p_status_code = 'INVALID_SEATS';
    SET p_message = 'Requested seats must be greater than zero.';
    LEAVE proc_label;
  END IF;

  START TRANSACTION;

  SELECT available_seats, status, driver_id, fare_per_seat
    INTO v_available_seats, v_ride_status, v_driver_id, v_fare_per_seat
    FROM rides
    WHERE ride_id = p_ride_id
    FOR UPDATE;

  IF v_ride_status IS NULL THEN
    ROLLBACK;
    SET p_booking_id = 0;
    SET p_status_code = 'RIDE_NOT_FOUND';
    SET p_message = 'Specified ride does not exist in system.';
    LEAVE proc_label;
  END IF;

  IF v_ride_status <> 'active' THEN
    ROLLBACK;
    SET p_booking_id = 0;
    SET p_status_code = 'RIDE_INACTIVE';
    SET p_message = CONCAT('Ride is not open for bookings. Current status: ', v_ride_status);
    LEAVE proc_label;
  END IF;

  IF v_driver_id = p_passenger_id THEN
    ROLLBACK;
    SET p_booking_id = 0;
    SET p_status_code = 'SELF_BOOKING';
    SET p_message = 'Users cannot book seats on rides they are driving.';
    LEAVE proc_label;
  END IF;

  IF v_available_seats < p_seats_requested THEN
    ROLLBACK;
    INSERT INTO booking_attempts (ride_id, passenger_id, seats_requested, attempted_fare, attempt_status, failure_code, failure_reason)
    VALUES (p_ride_id, p_passenger_id, p_seats_requested, v_fare_per_seat * p_seats_requested, 'overbooking', 'INSUFFICIENT_SEATS', CONCAT('Only ', v_available_seats, ' seat(s) available'));
    SET p_booking_id = 0;
    SET p_status_code = 'INSUFFICIENT_SEATS';
    SET p_message = CONCAT('Overbooking prevented: Only ', v_available_seats, ' seat(s) available.');
    LEAVE proc_label;
  END IF;

  SET v_total_fare = v_fare_per_seat * p_seats_requested;

  SELECT wallet_balance INTO v_wallet_before
    FROM users
    WHERE user_id = p_passenger_id
    FOR UPDATE;

  IF v_wallet_before < v_total_fare THEN
    ROLLBACK;
    INSERT INTO booking_attempts (ride_id, passenger_id, seats_requested, attempted_fare, attempt_status, failure_code, failure_reason)
    VALUES (p_ride_id, p_passenger_id, p_seats_requested, v_total_fare, 'failed', 'INSUFFICIENT_BALANCE', 'Insufficient CarpoolX Wallet balance');
    SET p_booking_id = 0;
    SET p_status_code = 'INSUFFICIENT_BALANCE';
    SET p_message = 'Insufficient CarpoolX Wallet balance.';
    LEAVE proc_label;
  END IF;

  SET v_wallet_after = v_wallet_before - v_total_fare;
  SET v_txn_id = CONCAT('TXN-WLT-', DATE_FORMAT(NOW(), '%Y%m%d%H%i%s'), '-', LPAD(FLOOR(RAND() * 9999), 4, '0'));

  UPDATE users SET wallet_balance = v_wallet_after WHERE user_id = p_passenger_id;
  UPDATE passengers SET total_spent = total_spent + v_total_fare WHERE passenger_id = p_passenger_id;

  INSERT INTO bookings (
    ride_id, passenger_id, seats_booked, pickup_point, dropoff_point, total_fare, status, payment_method, payment_status, transaction_id, paid_at, booking_time
  ) VALUES (
    p_ride_id, p_passenger_id, p_seats_requested, p_pickup, p_dropoff, v_total_fare, 'pending', 'wallet', 'paid', v_txn_id, NOW(), CURRENT_TIMESTAMP
  );

  SET p_booking_id = LAST_INSERT_ID();

  UPDATE rides
    SET available_seats = available_seats - p_seats_requested
    WHERE ride_id = p_ride_id;

  INSERT INTO transactions (
    transaction_id, booking_id, passenger_id, driver_id, amount, payment_method, payment_status, gateway_reference,
    transaction_type, entry_type, passenger_balance_before, passenger_balance_after
  ) VALUES (
    v_txn_id, p_booking_id, p_passenger_id, v_driver_id, v_total_fare, 'wallet', 'success', CONCAT('PAY_BK_', p_booking_id, '_', v_txn_id),
    'fare_payment', 'debit', v_wallet_before, v_wallet_after
  );

  INSERT INTO wallet_ledger (user_id, booking_id, transaction_id, entry_type, amount, balance_before, balance_after, description, status)
  VALUES (p_passenger_id, p_booking_id, v_txn_id, 'DEBIT', v_total_fare, v_wallet_before, v_wallet_after, CONCAT('CarpoolX Wallet ride payment for Booking #', p_booking_id), 'SUCCESS');

  COMMIT;

  SET p_status_code = 'SUCCESS';
  SET p_message = 'Booking created as PENDING and paid via CarpoolX Wallet.';
END //

-- ------------------------------------------------------------------------------
-- PROCEDURE 2: EDIT PENDING BOOKING DESTINATION & ADJUST WALLET ATOMICALLY
-- Only allowed while status = 'pending'. Pickup point remains unchanged.
-- ------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_edit_pending_booking //
CREATE PROCEDURE sp_edit_pending_booking (
  IN p_booking_id INT,
  IN p_passenger_id INT,
  IN p_new_dropoff VARCHAR(150),
  IN p_new_distance_km DECIMAL(6, 2),
  IN p_new_fare DECIMAL(8, 2),
  OUT p_status_code VARCHAR(30),
  OUT p_message VARCHAR(255)
)
proc_label: BEGIN
  DECLARE v_status VARCHAR(20);
  DECLARE v_owner_id INT;
  DECLARE v_old_dropoff VARCHAR(150);
  DECLARE v_old_fare DECIMAL(8, 2);
  DECLARE v_old_dist DECIMAL(6, 2);
  DECLARE v_diff DECIMAL(8, 2);
  DECLARE v_wallet_before DECIMAL(10, 2);
  DECLARE v_wallet_after DECIMAL(10, 2);
  DECLARE v_txn_id VARCHAR(64);

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    SET p_status_code = 'SQL_ERROR';
    SET p_message = 'Failed to update pending booking. Rolled back cleanly.';
  END;

  START TRANSACTION;

  SELECT status, passenger_id, dropoff_point, total_fare, COALESCE(estimated_distance_km, 10.00)
    INTO v_status, v_owner_id, v_old_dropoff, v_old_fare, v_old_dist
    FROM bookings
    WHERE booking_id = p_booking_id
    FOR UPDATE;

  IF v_status IS NULL THEN
    ROLLBACK;
    SET p_status_code = 'NOT_FOUND';
    SET p_message = 'Booking not found.';
    LEAVE proc_label;
  END IF;

  IF v_owner_id <> p_passenger_id THEN
    ROLLBACK;
    SET p_status_code = 'UNAUTHORIZED';
    SET p_message = 'Unauthorized edit attempt.';
    LEAVE proc_label;
  END IF;

  IF v_status <> 'pending' THEN
    ROLLBACK;
    SET p_status_code = 'EDIT_LOCKED';
    SET p_message = CONCAT('Cannot edit booking after status became ', v_status, '.');
    LEAVE proc_label;
  END IF;

  SET v_diff = p_new_fare - v_old_fare;

  IF v_diff <> 0 THEN
    SELECT wallet_balance INTO v_wallet_before FROM users WHERE user_id = p_passenger_id FOR UPDATE;
    IF v_diff > 0 AND v_wallet_before < v_diff THEN
      ROLLBACK;
      SET p_status_code = 'INSUFFICIENT_BALANCE';
      SET p_message = 'Insufficient wallet balance for fare increase.';
      LEAVE proc_label;
    END IF;
    SET v_wallet_after = v_wallet_before - v_diff;
    SET v_txn_id = CONCAT('TXN-ADJ-', DATE_FORMAT(NOW(), '%Y%m%d%H%i%s'), '-', LPAD(FLOOR(RAND() * 9999), 4, '0'));
    UPDATE users SET wallet_balance = v_wallet_after WHERE user_id = p_passenger_id;
    INSERT INTO wallet_ledger (user_id, booking_id, transaction_id, entry_type, amount, balance_before, balance_after, description, status)
    VALUES (
      p_passenger_id, p_booking_id, v_txn_id,
      IF(v_diff > 0, 'DEBIT', 'CREDIT'),
      ABS(v_diff), v_wallet_before, v_wallet_after,
      CONCAT('Fare adjustment for edited Booking #', p_booking_id), 'SUCCESS'
    );
  END IF;

  UPDATE bookings
    SET dropoff_point = p_new_dropoff,
        estimated_distance_km = p_new_distance_km,
        total_fare = p_new_fare,
        edit_count = edit_count + 1
    WHERE booking_id = p_booking_id;

  INSERT INTO booking_edit_history (
    booking_id, passenger_id, previous_destination, new_destination,
    previous_distance_km, new_distance_km, previous_fare, new_fare, fare_difference
  ) VALUES (
    p_booking_id, p_passenger_id, v_old_dropoff, p_new_dropoff,
    v_old_dist, p_new_distance_km, v_old_fare, p_new_fare, v_diff
  );

  COMMIT;
  SET p_status_code = 'SUCCESS';
  SET p_message = CONCAT('Pending booking #', p_booking_id, ' updated successfully.');
END //

-- ------------------------------------------------------------------------------
-- PROCEDURE 3: INDEPENDENT PER-BOOKING COMPLETION BY DRIVER & SETTLEMENT
-- Strictly targets WHERE booking_id = p_booking_id.
-- Releases escrowed fare to driver earnings_balance.
-- ------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_complete_booking //
CREATE PROCEDURE sp_complete_booking (
  IN p_booking_id INT,
  IN p_driver_id INT,
  OUT p_status_code VARCHAR(30),
  OUT p_message VARCHAR(255)
)
proc_label: BEGIN
  DECLARE v_current_status VARCHAR(20);
  DECLARE v_ride_driver_id INT;
  DECLARE v_passenger_id INT;
  DECLARE v_fare DECIMAL(8, 2);
  DECLARE v_settled BOOLEAN;
  DECLARE v_drv_before DECIMAL(10, 2);
  DECLARE v_drv_after DECIMAL(10, 2);
  DECLARE v_txn_id VARCHAR(64);

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    SET p_status_code = 'SQL_ERROR';
    SET p_message = 'Database error completing booking. Transaction rolled back.';
  END;

  START TRANSACTION;

  SELECT b.status, b.passenger_id, b.total_fare, b.driver_settled, r.driver_id
    INTO v_current_status, v_passenger_id, v_fare, v_settled, v_ride_driver_id
    FROM bookings b
    INNER JOIN rides r ON b.ride_id = r.ride_id
    WHERE b.booking_id = p_booking_id
    FOR UPDATE;

  IF v_current_status IS NULL THEN
    ROLLBACK;
    SET p_status_code = 'NOT_FOUND';
    SET p_message = 'Booking not found.';
    LEAVE proc_label;
  END IF;

  IF v_ride_driver_id <> p_driver_id THEN
    ROLLBACK;
    SET p_status_code = 'UNAUTHORIZED';
    SET p_message = 'Drivers can only complete bookings on their own rides.';
    LEAVE proc_label;
  END IF;

  IF v_current_status <> 'accepted' THEN
    ROLLBACK;
    SET p_status_code = 'INVALID_TRANSITION';
    SET p_message = CONCAT('Only ACCEPTED bookings can be completed. Current status: ', v_current_status);
    LEAVE proc_label;
  END IF;

  UPDATE bookings
    SET status = 'completed',
        completed_at = NOW(),
        driver_settled = TRUE
    WHERE booking_id = p_booking_id;

  IF NOT v_settled THEN
    SELECT earnings_balance INTO v_drv_before FROM users WHERE user_id = p_driver_id FOR UPDATE;
    SET v_drv_after = v_drv_before + v_fare;
    SET v_txn_id = CONCAT('TXN-DRV-', DATE_FORMAT(NOW(), '%Y%m%d%H%i%s'), '-', LPAD(FLOOR(RAND() * 9999), 4, '0'));
    UPDATE users SET earnings_balance = v_drv_after, total_rides_count = total_rides_count + 1 WHERE user_id = p_driver_id;
    UPDATE drivers SET total_earnings = total_earnings + v_fare WHERE driver_id = p_driver_id;
    INSERT INTO wallet_ledger (user_id, booking_id, transaction_id, entry_type, amount, balance_before, balance_after, description, status)
    VALUES (p_driver_id, p_booking_id, v_txn_id, 'CREDIT', v_fare, v_drv_before, v_drv_after, CONCAT('Driver payout settled for completed Booking #', p_booking_id), 'SUCCESS');
  END IF;

  COMMIT;

  SET p_status_code = 'SUCCESS';
  SET p_message = CONCAT('Booking #', p_booking_id, ' marked as COMPLETED and driver payout settled.');
END //

-- ------------------------------------------------------------------------------
-- PROCEDURE 4: SAFE CANCELLATION, SEAT RESTORATION & WALLET REFUND
-- ------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_safe_cancel_booking //
CREATE PROCEDURE sp_safe_cancel_booking (
  IN p_booking_id INT,
  IN p_requesting_user_id INT,
  IN p_reason VARCHAR(255),
  OUT p_status_code VARCHAR(30),
  OUT p_message VARCHAR(255)
)
proc_label: BEGIN
  DECLARE v_passenger_id INT;
  DECLARE v_ride_id INT;
  DECLARE v_seats_booked INT;
  DECLARE v_current_status VARCHAR(20);
  DECLARE v_payment_status VARCHAR(20);
  DECLARE v_total_fare DECIMAL(8, 2);
  DECLARE v_driver_id INT;
  DECLARE v_wallet_before DECIMAL(10, 2);
  DECLARE v_wallet_after DECIMAL(10, 2);
  DECLARE v_refund_txn VARCHAR(64);

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    SET p_status_code = 'SQL_ERROR';
    SET p_message = 'Error executing cancellation & refund. Rolled back.';
  END;

  START TRANSACTION;

  SELECT b.passenger_id, b.ride_id, b.seats_booked, b.status, b.payment_status, b.total_fare, r.driver_id
    INTO v_passenger_id, v_ride_id, v_seats_booked, v_current_status, v_payment_status, v_total_fare, v_driver_id
    FROM bookings b
    INNER JOIN rides r ON b.ride_id = r.ride_id
    WHERE b.booking_id = p_booking_id
    FOR UPDATE;

  IF v_current_status IS NULL THEN
    ROLLBACK;
    SET p_status_code = 'NOT_FOUND';
    SET p_message = 'Booking record does not exist.';
    LEAVE proc_label;
  END IF;

  IF v_passenger_id <> p_requesting_user_id AND v_driver_id <> p_requesting_user_id AND p_requesting_user_id <> 1 THEN
    ROLLBACK;
    SET p_status_code = 'UNAUTHORIZED';
    SET p_message = 'User is not authorized to cancel this booking.';
    LEAVE proc_label;
  END IF;

  IF v_current_status NOT IN ('pending', 'accepted') THEN
    ROLLBACK;
    SET p_status_code = 'CANNOT_CANCEL';
    SET p_message = CONCAT('Booking in status ', v_current_status, ' cannot be cancelled.');
    LEAVE proc_label;
  END IF;

  UPDATE bookings
    SET status = 'cancelled',
        payment_status = IF(v_payment_status = 'paid', 'refunded', v_payment_status),
        cancellation_reason = p_reason,
        cancelled_at = NOW()
    WHERE booking_id = p_booking_id;

  UPDATE rides
    SET available_seats = available_seats + v_seats_booked
    WHERE ride_id = v_ride_id;

  IF v_payment_status = 'paid' THEN
    SELECT wallet_balance INTO v_wallet_before FROM users WHERE user_id = v_passenger_id FOR UPDATE;
    SET v_wallet_after = v_wallet_before + v_total_fare;
    SET v_refund_txn = CONCAT('RFND-', DATE_FORMAT(NOW(), '%Y%m%d%H%i%s'), '-', LPAD(FLOOR(RAND() * 9999), 4, '0'));
    UPDATE users SET wallet_balance = v_wallet_after WHERE user_id = v_passenger_id;
    INSERT INTO transactions (
      transaction_id, booking_id, passenger_id, driver_id, amount, payment_method, payment_status, gateway_reference,
      transaction_type, entry_type, passenger_balance_before, passenger_balance_after, failure_reason
    ) VALUES (
      v_refund_txn, p_booking_id, v_passenger_id, v_driver_id, v_total_fare, 'wallet', 'refunded', CONCAT('RFND_BK_', p_booking_id, '_', v_refund_txn),
      'cancellation_refund', 'credit', v_wallet_before, v_wallet_after, p_reason
    );
    INSERT INTO wallet_ledger (user_id, booking_id, transaction_id, entry_type, amount, balance_before, balance_after, description, status)
    VALUES (p_passenger_id, p_booking_id, v_refund_txn, 'CREDIT', v_total_fare, v_wallet_before, v_wallet_after, CONCAT('Cancellation refund for Booking #', p_booking_id), 'SUCCESS');
  END IF;

  COMMIT;
  SET p_status_code = 'SUCCESS';
  SET p_message = CONCAT('Booking #', p_booking_id, ' cancelled, seats restored, and wallet refunded.');
END //

DELIMITER ;
