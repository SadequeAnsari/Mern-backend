const express = require('express');
const router = express.Router();
const userRoutes = require('./userRoutes');
const postRoutes = require('./postRoutes');

router.use(userRoutes);
router.use(postRoutes);

module.exports = router;