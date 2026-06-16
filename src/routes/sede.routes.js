const express = require('express');
const router = express.Router();
const sedeController = require('../controllers/sede.controller');

// Tipos de sede (para dropdown) - DEBE ir antes de /:empresaId
router.get('/tipos/lista', sedeController.getTiposSede);

// Listar sedes
router.get('/:empresaId', sedeController.getSedes);

// Crear sede
router.post('/', sedeController.crearSede);

// Eliminar sede
router.delete('/:sedeId', sedeController.eliminarSede);

module.exports = router;
