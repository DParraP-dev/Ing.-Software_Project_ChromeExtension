const express = require("express");
const db = require("../config/database");
const verifyToken = require("../middleware/auth.middleware");

const router = express.Router();

// Solo se guarda el dominio: la URL completa puede traer datos privados
// (códigos de sesión, identificadores de la postulación, etc.)
function toDomain(website) {
    try {
        return new URL(website).hostname;
    } catch {
        return website.trim().toLowerCase();
    }
}

// REGISTRAR un autocompletado del usuario logueado
router.post("/", verifyToken, async (req, res) => {
    try {
        const { website, fieldsCompleted } = req.body;

        if (typeof website !== "string" || website.trim() === "") {
            return res.status(400).json({ error: "El sitio web es obligatorio" });
        }

        const domain = toDomain(website);

        if (domain.length > 255) {
            return res.status(400).json({ error: "El sitio web es demasiado largo" });
        }

        const [result] = await db.query(
            "INSERT INTO logs (user_id, website) VALUES (?, ?)",
            [req.userId, domain]
        );

        const fields = Array.isArray(fieldsCompleted)
            ? fieldsCompleted.filter(field => typeof field === "string" && field.trim() !== "")
            : [];

        if (fields.length > 0) {
            const values = fields.map(field => [result.insertId, field.trim().slice(0, 100)]);
            await db.query("INSERT INTO log_fields (log_id, field_name) VALUES ?", [values]);
        }

        res.status(201).json({ message: "Registro guardado correctamente", logId: result.insertId });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error del servidor" });
    }
});

// OBTENER el historial del usuario logueado, del más reciente al más antiguo
router.get("/", verifyToken, async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT l.id, l.website, l.created_at, f.field_name
             FROM logs l
             LEFT JOIN log_fields f ON f.log_id = l.id
             WHERE l.user_id = ?
             ORDER BY l.created_at DESC, l.id DESC, f.id ASC`,
            [req.userId]
        );

        // Cada log puede venir en varias filas (una por campo): se agrupan
        const logs = [];
        const logsById = new Map();

        for (const row of rows) {
            if (!logsById.has(row.id)) {
                const log = { id: row.id, website: row.website, date: row.created_at, fieldsCompleted: [] };
                logsById.set(row.id, log);
                logs.push(log);
            }
            if (row.field_name) {
                logsById.get(row.id).fieldsCompleted.push(row.field_name);
            }
        }

        res.json(logs);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error del servidor" });
    }
});

// BORRAR todo el historial del usuario logueado
router.delete("/", verifyToken, async (req, res) => {
    try {
        // Primero los campos, porque log_fields depende de logs
        await db.query(
            `DELETE f FROM log_fields f
             JOIN logs l ON f.log_id = l.id
             WHERE l.user_id = ?`,
            [req.userId]
        );

        const [result] = await db.query("DELETE FROM logs WHERE user_id = ?", [req.userId]);

        res.json({ message: "Historial borrado correctamente", deleted: result.affectedRows });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error del servidor" });
    }
});

module.exports = router;
