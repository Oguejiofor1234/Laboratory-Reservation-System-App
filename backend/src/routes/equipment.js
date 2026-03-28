const router = require('express').Router();
const { body } = require('express-validator');
const equipmentController = require('../controllers/equipmentController');
const { protect, restrictTo } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { audit } = require('../middleware/auditLog');

// Public: list equipment (auth optional for cert status)
router.get('/', (req, res, next) => {
  if (req.headers.authorization) return protect(req, res, () => next());
  next();
}, equipmentController.getAll);

router.get('/:id', equipmentController.getOne);
router.get('/:id/availability', equipmentController.getAvailability);

// Protected: technologist only
router.use(protect);

router.post('/', restrictTo('TECHNOLOGIST', 'ADMIN'), [
  body('name').trim().notEmpty().withMessage('Name required'),
  body('description').trim().notEmpty().withMessage('Description required'),
  body('type').trim().notEmpty().withMessage('Type required'),
  body('totalUnits').isInt({ min: 1 }).withMessage('Must have at least 1 unit'),
  validate,
], audit('CREATE', 'equipment'), equipmentController.create);

router.patch('/:id', restrictTo('TECHNOLOGIST', 'ADMIN'),
  audit('UPDATE', 'equipment'), equipmentController.update);

router.patch('/:id/maintenance', restrictTo('TECHNOLOGIST', 'ADMIN'),
  audit('MAINTENANCE_TOGGLE', 'equipment'), equipmentController.toggleMaintenance);

router.delete('/:id', restrictTo('ADMIN'),
  audit('DELETE', 'equipment'), equipmentController.remove);

module.exports = router;
