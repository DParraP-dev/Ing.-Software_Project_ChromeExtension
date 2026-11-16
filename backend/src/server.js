require("dotenv").config();

// Sin JWT_SECRET el login y la verificación de tokens fallarían en cada
// petición con un error poco claro. Mejor fallar al arrancar con un mensaje
// explícito que recuerde configurar la variable (clave al desplegar).
if (!process.env.JWT_SECRET) {
    console.error("Falta la variable de entorno JWT_SECRET. Defínela en backend/.env (o en las variables del servidor) antes de arrancar.");
    process.exit(1);
}

const app = require("./app");

// La nube (Render y similares) asigna el puerto por la variable de entorno PORT.
// En local, si no está definida, se usa 3000 como respaldo.
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en el puerto ${PORT}`);
});
