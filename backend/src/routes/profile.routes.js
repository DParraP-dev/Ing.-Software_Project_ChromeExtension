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

const DEFAULT_PROFILE_NAME = "Mi perfil";
const MAX_PROFILE_NAME_LENGTH = 100;

// Normaliza el nombre visible de un perfil. Devuelve null si queda vacío.
function sanitizeProfileName(rawName) {
    if (rawName === undefined || rawName === null) {
        return null;
    }
    const text = String(rawName).trim().slice(0, MAX_PROFILE_NAME_LENGTH);
    return text === "" ? null : text;
}

// Resuelve qué perfil del usuario corresponde a la petición.
// - Si llega `id`, valida que pertenezca al usuario.
// - Si no llega `id`, usa el primer perfil del usuario (el más antiguo),
//   para mantener compatibilidad con los clientes que aún no manejan
//   múltiples perfiles (extensión, historial).
async function resolveProfileId(userId, requestedId) {
    if (requestedId !== undefined && requestedId !== null && String(requestedId) !== "") {
        const id = Number(requestedId);
        if (!Number.isInteger(id) || id <= 0) {
            return { error: "El id de perfil no es válido" };
        }
        const [rows] = await db.query(
            "SELECT id FROM profiles WHERE id = ? AND user_id = ?",
            [id, userId]
        );
        if (rows.length === 0) {
            return { notFound: true };
        }
        return { id };
    }

    const [rows] = await db.query(
        "SELECT id FROM profiles WHERE user_id = ? ORDER BY id ASC LIMIT 1",
        [userId]
    );
    return { id: rows.length > 0 ? rows[0].id : null };
}

// ------------------------------------------------------------------
// LISTA de perfiles del usuario (solo id + nombre, para el selector)
// ------------------------------------------------------------------
router.get("/list", verifyToken, async (req, res) => {
    try {
        const [rows] = await db.query(
            "SELECT id, profile_name FROM profiles WHERE user_id = ? ORDER BY id ASC",
            [req.userId]
        );
        res.json({ profiles: rows.map((row) => ({ id: row.id, name: row.profile_name })) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error del servidor" });
    }
});

// ------------------------------------------------------------------
// CREAR un perfil nuevo (vacío) con un nombre
// ------------------------------------------------------------------
router.post("/create", verifyToken, async (req, res) => {
    try {
        const name = sanitizeProfileName(req.body?.name) ?? DEFAULT_PROFILE_NAME;
        const [result] = await db.query(
            "INSERT INTO profiles (user_id, profile_name) VALUES (?, ?)",
            [req.userId, name]
        );
        res.status(201).json({
            message: "Perfil creado correctamente",
            profile: { id: result.insertId, name }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error del servidor" });
    }
});

// ------------------------------------------------------------------
// OBTENER un perfil (el indicado por ?id= o, si no llega, el primero)
// ------------------------------------------------------------------
router.get("/", verifyToken, async (req, res) => {
    try {
        const resolved = await resolveProfileId(req.userId, req.query.id);
        if (resolved.error) {
            return res.status(400).json({ error: resolved.error });
        }
        if (resolved.notFound) {
            return res.status(404).json({ error: "Perfil no encontrado" });
        }

        const [userRows] = await db.query(
            "SELECT email FROM users WHERE id = ?",
            [req.userId]
        );
        const accountEmail = userRows[0]?.email ?? null;

        if (resolved.id === null) {
            return res.json({ profile: null, skills: [], accountEmail });
        }

        const [profileRows] = await db.query(
            `SELECT ${SELECT_COLUMNS}, profile_name FROM profiles WHERE id = ?`,
            [resolved.id]
        );
        const profile = profileRows[0];

        const [skillRows] = await db.query(
            "SELECT skill FROM knowledge WHERE profile_id = ?",
            [profile.id]
        );

        res.json({ profile, skills: skillRows.map((row) => row.skill), accountEmail });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error del servidor" });
    }
});

// ------------------------------------------------------------------
// GUARDAR (crear o actualizar) un perfil.
// - ?id= indica cuál perfil se guarda.
// - Sin id y sin perfiles previos: se crea el primero (compatibilidad).
// ------------------------------------------------------------------
router.post("/", verifyToken, async (req, res) => {
    const { values, skills, errors } = sanitizeProfileInput(req.body);

    if (errors.length > 0) {
        return res.status(400).json({ error: errors.join(". ") });
    }

    const name = sanitizeProfileName(req.body?.profileName);

    try {
        const resolved = await resolveProfileId(req.userId, req.query.id);
        if (resolved.error) {
            return res.status(400).json({ error: resolved.error });
        }
        if (resolved.notFound) {
            return res.status(404).json({ error: "Perfil no encontrado" });
        }

        const columnValues = COLUMNS.map((column) => values[column]);
        let profileId = resolved.id;

        if (profileId !== null) {
            // Actualiza los datos; el nombre solo cambia si llegó uno nuevo.
            if (name !== null) {
                await db.query(
                    `UPDATE profiles SET profile_name = ?, ${COLUMNS.map((c) => `${c} = ?`).join(", ")} WHERE id = ?`,
                    [name, ...columnValues, profileId]
                );
            } else {
                await db.query(
                    `UPDATE profiles SET ${COLUMNS.map((c) => `${c} = ?`).join(", ")} WHERE id = ?`,
                    [...columnValues, profileId]
                );
            }
            await db.query("DELETE FROM knowledge WHERE profile_id = ?", [profileId]);
        } else {
            const [result] = await db.query(
                `INSERT INTO profiles (user_id, profile_name, ${COLUMNS.join(", ")})
                 VALUES (?, ?, ${COLUMNS.map(() => "?").join(", ")})`,
                [req.userId, name ?? DEFAULT_PROFILE_NAME, ...columnValues]
            );
            profileId = result.insertId;
        }

        if (skills.length > 0) {
            const rows = skills.map((skill) => [profileId, skill]);
            await db.query("INSERT INTO knowledge (profile_id, skill) VALUES ?", [rows]);
        }

        res.json({ message: "Perfil guardado correctamente", profileId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error del servidor" });
    }
});

module.exports = router;
