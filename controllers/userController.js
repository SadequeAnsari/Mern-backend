const userModel = require("../models/userModel");
const postModel = require("../models/postModel");
const bcrypt = require('bcrypt');
const jwt = require("jsonwebtoken");
const crypto = require('crypto');
const { otps, verificationCodes } = require("../utils/inMemoryStore");
require('dotenv').config();

const registerUser = async (req, res) => {
  const { username, phone, email, password } = req.body;
  try {
    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists.' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const createdUser = await userModel.create({
      username,
      phone,
      email,
      password: hashedPassword,
      level: '0'
    });
    const token = jwt.sign({ email: createdUser.email, userid: createdUser._id }, process.env.JWT_SECRET);
    // res.cookie("Token", token);
     res.cookie("Token", token, {
      httpOnly: true,
      secure: true, // Only send cookie over HTTPS
      sameSite: 'none', // Allow cross-site requests
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000) // 1 days
    });
    res.json({ message: 'User registered successfully!', user: createdUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Registration failed.' });
  }
};

const loginUser = async (req, res) => {
  const { emailOrUserid, password } = req.body;
  try {
    let user = await userModel.findOne({
      $or: [{ email: emailOrUserid }, { userid: emailOrUserid }]
    });
    if (!user) {
      return res.status(400).json({ message: "Invalid email/userid or password" });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email/userid or password" });
    }
    const token = jwt.sign({ email: user.email, userid: user._id }, process.env.JWT_SECRET);
    // res.cookie("Token", token);
    res.cookie("Token", token, {
      httpOnly: true,
      secure: true, // Only send cookie over HTTPS
      sameSite: 'none', // Allow cross-site requests
      expires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days
    });
    
    req.session.userId = user._id;
    res.json({ message: "Login successful", user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

const logoutUser = (req, res) => {
  res.clearCookie("Token");
  res.json({ message: "Logged out" });
};

const getProfile = async (req, res) => {
  const user = await userModel.findById(req.user._id).select('-password');
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json({ user });
};

const updateProfile = async (req, res) => {
  const { userid, username, email, phone } = req.body;
  try {
    const updatedUser = await userModel.findByIdAndUpdate(
      req.user._id, { userid, username, email, phone }, { new: true, select: '-password' }
    );
    if (!updatedUser) return res.status(404).json({ message: 'User not found' });
    res.json({ user: updatedUser });
  } catch (err) {
    res.status(500).json({ message: 'Error updating profile' });
  }
};

const deleteAccount = async (req, res) => {
  try {
    const userId = req.user._id;
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    const updatedUser = await userModel.findOneAndUpdate({ _id: userId }, { $set: { isDeleted: true } }, { new: true });
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.clearCookie('Token');
    res.status(200).json({ message: 'Account deleted successfully', user: updatedUser });
  } catch (error) {
    console.error("Error deleting account:", error);
    res.status(500).json({ message: 'An error occurred while deleting the account.' });
  }
};

const sendOtp = (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required' });
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otps[email] = otp;
  console.log(`OTP for ${email}: ${otp}`);
  res.json({ message: 'OTP sent to email' });
};

const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ message: 'Email and OTP are required' });
  if (otps[email] && otps[email] === otp) {
    await userModel.findOneAndUpdate({ email }, { level: "1" });
    delete otps[email];
    res.json({ message: 'Email verified successfully! Your account is now level 1.' });
  } else {
    res.status(400).json({ message: 'Invalid OTP' });
  }
};

const checkEmail = async (req, res) => {
  const { email } = req.body;
  const user = await userModel.findOne({ email });
  if (user) {
    res.json({ exists: true });
  } else {
    res.json({ exists: false });
  }
};

const setUserId = async (req, res) => {
  const { email, userid } = req.body;
  if (!userid.startsWith('@')) {
    return res.status(400).json({ message: 'User ID must start with @' });
  }
  try {
    const existingUserid = await userModel.findOne({ userid });
    if (existingUserid) {
      return res.status(400).json({ message: 'User ID already exists.' });
    }
    const user = await userModel.findOneAndUpdate({ email }, { userid }, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User ID set successfully!', user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'An error occurred while setting the User ID.' });
  }
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await userModel.findOne({ email });
    if (!user) return res.status(400).json({ message: 'User not found' });
    const otp = "123456";
    otps[email] = otp;
    console.log(`OTP for ${email}: ${otp}`);
    res.json({ message: 'OTP sent to your email.', otp: otp });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

const resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) {
    return res.status(400).json({ message: 'Email, OTP, and new password are required' });
  }
  if (otps[email] !== otp) {
    return res.status(400).json({ message: 'Invalid OTP' });
  }
  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const user = await userModel.findOneAndUpdate({ email }, { password: hashedPassword });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    delete otps[email];
    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await userModel.find({}, 'username email level');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Error fetching user list." });
  }
};

const getLevel5Users = async (req, res) => {
  try {
    const level5Users = await userModel.find({ level: 5 }, 'username email _id');
    res.json(level5Users);
  } catch (error) {
    res.status(500).json({ message: "Error fetching level 5 users." });
  }
};

const updateUserLevel = async (req, res) => {
  try {
    const userId = req.params.id;
    const { level } = req.body;
    if (level === undefined || isNaN(level) || level < 0 || level > 9) {
      return res.status(400).json({ message: "Invalid level provided." });
    }
    const updatedUser = await userModel.findByIdAndUpdate(
      userId, { level: level }, { new: true, fields: 'username email level' }
    );
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found." });
    }
    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: "Error updating user level." });
  }
};

