/**
 * RUTAS PRINCIPALES DE LA API
 */

const express = require('express');
const router = express.Router();

// Importar rutas de módulos
const authRoutes = require('./auth.routes');
const tareasRoutes = require('./tareas.routes');

/**
 * GET /api/health
 */
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'RestoCheck API funcionando correctamente',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
    });
});

/**
 * GET /api/
 */
router.get('/', (req, res) => {
    res.json({
        success: true,
        data: {
            name: 'RestoCheck API',
            version: '1.0.0',
            description: 'Sistema de auditorías y control de calidad para restaurantes'
        }
    });
});

// ============================================
// MONTAR RUTAS DE MÓDULOS
// ============================================

router.use('/auth', authRoutes);
router.use('/tareas', tareasRoutes);

module.exports = router;