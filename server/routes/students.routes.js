const express = require('express');
const router = express.Router();
const studentsController = require('../controllers/studentsController');
const { verifyToken } = require('../middleware/auth');

router.get('/', verifyToken, studentsController.getStudents);
router.post('/', verifyToken, studentsController.createStudent);
router.put('/:id', verifyToken, studentsController.updateStudent);
router.delete('/:id', verifyToken, studentsController.deleteStudent);

module.exports = router;
