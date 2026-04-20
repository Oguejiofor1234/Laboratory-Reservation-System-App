const router = require('express').Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const validate = require('../middleware/validate');

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication endpoints
 */

router.post('/register', authLimiter, [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain a number'),
  body('firstName').trim().notEmpty().withMessage('First name required'),
  body('lastName').trim().notEmpty().withMessage('Last name required'),
  body('role').optional().isIn(['STUDENT', 'TECHNOLOGIST']).withMessage('Invalid role'),
  validate,
], authController.register);

router.post('/login', authLimiter, [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  validate,
], authController.login);

router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.get('/me', protect, authController.me);
router.get('/technologists', protect, authController.getTechnologists);
// Public resend (after registration, before login) or authenticated resend
router.post('/resend-verification', authController.resendVerification);
router.get('/check-verified', authController.checkVerified);
router.delete('/account', protect, authController.deleteAccount);
router.get('/verify-email/:token', authController.verifyEmail);

router.post('/forgot-password', authLimiter, [
  body('email').isEmail().normalizeEmail(),
  validate,
], authController.forgotPassword);

router.post('/reset-password/:token', [
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  validate,
], authController.resetPassword);

router.post('/reset-by-code', [
  body('email').isEmail().normalizeEmail(),
  body('code').isLength({ min: 6, max: 6 }).withMessage('Code must be 6 digits'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  validate,
], authController.resetByCode);

module.exports = router;
