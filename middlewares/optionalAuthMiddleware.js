const jwt = require("jsonwebtoken");
const userModel = require("../models/userModel");
require('dotenv').config();

const optionalAuthenticate = (req, res, next) => {
  const token = req.cookies.Token;

  // 🔑 CHANGE: If no token exists, simply proceed without setting req.user (non-blocking)
  if (!token) {
    req.user = null; 
    return next();
  }

  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    // 🔑 CHANGE: If token is invalid, log error and proceed without setting req.user
    if (err) {
      console.log("Token invalid for public route, proceeding without authentication.");
      req.user = null;
      return next(); 
    }
    
    // If token is valid, fetch user data and proceed
    try {
      // Fetch only _id and level as before
      const user = await userModel.findById(decoded.userid).select('_id level').lean();
      
      if (!user) {
        req.user = null;
        return next();
      }
      
      req.user = user;
      next();
    } catch (dbError) {
      console.error(dbError);
      req.user = null;
      next(); 
    }
  });
};

module.exports = optionalAuthenticate;