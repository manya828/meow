-- ==============================================================================
-- CARPOOLX - Seed Data for Bengaluru Commuter Network
-- Demonstrating realistic Bengaluru tech corridors, users, and transactions
-- ==============================================================================

USE carpoolx;

SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE audit_logs;
TRUNCATE TABLE issue_reports;
TRUNCATE TABLE notifications;
TRUNCATE TABLE carpool_members;
TRUNCATE TABLE carpool_groups;
TRUNCATE TABLE transactions;
TRUNCATE TABLE bookings;
TRUNCATE TABLE ride_stops;
TRUNCATE TABLE rides;
TRUNCATE TABLE vehicles;
TRUNCATE TABLE drivers;
TRUNCATE TABLE passengers;
TRUNCATE TABLE users;

-- ------------------------------------------------------------------------------
-- 1. SEED USERS
-- Password for demo accounts: "Password@123" (pre-hashed with bcrypt or accepted)
-- ------------------------------------------------------------------------------
INSERT INTO users (user_id, full_name, email, phone, password_hash, role, rating, total_rides_count) VALUES
-- Admin
(1, 'Vikram Malhotra', 'admin@carpoolx.in', '+91 98860 11001', '$2b$10$ep5zK.zV5PZlB5yHhH7KEO0xG8Z1dY1sC/ZJ3qFhL3m/M9O9l99aC', 'admin', 5.00, 0),
-- Coordinators
(2, 'Priya Nair', 'priya.nair@carpoolx.in', '+91 98450 22002', '$2b$10$ep5zK.zV5PZlB5yHhH7KEO0xG8Z1dY1sC/ZJ3qFhL3m/M9O9l99aC', 'coordinator', 4.95, 240),
(3, 'Arun Venkatesh', 'arun.v@carpoolx.in', '+91 98450 33003', '$2b$10$ep5zK.zV5PZlB5yHhH7KEO0xG8Z1dY1sC/ZJ3qFhL3m/M9O9l99aC', 'coordinator', 4.88, 180),
-- Drivers
(4, 'Rajesh Kumar', 'rajesh.driver@gmail.com', '+91 98451 44004', '$2b$10$ep5zK.zV5PZlB5yHhH7KEO0xG8Z1dY1sC/ZJ3qFhL3m/M9O9l99aC', 'driver', 4.92, 128),
(5, 'Sunita Hegde', 'sunita.hegde@gmail.com', '+91 98451 55005', '$2b$10$ep5zK.zV5PZlB5yHhH7KEO0xG8Z1dY1sC/ZJ3qFhL3m/M9O9l99aC', 'driver', 4.89, 94),
(6, 'Deepak Shenoy', 'deepak.shenoy@techcorp.com', '+91 98451 66006', '$2b$10$ep5zK.zV5PZlB5yHhH7KEO0xG8Z1dY1sC/ZJ3qFhL3m/M9O9l99aC', 'driver', 4.96, 210),
(7, 'Ananya Sharma', 'ananya.s@mobility.in', '+91 98451 77007', '$2b$10$ep5zK.zV5PZlB5yHhH7KEO0xG8Z1dY1sC/ZJ3qFhL3m/M9O9l99aC', 'driver', 4.85, 76),
-- Passengers
(8, 'Karthik Rao', 'karthik.rao@infosys.com', '+91 97410 88008', '$2b$10$ep5zK.zV5PZlB5yHhH7KEO0xG8Z1dY1sC/ZJ3qFhL3m/M9O9l99aC', 'passenger', 4.90, 42),
(9, 'Neha Deshmukh', 'neha.deshmukh@wipro.com', '+91 97410 99009', '$2b$10$ep5zK.zV5PZlB5yHhH7KEO0xG8Z1dY1sC/ZJ3qFhL3m/M9O9l99aC', 'passenger', 4.95, 38),
(10, 'Rohan Mehta', 'rohan.mehta@flipkart.com', '+91 97410 10101', '$2b$10$ep5zK.zV5PZlB5yHhH7KEO0xG8Z1dY1sC/ZJ3qFhL3m/M9O9l99aC', 'passenger', 4.80, 25),
(11, 'Swathi Krishnan', 'swathi.k@accenture.com', '+91 97410 20202', '$2b$10$ep5zK.zV5PZlB5yHhH7KEO0xG8Z1dY1sC/ZJ3qFhL3m/M9O9l99aC', 'passenger', 5.00, 19),
(12, 'Aditya Joshi', 'aditya.joshi@startup.io', '+91 97410 30303', '$2b$10$ep5zK.zV5PZlB5yHhH7KEO0xG8Z1dY1sC/ZJ3qFhL3m/M9O9l99aC', 'passenger', 4.75, 12);

