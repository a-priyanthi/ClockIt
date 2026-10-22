const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');
const apiRoutes = require('./routes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();

// Global Middleware
app.use(cors());
app.use((req, res, next) => {
  const orig = req.headers['x-matched-path'] || req.headers['x-forwarded-uri'] || req.headers['x-original-url'];
  if (orig && (req.url === '/api' || req.url === '/api/index.js' || req.url === '/' || req.url === '/api/index' || req.url.startsWith('/api/index.js?') || req.url.startsWith('/api?'))) {
    const qIdx = req.url.indexOf('?');
    req.url = (qIdx !== -1 && !orig.includes('?')) ? orig + req.url.slice(qIdx) : orig;
  }
  next();
});
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Serve frontend static assets
app.use(express.static(config.PUBLIC_DIR));

// Serve uploaded user files securely
app.use('/uploads', express.static(config.UPLOAD_DIR));

// Mount REST API (support both /api prefix and root-level API calls)
app.use('/api', apiRoutes);
app.use(apiRoutes);

// Root route fallback to serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(config.PUBLIC_DIR, 'index.html'));
});

// Catch unknown API requests
app.use(notFoundHandler);

// Global Error Handler
app.use(errorHandler);

module.exports = app;
