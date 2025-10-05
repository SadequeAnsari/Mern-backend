const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authenticate = require('../middlewares/authMiddleware');
const { authorizeLevel2, authorizeLevel5, authorizeLevel6 , authorizeLevel6Plus } = require('../middlewares/roleMiddleware');

router.post('/register', userController.registerUser);
router.post('/login', userController.loginUser);
router.post('/logout', userController.logoutUser);
router.get('/profile', authenticate, userController.getProfile);
router.put('/profile', authenticate, userController.updateProfile);
router.patch('/delete-account', authenticate, userController.deleteAccount);
router.post('/send-otp', userController.sendOtp);
router.post('/verify-otp', userController.verifyOtp);
router.post('/check-email', userController.checkEmail);
router.post('/set-userid', userController.setUserId);
router.post('/forgot-password', userController.forgotPassword);
router.post('/reset-password', userController.resetPassword);

router.get("/api/users", authenticate,  authorizeLevel5, userController.getAllUsers);

// 🔑 FIX: This defines the missing endpoint '/user'
// It uses 'authenticate' to verify the cookie and retrieve user data.
// If your main server file mounts userRoutes at '/auth', this becomes /auth/user.
router.get('/user', authenticate, userController.getAuthUser);

router.put("/api/users/:id/level", authenticate,  authorizeLevel6Plus, userController.updateUserLevel);

router.get("/api/users/level/5", authenticate, userController.getLevel5Users);
// router.put("/api/users/:id/level", authenticate, authorizeLevel2, userController.updateUserLevel);
router.post("/api/verification/request", authenticate, userController.requestVerificationCode);
router.post("/api/verification/check-code", authenticate, authorizeLevel5, userController.checkVerificationCode);
router.post("/api/verification/action", authenticate, authorizeLevel5, userController.performVerificationAction);


// Add these two new routes to fix the bookmarking issue
// router.post('/api/bookmarks/:postId', authenticate, userController.addBookmark);
// router.get('/api/bookmarks', authenticate, userController.getBookmarks);

// Add these three new routes to fix the bookmarking issue
router.post('/api/bookmarks/:postId', authenticate, userController.addBookmark);
router.delete('/api/bookmarks/:postId', authenticate, userController.removeBookmark); // Corrected this route
router.get('/api/bookmarks', authenticate, userController.getBookmarks);


router.get('/profile/:userId',authenticate, userController.getUserAndPosts);

module.exports = router;