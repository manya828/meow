-- ==============================================================================
-- CARPOOLX - Academic DBMS Query Showcase
-- Comprehensive SQL Demonstrating All DBMS Concepts for Presentation & Evaluation
-- ==============================================================================

USE carpoolx;

-- ------------------------------------------------------------------------------
-- 1. BASIC SQL OPERATIONS
-- ------------------------------------------------------------------------------

-- 1.1 SELECT with WHERE and ORDER BY
-- Retrieve active rides sorted by departure time
SELECT ride_id, origin_name, destination_name, departure_time, available_seats, fare_per_seat
FROM rides
WHERE status = 'active'
ORDER BY departure_time ASC;

-- 1.2 DISTINCT
-- List distinct pickup locations available in Bengaluru
SELECT DISTINCT origin_name
FROM rides
ORDER BY origin_name;

-- 1.3 BETWEEN
-- Rides with fare between 100 and 200 INR
SELECT ride_id, origin_name, destination_name, fare_per_seat
FROM rides
WHERE fare_per_seat BETWEEN 100.00 AND 200.00;

-- 1.4 IN
-- Find users who are either coordinators or administrators
SELECT user_id, full_name, email, role
FROM users
WHERE role IN ('coordinator', 'admin');

-- 1.5 LIKE (Pattern Matching)
-- Search for rides starting from any Electronic City hub
SELECT ride_id, origin_name, destination_name, departure_time
FROM rides
WHERE origin_name LIKE '%Electronic City%';

-- 1.6 IS NULL / IS NOT NULL
-- Open issue reports that have not yet been assigned to a coordinator
SELECT issue_id, category, description, status
FROM issue_reports
WHERE assigned_coordinator_id IS NULL;

-- ------------------------------------------------------------------------------
-- 2. AGGREGATE FUNCTIONS & GROUP BY / HAVING
-- ------------------------------------------------------------------------------

-- 2.1 COUNT, SUM, AVG, MIN, MAX
-- Overall platform metrics for administrative dashboard
SELECT 
  COUNT(DISTINCT r.ride_id) AS total_rides,
  COUNT(DISTINCT b.booking_id) AS total_bookings,
  COALESCE(SUM(b.total_fare), 0) AS total_revenue,
  COALESCE(AVG(r.fare_per_seat), 0) AS average_fare_per_seat,
  MIN(r.fare_per_seat) AS min_fare,
  MAX(r.fare_per_seat) AS max_fare
FROM rides r
LEFT JOIN bookings b ON r.ride_id = b.ride_id AND b.status = 'confirmed';

-- 2.2 GROUP BY with HAVING clause
-- Find corridors with more than 1 booking and average fare > 100 INR
SELECT 
  r.corridor_name,
  COUNT(b.booking_id) AS bookings_count,
  ROUND(AVG(b.total_fare), 2) AS avg_booking_fare,
  SUM(b.seats_booked) AS total_seats_shared
FROM rides r
INNER JOIN bookings b ON r.ride_id = b.ride_id
WHERE b.status = 'confirmed'
GROUP BY r.corridor_name
HAVING COUNT(b.booking_id) >= 1;

-- ------------------------------------------------------------------------------
-- 3. RELATIONAL JOINS (MULTI-TABLE)
-- ------------------------------------------------------------------------------

-- 3.1 INNER JOIN: Driver, Vehicle, and Active Ride Details
SELECT 
  r.ride_id,
  u.full_name AS driver_name,
  u.phone AS driver_phone,
  v.make_model AS vehicle,
  v.registration_number,
  r.origin_name,
  r.destination_name,
  r.available_seats,
  r.fare_per_seat
FROM rides r
INNER JOIN drivers d ON r.driver_id = d.driver_id
INNER JOIN users u ON d.driver_id = u.user_id
INNER JOIN vehicles v ON r.vehicle_id = v.vehicle_id
WHERE r.status = 'active';

-- 3.2 LEFT JOIN: All Passengers and their Booking Count (including passengers with 0 bookings)
SELECT 
  u.user_id,
  u.full_name,
  p.corporate_domain,
  COUNT(b.booking_id) AS bookings_count,
  COALESCE(SUM(b.total_fare), 0) AS total_spent
FROM passengers p
INNER JOIN users u ON p.passenger_id = u.user_id
LEFT JOIN bookings b ON p.passenger_id = b.passenger_id
GROUP BY u.user_id, u.full_name, p.corporate_domain
ORDER BY total_spent DESC;

-- ------------------------------------------------------------------------------
-- 4. ADVANCED SQL: SUBQUERIES & CORRELATED SUBQUERIES
-- ------------------------------------------------------------------------------

-- 4.1 SUBQUERY in WHERE: Drivers with higher rating than the platform average
SELECT user_id, full_name, rating, total_rides_count
FROM users
WHERE role = 'driver' 
  AND rating > (SELECT AVG(rating) FROM users WHERE role = 'driver');

-- 4.2 EXISTS: Find drivers who currently have at least one active ride
SELECT u.user_id, u.full_name, u.phone
FROM users u
WHERE u.role = 'driver'
  AND EXISTS (
    SELECT 1 
    FROM rides r 
    WHERE r.driver_id = u.user_id AND r.status = 'active'
  );

-- 4.3 NOT EXISTS: Find registered passengers who have never made a booking
SELECT u.user_id, u.full_name, u.email
FROM users u
WHERE u.role = 'passenger'
  AND NOT EXISTS (
    SELECT 1 
    FROM bookings b 
    WHERE b.passenger_id = u.user_id
  );

-- 4.4 CASE Statement: Categorize passenger loyalty tier based on money spent
SELECT 
  u.full_name,
  p.total_spent,
  CASE 
    WHEN p.total_spent >= 4000 THEN 'Platinum Green Commuter'
    WHEN p.total_spent >= 2500 THEN 'Gold Eco Commuter'
    WHEN p.total_spent >= 1000 THEN 'Silver Smart Commuter'
    ELSE 'Standard Passenger'
  END AS commuter_tier
FROM passengers p
INNER JOIN users u ON p.passenger_id = u.user_id
ORDER BY p.total_spent DESC;

-- 4.5 Correlated Subquery: Find the most recent booking made for each passenger
SELECT 
  b1.booking_id,
  b1.passenger_id,
  u.full_name,
  b1.total_fare,
  b1.booking_time
FROM bookings b1
INNER JOIN users u ON b1.passenger_id = u.user_id
WHERE b1.booking_time = (
  SELECT MAX(b2.booking_time)
  FROM bookings b2
  WHERE b2.passenger_id = b1.passenger_id
);
