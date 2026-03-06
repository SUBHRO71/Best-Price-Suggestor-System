const express = require("express");
const router = express.Router();

const { compareProducts } = require("../services/compareService");
const authenticateToken = require("../middleware/authMiddleware");
const { createRateLimiter, getClientIp } = require("../middleware/rateLimitMiddleware");

router.use(authenticateToken);

const compareRateLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    max: 30,
    keyGenerator: (req) => req.user?.sub || getClientIp(req),
    message: "Rate limit exceeded for /compare. Try again in a minute."
});

router.get("/compare", compareRateLimiter, async (req, res) => {
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
