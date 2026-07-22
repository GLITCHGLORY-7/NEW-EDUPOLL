const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { verifyToken } = require('../middleware/auth');

router.post('/generate-poll', verifyToken, aiController.generatePoll);
router.post('/generate-summary', verifyToken, aiController.generateSummary);

module.exports = router;
