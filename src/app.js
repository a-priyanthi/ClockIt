const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');
const apiRoutes = require('./routes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();

// Global Middleware
app.use(cors());
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
