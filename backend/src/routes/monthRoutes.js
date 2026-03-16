const express = require('express');
const router = express.Router();
const { getAllMonths, getDashboard, createMonth, updateStatus } = require('../controllers/monthController');
const { requireAuth, requireAdmin } = require('../middlewares/authMiddleware');

// Todas las rutas requieren login normal al menos
router.use(requireAuth);

router.get('/dashboard', getDashboard);
router.get('/', getAllMonths);

// Acciones críticas solo para Admin
router.post('/', requireAdmin, createMonth);
router.put('/:id/status', requireAdmin, updateStatus);

module.exports = router;
