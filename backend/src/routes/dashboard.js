const router = require('express').Router();
const dashboardController = require('../controllers/dashboardController');
const { protect, restrictTo } = require('../middleware/auth');

router.use(protect);

router.get('/student', restrictTo('STUDENT'), dashboardController.studentDashboard);
router.get('/tech', restrictTo('TECHNOLOGIST', 'ADMIN'), dashboardController.techDashboard);

module.exports = router;
