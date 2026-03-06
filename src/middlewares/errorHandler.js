/**
 * MIDDLEWARE DE MANEJO DE ERRORES
 * Captura todos los errores en un solo lugar
 */

/**
 * Manejador principal de errores
 */
function errorHandler(err, req, res, next) {
    console.error('❌ Error:', {
        message: err.message,
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
    });

    const statusCode = err.statusCode || 500;

    res.status(statusCode).json({
        success: false,
        error: {
            message: err.message || 'Error interno del servidor',
            ...(process.env.NODE_ENV === 'development' && {
                stack: err.stack
            })
        }
    });
}

/**
 * Manejador de rutas no encontradas (404)
 */
function notFoundHandler(req, res, next) {
    const error = new Error(`Ruta no encontrada: ${req.method} ${req.originalUrl}`);
    error.statusCode = 404;
    next(error);
}

module.exports = {
    errorHandler,
    notFoundHandler
};