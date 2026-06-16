const { getPool, sql } = require('../config/database');

/**
 * Listar roles de una empresa
 */
async function getRoles(empresaId) {
    const pool = getPool();

    const result = await pool.request()
        .input('empresaId', sql.Int, empresaId)
        .query(`
            SELECT
                RolID AS id,
                Codigo AS codigo,
                Nombre AS nombre,
                Descripcion AS descripcion,
                RequiereSede AS requiereSede,
                AccesoGlobal AS accesoGlobal,
                Orden AS orden
            FROM dbo.Rol
            WHERE (EmpresaID = @empresaId OR EmpresaID IS NULL) AND Activo = 1
            ORDER BY Orden
        `);

    return result.recordset;
}

/**
 * Obtener la matriz completa de roles y permisos
 */
async function getMatrizPermisos(empresaId) {
    const pool = getPool();

    // 1. Roles
    const rolesResult = await pool.request()
        .input('empresaId', sql.Int, empresaId)
        .query(`
            SELECT RolID AS id, Codigo AS codigo, Nombre AS nombre, Orden AS orden
            FROM dbo.Rol
            WHERE (EmpresaID = @empresaId OR EmpresaID IS NULL) AND Activo = 1
            ORDER BY Orden
        `);

    // 2. Permisos
    const permisosResult = await pool.request()
        .query(`
            SELECT PermisoID AS id, Codigo AS codigo, Nombre AS nombre,
                   Descripcion AS descripcion, Modulo AS modulo, Orden AS orden
            FROM dbo.Permiso
            WHERE Activo = 1
            ORDER BY Orden
        `);

    // 3. Asignaciones (qué permiso tiene cada rol)
    const asignacionesResult = await pool.request()
        .query(`
            SELECT RolID AS rolId, PermisoID AS permisoId, Habilitado AS habilitado
            FROM dbo.RolPermiso
        `);

    return {
        roles: rolesResult.recordset,
        permisos: permisosResult.recordset,
        asignaciones: asignacionesResult.recordset
    };
}

/**
 * Actualizar un permiso de un rol (habilitar/deshabilitar)
 */
async function actualizarPermisoRol(rolId, permisoId, habilitado) {
    const pool = getPool();

    // Verificar si ya existe la asignación
    const existeResult = await pool.request()
        .input('rolId', sql.Int, rolId)
        .input('permisoId', sql.Int, permisoId)
        .query(`
            SELECT COUNT(*) AS total
            FROM dbo.RolPermiso
            WHERE RolID = @rolId AND PermisoID = @permisoId
        `);

    if (existeResult.recordset[0].total > 0) {
        // Actualizar
        await pool.request()
            .input('rolId', sql.Int, rolId)
            .input('permisoId', sql.Int, permisoId)
            .input('habilitado', sql.Bit, habilitado ? 1 : 0)
            .query(`
                UPDATE dbo.RolPermiso
                SET Habilitado = @habilitado
                WHERE RolID = @rolId AND PermisoID = @permisoId
            `);
    } else {
        // Insertar
        await pool.request()
            .input('rolId', sql.Int, rolId)
            .input('permisoId', sql.Int, permisoId)
            .input('habilitado', sql.Bit, habilitado ? 1 : 0)
            .query(`
                INSERT INTO dbo.RolPermiso (RolID, PermisoID, Habilitado)
                VALUES (@rolId, @permisoId, @habilitado)
            `);
    }

    return { success: true };
}

module.exports = {
    getRoles,
    getMatrizPermisos,
    actualizarPermisoRol
};
