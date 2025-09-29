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
        // '0': Initial/Draft (Author Only)
        // '1': Edited/Pending Publication (Author Only - timer reset)
        // '2': Published (All Users)
        default: '0' 
    }
});

module.exports = mongoose.model("post", postSchema);