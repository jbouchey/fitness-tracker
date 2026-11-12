const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const { CLIENT_URL, TRUST_PROXY } = require('./config/env');
const { errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth.routes');
const workoutRoutes = require('./routes/workout.routes');
const uploadRoutes = require('./routes/upload.routes');
const stravaRoutes = require('./routes/strava.routes');
const adventureRoutes = require('./routes/adventure.routes');

const app = express();
// Number of reverse proxies in front of the app. With the wrong number every
// visitor looks like the same address and shares one rate limit.
app.set('trust proxy', TRUST_PROXY);

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-eval'"], // Mapbox GL JS requires eval
        workerSrc: ["'self'", 'blob:'],          // Mapbox GL JS web workers
        childSrc: ["'self'", 'blob:'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https://*.mapbox.com', 'https://developers.strava.com'], // Strava: the Connect button image
        connectSrc: [
          "'self'",
          'https://*.mapbox.com',
          'https://api.mapbox.com',
          'https://events.mapbox.com',
        ],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://api.mapbox.com'],
        fontSrc: ["'self'", 'https://api.mapbox.com'],
      },
    },
  })
);
app.use(
  cors({
    origin: [CLIENT_URL, 'http://localhost:5173'],
    credentials: true,
  })
);

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Broad per-address ceiling for the whole API. The Strava webhook is exempt:
// Strava sends from its own addresses and expects a reply within two seconds.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/strava/webhook',
  message: { error: 'Too many requests. Please slow down and try again shortly.' },
});
app.use('/api', apiLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/workouts', workoutRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/strava', stravaRoutes);
app.use('/api/adventure', adventureRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Serve React build (if it exists — single-service mode)
const clientDist = path.join(__dirname, '../../client/dist');
const clientIndex = path.join(clientDist, 'index.html');
if (fs.existsSync(clientIndex)) {
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => res.sendFile(clientIndex));
} else {
  // Two-service mode: redirect browser requests to the client service
  app.get('*', (req, res) => res.redirect(CLIENT_URL + req.path));
}

// Global error handler
app.use(errorHandler);

module.exports = app;