const requestVerificationCode = async (req, res) => {
  try {
    const { verifierId } = req.body;
    const requestingUser = req.user;
    if (parseInt(requestingUser.level) !== 0) {
      return res.status(400).json({ message: "Only level 0 users can request a verification code." });
    }
    const verifier = await userModel.findById(verifierId);
    if (!verifier || parseInt(verifier.level) < 5) {
      return res.status(404).json({ message: "Verifier not found or not a level 5 user." });
    }
    const code = crypto.randomBytes(5).toString('hex').toUpperCase();
    verificationCodes[code] = { userToVerify: requestingUser._id, verifier: verifierId };
    console.log(`Generated code for user ${requestingUser.username}, to be verified by ${verifier.username}: ${code}`);
    res.json({ message: "Verification code generated. Please give it to your selected verifier.", code: code });
  } catch (error) {
    console.error("Error requesting verification code:", error);
    res.status(500).json({ message: "An error occurred while generating the verification code." });
  }
};

const checkVerificationCode = async (req, res) => {
  const { verificationCode } = req.body;
  const currentVerifierId = req.user._id;
  if (!verificationCode) {
    return res.status(400).json({ message: "Verification code is required." });
  }
  const codeData = verificationCodes[verificationCode];
  if (!codeData) {
    return res.status(400).json({ message: "Invalid or expired verification code." });
  }
  if (codeData.verifier.toString() !== currentVerifierId.toString()) {
    return res.status(403).json({ message: "This code is not for you." });
  }
  try {
    const userToVerify = await userModel.findById(codeData.userToVerify).select('-password');
    if (!userToVerify) {
      delete verificationCodes[verificationCode];
      return res.status(404).json({ message: "User to be verified not found." });
    }
    res.json({ message: "User profile retrieved successfully.", user: userToVerify });
  } catch (error) {
    console.error("Error retrieving user with code:", error);
    res.status(500).json({ message: "An error occurred during verification." });
  }
};

const performVerificationAction = async (req, res) => {
  const { userId, action } = req.body; // 'verify' or 'reject'
  const currentVerifierId = req.user._id;
  try {
    const userToVerify = await userModel.findById(userId);
    if (!userToVerify) {
      return res.status(404).json({ message: "User not found." });
    }
    let foundCode = null;
    for (const code in verificationCodes) {
      if (verificationCodes[code].userToVerify.toString() === userId.toString() && verificationCodes[code].verifier.toString() === currentVerifierId.toString()) {
        foundCode = code;
        break;
      }
    }
    if (!foundCode) {
      return res.status(403).json({ message: "You are not authorized to perform this action for this user." });
    }
    if (action === 'verify') {
      userToVerify.level = "1";
      await userToVerify.save();
      delete verificationCodes[foundCode];
      res.json({ message: "User verified successfully! Their account is now level 1.", user: userToVerify });
    } else if (action === 'reject') {
      delete verificationCodes[foundCode];
      res.json({ message: "User verification rejected. The code has been invalidated.", user: userToVerify });
    } else {
      res.status(400).json({ message: "Invalid action specified." });
    }
  } catch (error) {
    console.error("Error during verification action:", error);
    res.status(500).json({ message: "An error occurred during verification action." });
  }
};

const addBookmark = async (req, res) => {
    try {
        const userId = req.user._id;
        const postId = req.params.postId;
        const user = await userModel.findById(userId);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        // This line is the fix: use `user.bookmarks || []`
        if ((user.bookmarks || []).includes(postId)) {
            return res.status(409).json({ message: "Post already bookmarked" });
        }

        user.bookmarks.push(postId);
        await user.save();

        res.status(200).json({ message: "Post bookmarked successfully!" });
    } catch (error) {
        console.error("Error adding bookmark:", error);
        res.status(500).json({ message: "Server error" });
    }
};

const getBookmarks = async (req, res) => {
    try {
        const userId = req.user._id;
        // Populate the bookmarks array and then populate the 'author' field within each bookmarked post
        const user = await userModel.findById(userId).populate({
            path: 'bookmarks',
            populate: {
                path: 'author',
                select: 'username' // Only select the username field
            }
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json(user.bookmarks);
    } catch (error) {
        console.error("Error fetching bookmarks:", error);
        res.status(500).json({ message: "Server error" });
    }
};



const removeBookmark = async (req, res) => {
    try {
        const userId = req.user._id;
        const { postId } = req.params;

        const updatedUser = await userModel.findByIdAndUpdate(
            userId,
            { $pull: { bookmarks: postId } },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({ message: "Bookmark removed successfully!" });
    } catch (error) {
        console.error("Error removing bookmark:", error);
        res.status(500).json({ message: "Server error" });
    }
};

const getUserAndPosts = async (req, res) => {
    try {
        const { userId } = req.params;

        // 1. Fetch the user details
        const user = await userModel.findById(userId).select('-password'); 
        // ... (error handling for user not found) ...

        // 2. Fetch all posts by that user
        // 🔑 FIX: Added 'statusCode: '1'' filter to ensure only PUBLISHED posts are shown on the public profile.
        const userPosts = await postModel.find({ author: userId, statusCode: '1' }) 
            .populate('author', 'username email level') 
            .sort({ createdAt: -1 });

        // 3. Combine and send the data
        res.status(200).json({
            userProfile: user,
            posts: userPosts
        });

    } catch (error) {
        console.error("Error fetching user profile and posts:", error);
        res.status(500).json({ message: 'Server error while fetching user data.' });
    }
};



module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  getProfile,
  updateProfile,
  deleteAccount,
  sendOtp,
  verifyOtp,
  checkEmail,
  setUserId,
  forgotPassword,
  resetPassword,
  getAllUsers,
  getLevel5Users,
  updateUserLevel,
  requestVerificationCode,
  checkVerificationCode,
  performVerificationAction,
  addBookmark, 
  getBookmarks,
  removeBookmark,
  getUserAndPosts
};
