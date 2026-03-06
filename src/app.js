/**
 * CONFIGURACIÓN DE EXPRESS
 */

const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');

const app = express();

// ============================================
// MIDDLEWARES
// ============================================

// CORS - Permitir conexiones desde Angular
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:4200',
    credentials: true
}));

// Parsear JSON en el body de las peticiones
app.use(express.json());

// Parsear datos de formularios
app.use(express.urlencoded({ extended: true }));

// Logger simple (solo en desarrollo)
if (process.env.NODE_ENV === 'development') {
    app.use((req, res, next) => {
        console.log(`📨 ${req.method} ${req.path}`);
        next();
    });
}

// ============================================
// RUTAS
// ============================================

// Todas las rutas bajo /api
app.use('/api', routes);

// ============================================
// MANEJO DE ERRORES
// ============================================

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;