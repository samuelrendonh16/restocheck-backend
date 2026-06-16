const { getPool, sql } = require('../config/database');

/**
 * Listar todas las sedes de una empresa
 */
async function getSedes(empresaId) {
    const pool = getPool();

    const result = await pool.request()
        .input('empresaId', sql.Int, empresaId)
        .query(`
            SELECT
                s.SedeID AS id,
                s.Nombre AS nombre,
                s.CodigoCorto AS codigoCorto,
                s.Ciudad AS ciudad,
                ts.Nombre AS tipoSede,
                ts.TipoSedeID AS tipoSedeId,
                s.Activa AS activa
            FROM dbo.Sede s
            INNER JOIN dbo.TipoSede ts ON s.TipoSedeID = ts.TipoSedeID
            WHERE s.EmpresaID = @empresaId AND s.Activa = 1
            ORDER BY s.Nombre
        `);

    return result.recordset;
}

/**
 * Crear una nueva sede
 */
async function crearSede(empresaId, nombre, codigoCorto, tipoSedeId, ciudad) {
    const pool = getPool();

    const result = await pool.request()
        .input('empresaId', sql.Int, empresaId)
        .input('tipoSedeId', sql.Int, tipoSedeId)
        .input('nombre', sql.NVarChar(100), nombre)
        .input('codigoCorto', sql.Char(3), codigoCorto)
        .input('ciudad', sql.NVarChar(100), ciudad || null)
        .query(`
            INSERT INTO dbo.Sede (EmpresaID, TipoSedeID, Nombre, CodigoCorto, Ciudad, CreadoPor)
            OUTPUT INSERTED.SedeID AS id, INSERTED.Nombre AS nombre, INSERTED.CodigoCorto AS codigoCorto
            VALUES (@empresaId, @tipoSedeId, @nombre, @codigoCorto, @ciudad, 'CONFIG')
        `);

    return result.recordset[0];
}

/**
 * Eliminar (desactivar) una sede
 */
async function eliminarSede(sedeId) {
    const pool = getPool();

    await pool.request()
        .input('sedeId', sql.Int, sedeId)
        .query(`
            UPDATE dbo.Sede
            SET Activa = 0,
                FechaModificacion = GETDATE(),
                ModificadoPor = 'CONFIG'
            WHERE SedeID = @sedeId
        `);

    return { success: true };
}

/**
 * Listar tipos de sede (para el dropdown del formulario)
 */
async function getTiposSede() {
    const pool = getPool();

    const result = await pool.request()
        .query(`
            SELECT
                TipoSedeID AS id,
                Nombre AS nombre
            FROM dbo.TipoSede
            WHERE Activo = 1
            ORDER BY Nombre
        `);

    return result.recordset;
}

module.exports = {
    getSedes,
    crearSede,
    eliminarSede,
    getTiposSede
};
