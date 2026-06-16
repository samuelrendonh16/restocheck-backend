/**
 * PLANTILLA MODEL
 */

const { getPool, sql } = require('../config/database');

/**
 * Obtener categorías por tipo (CHECKLIST o AUDITORIA)
 */
async function getCategoriasPorTipo(tipoCodigo) {
    const pool = getPool();
    
    const result = await pool.request()
        .input('tipoCodigo', sql.VarChar(20), tipoCodigo)
        .query(`
            SELECT 
                cp.CategoriaID AS id,
                cp.Codigo AS codigo,
                cp.Nombre AS nombre,
                cp.Orden AS orden
            FROM dbo.CategoriaPlantilla cp
            INNER JOIN dbo.TipoPlantilla tp ON cp.TipoPlantillaID = tp.TipoPlantillaID
            WHERE tp.Codigo = @tipoCodigo
              AND cp.Activo = 1
            ORDER BY cp.Orden
        `);
    
    return result.recordset;
}

/**
 * Obtener plantillas de una categoría específica
 */
async function getPlantillasPorCategoria(categoriaId, empresaId) {
    const pool = getPool();
    
    const result = await pool.request()
        .input('categoriaId', sql.Int, categoriaId)
        .input('empresaId', sql.Int, empresaId)
        .query(`
            SELECT 
                p.PlantillaID AS id,
                p.Nombre AS nombre,
                p.Descripcion AS descripcion
            FROM dbo.Plantilla p
            WHERE p.CategoriaID = @categoriaId
              AND p.EmpresaID = @empresaId
              AND p.Activa = 1
            ORDER BY p.Nombre
        `);
    
    return result.recordset;
}

/**
 * Listar todas las plantillas de una empresa (para configuración)
 */
async function getPlantillasEmpresa(empresaId) {
    const pool = getPool();

    const result = await pool.request()
        .input('empresaId', sql.Int, empresaId)
        .query(`
            SELECT
                p.PlantillaID AS id,
                p.Nombre AS nombre,
                p.Descripcion AS descripcion,
                tp.Codigo AS tipoCodigo,
                tp.Nombre AS tipoNombre,
                cp.CategoriaID AS categoriaId,
                cp.Nombre AS categoriaNombre,
                (SELECT COUNT(*) FROM dbo.PlantillaItem pi
                 WHERE pi.PlantillaID = p.PlantillaID AND pi.Activo = 1) AS totalItems
            FROM dbo.Plantilla p
            INNER JOIN dbo.TipoPlantilla tp ON p.TipoPlantillaID = tp.TipoPlantillaID
            INNER JOIN dbo.CategoriaPlantilla cp ON p.CategoriaID = cp.CategoriaID
            WHERE p.EmpresaID = @empresaId AND p.Activa = 1
            ORDER BY tp.Codigo, cp.Orden, p.Nombre
        `);

    return result.recordset;
}

/**
 * Crear una nueva plantilla
 */
async function crearPlantilla(empresaId, nombre, descripcion, tipoCodigo, categoriaId) {
    const pool = getPool();

    // Obtener el TipoPlantillaID a partir del código
    const tipoResult = await pool.request()
        .input('tipoCodigo', sql.VarChar(20), tipoCodigo)
        .query(`SELECT TipoPlantillaID FROM dbo.TipoPlantilla WHERE Codigo = @tipoCodigo`);

    if (tipoResult.recordset.length === 0) {
        throw new Error('Tipo de plantilla no encontrado');
    }

    const tipoPlantillaId = tipoResult.recordset[0].TipoPlantillaID;

    const result = await pool.request()
        .input('empresaId', sql.Int, empresaId)
        .input('tipoPlantillaId', sql.Int, tipoPlantillaId)
        .input('categoriaId', sql.Int, categoriaId)
        .input('nombre', sql.NVarChar(100), nombre)
        .input('descripcion', sql.NVarChar(500), descripcion || null)
        .query(`
            INSERT INTO dbo.Plantilla
                (EmpresaID, TipoPlantillaID, CategoriaID, Nombre, Descripcion, CreadoPor)
            OUTPUT INSERTED.PlantillaID AS id, INSERTED.Nombre AS nombre
            VALUES
                (@empresaId, @tipoPlantillaId, @categoriaId, @nombre, @descripcion, 'CONFIG')
        `);

    return result.recordset[0];
}

/**
 * Eliminar (desactivar) una plantilla
 */
async function eliminarPlantilla(plantillaId) {
    const pool = getPool();

    await pool.request()
        .input('plantillaId', sql.Int, plantillaId)
        .query(`
            UPDATE dbo.Plantilla
            SET Activa = 0,
                FechaModificacion = GETDATE(),
                ModificadoPor = 'CONFIG'
            WHERE PlantillaID = @plantillaId
        `);

    return { success: true };
}

/**
 * Obtener items de una plantilla
 */
async function getItemsPlantilla(plantillaId) {
    const pool = getPool();

    const result = await pool.request()
        .input('plantillaId', sql.Int, plantillaId)
        .query(`
            SELECT
                ItemID AS id,
                Titulo AS titulo,
                Descripcion AS descripcion,
                Orden AS orden,
                TipoRespuesta AS tipoRespuesta,
                EsCritico AS esCritico,
                RequiereEvidencia AS requiereEvidencia
            FROM dbo.PlantillaItem
            WHERE PlantillaID = @plantillaId AND Activo = 1
            ORDER BY Orden
        `);

    return result.recordset;
}

/**
 * Agregar item a una plantilla
 */
async function crearItem(plantillaId, titulo, descripcion, tipoRespuesta, esCritico) {
    const pool = getPool();

    // Calcular el siguiente orden
    const ordenResult = await pool.request()
        .input('plantillaId', sql.Int, plantillaId)
        .query(`
            SELECT ISNULL(MAX(Orden), 0) + 1 AS siguienteOrden
            FROM dbo.PlantillaItem
            WHERE PlantillaID = @plantillaId
        `);

    const orden = ordenResult.recordset[0].siguienteOrden;

    const result = await pool.request()
        .input('plantillaId', sql.Int, plantillaId)
        .input('titulo', sql.NVarChar(100), titulo)
        .input('descripcion', sql.NVarChar(500), descripcion || null)
        .input('orden', sql.Int, orden)
        .input('tipoRespuesta', sql.VarChar(20), tipoRespuesta)
        .input('esCritico', sql.Bit, esCritico ? 1 : 0)
        .query(`
            INSERT INTO dbo.PlantillaItem
                (PlantillaID, Titulo, Descripcion, Orden, TipoRespuesta, EsCritico)
            OUTPUT INSERTED.ItemID AS id, INSERTED.Titulo AS titulo
            VALUES
                (@plantillaId, @titulo, @descripcion, @orden, @tipoRespuesta, @esCritico)
        `);

    return result.recordset[0];
}

/**
 * Eliminar (desactivar) un item
 */
async function eliminarItem(itemId) {
    const pool = getPool();

    await pool.request()
        .input('itemId', sql.Int, itemId)
        .query(`
            UPDATE dbo.PlantillaItem
            SET Activo = 0
            WHERE ItemID = @itemId
        `);

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