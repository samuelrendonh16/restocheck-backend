/**
 * EJECUCION MODEL
 */

const { getPool, sql } = require('../config/database');

/**
 * Iniciar una nueva ejecución
 */
async function iniciarEjecucion(plantillaId, sedeId, usuarioId) {
    const pool = getPool();
    
    // 1. Obtener datos de la plantilla
    const plantillaResult = await pool.request()
        .input('plantillaId', sql.Int, plantillaId)
        .query(`
            SELECT 
                p.PlantillaID, p.Nombre, p.Version,
                cp.Nombre AS CategoriaNombre
            FROM dbo.Plantilla p
            INNER JOIN dbo.CategoriaPlantilla cp ON p.CategoriaID = cp.CategoriaID
            WHERE p.PlantillaID = @plantillaId AND p.Activa = 1
        `);
    
    if (plantillaResult.recordset.length === 0) {
        throw new Error('Plantilla no encontrada');
    }
    
    const plantilla = plantillaResult.recordset[0];
    
    // 2. Obtener datos de sede
    const sedeResult = await pool.request()
        .input('sedeId', sql.Int, sedeId)
        .query(`SELECT Nombre FROM dbo.Sede WHERE SedeID = @sedeId`);
    
    const nombreSede = sedeResult.recordset[0]?.Nombre || 'Sin sede';
    
    // 3. Obtener datos de usuario
    const usuarioResult = await pool.request()
        .input('usuarioId', sql.Int, usuarioId)
        .query(`SELECT NombreCompleto FROM dbo.Usuario WHERE UsuarioID = @usuarioId`);
    
    const nombreUsuario = usuarioResult.recordset[0]?.NombreCompleto || 'Sin usuario';
    
    // 4. Obtener items de la plantilla
    const itemsResult = await pool.request()
        .input('plantillaId', sql.Int, plantillaId)
        .query(`
            SELECT ItemID, Titulo, Orden, EsCritico, TipoRespuesta, Descripcion
            FROM dbo.PlantillaItem 
            WHERE PlantillaID = @plantillaId AND Activo = 1
            ORDER BY Orden
        `);
    
    const items = itemsResult.recordset;
    
    // 5. Crear la ejecución
    const insertResult = await pool.request()
        .input('plantillaId', sql.Int, plantillaId)
        .input('sedeId', sql.Int, sedeId)
        .input('usuarioId', sql.Int, usuarioId)
        .input('itemsTotal', sql.Int, items.length)
        .input('nombrePlantilla', sql.NVarChar(100), plantilla.Nombre)
        .input('versionPlantilla', sql.Int, plantilla.Version)
        .input('nombreSede', sql.NVarChar(100), nombreSede)
        .input('nombreUsuario', sql.NVarChar(100), nombreUsuario)
        .query(`
            INSERT INTO dbo.Ejecucion (
                PlantillaID, SedeID, UsuarioID, FechaEjecucion, HoraInicio,
                Estado, ItemsTotal, ItemsCompletados, ItemsCumplidos, ItemsNoCumplidos,
                NombrePlantilla, VersionPlantilla, NombreSede, NombreUsuario
            )
            OUTPUT INSERTED.EjecucionID
            VALUES (
                @plantillaId, @sedeId, @usuarioId, 
                CAST(GETDATE() AS DATE), CAST(GETDATE() AS TIME(0)),
                'EN_PROGRESO', @itemsTotal, 0, 0, 0,
                @nombrePlantilla, @versionPlantilla, @nombreSede, @nombreUsuario
            )
        `);
    
    const ejecucionId = insertResult.recordset[0].EjecucionID;
    
    // 6. Crear los detalles (un registro por cada item)
    for (const item of items) {
        await pool.request()
            .input('ejecucionId', sql.Int, ejecucionId)
            .input('itemId', sql.Int, item.ItemID)
            .input('titulo', sql.NVarChar(100), item.Titulo)
            .input('orden', sql.Int, item.Orden)
            .input('esCritico', sql.Bit, item.EsCritico)
            .query(`
                INSERT INTO dbo.EjecucionDetalle (
                    EjecucionID, ItemID, TituloItem, OrdenItem, EsCritico
                )
                VALUES (@ejecucionId, @itemId, @titulo, @orden, @esCritico)
            `);
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
    await pool.request()
        .input('ejecucionId', sql.Int, ejecucionId)
        .input('itemId', sql.Int, itemId)
        .input('completado', sql.Bit, completado)
        .input('resultado', sql.VarChar(20), completado ? 'CUMPLE' : 'NO_CUMPLE')
        .input('observacion', sql.NVarChar(500), observacion)
        .query(`
            UPDATE dbo.EjecucionDetalle
            SET Completado = @completado,
                Resultado = @resultado,
                Observacion = @observacion,
                FechaRespuesta = GETDATE()
            WHERE EjecucionID = @ejecucionId AND ItemID = @itemId
        `);
    
    // 2. Actualizar contadores en la ejecución
    await pool.request()
        .input('ejecucionId', sql.Int, ejecucionId)
        .query(`
            UPDATE dbo.Ejecucion
            SET ItemsCompletados = (
                    SELECT COUNT(*) FROM dbo.EjecucionDetalle 
                    WHERE EjecucionID = @ejecucionId AND Completado IS NOT NULL
                ),
                ItemsCumplidos = (
                    SELECT COUNT(*) FROM dbo.EjecucionDetalle 
                    WHERE EjecucionID = @ejecucionId AND Completado = 1
                ),
                ItemsNoCumplidos = (
                    SELECT COUNT(*) FROM dbo.EjecucionDetalle 
                    WHERE EjecucionID = @ejecucionId AND Completado = 0
                )
            WHERE EjecucionID = @ejecucionId
        `);
    
    return { success: true };
}
/**
 * Finalizar una ejecución
 */
async function finalizarEjecucion(ejecucionId) {
    const pool = getPool();
    
    // 1. Calcular estadísticas
    const statsResult = await pool.request()
        .input('ejecucionId', sql.Int, ejecucionId)
        .query(`
            SELECT 
                COUNT(*) AS total,
                SUM(CASE WHEN Completado = 1 THEN 1 ELSE 0 END) AS cumplidos,
                SUM(CASE WHEN Completado = 0 THEN 1 ELSE 0 END) AS noCumplidos
            FROM dbo.EjecucionDetalle
            WHERE EjecucionID = @ejecucionId
        `);
    
    const stats = statsResult.recordset[0];
    const porcentaje = stats.total > 0 
        ? Math.round((stats.cumplidos / stats.total) * 100) 
        : 0;
    
    // 2. Actualizar la ejecución
    await pool.request()
        .input('ejecucionId', sql.Int, ejecucionId)
        .input('itemsCompletados', sql.Int, stats.cumplidos + stats.noCumplidos)
        .input('itemsCumplidos', sql.Int, stats.cumplidos)
        .input('itemsNoCumplidos', sql.Int, stats.noCumplidos)
        .input('porcentaje', sql.Decimal(5, 2), porcentaje)
        .query(`
            UPDATE dbo.Ejecucion
            SET Estado = 'COMPLETADA',
                HoraFin = CAST(GETDATE() AS TIME(0)),
                FechaFinalizacion = GETDATE(),
                ItemsCompletados = @itemsCompletados,
                ItemsCumplidos = @itemsCumplidos,
                ItemsNoCumplidos = @itemsNoCumplidos,
                PorcentajeCumplimiento = @porcentaje
            WHERE EjecucionID = @ejecucionId
        `);
    
    return {
        id: ejecucionId,
        estado: 'COMPLETADA',
        itemsCumplidos: stats.cumplidos,
        itemsNoCumplidos: stats.noCumplidos,
        porcentaje: porcentaje
    };
}

/**
 * Obtener estado de ejecuciones por categoría para una sede y fecha
 */
/**
 * Obtener estado de ejecuciones por categoría para una sede y fecha
 */
async function getEstadoPorCategoria(sedeId, fecha, tipoCodigo) {
    const pool = getPool();
    
    const result = await pool.request()
        .input('sedeId', sql.Int, sedeId)
        .input('fecha', sql.Date, fecha)
        .input('tipoCodigo', sql.VarChar(20), tipoCodigo)
        .query(`
            SELECT 
                cp.CategoriaID AS categoriaId,
                COUNT(DISTINCT p.PlantillaID) AS totalPlantillas,
                COUNT(DISTINCT CASE WHEN e.Estado = 'COMPLETADA' THEN e.PlantillaID END) AS completadas
            FROM dbo.CategoriaPlantilla cp
            INNER JOIN dbo.TipoPlantilla tp ON cp.TipoPlantillaID = tp.TipoPlantillaID
            LEFT JOIN dbo.Plantilla p ON cp.CategoriaID = p.CategoriaID AND p.Activa = 1
            LEFT JOIN dbo.Ejecucion e ON p.PlantillaID = e.PlantillaID 
                AND e.SedeID = @sedeId 
                AND e.FechaEjecucion = @fecha
            WHERE tp.Codigo = @tipoCodigo AND cp.Activo = 1
            GROUP BY cp.CategoriaID
        `);
    
    return result.recordset;
}

/**
 * Buscar ejecución existente para una fecha específica
 */
async function buscarEjecucion(plantillaId, sedeId, fecha = null) {
    const pool = getPool();
    
    // Si no se pasa fecha, usar hoy
    const fechaBusqueda = fecha || new Date().toISOString().split('T')[0];
    
    const result = await pool.request()
        .input('plantillaId', sql.Int, plantillaId)
        .input('sedeId', sql.Int, sedeId)
        .input('fecha', sql.Date, fechaBusqueda)
        .query(`
            SELECT 
                e.EjecucionID AS id,
                e.PlantillaID AS plantillaId,
                e.NombrePlantilla AS nombrePlantilla,
                e.Estado AS estado,
                e.ItemsTotal AS itemsTotal,
                e.ItemsCompletados AS itemsCompletados,
                e.ItemsCumplidos AS itemsCumplidos,
                e.ItemsNoCumplidos AS itemsNoCumplidos,
                e.PorcentajeCumplimiento AS porcentaje,
                CONVERT(VARCHAR(5), e.HoraInicio, 108) AS horaInicio,
                CONVERT(VARCHAR(5), e.HoraFin, 108) AS horaFin,
                CONVERT(VARCHAR(10), e.FechaEjecucion, 120) AS fecha
            FROM dbo.Ejecucion e
            WHERE e.PlantillaID = @plantillaId 
                AND e.SedeID = @sedeId
                AND e.FechaEjecucion = @fecha
            ORDER BY e.EjecucionID DESC
        `);
    
    if (result.recordset.length === 0) {
        return null;
    }
    
    const ejecucion = result.recordset[0];
    
    // Cargar los items
    const itemsResult = await pool.request()
        .input('ejecucionId', sql.Int, ejecucion.id)
        .query(`
            SELECT 
                ed.ItemID AS id,
                ed.TituloItem AS titulo,
                pi.Descripcion AS descripcion,
                ed.OrdenItem AS orden,
                pi.TipoRespuesta AS tipoRespuesta,
                ed.EsCritico AS esCritico,
                ed.Completado AS completado,
                ed.Resultado AS resultado,
                ed.Observacion AS observacion
            FROM dbo.EjecucionDetalle ed
            INNER JOIN dbo.PlantillaItem pi ON ed.ItemID = pi.ItemID
            WHERE ed.EjecucionID = @ejecucionId
            ORDER BY ed.OrdenItem
        `);
    
    ejecucion.items = itemsResult.recordset;
    
    return ejecucion;
}

/**
 * Obtener estado de plantillas de una categoría para sede y fecha
 */
async function getEstadoPlantillas(categoriaId, sedeId, fecha) {
    const pool = getPool();

    const result = await pool.request()
        .input('categoriaId', sql.Int, categoriaId)
        .input('sedeId', sql.Int, sedeId)
        .input('fecha', sql.Date, fecha)
        .query(`
            SELECT
                p.PlantillaID AS plantillaId,
                e.Estado AS estado,
                e.PorcentajeCumplimiento AS porcentaje
            FROM dbo.Plantilla p
            LEFT JOIN dbo.Ejecucion e ON p.PlantillaID = e.PlantillaID
                AND e.SedeID = @sedeId
                AND e.FechaEjecucion = @fecha
            WHERE p.CategoriaID = @categoriaId AND p.Activa = 1
        `);

    return result.recordset;
}

module.exports = {
    iniciarEjecucion,
    guardarRespuestaItem,
    finalizarEjecucion,
    getEstadoPorCategoria,
    buscarEjecucion,
    getEstadoPlantillas
};
