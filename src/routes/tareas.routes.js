const express = require('express');
const router = express.Router();
const tareasController = require('../controllers/tareas.controller');

// Categorías
router.get('/categorias/:tipo', tareasController.getCategorias);

// Estado de categorías
router.get('/estado/:sedeId/:tipo', tareasController.getEstadoCategorias);

// Plantillas
router.get('/plantillas/:categoriaId', tareasController.getPlantillas);
router.get('/plantillas/:categoriaId/estado/:sedeId', tareasController.getEstadoPlantillas);

// Ejecución
router.get('/ejecucion/buscar/:plantillaId/:sedeId', tareasController.buscarEjecucion);
router.post('/ejecucion/iniciar', tareasController.iniciarEjecucion);
router.put('/ejecucion/:ejecucionId/item/:itemId', tareasController.guardarRespuestaItem);
router.put('/ejecucion/:ejecucionId/finalizar', tareasController.finalizarEjecucion);

module.exports = router;