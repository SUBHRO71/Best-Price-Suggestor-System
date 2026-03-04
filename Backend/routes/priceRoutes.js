const express = require("express");
const router = express.Router();

const Price = require("../models/Price");
const Product = require("../models/Product");

router.get("/product/:id/prices", async (req, res) => {
    try {
        const productId = req.params.id;

        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        const prices = await Price.find({ product_id: productId });

        res.json({
            product: product.name,
            prices
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;