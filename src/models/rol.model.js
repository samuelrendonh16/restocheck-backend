const { getPool } = require('../config/database');

/**
 * Listar roles de una empresa
 */
async function getRoles(empresaId) {
    const pool = getPool();
    const result = await pool.query(`
        SELECT
            RolID AS "id",
            Codigo AS "codigo",
            Nombre AS "nombre",
            Descripcion AS "descripcion",
            RequiereSede AS "requiereSede",
            AccesoGlobal AS "accesoGlobal",
            Orden AS "orden"
        FROM Rol
        WHERE (EmpresaID = $1 OR EmpresaID IS NULL) AND Activo = TRUE
        ORDER BY Orden
    `, [empresaId]);
    return result.rows;
}

/**
 * Obtener la matriz completa de roles y permisos
 */
async function getMatrizPermisos(empresaId) {
    const pool = getPool();

    // 1. Roles
    const rolesResult = await pool.query(`
        SELECT RolID AS "id", Codigo AS "codigo", Nombre AS "nombre", Orden AS "orden"
        FROM Rol
        WHERE (EmpresaID = $1 OR EmpresaID IS NULL) AND Activo = TRUE
        ORDER BY Orden
    `, [empresaId]);

    // 2. Permisos
    const permisosResult = await pool.query(`
        SELECT PermisoID AS "id", Codigo AS "codigo", Nombre AS "nombre",
               Descripcion AS "descripcion", Modulo AS "modulo", Orden AS "orden"
        FROM Permiso
        WHERE Activo = TRUE
        ORDER BY Orden
    `);

    // 3. Asignaciones
    const asignacionesResult = await pool.query(`
        SELECT RolID AS "rolId", PermisoID AS "permisoId", Habilitado AS "habilitado"
        FROM RolPermiso
    `);

    return {
        roles: rolesResult.rows,
        permisos: permisosResult.rows,
        asignaciones: asignacionesResult.rows
    };
}

/**
 * Actualizar un permiso de un rol (habilitar/deshabilitar)
 */
async function actualizarPermisoRol(rolId, permisoId, habilitado) {
    const pool = getPool();

    // Verificar si ya existe la asignación
    const existeResult = await pool.query(`
        SELECT COUNT(*) AS total
        FROM RolPermiso
        WHERE RolID = $1 AND PermisoID = $2
    `, [rolId, permisoId]);

    if (parseInt(existeResult.rows[0].total) > 0) {
        // Actualizar
        await pool.query(`
            UPDATE RolPermiso
            SET Habilitado = $3
            WHERE RolID = $1 AND PermisoID = $2
        `, [rolId, permisoId, habilitado]);
    } else {
        // Insertar
        await pool.query(`
            INSERT INTO RolPermiso (RolID, PermisoID, Habilitado)
            VALUES ($1, $2, $3)
        `, [rolId, permisoId, habilitado]);
    }

    return { success: true };
}

/**
 * Verificar si un rol tiene un permiso habilitado
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

module.exports = {
    getRoles,
    getMatrizPermisos,
    actualizarPermisoRol,
    rolTienePermiso
};
