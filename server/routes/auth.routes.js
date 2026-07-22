const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

const { verifyToken } = require('../middleware/auth');

router.post('/register', verifyToken, authController.register);
router.post('/login', authController.login);

module.exports = router;
