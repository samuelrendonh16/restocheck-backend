/**
 * AUTH CONTROLLER
 * Lógica de autenticación y gestión de sesiones
 */

const userModel = require('../models/user.model');

/**
 * Listar todos los usuarios
 * GET /api/auth/users
 */
async function listUsers(req, res, next) {
    try {
        const users = await userModel.getAllUsers();
        
        res.json({
            success: true,
            count: users.length,
            data: users
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Login de prueba (sin validación de contraseña)
 * POST /api/auth/login
 * 
 * Body: { "nombreUsuario": "superadmin" }
 * 
 * NOTA: Este es un login de DESARROLLO.
 * En producción se debe validar la contraseña con hash.
 */
async function loginTest(req, res, next) {
    try {
        const { nombreUsuario } = req.body;
        
        // Validación básica
        if (!nombreUsuario) {
            const error = new Error('El nombre de usuario es requerido');
            error.statusCode = 400;
            throw error;
        }
        
        // Buscar usuario
        const user = await userModel.findByUsername(nombreUsuario);
        
        if (!user) {
            const error = new Error('Usuario no encontrado');
            error.statusCode = 404;
            throw error;
        }
        
        // Verificar si está activo
        if (!user.Activo) {
            const error = new Error('Usuario desactivado');
            error.statusCode = 403;
            throw error;
        }
        
        // Verificar si está bloqueado
        if (user.BloqueadoHasta && new Date(user.BloqueadoHasta) > new Date()) {
            const error = new Error('Usuario bloqueado temporalmente');
            error.statusCode = 403;
            throw error;
        }
        
        // Obtener permisos del rol
        const permisos = await userModel.getPermissionsByRole(user.RolID);
        
        // Obtener sedes asignadas
        const sedes = await userModel.getSedesByUser(
            user.UsuarioID, 
            user.EmpresaID, 
            user.AccesoGlobal
        );
        
        // Obtener IP del cliente
        const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
        
        // Actualizar último acceso
        await userModel.updateLastAccess(user.UsuarioID, clientIP);
        
        // Registrar en log
        await userModel.logActivity({
            empresaId: user.EmpresaID,
            usuarioId: user.UsuarioID,
            accion: 'LOGIN',
            entidad: 'SESION',
            entidadId: user.UsuarioID,
            descripcion: 'Inicio de sesión exitoso (modo prueba)',
            ip: clientIP
        });
        
        // Estructurar respuesta
        const response = {
            success: true,
            message: 'Login exitoso',
            data: {
                usuario: {
                    id: user.UsuarioID,
                    nombreCompleto: user.NombreCompleto,
                    nombreUsuario: user.NombreUsuario,
                    email: user.Email,
                    requiereCambioPass: user.RequiereCambioPass
                },
                empresa: {
                    id: user.EmpresaID,
                    nombre: user.NombreEmpresa,
                    codigo: user.CodigoEmpresa
                },
                rol: {
                    id: user.RolID,
                    nombre: user.NombreRol,
                    codigo: user.CodigoRol,
                    accesoGlobal: user.AccesoGlobal,
                    requiereSede: user.RequiereSede
                },
                permisos: permisos.map(p => ({
                    codigo: p.Codigo,
                    nombre: p.Nombre,
                    modulo: p.Modulo
                })),
                sedes: sedes.map(s => ({
                    id: s.SedeID,
                    nombre: s.Nombre,
                    codigo: s.CodigoCorto,
                    ciudad: s.Ciudad,
                    tipo: s.TipoSede,
                    esPrincipal: s.EsPrincipal
                })),
                // Sede activa por defecto (la principal o la primera)
                sedeActiva: sedes.length > 0 ? {
                    id: sedes.find(s => s.EsPrincipal)?.SedeID || sedes[0].SedeID,
                    nombre: sedes.find(s => s.EsPrincipal)?.Nombre || sedes[0].Nombre,
                    codigo: sedes.find(s => s.EsPrincipal)?.CodigoCorto || sedes[0].CodigoCorto
                } : null
            }
        };
        
        res.json(response);
        
    } catch (error) {
        next(error);
    }
}

/**
 * Obtener información de un usuario específico
 * GET /api/auth/users/:id
 */
async function getUserById(req, res, next) {
    try {
        const { id } = req.params;
        
        const pool = require('../config/database').getPool();
        const sql = require('../config/database').sql;
        
        const result = await pool.request()
            .input('usuarioId', sql.Int, id)
            .query(`
                SELECT 
                    u.UsuarioID,
                    u.NombreCompleto,
                    u.NombreUsuario,
                    u.Email,
                    u.Activo,
                    u.UltimoAcceso,
                    r.Nombre AS NombreRol,
                    e.Nombre AS NombreEmpresa
                FROM dbo.Usuario u
                INNER JOIN dbo.Rol r ON u.RolID = r.RolID
                INNER JOIN dbo.Empresa e ON u.EmpresaID = e.EmpresaID
                WHERE u.UsuarioID = @usuarioId
            `);
        
        if (!result.recordset[0]) {
            const error = new Error('Usuario no encontrado');
            error.statusCode = 404;
            throw error;
        }
        
        res.json({
            success: true,
            data: result.recordset[0]
        });
        
    } catch (error) {
        next(error);
    }
}

module.exports = {
    listUsers,
    loginTest,
    getUserById
};
