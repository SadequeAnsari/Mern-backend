const mongoose = require("mongoose");
const userSchema = mongoose.Schema({
    username: { type: String, required: true, unique: true },
    phone: String,
    email: {
        type: String,
        required: true,
        unique: true,
        // The regex still has an error; it should be `.+@.+\..+`
        match: [/.+@.+\..+/, 'Please fill a valid email address'],
    },
    password: { type: String, required: true },
    level: { type: String, default: '0' },
    userid: String,
    date: { type: Date, default: Date.now },
    isDeleted: { type: Boolean, default: false },
    bookmarks: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'post' 
    }]
}, { timestamps: true });

module.exports = mongoose.model("user", userSchema);