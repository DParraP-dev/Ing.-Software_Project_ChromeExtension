const express = require("express");
const cors = require("cors");
const db = require("./config/database");
const authRoutes = require("./routes/auth.routes");

const app = express();

app.use(cors());
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

module.exports = app;
