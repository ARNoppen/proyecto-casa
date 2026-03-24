const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

// Crear conexión sin DB fija primero para crearla si no existe
const createDbIfNotExists = async () => {
    try {
        const rootConnection = await mysql.createConnection({
            host: process.env.MYSQLHOST || process.env.DB_HOST || '127.0.0.1',
            port: Number(process.env.MYSQLPORT || process.env.DB_PORT) || 3307,
            user: process.env.MYSQLUSER || process.env.DB_USER,
            password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD,
        });

        const dbName = process.env.DB_NAME || process.env.MYSQLDATABASE || 'proyecto_casa_db';
        await rootConnection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
        await rootConnection.end();
    } catch (error) {
        console.warn('⚠️ No se pudo verificar/crear la DB automáticamente. Si ya existe, esto no es un problema.');
    }
};

let pool;

const initializeDatabase = async () => {
    try {
        await createDbIfNotExists();

        pool = mysql.createPool({
            host: process.env.MYSQLHOST || process.env.DB_HOST || '127.0.0.1',
            port: Number(process.env.MYSQLPORT || process.env.DB_PORT) || 3307,
            user: process.env.MYSQLUSER || process.env.DB_USER,
            password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD,
            database: process.env.DB_NAME || process.env.MYSQLDATABASE || 'proyecto_casa_db',
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
            multipleStatements: true, // Crítico para correr init.sql de golpe
            dateStrings: true // Evita que mysql2 convierta DATETIME a Date objects de JS (mantiene el string literal)
        });

        const actualDbName = process.env.DB_NAME || process.env.MYSQLDATABASE || 'proyecto_casa_db';
        console.log(`🔌 [DB INFO] -> host: ${process.env.MYSQLHOST || process.env.DB_HOST || '127.0.0.1'} | db: ${actualDbName}`);
        
        // Comprobar si las tablas existen
        try {
            await pool.query('SELECT 1 FROM users LIMIT 1');
            console.log('✅ Base de datos verificada y lista.');
        } catch (error) {
            if (error.code === 'ER_NO_SUCH_TABLE') {
                console.log('⚠️ Tablas no encontradas. Ejecutando init.sql automáticamente...');
                
                const sqlScriptPath = path.join(__dirname, '..', 'db', 'init.sql');
                const sqlScript = fs.readFileSync(sqlScriptPath, 'utf8');
                
                const connection = await pool.getConnection();
                try {
                    await connection.query(sqlScript);
                    console.log('✅ Base de datos inicializada exitosamente desde init.sql!');
                } finally {
                    connection.release();
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

// Exportamos un Proxy hacia pool en caso de que sea importado rápido por otro archivo
module.exports = new Proxy({}, {
    get: (target, prop) => {
        if (!pool) throw new Error('El Pool de base de datos aún no se ha inicializado.');
        return pool[prop];
    }
});
