const jwt = require("jsonwebtoken");

const ACCESS_TOKEN_SECRET =
    process.env.JWT_ACCESS_SECRET ||
    "SanchayAI_Access_9f3a1e2d_5b7c_4a19_8d6e_34f0bb6a73d1_!Secure@2026";

function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Missing or invalid authorization header" });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: "Invalid or expired access token" });
    }
}

module.exports = authenticateToken;
