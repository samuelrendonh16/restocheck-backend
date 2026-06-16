const rolModel = require('../models/rol.model');

/**
 * GET /api/roles/:empresaId
 */
async function getRoles(req, res, next) {
    try {
        const { empresaId } = req.params;

        console.log('📥 Listando roles - empresa:', empresaId);

        const roles = await rolModel.getRoles(parseInt(empresaId));

        res.json({
            success: true,
            data: roles
        });

    } catch (error) {
        console.log('❌ Error:', error.message);
        next(error);
    }
}

/**
 * GET /api/roles/:empresaId/matriz
 */
async function getMatriz(req, res, next) {
    try {
        const { empresaId } = req.params;

        console.log('📥 Obteniendo matriz de permisos - empresa:', empresaId);

        const matriz = await rolModel.getMatrizPermisos(parseInt(empresaId));

        res.json({
            success: true,
            data: matriz
        });

    } catch (error) {
        console.log('❌ Error:', error.message);
        next(error);
    }
}

/**
 * PUT /api/roles/:rolId/permiso/:permisoId
 */
async function actualizarPermiso(req, res, next) {
    try {
        const { rolId, permisoId } = req.params;
        const { habilitado } = req.body;

        console.log('📥 Actualizando permiso:', { rolId, permisoId, habilitado });

        await rolModel.actualizarPermisoRol(
            parseInt(rolId),
            parseInt(permisoId),
            habilitado
        );

        console.log('✅ Permiso actualizado');

        res.json({
            success: true,
            message: 'Permiso actualizado'
        });

    } catch (error) {
        console.log('❌ Error:', error.message);
        next(error);
    }
}

module.exports = {
    getRoles,
    getMatriz,
    actualizarPermiso
};
