const { getPool } = require('../config/database');

/**
 * Obtener todos los usuarios con su rol
 */
async function getAllUsers() {
    const pool = getPool();
    const result = await pool.query(`
        SELECT
            u.UsuarioID, u.NombreCompleto, u.NombreUsuario, u.Email,
            u.Activo, u.UltimoAcceso,
            r.RolID, r.Nombre AS NombreRol, r.Codigo AS CodigoRol, r.AccesoGlobal,
            e.EmpresaID, e.Nombre AS NombreEmpresa
        FROM Usuario u
        INNER JOIN Rol r ON u.RolID = r.RolID
        INNER JOIN Empresa e ON u.EmpresaID = e.EmpresaID
        WHERE u.Activo = TRUE
        ORDER BY u.NombreCompleto
    `);
    return result.rows;
}

/**
 * Buscar usuario por nombre de usuario
 */
async function findByUsername(nombreUsuario) {
    const pool = getPool();
    const result = await pool.query(`
        SELECT
            u.UsuarioID AS "UsuarioID", u.EmpresaID AS "EmpresaID", u.RolID AS "RolID",
            u.NombreCompleto AS "NombreCompleto", u.NombreUsuario AS "NombreUsuario",
            u.Email AS "Email", u.PasswordHash AS "PasswordHash", u.PasswordSalt AS "PasswordSalt",
            u.RequiereCambioPass AS "RequiereCambioPass", u.Activo AS "Activo",
            u.BloqueadoHasta AS "BloqueadoHasta", u.IntentosFallidos AS "IntentosFallidos",
            r.Nombre AS "NombreRol", r.Codigo AS "CodigoRol", r.AccesoGlobal AS "AccesoGlobal",
            r.RequiereSede AS "RequiereSede",
            e.Nombre AS "NombreEmpresa", e.CodigoCorto AS "CodigoEmpresa"
        FROM Usuario u
        INNER JOIN Rol r ON u.RolID = r.RolID
        INNER JOIN Empresa e ON u.EmpresaID = e.EmpresaID
        WHERE u.NombreUsuario = $1
    `, [nombreUsuario]);
    return result.rows[0] || null;
}

/**
 * Obtener permisos de un usuario por su RolID
 */
async function getPermissionsByRole(rolId) {
    const pool = getPool();
    const result = await pool.query(`
        SELECT
            p.PermisoID AS "PermisoID", p.Codigo AS "Codigo", p.Nombre AS "Nombre",
            p.Descripcion AS "Descripcion", p.Modulo AS "Modulo", rp.Habilitado AS "Habilitado"
        FROM RolPermiso rp
        INNER JOIN Permiso p ON rp.PermisoID = p.PermisoID
        WHERE rp.RolID = $1 AND rp.Habilitado = TRUE AND p.Activo = TRUE
        ORDER BY p.Modulo, p.Orden
    `, [rolId]);
    return result.rows;
}

/**
 * Obtener sedes asignadas a un usuario
 */
async function getSedesByUser(usuarioId, empresaId, accesoGlobal) {
    const pool = getPool();

    if (accesoGlobal) {
        const result = await pool.query(`
            SELECT
                s.SedeID AS "SedeID", s.Nombre AS "Nombre", s.CodigoCorto AS "CodigoCorto",
                s.Ciudad AS "Ciudad", ts.Nombre AS "TipoSede", TRUE AS "EsPrincipal"
            FROM Sede s
            INNER JOIN TipoSede ts ON s.TipoSedeID = ts.TipoSedeID
            WHERE s.EmpresaID = $1 AND s.Activa = TRUE
            ORDER BY s.Nombre
        `, [empresaId]);
        return result.rows;
    }

    const result = await pool.query(`
        SELECT
            s.SedeID AS "SedeID", s.Nombre AS "Nombre", s.CodigoCorto AS "CodigoCorto",
            s.Ciudad AS "Ciudad", ts.Nombre AS "TipoSede", us.EsPrincipal AS "EsPrincipal"
        FROM UsuarioSede us
        INNER JOIN Sede s ON us.SedeID = s.SedeID
        INNER JOIN TipoSede ts ON s.TipoSedeID = ts.TipoSedeID
        WHERE us.UsuarioID = $1 AND s.Activa = TRUE
        ORDER BY us.EsPrincipal DESC, s.Nombre
    `, [usuarioId]);
    return result.rows;
}

/**
 * Actualizar último acceso
 */
async function updateLastAccess(usuarioId, ip) {
    const pool = getPool();
    await pool.query(`
        UPDATE Usuario
        SET UltimoAcceso = NOW(), UltimaIP = $2, IntentosFallidos = 0, BloqueadoHasta = NULL
        WHERE UsuarioID = $1
    `, [usuarioId, ip]);
}

/**
 * Registrar actividad en el log
 */
async function logActivity(logData) {
    const pool = getPool();
    await pool.query(`
        INSERT INTO LogActividad
            (EmpresaID, UsuarioID, SedeID, Accion, Entidad, EntidadID, Descripcion, DireccionIP)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
        logData.empresaId,
        logData.usuarioId,
        logData.sedeId || null,
        logData.accion,
        logData.entidad,
        logData.entidadId || null,
        logData.descripcion,
        logData.ip
    ]);
}

/**
 * Verificar contraseña
 */
async function verifyPassword(usuarioId, password) {
    const pool = getPool();
    const result = await pool.query(`
        SELECT CASE
            WHEN PasswordHash = fn_HashPassword($2, PasswordSalt)
            THEN TRUE ELSE FALSE
        END AS coincide
        FROM Usuario
        WHERE UsuarioID = $1
    `, [usuarioId, password]);
    return result.rows[0]?.coincide === true;
}

/**
 * Registrar intento fallido
 */
async function registrarIntentoFallido(usuarioId) {
    const pool = getPool();
    await pool.query(`
        UPDATE Usuario
        SET IntentosFallidos = IntentosFallidos + 1,
            BloqueadoHasta = CASE
                WHEN IntentosFallidos >= 4 THEN NOW() + INTERVAL '15 minutes'
                ELSE BloqueadoHasta
            END
        WHERE UsuarioID = $1
    `, [usuarioId]);
}

module.exports = {
    getAllUsers,
    findByUsername,
    getPermissionsByRole,
    getSedesByUser,
    updateLastAccess,
    logActivity,
    verifyPassword,
    registrarIntentoFallido
};
