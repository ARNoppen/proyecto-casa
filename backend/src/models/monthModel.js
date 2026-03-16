const pool = require('../config/db');

const findAll = async () => {
    const [rows] = await pool.query('SELECT id, month, year, total_budget, status, created_at FROM monthly_configs ORDER BY year DESC, month DESC');
    return rows;
};

const findByMonthAndYear = async (month, year) => {
    const [rows] = await pool.query('SELECT * FROM monthly_configs WHERE month = ? AND year = ?', [month, year]);
    return rows[0];
};

const findById = async (id) => {
    const [rows] = await pool.query('SELECT * FROM monthly_configs WHERE id = ?', [id]);
    return rows[0];
};

const getDashboardInfo = async (month, year) => {
    const config = await findByMonthAndYear(month, year);
    if (!config) return null;

    // Obtener el progreso de cada integrante cruzando gastos por `assigned_to_user_id`
    // Priorizamos el default_contribution global del usuario para asegurar consistencia
    const [members] = await pool.query(`
        SELECT 
            u.id as assigned_to_user_id,
            u.name,
            u.default_contribution as expected_contribution,
            COALESCE(e_sum.total_amount, 0) as accumulated
        FROM users u
        LEFT JOIN (
            SELECT assigned_to_user_id, SUM(amount) as total_amount
            FROM expenses
            WHERE monthly_config_id = ?
            GROUP BY assigned_to_user_id
        ) e_sum ON u.id = e_sum.assigned_to_user_id
        WHERE u.is_active = TRUE OR e_sum.total_amount IS NOT NULL
        ORDER BY accumulated DESC, u.name ASC
    `, [config.id]);

    const total_expenses = members.reduce((sum, member) => sum + Math.abs(parseFloat(member.accumulated)), 0);
    const total_budget = parseFloat(config.total_budget);

    const resumen_general = {
        status: config.status,
        total_budget: total_budget,
        total_expenses: total_expenses,
        remainingOverall: total_budget - total_expenses
    };

    const progreso_integrantes = members.map(m => {
        const meta = parseFloat(m.expected_contribution);
        const acumulado = Math.abs(parseFloat(m.accumulated));
        return {
            assigned_to_user_id: m.assigned_to_user_id,
            name: m.name,
            expected_contribution: meta,
            accumulated: acumulado,
            remaining: meta - acumulado,
            progress_percentage: meta > 0 ? ((acumulado / meta) * 100).toFixed(1) : 0
        };
    });

    const [recent_expenses] = await pool.query(`
        SELECT e.id, e.amount, e.description, e.date, e.created_at, u1.name as created_by_name, u2.name as assigned_to_name
        FROM expenses e
        JOIN users u1 ON e.created_by_user_id = u1.id
        JOIN users u2 ON e.assigned_to_user_id = u2.id
        WHERE e.monthly_config_id = ?
        ORDER BY e.date DESC, e.created_at DESC
        LIMIT 10
    `, [config.id]);

    return { 
        config_id: config.id, 
        resumen_general, 
        progreso_integrantes, 
        movimientos_recientes: recent_expenses 
    };
};

const createMonth = async (month, year, copyFromPreviousId) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        let total_budget = 0;
        let membersToInsert = [];

        if (copyFromPreviousId) {
            const [oldConfig] = await connection.query('SELECT total_budget FROM monthly_configs WHERE id = ?', [copyFromPreviousId]);
            if(oldConfig.length > 0) total_budget = oldConfig[0].total_budget;
            
            const [oldMembers] = await connection.query('SELECT user_id, expected_contribution, is_active_for_month FROM monthly_member_configs WHERE monthly_config_id = ?', [copyFromPreviousId]);
            membersToInsert = oldMembers;
        } else {
            const [activeUsers] = await connection.query('SELECT id as user_id, default_contribution as expected_contribution, 1 as is_active_for_month FROM users WHERE is_active = TRUE');
            membersToInsert = activeUsers;
            total_budget = activeUsers.reduce((sum, u) => sum + parseFloat(u.expected_contribution), 0);
        }

        const [result] = await connection.query(
            'INSERT INTO monthly_configs (month, year, total_budget, status) VALUES (?, ?, ?, ?)',
            [month, year, total_budget, 'open']
        );
        const newMonthId = result.insertId;

        for (const member of membersToInsert) {
            await connection.query(
                'INSERT INTO monthly_member_configs (monthly_config_id, user_id, expected_contribution, is_active_for_month) VALUES (?, ?, ?, ?)',
                [newMonthId, member.user_id, member.expected_contribution, member.is_active_for_month]
            );
        }

        await connection.commit();
        return newMonthId;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

const updateStatus = async (id, status) => {
    const [result] = await pool.query('UPDATE monthly_configs SET status = ? WHERE id = ?', [status, id]);
    return result.affectedRows;
};

module.exports = {
    findAll,
    findByMonthAndYear,
    findById,
    getDashboardInfo,
    createMonth,
    updateStatus
};
