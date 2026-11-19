# CARPOOLX — REST API Specification & Architecture
**Base URL**: `http://localhost:3000/api`

---

### 1. Authentication & Session
- `POST /api/auth/register`
  - Body: `{ fullName, email, phone, password, role: 'passenger' | 'driver', licenseNumber?, vehicleModel? }`
  - Returns: `{ user, token, message }`
- `POST /api/auth/login`
  - Body: `{ email, password }`
  - Returns: `{ user, token }`
- `GET /api/auth/me`
  - Headers: `Authorization: Bearer <token>`
  - Returns: `{ user }`
- `POST /api/auth/switch-role` (Demo/Evaluation helper)
  - Body: `{ role: 'passenger' | 'driver' | 'admin' | 'coordinator' }`
  - Returns: `{ user, token }`

---

### 2. Rides & Smart Matching
- `GET /api/rides`
  - Query Params: `origin`, `destination`, `date`, `seats`, `corridor`
  - Returns: `Array<Ride>` with driver details, vehicle info, intermediate stops, and calculated compatibility score
- `GET /api/rides/:id`
  - Returns: Full ride details with stops and driver stats
- `POST /api/rides`
  - Headers: Driver authorization
  - Body: `{ originName, originLat, originLng, destinationName, destinationLat, destinationLng, departureTime, vehicleId, totalSeats, farePerSeat, corridorName, stops, notes }`
  - Returns: `{ ride, message }`
- `POST /api/rides/:id/book`
  - **ACID Transactional Endpoint**: Locks ride (`SELECT ... FOR UPDATE`), validates seats, creates booking, creates transaction ledger entry, updates driver pending settlement, commits or rolls back.
  - Body: `{ passengerId, seatsRequested, pickupPoint, dropoffPoint, paymentMethod }`
  - Returns: `{ success: true, booking, transaction, message }`

---

### 3. Bookings & Cancellations
- `GET /api/passenger/bookings`
  - Returns: All bookings for the logged-in passenger
- `POST /api/bookings/:id/cancel`
  - **ACID Transactional Cancellation**: Locks booking and ride, verifies eligibility, marks cancelled, restores available seats (+N), issues refund transaction record.
  - Body: `{ reason }`
  - Returns: `{ success: true, message, refundTransactionId }`

---

### 4. Driver Operations
- `GET /api/driver/rides`
  - Returns: All rides published by driver with passenger rosters
- `POST /api/driver/requests/:bookingId/status`
  - Body: `{ status: 'confirmed' | 'rejected' }`
- `GET /api/driver/earnings`
  - Returns: `{ totalSettled, pendingSettlement, rideWiseBreakdown, monthlyTrend }`
- `POST /api/driver/rides/:id/complete`
  - Marks ride as completed, updates passenger count and driver completed trips.

---

### 5. Carpool Coordinator Operations
- `GET /api/coordinator/requests`
  - Returns unassigned/pending passenger ride requests along Bengaluru corridors
- `POST /api/coordinator/match`
  - Performs intelligent multi-factor matching:
    1. Distance between pickup and driver origin/stops ($\le 5$km)
    2. Distance between dropoff and driver destination/stops ($\le 5$km)
    3. Departure time delta ($\le 45$ mins)
    4. Available seats $\ge$ requested seats
  - Returns ranked matches with score (0-100%) and explanation breakdown
- `GET /api/coordinator/groups`
  - Returns active carpool groups and passenger rosters
- `GET /api/coordinator/issues` & `POST /api/coordinator/issues/:id/resolve`
  - Operational ticket tracking and resolution workflow

---

### 6. Administrator & DBMS Control
- `GET /api/admin/stats`
  - Aggregated KPI cards: Total users, rides, bookings, revenue, CO2 reduction
- `GET /api/admin/users` & `PATCH /api/admin/users/:id/status`
- `GET /api/admin/transactions`
- `GET /api/admin/audit-logs`
- `GET /api/admin/reports/:type`
- `GET /api/db/status`
  - Live database engine telemetry, active connection type (MySQL vs Transactional In-Memory Engine), query execution count
- `POST /api/db/test-runner`
  - Automatically runs the 22 DBMS test cases and returns structured pass/fail results
- `POST /api/db/execute-sql`
  - Interactive SQL console for students and professors to execute read queries against views and tables
