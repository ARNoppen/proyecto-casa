const bcrypt = require('bcrypt');
const UserModel = require('../models/userModel');

const getAllUsers = async (req, res) => {
    try {
        const users = await UserModel.findAll();
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener usuarios' });
    }
};

const createUser = async (req, res) => {
    try {
        const { name, email, password, role, default_contribution } = req.body;
        
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Nombre, email y contraseña son requeridos' });
        }

        const existingUser = await UserModel.findByEmail(email);
        if (existingUser) {
            return res.status(400).json({ error: 'El email ya está registrado' });
        }

        const password_hash = await bcrypt.hash(password, 10);
        
        const newUserId = await UserModel.create({
            name, email, password_hash, role, default_contribution
        });

        res.status(201).json({ message: 'Usuario creado exitosamente', id: newUserId });
    } catch (error) {
        res.status(500).json({ error: 'Error al crear usuario' });
    }
};

const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, role, is_active, default_contribution } = req.body;
        
        const existingUser = await UserModel.findById(id);
        if (!existingUser) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        await UserModel.update(id, {
            name, email, role, is_active, default_contribution
        });

        res.json({ message: 'Usuario actualizado correctamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar usuario' });
    }
};

module.exports = { getAllUsers, createUser, updateUser };
