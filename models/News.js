const mongoose = require('mongoose');

const newsSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    content: {
        type: String,
        required: true
    },
    image: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true
    },
    readTime: {
        type: String,
        default: "5 min read"
    },
    author: {
        type: String,
        default: "Admin"
    },
    authorAvatar: {
        type: String,
        default: "A"
    },
    slug: {
        type: String,
        unique: true
    }
}, { timestamps: true });

// Pre-save hook to generate slug
newsSchema.pre('save', async function() {
    if (this.title && !this.slug) {
        this.slug = this.title.toLowerCase().split(' ').join('-');
    }
});

module.exports = mongoose.model('News', newsSchema);
