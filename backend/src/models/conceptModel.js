const pool = require('../config/db');

const findAll = async (includeInactive = false) => {
    const query = includeInactive 
        ? 'SELECT * FROM expense_concepts ORDER BY name ASC'
        : 'SELECT * FROM expense_concepts WHERE active = TRUE ORDER BY name ASC';
    const { rows } = await pool.query(query);
    return rows;
};

const findById = async (id) => {
    const { rows } = await pool.query('SELECT * FROM expense_concepts WHERE id = $1', [id]);
    return rows[0];
};

const findByName = async (name) => {
    // Normalizamos el nombre para búsqueda (trim y minúsculas)
    const normalizedName = name.trim().toLowerCase();
    const { rows } = await pool.query(
        'SELECT * FROM expense_concepts WHERE LOWER(TRIM(name)) = $1',
        [normalizedName]
    );
    return rows[0];
};

const create = async (name, createdBy) => {
    const { rows } = await pool.query(
        'INSERT INTO expense_concepts (name, created_by) VALUES ($1, $2) RETURNING *',
        [name.trim(), createdBy]
    );
    return rows[0];
};

const update = async (id, { name, active }) => {
    const { rows } = await pool.query(
        'UPDATE expense_concepts SET name = COALESCE($1, name), active = COALESCE($2, active) WHERE id = $3 RETURNING *',
        [name ? name.trim() : null, active, id]
    );
    return rows[0];
};

const remove = async (id) => {
    const { rows } = await pool.query('DELETE FROM expense_concepts WHERE id = $1 RETURNING *', [id]);
    return rows[0];
};

module.exports = {
    findAll,
    findById,
    findByName,
    create,
    update,
    remove
};
