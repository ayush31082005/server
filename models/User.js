const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        sponsorId: {
            type: String,
            // required: true,  // 👈 Comment out ya remove
            trim: true,
        },
        memberId: {
            type: String,
            unique: true,
            trim: true,
        },
        sponsorName: {
            type: String,
            trim: true,
        },
        userName: {
            type: String,
            // required: true,  // 👈 Comment out
            trim: true,
        },
        fatherName: {
            type: String,
            // required: true,  // 👈 Comment out
            trim: true,
        },
        position: {
            type: String,
            enum: ["Left", "Right"],
            // required: true,  // 👈 Comment out
        },
        gender: {
            type: String,
            enum: ["Male", "Female", "Other"],
            // required: true,  // 👈 Comment out
        },
        mobile: {
            type: String,
            // required: true,  // 👈 Comment out
            match: [/^\d{10}$/, "Invalid mobile number"],
            // unique: true,    // 👈 Unique bhi hata do temporarily
        },
        email: {
            type: String,
            required: true,     // 👈 SIRF YEH REQUIRED RAKHO
            unique: true,
            lowercase: true,
            trim: true,
        },
        role: {
            type: String,
            enum: ["user", "admin", "premium"],
            default: "user",
        },
        password: {
            type: String,
            // required: true,  // 👈 Comment out (grievance wale users ke liye)
        },
        shippingAddress: {
            type: String,
            // required: true,  // 👈 Comment out
        },
        state: {
            type: String,
            // required: true,  // 👈 Comment out
        },
        district: {
            type: String,
            // required: true,  // 👈 Comment out
        },
        assemblyArea: {
            type: String,
            // required: true,  // 👈 Comment out
        },
        block: {
            type: String,
            // required: true,  // 👈 Comment out
        },
        villageCouncil: {
            type: String,
            // required: true,  // 👈 Comment out
        },
        village: {
            type: String,
            // required: true,  // 👈 Comment out
        },
        joinDate: {
            type: Date,
            default: Date.now
        },
        activeStatus: {
            type: Boolean,
            default: false
        },
        packageType: {
            type: String,
            enum: ["none", "599", "1299", "2699"],
            default: "none"
        },
        pv: {
            type: Number,
            default: 0
        },
        bv: {
            type: Number,
            default: 0
        },
        walletBalance: {
            type: Number,
            default: 0
        },
        // Binary Tree Relationships
        parent: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        parentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        leftColor: { // Total PV/BV on left (optional, but good for caching)
            pv: { type: Number, default: 0 },
            bv: { type: Number, default: 0 }
        },
        rightColor: { // Total PV/BV on right
            pv: { type: Number, default: 0 },
            bv: { type: Number, default: 0 }
        },
        left: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        right: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        isVerified: {
            type: Boolean,
            default: false
        },
        otp: String,
        otpExpire: Date,
        grievances: [
            {
                ticket: String,
                subject: String,
                status: String,
                submittedDate: Date,
                category: String,
                message: String
            }
        ],
        profileImage: {
            type: String, // base64 data URL
            default: null
        },
        kycStatus: {
            type: String,
            enum: ['Pending', 'Submitted', 'Verified', 'Rejected'],
            default: 'Pending'
        },
        aadharNumber: {
            type: String,
            trim: true
        },
        panNumber: {
            type: String,
            trim: true,
            uppercase: true
        },
        bankDetails: {
            accountNumber: String,
            ifscCode: String,
            bankName: String,
            upiId: String
        },
        kycDocuments: {
            aadharFront: String,
            aadharBack: String,
            panCard: String,
            passbook: String
        },
        kycMessage: {
            type: String
        },
        rank: {
            type: String,
            default: "Member"
        },
        leftTeamPV: {
            type: Number,
            default: 0
        },
        rightTeamPV: {
            type: Number,
            default: 0
        },
        totalMatchingBonus: {
            type: Number,
            default: 0
        },
        matchedPV: {
            type: Number,
            default: 0
        },
        totalDirectIncome: {
            type: Number,
            default: 0
        },
        totalLevelIncome: {
            type: Number,
            default: 0
        },
        totalGenerationIncome: {
            type: Number,
            default: 0
        },
        dailyCapping: {
            type: Number,
            default: 0
        },
        dailyPV: {
            type: Number,
            default: 0
        }
    },
    { timestamps: true }
);

// Add indexes for MLM relationship and performance optimization
userSchema.index({ sponsorId: 1 });
userSchema.index({ parentId: 1 });
userSchema.index({ parent: 1 });
userSchema.index({ role: 1 });
userSchema.index({ activeStatus: 1 });

module.exports = mongoose.model("User", userSchema);