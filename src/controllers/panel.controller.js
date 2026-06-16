const panelModel = require('../models/panel.model');

/**
 * GET /api/panel/resumen/:sedeId?fecha=YYYY-MM-DD
 */
async function getResumen(req, res, next) {
    try {
        const { sedeId } = req.params;
        const { fecha } = req.query;

        const fechaConsulta = fecha || new Date().toISOString().split('T')[0];

        console.log('📥 Panel resumen - sede:', sedeId, 'fecha:', fechaConsulta);

        const resumen = await panelModel.getResumenPanel(
            parseInt(sedeId),
            fechaConsulta
        );

        console.log('✅ Resumen obtenido');

        res.json({
            success: true,
            data: resumen
        });

    } catch (error) {
        console.log('❌ Error:', error.message);
        next(error);
    }
}

module.exports = {
    getResumen
};
