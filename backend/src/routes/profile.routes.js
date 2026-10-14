const express = require("express");
const db = require("../config/database");
const verifyToken = require("../middleware/auth.middleware");
const {
    PROFILE_FIELDS,
    sanitizeProfileInput,
    buildSelectColumns
} = require("../models/profile.fields");

const router = express.Router();

// Los nombres de columna salen de PROFILE_FIELDS (lista fija del código),
// nunca del request, así que es seguro interpolarlos en el SQL.
const COLUMNS = PROFILE_FIELDS.map((field) => field.column);
const SELECT_COLUMNS = buildSelectColumns();

// OBTENER el perfil del usuario logueado
router.get("/", verifyToken, async (req, res) => {
    try {
        const [profileRows] = await db.query(
            `SELECT ${SELECT_COLUMNS} FROM profiles WHERE user_id = ?`,
            [req.userId]
        );

        const [userRows] = await db.query(
            "SELECT email FROM users WHERE id = ?",
            [req.userId]
        );
        const accountEmail = userRows[0]?.email ?? null;

        if (profileRows.length === 0) {
            return res.json({ profile: null, skills: [], accountEmail });
        }

        const profile = profileRows[0];
        const [skillRows] = await db.query(
            "SELECT skill FROM knowledge WHERE profile_id = ?",
            [profile.id]
        );

        res.json({ profile, skills: skillRows.map(row => row.skill), accountEmail });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error del servidor" });
    }
});

// GUARDAR (crear o actualizar) el perfil del usuario logueado
router.post("/", verifyToken, async (req, res) => {
    const { values, skills, errors } = sanitizeProfileInput(req.body);

    if (errors.length > 0) {
        return res.status(400).json({ error: errors.join(". ") });
    }

    try {
        const [existing] = await db.query(
            "SELECT id FROM profiles WHERE user_id = ?",
            [req.userId]
        );

        const columnValues = COLUMNS.map((column) => values[column]);
        let profileId;

        if (existing.length > 0) {
            profileId = existing[0].id;
            await db.query(
                `UPDATE profiles SET ${COLUMNS.map((column) => `${column} = ?`).join(", ")} WHERE id = ?`,
                [...columnValues, profileId]
            );
            await db.query("DELETE FROM knowledge WHERE profile_id = ?", [profileId]);
        } else {
            const [result] = await db.query(
                `INSERT INTO profiles (user_id, ${COLUMNS.join(", ")})
                 VALUES (?, ${COLUMNS.map(() => "?").join(", ")})`,
                [req.userId, ...columnValues]
            );
            profileId = result.insertId;
        }

        if (skills.length > 0) {
            const rows = skills.map(skill => [profileId, skill]);
            await db.query("INSERT INTO knowledge (profile_id, skill) VALUES ?", [rows]);
        }

        res.json({ message: "Perfil guardado correctamente" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error del servidor" });
    }
});

module.exports = router;
