const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authenticate = require('../middlewares/authMiddleware');
const { authorizeLevel2, authorizeLevel5 } = require('../middlewares/roleMiddleware');

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
router.get("/api/users", authenticate, authorizeLevel2, userController.getAllUsers);
router.get("/api/users/level/5", authenticate, userController.getLevel5Users);
router.put("/api/users/:id/level", authenticate, authorizeLevel2, userController.updateUserLevel);
router.post("/api/verification/request", authenticate, userController.requestVerificationCode);
router.post("/api/verification/check-code", authenticate, authorizeLevel5, userController.checkVerificationCode);
router.post("/api/verification/action", authenticate, authorizeLevel5, userController.performVerificationAction);


// Add these two new routes to fix the bookmarking issue
router.post('/api/bookmarks/:postId', authenticate, userController.addBookmark);
router.get('/api/bookmarks', authenticate, userController.getBookmarks);

module.exports = router;