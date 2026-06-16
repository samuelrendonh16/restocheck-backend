const express = require('express');
const router = express.Router();
const panelController = require('../controllers/panel.controller');

router.get('/resumen/:sedeId', panelController.getResumen);

module.exports = router;
