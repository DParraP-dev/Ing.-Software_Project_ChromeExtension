const express = require("express");
const db = require("../config/database");
const verifyToken = require("../middleware/auth.middleware");

const router = express.Router();

// OBTENER el perfil del usuario logueado
router.get("/", verifyToken, async (req, res) => {
    try {
        const [profileRows] = await db.query(
            "SELECT * FROM profiles WHERE user_id = ?",
            [req.userId]
        );

        if (profileRows.length === 0) {
            return res.json({ profile: null, skills: [] });
        }

        const profile = profileRows[0];
        const [skillRows] = await db.query(
            "SELECT skill FROM knowledge WHERE profile_id = ?",
            [profile.id]
        );

        res.json({ profile, skills: skillRows.map(row => row.skill) });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error del servidor" });
    }
});

// GUARDAR (crear o actualizar) el perfil del usuario logueado
router.post("/", verifyToken, async (req, res) => {
    try {
        const { firstName, lastName, phone, country, city, linkedin, github, skills } = req.body;

        const [existing] = await db.query(
            "SELECT id FROM profiles WHERE user_id = ?",
            [req.userId]
        );

        let profileId;

        if (existing.length > 0) {
            profileId = existing[0].id;
            await db.query(
                `UPDATE profiles
                 SET first_name = ?, last_name = ?, phone = ?, country = ?, city = ?, linkedin = ?, github = ?
                 WHERE id = ?`,
                [firstName, lastName, phone, country, city, linkedin, github, profileId]
            );
            await db.query("DELETE FROM knowledge WHERE profile_id = ?", [profileId]);
        } else {
            const [result] = await db.query(
                `INSERT INTO profiles (user_id, first_name, last_name, phone, country, city, linkedin, github)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [req.userId, firstName, lastName, phone, country, city, linkedin, github]
            );
            profileId = result.insertId;
        }

        if (Array.isArray(skills) && skills.length > 0) {
            const values = skills.map(skill => [profileId, skill]);
            await db.query("INSERT INTO knowledge (profile_id, skill) VALUES ?", [values]);
        }

        res.json({ message: "Perfil guardado correctamente" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error del servidor" });
    }
});

module.exports = router;