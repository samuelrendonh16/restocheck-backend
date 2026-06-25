const { getPool } = require('../config/database');

/**
 * Real-Time Compliance: progreso de cada sede en un rango de fechas
 */
async function getCompliancePorSede(empresaId, fechaInicio, fechaFin) {
    const pool = getPool();

    const result = await pool.query(`
        SELECT
            s.SedeID AS "sedeId",
            s.Nombre AS "nombre",
            ts.Nombre AS "tipoSede",
            COUNT(e.EjecucionID) AS "totalEjecuciones",
            SUM(CASE WHEN e.Estado = 'COMPLETADA' THEN 1 ELSE 0 END) AS "completadas",
            AVG(CASE WHEN e.Estado = 'COMPLETADA' THEN e.PorcentajeCumplimiento END) AS "promedioCumplimiento",
            MAX(e.FechaCreacion) AS "ultimaActividad"
        FROM Sede s
        INNER JOIN TipoSede ts ON s.TipoSedeID = ts.TipoSedeID
        LEFT JOIN Ejecucion e ON s.SedeID = e.SedeID
            AND e.FechaEjecucion >= $2
            AND e.FechaEjecucion <= $3
        WHERE s.EmpresaID = $1 AND s.Activa = TRUE
        GROUP BY s.SedeID, s.Nombre, ts.Nombre
        ORDER BY s.Nombre
    `, [empresaId, fechaInicio, fechaFin]);

    return result.rows.map(sede => ({
        sedeId: sede.sedeId,
        nombre: sede.nombre,
        tipoSede: sede.tipoSede,
        totalEjecuciones: parseInt(sede.totalEjecuciones),
        completadas: parseInt(sede.completadas) || 0,
        progreso: sede.promedioCumplimiento !== null
            ? Math.round(parseFloat(sede.promedioCumplimiento))
            : 0,
        ultimaActividad: sede.ultimaActividad
    }));
}

/**
 * Incidencias & No Conformidades: items que resultaron NO_CUMPLE en el rango
 */
async function getIncidencias(empresaId, fechaInicio, fechaFin) {
    const pool = getPool();

    const result = await pool.query(`
        SELECT
            ed.DetalleID AS "detalleId",
            ed.TituloItem AS "titulo",
            ed.Observacion AS "observacion",
            ed.EsCritico AS "esCritico",
            ed.FechaRespuesta AS "fechaRespuesta",
            e.EjecucionID AS "ejecucionId",
            e.NombrePlantilla AS "plantilla",
            e.NombreSede AS "sede",
            e.FechaEjecucion AS "fechaEjecucion"
        FROM EjecucionDetalle ed
        INNER JOIN Ejecucion e ON ed.EjecucionID = e.EjecucionID
        INNER JOIN Sede s ON e.SedeID = s.SedeID
        WHERE s.EmpresaID = $1
            AND ed.Resultado = 'NO_CUMPLE'
            AND e.FechaEjecucion >= $2
            AND e.FechaEjecucion <= $3
        ORDER BY ed.EsCritico DESC, e.FechaEjecucion DESC
    `, [empresaId, fechaInicio, fechaFin]);

    return result.rows.map(inc => ({
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

    const result = await pool.query(`
        SELECT
            s.SedeID AS "sedeId",
            s.Nombre AS "nombre",
            ts.Nombre AS "tipoSede",
            COUNT(e.EjecucionID) AS "totalEjecuciones",
            AVG(CASE WHEN e.Estado = 'COMPLETADA' THEN e.PorcentajeCumplimiento END) AS "promedioCumplimiento"
        FROM Sede s
        INNER JOIN TipoSede ts ON s.TipoSedeID = ts.TipoSedeID
        INNER JOIN Ejecucion e ON s.SedeID = e.SedeID
            AND e.FechaEjecucion >= $2
            AND e.FechaEjecucion <= $3
            AND e.Estado = 'COMPLETADA'
        WHERE s.EmpresaID = $1 AND s.Activa = TRUE
        GROUP BY s.SedeID, s.Nombre, ts.Nombre
        HAVING COUNT(e.EjecucionID) > 0
        ORDER BY AVG(CASE WHEN e.Estado = 'COMPLETADA' THEN e.PorcentajeCumplimiento END) DESC
    `, [empresaId, fechaInicio, fechaFin]);

    return result.rows.map((sede, index) => ({
        posicion: index + 1,
        sedeId: sede.sedeId,
        nombre: sede.nombre,
        tipoSede: sede.tipoSede,
        totalEjecuciones: parseInt(sede.totalEjecuciones),
        promedio: sede.promedioCumplimiento !== null
            ? Math.round(parseFloat(sede.promedioCumplimiento))
            : 0
    }));
}

module.exports = {
    getCompliancePorSede,
    getIncidencias,
    getRankingSedes
};
