// Backend Configuration
// Copy this to .env file or set as environment variables

const config = {
  // Server
  PORT: process.env.PORT || 3001,
  NODE_ENV: process.env.NODE_ENV || 'development',
  CLUSTER_ENABLED: process.env.CLUSTER_ENABLED === 'true',

  // Supabase - Get these from your current frontend .env
  SUPABASE_URL: process.env.SUPABASE_URL || 'https://wfyyzdrqkzwhprcefnkx.supabase.co',
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY || 'your-service-role-key-here',

  // Redis - Required for 1000+ participants
  // For local development: redis://localhost:6379
  // For production: Use Redis Cloud or DigitalOcean Redis
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: process.env.REDIS_PORT || 6379,

  // CORS - Your frontend URLs
  ALLOWED_ORIGINS: [
    'https://onsite-atlas-productionsaas.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173'
  ],

  // Performance
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,

  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  LOG_FILE_ERROR: process.env.LOG_FILE_ERROR || 'logs/error.log',
  LOG_FILE_COMBINED: process.env.LOG_FILE_COMBINED || 'logs/combined.log'
};

module.exports = config;

/* 
===========================================
📋 ENVIRONMENT SETUP INSTRUCTIONS
===========================================

1. CREATE .env FILE:
Create backend/.env with these variables:

PORT=3001
NODE_ENV=production
CLUSTER_ENABLED=true
SUPABASE_URL=https://wfyyzdrqkzwhprcefnkx.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key-here
REDIS_URL=redis://localhost:6379

2. GET SUPABASE SERVICE KEY:
- Go to Supabase Dashboard > Settings > API
- Copy "service_role" key (NOT anon key)
- This allows backend to bypass RLS policies

3. REDIS SETUP OPTIONS:

LOCAL (Development):
- Install Redis: https://redis.io/download
- Default: redis://localhost:6379

PRODUCTION (Recommended):
- Redis Cloud: https://redis.com (free tier available)
- DigitalOcean Managed Redis: $15/month
- AWS ElastiCache: $13/month

4. FRONTEND ENVIRONMENT UPDATE:
Add to your Vercel environment variables:
NEXT_PUBLIC_BACKEND_URL=https://your-backend-url.com
NEXT_PUBLIC_BACKEND_WS_URL=wss://your-backend-url.com

===========================================
*/ 