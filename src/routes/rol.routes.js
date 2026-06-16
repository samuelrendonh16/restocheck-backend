const express = require('express');
const router = express.Router();
const rolController = require('../controllers/rol.controller');

// Matriz - ruta específica primero
router.get('/:empresaId/matriz', rolController.getMatriz);

// Actualizar permiso
router.put('/:rolId/permiso/:permisoId', rolController.actualizarPermiso);

// Listar roles
router.get('/:empresaId', rolController.getRoles);

module.exports = router;
