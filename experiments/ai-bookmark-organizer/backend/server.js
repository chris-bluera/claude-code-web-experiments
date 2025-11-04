const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const db = require('./config/database');
const bookmarksRouter = require('./routes/bookmarks');
const categoriesRouter = require('./routes/categories');
const aiRouter = require('./routes/ai');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    const allowedOrigins = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')
      : ['http://localhost:3000'];

    // Allow chrome extension origins (they start with chrome-extension://)
    if (origin.startsWith('chrome-extension://')) {
      return callback(null, true);
    }

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};

app.use(cors(corsOptions));

// Body parser middleware
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API routes
app.use('/api/bookmarks', bookmarksRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/ai', aiRouter);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'AI Bookmark Organizer API',
    version: '1.0.0',
    endpoints: {
      bookmarks: '/api/bookmarks',
      categories: '/api/categories',
      ai: '/api/ai',
      health: '/health'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);

  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      error: 'CORS policy violation'
    });
  }

  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

// Initialize database and start server
async function startServer() {
  try {
    // Test database connection
    console.log('Testing database connection...');
    const testResult = await db.query('SELECT NOW()');
    console.log('✓ Database connected:', testResult.rows[0].now);

    // Initialize pgvector
    await db.initPgVector();

    // Start server
    app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════════╗
║   AI Bookmark Organizer API Server            ║
║   Running on http://localhost:${PORT}         ║
║   Environment: ${process.env.NODE_ENV || 'development'}                  ║
╚════════════════════════════════════════════════╝

Available endpoints:
  - GET  /health
  - GET  /api/bookmarks
  - POST /api/bookmarks
  - GET  /api/bookmarks/search?q=query
  - POST /api/bookmarks/search/semantic
  - GET  /api/categories
  - POST /api/categories
  - POST /api/ai/analyze
  - POST /api/ai/chat
  - POST /api/ai/suggest

Press Ctrl+C to stop the server.
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  db.pool.end(() => {
    console.log('Database pool closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received, closing server...');
  db.pool.end(() => {
    console.log('Database pool closed');
    process.exit(0);
  });
});

// Start the server
startServer();

module.exports = app;
