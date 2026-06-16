const usuarioModel = require('../models/usuario.model');

/**
 * GET /api/usuarios/:empresaId
 */
async function getUsuarios(req, res, next) {
    try {
        const { empresaId } = req.params;

        console.log('📥 Listando usuarios - empresa:', empresaId);

        const usuarios = await usuarioModel.getUsuarios(parseInt(empresaId));

        res.json({
            success: true,
            data: usuarios
        });

    } catch (error) {
        console.log('❌ Error:', error.message);
        next(error);
    }
}

/**
 * POST /api/usuarios
 */
async function crearUsuario(req, res, next) {
    try {
        const { empresaId, nombreCompleto, rolId, sedeId, password } = req.body;

        // Validaciones
        if (!nombreCompleto || !nombreCompleto.trim()) {
            return res.status(400).json({
                success: false,
                error: { message: 'El nombre completo es obligatorio' }
            });
        }

        if (!rolId) {
            return res.status(400).json({
                success: false,
                error: { message: 'El rol es obligatorio' }
            });
        }

        if (!password || password.length < 6) {
            return res.status(400).json({
                success: false,
                error: { message: 'La contraseña debe tener al menos 6 caracteres' }
            });
        }

        console.log('📥 Creando usuario:', nombreCompleto);

        const usuario = await usuarioModel.crearUsuario(
            parseInt(empresaId),
            nombreCompleto.trim(),
            parseInt(rolId),
            sedeId ? parseInt(sedeId) : null,
            password
        );

        console.log('✅ Usuario creado:', usuario.nombreUsuario);

        res.json({
            success: true,
            data: usuario
        });

    } catch (error) {
        console.log('❌ Error:', error.message);
        next(error);
    }
}

/**
 * DELETE /api/usuarios/:usuarioId
 */
async function eliminarUsuario(req, res, next) {
    try {
        const { usuarioId } = req.params;

        console.log('📥 Eliminando usuario:', usuarioId);

        await usuarioModel.eliminarUsuario(parseInt(usuarioId));

        console.log('✅ Usuario eliminado');

        res.json({
            success: true,
            message: 'Usuario eliminado'
        });

    } catch (error) {
        console.log('❌ Error:', error.message);
        next(error);
    }
}

module.exports = {
    getUsuarios,
    crearUsuario,
    eliminarUsuario
};
