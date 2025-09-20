const express = require("express");
const app = express();
const path = require("path");
const cookieParser = require("cookie-parser");
const cors = require('cors');
require('dotenv').config();

const connectDB = require("./database/db");
const allRoutes = require("./routes");
const { otps, verificationCodes } = require("./utils/inMemoryStore");

// Connect to the database
connectDB();

// CORS setup
app.use(cors({
  origin: process.env.CORS_ORIGIN,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());

// Use the routes
app.use(allRoutes);

const PORT = process.env.PORT || 4000;

app.get('/', (req, res) => {
  res.send('API is running...');
});


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});