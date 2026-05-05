const fs = require('fs');
const path = require('path');
const { Pool, types } = require('pg');
require('dotenv').config();

// Parche para que PostgreSQL (pg) devuelva los TIMESTAMP como strings (igual que mysql2 dateStrings: true)
// 1114 es el OID de 'timestamp' sin zona horaria
types.setTypeParser(1114, str => str);
// 1184 es el OID de 'timestamptz' por las dudas
types.setTypeParser(1184, str => str);

let pool;

const initializeDatabase = async () => {
    try {
        if (!process.env.DATABASE_URL) {
            console.error('❌ FATAL: DATABASE_URL no está definida. Revisa tu .env');
            return;
        }

        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        });

        console.log('🔌 [DB INFO] -> Conectando a PostgreSQL (Supabase)');
        
        // Comprobar si las tablas existen
        try {
            await pool.query('SELECT 1 FROM users LIMIT 1');
            console.log('✅ Base de datos verificada y lista.');
        } catch (error) {
            // Código de error de Postgres para tabla no existe es 42P01
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

initializeDatabase();

// Exportamos un Proxy hacia pool
module.exports = new Proxy({}, {
    get: (target, prop) => {
        if (!pool) throw new Error('El Pool de base de datos aún no se ha inicializado.');
        return pool[prop];
    }
});
