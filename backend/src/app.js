const express = require("express");
const cors = require("cors");
const db = require("./config/database");
const authRoutes = require("./routes/auth.routes");
const profileRoutes = require("./routes/profile.routes");
const logsRoutes = require("./routes/logs.routes");

const app = express();

// Orígenes permitidos para CORS. En producción se definen en CORS_ORIGINS
// (lista separada por comas con la URL del frontend desplegado). Si la
// variable no está definida (desarrollo local), se permite cualquier origen.
//
// Siempre se permiten:
//   - Peticiones sin cabecera Origin (terminal, apps nativas, same-origin).
//   - La extensión del navegador, que envía Origin "chrome-extension://..."
//     (o "moz-extension://..."); sin esto se rompería el autocompletado.
const allowedOrigins = (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

function isAllowedOrigin(origin) {
    if (!origin) return true;                          // sin Origin: terminal, apps nativas
    if (/^(chrome|moz)-extension:\/\//.test(origin)) return true; // la extensión FillPro
    if (allowedOrigins.length === 0) return true;      // sin lista: desarrollo local
    return allowedOrigins.includes(origin);
}

const corsOptions = {
    // Un origen no permitido NO lanza error (eso devolvía un 500 con HTML);
    // simplemente no se añaden las cabeceras CORS y el navegador bloquea.
    origin(origin, callback) {
        callback(null, isAllowedOrigin(origin));
    }
};

app.use(cors(corsOptions));
app.use(express.json());

// Ruta de prueba: confirma que el servidor Y la base de datos funcionan
app.get("/", async (req, res) => {
    try {
        await db.query("SELECT 1");
        res.json({ message: "API funcionando correctamente", database: "conectada" });
    } catch (err) {
        res.status(500).json({ message: "API funcionando pero la base de datos falló", error: err.message });
    }
});

app.use("/auth", authRoutes);
app.use("/profile", profileRoutes);
app.use("/logs", logsRoutes);

module.exports = app;
