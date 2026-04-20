const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const settingsController = require('../controllers/settingsController');
const { protect, restrictTo } = require('../middleware/auth');

// Multer config for site cover image
const storage = multer.diskStorage({
  destination: path.join(__dirname, '../../uploads/site'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `cover${ext}`);
  },
});
const coverUpload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
  fileFilter: (req, file, cb) => {
    if (/jpeg|jpg|png|webp/.test(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('Only image files allowed'));
  },
});

// Public — landing page reads this
router.get('/', settingsController.getSettings);

// Supervisor/Admin only
router.post('/cover', protect, restrictTo('TECHNOLOGIST', 'ADMIN'), coverUpload.single('cover'), settingsController.uploadCover);
router.delete('/cover', protect, restrictTo('TECHNOLOGIST', 'ADMIN'), settingsController.deleteCover);

module.exports = router;
