const { getPool } = require('../config/database');

/**
 * Listar usuarios de una empresa
 */
async function getUsuarios(empresaId) {
    const pool = getPool();
    const result = await pool.query(`
        SELECT
            u.UsuarioID AS "id",
            u.NombreCompleto AS "nombreCompleto",
            u.NombreUsuario AS "nombreUsuario",
            u.Email AS "email",
            r.RolID AS "rolId",
            r.Nombre AS "rolNombre",
            r.Codigo AS "rolCodigo",
            r.EsSistema AS "rolEsSistema",
            s.SedeID AS "sedeId",
            s.Nombre AS "sedeNombre"
        FROM Usuario u
        INNER JOIN Rol r ON u.RolID = r.RolID
        LEFT JOIN UsuarioSede us ON u.UsuarioID = us.UsuarioID AND us.EsPrincipal = TRUE
        LEFT JOIN Sede s ON us.SedeID = s.SedeID
        WHERE u.EmpresaID = $1 AND u.Activo = TRUE
        ORDER BY u.NombreCompleto
    `, [empresaId]);
    return result.rows;
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
        .replace(/[^a-z\s]/g, '')                         // solo letras y espacios
        .trim()
        .split(/\s+/);

    const base = limpio.length >= 2
        ? `${limpio[0]}.${limpio[1]}`
        : limpio[0];

    // Verificar si existe, agregar número si es necesario
    let candidato = base;
    let contador = 1;

    while (true) {
        const result = await pool.query(
            `SELECT COUNT(*) AS total FROM Usuario WHERE NombreUsuario = $1`,
            [candidato]
        );

        if (parseInt(result.rows[0].total) === 0) {
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

    const nombreUsuario = await generarNombreUsuario(nombreCompleto);

    // INSERT ... SELECT permite generar el salt una vez y usarlo dos veces
    const result = await pool.query(`
        INSERT INTO Usuario
            (EmpresaID, RolID, NombreCompleto, NombreUsuario, PasswordHash, PasswordSalt, RequiereCambioPass, CreadoPor)
        SELECT
            $1, $2, $3, $4,
            fn_HashPassword($5, s.salt), s.salt, FALSE, 'CONFIG'
        FROM (SELECT gen_random_bytes(32) AS salt) s
        RETURNING UsuarioID AS "id", NombreUsuario AS "nombreUsuario"
    `, [empresaId, rolId, nombreCompleto, nombreUsuario, password]);

    const nuevoUsuario = result.rows[0];

    if (sedeId) {
        await pool.query(`
            INSERT INTO UsuarioSede (UsuarioID, SedeID, EsPrincipal)
            VALUES ($1, $2, TRUE)
        `, [nuevoUsuario.id, sedeId]);
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
    await pool.query(`
        UPDATE Usuario
        SET Activo = FALSE,
            FechaModificacion = NOW(),
            ModificadoPor = 'CONFIG'
        WHERE UsuarioID = $1
    `, [usuarioId]);
    return { success: true };
}

module.exports = {
    getUsuarios,
    crearUsuario,
    eliminarUsuario
};
