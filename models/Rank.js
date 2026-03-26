const mongoose = require('mongoose');

const rankSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    rankName: {
        type: String,
        required: true
    },
    reward: {
        type: String
    },
    achievedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

module.exports = mongoose.model('Rank', rankSchema);
