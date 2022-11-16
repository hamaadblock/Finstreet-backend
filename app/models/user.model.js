const mongoose = require("mongoose");

const User = mongoose.model(
    "User",
    new mongoose.Schema({
        username: String,
        phoneNumber: Number,
        email: String,
        password: String,
        phoneOtp: String,
        emailOtp: Number,
        isMobileVerified: Boolean,
        isEmailVerified: Boolean,
        isAccountVerified: Boolean,
        roles: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Roles"
            }
        ]
    })
);

module.exports = User;
