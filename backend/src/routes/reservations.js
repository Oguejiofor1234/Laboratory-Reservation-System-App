const router = require('express').Router();
const { body } = require('express-validator');
const reservationController = require('../controllers/reservationController');
const { protect, restrictTo, requireVerified } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { audit } = require('../middleware/auditLog');

router.use(protect);

router.post('/', requireVerified, [
  body('equipmentId').notEmpty().withMessage('Equipment ID required'),
  body('startTime').isISO8601().withMessage('Valid start time required'),
  body('endTime').isISO8601().withMessage('Valid end time required'),
  validate,
], audit('CREATE', 'reservation'), reservationController.create);

router.get('/', reservationController.getAll);
router.get('/:id', reservationController.getOne);

router.patch('/:id/confirm', restrictTo('TECHNOLOGIST', 'ADMIN'),
  audit('CONFIRM', 'reservation'), reservationController.confirm);

router.patch('/:id/reject', restrictTo('TECHNOLOGIST', 'ADMIN'), [
  body('reason').optional().isString(),
  validate,
], audit('REJECT', 'reservation'), reservationController.reject);

router.patch('/:id/cancel', [
  body('reason').optional().isString(),
  validate,
], audit('CANCEL', 'reservation'), reservationController.cancel);

router.post('/waitlist', requireVerified, [
  body('equipmentId').notEmpty(),
  body('requestedDate').isISO8601(),
  validate,
], reservationController.addToWaitlist);

module.exports = router;