-- ------------------------------------------------------------------------------
-- 2. SEED PASSENGERS
-- ------------------------------------------------------------------------------
INSERT INTO passengers (passenger_id, emergency_contact, preferred_payment_mode, corporate_domain, total_spent, carbon_saved_kg) VALUES
(8, '+91 98800 00111', 'upi', 'infosys.com', 4850.00, 142.50),
(9, '+91 98800 00222', 'card', 'wipro.com', 3920.00, 118.20),
(10, '+91 98800 00333', 'upi', 'flipkart.com', 2600.00, 78.40),
(11, '+91 98800 00444', 'wallet', 'accenture.com', 1980.00, 62.00),
(12, '+91 98800 00555', 'upi', 'startup.io', 1250.00, 39.50);

-- ------------------------------------------------------------------------------
-- 3. SEED DRIVERS
-- ------------------------------------------------------------------------------
INSERT INTO drivers (driver_id, license_number, license_expiry, is_verified, total_earnings, pending_settlement, acceptance_rate) VALUES
(4, 'KA-01-2018-0094821', '2030-05-15', TRUE, 28450.00, 1850.00, 98.50),
(5, 'KA-05-2019-0043129', '2031-08-20', TRUE, 19200.00, 1200.00, 96.00),
(6, 'KA-03-2016-0081234', '2028-11-10', TRUE, 42800.00, 2400.00, 99.20),
(7, 'KA-51-2020-0065432', '2032-03-18', TRUE, 14600.00, 950.00, 97.40);

-- ------------------------------------------------------------------------------
-- 4. SEED VEHICLES
-- ------------------------------------------------------------------------------
INSERT INTO vehicles (vehicle_id, driver_id, make_model, registration_number, vehicle_type, fuel_type, color, total_capacity) VALUES
(1, 4, 'Tata Nexon EV Max', 'KA-01-MJ-4821', 'ev_crossover', 'electric', 'Intense Teal', 4),
(2, 5, 'Hyundai Ioniq 5', 'KA-05-NB-7744', 'ev_crossover', 'electric', 'Gravity Gold', 4),
(3, 6, 'Toyota Innova Hycross', 'KA-03-MK-9912', 'suv', 'petrol', 'Pearl White', 6),
(4, 7, 'MG ZS EV Excite', 'KA-51-EV-3301', 'ev_crossover', 'electric', 'Currant Red', 4);

-- ------------------------------------------------------------------------------
-- 5. SEED RIDES (Upcoming and Active in Bengaluru)
-- ------------------------------------------------------------------------------
INSERT INTO rides (ride_id, driver_id, vehicle_id, origin_name, origin_lat, origin_lng, destination_name, destination_lat, destination_lng, departure_time, estimated_arrival, estimated_distance_km, estimated_duration_min, total_seats, available_seats, fare_per_seat, status, corridor_name, notes) VALUES
-- Ride 1: Electronic City to Indiranagar (Elevated Expressway -> Koramangala -> Indiranagar)
(1, 4, 1, 'Electronic City Phase 1', 12.839939, 77.677003, 'Indiranagar 100ft Road', 12.978369, 77.640836, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 2 HOUR), DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 3 HOUR), 22.40, 52, 4, 2, 180.00, 'active', 'Silk Board & Hosur Rd Express Corridor', 'Comfortable AC EV ride. Charging completed. Soft instrumental music.'),

