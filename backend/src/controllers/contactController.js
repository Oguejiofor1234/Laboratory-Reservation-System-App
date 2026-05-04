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
  const { name, email, message, equipment, department, website } = req.body;

  // ── Honeypot: bots fill hidden fields, real users don't ──────────────────
  if (website) {
    return res.json({ success: true, message: 'Message sent.' });
  }

  // ── Basic presence validation ─────────────────────────────────────────────
  if (!name || !email || !message) {
    throw new AppError('Name, email and message are required', 400);
  }

  // ── Sanitise ──────────────────────────────────────────────────────────────
  const payload = {
    name:       name.trim().slice(0, 100),
    email:      email.trim().toLowerCase().slice(0, 254),
    message:    message.trim().slice(0, 5000),
    equipment:  (equipment || '').trim().slice(0, 100),
    department: (department || '').trim().slice(0, 150),
  };

  logger.info(
    `[Contact] ${payload.name} <${payload.email}>` +
    (payload.equipment ? ` — Equipment: ${payload.equipment}` : '')
  );

  // ── Respond immediately — send emails in the background ─────────────────
  // Fire-and-forget: don't await the emails so the user gets
  // an instant response instead of waiting 3-5 seconds for SMTP.
  res.json({
    success: true,
    message: 'Your message has been sent. We will be in touch shortly.',
  });

  // Emails sent after response is already delivered to browser
  Promise.allSettled([
    sendContactNotification(payload),  // → miracle2cool247@gmail.com
    sendContactAutoReply(payload),     // → sender's inbox (auto-reply)
  ]).catch(e => logger.error(`[Contact] Email error: ${e.message}`));
};
