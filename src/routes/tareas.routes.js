const express = require('express');
const router = express.Router();
const tareasController = require('../controllers/tareas.controller');

// GET /api/tareas/categorias/CHECKLIST
router.get('/categorias/:tipo', tareasController.getCategorias);

// GET /api/tareas/plantillas/1
router.get('/plantillas/:categoriaId', tareasController.getPlantillas);

module.exports = router;