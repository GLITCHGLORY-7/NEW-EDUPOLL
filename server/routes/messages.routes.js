const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const ctrl = require('../controllers/messagesController');

router.use(verifyToken);

router.get('/conversations', ctrl.getConversations);
router.post('/conversation', ctrl.getOrCreateConv);
router.get('/unread-count', ctrl.getUnreadCount);
router.get('/staff-list/:classroomId', ctrl.getClassroomStaff);
router.get('/:conversationId', ctrl.getMessages);
router.post('/', ctrl.sendMessage);
router.delete('/conversations/:conversationId', ctrl.deleteConversation);
router.delete('/:messageId', ctrl.deleteMessage);

module.exports = router;
