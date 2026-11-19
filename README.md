# CARPOOLX — Smart, Intelligent & Database-Driven Ride-Sharing Platform
> **"Move Together. Go Further."**  
> *An Academic DBMS Project & Enterprise-Grade Mobility Technology Architecture*

![CarpoolX Hero](src/assets/images/hero_carpoolx_ev_1794490423156.jpg)

---

## 1. Project Overview
CarpoolX is a smart, database-driven ride-sharing platform that connects commuters travelling along similar routes across Bengaluru, Karnataka, India. Built with a full-stack relational DBMS architecture, it implements ACID-compliant transactional booking, pessimistic concurrency control (`SELECT ... FOR UPDATE`), intelligent multi-factor route matching, and role-based operational consoles for:
1. **Passengers** — Search rides along corridors, book seats with guaranteed rollback integrity, track spend & CO₂ savings.
2. **Drivers** — Publish rides with intermediate waypoints, manage booking requests with seat capacity validation, and track settled vs pending earnings.
3. **Carpool Coordinators** — Match unassigned requests along Bengaluru tech spines, manage groups, and resolve operational delay tickets.
4. **Administrators** — Monitor real-time platform KPIs, user activation, audit logs, and run SQL queries against live views.

---

## 2. Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide React, Motion, HTML5 Geolocation.
- **Backend**: Node.js, Express.js REST API, Centralized Exception Handling Middleware.
- **Database**: MySQL 8.0+ / InnoDB (Database name: `carpoolx`), `mysql2/promise` connection pool. Includes automatic failover to an in-memory ACID-compliant transactional engine for preview environments without active MySQL daemons.
- **Maps & Traffic**: TomTom Routing & Traffic API integration with interactive Bengaluru transit canvas and key corridors (Electronic City Expressway, Outer Ring Road Marathahalli, Bellandur, Whitefield ITPL, Hebbal, Yelahanka).
- **Tools**: VS Code, Git/GitHub, Node.js.

---

## 3. Quick Start (Running in Visual Studio Code)

### Prerequisites
- Node.js (v18.0.0 or higher)
- npm (v9.0.0 or higher)
- MySQL Server 8.0+ (Local MySQL, XAMPP, or Docker)

### Step 1: Clone Repository
```bash
git clone https://github.com/your-username/carpoolx.git
cd carpoolx
```

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Update your MySQL credentials in `.env`:
```env
PORT=3000
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=carpoolx
TOMTOM_API_KEY=YOUR_OPTIONAL_KEY
```

### Step 3: Set up MySQL Database
Run the MySQL scripts in order:
```bash
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed.sql
mysql -u root -p < database/views.sql
mysql -u root -p < database/transactions.sql
```

### Step 4: Install Dependencies & Run
```bash
npm install
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 4. Database Architecture & DBMS Concepts

### A. Normalized Relational Schema (3NF)
- `users`: Core identity table with role-based access.
- `passengers`: 1-to-1 extension with corporate domain, travel spend, and carbon offset.
- `drivers`: 1-to-1 extension with verified driving licenses, acceptance rates, and earnings.
- `vehicles`: Registered vehicles with engine type (EV, Hybrid, Petrol) and seating limits.
- `rides`: Published journeys with start/end Bengaluru coordinates, schedules, and pricing.
- `ride_stops`: Intermediate waypoints along tech corridors with sub-fares.
- `bookings`: Reservations linked to passengers and rides with strict state machines.
- `transactions`: Immutable financial ledger tracking fare payments and refunds.
- `carpool_groups` & `carpool_members`: Multi-commuter shuttles coordinated on corridors.
- `notifications`: Real-time database alerts.
- `issue_reports`: Operational dispute and delay tickets.
- `audit_logs`: Security and transactional audit trail.

### B. ACID Transactional Booking Workflow
```sql
START TRANSACTION;
SELECT available_seats, status, driver_id, fare_per_seat 
  FROM rides WHERE ride_id = ? FOR UPDATE;
-- Verify available_seats >= requested_seats
INSERT INTO bookings (ride_id, passenger_id, seats_booked, total_fare, status) VALUES (...);
UPDATE rides SET available_seats = available_seats - ? WHERE ride_id = ?;
INSERT INTO transactions (transaction_id, booking_id, amount, ...) VALUES (...);
COMMIT;
-- In case of any conflict or error: ROLLBACK;
```

### C. Relational Views
- `view_active_rides`: Active rides joined with driver ratings and vehicle models.
- `view_booking_details`: Multi-table join of passengers, drivers, rides, and payment statuses.
- `view_driver_earnings_summary`: Grouped aggregate of settled earnings and pending settlements.
- `view_corridor_monthly_stats`: Aggregated passenger counts, revenues, and environmental CO₂ savings.

---

## 5. Automated 22-Test Suite
Access the **DBMS Presentation Console** in the top navigation to run all 22 test cases in real-time, verifying:
1. Passenger registration
2. Driver registration
3. Duplicate email prevention (HTTP 409)
4. Valid login
5. Invalid login
6. Role-based routing
7. Unauthorized API access protection
8. Ride publishing
9. Ride search
10. Intelligent multi-factor matching
11. ACID seat booking
12. Insufficient seats rollback
13. Concurrency lock contention on last seat (`SELECT ... FOR UPDATE`)
14. Cancellation & seat restoration
15. Rollback on constraint violations
16. Idempotent transactions
17. Driver access boundary
18. Admin user activation toggle
19. Coordinator carpool pairing
20. Foreign key integrity enforcement
21. Database connection resilience
22. Notification generation

---

## 6. GitHub Portability
This repository is completely portable. All backend routes, database definitions, seed scripts, documentation, and frontend components are contained directly within the repository structure with no proprietary dependencies.
