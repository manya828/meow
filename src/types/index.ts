export type UserRole = 'passenger' | 'driver' | 'admin' | 'coordinator';

export type BookingStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'completed';

export interface User {
  user_id: number;
  full_name: string;
  email: string;
  phone: string;
  role: UserRole;
  wallet_balance: number;
  earnings_balance: number;
  avatar_url?: string;
  is_active: boolean;
  rating: number;
  total_rides_count: number;
  created_at: string;
}

export interface PassengerProfile {
  passenger_id: number;
  emergency_contact: string;
  preferred_payment_mode: 'wallet' | 'upi' | 'card' | 'cash';
  corporate_domain?: string;
  total_spent: number;
  carbon_saved_kg: number;
}

export interface DriverProfile {
  driver_id: number;
  license_number: string;
  license_expiry: string;
  is_verified: boolean;
  total_earnings: number;
  pending_settlement: number;
  acceptance_rate: number;
}

export interface Vehicle {
  vehicle_id: number;
  driver_id: number;
  make_model: string;
  registration_number: string;
  vehicle_type: 'sedan' | 'suv' | 'hatchback' | 'ev_crossover';
  fuel_type: 'electric' | 'petrol' | 'diesel' | 'cng';
  color: string;
  total_capacity: number;
  is_active: boolean;
}

export interface RideStop {
  stop_id: number;
  ride_id: number;
  stop_name: string;
  stop_order: number;
  stop_lat: number;
  stop_lng: number;
  estimated_stop_time: string;
  fare_from_origin: number;
}

export interface Ride {
  ride_id: number;
  driver_id: number;
  driver_name: string;
  driver_phone: string;
  driver_rating: number;
  vehicle_id: number;
  vehicle_model: string;
  registration_number: string;
  vehicle_type: string;
  fuel_type: string;
  origin_name: string;
  origin_lat: number;
  origin_lng: number;
  destination_name: string;
  destination_lat: number;
  destination_lng: number;
  departure_time: string;
  estimated_arrival: string;
  estimated_distance_km: number;
  estimated_duration_min: number;
  total_seats: number;
  available_seats: number;
  fare_per_seat: number;
  status: 'active' | 'completed' | 'cancelled' | 'in_transit';
  corridor_name: string;
  notes?: string;
  stops?: RideStop[];
  compatibility_score?: number;
  compatibility_reason?: string;
}

export interface BookingEditHistory {
  edit_id: number;
  booking_id: number;
  passenger_id: number;
  previous_destination: string;
  new_destination: string;
  previous_distance_km: number;
  new_distance_km: number;
  previous_fare: number;
  new_fare: number;
  fare_difference: number;
  edited_at: string;
}

export interface BookingAttemptLog {
  attempt_id: number;
  ride_id: number;
  passenger_id: number;
  passenger_name: string;
  seats_requested: number;
  attempted_fare: number;
  attempt_status: 'failed' | 'overbooking';
  failure_code: string;
  failure_reason: string;
  created_at: string;
}

export interface Booking {
  booking_id: number;
  ride_id: number;
  passenger_id: number;
  passenger_name: string;
  passenger_email: string;
  passenger_phone: string;
  driver_id: number;
  driver_name: string;
  driver_phone: string;
  vehicle_model: string;
  registration_number: string;
  origin_name: string;
  destination_name: string;
  departure_time: string;
  seats_booked: number;
  pickup_point: string;
  dropoff_point: string;
  dropoff_lat?: number;
  dropoff_lng?: number;
  estimated_distance_km?: number;
  total_fare: number;
  status: BookingStatus;
  booking_time: string;
  completed_at?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  transaction_id?: string;
  payment_method: 'wallet';
  payment_status: 'unpaid' | 'pending' | 'paid' | 'refunded' | 'failed';
  driver_settled?: boolean;
  paid_at?: string;
  edit_count?: number;
  edit_history?: BookingEditHistory[];
  driver_rating?: number | null;
  driver_review?: string | null;
  rated_at?: string | null;
}

export interface DriverRating {
  rating_id: number;
  booking_id: number;
  ride_id: number;
  passenger_id: number;
  passenger_name: string;
  driver_id: number;
  driver_name: string;
  rating: number;
  review_comment?: string;
  created_at: string;
}

export interface Transaction {
  transaction_id: string;
  booking_id: number | null;
  passenger_id: number;
  passenger_name?: string;
  driver_id: number | null;
  driver_name?: string;
  amount: number;
  payment_method: 'wallet' | 'upi' | 'card' | 'netbanking' | 'external_topup' | 'simulated_instant';
  topup_source?: 'upi' | 'card' | 'netbanking';
  payment_status: 'success' | 'pending' | 'refunded' | 'failed';
  gateway_reference: string;
  transaction_type: 'fare_payment' | 'fare_adjustment' | 'cancellation_refund' | 'driver_payout' | 'wallet_topup';
  parent_transaction_id?: string;
  failure_reason?: string;
  entry_type?: 'debit' | 'credit';
  passenger_balance_before?: number;
  passenger_balance_after?: number;
  driver_balance_before?: number;
  driver_balance_after?: number;
  route_summary?: string;
  created_at: string;
}

