const express = require('express');
const router = express.Router();
const { 
    getLoans, getLoanById, createLoan, updateLoan, deleteLoan,
    getLoanPayments, createLoanPayment, updateLoanPayment, deleteLoanPayment
} = require('../controllers/loanController');
const { requireAuth } = require('../middlewares/authMiddleware');

router.use(requireAuth);

// Préstamos
router.get('/', getLoans);
router.get('/:id', getLoanById);
router.post('/', createLoan);
router.put('/:id', updateLoan);
router.delete('/:id', deleteLoan);

// Pagos
router.get('/:loanId/payments', getLoanPayments);
router.post('/:loanId/payments', createLoanPayment);
router.put('/payments/:id', updateLoanPayment);
router.delete('/payments/:id', deleteLoanPayment);

module.exports = router;
