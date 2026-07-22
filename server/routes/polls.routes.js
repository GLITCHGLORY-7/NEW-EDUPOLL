const express = require('express');
const router = express.Router();
const pollsController = require('../controllers/pollsController');
const pollsResponsesController = require('../controllers/pollsResponsesController');
const { verifyToken } = require('../middleware/auth');

router.get('/', verifyToken, pollsController.getPolls);
router.get('/archived', verifyToken, pollsController.getArchivedPolls);
router.post('/cleanup', verifyToken, pollsController.runManualCleanup);
router.post('/', verifyToken, pollsController.createPoll);
router.post('/:id/restore', verifyToken, pollsController.restorePoll);
router.put('/:id', verifyToken, pollsController.updatePoll);
router.delete('/:id', verifyToken, pollsController.deletePoll);

router.get('/responses-summary', verifyToken, pollsController.getResponsesSummary);
router.get('/:id/results', verifyToken, pollsController.getPollResults);
router.delete('/:id/responses/all', verifyToken, pollsController.clearAllResponses);

router.post('/:pollId/responses/:studentId/reply', verifyToken, pollsResponsesController.replyToResponse);
router.post('/GENERAL/responses/:studentId/message', verifyToken, pollsResponsesController.sendGeneralMessage);
router.delete('/:pollId/responses/:studentId', verifyToken, pollsResponsesController.deleteResponse);

module.exports = router;
