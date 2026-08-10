const jwt = require("jsonwebtoken");

function verifyToken(req, res, next) {
    const authHeader = req.headers["authorization"];

    if (!authHeader) {
        return res.status(401).json({ error: "No se proporcionó token" });
    }

    const token = authHeader.split(" ")[1]; // el header viene como "Bearer eyJhbGc..."

    if (!token) {
        return res.status(401).json({ error: "Token mal formado" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.userId;
        next(); // deja pasar la petición a la ruta real
    } catch (err) {
        return res.status(401).json({ error: "Token inválido o expirado" });
    }
}

module.exports = verifyToken;