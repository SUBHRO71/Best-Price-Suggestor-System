const express = require("express");
const router = express.Router();

const Store = require("../models/Store");

router.post("/store", async (req, res) => {

    try {

        const { name, logo_url, base_url } = req.body;

        if (!name) {
            return res.status(400).json({
                message: "Store name is required"
            });
        }

        const store = await Store.create({
            name,
            logo_url,
            base_url
        });

        res.json(store);

    } catch (error) {

        res.status(500).json({
            error: error.message
        });

    }

});

router.get("/stores", async (req, res) => {

    const stores = await Store.find();

    res.json(stores);

});

module.exports = router;