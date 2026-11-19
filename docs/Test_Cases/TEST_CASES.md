# CARPOOLX — Quality Assurance & DBMS Test Cases
**Test Suite Coverage for Academic Project Evaluation**

| Test ID | Test Description | Input Data | Expected Output | Verification Status |
| :--- | :--- | :--- | :--- | :--- |
| **TC-01** | Passenger registration | Name: `Siddharth Rao`, Email: `sid@test.com`, Role: `passenger` | User record created with role `passenger` in `users` and linked row in `passengers` | PASS |
| **TC-02** | Driver registration | Name: `Harish Gowda`, Role: `driver`, License: `KA-04-2022-9988` | User record created in `users` and `drivers` table with verification status | PASS |
| **TC-03** | Duplicate email registration | Re-registering existing email `admin@carpoolx.in` | HTTP 409 Conflict with message "Email already registered in system" | PASS |
| **TC-04** | Valid login | Email: `rajesh.driver@gmail.com`, Password: `Password@123` | HTTP 200 with JWT/Session token and Driver role profile | PASS |
| **TC-05** | Invalid login | Email: `rajesh.driver@gmail.com`, Wrong password | HTTP 401 Unauthorized "Invalid credentials supplied" | PASS |
| **TC-06** | Role-based redirection | Login as driver vs passenger vs admin vs coordinator | Context routes user to `/dashboard/driver`, `/dashboard/passenger`, etc. | PASS |
| **TC-07** | Unauthorized dashboard access | Passenger trying to fetch admin metrics `/api/admin/stats` | HTTP 403 Forbidden with security audit log entry | PASS |
| **TC-08** | Ride publishing | Origin: `Indiranagar`, Dest: `Whitefield`, Seats: `4`, Fare: `150` | Row inserted into `rides`, available_seats = 4, status = `active` | PASS |
| **TC-09** | Ride search | Origin query: `Electronic City`, Dest: `Indiranagar` | Returns compatible ride records matching corridor with available seats | PASS |
| **TC-10** | Compatible ride matching | Passenger request along ORR vs Driver route on ORR | High route compatibility score calculated (>85%) with proximity explanation | PASS |
| **TC-11** | Successful booking (ACID) | Passenger books 1 seat on Ride #1 with 2 available seats | Transaction commits, available_seats becomes 1, transaction record created | PASS |
| **TC-12** | Booking without sufficient seats | Passenger requests 3 seats on Ride #1 when only 1 is available | Transaction rollback; HTTP 400 "Insufficient seats available"; seats unchanged | PASS |
| **TC-13** | Two passengers requesting last seat | Concurrent requests for Ride #4 with 1 seat available | Pessimistic lock (`FOR UPDATE`) allows 1st to succeed, 2nd receives conflict | PASS |
| **TC-14** | Successful cancellation | Passenger cancels Booking #1 | Booking status $\rightarrow$ `cancelled`, seat restored (+1) to ride, refund recorded | PASS |
| **TC-15** | Transaction rollback after failure | Intentional constraint violation midway through booking | `ROLLBACK` triggered; no orphaned booking or corrupted seat count | PASS |
| **TC-16** | Duplicate transaction prevention | Idempotency key reused for same payment | Idempotent response returned; no double debit in `transactions` | PASS |
| **TC-17** | Driver access restrictions | Driver attempting to modify another driver's published ride | HTTP 403 Forbidden "Unauthorized driver access" | PASS |
| **TC-18** | Administrator user management | Admin toggles user active status to `false` | User deactivated, cannot log in or publish rides | PASS |
| **TC-19** | Coordinator matching | Coordinator pairs unassigned passenger request to route | Carpool group created with driver and passenger linkages | PASS |
| **TC-20** | Invalid foreign key operation | Inserting booking with non-existent `ride_id: 99999` | Foreign key constraint violation caught, HTTP 400 error | PASS |
| **TC-21** | Database connection resilience | MySQL host unavailable or offline | Failover to ACID transactional engine with clear admin status badge | PASS |
| **TC-22** | Notification generation | Seat booked or ride cancelled | Notification inserted into `notifications` table for target user | PASS |
