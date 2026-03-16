const pool = require('../config/db');

const findAllByMonth = async (monthlyConfigId) => {
    const [rows] = await pool.query(`
        SELECT e.*, u1.name as created_by_name, u2.name as assigned_to_name
        FROM expenses e
        JOIN users u1 ON e.created_by_user_id = u1.id
        JOIN users u2 ON e.assigned_to_user_id = u2.id
        WHERE e.monthly_config_id = ?
        ORDER BY e.date DESC, e.created_at DESC
    `, [monthlyConfigId]);
    return rows;
};

const findById = async (id) => {
    const [rows] = await pool.query('SELECT * FROM expenses WHERE id = ?', [id]);
    return rows[0];
};

const create = async (expenseData) => {
    const { created_by_user_id, assigned_to_user_id, monthly_config_id, date, amount, description } = expenseData;
    const [result] = await pool.query(
        'INSERT INTO expenses (created_by_user_id, assigned_to_user_id, monthly_config_id, date, amount, description) VALUES (?, ?, ?, ?, ?, ?)',
        [created_by_user_id, assigned_to_user_id, monthly_config_id, date, amount, description]
    );
    return result.insertId;
};

const update = async (id, expenseData) => {
    const { assigned_to_user_id, date, amount, description } = expenseData;
    const [result] = await pool.query(
        'UPDATE expenses SET assigned_to_user_id = ?, date = ?, amount = ?, description = ? WHERE id = ?',
        [assigned_to_user_id, date, amount, description, id]
    );
    return result.affectedRows;
};

const remove = async (id) => {
    const [result] = await pool.query('DELETE FROM expenses WHERE id = ?', [id]);
    return result.affectedRows;
};

module.exports = {
    findAllByMonth,
    findById,
    create,
    update,
    remove
};
