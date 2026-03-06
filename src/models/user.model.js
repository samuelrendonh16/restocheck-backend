const { getPool, sql } = require('../config/database');

/**
 * Obtener todos los usuarios con su rol
 * 
 * @returns {Promise<Array>} Lista de usuarios
 */
async function getAllUsers() {
    const pool = getPool();
    
    const result = await pool.request().query(`
        SELECT 
            u.UsuarioID,
            u.NombreCompleto,
            u.NombreUsuario,
            u.Email,
            u.Activo,
            u.UltimoAcceso,
            r.RolID,
            r.Nombre AS NombreRol,
            r.Codigo AS CodigoRol,
            r.AccesoGlobal,
            e.EmpresaID,
            e.Nombre AS NombreEmpresa
        FROM dbo.Usuario u
        INNER JOIN dbo.Rol r ON u.RolID = r.RolID
        INNER JOIN dbo.Empresa e ON u.EmpresaID = e.EmpresaID
        WHERE u.Activo = 1
        ORDER BY u.NombreCompleto
    `);
    
    return result.recordset;
}

/**
 * Buscar usuario por nombre de usuario
 * 
 * @param {string} nombreUsuario - Nombre de usuario a buscar
 * @returns {Promise<Object|null>} Usuario encontrado o null
 */
async function findByUsername(nombreUsuario) {
    const pool = getPool();
    
    const result = await pool.request()
        .input('nombreUsuario', sql.VarChar(50), nombreUsuario)
        .query(`
            SELECT 
                u.UsuarioID,
                u.EmpresaID,
                u.RolID,
                u.NombreCompleto,
                u.NombreUsuario,
                u.Email,
                u.PasswordHash,
                u.PasswordSalt,
                u.RequiereCambioPass,
                u.Activo,
                u.BloqueadoHasta,
                u.IntentosFallidos,
                r.Nombre AS NombreRol,
                r.Codigo AS CodigoRol,
                r.AccesoGlobal,
                r.RequiereSede,
                e.Nombre AS NombreEmpresa,
                e.CodigoCorto AS CodigoEmpresa
            FROM dbo.Usuario u
            INNER JOIN dbo.Rol r ON u.RolID = r.RolID
            INNER JOIN dbo.Empresa e ON u.EmpresaID = e.EmpresaID
            WHERE u.NombreUsuario = @nombreUsuario
        `);
    
    return result.recordset[0] || null;
}

/**
 * Obtener permisos de un usuario por su RolID
 * 
 * @param {number} rolId - ID del rol
 * @returns {Promise<Array>} Lista de permisos
 */
async function getPermissionsByRole(rolId) {
    const pool = getPool();
    
    const result = await pool.request()
        .input('rolId', sql.Int, rolId)
        .query(`
            SELECT 
                p.PermisoID,
                p.Codigo,
                p.Nombre,
                p.Descripcion,
                p.Modulo,
                rp.Habilitado
            FROM dbo.RolPermiso rp
            INNER JOIN dbo.Permiso p ON rp.PermisoID = p.PermisoID
            WHERE rp.RolID = @rolId
                AND rp.Habilitado = 1
                AND p.Activo = 1
            ORDER BY p.Modulo, p.Orden
        `);
    
    return result.recordset;
}

/**
 * Obtener sedes asignadas a un usuario
 * 
 * @param {number} usuarioId - ID del usuario
 * @param {number} empresaId - ID de la empresa
 * @param {boolean} accesoGlobal - Si tiene acceso a todas las sedes
 * @returns {Promise<Array>} Lista de sedes
 */
async function getSedesByUser(usuarioId, empresaId, accesoGlobal) {
    const pool = getPool();
    
    // Si tiene acceso global, retornar TODAS las sedes de la empresa
    if (accesoGlobal) {
        const result = await pool.request()
            .input('empresaId', sql.Int, empresaId)
            .query(`
                SELECT 
                    s.SedeID,
                    s.Nombre,
                    s.CodigoCorto,
                    s.Ciudad,
                    ts.Nombre AS TipoSede,
                    1 AS EsPrincipal
                FROM dbo.Sede s
                INNER JOIN dbo.TipoSede ts ON s.TipoSedeID = ts.TipoSedeID
                WHERE s.EmpresaID = @empresaId
                    AND s.Activa = 1
                ORDER BY s.Nombre
            `);
        
        return result.recordset;
    }
    
    // Si no tiene acceso global, solo las sedes asignadas
    const result = await pool.request()
        .input('usuarioId', sql.Int, usuarioId)
        .query(`
            SELECT 
                s.SedeID,
                s.Nombre,
                s.CodigoCorto,
                s.Ciudad,
                ts.Nombre AS TipoSede,
                us.EsPrincipal
            FROM dbo.UsuarioSede us
            INNER JOIN dbo.Sede s ON us.SedeID = s.SedeID
            INNER JOIN dbo.TipoSede ts ON s.TipoSedeID = ts.TipoSedeID
            WHERE us.UsuarioID = @usuarioId
                AND s.Activa = 1
            ORDER BY us.EsPrincipal DESC, s.Nombre
        `);
    
    return result.recordset;
}

/**
 * Actualizar último acceso del usuario
 * 
 * @param {number} usuarioId - ID del usuario
 * @param {string} ip - Dirección IP del cliente
 */
async function updateLastAccess(usuarioId, ip) {
    const pool = getPool();
    
    await pool.request()
        .input('usuarioId', sql.Int, usuarioId)
        .input('ip', sql.VarChar(45), ip)
        .query(`
            UPDATE dbo.Usuario 
            SET UltimoAcceso = GETDATE(),
                UltimaIP = @ip,
                IntentosFallidos = 0,
                BloqueadoHasta = NULL
            WHERE UsuarioID = @usuarioId
        `);
}

/**
 * Registrar actividad en el log
 * 
 * @param {Object} logData - Datos del log
 */
async function logActivity(logData) {
    const pool = getPool();
    
    await pool.request()
        .input('empresaId', sql.Int, logData.empresaId)
        .input('usuarioId', sql.Int, logData.usuarioId)
        .input('sedeId', sql.Int, logData.sedeId || null)
        .input('accion', sql.VarChar(50), logData.accion)
        .input('entidad', sql.VarChar(50), logData.entidad)
        .input('entidadId', sql.Int, logData.entidadId || null)
        .input('descripcion', sql.NVarChar(500), logData.descripcion)
        .input('ip', sql.VarChar(45), logData.ip)
        .query(`
            INSERT INTO dbo.LogActividad 
                (EmpresaID, UsuarioID, SedeID, Accion, Entidad, EntidadID, Descripcion, DireccionIP)
            VALUES 
                (@empresaId, @usuarioId, @sedeId, @accion, @entidad, @entidadId, @descripcion, @ip)
        `);
}

module.exports = {
    getAllUsers,
    findByUsername,
    getPermissionsByRole,
    getSedesByUser,
    updateLastAccess,
    logActivity
};