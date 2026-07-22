const express = require('express');
const router = express.Router();
const studentAppController = require('../controllers/studentAppController');
const { verifyToken } = require('../middleware/auth');

router.get('/polls', verifyToken, studentAppController.getActivePolls);
router.get('/polls/all', verifyToken, studentAppController.getAllPolls);
router.get('/polls/:id', verifyToken, studentAppController.getPollById);
router.get('/me', verifyToken, studentAppController.getStudentProfile);
router.get('/responses', verifyToken, studentAppController.getStudentResponses);
router.post('/polls/:id/answer', verifyToken, studentAppController.answerPoll);
router.delete('/responses/:pollId', verifyToken, studentAppController.deleteResponseByPoll);
router.delete('/responses/id/:responseId', verifyToken, studentAppController.deleteResponseById);

module.exports = router;