export interface WalletLedgerEntry {
  ledger_id: number;
  user_id: number;
  booking_id?: number;
  transaction_id: string;
  entry_type: 'DEBIT' | 'CREDIT';
  amount: number;
  balance_before: number;
  balance_after: number;
  description: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  created_at: string;
}

export type WalletRechargeStatus = 'PENDING' | 'SCANNED' | 'SUCCESS' | 'FAILED' | 'EXPIRED';

export interface WalletPaymentConfig {
  mode: 'demo' | 'upi_gateway' | 'razorpay';
  isLiveGatewayConfigured: boolean;
  merchantName: string | null;
  merchantUpiConfigured: boolean;
  webhookConfigured?: boolean;
  gatewayProvider: string;
  minAmount: number;
  maxAmount: number;
}

export interface WalletRechargeOrder {
  order_id: string;
  user_id: number;
  amount: number;
  currency: 'INR';
  mode: 'demo' | 'upi_gateway' | 'razorpay';
  status: WalletRechargeStatus;
  merchant_txn_ref: string;
  gateway_order_id?: string;
  gateway_payment_id?: string;
  qr_payload: string;
  credited: boolean;
  failure_reason?: string;
  expires_at: string;
  verified_at?: string;
  created_at: string;
  updated_at: string;
  demo_auth_token?: string;
  demo_terminal_url?: string;
}

export interface CarpoolGroup {
  group_id: number;
  group_name: string;
  corridor_name: string;
  coordinator_id?: number;
  coordinator_name?: string;
  ride_id: number;
  driver_name: string;
  vehicle_model: string;
  status: 'forming' | 'active' | 'completed' | 'disbanded';
  members: {
    member_id: number;
    passenger_id: number;
    passenger_name: string;
    seats: number;
    joined_at: string;
  }[];
}

export type IssueCategory =
  | 'driver_delay'
  | 'passenger_no_show'
  | 'driver_unresponsive'
  | 'wrong_pickup'
  | 'incorrect_destination'
  | 'route_deviation'
  | 'payment_issue'
  | 'refund_not_received'
  | 'cancellation_dispute'
  | 'safety_concern'
  | 'booking_conflict'
  | 'overbooking_conflict'
  | 'vehicle_condition'
  | 'billing_issue'
  | 'technical_error'
  | 'misconduct';

export type IssueStatus = 'open' | 'investigating' | 'resolved' | 'closed' | 'escalated';

export interface IssueMessage {
  message_id: number;
  issue_id: number;
  sender_id: number;
  sender_name: string;
  sender_role: 'passenger' | 'driver' | 'coordinator' | 'admin';
  message: string;
  created_at: string;
}

export interface IssueHistoryEntry {
  history_id: number;
  issue_id: number;
  actor_id: number;
  actor_name: string;
  actor_role: string;
  action: string;
  previous_status: string | null;
  new_status: string;
  notes?: string;
  created_at: string;
}

export interface IssueReport {
  issue_id: number;
  reporter_id: number;
  reporter_name: string;
  reported_by_role: 'passenger' | 'driver';
  ride_id?: number;
  booking_id?: number;
  category: IssueCategory;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: IssueStatus;
  description: string;
  assigned_coordinator_id?: number;
  assigned_coordinator_name?: string;
  resolution_notes?: string;
  escalated_to_admin?: boolean;
  created_at: string;
  updated_at?: string;
  resolved_at?: string;
  messages?: IssueMessage[];
  resolution_history?: IssueHistoryEntry[];
  related_booking?: Partial<Booking> | null;
  related_ride?: Partial<Ride> | null;
  related_transactions?: Transaction[];
}

export interface Notification {
  notification_id: number;
  user_id: number;
  title: string;
  message: string;
  type:
    | 'booking_confirmed'
    | 'booking_cancelled'
    | 'seat_request'
    | 'ride_update'
    | 'payment_success'
    | 'issue_update'
    | 'system_alert';
  is_read: boolean;
  created_at: string;
}

export interface AuditLog {
  log_id: number;
  user_id?: number;
  user_name?: string;
  action: string;
  entity_type: string;
  entity_id: string;
  ip_address: string;
  details?: Record<string, unknown>;
  created_at: string;
}

export interface TestCaseResult {
  testId: string;
  description: string;
  input: string;
  expected: string;
  actual: string;
  status: 'PASS' | 'FAIL';
  executionTimeMs: number;
}
