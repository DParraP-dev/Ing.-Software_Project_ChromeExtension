const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// PETICION ENDPOINT DE PRUEBA:
// app.get("/", (req, res) => {
//     res.json({
//         message: "API funcionando correctamente"
//     });
// });

module.exports = app;
