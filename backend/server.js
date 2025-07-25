const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const Redis = require('ioredis');
const cluster = require('cluster');
const os = require('os');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { createClient } = require('@supabase/supabase-js');
const winston = require('winston');
require('dotenv').config();

// Configuration
const PORT = process.env.PORT || 3001;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const NODE_ENV = process.env.NODE_ENV || 'development';
const CLUSTER_ENABLED = process.env.CLUSTER_ENABLED === 'true';

// Logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Supabase client with service key for backend operations
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Clustering for production
if (CLUSTER_ENABLED && cluster.isMaster && NODE_ENV === 'production') {
  const numWorkers = os.cpus().length;
  logger.info(`🚀 Master process starting ${numWorkers} workers`);
  
  for (let i = 0; i < numWorkers; i++) {
    cluster.fork();
  }
  
  cluster.on('exit', (worker, code, signal) => {
    logger.error(`Worker ${worker.process.pid} died. Restarting...`);
    cluster.fork();
  });
} else {
  startServer();
}

function startServer() {
  const app = express();
  const server = http.createServer(app);
  
  // Redis setup for session management and pub/sub
  const redis = new Redis(REDIS_URL, {
    retryDelayOnFailover: 100,
    enableReadyCheck: false,
    maxRetriesPerRequest: null,
  });
  
  const redisAdapter = require('socket.io-redis');
  
  // Socket.io setup with Redis adapter for scaling
  const io = socketIo(server, {
    cors: {
      origin: [
        "https://onsite-atlas-productionsaas.vercel.app",
        "http://localhost:3000",
        "http://localhost:5173"
      ],
      methods: ["GET", "POST"],
      credentials: true
    },
    adapter: redisAdapter({ 
      host: process.env.REDIS_HOST || 'localhost', 
      port: process.env.REDIS_PORT || 6379 
    })
  });

  // Middleware
  app.use(helmet());
  app.use(compression());
  app.use(cors({
    origin: [
      "https://onsite-atlas-productionsaas.vercel.app",
      "http://localhost:3000", 
      "http://localhost:5173"
    ],
    credentials: true
  }));
  app.use(express.json({ limit: '10mb' }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP'
  });
  app.use('/api/', limiter);

  // Health check
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      pid: process.pid,
      memory: process.memoryUsage(),
      uptime: process.uptime()
    });
  });

  // Connection management
  const activeConnections = new Map();
  const sessionParticipants = new Map();

  // Socket.io connection handling
  io.on('connection', (socket) => {
    logger.info(`🔌 Client connected: ${socket.id}`);
    activeConnections.set(socket.id, {
      connectedAt: Date.now(),
      sessionId: null,
      participantId: null,
      role: null
    });

    // Join quiz session
    socket.on('join-session', async (data) => {
      try {
        const { sessionId, participantId, role } = data;
        
        // Validate session exists
        const { data: session, error } = await supabase
          .from('quiz_sessions')
          .select('*')
          .eq('id', sessionId)
          .single();

        if (error || !session) {
          socket.emit('error', { message: 'Session not found' });
          return;
        }

        // Join socket room for this session
        socket.join(`session:${sessionId}`);
        
        // Update connection info
        const connectionInfo = activeConnections.get(socket.id);
        connectionInfo.sessionId = sessionId;
        connectionInfo.participantId = participantId;
        connectionInfo.role = role;
        
        // Track participants per session
        if (!sessionParticipants.has(sessionId)) {
          sessionParticipants.set(sessionId, new Set());
        }
        sessionParticipants.get(sessionId).add(participantId);

        // Store participant connection in Redis
        await redis.setex(
          `participant:${participantId}:connection`, 
          3600, // 1 hour TTL
          JSON.stringify({
            socketId: socket.id,
            sessionId,
            role,
            joinedAt: Date.now()
          })
        );

        socket.emit('session-joined', { 
          sessionId, 
          participantCount: sessionParticipants.get(sessionId).size 
        });

        // Broadcast participant joined to session
        socket.to(`session:${sessionId}`).emit('participant-joined', {
          participantId,
          participantCount: sessionParticipants.get(sessionId).size
        });

        logger.info(`✅ ${role} ${participantId} joined session ${sessionId}`);
        
      } catch (error) {
        logger.error('Error joining session:', error);
        socket.emit('error', { message: 'Failed to join session' });
      }
    });

    // Handle answer submission
    socket.on('submit-answer', async (data) => {
      try {
        const { sessionId, participantId, questionId, answerIndex, timeToAnswer } = data;
        
        // Validate and process answer
        const result = await processAnswerSubmission({
          sessionId,
          participantId, 
          questionId,
          answerIndex,
          timeToAnswer
        });

        if (result.success) {
          // Broadcast answer received to session
          io.to(`session:${sessionId}`).emit('answer-submitted', {
            participantId,
            questionId,
            score: result.score,
            participantCount: result.participantCount,
            answeredCount: result.answeredCount
          });
          
          socket.emit('answer-confirmed', result);
        } else {
          socket.emit('answer-error', { message: result.error });
        }
        
      } catch (error) {
        logger.error('Error submitting answer:', error);
        socket.emit('answer-error', { message: 'Failed to submit answer' });
      }
    });

    // Handle quiz control (host only)
    socket.on('quiz-control', async (data) => {
      try {
        const { action, sessionId, data: controlData } = data;
        const connectionInfo = activeConnections.get(socket.id);
        
        // Verify host permissions
        if (connectionInfo.role !== 'host') {
          socket.emit('error', { message: 'Unauthorized' });
          return;
        }

        switch (action) {
          case 'start-quiz':
            await startQuiz(sessionId);
            io.to(`session:${sessionId}`).emit('quiz-started', { sessionId });
            break;
            
          case 'next-question':
            const questionResult = await nextQuestion(sessionId, controlData.questionIndex);
            io.to(`session:${sessionId}`).emit('question-started', questionResult);
            break;
            
          case 'show-results':
            await showResults(sessionId);
            io.to(`session:${sessionId}`).emit('results-shown', { sessionId });
            break;
            
          case 'end-quiz':
            await endQuiz(sessionId);
            io.to(`session:${sessionId}`).emit('quiz-ended', { sessionId });
            break;
        }
        
      } catch (error) {
        logger.error('Error in quiz control:', error);
        socket.emit('error', { message: 'Quiz control failed' });
      }
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      const connectionInfo = activeConnections.get(socket.id);
      
      if (connectionInfo) {
        const { sessionId, participantId } = connectionInfo;
        
        // Remove from session participants
        if (sessionId && sessionParticipants.has(sessionId)) {
          sessionParticipants.get(sessionId).delete(participantId);
          
          // Broadcast participant left
          socket.to(`session:${sessionId}`).emit('participant-left', {
            participantId,
            participantCount: sessionParticipants.get(sessionId).size
          });
        }

        // Clean up Redis connection
        if (participantId) {
          await redis.del(`participant:${participantId}:connection`);
        }
      }

      activeConnections.delete(socket.id);
      logger.info(`🔌 Client disconnected: ${socket.id}`);
    });
  });

  // API Routes

  // Get session statistics
  app.get('/api/session/:sessionId/stats', async (req, res) => {
    try {
      const { sessionId } = req.params;
      
      const [sessionData, participants, answers] = await Promise.all([
        supabase.from('quiz_sessions').select('*').eq('id', sessionId).single(),
        supabase.from('quiz_participants').select('*').eq('quiz_session_id', sessionId),
        supabase.from('quiz_answers').select('*').eq('quiz_session_id', sessionId)
      ]);

      const stats = {
        session: sessionData.data,
        totalParticipants: participants.data?.length || 0,
        activeConnections: sessionParticipants.get(sessionId)?.size || 0,
        totalAnswers: answers.data?.length || 0,
        avgScore: participants.data?.reduce((sum, p) => sum + (p.score || 0), 0) / (participants.data?.length || 1)
      };

      res.json(stats);
    } catch (error) {
      logger.error('Error getting session stats:', error);
      res.status(500).json({ error: 'Failed to get session statistics' });
    }
  });

  // Batch answer processing endpoint
  app.post('/api/session/:sessionId/batch-answers', async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { answers } = req.body;
      
      const results = await Promise.all(
        answers.map(answer => processAnswerSubmission({
          sessionId,
          ...answer
        }))
      );

      res.json({ results });
    } catch (error) {
      logger.error('Error processing batch answers:', error);
      res.status(500).json({ error: 'Failed to process batch answers' });
    }
  });

  // System metrics endpoint
  app.get('/api/metrics', (req, res) => {
    res.json({
      activeConnections: activeConnections.size,
      activeSessions: sessionParticipants.size,
      totalParticipants: Array.from(sessionParticipants.values())
        .reduce((sum, participants) => sum + participants.size, 0),
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      pid: process.pid
    });
  });

  // Helper functions
  async function processAnswerSubmission({ sessionId, participantId, questionId, answerIndex, timeToAnswer }) {
    try {
      // Get question details
      const { data: question } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('id', questionId)
        .single();

      if (!question) {
        return { success: false, error: 'Question not found' };
      }

      const isCorrect = answerIndex === question.correct_answer;
      const points = isCorrect ? (question.points || 100) : 0;

      // Store answer
      const { error: answerError } = await supabase
        .from('quiz_answers')
        .insert({
          quiz_session_id: sessionId,
          participant_id: participantId,
          question_id: questionId,
          selected_answer: answerIndex,
          is_correct: isCorrect,
          points_earned: points,
          time_to_answer: timeToAnswer,
          answered_at: new Date().toISOString()
        });

      if (answerError) throw answerError;

      // Update participant score
      const { data: participant } = await supabase
        .from('quiz_participants')
        .select('score')
        .eq('id', participantId)
        .single();

      const newScore = (participant?.score || 0) + points;

      await supabase
        .from('quiz_participants')
        .update({ 
          score: newScore,
          last_seen: new Date().toISOString()
        })
        .eq('id', participantId);

      // Get session stats
      const [participantCount, answeredCount] = await Promise.all([
        sessionParticipants.get(sessionId)?.size || 0,
        supabase.from('quiz_answers')
          .select('participant_id', { count: 'exact' })
          .eq('quiz_session_id', sessionId)
          .eq('question_id', questionId)
          .then(({ count }) => count)
      ]);

      return {
        success: true,
        score: newScore,
        points: points,
        isCorrect,
        participantCount,
        answeredCount
      };

    } catch (error) {
      logger.error('Error processing answer:', error);
      return { success: false, error: error.message };
    }
  }

  async function startQuiz(sessionId) {
    await supabase
      .from('quiz_sessions')
      .update({ 
        is_active: true,
        current_question_start_time: new Date().toISOString()
      })
      .eq('id', sessionId);
  }

  async function nextQuestion(sessionId, questionIndex) {
    const result = await supabase
      .from('quiz_sessions')
      .update({ 
        current_question_index: questionIndex,
        current_question_start_time: new Date().toISOString(),
        show_results: false
      })
      .eq('id', sessionId)
      .select()
      .single();

    return result.data;
  }

  async function showResults(sessionId) {
    await supabase
      .from('quiz_sessions')
      .update({ show_results: true })
      .eq('id', sessionId);
  }

  async function endQuiz(sessionId) {
    await supabase
      .from('quiz_sessions')
      .update({ 
        is_finished: true,
        is_active: false,
        show_results: true
      })
      .eq('id', sessionId);
  }

  // Start server
  server.listen(PORT, () => {
    logger.info(`🚀 Quiz Backend Server running on port ${PORT}`);
    logger.info(`🌍 Environment: ${NODE_ENV}`);
    logger.info(`👥 Process ID: ${process.pid}`);
    logger.info(`🔗 Redis connected: ${REDIS_URL}`);
    logger.info(`📊 Supabase connected: ${SUPABASE_URL}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    server.close(() => {
      logger.info('Process terminated');
      process.exit(0);
    });
  });
}

module.exports = { startServer }; 