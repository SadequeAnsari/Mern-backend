const mongoose = require("mongoose");
require('dotenv').config();

// const connectDB = async () => {
//  try {
//     await mongoose.connect(process.env.MONGO_URI);
//     console.log("MongoDB connected successfully");
//   } catch (err) {
//     console.error("MongoDB connection failed:", err);
//     process.exit(1);
//   }
// };

let isConnected = false ;


async function connectDB() {
try {
      await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
});
      isConnected = true;
      console.log('MongoDB connected successfully');
} catch (error) {
      console.error('MongoDB connection failed:', error);
}
} 

module.exports = connectDB;