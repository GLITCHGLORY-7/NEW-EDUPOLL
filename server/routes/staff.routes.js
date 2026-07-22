const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staffController');
const { verifyToken } = require('../middleware/auth');

router.get('/', verifyToken, staffController.getStaff);
router.get('/notifications', verifyToken, staffController.getNotifications);
router.delete('/:id', verifyToken, staffController.deleteStaff);
router.put('/:id', verifyToken, staffController.updateStaff);

module.exports = router;
