const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const authenticate = require('../middlewares/authMiddleware');

router.post('/create-post', authenticate, postController.createPost);
router.get('/posts', postController.getAllPosts);

// 🔑 CRITICAL FIX: Place the specific route FIRST
router.get('/posts/user/:authorId', authenticate, postController.getPostsByAuthorId);

// The generic route MUST come AFTER the specific one
router.get('/posts/:postId', postController.getPostById); 

router.put("/posts/:id", authenticate, postController.updatePost);
router.delete("/posts/:postId", authenticate, postController.deletePost);

module.exports = router;