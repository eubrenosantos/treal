const express = require('express');
const router = express.Router();
const { withdraw } = require('../controllers/withdrawalController');

router.post('/pix', withdraw);

module.exports = router; 