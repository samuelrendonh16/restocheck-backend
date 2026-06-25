const { getPool } = require('../config/database');

/**
 * Listar todas las sedes de una empresa
 */
async function getSedes(empresaId) {
    const pool = getPool();
    const result = await pool.query(`
        SELECT
            s.SedeID AS "id",
            s.Nombre AS "nombre",
            s.CodigoCorto AS "codigoCorto",
            s.Ciudad AS "ciudad",
            ts.Nombre AS "tipoSede",
            ts.TipoSedeID AS "tipoSedeId",
            s.Activa AS "activa"
        FROM Sede s
        INNER JOIN TipoSede ts ON s.TipoSedeID = ts.TipoSedeID
        WHERE s.EmpresaID = $1 AND s.Activa = TRUE
        ORDER BY s.Nombre
    `, [empresaId]);
    return result.rows;
}

/**
 * Crear una nueva sede
 */
async function crearSede(empresaId, nombre, codigoCorto, tipoSedeId, ciudad) {
    const pool = getPool();
    const result = await pool.query(`
        INSERT INTO Sede (EmpresaID, TipoSedeID, Nombre, CodigoCorto, Ciudad, CreadoPor)
        VALUES ($1, $2, $3, $4, $5, 'CONFIG')
        RETURNING SedeID AS "id", Nombre AS "nombre", CodigoCorto AS "codigoCorto"
    `, [empresaId, tipoSedeId, nombre, codigoCorto, ciudad || null]);
    return result.rows[0];
}

/**
 * Eliminar (desactivar) una sede
 */
async function eliminarSede(sedeId) {
    const pool = getPool();
    await pool.query(`
        UPDATE Sede
        SET Activa = FALSE, FechaModificacion = NOW(), ModificadoPor = 'CONFIG'
        WHERE SedeID = $1
    `, [sedeId]);
    return { success: true };
}

/**
 * Listar tipos de sede
 */
async function getTiposSede() {
    const pool = getPool();
    const result = await pool.query(`
        SELECT
            TipoSedeID AS "id",
            Nombre AS "nombre"
        FROM TipoSede
        WHERE Activo = TRUE
        ORDER BY Nombre
    `);
    return result.rows;
}

module.exports = {
    getSedes,
    crearSede,
    eliminarSede,
    getTiposSede
};
