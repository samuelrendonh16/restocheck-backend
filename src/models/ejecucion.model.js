/**
 * EJECUCION MODEL - PostgreSQL
 */

const { getPool } = require('../config/database');

/**
 * Iniciar una nueva ejecución
 */
async function iniciarEjecucion(plantillaId, sedeId, usuarioId) {
    const pool = getPool();

    // 1. Obtener datos de la plantilla
    const plantillaResult = await pool.query(`
        SELECT
            p.PlantillaID AS "PlantillaID", p.Nombre AS "Nombre", p.Version AS "Version",
            cp.Nombre AS "CategoriaNombre"
        FROM Plantilla p
        INNER JOIN CategoriaPlantilla cp ON p.CategoriaID = cp.CategoriaID
        WHERE p.PlantillaID = $1 AND p.Activa = TRUE
    `, [plantillaId]);

    if (plantillaResult.rows.length === 0) {
        throw new Error('Plantilla no encontrada');
    }

    const plantilla = plantillaResult.rows[0];

    // 2. Obtener datos de sede
    const sedeResult = await pool.query(
        `SELECT Nombre AS "Nombre" FROM Sede WHERE SedeID = $1`,
        [sedeId]
    );
    const nombreSede = sedeResult.rows[0]?.Nombre || 'Sin sede';

    // 3. Obtener datos de usuario
    const usuarioResult = await pool.query(
        `SELECT NombreCompleto AS "NombreCompleto" FROM Usuario WHERE UsuarioID = $1`,
        [usuarioId]
    );
    const nombreUsuario = usuarioResult.rows[0]?.NombreCompleto || 'Sin usuario';

    // 4. Obtener items de la plantilla
    const itemsResult = await pool.query(`
        SELECT ItemID AS "ItemID", Titulo AS "Titulo", Orden AS "Orden",
               EsCritico AS "EsCritico", TipoRespuesta AS "TipoRespuesta", Descripcion AS "Descripcion"
        FROM PlantillaItem
        WHERE PlantillaID = $1 AND Activo = TRUE
        ORDER BY Orden
    `, [plantillaId]);

    const items = itemsResult.rows;

    // 5. Crear la ejecución
    const insertResult = await pool.query(`
        INSERT INTO Ejecucion (
            PlantillaID, SedeID, UsuarioID, FechaEjecucion, HoraInicio,
            Estado, ItemsTotal, ItemsCompletados, ItemsCumplidos, ItemsNoCumplidos,
            NombrePlantilla, VersionPlantilla, NombreSede, NombreUsuario
        )
        VALUES (
            $1, $2, $3, CURRENT_DATE, CURRENT_TIME,
            'EN_PROGRESO', $4, 0, 0, 0,
            $5, $6, $7, $8
        )
        RETURNING EjecucionID AS "EjecucionID"
    `, [plantillaId, sedeId, usuarioId, items.length, plantilla.Nombre, plantilla.Version, nombreSede, nombreUsuario]);

    const ejecucionId = insertResult.rows[0].EjecucionID;

    // 6. Crear los detalles (un registro por cada item)
    for (const item of items) {
        await pool.query(`
            INSERT INTO EjecucionDetalle (
                EjecucionID, ItemID, TituloItem, OrdenItem, EsCritico
            )
            VALUES ($1, $2, $3, $4, $5)
        `, [ejecucionId, item.ItemID, item.Titulo, item.Orden, item.EsCritico]);
    }

    // 7. Retornar la ejecución con sus items
    return {
        id: ejecucionId,
        plantillaId: plantillaId,
        nombrePlantilla: plantilla.Nombre,
        categoriaNombre: plantilla.CategoriaNombre,
        estado: 'EN_PROGRESO',
        itemsTotal: items.length,
        items: items.map(item => ({
            id: item.ItemID,
            titulo: item.Titulo,
            descripcion: item.Descripcion,
            orden: item.Orden,
            tipoRespuesta: item.TipoRespuesta,
            esCritico: item.EsCritico,
            completado: null,
            resultado: null
        }))
    };
}

/**
 * Guardar respuesta de un item
 */
async function guardarRespuestaItem(ejecucionId, itemId, completado, observacion = null) {
    const pool = getPool();

    // 1. Actualizar el detalle
    await pool.query(`
        UPDATE EjecucionDetalle
        SET Completado = $3,
            Resultado = $4,
            Observacion = $5,
            FechaRespuesta = NOW()
        WHERE EjecucionID = $1 AND ItemID = $2
    `, [ejecucionId, itemId, completado, completado ? 'CUMPLE' : 'NO_CUMPLE', observacion]);

    // 2. Actualizar contadores en la ejecución
    await pool.query(`
        UPDATE Ejecucion
        SET ItemsCompletados = (
                SELECT COUNT(*) FROM EjecucionDetalle
                WHERE EjecucionID = $1 AND Completado IS NOT NULL
            ),
            ItemsCumplidos = (
                SELECT COUNT(*) FROM EjecucionDetalle
                WHERE EjecucionID = $1 AND Completado = TRUE
            ),
            ItemsNoCumplidos = (
                SELECT COUNT(*) FROM EjecucionDetalle
                WHERE EjecucionID = $1 AND Completado = FALSE
            )
        WHERE EjecucionID = $1
    `, [ejecucionId]);

    return { success: true };
}

/**
 * Finalizar una ejecución
 */
