-- ==============================================================================
-- CARPOOLX - Relational Database Views
-- Demonstrating SQL abstraction, multi-table joins, and aggregate reporting
-- ==============================================================================

USE carpoolx;

-- ------------------------------------------------------------------------------
-- VIEW 1: ACTIVE RIDES WITH DRIVER & VEHICLE DETAILS
-- ------------------------------------------------------------------------------
DROP VIEW IF EXISTS view_active_rides;
CREATE VIEW view_active_rides AS
SELECT 
  r.ride_id,
  r.origin_name,
  r.origin_lat,
  r.origin_lng,
  r.destination_name,
  r.destination_lat,
  r.destination_lng,
  r.departure_time,
  r.estimated_arrival,
  r.estimated_distance_km,
  r.estimated_duration_min,
  r.total_seats,
  r.available_seats,
  r.fare_per_seat,
  r.status AS ride_status,
  r.corridor_name,
  r.notes,
  u.user_id AS driver_user_id,
  u.full_name AS driver_name,
  u.phone AS driver_phone,
  u.rating AS driver_rating,
  u.total_rides_count AS driver_completed_trips,
  d.acceptance_rate,
  v.vehicle_id,
  v.make_model AS vehicle_model,
  v.registration_number,
  v.vehicle_type,
  v.fuel_type,
  v.color AS vehicle_color
FROM rides r
INNER JOIN drivers d ON r.driver_id = d.driver_id
INNER JOIN users u ON d.driver_id = u.user_id
INNER JOIN vehicles v ON r.vehicle_id = v.vehicle_id
WHERE r.status = 'active' AND r.available_seats > 0;

-- ------------------------------------------------------------------------------
-- VIEW 2: COMPREHENSIVE BOOKING DETAILS
-- ------------------------------------------------------------------------------
DROP VIEW IF EXISTS view_booking_details;
CREATE VIEW view_booking_details AS
SELECT 
  b.booking_id,
  b.seats_booked,
  b.pickup_point,
  b.dropoff_point,
  b.estimated_distance_km,
  b.total_fare,
  b.status AS booking_status,
  b.payment_status,
  b.driver_settled,
  b.edit_count,
  b.booking_time,
  b.completed_at,
  b.paid_at,
  b.cancellation_reason,
  u_pass.user_id AS passenger_id,
  u_pass.full_name AS passenger_name,
  u_pass.email AS passenger_email,
  u_pass.phone AS passenger_phone,
  p.corporate_domain,
  r.ride_id,
  r.origin_name,
  r.destination_name,
  r.departure_time,
  r.corridor_name,
  u_drv.user_id AS driver_id,
  u_drv.full_name AS driver_name,
  u_drv.phone AS driver_phone,
  v.make_model AS vehicle_model,
  v.registration_number,
  t.transaction_id,
  t.payment_method,
  t.payment_status AS transaction_status
FROM bookings b
INNER JOIN users u_pass ON b.passenger_id = u_pass.user_id
LEFT JOIN passengers p ON b.passenger_id = p.passenger_id
INNER JOIN rides r ON b.ride_id = r.ride_id
INNER JOIN drivers d ON r.driver_id = d.driver_id
INNER JOIN users u_drv ON d.driver_id = u_drv.user_id
INNER JOIN vehicles v ON r.vehicle_id = v.vehicle_id
LEFT JOIN transactions t ON b.booking_id = t.booking_id AND t.transaction_type = 'fare_payment';

-- ------------------------------------------------------------------------------
-- VIEW 3: DRIVER EARNINGS AND OCCUPANCY SUMMARY
-- ------------------------------------------------------------------------------
DROP VIEW IF EXISTS view_driver_earnings_summary;
CREATE VIEW view_driver_earnings_summary AS
SELECT 
  d.driver_id,
  u.full_name AS driver_name,
  u.phone AS driver_phone,
  COUNT(DISTINCT r.ride_id) AS total_published_rides,
  SUM(CASE WHEN r.status = 'completed' THEN 1 ELSE 0 END) AS completed_rides,
  SUM(CASE WHEN r.status = 'active' THEN 1 ELSE 0 END) AS active_rides,
  COALESCE(SUM(CASE WHEN b.status IN ('accepted', 'completed') THEN b.seats_booked ELSE 0 END), 0) AS total_seats_sold,
  COALESCE(SUM(CASE WHEN b.status = 'completed' AND b.driver_settled = TRUE THEN b.total_fare ELSE 0 END), 0.00) AS total_paid_earnings,
  u.earnings_balance AS settled_earnings,
  COALESCE(SUM(CASE WHEN b.status IN ('pending', 'accepted') AND b.payment_status = 'paid' THEN b.total_fare ELSE 0 END), 0.00) AS pending_escrow,
  u.rating AS driver_rating
FROM drivers d
INNER JOIN users u ON d.driver_id = u.user_id
LEFT JOIN rides r ON d.driver_id = r.driver_id
LEFT JOIN bookings b ON r.ride_id = b.ride_id
GROUP BY d.driver_id, u.full_name, u.phone, u.earnings_balance, u.rating;

-- ------------------------------------------------------------------------------
-- VIEW 4: COMPLETED CORRIDOR STATS & CONSERVATIVE CO2E AVOIDED
-- Only counts COMPLETED bookings (excludes cancelled, rejected, pending, accepted)
-- Formula: SUM(seats_booked * COALESCE(b.estimated_distance_km, r.estimated_distance_km) * 0.192)
-- ------------------------------------------------------------------------------
DROP VIEW IF EXISTS view_corridor_monthly_stats;
CREATE VIEW view_corridor_monthly_stats AS
SELECT 
  r.corridor_name,
  COUNT(DISTINCT r.ride_id) AS total_rides_offered,
  COUNT(DISTINCT b.booking_id) AS completed_bookings_count,
  COALESCE(SUM(b.seats_booked), 0) AS completed_seats_filled,
  COALESCE(SUM(b.total_fare), 0.00) AS completed_ride_volume_inr,
  ROUND(COALESCE(SUM(b.seats_booked * COALESCE(b.estimated_distance_km, r.estimated_distance_km) * 0.192), 0), 2) AS estimated_co2e_avoided_kg,
  ROUND(AVG(r.estimated_duration_min), 1) AS avg_travel_time_min
FROM rides r
LEFT JOIN bookings b ON r.ride_id = b.ride_id AND b.status = 'completed'
GROUP BY r.corridor_name;
