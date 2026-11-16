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
// Las peticiones de la extensión y del frontend abierto como archivo pueden
// llegar sin cabecera Origin o con "null"; esas siempre se permiten, o se
// rompería el autocompletado.
const allowedOrigins = (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const corsOptions = {
    origin(origin, callback) {
        if (allowedOrigins.length === 0 || !origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error("Origen no permitido por CORS"));
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
