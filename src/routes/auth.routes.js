/**
 * RUTAS DE AUTENTICACIÓN
 * Prefijo: /api/auth
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

/**
 * GET /api/auth/users
 * Listar todos los usuarios activos
 */
router.get('/users', authController.listUsers);

/**
 * GET /api/auth/users/:id
 * Obtener un usuario por ID
 */
router.get('/users/:id', authController.getUserById);

/**
 * POST /api/auth/login
 * Login de prueba (sin contraseña)
 * Body: { "nombreUsuario": "superadmin" }
 */
router.post('/login', authController.loginTest);

module.exports = router;