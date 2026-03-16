const MonthModel = require('../models/monthModel');

const getAllMonths = async (req, res) => {
    try {
        const months = await MonthModel.findAll();
        res.json(months);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener periodos mensuales' });
    }
};

const getDashboard = async (req, res) => {
    try {
        const { month, year } = req.query;
        if (!month || !year) {
            return res.status(400).json({ error: 'month y year son requeridos como query params' });
        }

        const dashboardData = await MonthModel.getDashboardInfo(month, year);
        if (!dashboardData) {
            return res.status(404).json({ error: 'El mes especificado no existe o no ha sido aperturado' });
        }

        res.json(dashboardData);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener información financiera del dashboard' });
    }
};

const createMonth = async (req, res) => {
    try {
        const { month, year, copyFromPreviousId } = req.body;
        if (!month || !year) {
            return res.status(400).json({ error: 'month y year son obligatorios' });
        }

        const existing = await MonthModel.findByMonthAndYear(month, year);
        if (existing) {
            return res.status(400).json({ error: 'Este mes ya se encuentra configurado en el historial' });
        }

        const id = await MonthModel.createMonth(month, year, copyFromPreviousId);
        res.status(201).json({ message: 'Periodo mensual aperturado con éxito', id });
    } catch (error) {
        res.status(500).json({ error: 'Error al crear el mes' });
    }
};

const updateStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        if (!['open', 'closed'].includes(status)) {
            return res.status(400).json({ error: 'Estado inválido' });
        }

        const updated = await MonthModel.updateStatus(id, status);
        if (!updated) {
            return res.status(404).json({ error: 'Mes no encontrado' });
        }

        res.json({ message: `Configuración del periodo cambiada a status: ${status}` });
    } catch (error) {
        res.status(500).json({ error: 'Error al cambiar estado del periodo mensual' });
    }
};

module.exports = { getAllMonths, getDashboard, createMonth, updateStatus };
