import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { db } from '../db.ts';
import { getRequestUser } from '../auth-utils.ts';
import type { IssueStatus } from '../../types/index.ts';

export const coordinatorRouter = Router();

coordinatorRouter.use((req: Request, res: Response, next: NextFunction) => {
  const user = getRequestUser(req);
  if (!user || (user.role !== 'coordinator' && user.role !== 'admin')) {
    return res.status(403).json({
      error: 'Coordinator security credentials required to access the Issue Resolution Center.',
    });
  }
  next();
});

// Live Issue & Operations Overview KPIs for Coordinator
coordinatorRouter.get('/overview', (req: Request, res: Response) => {
  const issues = db.issues;
  const totalIssues = issues.length;
  const openIssues = issues.filter((i) => i.status === 'open').length;
  const investigatingIssues = issues.filter((i) => i.status === 'investigating').length;
  const escalatedIssues = issues.filter((i) => i.status === 'escalated').length;
  const resolvedIssues = issues.filter((i) => i.status === 'resolved' || i.status === 'closed').length;
  const highPriorityIssues = issues.filter(
    (i) => (i.severity === 'high' || i.severity === 'critical') && i.status !== 'resolved' && i.status !== 'closed'
  ).length;
  const safetyIssues = issues.filter(
    (i) => (i.category === 'safety_concern' || i.category === 'misconduct') && i.status !== 'resolved' && i.status !== 'closed'
  ).length;

  const activeGroups = db.groups.filter((g) => g.status === 'active').length;
  const activeRidesMonitored = db.rides.filter((r) => r.status === 'active').length;

  res.json({
    totalIssues,
    openIssues,
    investigatingIssues,
    escalatedIssues,
    resolvedIssues,
    highPriorityIssues,
    safetyIssues,
    activeGroups,
    activeRidesMonitored,
    lastUpdatedAt: new Date().toISOString(),
  });
});

// Live Active Carpool Groups (secondary operational view)
coordinatorRouter.get('/groups', (req: Request, res: Response) => {
  res.json({ groups: db.groups });
});

// Searchable & Filterable Real-Time Issue Queue
coordinatorRouter.get('/issues', (req: Request, res: Response) => {
  const { status, severity, role, category, q } = req.query;
  let list = db.getIssuesWithContext();

  if (status && typeof status === 'string' && status !== 'all') {
    list = list.filter((i) => i.status === status);
  }
  if (severity && typeof severity === 'string' && severity !== 'all') {
    list = list.filter((i) => i.severity === severity);
  }
  if (role && typeof role === 'string' && role !== 'all') {
    list = list.filter((i) => i.reported_by_role === role);
  }
  if (category && typeof category === 'string' && category !== 'all') {
    list = list.filter((i) => i.category === category);
  }
  if (q && typeof q === 'string' && q.trim()) {
    const term = q.trim().toLowerCase();
    list = list.filter(
      (i) =>
        String(i.issue_id).includes(term) ||
        i.reporter_name.toLowerCase().includes(term) ||
        i.description.toLowerCase().includes(term) ||
        i.category.toLowerCase().includes(term) ||
        (i.booking_id && String(i.booking_id).includes(term)) ||
        (i.ride_id && String(i.ride_id).includes(term))
    );
  }

  db.logSql('SELECT * FROM issue_reports ORDER BY updated_at DESC;', [], 0.6, 'SUCCESS');

  res.json({
    issues: list,
    total: list.length,
    syncedAt: new Date().toISOString(),
  });
});

// Self-assign an issue to the signed-in coordinator
coordinatorRouter.post('/issues/:id/assign', (req: Request, res: Response) => {
  const authUser = getRequestUser(req)!;
  const issueId = Number(req.params.id);
  const result = db.assignIssue(issueId, authUser);
  if (!result.success) {
    return res.status(404).json({ error: result.message });
  }
  res.json({ message: result.message, issue: result.issue });
});

// Update issue status (open | investigating | resolved | closed | escalated) + resolution notes
coordinatorRouter.patch('/issues/:id/status', (req: Request, res: Response) => {
  const authUser = getRequestUser(req)!;
  const issueId = Number(req.params.id);
  const { status, resolutionNotes, escalateToAdmin } = req.body;

  const allowed: IssueStatus[] = ['open', 'investigating', 'resolved', 'closed', 'escalated'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: `Invalid issue status '${status}'.` });
  }

  const result = db.updateIssueStatus({
    issueId,
    actor: authUser,
    status,
    resolutionNotes,
    escalateToAdmin: Boolean(escalateToAdmin),
  });

  if (!result.success) {
    return res.status(404).json({ error: result.message });
  }
  res.json({ message: result.message, issue: result.issue });
});

// Two-way coordinator reply on issue ticket
coordinatorRouter.post('/issues/:id/reply', (req: Request, res: Response) => {
  const authUser = getRequestUser(req)!;
  const issueId = Number(req.params.id);
  const { message } = req.body;

  const result = db.replyToIssue({
    issueId,
    sender: authUser,
    senderRole: authUser.role === 'admin' ? 'admin' : 'coordinator',
    message: message || '',
  });

  if (!result.success) {
    return res.status(400).json({ error: result.message });
  }
  res.json({ message: result.message, issue: result.issue, reply: result.reply });
});

// Escalate issue to Admin Review Queue
coordinatorRouter.post('/issues/:id/escalate', (req: Request, res: Response) => {
  const authUser = getRequestUser(req)!;
  const issueId = Number(req.params.id);
  const { reason } = req.body;

  const result = db.updateIssueStatus({
    issueId,
    actor: authUser,
    status: 'escalated',
    resolutionNotes: reason || 'Escalated to Administrator for policy or financial review.',
    escalateToAdmin: true,
  });

  if (!result.success) {
    return res.status(404).json({ error: result.message });
  }
  res.json({ message: result.message, issue: result.issue });
});

// Backward-compatible quick resolve endpoint
coordinatorRouter.post('/issues/:id/resolve', (req: Request, res: Response) => {
  const authUser = getRequestUser(req)!;
  const issueId = Number(req.params.id);
  const { resolutionNotes } = req.body;

  const result = db.updateIssueStatus({
    issueId,
    actor: authUser,
    status: 'resolved',
    resolutionNotes: resolutionNotes || 'Resolved through operational coordinator intervention.',
  });

  if (!result.success) {
    return res.status(404).json({ error: result.message });
  }
  res.json({ message: 'Issue report resolved successfully.', issue: result.issue });
});
