const express = require("express");
const router = express.Router();

const scrapeFlipkart = require("../services/flipkartScraper");
const scrapeAmazon = require("../services/amazonScraper");
const Product = require("../models/Product");
const Store = require("../models/Store");
const Price = require("../models/Price");

async function updateProductStoreLink(productId, storeName, products) {
    const firstValidLink = products.find((item) => item?.link)?.link;
    if (!firstValidLink) return;

    const product = await Product.findById(productId);
    if (!product) return;

    const linksByStore = new Map((product.links || []).map((entry) => [entry.store, entry.url]));
    linksByStore.set(storeName, firstValidLink);

    product.links = Array.from(linksByStore.entries()).map(([store, url]) => ({ store, url }));
    await product.save();
}

router.get("/scrape/flipkart", async (req, res) => {
    try {
        const query = req.query.q;

        if (!query) {
            return res.status(400).json({
                message: "Query parameter required"
            });
        }

        const products = await scrapeFlipkart(query);
        const normalizedQuery = query.toLowerCase().trim();

        const productDoc = await Product.findOneAndUpdate(
            { normalized_name: normalizedQuery },
            { name: query.trim(), normalized_name: normalizedQuery },
            { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
        );

        const flipkartStore = await Store.findOneAndUpdate(
            { name: "Flipkart" },
            { name: "Flipkart", base_url: "https://www.flipkart.com" },
            { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
        );

        for (const product of products) {
            await Price.create({
                product_id: productDoc._id,
                store_id: flipkartStore._id,
                price: product.price,
                product_url: product.link
            });
        }

        await updateProductStoreLink(productDoc._id, "Flipkart", products);

        res.json(products);
    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: error.message
        });
    }
});

router.get("/scrape/amazon", async (req, res) => {
    try {
        const query = req.query.q;

        if (!query) {
            return res.status(400).json({
                message: "Query parameter required"
            });
        }

        const products = await scrapeAmazon(query);
        const normalizedQuery = query.toLowerCase().trim();

        const productDoc = await Product.findOneAndUpdate(
            { normalized_name: normalizedQuery },
            { name: query.trim(), normalized_name: normalizedQuery },
            { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
        );

        const amazonStore = await Store.findOneAndUpdate(
            { name: "Amazon" },
            { name: "Amazon", base_url: "https://www.amazon.in" },
            { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
        );

        for (const product of products) {
            await Price.create({
                product_id: productDoc._id,
                store_id: amazonStore._id,
                price: product.price,
                product_url: product.link
            });
        }

        await updateProductStoreLink(productDoc._id, "Amazon", products);

        res.json(products);
    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: error.message
        });
    }
});

module.exports = router;
