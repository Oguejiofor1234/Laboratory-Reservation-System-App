require('dotenv').config();
require('express-async-errors');

const http = require('http');
const app = require('./src/app');
const { initSocket } = require('./src/config/socket');
const { initCronJobs } = require('./src/services/cronJobs');
const logger = require('./src/utils/logger');
const prisma = require('./src/config/database');

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

// Initialize cron jobs
initCronJobs();

// Graceful shutdown
const shutdown = async (signal) => {
  logger.info(`${signal} received — shutting down gracefully`);
  server.close(async () => {
    await prisma.$disconnect();
    logger.info('Server closed, DB disconnected');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

server.listen(PORT, () => {
  logger.info(`🚀 Lab 1780 API running on port ${PORT} [${process.env.NODE_ENV}]`);
});

module.exports = server;
