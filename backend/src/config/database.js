const mysql = require('mysql2/promise');
require('dotenv').config();

// Los proveedores de MySQL en la nube (TiDB, Aiven, etc.) exigen conexión
// cifrada (TLS). Se activa con DB_SSL=true en el .env de producción; en local
// se deja sin definir y la conexión a localhost va sin cifrar, como siempre.
const useSSL = process.env.DB_SSL === 'true';

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    waitForConnections: true,
    connectionLimit: 10,
    ...(useSSL ? { ssl: { minVersion: 'TLSv1.2' } } : {})
});

module.exports = pool;