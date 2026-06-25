const { getPool } = require('../config/database');

/**
 * Obtener resumen del panel para una sede y fecha
 */
async function getResumenPanel(sedeId, fecha) {
    const pool = getPool();

    // 1. Desglose por categoría (solo CHECKLIST de control)
    const categoriasResult = await pool.query(`
        SELECT
            cp.CategoriaID AS "categoriaId",
            cp.Codigo AS "codigo",
            cp.Nombre AS "nombre",
            cp.Orden AS "orden",
            COUNT(DISTINCT p.PlantillaID) AS "totalPlantillas",
            COUNT(DISTINCT CASE WHEN e.Estado = 'COMPLETADA' THEN e.PlantillaID END) AS "completadas",
            AVG(CASE WHEN e.Estado = 'COMPLETADA' THEN e.PorcentajeCumplimiento END) AS "promedioCumplimiento"
        FROM CategoriaPlantilla cp
        INNER JOIN TipoPlantilla tp ON cp.TipoPlantillaID = tp.TipoPlantillaID
        LEFT JOIN Plantilla p ON cp.CategoriaID = p.CategoriaID AND p.Activa = TRUE
        LEFT JOIN Ejecucion e ON p.PlantillaID = e.PlantillaID
            AND e.SedeID = $1
            AND e.FechaEjecucion = $2
        WHERE tp.Codigo = 'CHECKLIST' AND cp.Activo = TRUE
        GROUP BY cp.CategoriaID, cp.Codigo, cp.Nombre, cp.Orden
        ORDER BY cp.Orden
    `, [sedeId, fecha]);

    const categorias = categoriasResult.rows;

    // 2. Totales (sumando las categorías)
    //    parseInt porque COUNT en PostgreSQL devuelve string
    let totalEvaluaciones = 0;
    let evaluacionesCompletadas = 0;

    categorias.forEach(c => {
        totalEvaluaciones += parseInt(c.totalPlantillas);
        evaluacionesCompletadas += parseInt(c.completadas);
    });

    // 3. Progreso total
    const progresoTotal = totalEvaluaciones > 0
        ? Math.round((evaluacionesCompletadas / totalEvaluaciones) * 100)
        : 0;

    return {
        totalEvaluaciones,
        evaluacionesCompletadas,
        progresoTotal,
        categorias: categorias.map(c => {
            const total = parseInt(c.totalPlantillas);
            const comp = parseInt(c.completadas);
            return {
                categoriaId: c.categoriaId,
                codigo: c.codigo,
                nombre: c.nombre,
                orden: c.orden,
                totalPlantillas: total,
                completadas: comp,
                porcentaje: total > 0 ? Math.round((comp / total) * 100) : 0
            };
        })
    };
}

module.exports = {
    getResumenPanel
};
