const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const ctrl = require('../controllers/announcementsController');

router.use(verifyToken);

router.get('/', ctrl.getAnnouncements);
router.get('/unread-count', ctrl.getUnreadCount);
router.post('/', ctrl.createAnnouncement);
router.patch('/:id', ctrl.updateAnnouncement);
router.delete('/:id', ctrl.deleteAnnouncement);
router.post('/:id/read', ctrl.markRead);

module.exports = router;
