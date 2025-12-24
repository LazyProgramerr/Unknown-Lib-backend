const { Schema, model } = require('mongoose');

const otpSchema = new Schema({
    userId: { type: String, required: true, unique: true },
    hashedOtp: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } }, // TTL index, expires at exact time
});

module.exports = model('Otp', otpSchema);
