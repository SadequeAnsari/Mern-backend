const jwt = require("jsonwebtoken");
const userModel = require("../models/userModel");
require('dotenv').config();

const authenticate = (req, res, next) => {
  const token = req.cookies.Token;
  if (!token) {
    return res.status(401).json({
      message: 'Unauthorized'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(401).json({
        message: 'Invalid token'
      });
    }
    try {
      // const user = await userModel.findById(decoded.userid);
      // 🔑 FIX: Use .select('_id level') and .lean() to ensure only required fields are 
      // fetched and returned as a plain, simple JavaScript object.
      const user = await userModel.findById(decoded.userid).select('_id level').lean();
      

      if (!user) {
        return res.status(404).json({
          message: "User not found"
        });
      }
      req.user = user;
      next();
    } catch (dbError) {
      console.error(dbError);
      res.status(500).json({
        message: "Server error"
      });
    }
  });
};

module.exports = authenticate;