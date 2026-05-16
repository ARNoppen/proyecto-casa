const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// Middlewares globales y de Seguridad

// 1. Cabeceras de seguridad HTTP
app.use(helmet());

// 2. Configuración de CORS
const corsOptions = {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    optionsSuccessStatus: 200 // para compatibilidad con navegadores antiguos
};
app.use(cors(corsOptions));

// 3. Rate Limiting: Limitar peticiones para prevenir ataques de fuerza bruta
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // Límite de 100 peticiones por IP
    message: { error: 'Demasiadas peticiones desde esta IP. Intenta nuevamente en 15 minutos.' }
});
// Aplicar rate limiting solo a las rutas de la API
app.use('/api', apiLimiter);

// 4. Parseo de body
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
app.use('/api/concepts', require('./src/routes/conceptRoutes'));
app.use('/api/loans', require('./src/routes/loanRoutes'));


const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 Servidor backend corriendo en http://localhost:${PORT}`);
});
