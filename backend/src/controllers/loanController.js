const LoanModel = require('../models/loanModel');

const getLoans = async (req, res) => {
    try {
        const loans = await LoanModel.findAll();
        res.json(loans);
    } catch (error) {
        console.error('Error in getLoans:', error);
        res.status(500).json({ error: 'Error al listar los préstamos' });
    }
};

const getLoanById = async (req, res) => {
    try {
        const { id } = req.params;
        const loan = await LoanModel.findById(id);
        if (!loan) return res.status(404).json({ error: 'Préstamo no encontrado' });
        res.json(loan);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener el detalle del préstamo' });
    }
};

const createLoan = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Solo los administradores pueden crear préstamos' });
        }
        const { name, total_amount, installments_count, start_date, due_day } = req.body;
        if (!name || !total_amount || !installments_count || !start_date || !due_day) {
            return res.status(400).json({ error: 'Faltan campos obligatorios' });
        }

        const loanData = { 
            ...req.body, 
            created_by_user_id: req.user.id 
        };
        const id = await LoanModel.create(loanData);
        res.status(201).json({ message: 'Préstamo creado exitosamente', id });
    } catch (error) {
        console.error('Error in createLoan:', error);
        res.status(500).json({ error: 'Error al crear el préstamo' });
    }
};

const updateLoan = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Solo los administradores pueden editar préstamos' });
        }
        const { id } = req.params;
        const loanData = { ...req.body, updated_by_user_id: req.user.id };
        
        const updated = await LoanModel.update(id, loanData);
        if (!updated) return res.status(404).json({ error: 'Préstamo no encontrado' });
        
        res.json({ message: 'Préstamo actualizado exitosamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar el préstamo' });
    }
};

const deleteLoan = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Solo los administradores pueden eliminar préstamos' });
        }
        const { id } = req.params;
        const deleted = await LoanModel.remove(id);
        if (!deleted) return res.status(404).json({ error: 'Préstamo no encontrado' });
        
        res.json({ message: 'Préstamo eliminado exitosamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar el préstamo' });
    }
};

// Pagos
const getLoanPayments = async (req, res) => {
    try {
        const { loanId } = req.params;
        const payments = await LoanModel.findPaymentsByLoanId(loanId);
        res.json(payments);
    } catch (error) {
        res.status(500).json({ error: 'Error al listar los pagos del préstamo' });
    }
};

const createLoanPayment = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Solo los administradores pueden registrar pagos' });
        }
        const { loanId } = req.params;
        const { amount, payment_date, assigned_to_user_id } = req.body;
        
        if (!amount || !payment_date || !assigned_to_user_id) {
            return res.status(400).json({ error: 'Monto, fecha y usuario asignado son requeridos' });
        }

        const paymentData = {
            ...req.body,
            loan_id: loanId,
            created_by_user_id: req.user.id
        };
        const id = await LoanModel.createPayment(paymentData);
        res.status(201).json({ message: 'Pago registrado exitosamente', id });
    } catch (error) {
        console.error('Error in createLoanPayment:', error);
        res.status(500).json({ error: 'Error al registrar el pago' });
    }
};

const updateLoanPayment = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Solo los administradores pueden editar pagos' });
        }
        const { id } = req.params;
        const paymentData = { ...req.body, updated_by_user_id: req.user.id };
        
        const updated = await LoanModel.updatePayment(id, paymentData);
        if (!updated) return res.status(404).json({ error: 'Pago no encontrado' });
        
        res.json({ message: 'Pago actualizado correctamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error al editar el pago' });
    }
};

const deleteLoanPayment = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Solo los administradores pueden eliminar pagos' });
        }
        const { id } = req.params;
        const deleted = await LoanModel.removePayment(id);
        if (!deleted) return res.status(404).json({ error: 'Pago no encontrado' });
        
        res.json({ message: 'Pago eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar el pago' });
    }
};

module.exports = {
    getLoans,
    getLoanById,
    createLoan,
    updateLoan,
    deleteLoan,
    getLoanPayments,
    createLoanPayment,
    updateLoanPayment,
    deleteLoanPayment
};
