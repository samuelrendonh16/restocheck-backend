/**
 * PUNTO DE ENTRADA - RESTOCHECK BACKEND
 */

// Cargar variables de entorno PRIMERO
require('dotenv').config();

const app = require('./src/app');
const { connectDB } = require('./src/config/database');

const PORT = process.env.PORT || 3000;

/**
 * Iniciar el servidor
 */
async function startServer() {
    try {
        // Conectar a la base de datos
        await connectDB();

        // Iniciar servidor HTTP
        app.listen(PORT, () => {
            console.log('');
            console.log('╔════════════════════════════════════════════════════╗');
            console.log('║      🍽️  RESTOCHECK API - SERVIDOR INICIADO        ║');
            console.log('╠════════════════════════════════════════════════════╣');
            console.log(`║  🌐 URL: http://localhost:${PORT}                    ║`);
            console.log(`║  📁 Entorno: ${(process.env.NODE_ENV || 'development').padEnd(30)}║`);
            console.log('╚════════════════════════════════════════════════════╝');
            console.log('');
            console.log('Endpoints disponibles:');
            console.log(`  GET http://localhost:${PORT}/api/health`);
            console.log(`  GET http://localhost:${PORT}/api/`);
            console.log('');
        });

    } catch (error) {
        console.error('❌ Error fatal al iniciar:', error.message);
        process.exit(1);
    }
}

// Cerrar conexión al presionar Ctrl+C
process.on('SIGINT', async () => {
    console.log('\n🛑 Cerrando servidor...');
    const { closeDB } = require('./src/config/database');
    await closeDB();
    process.exit(0);
});

// ¡Iniciar!
startServer();