const express = require('express');
const router = express.Router();
<<<<<<< HEAD
const { getAllNews, addNews, deleteNews } = require('../controllers/newsController');
=======
const { getAllNews, addNews, deleteNews, updateNews } = require('../controllers/newsController');
>>>>>>> 093b684 (initial server commit)
const { protect, adminOnly } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');

router.get('/', getAllNews);
router.post('/add', protect, adminOnly, upload.single('image'), addNews);
<<<<<<< HEAD
router.delete('/:id', protect, adminOnly, deleteNews);

=======
router.put('/:id', protect, adminOnly, upload.single('image'), updateNews);
router.delete('/:id', protect, adminOnly, deleteNews);


>>>>>>> 093b684 (initial server commit)
module.exports = router;
