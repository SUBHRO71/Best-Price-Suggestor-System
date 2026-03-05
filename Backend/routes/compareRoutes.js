const express = require("express");
const router = express.Router();

const { compareProducts } = require("../services/compareService");
const authenticateToken = require("../middleware/authMiddleware");

router.use(authenticateToken);

router.get("/compare", async (req, res) => {
    try {
        const query = req.query.q?.trim();

        if (!query) {
            return res.status(400).json({ message: "Query parameter q is required" });
        }

        const response = await compareProducts(query, {
            dbFirst: false
        });

        if (!response.results.length) {
            return res.status(404).json(response);
        }

        res.json(response);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
