const pool = require('../config/db');

const findByEmail = async (email) => {
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return rows[0];
};

const findById = async (id) => {
    const { rows } = await pool.query('SELECT id, name, email, role, is_active, default_contribution FROM users WHERE id = $1', [id]);
    return rows[0];
};

const findAll = async () => {
    const { rows } = await pool.query('SELECT id, name, email, role, is_active, default_contribution FROM users ORDER BY name ASC');
    return rows;
};

const create = async (user) => {
    const { name, email, password_hash, role, default_contribution } = user;
    const { rows } = await pool.query(
        'INSERT INTO users (name, email, password_hash, role, default_contribution) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [name, email, password_hash, role || 'user', default_contribution || 0.00]
    );
    return rows[0].id;
};

const update = async (id, user) => {
    const { name, email, role, is_active, default_contribution } = user;
    const result = await pool.query(
        'UPDATE users SET name = $1, email = $2, role = $3, is_active = $4, default_contribution = $5 WHERE id = $6',
        [name, email, role, is_active, default_contribution, id]
    );
    return result.rowCount;
};

module.exports = {
    findByEmail,
    findById,
    findAll,
    create,
    update
};
