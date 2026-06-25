/**
 * MIDDLEWARE DE PERMISOS (parche temporal - no es seguridad completa)
 * Valida que el rol tenga el permiso requerido, consultando la BD.
 */

const { getPool } = require('../config/database');

/**
 * Verifica si un rol tiene un permiso específico habilitado
 */
async function rolTienePermiso(rolId, codigoPermiso) {
    const pool = getPool();
    const result = await pool.query(`
        SELECT COUNT(*) AS total
        FROM RolPermiso rp
        INNER JOIN Permiso p ON rp.PermisoID = p.PermisoID
        WHERE rp.RolID = $1
          AND p.Codigo = $2
          AND rp.Habilitado = TRUE
          AND p.Activo = TRUE
    `, [rolId, codigoPermiso]);

    return parseInt(result.rows[0].total) > 0;
}

/**
 * Factory: crea un middleware que exige un permiso específico.
 * El frontend debe enviar 'rolId' en el body de la petición.
 */
function requierePermiso(codigoPermiso) {
    return async (req, res, next) => {
        try {
            // El rolId viene del body (limitación del parche)
            const rolId = req.body.rolId || req.query.rolId;

            if (!rolId) {
                return res.status(403).json({
                    success: false,
                    error: { message: 'No se pudo verificar permisos (rolId ausente)' }
                });
            }

            const tienePermiso = await rolTienePermiso(parseInt(rolId), codigoPermiso);

            if (!tienePermiso) {
                return res.status(403).json({
                    success: false,
                    error: { message: 'No tienes permiso para realizar esta acción' }
                });
            }

            // Tiene permiso, continuar
            next();

        } catch (error) {
            next(error);
        }
    };
}

module.exports = {
    requierePermiso,
    rolTienePermiso
};
