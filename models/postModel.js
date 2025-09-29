const mongoose = require("mongoose");
const postSchema = mongoose.Schema({
    content: String,
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    statusCode: {
        type: String,
        default: '0' // '0' for draft, '1' for published
    }
});

module.exports = mongoose.model("post", postSchema);