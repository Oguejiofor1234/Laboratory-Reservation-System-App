const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const {
  sendContactNotification,
  sendContactAutoReply,
} = require('../services/emailService');

/**
 * POST /api/contact
 *
 * Flow:
 *  1. Honeypot check  — bots fill a hidden "website" field; humans leave it blank
 *  2. Sanitise inputs — trim whitespace, cap lengths
 *  3. Send two emails:
 *       a) Admin notification  → miracle2cool247@gmail.com  (Reply-To: sender)
 *       b) Auto-reply          → sender's email             (confirms receipt)
 *  4. Return 200 success (even if email delivery fails, so the UI always
 *     shows the success state — errors are logged server-side)
 */
exports.sendMessage = async (req, res) => {
  const { name, email, subject, message, website } = req.body;

  // ── Honeypot: bots fill hidden fields, real users don't ──────────────────
  if (website) {
    // Silently succeed so bots don't know they were caught
    return res.json({ success: true, message: 'Message sent.' });
  }

  // ── Basic presence validation (express-validator handles the rest) ────────
  if (!name || !email || !subject || !message) {
    throw new AppError('All fields are required', 400);
  }

  // ── Sanitise: trim + cap lengths to prevent huge payloads ─────────────────
  const payload = {
    name:    name.trim().slice(0, 100),
    email:   email.trim().toLowerCase().slice(0, 254),
    subject: subject.trim().slice(0, 200),
    message: message.trim().slice(0, 5000),
  };

  logger.info(`[Contact] New message from ${payload.name} <${payload.email}> — "${payload.subject}"`);

  // ── Send emails (both fire-and-forget; never block the HTTP response) ─────
  await Promise.allSettled([
    sendContactNotification(payload),  // → miracle2cool247@gmail.com
    sendContactAutoReply(payload),     // → sender (confirmation)
  ]);

  res.json({
    success: true,
    message: 'Your message has been sent. We will be in touch shortly.',
  });
};
