/**
 * TAREAS CONTROLLER
 */

const plantillaModel = require('../models/plantilla.model');
const ejecucionModel = require('../models/ejecucion.model');
const rolModel = require('../models/rol.model');

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

/**
 * POST /api/tareas/ejecucion/iniciar
 */
async function iniciarEjecucion(req, res, next) {
    try {
        const { plantillaId, sedeId, usuarioId, rolId } = req.body;

        console.log('📥 Iniciando ejecución:', { plantillaId, sedeId, usuarioId, rolId });

        if (!plantillaId || !sedeId || !usuarioId) {
            return res.status(400).json({
                success: false,
                error: 'plantillaId, sedeId y usuarioId son requeridos'
            });
        }

        // ⭐ VALIDACIÓN DE PERMISOS (parche temporal)
        if (!rolId) {
            return res.status(403).json({
                success: false,
                error: { message: 'No se pudo verificar permisos (rolId ausente)' }
            });
        }

        // 1. Averiguar el tipo de la plantilla
        const tipoPlantilla = await plantillaModel.getTipoPlantilla(parseInt(plantillaId));

        // 2. Determinar qué permiso se requiere según el tipo
        const permisoRequerido = tipoPlantilla === 'AUDITORIA'
            ? 'EJECUTAR_AUDITORIA'
            : 'EJECUTAR_CHECKLIST';

        // 3. Verificar que el rol tenga ese permiso
        const tienePermiso = await rolModel.rolTienePermiso(parseInt(rolId), permisoRequerido);

        if (!tienePermiso) {
            console.log('🚫 Permiso denegado:', permisoRequerido, 'para rol:', rolId);
            return res.status(403).json({
                success: false,
                error: { message: `No tienes permiso para ejecutar ${tipoPlantilla === 'AUDITORIA' ? 'auditorías' : 'checklists'}` }
            });
        }

        // ✅ Tiene permiso, proceder
        const ejecucion = await ejecucionModel.iniciarEjecucion(
            parseInt(plantillaId),
            parseInt(sedeId),
            parseInt(usuarioId)
        );

        console.log('✅ Ejecución creada:', ejecucion.id);

        res.json({
            success: true,
            data: ejecucion
        });

    } catch (error) {
        console.log('❌ Error:', error.message);
        next(error);
    }
}

/**
 * PUT /api/tareas/ejecucion/:ejecucionId/item/:itemId
 */
async function guardarRespuestaItem(req, res, next) {
    try {
        const { ejecucionId, itemId } = req.params;
        const { completado, observacion } = req.body;
        
        console.log('📥 Guardando respuesta:', { ejecucionId, itemId, completado, observacion });
        
        await ejecucionModel.guardarRespuestaItem(
            parseInt(ejecucionId),
            parseInt(itemId),
            completado,
            observacion || null
        );
        
        console.log('✅ Respuesta guardada');
        
        res.json({
            success: true,
            message: 'Respuesta guardada'
        });
        
    } catch (error) {
        console.log('❌ Error:', error.message);
        next(error);
    }
}

/**
 * PUT /api/tareas/ejecucion/:ejecucionId/finalizar
 */
async function finalizarEjecucion(req, res, next) {
    try {
        const { ejecucionId } = req.params;
        
        console.log('📥 Finalizando ejecución:', ejecucionId);
        
        const resultado = await ejecucionModel.finalizarEjecucion(parseInt(ejecucionId));
        
        console.log('✅ Ejecución finalizada:', resultado);
        
        res.json({
            success: true,
            data: resultado
        });
        
    } catch (error) {
        console.log('❌ Error:', error.message);
        next(error);
    }
}

/**
 * GET /api/tareas/estado/:sedeId/:tipo
 */
/**
 * GET /api/tareas/estado/:sedeId/:tipo?fecha=YYYY-MM-DD
 */
async function getEstadoCategorias(req, res, next) {
    try {
        const { sedeId, tipo } = req.params;
        const { fecha } = req.query;
        
        // Si no se pasa fecha, usar hoy
        const fechaConsulta = fecha || new Date().toISOString().split('T')[0];
        
        console.log('📥 Obteniendo estado para sede:', sedeId, 'tipo:', tipo, 'fecha:', fechaConsulta);
        
        const estado = await ejecucionModel.getEstadoPorCategoria(
            parseInt(sedeId),
            fechaConsulta,
            tipo
        );
        
        console.log('✅ Estado obtenido:', estado.length, 'categorías');
        
        res.json({
            success: true,
            data: estado
        });
        
    } catch (error) {
        console.log('❌ Error:', error.message);
        next(error);
    }
}

/**
 * GET /api/tareas/ejecucion/buscar/:plantillaId/:sedeId?fecha=YYYY-MM-DD
 */
async function buscarEjecucion(req, res, next) {
    try {
        const { plantillaId, sedeId } = req.params;
        const { fecha } = req.query; // Fecha opcional
        
        console.log('📥 Buscando ejecución:', plantillaId, sedeId, fecha || 'hoy');
        
        const ejecucion = await ejecucionModel.buscarEjecucion(
            parseInt(plantillaId),
            parseInt(sedeId),
            fecha || null
        );
        
        if (ejecucion) {
            console.log('✅ Ejecución encontrada:', ejecucion.estado);
        } else {
            console.log('ℹ️ No hay ejecución');
        }
        
        res.json({
            success: true,
            data: ejecucion
        });
        
    } catch (error) {
        console.log('❌ Error:', error.message);
        next(error);
    }
}

/**
 * GET /api/tareas/plantillas/:categoriaId/estado/:sedeId?fecha=YYYY-MM-DD
 */
async function getEstadoPlantillas(req, res, next) {
    try {
        const { categoriaId, sedeId } = req.params;
        const { fecha } = req.query;
        
        const fechaConsulta = fecha || new Date().toISOString().split('T')[0];
        
        console.log('📥 Estado plantillas - categoría:', categoriaId, 'sede:', sedeId, 'fecha:', fechaConsulta);
        
        const estado = await ejecucionModel.getEstadoPlantillas(
            parseInt(categoriaId),
            parseInt(sedeId),
            fechaConsulta
        );
        
        res.json({
            success: true,
            data: estado
        });
        
    } catch (error) {
        console.log('❌ Error:', error.message);
        next(error);
    }
}

module.exports = {
    getCategorias,
    getPlantillas,
    iniciarEjecucion,
    guardarRespuestaItem,
    finalizarEjecucion,
    getEstadoCategorias,
    buscarEjecucion,
    getEstadoPlantillas
};
