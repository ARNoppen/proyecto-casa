const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middlewares globales
app.use(cors());
app.use(express.json());

// Probar que el servidor vive
app.get('/', (req, res) => {
    res.json({ message: 'API de Finanzas Familiares (Proyecto Casa) funcionando 🟢' });
});

// Importación de rutas
app.use('/api/auth', require('./src/routes/authRoutes'));
app.use('/api/users', require('./src/routes/userRoutes'));
app.use('/api/months', require('./src/routes/monthRoutes'));
app.use('/api/expenses', require('./src/routes/expenseRoutes'));

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 Servidor backend corriendo en http://localhost:${PORT}`);
});
