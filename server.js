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
// app.use(cors({
//   origin: process.env.CORS_ORIGIN,
//   credentials: true
// }));


const allowedOrigins = ['https://mern-frontend-eta-self.vercel.app'];
app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true // Add this line
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());
app.set("trust proxy", 1);
app.use(session({
  name: 'my-app-session', // A unique name for your session cookie
  secret: process.env.SESSION_SECRET, // Use a strong, random string from a .env file
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,
    sameSite: 'none',
  }
}));

// Use the routes
app.use(allRoutes);

const PORT = process.env.PORT || 4000;

app.get('/', (req, res) => {
  res.send('API is running...');
});


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
