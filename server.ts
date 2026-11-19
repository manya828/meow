import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { authRouter } from './src/server/routes/auth.ts';
import { ridesRouter } from './src/server/routes/rides.ts';
import { bookingsRouter } from './src/server/routes/bookings.ts';
import { driverRouter } from './src/server/routes/driver.ts';
import { coordinatorRouter } from './src/server/routes/coordinator.ts';
import { adminRouter } from './src/server/routes/admin.ts';
import { trafficRouter } from './src/server/routes/traffic.ts';
import { issuesRouter } from './src/server/routes/issues.ts';
import { db } from './src/server/db.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT =
  Number(process.env.APP_PORT) ||
  Number(process.env.DEFAULT_APP_PORT) ||
  (process.env.PORT && process.env.PORT !== '8080' ? Number(process.env.PORT) : 3000);

// Body parser (preserves rawBody for signed payment webhook HMAC verification)
app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf.toString('utf8');
    },
  })
);
app.use(express.urlencoded({ extended: true }));

// Request logging middleware for SQL & HTTP traceability
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`[API] ${req.method} ${req.path} -> ${res.statusCode} (${duration}ms)`);
    });
  }
  next();
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/rides', ridesRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/driver', driverRouter);
app.use('/api/coordinator', coordinatorRouter);
app.use('/api/admin', adminRouter);
app.use('/api/traffic', trafficRouter);
app.use('/api/issues', issuesRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    appName: 'CarpoolX Mobility Platform',
    rdbms: 'MySQL / carpoolx',
    isMysqlConnected: db.isConnectedToMysql,
    activeEngine: db.isConnectedToMysql ? 'MySQL 8.0 InnoDB' : 'ACID Transactional Memory Engine',
    timestamp: new Date().toISOString(),
  });
});

// Centralized error-handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[CarpoolX Backend Error]', err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error',
    code: err.code || 'SERVER_ERROR',
  });
});

// Mount Vite or serve static production build
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 CarpoolX Express server running at http://0.0.0.0:${PORT}`);
    console.log(`📊 Database Engine: ${db.isConnectedToMysql ? 'Connected to MySQL (carpoolx)' : 'ACID Relational Engine Standby'}`);
  });
}

startServer();
