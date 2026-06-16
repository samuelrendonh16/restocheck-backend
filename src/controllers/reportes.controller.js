const reportesModel = require('../models/reportes.model');

/**
 * GET /api/reportes/compliance/:empresaId?inicio=YYYY-MM-DD&fin=YYYY-MM-DD
 */
async function getCompliance(req, res, next) {
    try {
        const { empresaId } = req.params;
        const { inicio, fin } = req.query;

        // Si no se pasan fechas, usar el último mes por defecto
        const hoy = new Date();
        const fechaFin = fin || hoy.toISOString().split('T')[0];

        let fechaInicio = inicio;
        if (!fechaInicio) {
            const haceUnMes = new Date(hoy);
            haceUnMes.setMonth(hoy.getMonth() - 1);
            fechaInicio = haceUnMes.toISOString().split('T')[0];
        }

        console.log('📥 Compliance - empresa:', empresaId, 'rango:', fechaInicio, 'a', fechaFin);

        const data = await reportesModel.getCompliancePorSede(
            parseInt(empresaId),
            fechaInicio,
            fechaFin
        );

        res.json({
            success: true,
            data: data
        });

    } catch (error) {
        console.log('❌ Error:', error.message);
        next(error);
    }
}

/**
 * GET /api/reportes/incidencias/:empresaId?inicio=YYYY-MM-DD&fin=YYYY-MM-DD
 */
async function getIncidencias(req, res, next) {
    try {
        const { empresaId } = req.params;
        const { inicio, fin } = req.query;

        const hoy = new Date();
        const fechaFin = fin || hoy.toISOString().split('T')[0];

        let fechaInicio = inicio;
        if (!fechaInicio) {
            const haceUnMes = new Date(hoy);
            haceUnMes.setMonth(hoy.getMonth() - 1);
            fechaInicio = haceUnMes.toISOString().split('T')[0];
        }

        console.log('📥 Incidencias - empresa:', empresaId, 'rango:', fechaInicio, 'a', fechaFin);

        const data = await reportesModel.getIncidencias(
            parseInt(empresaId),
            fechaInicio,
            fechaFin
        );

        res.json({
            success: true,
            data: data
        });

    } catch (error) {
        console.log('❌ Error:', error.message);
        next(error);
    }
}

/**
 * GET /api/reportes/ranking/:empresaId?inicio=YYYY-MM-DD&fin=YYYY-MM-DD
 */
async function getRanking(req, res, next) {
    try {
        const { empresaId } = req.params;
        const { inicio, fin } = req.query;

        const hoy = new Date();
        const fechaFin = fin || hoy.toISOString().split('T')[0];

        let fechaInicio = inicio;
        if (!fechaInicio) {
            const haceUnMes = new Date(hoy);
            haceUnMes.setMonth(hoy.getMonth() - 1);
            fechaInicio = haceUnMes.toISOString().split('T')[0];
        }

        console.log('📥 Ranking - empresa:', empresaId, 'rango:', fechaInicio, 'a', fechaFin);

        const data = await reportesModel.getRankingSedes(
            parseInt(empresaId),
            fechaInicio,
            fechaFin
        );

        res.json({
            success: true,
            data: data
        });

    } catch (error) {
        console.log('❌ Error:', error.message);
        next(error);
    }
}

module.exports = {
    getCompliance,
    getIncidencias,
    getRanking
};
