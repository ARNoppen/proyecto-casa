const express = require('express');
const router = express.Router();
const { getAllUsers, createUser, updateUser, changeUserPassword } = require('../controllers/userController');
const { requireAuth, requireAdmin } = require('../middlewares/authMiddleware');

// Todas las rutas de usuarios requieren estar logueado
router.use(requireAuth);

router.get('/', getAllUsers); // Necesario para mapear personas en importación
router.post('/', requireAdmin, createUser);
router.put('/:id', requireAdmin, updateUser);
router.put('/:id/password', requireAdmin, changeUserPassword);

module.exports = router;
