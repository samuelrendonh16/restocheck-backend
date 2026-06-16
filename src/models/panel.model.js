const { sql, getPool } = require('../config/database');

/**
 * Obtener resumen del panel para una sede y fecha
 */
async function getResumenPanel(sedeId, fecha) {
    const pool = getPool();

    // 1. Desglose por categoría (solo CHECKLIST de control)
    const categoriasResult = await pool.request()
        .input('sedeId', sql.Int, sedeId)
        .input('fecha', sql.Date, fecha)
        .query(`
            SELECT
                cp.CategoriaID AS categoriaId,
                cp.Codigo AS codigo,
                cp.Nombre AS nombre,
                cp.Orden AS orden,
                COUNT(DISTINCT p.PlantillaID) AS totalPlantillas,
                COUNT(DISTINCT CASE WHEN e.Estado = 'COMPLETADA' THEN e.PlantillaID END) AS completadas,
                AVG(CASE WHEN e.Estado = 'COMPLETADA' THEN e.PorcentajeCumplimiento END) AS promedioCumplimiento
            FROM dbo.CategoriaPlantilla cp
            INNER JOIN dbo.TipoPlantilla tp ON cp.TipoPlantillaID = tp.TipoPlantillaID
            LEFT JOIN dbo.Plantilla p ON cp.CategoriaID = p.CategoriaID AND p.Activa = 1
            LEFT JOIN dbo.Ejecucion e ON p.PlantillaID = e.PlantillaID
                AND e.SedeID = @sedeId
                AND e.FechaEjecucion = @fecha
            WHERE tp.Codigo = 'CHECKLIST' AND cp.Activo = 1
            GROUP BY cp.CategoriaID, cp.Codigo, cp.Nombre, cp.Orden
            ORDER BY cp.Orden
        `);

    const categorias = categoriasResult.recordset;

    // 2. Totales (sumando las categorías)
    let totalEvaluaciones = 0;
    let evaluacionesCompletadas = 0;

    categorias.forEach(c => {
        totalEvaluaciones += c.totalPlantillas;
        evaluacionesCompletadas += c.completadas;
    });

    // 3. Progreso total
    const progresoTotal = totalEvaluaciones > 0
        ? Math.round((evaluacionesCompletadas / totalEvaluaciones) * 100)
        : 0;

    return {
        totalEvaluaciones,
        evaluacionesCompletadas,
        progresoTotal,
        categorias: categorias.map(c => ({
            categoriaId: c.categoriaId,
            codigo: c.codigo,
            nombre: c.nombre,
            orden: c.orden,
            totalPlantillas: c.totalPlantillas,
            completadas: c.completadas,
            porcentaje: c.totalPlantillas > 0
                ? Math.round((c.completadas / c.totalPlantillas) * 100)
                : 0
        }))
    };
}

module.exports = {
    getResumenPanel
};
