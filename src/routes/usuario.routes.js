const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuario.controller');

router.get('/:empresaId', usuarioController.getUsuarios);
router.post('/', usuarioController.crearUsuario);
router.delete('/:usuarioId', usuarioController.eliminarUsuario);

module.exports = router;
