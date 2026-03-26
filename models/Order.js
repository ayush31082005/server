const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true
    },
    quantity: {
        type: Number,
        default: 1
    },
    shippingInfo: {
        fullName: String,
        email: String,
        phone: String,
        address: String,
        city: String,
        state: String,
        pincode: String,
        landmark: String
    },
    paymentMethod: {
        type: String,
        enum: ["cod", "online", "upi", "card"],
        default: "cod"
    },
    subtotal: Number,
    shipping: Number,
    tax: Number,
    discount: Number,
    total: Number,
    bv: {
        type: Number,
        default: 0
    },
    pv: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ["pending", "processing", "shipped", "reached_store", "out_for_delivery", "delivered", "cancelled", "backorder"],
        default: "pending"
    },
    tracking: [{
        status: String,
        message: String,
        timestamp: { type: Date, default: Date.now }
    }]
}, { timestamps: true });

orderSchema.index({ user: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Order", orderSchema);
