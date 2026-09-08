const express = require('express');
const authRoutes = require('./routes/auth');
const bookmarkRoutes = require('./routes/bookmarks');
const healthRoutes = require('./routes/health');
const { errorHandler } = require('./middleware/errorHandler');

function createApp() {
  const app = express();

  app.use(express.json());

  app.use('/health', healthRoutes);
  app.use('/auth', authRoutes);
  app.use('/bookmarks', bookmarkRoutes);

  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
