const router = require('express').Router();
const { body } = require('express-validator');
const multer = require('multer');
const path = require('path');
const equipmentController = require('../controllers/equipmentController');
const { protect, restrictTo } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { audit } = require('../middleware/auditLog');

// Multer: buffer in memory so we can upload to Cloudinary (or save to disk locally)
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|gif/;
    if (allowed.test(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

// Multer for video uploads (200 MB limit)
const videoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB
  fileFilter: (req, file, cb) => {
    const allowed = /mp4|mov|avi|webm|mkv|m4v/;
    if (allowed.test(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('Only video files are allowed (mp4, mov, webm, avi)'));
  },
});

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

router.post('/:id/image', restrictTo('TECHNOLOGIST', 'ADMIN'), imageUpload.single('image'), equipmentController.uploadImage);
router.delete('/:id/image', restrictTo('TECHNOLOGIST', 'ADMIN'), equipmentController.deleteImage);
router.post('/:id/video-upload', restrictTo('TECHNOLOGIST', 'ADMIN'), videoUpload.single('video'), equipmentController.uploadVideoFile);
router.patch('/:id/video', restrictTo('TECHNOLOGIST', 'ADMIN'), equipmentController.updateVideo);
router.patch('/:id/videos', restrictTo('TECHNOLOGIST', 'ADMIN'), equipmentController.updateVideos);
router.patch('/:id/materials', restrictTo('TECHNOLOGIST', 'ADMIN'), equipmentController.updateMaterials);

router.patch('/:id/maintenance', restrictTo('TECHNOLOGIST', 'ADMIN'),
  audit('MAINTENANCE_TOGGLE', 'equipment'), equipmentController.toggleMaintenance);

router.delete('/:id', restrictTo('TECHNOLOGIST', 'ADMIN'),
  audit('DELETE', 'equipment'), equipmentController.remove);

module.exports = router;
