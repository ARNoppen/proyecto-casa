# Gestión Personal (Finanzas Familiares)

Sistema web para el control de gastos familiares, presupuesto colaborativo y seguimiento mensual.

## 🚀 Características
- **Autenticación**: Login basado en JWT.
- **Dashboard**: Resumen mensual, progreso por integrante y presupuesto total de la casa.
- **Gestión de Gastos**: Registro de egresos con asignación de responsables.
- **Administración**: Gestión de usuarios (roles Admin/Familiar) y apertura de periodos mensuales.
- **Aesthetics**: Interfaz moderna, minimalista y oscura (Dark Mode) con acento en color lima.

## 🛠️ Stack Tecnológico
- **Frontend**: Vue 3 (Composition API), Vite, Pinia (Store), Vue Router.
- **Backend**: Node.js, Express.
- **Base de Datos**: MySQL 8.0.
- **Comunicaciones**: Axios con interceptores para JWT.

## 📁 Estructura del Proyecto
- `/backend`: Servidor Express y lógica de API.
- `/frontend`: Aplicación SPA con Vue 3.

## ⚙️ Configuración

### 1. Requisitos previos
- Node.js (v18+)
- MySQL Server 8.0

### 2. Base de Datos
1. Crea una base de datos llamada `proyecto_casa_db`.
2. Ejecuta el script de inicialización ubicado en `backend/src/db/init.sql`.

### 3. Variables de Entorno
Copia los archivos `.env.example` a `.env` en sus respectivas carpetas y completa los valores:
- `backend/.env`
- `frontend/.env` (Opcional, tiene fallbacks)

### 4. Instalación y Ejecución
Desde la raíz del proyecto:
```bash
# Instalar todas las dependencias (Root, Backend y Frontend)
npm run install:all

# Levantar Backend (Puerto 3000 por defecto)
npm run dev:backend

# Levantar Frontend (Puerto 5173 por defecto)
npm run dev:frontend
```

## 🔐 Seguridad
- Las contraseñas se almacenan hasheadas con `bcrypt`.
- Las rutas están protegidas mediante Middlewares de autenticación y verificación de roles a nivel de API y Router.

## 📝 Estado del Proyecto
Actualmente el proyecto se encuentra en una versión funcional **MVP (Minimum Viable Product)** con los módulos de Usuarios, Meses, Gastos y Dashboard integrados.
