const plantillaModel = require('../models/plantilla.model');

/**
 * GET /api/plantillas-config/:empresaId
 */
async function getPlantillas(req, res, next) {
    try {
        const { empresaId } = req.params;

        console.log('📥 Listando plantillas - empresa:', empresaId);

        const plantillas = await plantillaModel.getPlantillasEmpresa(parseInt(empresaId));

        res.json({
            success: true,
            data: plantillas
        });

    } catch (error) {
        console.log('❌ Error:', error.message);
        next(error);
    }
}

/**
 * POST /api/plantillas-config
 */
async function crearPlantilla(req, res, next) {
    try {
        const { empresaId, nombre, descripcion, tipoCodigo, categoriaId } = req.body;

        // Validaciones
        if (!nombre || !nombre.trim()) {
            return res.status(400).json({
                success: false,
                error: { message: 'El nombre es obligatorio' }
            });
        }

        if (!tipoCodigo) {
            return res.status(400).json({
                success: false,
                error: { message: 'El tipo es obligatorio' }
            });
        }

        if (!categoriaId) {
            return res.status(400).json({
                success: false,
                error: { message: 'La categoría es obligatoria' }
            });
        }

        console.log('📥 Creando plantilla:', nombre);

        const plantilla = await plantillaModel.crearPlantilla(
            parseInt(empresaId),
            nombre.trim(),
            descripcion,
            tipoCodigo,
            parseInt(categoriaId)
        );

        console.log('✅ Plantilla creada:', plantilla.id);

        res.json({
            success: true,
            data: plantilla
        });

    } catch (error) {
        console.log('❌ Error:', error.message);
        next(error);
    }
}

/**
 * DELETE /api/plantillas-config/:plantillaId
 */
async function eliminarPlantilla(req, res, next) {
    try {
        const { plantillaId } = req.params;

        console.log('📥 Eliminando plantilla:', plantillaId);

        await plantillaModel.eliminarPlantilla(parseInt(plantillaId));

        console.log('✅ Plantilla eliminada');

        res.json({
            success: true,
            message: 'Plantilla eliminada'
        });

    } catch (error) {
        console.log('❌ Error:', error.message);
        next(error);
    }
}

/**
 * GET /api/plantillas-config/:plantillaId/items
 */
async function getItems(req, res, next) {
    try {
        const { plantillaId } = req.params;

        console.log('📥 Listando items - plantilla:', plantillaId);

        const items = await plantillaModel.getItemsPlantilla(parseInt(plantillaId));

        res.json({
            success: true,
            data: items
        });

    } catch (error) {
        console.log('❌ Error:', error.message);
        next(error);
    }
}

/**
 * POST /api/plantillas-config/:plantillaId/items
 */
async function crearItem(req, res, next) {
    try {
        const { plantillaId } = req.params;
        const { titulo, descripcion, tipoRespuesta, esCritico } = req.body;

        // Validaciones
        if (!titulo || !titulo.trim()) {
            return res.status(400).json({
                success: false,
                error: { message: 'El título del item es obligatorio' }
            });
        }

        console.log('📥 Creando item:', titulo);

        const item = await plantillaModel.crearItem(
            parseInt(plantillaId),
            titulo.trim(),
            descripcion,
            tipoRespuesta || 'CHECKBOX',
            esCritico || false
        );

        console.log('✅ Item creado:', item.id);

        res.json({
            success: true,
            data: item
        });

    } catch (error) {
        console.log('❌ Error:', error.message);
        next(error);
    }
}

/**
 * DELETE /api/plantillas-config/items/:itemId
 */
async function eliminarItem(req, res, next) {
    try {
        const { itemId } = req.params;

        console.log('📥 Eliminando item:', itemId);

        await plantillaModel.eliminarItem(parseInt(itemId));

        console.log('✅ Item eliminado');

        res.json({
            success: true,
            message: 'Item eliminado'
        });

    } catch (error) {
        console.log('❌ Error:', error.message);
        next(error);
    }
}

module.exports = {
    getPlantillas,
    crearPlantilla,
    eliminarPlantilla,
    getItems,
    crearItem,
    eliminarItem
};
