function createRateLimiter({ windowMs, max, keyGenerator, message }) {
    const store = new Map();

    return (req, res, next) => {
        const now = Date.now();
        const key = keyGenerator(req);

        if (!key) {
            return res.status(500).json({ message: "Rate limiter key generation failed" });
        }

        const current = store.get(key);

        if (!current || now >= current.resetAt) {
            store.set(key, { count: 1, resetAt: now + windowMs });
            return next();
        }

        if (current.count >= max) {
            const retryAfterSeconds = Math.ceil((current.resetAt - now) / 1000);
            res.set("Retry-After", String(retryAfterSeconds));
            return res.status(429).json({
                message: message || "Too many requests. Please try again later."
            });
        }

        current.count += 1;
        return next();
    };
}

function getClientIp(req) {
    const forwardedFor = req.headers["x-forwarded-for"];
    if (typeof forwardedFor === "string" && forwardedFor.length > 0) {
        return forwardedFor.split(",")[0].trim();
    }

    return req.ip || req.socket?.remoteAddress || "unknown";
}

module.exports = {
    createRateLimiter,
    getClientIp
};
