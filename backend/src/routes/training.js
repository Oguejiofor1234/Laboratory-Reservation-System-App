const router = require('express').Router();
const { body } = require('express-validator');
const trainingController = require('../controllers/trainingController');
const { protect, restrictTo, requireVerified } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { audit } = require('../middleware/auditLog');

router.use(protect);

router.get('/certifications', trainingController.getCertifications);

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

router.patch('/:id/complete', restrictTo('TECHNOLOGIST', 'ADMIN'),
  audit('COMPLETE', 'training'), trainingController.complete);

module.exports = router;
