const express = require("express");
const mongoose = require("mongoose");

const Wishlist = require("../models/Wishlist");
const Product = require("../models/Product");
const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authenticateToken);

function normalizeQuery(query) {
    return String(query || "").toLowerCase().trim().replace(/\s+/g, " ");
}

async function resolveProduct({ productId, name, store, link }) {
    if (productId) {
        if (!mongoose.Types.ObjectId.isValid(productId)) {
            throw new Error("Invalid productId");
        }

        const existing = await Product.findById(productId);
        if (!existing) {
            throw new Error("Product not found");
        }
        return existing;
    }

    if (!name || !name.trim()) {
        throw new Error("Product name is required when productId is not provided");
    }

    const normalizedName = normalizeQuery(name);
    let product = await Product.findOne({ normalized_name: normalizedName });

    if (!product) {
        product = await Product.create({
            name: name.trim(),
            normalized_name: normalizedName,
            links: []
        });
    }

    if (store && link) {
        const linksByStore = new Map((product.links || []).map((entry) => [entry.store, entry.url]));
        linksByStore.set(store, link);
        product.links = Array.from(linksByStore.entries()).map(([storeName, url]) => ({
            store: storeName,
            url
        }));
        await product.save();
    }

    return product;
}

router.get("/wishlist", async (req, res) => {
    try {
        const items = await Wishlist.find({ user_id: req.user.sub })
            .populate("product_id", "name normalized_name links")
            .sort({ added_at: -1 });

        return res.json({
            total: items.length,
            results: items
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

router.post("/wishlist", async (req, res) => {
    try {
        const { productId, name, store, price, link } = req.body || {};
        const product = await resolveProduct({ productId, name, store, link });

        const wishlistItem = await Wishlist.findOneAndUpdate(
            {
                user_id: req.user.sub,
                product_id: product._id,
                store: store?.trim() || "Unknown"
            },
            {
                user_id: req.user.sub,
                product_id: product._id,
                product_name: name?.trim() || product.name,
                store: store?.trim() || "Unknown",
                price: typeof price === "number" ? price : undefined,
                product_url: link?.trim() || undefined
            },
            {
                upsert: true,
                new: true,
                setDefaultsOnInsert: true
            }
        ).populate("product_id", "name normalized_name links");

        return res.status(201).json({
            message: "Added to wishlist",
            item: wishlistItem
        });
    } catch (error) {
        if (error.message.includes("Invalid productId") || error.message.includes("Product name is required")) {
            return res.status(400).json({ message: error.message });
        }
        if (error.message.includes("Product not found")) {
            return res.status(404).json({ message: error.message });
        }
        return res.status(500).json({ error: error.message });
    }
});

router.delete("/wishlist/:id", async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid wishlist id" });
        }

        const deleted = await Wishlist.findOneAndDelete({
            _id: id,
            user_id: req.user.sub
        });

        if (!deleted) {
            return res.status(404).json({ message: "Wishlist item not found" });
        }

        return res.json({ message: "Wishlist item removed" });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

module.exports = router;
