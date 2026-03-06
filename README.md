# 🚀 RestoCheck API - Backend

Esta es la API RESTful para el proyecto **RestoCheck**, desarrollada con **Node.js** y **Express**. Se encarga de la lógica de negocio, manejo de base de datos y comunicación con el frontend en Angular.

## 🛠️ Tecnologías utilizadas

*   **Node.js**: Entorno de ejecución.
*   **Express**: Framework para el servidor web.
*   **CORS**: Para permitir peticiones desde el frontend.
*   **Dotenv**: Para el manejo de variables de entorno.
*   **Nodemon** (Desarrollo): Para reinicio automático del servidor.

## ⚙️ Configuración del Proyecto

Debido a que el archivo `.env` está ignorado por seguridad, debes crearlo manualmente para que el proyecto funcione.

1.  **Clonar el repositorio:**
    ```bash
    git clone https://github.com/TU_USUARIO/TU_REPO_BACKEND.git
    cd TU_REPO_BACKEND
    ```

2.  **Instalar dependencias:**
    ```bash
    npm install
    ```

3.  **Configurar variables de entorno:**
    Crea un archivo llamado `.env` en la raíz del proyecto y añade lo siguiente:
    ```env
    PORT=3000
    NODE_ENV=development
    # Añade aquí tus claves de BD o JWT más adelante
    ```

## 🚀 Cómo ejecutar

*   **Modo desarrollo (con auto-recarga):**
    ```bash
    npm run dev
    ```
    *Nota: Asegúrate de tener configurado "dev": "nodemon index.js" en tu package.json.*

*   **Modo producción:**
    ```bash
    npm start
    ```

## 🔌 Endpoints principales (API)

| Método | Ruta | Descripción |
| :--- | :--- | :--- |
| GET | `/api/status` | Verifica si el servidor está online. |
| GET | `/api/items` | Obtiene la lista de elementos (ejemplo). |
| POST | `/api/login` | Autenticación de usuarios (pendiente). |

## 📁 Estructura de carpetas

*   `index.js`: Punto de entrada de la aplicación.
*   `routes/`: Definición de las rutas de la API.
*   `controllers/`: Lógica de cada endpoint.
*   `models/`: Esquemas de base de datos.
*   `.env`: Variables secretas (No subir a GitHub).
