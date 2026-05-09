const ConceptModel = require('../models/conceptModel');

const getConcepts = async (req, res) => {
    try {
        const includeInactive = req.query.includeInactive === 'true';
        const concepts = await ConceptModel.findAll(includeInactive);
        res.json(concepts);
    } catch (error) {
        console.error('Error al obtener conceptos:', error);
        res.status(500).json({ error: 'Error al obtener la lista de conceptos' });
    }
};

const createConcept = async (req, res) => {
    try {
        const { name } = req.body;
        if (!name || name.trim() === '') {
            return res.status(400).json({ error: 'El nombre del concepto es obligatorio' });
        }

        // Validar duplicados (insensible a mayúsculas/espacios)
        const existing = await ConceptModel.findByName(name);
        if (existing) {
            if (existing.active) {
                return res.status(400).json({ error: 'Ya existe un concepto con ese nombre' });
            } else {
                // Si existe pero está inactivo, lo reactivamos
                const updated = await ConceptModel.update(existing.id, { active: true });
                return res.status(201).json(updated);
            }
        }

        const newConcept = await ConceptModel.create(name, req.user.id);
        res.status(201).json(newConcept);
    } catch (error) {
        console.error('Error al crear concepto:', error);
        res.status(500).json({ error: 'Error interno al crear el concepto' });
    }
};

const updateConcept = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, active } = req.body;

        const existing = await ConceptModel.findById(id);
        if (!existing) return res.status(404).json({ error: 'Concepto no encontrado' });

        // Si se intenta renombrar, validar duplicados
        if (name && name.trim().toLowerCase() !== existing.name.toLowerCase()) {
            const duplicate = await ConceptModel.findByName(name);
            if (duplicate) return res.status(400).json({ error: 'Ya existe otro concepto con ese nombre' });
        }

        const updated = await ConceptModel.update(id, { name, active });
        res.json(updated);
    } catch (error) {
        console.error('Error al actualizar concepto:', error);
        res.status(500).json({ error: 'Error interno al actualizar el concepto' });
    }
};

const deleteConcept = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await ConceptModel.remove(id);
        if (!deleted) return res.status(404).json({ error: 'Concepto no encontrado' });
        res.json({ message: 'Concepto eliminado físicamente' });
    } catch (error) {
        console.error('Error al eliminar concepto:', error);
        res.status(500).json({ error: 'Error interno al eliminar el concepto' });
    }
};

module.exports = {
    getConcepts,
    createConcept,
    updateConcept,
    deleteConcept
};
