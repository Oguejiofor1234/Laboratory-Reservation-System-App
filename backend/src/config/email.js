const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Verify connection on startup (non-blocking)
if (process.env.NODE_ENV !== 'test') {
  transporter.verify().then(() => {
    logger.info('📧 Email transporter ready');
  }).catch((err) => {
    logger.warn(`📧 Email transporter not ready: ${err.message}`);
  });
}

module.exports = transporter;
