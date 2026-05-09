const pool = require('../config/db');

const findAll = async () => {
    const { rows } = await pool.query(`
        SELECT 
            l.*,
            COALESCE(p.total_paid, 0) as total_paid,
            l.total_amount - COALESCE(p.total_paid, 0) as remaining_amount,
            COALESCE(p.payments_count, 0) as payments_count,
            u1.name as created_by_name,
            u2.name as updated_by_name
        FROM loans l
        LEFT JOIN (
            SELECT loan_id, SUM(amount) as total_paid, COUNT(*) as payments_count
            FROM loan_payments
            GROUP BY loan_id
        ) p ON l.id = p.loan_id
        LEFT JOIN users u1 ON l.created_by_user_id = u1.id
        LEFT JOIN users u2 ON l.updated_by_user_id = u2.id
        ORDER BY l.created_at DESC
    `);
    return rows;
};

const findById = async (id) => {
    const { rows } = await pool.query(`
        SELECT 
            l.*,
            COALESCE(p.total_paid, 0) as total_paid,
            l.total_amount - COALESCE(p.total_paid, 0) as remaining_amount,
            u1.name as created_by_name,
            u2.name as updated_by_name
        FROM loans l
        LEFT JOIN (
            SELECT loan_id, SUM(amount) as total_paid
            FROM loan_payments
            WHERE loan_id = $1
            GROUP BY loan_id
        ) p ON l.id = p.loan_id
        LEFT JOIN users u1 ON l.created_by_user_id = u1.id
        LEFT JOIN users u2 ON l.updated_by_user_id = u2.id
        WHERE l.id = $1
    `, [id]);
    return rows[0];
};

const create = async (loanData) => {
    const { name, entity, total_amount, installments_count, start_date, due_day, status, created_by_user_id } = loanData;
    const { rows } = await pool.query(
        `INSERT INTO loans (name, entity, total_amount, installments_count, start_date, due_day, status, created_by_user_id, updated_by_user_id) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8) RETURNING id`,
        [name, entity, total_amount, installments_count, start_date, due_day, status || 'active', created_by_user_id]
    );
    return rows[0].id;
};

const update = async (id, loanData) => {
    const { name, entity, total_amount, installments_count, start_date, due_day, status, updated_by_user_id } = loanData;
    const result = await pool.query(
        `UPDATE loans SET 
            name = $1, entity = $2, total_amount = $3, installments_count = $4, 
            start_date = $5, due_day = $6, status = $7, updated_by_user_id = $8, 
            updated_at = CURRENT_TIMESTAMP 
         WHERE id = $9`,
        [name, entity, total_amount, installments_count, start_date, due_day, status, updated_by_user_id, id]
    );
    return result.rowCount;
};

const remove = async (id) => {
    const result = await pool.query('DELETE FROM loans WHERE id = $1', [id]);
    return result.rowCount;
};

// Pagos
const findPaymentsByLoanId = async (loanId) => {
    const { rows } = await pool.query(`
        SELECT lp.*, u1.name as created_by_name, u2.name as assigned_to_name
        FROM loan_payments lp
        JOIN users u1 ON lp.created_by_user_id = u1.id
        JOIN users u2 ON lp.assigned_to_user_id = u2.id
        WHERE lp.loan_id = $1
        ORDER BY lp.payment_date DESC, lp.created_at DESC
    `, [loanId]);
    return rows;
};

const createPayment = async (paymentData) => {
    const { loan_id, installment_number, payment_date, amount, created_by_user_id, assigned_to_user_id, payment_method, comment } = paymentData;
    const { rows } = await pool.query(
        `INSERT INTO loan_payments (loan_id, installment_number, payment_date, amount, created_by_user_id, assigned_to_user_id, payment_method, comment, updated_by_user_id) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $5) RETURNING id`,
        [loan_id, installment_number, payment_date, amount, created_by_user_id, assigned_to_user_id, payment_method, comment]
    );
    return rows[0].id;
};

const updatePayment = async (id, paymentData) => {
    const { installment_number, payment_date, amount, assigned_to_user_id, payment_method, comment, updated_by_user_id } = paymentData;
    const result = await pool.query(
        `UPDATE loan_payments SET 
            installment_number = $1, payment_date = $2, amount = $3, 
            assigned_to_user_id = $4, payment_method = $5, comment = $6, 
            updated_by_user_id = $7, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $8`,
        [installment_number, payment_date, amount, assigned_to_user_id, payment_method, comment, updated_by_user_id, id]
    );
    return result.rowCount;
};

const removePayment = async (id) => {
    const result = await pool.query('DELETE FROM loan_payments WHERE id = $1', [id]);
    return result.rowCount;
};

const findPaymentById = async (id) => {
    const { rows } = await pool.query('SELECT * FROM loan_payments WHERE id = $1', [id]);
    return rows[0];
};

module.exports = {
    findAll,
    findById,
    create,
    update,
    remove,
    findPaymentsByLoanId,
    createPayment,
    updatePayment,
    removePayment,
    findPaymentById
};
