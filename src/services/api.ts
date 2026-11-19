import {
  User,
  Ride,
  Booking,
  Transaction,
  WalletLedgerEntry,
  WalletPaymentConfig,
  WalletRechargeOrder,
  CarpoolGroup,
  IssueReport,
  IssueCategory,
  IssueStatus,
  AuditLog,
  TestCaseResult,
  BookingAttemptLog,
} from '../types';

const BASE_URL = '/api';
const TOKEN_STORAGE_KEY = 'carpoolx_token';

let currentAuthToken: string | null =
  typeof window !== 'undefined' ? window.localStorage.getItem(TOKEN_STORAGE_KEY) : null;

export const setApiAuthToken = (token: string | null) => {
  currentAuthToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  }
};

const getAuthHeaders = (): Record<string, string> => {
  return currentAuthToken ? { Authorization: `Bearer ${currentAuthToken}` } : {};
};

export const api = {
  // Health & DB status
  getHealth: async () => {
    const res = await fetch(`${BASE_URL}/health`);
    return res.json();
  },

  getDbStatus: async () => {
    const res = await fetch(`${BASE_URL}/admin/db-status`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch database status');
    }
    return res.json();
  },

  // Auth
  register: async (data: any) => {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.error || 'Registration failed');
    }
    return json;
  },

  login: async (email: string, password: string, expectedRole?: string) => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, expectedRole }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.error || 'Login failed');
    }
    return json;
  },

  getMe: async () => {
    const res = await fetch(`${BASE_URL}/auth/me`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      return { user: null, passengerProfile: null, driverProfile: null, vehicle: null };
    }
    return res.json();
  },

  // Rides
  getRides: async (params?: {
    origin?: string;
    destination?: string;
    seats?: number;
    corridor?: string;
    date?: string;
    pickupLat?: number;
    pickupLng?: number;
    dropoffLat?: number;
    dropoffLng?: number;
  }): Promise<{ rides: Ride[]; total: number; matchType?: string; matchBanner?: string | null }> => {
    const query = new URLSearchParams();
    if (params?.origin) query.set('origin', params.origin);
    if (params?.destination) query.set('destination', params.destination);
    if (params?.seats) query.set('seats', String(params.seats));
    if (params?.corridor) query.set('corridor', params.corridor);
    if (params?.date) query.set('date', params.date);
    if (params?.pickupLat) query.set('pickupLat', String(params.pickupLat));
    if (params?.pickupLng) query.set('pickupLng', String(params.pickupLng));
    if (params?.dropoffLat) query.set('dropoffLat', String(params.dropoffLat));
    if (params?.dropoffLng) query.set('dropoffLng', String(params.dropoffLng));

    const res = await fetch(`${BASE_URL}/rides?${query.toString()}`, {
      headers: getAuthHeaders(),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.error || 'Failed to load active Bengaluru rides');
    }
    return json;
  },

  getRideById: async (id: number): Promise<Ride> => {
    const res = await fetch(`${BASE_URL}/rides/${id}`);
    if (!res.ok) throw new Error('Ride not found');
    return res.json();
  },

  publishRide: async (data: any) => {
    const res = await fetch(`${BASE_URL}/rides`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(data),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.error || 'Failed to publish ride');
    }
    return json;
  },

  bookRide: async (
    rideId: number,
    data: {
      seatsRequested: number;
      pickupPoint: string;
      dropoffPoint: string;
      dropoffLat?: number;
      dropoffLng?: number;
    }
  ) => {
    const res = await fetch(`${BASE_URL}/rides/${rideId}/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(data),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.error || 'Booking failed');
    }
    return json;
  },

  // Bookings, Pending Edits, Wallet & Cancellations
  getPassengerBookings: async (): Promise<{ bookings: Booking[]; total: number }> => {
    const res = await fetch(`${BASE_URL}/bookings/my-bookings`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) return { bookings: [], total: 0 };
    return res.json();
  },

  previewBookingEdit: async (
    bookingId: number,
    data: { dropoffPoint: string; dropoffLat?: number; dropoffLng?: number }
  ) => {
    const res = await fetch(`${BASE_URL}/bookings/${bookingId}/edit-preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(data),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.error || 'Failed to preview booking edit');
    }
    return json;
  },

  editPendingBooking: async (
    bookingId: number,
    data: { dropoffPoint: string; dropoffLat?: number; dropoffLng?: number }
  ) => {
    const res = await fetch(`${BASE_URL}/bookings/${bookingId}/edit`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(data),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.error || 'Failed to update pending booking');
    }
    return json;
  },

  cancelBooking: async (bookingId: number, data: { reason: string }) => {
    const res = await fetch(`${BASE_URL}/bookings/${bookingId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(data),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.error || 'Cancellation failed');
    }
    return json;
  },

  payBooking: async (bookingId: number) => {
    const res = await fetch(`${BASE_URL}/bookings/${bookingId}/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.error || 'Payment failed');
    }
    return json;
  },

  rateDriver: async (bookingId: number, rating: number, comment?: string) => {
    const res = await fetch(`${BASE_URL}/bookings/${bookingId}/rate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ rating, comment }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.error || 'Failed to submit driver rating');
    }
    return json;
  },

  getWalletConfig: async (): Promise<{ config: WalletPaymentConfig; walletBalance: number }> => {
    const res = await fetch(`${BASE_URL}/bookings/wallet/config`, {
      headers: getAuthHeaders(),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.error || 'Failed to load wallet payment configuration');
    }
    return json;
  },

  getWalletRecharges: async (): Promise<{ orders: WalletRechargeOrder[] }> => {
    const res = await fetch(`${BASE_URL}/bookings/wallet/recharges`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) return { orders: [] };
    return res.json();
  },

  initiateWalletRecharge: async (
    amount: number
  ): Promise<{
    message: string;
    order: WalletRechargeOrder;
    config: WalletPaymentConfig;
    walletBalance: number;
  }> => {
    const clientOrigin = typeof window !== 'undefined' ? window.location.origin : undefined;
    const res = await fetch(`${BASE_URL}/bookings/wallet/recharge/initiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ amount, clientOrigin }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.error || 'Failed to initiate wallet recharge QR');
    }
    return json;
  },

  getRechargeStatus: async (
    orderId: string
  ): Promise<{ message: string; order: WalletRechargeOrder; walletBalance: number }> => {
    const res = await fetch(`${BASE_URL}/bookings/wallet/recharge/${encodeURIComponent(orderId)}/status`, {
      headers: getAuthHeaders(),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.error || 'Failed to check recharge status');
    }
    return json;
  },

  markRechargeScanned: async (
    orderId: string
  ): Promise<{ message: string; order: WalletRechargeOrder; walletCredited: boolean; walletBalance: number }> => {
    const res = await fetch(
      `${BASE_URL}/bookings/wallet/recharge/${encodeURIComponent(orderId)}/mark-scanned`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
      }
    );
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.error || 'Failed to update QR scan status');
    }
    return json;
  },

  verifyWalletRecharge: async (
    orderId: string
  ): Promise<{
    verified: boolean;
    statusCode: string;
    message: string;
    order: WalletRechargeOrder;
    walletBalance: number;
  }> => {
    const res = await fetch(`${BASE_URL}/bookings/wallet/recharge/${encodeURIComponent(orderId)}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok && res.status !== 202) {
      throw new Error(json.error || json.message || 'Payment verification failed');
    }
    return json;
  },

  completeDemoRecharge: async (
    orderId: string,
    sig: string,
    outcome: 'success' | 'fail' = 'success'
  ) => {
    const res = await fetch(`${BASE_URL}/bookings/wallet/recharge/demo-webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ orderId, sig, outcome }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.error || 'Demo payment verification failed');
    }
    return json;
  },

  getPassengerTransactions: async (): Promise<{
    transactions: Transaction[];
    walletLedger?: WalletLedgerEntry[];
    walletBalance?: number;
    earningsBalance?: number;
  }> => {
    const res = await fetch(`${BASE_URL}/bookings/transactions`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) return { transactions: [], walletLedger: [] };
    return res.json();
  },

  // Driver vehicle & license profile management
  saveDriverProfile: async (data: {
    licenseNumber: string;
    vehicleModel: string;
    registrationNumber: string;
    vehicleType?: string;
    fuelType?: string;
    vehicleColor?: string;
    totalCapacity?: number;
  }) => {
    const res = await fetch(`${BASE_URL}/driver/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(data),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Failed to save vehicle profile');
    return json;
  },

  getDriverRides: async () => {
    const res = await fetch(`${BASE_URL}/driver/rides`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) return { rides: [], total: 0 };
    return res.json();
  },

  getDriverRequests: async () => {
    const res = await fetch(`${BASE_URL}/driver/requests`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) return { requests: [], total: 0 };
    return res.json();
  },

  acceptBooking: async (bookingId: number) => {
    const res = await fetch(`${BASE_URL}/driver/bookings/${bookingId}/accept`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Failed to accept booking');
    return json;
  },

  rejectBooking: async (bookingId: number, reason?: string) => {
    const res = await fetch(`${BASE_URL}/driver/bookings/${bookingId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ reason }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Failed to reject booking');
    return json;
  },

  completeBooking: async (bookingId: number) => {
    const res = await fetch(`${BASE_URL}/driver/bookings/${bookingId}/complete`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Failed to complete booking');
    return json;
  },

  cancelDriverBooking: async (bookingId: number, reason?: string) => {
    const res = await fetch(`${BASE_URL}/driver/bookings/${bookingId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ reason }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Failed to cancel booking');
    return json;
  },

  updateRequestStatus: async (
    bookingId: number,
    status: 'accepted' | 'confirmed' | 'rejected' | 'completed' | 'cancelled',
    reason?: string
  ) => {
    const res = await fetch(`${BASE_URL}/driver/requests/${bookingId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ status, reason }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Failed to update booking request');
    return json;
  },

  completeRide: async (rideId: number) => {
    const res = await fetch(`${BASE_URL}/driver/rides/${rideId}/complete`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Failed to complete ride');
    return json;
  },

  cancelRide: async (rideId: number, reason?: string) => {
    const res = await fetch(`${BASE_URL}/driver/rides/${rideId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ reason }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Failed to cancel ride');
    return json;
  },

  getDriverEarnings: async () => {
    const res = await fetch(`${BASE_URL}/driver/earnings`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) return null;
    return res.json();
  },

  // Commuter Issues & Support (Passenger & Driver)
  createIssue: async (data: {
    reportedByRole: 'passenger' | 'driver';
    rideId?: number;
    bookingId?: number;
    category: IssueCategory;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
  }): Promise<{ message: string; issue: IssueReport }> => {
    const res = await fetch(`${BASE_URL}/issues`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(data),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Failed to submit issue');
    return json;
  },

  getMyIssues: async (role?: 'passenger' | 'driver'): Promise<{ issues: IssueReport[]; total: number }> => {
    const q = role ? `?role=${role}` : '';
    const res = await fetch(`${BASE_URL}/issues/my${q}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) return { issues: [], total: 0 };
    return res.json();
  },

  replyToIssue: async (issueId: number, message: string, senderRole?: 'passenger' | 'driver') => {
    const res = await fetch(`${BASE_URL}/issues/${issueId}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ message, senderRole }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Failed to send reply');
    return json;
  },

  // Coordinator (Real-Time Issue Resolution Center)
  getCoordinatorOverview: async () => {
    const res = await fetch(`${BASE_URL}/coordinator/overview`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) return null;
    return res.json();
  },

  getCoordinatorGroups: async (): Promise<{ groups: CarpoolGroup[] }> => {
    const res = await fetch(`${BASE_URL}/coordinator/groups`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) return { groups: [] };
    return res.json();
  },

  getCoordinatorIssues: async (filters?: {
    status?: string;
    severity?: string;
    role?: string;
    category?: string;
    q?: string;
  }): Promise<{ issues: IssueReport[]; total: number; syncedAt?: string }> => {
    const params = new URLSearchParams();
    if (filters?.status && filters.status !== 'all') params.set('status', filters.status);
    if (filters?.severity && filters.severity !== 'all') params.set('severity', filters.severity);
    if (filters?.role && filters.role !== 'all') params.set('role', filters.role);
    if (filters?.category && filters.category !== 'all') params.set('category', filters.category);
    if (filters?.q) params.set('q', filters.q);
    const res = await fetch(`${BASE_URL}/coordinator/issues?${params.toString()}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) return { issues: [], total: 0 };
    return res.json();
  },

  coordinatorAssignIssue: async (issueId: number) => {
    const res = await fetch(`${BASE_URL}/coordinator/issues/${issueId}/assign`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Failed to assign issue');
    return json;
  },

  coordinatorUpdateIssueStatus: async (
    issueId: number,
    status: IssueStatus,
    resolutionNotes?: string,
    escalateToAdmin?: boolean
  ) => {
    const res = await fetch(`${BASE_URL}/coordinator/issues/${issueId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ status, resolutionNotes, escalateToAdmin }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Failed to update issue status');
    return json;
  },

  coordinatorReplyIssue: async (issueId: number, message: string) => {
    const res = await fetch(`${BASE_URL}/coordinator/issues/${issueId}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ message }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Failed to send coordinator reply');
    return json;
  },

  coordinatorEscalateIssue: async (issueId: number, reason: string) => {
    const res = await fetch(`${BASE_URL}/coordinator/issues/${issueId}/escalate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ reason }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Failed to escalate issue');
    return json;
  },

  resolveIssue: async (issueId: number, resolutionNotes: string) => {
    const res = await fetch(`${BASE_URL}/coordinator/issues/${issueId}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ resolutionNotes }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Failed to resolve issue');
    return json;
  },

  // Admin
  getAdminStats: async () => {
    const res = await fetch(`${BASE_URL}/admin/stats`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) return null;
    return res.json();
  },

  getAdminUsers: async (role?: string, query?: string): Promise<{ users: any[]; total: number }> => {
    const q = new URLSearchParams();
    if (role) q.set('role', role);
    if (query) q.set('query', query);
    const res = await fetch(`${BASE_URL}/admin/users?${q.toString()}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) return { users: [], total: 0 };
    return res.json();
  },

  toggleUserStatus: async (userId: number, isActive: boolean) => {
    const res = await fetch(`${BASE_URL}/admin/users/${userId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ isActive }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Failed to toggle user status');
    return json;
  },

  getAdminRides: async (): Promise<{ rides: Ride[]; total: number }> => {
    const res = await fetch(`${BASE_URL}/admin/rides`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) return { rides: [], total: 0 };
    return res.json();
  },

  getAdminBookings: async (): Promise<{ bookings: Booking[]; total: number }> => {
    const res = await fetch(`${BASE_URL}/admin/bookings`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) return { bookings: [], total: 0 };
    return res.json();
  },

  getAdminAttempts: async (): Promise<{ attempts: BookingAttemptLog[]; total: number }> => {
    const res = await fetch(`${BASE_URL}/admin/attempts`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) return { attempts: [], total: 0 };
    return res.json();
  },

  getAdminTransactions: async (): Promise<{ transactions: Transaction[]; total: number }> => {
    const res = await fetch(`${BASE_URL}/admin/transactions`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) return { transactions: [], total: 0 };
    return res.json();
  },

  getAdminIssues: async (): Promise<{ issues: IssueReport[]; escalatedIssues: IssueReport[]; coordinators: any[] }> => {
    const res = await fetch(`${BASE_URL}/admin/issues`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) return { issues: [], escalatedIssues: [], coordinators: [] };
    return res.json();
  },

  resolveAdminIssue: async (issueId: number, resolutionNotes: string, status: 'resolved' | 'closed' = 'resolved') => {
    const res = await fetch(`${BASE_URL}/admin/issues/${issueId}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ resolutionNotes, status }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Failed to resolve escalated issue');
    return json;
  },

  getAdminAuditLogs: async (): Promise<{ logs: AuditLog[] }> => {
    const res = await fetch(`${BASE_URL}/admin/audit-logs`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) return { logs: [] };
    return res.json();
  },

  getAdminReport: async (type: string) => {
    const res = await fetch(`${BASE_URL}/admin/reports/${type}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) return null;
    return res.json();
  },

  executeSql: async (sql: string) => {
    const res = await fetch(`${BASE_URL}/admin/execute-sql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ sql }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.error || 'SQL execution failed');
    }
    return json;
  },

  runTestSuite: async (): Promise<{ totalTests: number; passCount: number; failCount: number; results: TestCaseResult[] }> => {
    const res = await fetch(`${BASE_URL}/admin/run-test-suite`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.error || 'Test suite execution failed');
    }
    return json;
  },

  // Traffic
  getBengaluruCorridors: async () => {
    const res = await fetch(`${BASE_URL}/traffic/bengaluru-corridors`);
    return res.json();
  },
};
