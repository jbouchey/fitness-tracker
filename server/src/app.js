const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { CLIENT_URL } = require('./config/env');
const { errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth.routes');
const workoutRoutes = require('./routes/workout.routes');
const uploadRoutes = require('./routes/upload.routes');

const app = express();
app.set('trust proxy', 1); // Railway runs behind a reverse proxy

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-eval'"], // Mapbox GL JS requires eval
        workerSrc: ["'self'", 'blob:'],          // Mapbox GL JS web workers
        childSrc: ["'self'", 'blob:'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https://*.mapbox.com'],
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

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/workouts', workoutRoutes);
app.use('/api/upload', uploadRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Serve React build (if it exists)
const clientDist = path.join(__dirname, '../../client/dist');
const clientIndex = path.join(clientDist, 'index.html');
if (fs.existsSync(clientIndex)) {
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => res.sendFile(clientIndex));
}

// Global error handler
app.use(errorHandler);

module.exports = app;
