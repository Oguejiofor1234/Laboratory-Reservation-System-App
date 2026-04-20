const router = require('express').Router();
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const validate = require('../middleware/validate');
const contactController = require('../controllers/contactController');

/**
 * Strict rate limiter for the contact form.
 * Max 5 submissions per IP per hour.
 * This prevents both manual spam and bot flooding.
 */
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many messages sent from this IP. Please try again later.',
  },
});

/**
 * @swagger
 * /contact:
 *   post:
 *     summary: Send a contact form message
 *     tags: [Contact]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, subject, message]
 *             properties:
 *               name:    { type: string, example: "Jane Doe" }
 *               email:   { type: string, example: "jane@example.com" }
 *               subject: { type: string, example: "Equipment enquiry" }
 *               message: { type: string, example: "I would like to know..." }
 *     responses:
 *       200: { description: "Message sent successfully" }
 *       400: { description: "Validation error" }
 *       429: { description: "Too many requests" }
 */
router.post(
  '/',
  contactLimiter,
  [
    body('name')
      .trim()
      .notEmpty().withMessage('Name is required')
      .isLength({ max: 100 }).withMessage('Name must be under 100 characters'),

    body('email')
      .isEmail().withMessage('A valid email address is required')
      .normalizeEmail(),

    // subject is now built internally — still accepted if sent, just not required
    body('subject').optional().trim().isLength({ max: 200 }),

    // optional extra fields from the contact form
    body('equipment').optional().trim().isLength({ max: 100 }),
    body('department').optional().trim().isLength({ max: 150 }),

    body('message')
      .trim()
      .notEmpty().withMessage('Message is required')
      .isLength({ min: 10, max: 5000 }).withMessage('Message must be between 10 and 5000 characters'),

    validate,
  ],
  contactController.sendMessage
);

module.exports = router;