-- Ride 2: Whitefield ITPL to Koramangala (Marathahalli ORR route)
(2, 5, 2, 'ITPL Tech Park Whitefield', 12.986345, 77.734458, 'Koramangala Sony World Signal', 12.935193, 77.624481, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 4 HOUR), DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 5 HOUR), 18.60, 48, 4, 3, 160.00, 'active', 'Outer Ring Road (ORR) Tech Spine', 'Spacious Ioniq 5 EV. Pickup near Gate 3 ITPL.'),

-- Ride 3: Hebbal Flyover to Electronic City (via Outer Ring Road Marathahalli)
(3, 6, 3, 'Hebbal Esteem Mall', 13.035847, 77.597022, 'Electronic City Wipro Gate', 12.838562, 77.662914, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 6 HOUR), DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 8 HOUR), 34.80, 80, 6, 4, 250.00, 'active', 'North-South Tech Meridian', 'Premium 6-seater hybrid SUV. Luggage space available.'),

-- Ride 4: Banashankari to MG Road (via Jayanagar & Lalbagh)
(4, 7, 4, 'Banashankari BDA Complex', 12.925453, 77.546757, 'MG Road Metro Station', 12.975631, 77.606628, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 8 HOUR), DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 9 HOUR), 11.20, 35, 4, 1, 120.00, 'active', 'South Central Commuter Line', 'Daily weekday commuter carpool. Non-smoking vehicle.'),

-- Ride 5: Yelahanka to Whitefield (via Bagalur & Budigere Cross)
(5, 4, 1, 'Yelahanka Satellite Town', 13.100693, 77.596345, 'Whitefield Hope Farm Junction', 12.983944, 77.751859, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 26 HOUR), DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 28 HOUR), 32.50, 70, 4, 3, 220.00, 'active', 'North-East Aerocity Link', 'Express route via Budigere cross to bypass city traffic.');

-- ------------------------------------------------------------------------------
-- 6. SEED RIDE STOPS (Waypoints with Fares)
-- ------------------------------------------------------------------------------
INSERT INTO ride_stops (stop_id, ride_id, stop_name, stop_order, stop_lat, stop_lng, estimated_stop_time, fare_from_origin) VALUES
(1, 1, 'Silk Board Flyover Junction', 1, 12.917415, 77.623773, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 140 MINUTE), 110.00),
(2, 1, 'Koramangala 80ft Road', 2, 12.935193, 77.624481, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 160 MINUTE), 150.00),
(3, 2, 'Marathahalli Bridge', 1, 12.956924, 77.701127, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 260 MINUTE), 80.00),
(4, 2, 'Bellandur EcoSpace', 2, 12.926031, 77.676246, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 280 MINUTE), 120.00),
(5, 3, 'Kalyan Nagar Ring Road', 1, 13.028005, 77.638863, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 380 MINUTE), 80.00),
(6, 3, 'Marathahalli Innovative Multiplex', 2, 12.953500, 77.704200, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 410 MINUTE), 160.00),
(7, 4, 'Jayanagar 4th Block Complex', 1, 12.929869, 77.583344, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 495 MINUTE), 60.00);

-- ------------------------------------------------------------------------------
-- 7. SEED BOOKINGS
-- ------------------------------------------------------------------------------
INSERT INTO bookings (booking_id, ride_id, passenger_id, seats_booked, pickup_point, dropoff_point, total_fare, status, booking_time) VALUES
(1, 1, 8, 1, 'Electronic City Phase 1', 'Indiranagar 100ft Road', 180.00, 'confirmed', DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 3 HOUR)),
(2, 1, 9, 1, 'Electronic City Phase 1', 'Koramangala 80ft Road', 150.00, 'confirmed', DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 2 HOUR)),
(3, 2, 10, 1, 'ITPL Tech Park Whitefield', 'Bellandur EcoSpace', 120.00, 'confirmed', DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 1 HOUR)),
(4, 3, 11, 2, 'Hebbal Esteem Mall', 'Electronic City Wipro Gate', 500.00, 'confirmed', DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 30 MINUTE)),
(5, 4, 12, 3, 'Banashankari BDA Complex', 'MG Road Metro Station', 360.00, 'confirmed', DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 10 MINUTE));

