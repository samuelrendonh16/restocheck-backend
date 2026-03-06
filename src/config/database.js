/**
 * CONFIGURACIÓN DE BASE DE DATOS
 * Maneja la conexión a SQL Server usando pool de conexiones
 */

const sql = require('mssql');

// Configuración desde variables de entorno
const dbConfig = {
    server: process.env.DB_SERVER,
    port: parseInt(process.env.DB_PORT),
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true'
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

// Variable para almacenar el pool de conexiones
let pool = null;

/**
 * Conectar a la base de datos
 * Usa patrón Singleton: solo crea UNA conexión
 */
async function connectDB() {
    try {
        if (pool) {
            return pool;
        }

        console.log('🔌 Conectando a SQL Server...');
        pool = await sql.connect(dbConfig);
        console.log('✅ Conexión a base de datos establecida');
        console.log(`   📁 Base de datos: ${process.env.DB_DATABASE}`);
        
        return pool;
    } catch (error) {
        console.error('❌ Error conectando a la base de datos:', error.message);
        throw error;
    }
}

/**
 * Obtener el pool de conexiones existente
 */
function getPool() {
    if (!pool) {
        throw new Error('Base de datos no conectada. Llama a connectDB() primero.');
    }
    return pool;
}

/**
 * Cerrar conexión a la base de datos
 */
async function closeDB() {
    if (pool) {
        await pool.close();
        pool = null;
        console.log('🔌 Conexión a base de datos cerrada');
    }
}

module.exports = {
    connectDB,
    getPool,
    closeDB,
    sql
};