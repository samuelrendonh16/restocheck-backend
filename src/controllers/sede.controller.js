const sedeModel = require('../models/sede.model');

/**
 * GET /api/sedes/:empresaId
 */
async function getSedes(req, res, next) {
    try {
        const { empresaId } = req.params;

        console.log('📥 Listando sedes - empresa:', empresaId);

        const sedes = await sedeModel.getSedes(parseInt(empresaId));

        res.json({
            success: true,
            data: sedes
        });

    } catch (error) {
        console.log('❌ Error:', error.message);
        next(error);
    }
}

/**
 * GET /api/sedes/tipos/lista
 */
async function getTiposSede(req, res, next) {
    try {
        const tipos = await sedeModel.getTiposSede();

        res.json({
            success: true,
            data: tipos
        });

    } catch (error) {
        console.log('❌ Error:', error.message);
        next(error);
    }
}

/**
 * POST /api/sedes
 */
async function crearSede(req, res, next) {
    try {
        const { empresaId, nombre, codigoCorto, tipoSedeId, ciudad } = req.body;

        // Validaciones básicas
        if (!nombre || !codigoCorto || !tipoSedeId) {
            return res.status(400).json({
                success: false,
                error: { message: 'Nombre, código y tipo son obligatorios' }
            });
        }

        if (codigoCorto.length !== 3) {
            return res.status(400).json({
                success: false,
                error: { message: 'El código debe tener exactamente 3 caracteres' }
            });
        }

        console.log('📥 Creando sede:', nombre);

        const sede = await sedeModel.crearSede(
            parseInt(empresaId),
            nombre,
            codigoCorto.toUpperCase(),
            parseInt(tipoSedeId),
            ciudad
        );

        console.log('✅ Sede creada:', sede.id);

        res.json({
            success: true,
            data: sede
        });

    } catch (error) {
        console.log('❌ Error:', error.message);

        // Error de código duplicado
        if (error.message.includes('UQ_Sede_Empresa_Codigo')) {
            return res.status(400).json({
                success: false,
                error: { message: 'Ya existe una sede con ese código' }
            });
        }

        next(error);
    }
}

/**
 * DELETE /api/sedes/:sedeId
 */
async function eliminarSede(req, res, next) {
    try {
        const { sedeId } = req.params;

        console.log('📥 Eliminando sede:', sedeId);

        await sedeModel.eliminarSede(parseInt(sedeId));

        console.log('✅ Sede eliminada');

        res.json({
            success: true,
            message: 'Sede eliminada'
        });

    } catch (error) {
        console.log('❌ Error:', error.message);
        next(error);
    }
}

module.exports = {
    getSedes,
    getTiposSede,
    crearSede,
    eliminarSede
};
