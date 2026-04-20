const router = require('express').Router();
const { body } = require('express-validator');
const trainingController = require('../controllers/trainingController');
const { protect, restrictTo, requireVerified } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { audit } = require('../middleware/auditLog');

router.use(protect);

router.post('/', requireVerified, [
  body('equipmentId').notEmpty().withMessage('Equipment ID required'),
  body('scheduledAt').isISO8601().withMessage('Valid scheduled time required'),
  validate,
], audit('REQUEST', 'training'), trainingController.request);

router.get('/', trainingController.getAll);

router.patch('/:id/confirm', restrictTo('TECHNOLOGIST', 'ADMIN'),
  audit('CONFIRM', 'training'), trainingController.confirm);

router.patch('/:id/reject', restrictTo('TECHNOLOGIST', 'ADMIN'), [
  body('reason').optional().isString(),
  validate,
], audit('REJECT', 'training'), trainingController.reject);

router.patch('/:id/reschedule', restrictTo('TECHNOLOGIST', 'ADMIN'), [
  body('proposedAt').isISO8601().withMessage('Valid proposed date/time required'),
  body('reason').optional().isString(),
  validate,
], audit('RESCHEDULE', 'training'), trainingController.reschedule);

router.patch('/:id/accept-reschedule', trainingController.acceptReschedule);
router.patch('/:id/reject-reschedule', [
  body('reason').optional().isString(),
  validate,
], trainingController.rejectReschedule);

router.patch('/:id/complete', restrictTo('TECHNOLOGIST', 'ADMIN'),
  audit('COMPLETE', 'training'), trainingController.complete);

module.exports = router;
