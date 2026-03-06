/**
 * TAREAS CONTROLLER
 */

const plantillaModel = require('../models/plantilla.model');

/**
 * GET /api/tareas/categorias/:tipo
 */
async function getCategorias(req, res, next) {
    try {
        const { tipo } = req.params;
        
        console.log('📥 Solicitando categorías para tipo:', tipo);
        
        if (tipo !== 'CHECKLIST' && tipo !== 'AUDITORIA') {
            return res.status(400).json({
                success: false,
                error: 'Tipo debe ser CHECKLIST o AUDITORIA'
            });
        }
        
        console.log('🔍 Consultando base de datos...');
        const categorias = await plantillaModel.getCategoriasPorTipo(tipo);
        
        console.log('✅ Categorías encontradas:', categorias.length);
        
        res.json({
            success: true,
            data: categorias
        });
        
    } catch (error) {
        console.log('❌ Error:', error.message);
        next(error);
    }
}

/**
 * GET /api/tareas/plantillas/:categoriaId
 */
async function getPlantillas(req, res, next) {
    try {
        const { categoriaId } = req.params;
        const empresaId = 1;
        
        console.log('📥 Solicitando plantillas para categoría:', categoriaId);
        
        const plantillas = await plantillaModel.getPlantillasPorCategoria(
            parseInt(categoriaId), 
            empresaId
        );
        
        console.log('✅ Plantillas encontradas:', plantillas.length);
        
        res.json({
            success: true,
            data: plantillas
        });
        
    } catch (error) {
        console.log('❌ Error:', error.message);
        next(error);
    }
}

module.exports = {
    getCategorias,
    getPlantillas
};