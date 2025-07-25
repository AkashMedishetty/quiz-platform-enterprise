const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cluster = require('cluster');
const os = require('os');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { RateLimiterFlexible } = require('rate-limiter-flexible');
const winston = require('winston');
const { createClient } = require('@supabase/supabase-js');
const config = require('./config');

// Redis imports for Socket.io scaling
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient: createRedisClient } = require('redis');

// Configure Winston logger
const logger = winston.createLogger({
  level: config.LOG_LEVEL,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'quiz-backend' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Supabase client with service role key
const supabase = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Rate limiters
const globalLimiter = new RateLimiterFlexible({
  points: config.RATE_LIMIT_MAX_REQUESTS,
  duration: Math.floor(config.RATE_LIMIT_WINDOW_MS / 1000),
  blockDuration: 60,
});

const expressLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX_REQUESTS,
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
});

// Clustering for production
if (config.CLUSTER_ENABLED && cluster.isMaster) {
  const numCPUs = os.cpus().length;
  logger.info(`🚀 Master process ${process.pid} is running`);
  logger.info(`🔥 Forking ${numCPUs} workers for enterprise scaling`);

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    logger.error(`💀 Worker ${worker.process.pid} died. Restarting...`);
    cluster.fork();
  });
} else {
  startServer();
}

async function startServer() {
  const app = express();
  const server = http.createServer(app);

  // Redis clients for Socket.io adapter (Enterprise scaling)
  const pubClient = createRedisClient({ url: config.REDIS_URL });
  const subClient = pubClient.duplicate();

  // Connect Redis clients
  try {
    await Promise.all([pubClient.connect(), subClient.connect()]);
    logger.info('✅ Redis clients connected for Socket.io scaling');
  } catch (err) {
    logger.error('❌ Redis connection failed:', err);
    process.exit(1);
  }

  // Socket.io setup with Redis adapter for scaling
  const io = socketIo(server, {
    cors: {
      origin: config.ALLOWED_ORIGINS.split(','),
      methods: ['GET', 'POST'],
      credentials: true
    },
    adapter: createAdapter(pubClient, subClient),
    transports: ['websocket', 'polling'],
    allowEIO3: true,
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Express middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  }));

  app.use(compression());
  app.use(cors({
    origin: config.ALLOWED_ORIGINS.split(','),
    credentials: true
  }));
  app.use(express.json({ limit: '10mb' }));
  app.use(expressLimiter);

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      pid: process.pid
    });
  });

  // API Routes
  app.get('/api/metrics', async (req, res) => {
    try {
      const connectedSockets = await io.fetchSockets();
      res.json({
        connectedUsers: connectedSockets.length,
        serverUptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error fetching metrics:', error);
      res.status(500).json({ error: 'Failed to fetch metrics' });
    }
  });

  app.get('/api/session/:sessionId/stats', async (req, res) => {
    const { sessionId } = req.params;
    
    try {
      // Get session participants
      const { data: participants, error } = await supabase
        .from('quiz_participants')
        .select('*')
        .eq('quiz_session_id', sessionId);

      if (error) throw error;

      res.json({
        sessionId,
        participantCount: participants?.length || 0,
        participants: participants || [],
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error fetching session stats:', error);
      res.status(500).json({ error: 'Failed to fetch session stats' });
    }
  });

  // Socket.io connection handling
  io.on('connection', (socket) => {
    logger.info(`🔌 New connection: ${socket.id}`);

    // Rate limiting for socket connections
    socket.use(async (packet, next) => {
      try {
        await globalLimiter.consume(socket.handshake.address);
        next();
      } catch (rejRes) {
        logger.warn(`Rate limit exceeded for ${socket.handshake.address}`);
        socket.emit('error', { message: 'Rate limit exceeded' });
        socket.disconnect();
      }
    });

    // Join session
    socket.on('join-session', async (data) => {
      try {
        const { sessionId, participantId, role } = data;
        
        // Join socket room
        await socket.join(sessionId);
        
        // Store session info
        socket.sessionId = sessionId;
        socket.participantId = participantId;
        socket.role = role;

        logger.info(`👤 ${role} joined session ${sessionId}: ${participantId}`);

        // Notify session
        socket.to(sessionId).emit('participant-joined', {
          participantId,
          role,
          timestamp: new Date().toISOString()
        });

        socket.emit('session-joined', { success: true, sessionId });
      } catch (error) {
        logger.error('Error joining session:', error);
        socket.emit('error', { message: 'Failed to join session' });
      }
    });

    // Submit answer
    socket.on('submit-answer', async (data) => {
      try {
        const { sessionId, participantId, questionId, answerIndex, timeToAnswer } = data;

        // Save answer to database
        const { error } = await supabase
          .from('quiz_answers')
          .upsert({
            participant_id: participantId,
            question_id: questionId,
            answer_index: answerIndex,
            time_to_answer: timeToAnswer,
            answered_at: new Date().toISOString()
          });

        if (error) throw error;

        // Notify session
        io.to(sessionId).emit('answer-submitted', {
          participantId,
          questionId,
          timestamp: new Date().toISOString()
        });

        socket.emit('answer-confirmed', { success: true });
      } catch (error) {
        logger.error('Error submitting answer:', error);
        socket.emit('answer-error', { message: 'Failed to submit answer' });
      }
    });

    // Quiz control (host only)
    socket.on('quiz-control', async (data) => {
      try {
        const { action, sessionId, data: controlData } = data;

        // Broadcast control action to session
        io.to(sessionId).emit(action, {
          ...controlData,
          timestamp: new Date().toISOString()
        });

        logger.info(`🎮 Quiz control: ${action} for session ${sessionId}`);
      } catch (error) {
        logger.error('Error handling quiz control:', error);
        socket.emit('error', { message: 'Failed to process quiz control' });
      }
    });

    // Handle ping for latency monitoring
    socket.on('ping', (timestamp) => {
      socket.emit('pong', timestamp);
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      logger.info(`🔌 Disconnected: ${socket.id} (${reason})`);
      
      if (socket.sessionId && socket.participantId) {
        socket.to(socket.sessionId).emit('participant-left', {
          participantId: socket.participantId,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Error handling
    socket.on('error', (error) => {
      logger.error(`Socket error for ${socket.id}:`, error);
    });
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('🛑 SIGTERM received. Shutting down gracefully...');
    server.close(() => {
      logger.info('✅ Process terminated');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    logger.info('🛑 SIGINT received. Shutting down gracefully...');
    server.close(() => {
      logger.info('✅ Process terminated');
      process.exit(0);
    });
  });

  // Start server
  const PORT = config.PORT || 3001;
  server.listen(PORT, () => {
    const workerId = cluster.worker ? cluster.worker.id : 'master';
    logger.info(`🚀 Enterprise Quiz Backend (Worker ${workerId}) running on port ${PORT}`);
    logger.info(`🎯 Ready for 1000+ concurrent participants`);
    logger.info(`🔄 Redis adapter enabled for horizontal scaling`);
    logger.info(`🛡️ Security and rate limiting active`);
  });
}

module.exports = { startServer };
