const express = require('express');
const router = express.Router();
const classroomsController = require('../controllers/classroomsController');
const { verifyToken } = require('../middleware/auth');

router.get('/', verifyToken, classroomsController.getClassrooms);
router.post('/', verifyToken, classroomsController.createClassroom);
router.put('/:id', verifyToken, classroomsController.updateClassroom);
router.delete('/:id', verifyToken, classroomsController.deleteClassroom);

module.exports = router;
