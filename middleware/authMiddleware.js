const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error("FATAL ERROR: JWT_SECRET environment variable is missing.");
    process.exit(1);
}

module.exports = function (req, res, next) {
    // Get token from header
    const token = req.header("Authorization");

    // Check if not token
    if (!token) {
        return res.status(401).json({ message: "No token, authorization denied" });
    }

    try {
        const tokenString = token.startsWith("Bearer ") ? token.split(" ")[1] : token;
        
        const decoded = jwt.verify(tokenString, JWT_SECRET);

        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ message: "Token is not valid" });
    }
};
