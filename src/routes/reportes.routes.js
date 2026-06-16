const express = require('express');
const router = express.Router();
const reportesController = require('../controllers/reportes.controller');

router.get('/compliance/:empresaId', reportesController.getCompliance);
router.get('/incidencias/:empresaId', reportesController.getIncidencias);
router.get('/ranking/:empresaId', reportesController.getRanking);

module.exports = router;