async function finalizarEjecucion(ejecucionId) {
    const pool = getPool();

    // 1. Calcular estadísticas
    const statsResult = await pool.query(`
        SELECT
            COUNT(*) AS "total",
            SUM(CASE WHEN Completado = TRUE THEN 1 ELSE 0 END) AS "cumplidos",
            SUM(CASE WHEN Completado = FALSE THEN 1 ELSE 0 END) AS "noCumplidos"
        FROM EjecucionDetalle
        WHERE EjecucionID = $1
    `, [ejecucionId]);

    const stats = statsResult.rows[0];
    const total = parseInt(stats.total);
    const cumplidos = parseInt(stats.cumplidos) || 0;
    const noCumplidos = parseInt(stats.noCumplidos) || 0;
    const porcentaje = total > 0 ? Math.round((cumplidos / total) * 100) : 0;

    // 2. Actualizar la ejecución
    await pool.query(`
        UPDATE Ejecucion
        SET Estado = 'COMPLETADA',
            HoraFin = CURRENT_TIME,
            FechaFinalizacion = NOW(),
            ItemsCompletados = $2,
            ItemsCumplidos = $3,
            ItemsNoCumplidos = $4,
            PorcentajeCumplimiento = $5
        WHERE EjecucionID = $1
    `, [ejecucionId, cumplidos + noCumplidos, cumplidos, noCumplidos, porcentaje]);

    return {
        id: ejecucionId,
        estado: 'COMPLETADA',
        itemsCumplidos: cumplidos,
        itemsNoCumplidos: noCumplidos,
        porcentaje: porcentaje
    };
}

/**
 * Obtener estado de ejecuciones por categoría para una sede y fecha
 */
async function getEstadoPorCategoria(sedeId, fecha, tipoCodigo) {
    const pool = getPool();

    const result = await pool.query(`
        SELECT
            cp.CategoriaID AS "categoriaId",
            COUNT(DISTINCT p.PlantillaID) AS "totalPlantillas",
            COUNT(DISTINCT CASE WHEN e.Estado = 'COMPLETADA' THEN e.PlantillaID END) AS "completadas"
        FROM CategoriaPlantilla cp
        INNER JOIN TipoPlantilla tp ON cp.TipoPlantillaID = tp.TipoPlantillaID
        LEFT JOIN Plantilla p ON cp.CategoriaID = p.CategoriaID AND p.Activa = TRUE
        LEFT JOIN Ejecucion e ON p.PlantillaID = e.PlantillaID
            AND e.SedeID = $1
            AND e.FechaEjecucion = $2
        WHERE tp.Codigo = $3 AND cp.Activo = TRUE
        GROUP BY cp.CategoriaID
    `, [sedeId, fecha, tipoCodigo]);

    return result.rows;
}

/**
 * Buscar ejecución existente para una fecha específica
 */
async function buscarEjecucion(plantillaId, sedeId, fecha = null) {
    const pool = getPool();

    // Si no se pasa fecha, usar hoy
    const fechaBusqueda = fecha || new Date().toISOString().split('T')[0];

    const result = await pool.query(`
        SELECT
            e.EjecucionID AS "id",
            e.PlantillaID AS "plantillaId",
            e.NombrePlantilla AS "nombrePlantilla",
            e.Estado AS "estado",
            e.ItemsTotal AS "itemsTotal",
            e.ItemsCompletados AS "itemsCompletados",
            e.ItemsCumplidos AS "itemsCumplidos",
            e.ItemsNoCumplidos AS "itemsNoCumplidos",
            e.PorcentajeCumplimiento AS "porcentaje",
            TO_CHAR(e.HoraInicio, 'HH24:MI') AS "horaInicio",
            TO_CHAR(e.HoraFin, 'HH24:MI') AS "horaFin",
            TO_CHAR(e.FechaEjecucion, 'YYYY-MM-DD') AS "fecha"
        FROM Ejecucion e
        WHERE e.PlantillaID = $1
            AND e.SedeID = $2
            AND e.FechaEjecucion = $3
        ORDER BY e.EjecucionID DESC
    `, [plantillaId, sedeId, fechaBusqueda]);

    if (result.rows.length === 0) {
        return null;
    }

    const ejecucion = result.rows[0];

    // Cargar los items
    const itemsResult = await pool.query(`
        SELECT
            ed.ItemID AS "id",
            ed.TituloItem AS "titulo",
            pi.Descripcion AS "descripcion",
            ed.OrdenItem AS "orden",
            pi.TipoRespuesta AS "tipoRespuesta",
            ed.EsCritico AS "esCritico",
            ed.Completado AS "completado",
            ed.Resultado AS "resultado",
            ed.Observacion AS "observacion"
        FROM EjecucionDetalle ed
        INNER JOIN PlantillaItem pi ON ed.ItemID = pi.ItemID
        WHERE ed.EjecucionID = $1
        ORDER BY ed.OrdenItem
    `, [ejecucion.id]);

    ejecucion.items = itemsResult.rows;

    return ejecucion;
}

/**
 * Obtener estado de plantillas de una categoría para sede y fecha
 */
async function getEstadoPlantillas(categoriaId, sedeId, fecha) {
    const pool = getPool();

    const result = await pool.query(`
        SELECT
            p.PlantillaID AS "plantillaId",
            e.Estado AS "estado",
            e.PorcentajeCumplimiento AS "porcentaje"
        FROM Plantilla p
        LEFT JOIN Ejecucion e ON p.PlantillaID = e.PlantillaID
            AND e.SedeID = $2
            AND e.FechaEjecucion = $3
        WHERE p.CategoriaID = $1 AND p.Activa = TRUE
    `, [categoriaId, sedeId, fecha]);

    return result.rows;
}

module.exports = {
    iniciarEjecucion,
    guardarRespuestaItem,
    finalizarEjecucion,
    getEstadoPorCategoria,
    buscarEjecucion,
    getEstadoPlantillas
};
