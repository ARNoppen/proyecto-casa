const pool = require('../config/db');

const findByEmail = async (email) => {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    return rows[0];
};

const findById = async (id) => {
    const [rows] = await pool.query('SELECT id, name, email, role, is_active, default_contribution FROM users WHERE id = ?', [id]);
    return rows[0];
};

const findAll = async () => {
    const [rows] = await pool.query('SELECT id, name, email, role, is_active, default_contribution FROM users ORDER BY name ASC');
    return rows;
};

const create = async (user) => {
    const { name, email, password_hash, role, default_contribution } = user;
    const [result] = await pool.query(
        'INSERT INTO users (name, email, password_hash, role, default_contribution) VALUES (?, ?, ?, ?, ?)',
        [name, email, password_hash, role || 'user', default_contribution || 0.00]
    );
    return result.insertId;
};

const update = async (id, user) => {
    const { name, email, role, is_active, default_contribution } = user;
    const [result] = await pool.query(
        'UPDATE users SET name = ?, email = ?, role = ?, is_active = ?, default_contribution = ? WHERE id = ?',
        [name, email, role, is_active, default_contribution, id]
    );
    return result.affectedRows;
};

module.exports = {
    findByEmail,
    findById,
    findAll,
    create,
    update
};
