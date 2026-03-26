const Order = require("../models/Order");
const Product = require("../models/Product");
const Repurchase = require("../models/Repurchase");
const { processOrderMLM } = require("../utils/mlmOrderUtils");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const sendEmail = require("../utils/sendEmail");

// ✅ Import repurchase income processor
const { processRepurchaseGenerationIncome } = require("./repurchaseController");

// Initialize Razorpay lazily to prevent server crash if keys are missing
let razorpay;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
    });
} else {
    console.warn("[PAYMENT] Razorpay keys are missing in orderController. Product payments will be disabled.");
}

// ================= CREATE ORDER =================
exports.createOrder = async (req, res) => {
    try {
        const {
            product: productId,
            quantity,
            shippingInfo,
            paymentMethod,
            subtotal,
            shipping,
            tax,
            discount,
            total,
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        } = req.body;

        // Verify payment if online
        if (paymentMethod !== 'cod') {
            const body = razorpay_order_id + "|" + razorpay_payment_id;
            const expectedSignature = crypto
                .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
                .update(body.toString())
                .digest("hex");

            if (expectedSignature !== razorpay_signature) {
                return res.status(400).json({ message: "Invalid payment signature" });
            }
        }

        // Fetch product to get BV
        const productData = await Product.findById(productId);
        if (!productData) {
            return res.status(404).json({ message: "Product not found" });
        }

        const orderBv = (productData.bv || 0) * (quantity || 1);
        const orderPv = orderBv / 1000;

        const order = new Order({
            user: req.user._id,
            product: productId,
            quantity,
            shippingInfo,
            paymentMethod,
            subtotal,
            shipping,
            tax,
            discount,
            total,
            bv: orderBv,
            pv: orderPv,
            razorpayOrderId: razorpay_order_id,
            razorpayPaymentId: razorpay_payment_id,
            status: paymentMethod === 'cod' ? 'pending' : 'paid',
            tracking: [{
                status: paymentMethod === 'cod' ? 'pending' : 'paid',
                message: paymentMethod === 'cod' ? 'Order placed successfully' : 'Payment successful and order placed',
                timestamp: new Date()
            }]
        });

        await order.save();

        // ── Existing joining/matching MLM income ──
        processOrderMLM(req.user._id, orderBv, orderPv);

        // ✅ FIX 7: Repurchase record banao (orderId ke saath)
        // Aur phir generation income distribute karo
        const newRepurchase = await Repurchase.create({
            userId: req.user._id,
            orderId: order._id,       // orderId ab model mein hai
            amount: total,
            bv: 300,                   // Plan ke hisaab se fixed 300 BV
            status: 'completed',
        });

        // ── Repurchase generation income (async - response block nahi hoga) ──
        processRepurchaseGenerationIncome(newRepurchase._id).catch(err =>
            console.error("❌ Repurchase income error:", err.message)
        );

        // ── Send Order Success Email ──
        try {
            const userEmail = req.user.email;
            const orderIdShort = order._id.toString().slice(-8).toUpperCase();
            const subject = `Order Confirmed: #${orderIdShort} - Sanyukt Parivaar`;
            const text = `Dear ${req.user.name},

Thank you for your order! Your mission with Sanyukt Parivaar has begun.

Order ID: #${orderIdShort}
Product: ${productData.name}
Quantity: ${quantity}
Total Amount: ₹${total}
Payment Method: ${paymentMethod.toUpperCase()}

You can track your order status in your mission hub: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/my-account/orders/${order._id}

Thank you for choosing Sanyukt Parivaar!
Empowering Lives, Together.`;

            sendEmail(userEmail, subject, text).catch(err => 
                console.error("❌ Failed to send order success email:", err.message)
            );
        } catch (emailErr) {
            console.error("❌ Email data preparation error:", emailErr.message);
        }

        res.status(201).json(order);
    } catch (error) {
        console.error("Order creation error:", error);
        res.status(500).json({ message: "Failed to place order" });
    }
};

// ================= CREATE RAZORPAY ORDER =================
exports.createRazorpayOrder = async (req, res) => {
    try {
        const { amount } = req.body;

        if (!razorpay) {
            return res.status(503).json({ message: "Payment service unavailable. Please configure Razorpay keys." });
        }

        if (!amount || amount <= 0) {
            return res.status(400).json({ message: "Invalid amount" });
        }

        const options = {
            amount: Math.round(amount * 100), // convert to paise
            currency: "INR",
            receipt: `receipt_product_${Date.now()}`
        };

        const razorpayOrder = await razorpay.orders.create(options);
        res.status(200).json(razorpayOrder);
    } catch (error) {
        console.error("Razorpay order creation error:", error);
        res.status(500).json({ message: "Failed to create payment order" });
    }
};

// ================= GET LOGGED IN USER ORDERS =================
exports.myOrders = async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user._id })
            .populate("product", "name image price")
            .sort("-createdAt");

        res.json(orders);
    } catch (error) {
        console.error("Fetch orders error:", error);
        res.status(500).json({ message: "Failed to fetch orders" });
    }
};

// ================= GET SINGLE ORDER =================
exports.getOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate("product", "name image price")
            .populate("user", "name email");

        if (!order) return res.status(404).json({ message: "Order not found" });

        if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== "admin") {
            return res.status(403).json({ message: "Not authorized" });
        }

        res.json(order);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

// ================= ADMIN: GET ALL ORDERS =================
exports.getAllOrders = async (req, res) => {
    try {
        const orders = await Order.find()
            .populate("product", "name image price")
            .populate("user", "name email")
            .sort("-createdAt");

        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

// ================= ADMIN: UPDATE STATUS =================
exports.updateOrderStatus = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: "Order not found" });

        order.status = req.body.status;
        order.tracking.push({
            status: req.body.status,
            message: req.body.message || `Order status updated to ${req.body.status}`,
            timestamp: new Date()
        });

        await order.save();
        res.json({ message: "Order status updated", order });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};
