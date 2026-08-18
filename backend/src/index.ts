import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/env';
import { testDbConnection } from './config/db';
import authRoutes from './routes/auth.routes';
import electionRoutes from './routes/election.routes';
import adminRoutes from './routes/admin.routes';
import registerRoutes from './routes/register.routes';
import { generalLimiter } from './middleware/rateLimiter';

const app = express();

// 1. Core Security Middleware
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

// 2. Cross-Origin Resource Sharing (CORS)
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, postman) or matching client URL
      if (!origin || origin === config.clientUrl || origin.startsWith('http://localhost:')) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive in dev mode for multi-container testing
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// 3. Body Parsers & Logger
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));

// 4. Global Rate Limiter
app.use('/api/', generalLimiter);

// 5. Health Check Endpoint
app.get('/api/health', async (req: Request, res: Response) => {
  const dbConnected = await testDbConnection();
  res.status(dbConnected ? 200 : 503).json({
    status: dbConnected ? 'UP' : 'DEGRADED',
    service: 'New Life College Student Voting API',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    database: dbConnected ? 'CONNECTED' : 'DISCONNECTED',
    levanter_mode: config.levanter.mockMode ? 'SIMULATION' : 'LIVE_GATEWAY',
  });
});

// 6. Register API Routes
app.use('/api/auth', authRoutes);
app.use('/api/election', electionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/register', registerRoutes);

// 7. 404 Handler for undefined routes
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `Endpoint ${req.method} ${req.originalUrl} not found`,
  });
});

// 8. Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[Unhandled Error]:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'An unexpected internal server error occurred.',
    ...(config.nodeEnv === 'development' ? { stack: err.stack } : {}),
  });
});

// Start Server
const server = app.listen(config.port, async () => {
  console.log('='.repeat(70));
  console.log(`🚀 New Life College Voting API Server Running on port ${config.port}`);
  console.log(`🌐 Environment: ${config.nodeEnv}`);
  console.log(`📡 Levanter WhatsApp Mode: ${config.levanter.mockMode ? 'DEV SIMULATION' : 'LIVE VPS'}`);
  console.log('='.repeat(70));

  // Verify DB Connection on startup
  await testDbConnection();
});

export default app;