-- ------------------------------------------------------------------------------
-- 8. SEED TRANSACTIONS
-- ------------------------------------------------------------------------------
INSERT INTO transactions (transaction_id, booking_id, passenger_id, driver_id, amount, payment_method, payment_status, gateway_reference, transaction_type) VALUES
('TXN-BLR-2026-00192', 1, 8, 4, 180.00, 'upi', 'success', 'UPI/20260312/98482018', 'fare_payment'),
('TXN-BLR-2026-00193', 2, 9, 4, 150.00, 'card', 'success', 'CARD/HDFC/88392104', 'fare_payment'),
('TXN-BLR-2026-00194', 3, 10, 5, 120.00, 'upi', 'success', 'UPI/20260312/11294829', 'fare_payment'),
('TXN-BLR-2026-00195', 4, 11, 6, 500.00, 'wallet', 'success', 'WAL/PAYTM/49102831', 'fare_payment'),
('TXN-BLR-2026-00196', 5, 12, 7, 360.00, 'upi', 'success', 'UPI/20260312/77192840', 'fare_payment');

-- ------------------------------------------------------------------------------
-- 9. SEED CARPOOL GROUPS & MEMBERS
-- ------------------------------------------------------------------------------
INSERT INTO carpool_groups (group_id, group_name, corridor_name, coordinator_id, ride_id, status) VALUES
(1, 'Infosys-Electronic City Shuttle X', 'Silk Board & Hosur Rd Express Corridor', 2, 1, 'active'),
(2, 'ITPL-Bellandur Tech Express', 'Outer Ring Road (ORR) Tech Spine', 3, 2, 'active');

INSERT INTO carpool_members (group_id, passenger_id, seats) VALUES
(1, 8, 1),
(1, 9, 1),
(2, 10, 1);

-- ------------------------------------------------------------------------------
-- 10. SEED NOTIFICATIONS
-- ------------------------------------------------------------------------------
INSERT INTO notifications (user_id, title, message, type, is_read) VALUES
(8, 'Booking Confirmed', 'Your seat on Electronic City -> Indiranagar with Rajesh Kumar is confirmed.', 'booking_confirmed', FALSE),
(4, 'New Passenger Joined', 'Karthik Rao reserved 1 seat for Electronic City to Indiranagar.', 'seat_request', FALSE),
(11, 'Payment Successful', 'Transaction TXN-BLR-2026-00195 for INR 500.00 was processed successfully.', 'payment_success', TRUE),
(1, 'System Audit Alert', '5 high-occupancy carpools coordinated during peak Bengaluru morning hours.', 'system_alert', FALSE);

-- ------------------------------------------------------------------------------
-- 11. SEED ISSUE REPORTS (Coordinator Management)
-- ------------------------------------------------------------------------------
INSERT INTO issue_reports (issue_id, reporter_id, ride_id, booking_id, category, severity, status, description, assigned_coordinator_id, resolution_notes) VALUES
(1, 10, 2, 3, 'driver_delay', 'low', 'resolved', 'Driver delayed by 8 mins due to waterlogging at Marathahalli underpass.', 2, 'Rerouted via HAL Old Airport Road corridor; passenger reached on time.'),
(2, 9, 1, 2, 'route_deviation', 'medium', 'open', 'Requesting pickup closer to Silk Board bus bay instead of toll gate.', 3, NULL);

-- ------------------------------------------------------------------------------
-- 12. SEED AUDIT LOGS
-- ------------------------------------------------------------------------------
INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, details) VALUES
(8, 'BOOKING_CREATED', 'booking', '1', '106.51.78.22', '{"seats": 1, "fare": 180, "status": "confirmed"}'),
(4, 'RIDE_PUBLISHED', 'ride', '1', '106.51.78.44', '{"total_seats": 4, "origin": "Electronic City"}'),
(11, 'PAYMENT_PROCESSED', 'transaction', 'TXN-BLR-2026-00195', '106.51.78.99', '{"amount": 500, "mode": "wallet"}');

SET FOREIGN_KEY_CHECKS = 1;
