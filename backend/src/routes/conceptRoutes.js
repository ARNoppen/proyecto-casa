const express = require('express');
const router = express.Router();
const { getConcepts, createConcept, updateConcept, deleteConcept } = require('../controllers/conceptController');
const { requireAuth } = require('../middlewares/authMiddleware');

router.use(requireAuth);

router.get('/', getConcepts);
router.post('/', createConcept);
router.put('/:id', updateConcept);
router.delete('/:id', deleteConcept);

module.exports = router;
