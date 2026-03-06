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

module.exports = {
    getCategoriasPorTipo,
    getPlantillasPorCategoria
};