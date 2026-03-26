const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('../models/Product');

dotenv.config({ path: '../.env' });

const products = [
    {
        name: "Herbal Sunscreen Lotion",
        price: 400,
        oldPrice: 450,
        bv: 100,
        stock: 50,
        description: "Natural herbal sunscreen lotion for skin protection.",
        rating: 4.8,
        numReviews: 124
    },
    {
        name: "Papaya Soap",
        price: 100,
        oldPrice: 120,
        bv: 25,
        stock: 100,
        description: "Skin brightening papaya soap with natural extracts.",
        rating: 4.5,
        numReviews: 89
    },
    {
        name: "Herbal Hair Oil",
        price: 300,
        oldPrice: 350,
        bv: 75,
        stock: 75,
        description: "Nourishing herbal hair oil for healthy hair growth.",
        rating: 4.7,
        numReviews: 156
    },
    {
        name: "Hair Shampoo",
        price: 240,
        oldPrice: 280,
        bv: 60,
        stock: 60,
        description: "Gentle herbal hair shampoo for all hair types.",
        rating: 4.6,
        numReviews: 112
    },
    {
        name: "Combo & Value Packs",
        price: 999,
        oldPrice: 1200,
        bv: 250,
        stock: 30,
        description: "Value combo pack containing multiple herbal products.",
        rating: 5.0,
        numReviews: 45
    }
];

const seedDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB for seeding...');

        for (const p of products) {
            const existing = await Product.findOne({ name: p.name });
            if (!existing) {
                await Product.create(p);
                console.log(`Added product: ${p.name}`);
            } else {
                console.log(`Product already exists: ${p.name}`);
            }
        }

        console.log('Seeding completed!');
        process.exit();
    } catch (error) {
        console.error('Seeding error:', error);
        process.exit(1);
    }
};

seedDB();
