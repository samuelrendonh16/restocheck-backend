/**
 * RUTAS PRINCIPALES DE LA API
 */

const express = require('express');
const router = express.Router();

// Importar rutas de módulos
const authRoutes = require('./auth.routes');
const tareasRoutes = require('./tareas.routes');
const panelRoutes = require('./panel.routes');
const sedeRoutes = require('./sede.routes');
const usuarioRoutes = require('./usuario.routes');
const rolRoutes = require('./rol.routes');
const plantillaConfigRoutes = require('./plantilla.routes');
const reportesRoutes = require('./reportes.routes');

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
router.use('/panel', panelRoutes);
router.use('/sedes', sedeRoutes);
router.use('/usuarios', usuarioRoutes);
router.use('/roles', rolRoutes);
router.use('/plantillas-config', plantillaConfigRoutes);
router.use('/reportes', reportesRoutes);

module.exports = router;