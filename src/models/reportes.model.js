const { getPool, sql } = require('../config/database');

/**
 * Real-Time Compliance: progreso de cada sede en un rango de fechas
 */
async function getCompliancePorSede(empresaId, fechaInicio, fechaFin) {
    const pool = getPool();

    const result = await pool.request()
        .input('empresaId', sql.Int, empresaId)
        .input('fechaInicio', sql.Date, fechaInicio)
        .input('fechaFin', sql.Date, fechaFin)
        .query(`
            SELECT
                s.SedeID AS sedeId,
                s.Nombre AS nombre,
                ts.Nombre AS tipoSede,
                COUNT(e.EjecucionID) AS totalEjecuciones,
                SUM(CASE WHEN e.Estado = 'COMPLETADA' THEN 1 ELSE 0 END) AS completadas,
                AVG(CASE WHEN e.Estado = 'COMPLETADA' THEN e.PorcentajeCumplimiento END) AS promedioCumplimiento,
                MAX(e.FechaCreacion) AS ultimaActividad
            FROM dbo.Sede s
            INNER JOIN dbo.TipoSede ts ON s.TipoSedeID = ts.TipoSedeID
            LEFT JOIN dbo.Ejecucion e ON s.SedeID = e.SedeID
                AND e.FechaEjecucion >= @fechaInicio
                AND e.FechaEjecucion <= @fechaFin
            WHERE s.EmpresaID = @empresaId AND s.Activa = 1
            GROUP BY s.SedeID, s.Nombre, ts.Nombre
            ORDER BY s.Nombre
        `);

    return result.recordset.map(sede => ({
        sedeId: sede.sedeId,
        nombre: sede.nombre,
        tipoSede: sede.tipoSede,
        totalEjecuciones: sede.totalEjecuciones,
        completadas: sede.completadas,
        progreso: sede.promedioCumplimiento !== null
            ? Math.round(sede.promedioCumplimiento)
            : 0,
        ultimaActividad: sede.ultimaActividad
    }));
}

/**
 * Incidencias & No Conformidades: items que resultaron NO_CUMPLE en el rango
 */
async function getIncidencias(empresaId, fechaInicio, fechaFin) {
    const pool = getPool();

    const result = await pool.request()
        .input('empresaId', sql.Int, empresaId)
        .input('fechaInicio', sql.Date, fechaInicio)
        .input('fechaFin', sql.Date, fechaFin)
        .query(`
            SELECT
                ed.DetalleID AS detalleId,
                ed.TituloItem AS titulo,
                ed.Observacion AS observacion,
                ed.EsCritico AS esCritico,
                ed.FechaRespuesta AS fechaRespuesta,
                e.EjecucionID AS ejecucionId,
                e.NombrePlantilla AS plantilla,
                e.NombreSede AS sede,
                e.FechaEjecucion AS fechaEjecucion
            FROM dbo.EjecucionDetalle ed
            INNER JOIN dbo.Ejecucion e ON ed.EjecucionID = e.EjecucionID
            INNER JOIN dbo.Sede s ON e.SedeID = s.SedeID
            WHERE s.EmpresaID = @empresaId
                AND ed.Resultado = 'NO_CUMPLE'
                AND e.FechaEjecucion >= @fechaInicio
                AND e.FechaEjecucion <= @fechaFin
            ORDER BY ed.EsCritico DESC, e.FechaEjecucion DESC
        `);

    return result.recordset.map(inc => ({
        detalleId: inc.detalleId,
        titulo: inc.titulo,
        observacion: inc.observacion,
        esCritico: inc.esCritico,
        plantilla: inc.plantilla,
        sede: inc.sede,
        fechaEjecucion: inc.fechaEjecucion
    }));
}

/**
 * Ranking de sedes por desempeño en el rango
 */
async function getRankingSedes(empresaId, fechaInicio, fechaFin) {
    const pool = getPool();

    const result = await pool.request()
        .input('empresaId', sql.Int, empresaId)
        .input('fechaInicio', sql.Date, fechaInicio)
        .input('fechaFin', sql.Date, fechaFin)
        .query(`
            SELECT
                s.SedeID AS sedeId,
                s.Nombre AS nombre,
                ts.Nombre AS tipoSede,
                COUNT(e.EjecucionID) AS totalEjecuciones,
                AVG(CASE WHEN e.Estado = 'COMPLETADA' THEN e.PorcentajeCumplimiento END) AS promedioCumplimiento
            FROM dbo.Sede s
            INNER JOIN dbo.TipoSede ts ON s.TipoSedeID = ts.TipoSedeID
            INNER JOIN dbo.Ejecucion e ON s.SedeID = e.SedeID
                AND e.FechaEjecucion >= @fechaInicio
                AND e.FechaEjecucion <= @fechaFin
                AND e.Estado = 'COMPLETADA'
            WHERE s.EmpresaID = @empresaId AND s.Activa = 1
            GROUP BY s.SedeID, s.Nombre, ts.Nombre
            HAVING COUNT(e.EjecucionID) > 0
            ORDER BY promedioCumplimiento DESC
        `);

    return result.recordset.map((sede, index) => ({
        posicion: index + 1,
        sedeId: sede.sedeId,
        nombre: sede.nombre,
        tipoSede: sede.tipoSede,
        totalEjecuciones: sede.totalEjecuciones,
        promedio: sede.promedioCumplimiento !== null
            ? Math.round(sede.promedioCumplimiento)
            : 0
    }));
}

module.exports = {
    getCompliancePorSede,
    getIncidencias,
    getRankingSedes
};
