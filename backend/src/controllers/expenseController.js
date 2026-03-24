const ExpenseModel = require('../models/expenseModel');
const MonthModel = require('../models/monthModel');

const resolveConfigId = async (month, year) => {
    return await MonthModel.findByMonthAndYear(month, year);
};

const getExpenses = async (req, res) => {
    try {
        const { month, year } = req.query;
        if (!month || !year) {
            return res.status(400).json({ error: 'month y year son parámetros requeridos' });
        }

        const config = await resolveConfigId(month, year);
        if (!config) {
            return res.json([]); 
        }

        const expenses = await ExpenseModel.findAllByMonth(config.id);
        res.json(expenses);
    } catch (error) {
        res.status(500).json({ error: 'Error al listar el historial de gastos' });
    }
};

const createExpense = async (req, res) => {
    try {
        const { amount, description, date, assigned_to_user_id, month, year } = req.body;

        if (!amount || !description || !date || !assigned_to_user_id || !month || !year) {
            return res.status(400).json({ error: 'Faltan campos obligatorios' });
        }

        const config = await resolveConfigId(month, year);
        if (!config) return res.status(400).json({ error: 'El periodo mensual no ha sido aperturado' });
        if (config.status !== 'open') return res.status(403).json({ error: 'Periodo cerrado. No se admiten nuevos tickets de gasto.' });

        const expenseData = {
            created_by_user_id: req.user.id, // Seguridad primaria: inyectado por Token, jamás por body.
            assigned_to_user_id,
            monthly_config_id: config.id,
            date,
            amount: -Math.abs(parseFloat(amount)),
            description
        };

        const id = await ExpenseModel.create(expenseData);
        res.status(201).json({ message: 'Gasto registrado exitosamente', id });
    } catch (error) {
        res.status(500).json({ error: 'Error al registrar el ticket' });
    }
};

const updateExpense = async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, description, date, assigned_to_user_id } = req.body;

        const expense = await ExpenseModel.findById(id);
        if (!expense) return res.status(404).json({ error: 'Gasto no encontrado' });

        const config = await MonthModel.findById(expense.monthly_config_id);
        if (config.status !== 'open') return res.status(403).json({ error: 'Periodo cerrado. Edición bloqueada.' });

        // Validador de Autoría vs God Mode (Admin)
        if (req.user.role !== 'admin' && expense.created_by_user_id !== req.user.id) {
            return res.status(403).json({ error: 'Permiso denegado. Solo puedes editar los gastos que tú hayas cargado físicamente.' });
        }

        await ExpenseModel.update(id, { assigned_to_user_id, date, amount: -Math.abs(parseFloat(amount)), description });
        res.json({ message: 'Gasto actualizado correctamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error interno al editar el ticket' });
    }
};

const deleteExpense = async (req, res) => {
    try {
        const { id } = req.params;

        const expense = await ExpenseModel.findById(id);
        if (!expense) return res.status(404).json({ error: 'Gasto no encontrado' });

        const config = await MonthModel.findById(expense.monthly_config_id);
        if (config.status !== 'open') return res.status(403).json({ error: 'Periodo cerrado. Eliminación bloqueada.' });

        // Validador de Autoría vs God Mode (Admin)
        if (req.user.role !== 'admin' && expense.created_by_user_id !== req.user.id) {
            return res.status(403).json({ error: 'Permiso denegado. Solo puedes eliminar los tickets que tú hayas registrado.' });
        }

        await ExpenseModel.remove(id);
        res.json({ message: 'Gasto eliminado permanentemente (Borrado físico V1)' });
    } catch (error) {
        res.status(500).json({ error: 'Error interno al intentar destruir el registro' });
    }
};

const bulkCreateExpenses = async (req, res) => {
    try {
        const { movements } = req.body; // Array de { amount, description, date, assigned_to_user_id, month, year }

        if (!movements || !Array.isArray(movements)) {
            return res.status(400).json({ error: 'Se requiere un array de movimientos' });
        }

        const results = {
            total: movements.length,
            success: 0,
            failed: 0,
            monthsCreated: 0
        };

        // Caché local de meses para evitar consultas redundantes en el loop
        const monthCache = {};

        for (const mov of movements) {
            const { amount, description, date, assigned_to_user_id, month, year } = mov;

            try {
                const cacheKey = `${month}-${year}`;
                let configId = monthCache[cacheKey];

                if (!configId) {
                    let config = await MonthModel.findByMonthAndYear(month, year);
                    if (!config) {
                        // Abrir mes automáticamente si no existe
                        configId = await MonthModel.createMonth(month, year);
                        results.monthsCreated++;
                    } else {
                        configId = config.id;
                    }
                    monthCache[cacheKey] = configId;
                }

                const expenseData = {
                    created_by_user_id: req.user.id,
                    assigned_to_user_id,
                    monthly_config_id: configId,
                    date,
                    amount: -Math.abs(parseFloat(amount)),
                    description
                };

                await ExpenseModel.create(expenseData);
                results.success++;
            } catch (err) {
                console.error('Error en fila de importación:', err);
                results.failed++;
            }
        }

        res.json({
            message: 'Proceso de importación finalizado',
            results
        });
    } catch (error) {
        console.error('Error en bulk import:', error);
        res.status(500).json({ error: 'Error general en la importación masiva' });
    }
};

module.exports = { getExpenses, createExpense, updateExpense, deleteExpense, bulkCreateExpenses };
