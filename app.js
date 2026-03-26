const path = require('path');
require("dotenv").config({ path: path.join(__dirname, '.env') });

const express = require("express");
const cors = require("cors");

const galleryRoutes = require("./routes/galleryRoutes")
const eventRoutes = require("./routes/eventRoutes")

const app = express();

const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:5001",
    "https://sanyuktparivarrichlifefamily.com",
    "https://www.sanyuktparivarrichlifefamily.com",
    "https://sanyuktproject-2o2m.onrender.com",
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1 || origin === process.env.FRONTEND_URL || process.env.NODE_ENV !== 'production') {
            callback(null, true);
        } else {
            console.warn(`CORS blocked for origin: ${origin}`);
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// ✅ Static file serving - serves ALL subfolders under uploads with caching
app.use("/uploads", express.static(path.join(__dirname, "uploads"), {
    maxAge: '1d', // Cache for 1 day
    etag: true,
    lastModified: true
}));

// Request Logger
app.use((req, res, next) => {
    if (process.env.NODE_ENV !== 'test') {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    }
    next();
});

// Health Check
app.get("/api/health", (req, res) => {
    res.json({
        status: "alive",
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV || "development"
    });
});

// Routes
app.use("/api/mlm", require("./routes/mlmRoutes"));
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api", require("./routes/authRoutes"));
app.use("/api", require("./routes/contactRoutes"));
app.use("/api/products", require("./routes/productRoutes"));
app.use("/api/admin/users", require("./routes/adminUserRoutes"));
app.use("/api/admin", require("./routes/adminStatsRoutes"));
app.use("/api/franchises", require("./routes/franchiseRoutes"));
app.use("/api/members", require("./routes/memberRoutes"));
app.use("/api/franchise", require("./routes/franchiseDashboardRoutes"));
app.use("/api/mlm", require("./routes/Matchingbonusroutes"));
app.use("/api/package", require("./routes/PackageRoutes"));
app.use("/api/gallery", require("./routes/galleryRoutes"));
app.use("/api/events", require("./routes/eventRoutes"));
app.use("/api/repurchase", require("./routes/repurchaseRoutes"));
app.use('/api/wallet', require('./routes/walletRoutes'));
app.use("/api/grievance", require("./routes/grievanceRoutes"));
app.use("/api/recharge", require("./routes/rechargeRoutes"));
app.use("/api/news", require("./routes/newsRoutes"));
app.use("/api/orders", require("./routes/orderRoutes"));

// PRODUCTION: Serve static files from React build
if (process.env.NODE_ENV === 'production') {
    const buildPath = path.join(__dirname, '..', 'client', 'dist');
    app.use(express.static(buildPath));

    // Catch-all for React SPA routing (excludes /api paths)
    // Using explicit regex to avoid PathError on Render/Express
    app.use((req, res) => {
        res.sendFile(path.join(__dirname, '../client/dist/index.html'));
    });
} else {
    // Final API 404 handler for development
    app.use((req, res) => {
        res.status(404).json({ message: "Route not found" });
    });
}

// Global Error Handler
app.use((err, req, res, next) => {
    console.error("--- GLOBAL ERROR ---");
    console.error(err);
    console.error("--------------------");
    res.status(500).json({
        success: false,
        message: err.message || "Internal Server Error",
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

module.exports = app;
