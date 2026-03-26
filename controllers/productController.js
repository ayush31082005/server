const Product = require("../models/Product");

// CREATE PRODUCT WITH IMAGE
exports.createProduct = async (req, res) => {
    try {
        const product = new Product({
            ...req.body,
            image: req.file ? req.file.filename : "",
        });

        await product.save();
        res.status(201).json(product);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET PRODUCTS
exports.getProducts = async (req, res) => {
    const products = await Product.find();
    res.json(products);
};

// UPDATE PRODUCT
exports.updateProduct = async (req, res) => {
    try {
        const updateData = {
            ...req.body,
        };

        if (req.file) {
            updateData.image = req.file.filename;
        }

        const product = await Product.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );

        res.json(product);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// DELETE PRODUCT
exports.deleteProduct = async (req, res) => {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: "Product Deleted" });
};