const { getPool, sql } = require('../config/database');

/**
 * Listar usuarios de una empresa
 */
async function getUsuarios(empresaId) {
    const pool = getPool();

    const result = await pool.request()
        .input('empresaId', sql.Int, empresaId)
        .query(`
            SELECT
                u.UsuarioID AS id,
                u.NombreCompleto AS nombreCompleto,
                u.NombreUsuario AS nombreUsuario,
                u.Email AS email,
                r.RolID AS rolId,
                r.Nombre AS rolNombre,
                r.Codigo AS rolCodigo,
                r.EsSistema AS rolEsSistema,
                s.SedeID AS sedeId,
                s.Nombre AS sedeNombre
            FROM dbo.Usuario u
            INNER JOIN dbo.Rol r ON u.RolID = r.RolID
            LEFT JOIN dbo.UsuarioSede us ON u.UsuarioID = us.UsuarioID AND us.EsPrincipal = 1
            LEFT JOIN dbo.Sede s ON us.SedeID = s.SedeID
            WHERE u.EmpresaID = @empresaId AND u.Activo = 1
            ORDER BY u.NombreCompleto
        `);

    return result.recordset;
}

/**
 * Generar NombreUsuario único a partir del nombre completo
 */
async function generarNombreUsuario(nombreCompleto) {
    const pool = getPool();

    // Normalizar: "Juan Pérez García" -> "juan.perez"
    const limpio = nombreCompleto
        .toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '') // quitar tildes
        .replace(/[^a-z\s]/g, '')                          // solo letras y espacios
        .trim()
        .split(/\s+/);

    const base = limpio.length >= 2
        ? `${limpio[0]}.${limpio[1]}`
        : limpio[0];

    // Verificar si existe, agregar número si es necesario
    let candidato = base;
    let contador = 1;

    while (true) {
        const result = await pool.request()
            .input('nombreUsuario', sql.VarChar(50), candidato)
            .query(`SELECT COUNT(*) AS total FROM dbo.Usuario WHERE NombreUsuario = @nombreUsuario`);

        if (result.recordset[0].total === 0) {
            return candidato;
        }

        contador++;
        candidato = `${base}${contador}`;
    }
}

/**
 * Crear un nuevo usuario
 */
async function crearUsuario(empresaId, nombreCompleto, rolId, sedeId, password) {
    const pool = getPool();

    // 1. Generar nombre de usuario único
    const nombreUsuario = await generarNombreUsuario(nombreCompleto);

    // 2. Insertar usuario con la contraseña proporcionada (RequiereCambioPass = 0)
    const result = await pool.request()
        .input('empresaId', sql.Int, empresaId)
        .input('rolId', sql.Int, rolId)
        .input('nombreCompleto', sql.NVarChar(100), nombreCompleto)
        .input('nombreUsuario', sql.VarChar(50), nombreUsuario)
        .input('password', sql.NVarChar(100), password)
        .query(`
            DECLARE @Salt VARBINARY(32) = CRYPT_GEN_RANDOM(32);

            INSERT INTO dbo.Usuario
                (EmpresaID, RolID, NombreCompleto, NombreUsuario, PasswordHash, PasswordSalt, RequiereCambioPass, CreadoPor)
            OUTPUT INSERTED.UsuarioID AS id, INSERTED.NombreUsuario AS nombreUsuario
            VALUES
                (@empresaId, @rolId, @nombreCompleto, @nombreUsuario,
                 dbo.fn_HashPassword(@password, @Salt), @Salt, 0, 'CONFIG');
        `);

    const nuevoUsuario = result.recordset[0];

    // 3. Asignar sede si se proporcionó
    if (sedeId) {
        await pool.request()
            .input('usuarioId', sql.Int, nuevoUsuario.id)
            .input('sedeId', sql.Int, sedeId)
            .query(`
                INSERT INTO dbo.UsuarioSede (UsuarioID, SedeID, EsPrincipal)
                VALUES (@usuarioId, @sedeId, 1)
            `);
    }

    return {
        id: nuevoUsuario.id,
        nombreUsuario: nuevoUsuario.nombreUsuario
    };
}

/**
 * Eliminar (desactivar) un usuario
 */
async function eliminarUsuario(usuarioId) {
    const pool = getPool();

    await pool.request()
        .input('usuarioId', sql.Int, usuarioId)
        .query(`
            UPDATE dbo.Usuario
            SET Activo = 0,
                FechaModificacion = GETDATE(),
                ModificadoPor = 'CONFIG'
            WHERE UsuarioID = @usuarioId
        `);

    return { success: true };
}

module.exports = {
    getUsuarios,
    crearUsuario,
    eliminarUsuario
};
