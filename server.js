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
    // Iniciar servidor HTTP PRIMERO (no depende de la BD)
    app.listen(PORT, () => {
        console.log('');
        console.log('╔════════════════════════════════════════════════════╗');
        console.log('║      🍽️  RESTOCHECK API - SERVIDOR INICIADO        ║');
        console.log('╠════════════════════════════════════════════════════╣');
        console.log(`║  🌐 Puerto: ${String(PORT).padEnd(39)}║`);
        console.log(`║  📁 Entorno: ${(process.env.NODE_ENV || 'development').padEnd(30)}║`);
        console.log('╚════════════════════════════════════════════════════╝');
        console.log('');
    });

    // Intentar conectar a la BD (sin tumbar el servidor si falla)
    try {
        await connectDB();
    } catch (error) {
        console.error('⚠️  No se pudo conectar a la base de datos:', error.message);
        console.error('   El servidor sigue activo. Las rutas que usan BD fallarán hasta que se configure.');
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