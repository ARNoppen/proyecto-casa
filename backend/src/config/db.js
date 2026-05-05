const fs = require('fs');
const path = require('path');
const { Pool, types } = require('pg');
require('dotenv').config();

// Parche para que PostgreSQL (pg) devuelva los TIMESTAMP como strings
types.setTypeParser(1114, str => str);
types.setTypeParser(1184, str => str);

if (!process.env.DATABASE_URL) {
    console.error('❌ FATAL: DATABASE_URL no está definida. Revisa tu .env');
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const initializeDatabase = async () => {
    try {
        console.log('🔌 [DB INFO] -> Conectando a PostgreSQL (Supabase)');
        
        try {
            await pool.query('SELECT 1 FROM users LIMIT 1');
            console.log('✅ Base de datos verificada y lista.');
        } catch (error) {
            if (error.code === '42P01') {
                console.log('⚠️ Tablas no encontradas. Ejecutando schema_postgres.sql automáticamente...');
                
                const sqlScriptPath = path.join(__dirname, '..', 'db', 'schema_postgres.sql');
                const sqlScript = fs.readFileSync(sqlScriptPath, 'utf8');
                
                const client = await pool.connect();
                try {
                    await client.query(sqlScript);
                    console.log('✅ Base de datos inicializada exitosamente desde schema_postgres.sql!');
                } finally {
                    client.release();
                }
            } else {
                throw error;
            }
        }
    } catch (error) {
        console.error('❌ Error general de base de datos:', error);
    }
};

// Se ejecuta en background al arrancar el server
initializeDatabase();

// Exportamos el Pool REAL directamente, sin Proxy.
// pg encolará automáticamente cualquier query si el pool aún se está conectando.
module.exports = pool;
