import { Router } from 'express';
import type { Request, Response } from 'express';
import { db } from '../db.ts';
import { getRequestUser, isStandardUser } from '../auth-utils.ts';
import type { IssueCategory } from '../../types/index.ts';

export const issuesRouter = Router();

const VALID_CATEGORIES = new Set<IssueCategory>([
  'driver_delay',
  'passenger_no_show',
  'driver_unresponsive',
  'wrong_pickup',
  'incorrect_destination',
  'route_deviation',
  'payment_issue',
  'refund_not_received',
  'cancellation_dispute',
  'safety_concern',
  'booking_conflict',
  'overbooking_conflict',
  'vehicle_condition',
  'billing_issue',
  'technical_error',
  'misconduct',
]);

// Submit a new operational issue (Passenger or Driver)
issuesRouter.post('/', (req: Request, res: Response) => {
  const authUser = getRequestUser(req);
  if (!authUser) {
    return res.status(401).json({ error: 'Authentication required to submit an issue.' });
  }
  if (!isStandardUser(authUser)) {
    return res.status(403).json({ error: 'Only Passenger and Driver accounts submit ride support issues.' });
  }

  const { rideId, bookingId, category, severity, description } = req.body;
  const role: 'passenger' | 'driver' = authUser.role === 'driver' ? 'driver' : 'passenger';
  const cleanCategory: IssueCategory = VALID_CATEGORIES.has(category) ? category : 'technical_error';
  const cleanSeverity: 'low' | 'medium' | 'high' | 'critical' = ['low', 'medium', 'high', 'critical'].includes(severity)
    ? severity
    : 'medium';

  const result = db.createIssue({
    reporterId: authUser.user_id,
    reportedByRole: role,
    rideId: rideId ? Number(rideId) : undefined,
    bookingId: bookingId ? Number(bookingId) : undefined,
    category: cleanCategory,
    severity: cleanSeverity,
    description: description || '',
  });

  if (!result.success) {
    return res.status(400).json({ error: result.message });
  }

  res.status(201).json({
    message: result.message,
    issue: result.issue,
  });
});

// Get issues reported by the logged-in user (optionally filtered by reportedByRole)
issuesRouter.get('/my', (req: Request, res: Response) => {
  const authUser = getRequestUser(req);
  if (!authUser) {
    return res.status(401).json({ error: 'Authentication required to view issues.' });
  }

  const roleFilter = req.query.role;
  const allUserIssues = db
    .getIssuesWithContext()
    .filter((i) => i.reporter_id === authUser.user_id)
    .filter((i) => !roleFilter || i.reported_by_role === roleFilter);

  res.json({
    issues: allUserIssues,
    total: allUserIssues.length,
  });
});

// Post a follow-up message on an issue reported by the commuter
issuesRouter.post('/:id/reply', (req: Request, res: Response) => {
  const authUser = getRequestUser(req);
  if (!authUser) {
    return res.status(401).json({ error: 'Authentication required to reply to an issue.' });
  }

  const issueId = Number(req.params.id);
  const { message } = req.body;
  const existing = db.issues.find((i) => i.issue_id === issueId);
  if (!existing) {
    return res.status(404).json({ error: 'Issue ticket not found.' });
  }

  if (isStandardUser(authUser) && existing.reporter_id !== authUser.user_id) {
    return res.status(403).json({ error: 'You can only reply to your own issue tickets.' });
  }

  const role: 'passenger' | 'driver' | 'coordinator' | 'admin' =
    authUser.role === 'admin'
      ? 'admin'
      : authUser.role === 'coordinator'
      ? 'coordinator'
      : authUser.role === 'driver'
      ? 'driver'
      : 'passenger';

  const result = db.replyToIssue({
    issueId,
    sender: authUser,
    senderRole: role,
    message: message || '',
  });

  if (!result.success) {
    return res.status(400).json({ error: result.message });
  }

  res.json({
    message: result.message,
    issue: result.issue,
    reply: result.reply,
  });
});
