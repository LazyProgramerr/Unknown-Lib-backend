const crypto = require('crypto');

/**
 * Hashes a 6‑digit OTP using SHA‑256.
 * @param {string} otp - The OTP string.
 * @returns {string} Hex‑encoded hash.
 */
function hashOtp(otp) {
    return crypto.createHash('sha256').update(otp).digest('hex');
}

module.exports = { hashOtp };
