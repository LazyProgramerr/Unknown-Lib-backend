const mongoose = require('mongoose');
const { mongoUri } = require('./env');

console.log(`[INIT] Connecting to MongoDB: ${mongoUri ? mongoUri.split('@').pop() : 'UNDEFINED'}`);
mongoose.connect(mongoUri)
    .then(() => console.log('✅ MongoDB connected'))
    .catch(err => {
        console.error('❌ MongoDB connection error:', err.message);
        // Additional debug if needed
        if (err.message.includes('Malformed')) {
            console.error('[DEBUG] Full Mongo URI length:', mongoUri?.length);
        }
    });

module.exports = mongoose;
