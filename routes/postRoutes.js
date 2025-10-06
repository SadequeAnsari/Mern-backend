
const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
// 🔑 NEW: Import your regular authenticate and the new optional one
const authenticate = require('../middlewares/authMiddleware'); 
const optionalAuthenticate = require('../middlewares/optionalAuthMiddleware'); // Assuming new file path

router.post('/create-post', authenticate, postController.createPost);
// 🔑 FIX: Use optionalAuthenticate here so all users see published, but only logged-in users see their drafts/pending.
router.get('/posts', optionalAuthenticate, postController.getAllPosts); 

// 🔑 CRITICAL FIX: Place the specific route FIRST
router.get('/posts/user/:authorId', authenticate, postController.getPostsByAuthorId);

// The generic route MUST come AFTER the specific one
router.get('/posts/:postId', postController.getPostById); 

router.put("/posts/:id", authenticate, postController.updatePost);

router.put('/posts/:postId/withdraw', authenticate, postController.withdrawPost);

router.delete("/posts/:postId", authenticate, postController.deletePost);

module.exports = router;