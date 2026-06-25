/**
 * PLANTILLA MODEL - PostgreSQL
 */

const { getPool } = require('../config/database');

/**
 * Obtener categorías por tipo (CHECKLIST o AUDITORIA)
 */
async function getCategoriasPorTipo(tipoCodigo) {
    const pool = getPool();
    const result = await pool.query(`
        SELECT
            cp.CategoriaID AS "id",
            cp.Codigo AS "codigo",
            cp.Nombre AS "nombre",
            cp.Orden AS "orden"
        FROM CategoriaPlantilla cp
        INNER JOIN TipoPlantilla tp ON cp.TipoPlantillaID = tp.TipoPlantillaID
        WHERE tp.Codigo = $1 AND cp.Activo = TRUE
        ORDER BY cp.Orden
    `, [tipoCodigo]);
    return result.rows;
}

/**
 * Obtener plantillas de una categoría específica
 */
async function getPlantillasPorCategoria(categoriaId, empresaId) {
    const pool = getPool();
    const result = await pool.query(`
        SELECT
            p.PlantillaID AS "id",
            p.Nombre AS "nombre",
            p.Descripcion AS "descripcion"
        FROM Plantilla p
        WHERE p.CategoriaID = $1
          AND p.EmpresaID = $2
          AND p.Activa = TRUE
        ORDER BY p.Nombre
    `, [categoriaId, empresaId]);
    return result.rows;
}

/**
 * Listar todas las plantillas de una empresa (para configuración)
 */
async function getPlantillasEmpresa(empresaId) {
    const pool = getPool();
    const result = await pool.query(`
        SELECT
            p.PlantillaID AS "id",
            p.Nombre AS "nombre",
            p.Descripcion AS "descripcion",
            tp.Codigo AS "tipoCodigo",
            tp.Nombre AS "tipoNombre",
            cp.CategoriaID AS "categoriaId",
            cp.Nombre AS "categoriaNombre",
            (SELECT COUNT(*) FROM PlantillaItem pi
             WHERE pi.PlantillaID = p.PlantillaID AND pi.Activo = TRUE) AS "totalItems"
        FROM Plantilla p
        INNER JOIN TipoPlantilla tp ON p.TipoPlantillaID = tp.TipoPlantillaID
        INNER JOIN CategoriaPlantilla cp ON p.CategoriaID = cp.CategoriaID
        WHERE p.EmpresaID = $1 AND p.Activa = TRUE
        ORDER BY tp.Codigo, cp.Orden, p.Nombre
    `, [empresaId]);
    return result.rows;
}

/**
 * Crear una nueva plantilla
 */
async function crearPlantilla(empresaId, nombre, descripcion, tipoCodigo, categoriaId) {
    const pool = getPool();

    // Obtener el TipoPlantillaID a partir del código
    const tipoResult = await pool.query(
        `SELECT TipoPlantillaID AS "tipoPlantillaId" FROM TipoPlantilla WHERE Codigo = $1`,
        [tipoCodigo]
    );

    if (tipoResult.rows.length === 0) {
        throw new Error('Tipo de plantilla no encontrado');
    }

    const tipoPlantillaId = tipoResult.rows[0].tipoPlantillaId;

    const result = await pool.query(`
        INSERT INTO Plantilla
            (EmpresaID, TipoPlantillaID, CategoriaID, Nombre, Descripcion, CreadoPor)
        VALUES
            ($1, $2, $3, $4, $5, 'CONFIG')
        RETURNING PlantillaID AS "id", Nombre AS "nombre"
    `, [empresaId, tipoPlantillaId, categoriaId, nombre, descripcion || null]);

    return result.rows[0];
}

/**
 * Eliminar (desactivar) una plantilla
 */
async function eliminarPlantilla(plantillaId) {
    const pool = getPool();
    await pool.query(`
        UPDATE Plantilla
        SET Activa = FALSE,
            FechaModificacion = NOW(),
            ModificadoPor = 'CONFIG'
        WHERE PlantillaID = $1
    `, [plantillaId]);
    return { success: true };
}

/**
 * Obtener items de una plantilla
 */
async function getItemsPlantilla(plantillaId) {
    const pool = getPool();
    const result = await pool.query(`
        SELECT
            ItemID AS "id",
            Titulo AS "titulo",
            Descripcion AS "descripcion",
            Orden AS "orden",
            TipoRespuesta AS "tipoRespuesta",
            EsCritico AS "esCritico",
            RequiereEvidencia AS "requiereEvidencia"
        FROM PlantillaItem
        WHERE PlantillaID = $1 AND Activo = TRUE
        ORDER BY Orden
    `, [plantillaId]);
    return result.rows;
}

/**
 * Agregar item a una plantilla
 */
async function crearItem(plantillaId, titulo, descripcion, tipoRespuesta, esCritico) {
    const pool = getPool();

    // Calcular el siguiente orden
    const ordenResult = await pool.query(`
        SELECT COALESCE(MAX(Orden), 0) + 1 AS "siguienteOrden"
        FROM PlantillaItem
        WHERE PlantillaID = $1
    `, [plantillaId]);

    const orden = ordenResult.rows[0].siguienteOrden;

    const result = await pool.query(`
        INSERT INTO PlantillaItem
            (PlantillaID, Titulo, Descripcion, Orden, TipoRespuesta, EsCritico)
        VALUES
            ($1, $2, $3, $4, $5, $6)
        RETURNING ItemID AS "id", Titulo AS "titulo"
    `, [plantillaId, titulo, descripcion || null, orden, tipoRespuesta, esCritico ? true : false]);

    return result.rows[0];
}

/**
 * Eliminar (desactivar) un item
 */
async function eliminarItem(itemId) {
    const pool = getPool();
    await pool.query(`
        UPDATE PlantillaItem
        SET Activo = FALSE
        WHERE ItemID = $1
    `, [itemId]);
    return { success: true };
}

module.exports = {
    getCategoriasPorTipo,
    getPlantillasPorCategoria,
    getPlantillasEmpresa,
    crearPlantilla,
    eliminarPlantilla,
    getItemsPlantilla,
    crearItem,
    eliminarItem
};
