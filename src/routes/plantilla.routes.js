const express = require('express');
const router = express.Router();
const plantillaController = require('../controllers/plantilla.controller');

// Items - rutas específicas primero
router.get('/:plantillaId/items', plantillaController.getItems);
router.post('/:plantillaId/items', plantillaController.crearItem);
router.delete('/items/:itemId', plantillaController.eliminarItem);

// Plantillas
router.get('/:empresaId', plantillaController.getPlantillas);
router.post('/', plantillaController.crearPlantilla);
router.delete('/:plantillaId', plantillaController.eliminarPlantilla);

module.exports = router;
