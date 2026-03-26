const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
    {
        name: String,
        price: Number,
        oldPrice: Number,
        bv: Number,
        stock: Number,
        image: String,
        description: String,

        // ⭐ NEW FIELDS
        category: {
            type: String,
            required: true,
            enum: [
                "Mobile",
                "Electronics",
                "Fashion",
                "Beauty and cosmetic home based products",
                "Toys and baby toys",
                "Food & health",
                "Auto & accessories",
                "Sports & games",
                "Books & education",
                "Furniture",
                "Footwear",
                "Jwellery & accessories",
                "Appliances",
                "Pharmacy and household",
                "Everyday needs",
                "Grocery"
            ]
        },
        rating: {
            type: Number,
            default: 0,
        },
        numReviews: {
            type: Number,
            default: 0,
        },
        isFeatured: {
            type: Boolean,
            default: false,
        },
        paymentMethods: {
            type: [String],
            enum: ['cod', 'upi', 'card'],
            default: ['cod', 'upi', 'card']
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);