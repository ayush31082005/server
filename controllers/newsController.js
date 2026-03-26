const News = require('../models/News');

// @desc    Get all news
// @route   GET /api/news
// @access  Public
exports.getAllNews = async (req, res, next) => {
    try {
        const news = await News.find().sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            data: news
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Add new news
// @route   POST /api/news/add
// @access  Admin
exports.addNews = async (req, res, next) => {
    try {
        console.log("--- DEBUG NEWS PUBLISH (INTERNAL) ---");
        console.log("User Object:", req.user ? { id: req.user._id, role: req.user.role, name: req.user.userName } : "MISSING");
        console.log("Request Body:", req.body);
        console.log("Uploaded File:", req.file ? req.file.filename : "NONE");

        const title = req.body.title;
        const content = req.body.content;
        const category = req.body.category;
        const readTime = req.body.readTime;
        const author = req.body.author;
        const authorAvatar = req.body.authorAvatar;
        
        if (!title || !content) {
             return res.status(400).json({ success: false, message: "Title and Content are required" });
        }

        let imageUrl = "";
        if (req.file) {
            imageUrl = `/uploads/${req.file.filename}`;
        }

        const newsData = {
            title,
            content,
            category: category || "General",
            readTime: readTime || "5 min read",
            author: author || (req.user ? req.user.userName : "Admin"),
            authorAvatar: authorAvatar || (req.user && req.user.userName ? req.user.userName[0] : "A"),
            image: imageUrl || "https://via.placeholder.com/600x400"
        };

        console.log("Attempting to create News with data:", newsData);
        const news = await News.create(newsData);
        console.log("News created successfully:", news._id);

        res.status(201).json({
            success: true,
            data: news
        });
    } catch (error) {
        console.error("CRITICAL ERROR IN ADDNEWS:");
        console.error(error);
        
        // Handle MongoDB Duplicate Key Error (likely slug)
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: "A news article with this title already exists. Please use a unique title."
            });
        }

        res.status(500).json({
            success: false,
            message: error.message || "An internal server error occurred"
        });
    }
};

// @desc    Delete news
// @route   DELETE /api/news/:id
// @access  Admin
exports.deleteNews = async (req, res, next) => {
    try {
        const news = await News.findById(req.params.id);
        if (!news) {
            return res.status(404).json({
                success: false,
                message: "News not found"
            });
        }

        await news.deleteOne();
        res.status(200).json({
            success: true,
            message: "News deleted successfully"
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
