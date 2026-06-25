/**
 * CONFIGURACIÓN DE BASE DE DATOS - PostgreSQL
 */

const { Pool } = require('pg');

// Railway provee DATABASE_URL automáticamente
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
    max: 10,
    idleTimeoutMillis: 30000
});

let connected = false;

/**
 * Conectar a la base de datos (verifica conexión)
 */
async function connectDB() {
    try {
        const client = await pool.connect();
        console.log('✅ Conexión a PostgreSQL establecida');
        client.release();
        connected = true;
        return pool;
    } catch (error) {
        console.error('❌ Error conectando a PostgreSQL:', error.message);
        throw error;
    }
}

/**
 * Obtener el pool de conexiones
 */
function getPool() {
    return pool;
}

/**
 * Cerrar conexión
 */
async function closeDB() {
    await pool.end();
    console.log('🔌 Conexión cerrada');
}

module.exports = {
    connectDB,
    getPool,
    closeDB
};
