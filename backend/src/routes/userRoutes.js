const express = require('express');
const router = express.Router();
const { getAllUsers, createUser, updateUser } = require('../controllers/userController');
const { requireAuth, requireAdmin } = require('../middlewares/authMiddleware');

// Todas las rutas de usuarios requieren estar logueado como 'admin'
router.use(requireAuth);
router.use(requireAdmin);

router.get('/', getAllUsers);
router.post('/', createUser);
router.put('/:id', updateUser);

module.exports = router;
