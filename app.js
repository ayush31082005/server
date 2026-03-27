<<<<<<< HEAD
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const cors = require("cors");
=======
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
>>>>>>> 093b684 (initial server commit)

const app = express();

const allowedOrigins = [
<<<<<<< HEAD
    "http://localhost:5173",
    "http://localhost:5001",
    "https://sanyuktparivarrichlifefamily.com",
    "https://www.sanyuktparivarrichlifefamily.com",
    "https://server-1-d1eh.onrender.com",

    process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.warn(`CORS blocked for origin: ${origin}`);
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true,
}));

app.use(express.json({ limit: "10mb" }));

app.use("/uploads", express.static(path.join(__dirname, "uploads"), {
    maxAge: "1d",
    etag: true,
    lastModified: true,
}));

app.use((req, res, next) => {
    if (process.env.NODE_ENV !== "test") {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
=======
    'http://localhost:5173',
    'http://localhost:5001',
    'https://sanyuktparivarrichlifefamily.com',
    'https://www.sanyuktparivarrichlifefamily.com',
    'https://sanyuktproject-2o2m.onrender.com',
    process.env.FRONTEND_URL
].filter(Boolean);

app.use(
    cors({
        origin: function (origin, callback) {
            if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
                callback(null, true);
            } else {
                console.warn(`CORS blocked for origin: ${origin}`);
                callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: true
    })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(
    '/uploads',
    express.static(path.join(__dirname, 'uploads'), {
        maxAge: '1d',
        etag: true,
        lastModified: true
    })
);

// Request logger
app.use((req, res, next) => {
    if (process.env.NODE_ENV !== 'test') {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
>>>>>>> 093b684 (initial server commit)
    }
    next();
});

<<<<<<< HEAD
app.get("/", (req, res) => {
    res.send("Backend API is running");
});

app.get("/api/health", (req, res) => {
    res.json({
        status: "alive",
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV || "development",
=======
// Health
app.get('/api/health', (req, res) => {
    res.json({
        status: 'alive',
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV || 'development'
>>>>>>> 093b684 (initial server commit)
    });
});

// Routes
<<<<<<< HEAD
app.use("/api/mlm", require("./routes/mlmRoutes"));
app.use("/api/auth", require("./routes/authRoutes"));
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
app.use("/api/wallet", require("./routes/walletRoutes"));
app.use("/api/grievance", require("./routes/grievanceRoutes"));
app.use("/api/recharge", require("./routes/rechargeRoutes"));
app.use("/api/news", require("./routes/newsRoutes"));
app.use("/api/orders", require("./routes/orderRoutes"));

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Route not found",
    });
});

app.use((err, req, res, next) => {
    console.error("--- GLOBAL ERROR ---");
    console.error(err);
    console.error("--------------------");

    res.status(500).json({
        success: false,
        message: err.message || "Internal Server Error",
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
=======
app.use('/api/mlm', require('./routes/mlmRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api', require('./routes/authRoutes'));
app.use('/api', require('./routes/contactRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/admin/users', require('./routes/adminUserRoutes'));
app.use('/api/admin', require('./routes/adminStatsRoutes'));
app.use('/api/franchises', require('./routes/franchiseRoutes'));
app.use('/api/members', require('./routes/memberRoutes'));
app.use('/api/franchise', require('./routes/franchiseDashboardRoutes'));
app.use('/api/mlm', require('./routes/Matchingbonusroutes'));
app.use('/api/package', require('./routes/PackageRoutes'));
app.use('/api/gallery', require('./routes/galleryRoutes'));
app.use('/api/events', require('./routes/eventRoutes'));
app.use('/api/repurchase', require('./routes/repurchaseRoutes'));
app.use('/api/wallet', require('./routes/walletRoutes'));
app.use('/api/grievance', require('./routes/grievanceRoutes'));
app.use('/api/recharge', require('./routes/rechargeRoutes'));
app.use('/api/news', require('./routes/newsRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));

// Production static
if (process.env.NODE_ENV === 'production') {
    const buildPath = path.join(__dirname, '..', 'client', 'dist');
    app.use(express.static(buildPath));

    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api')) return next();
        res.sendFile(path.join(buildPath, 'index.html'));
    });
} else {
    app.use((req, res) => {
        res.status(404).json({ success: false, message: 'Route not found' });
    });
}

// Global error handler
app.use((err, req, res, next) => {
    console.error('--- GLOBAL ERROR ---');
    console.error(err);
    console.error('--------------------');

    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error',
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
>>>>>>> 093b684 (initial server commit)
    });
});

module.exports = app;