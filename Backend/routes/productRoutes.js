const express = require("express");
const router = express.Router();
const Product = require("../models/Product");

router.post("/product", async (req, res) => {
    try {
        const product = new Product(req.body);
        await product.save();

        res.json(product);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get("/products", async (req, res) => {
    try {
        const products = await Product.find();
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;