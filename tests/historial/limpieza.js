// Borra los usuarios de prueba cuyo correo coincide con el patrón, junto con
// sus datos. Se llama al empezar y al terminar cada prueba, así también se
// limpian los restos de una ejecución que se haya interrumpido.
async function cleanupTestUsers(db, emailPattern) {
    await db.query(
        `DELETE f FROM log_fields f
         JOIN logs l ON f.log_id = l.id
         JOIN users u ON l.user_id = u.id
         WHERE u.email LIKE ?`,
        [emailPattern]
    );
    await db.query(
        "DELETE l FROM logs l JOIN users u ON l.user_id = u.id WHERE u.email LIKE ?",
        [emailPattern]
    );
    await db.query(
        `DELETE k FROM knowledge k
         JOIN profiles p ON k.profile_id = p.id
         JOIN users u ON p.user_id = u.id
         WHERE u.email LIKE ?`,
        [emailPattern]
    );
    await db.query(
        "DELETE p FROM profiles p JOIN users u ON p.user_id = u.id WHERE u.email LIKE ?",
        [emailPattern]
    );
    await db.query("DELETE FROM users WHERE email LIKE ?", [emailPattern]);
}

module.exports = { cleanupTestUsers };
