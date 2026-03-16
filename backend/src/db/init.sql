-- Inicialización de Base de Datos para Proyecto Casa (Finanzas Familiares)

CREATE DATABASE IF NOT EXISTS proyecto_casa_db;
USE proyecto_casa_db;

-- 1. Tabla de Usuarios Globales
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'user') DEFAULT 'user',
    is_active BOOLEAN DEFAULT TRUE,
    default_contribution DECIMAL(10,2) DEFAULT 0.00
);

-- 2. Tabla de Configuración Mensual (El "Período Agrupador")
CREATE TABLE IF NOT EXISTS monthly_configs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    month TINYINT NOT NULL, -- 1 a 12
    year YEAR NOT NULL,
    total_budget DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    status ENUM('open', 'closed') DEFAULT 'open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_month_year (month, year) -- Evita duplicar el mismo mes
);

-- 3. Tabla Pivote de Configuración de Aportes por Miembro (La "Foto" inmutable del mes)
CREATE TABLE IF NOT EXISTS monthly_member_configs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    monthly_config_id INT NOT NULL,
    user_id INT NOT NULL,
    expected_contribution DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    is_active_for_month BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (monthly_config_id) REFERENCES monthly_configs(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_member_month (monthly_config_id, user_id) -- Un usuario no puede tener dos configuraciones en el mismo mes
);

-- 4. Tabla de Gastos (Tickets reales)
CREATE TABLE IF NOT EXISTS expenses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    created_by_user_id INT NOT NULL, -- Quién cargó el ticket físicamente en la app
    assigned_to_user_id INT NOT NULL, -- A quién se le suma esto en su barra de progreso del mes
    monthly_config_id INT NOT NULL,
    date DATETIME NOT NULL, -- Fecha real en la que el usuario hizo el gasto
    amount DECIMAL(10,2) NOT NULL,
    description VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Fecha técnica de carga en sistema
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, -- Fecha técnica de última edición
    FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (monthly_config_id) REFERENCES monthly_configs(id) ON DELETE CASCADE
);

-- Insertar un Admin por defecto (Password por defecto: admin123)
-- El hash de "admin123" usando bcrypt con un coste de 10 es $2b$10$wYQ.eP7M3YwJ.z.yN9Y/Oeeh0kF0O5Q4Y0wY0.O7wY0.O7wY0.O7wY (este es un hash dummy, en la app real se debe usar bcrypt)
-- Se recomienda cambiar la contraseña inmediatamente.
INSERT IGNORE INTO users (name, email, password_hash, role, is_active, default_contribution) 
VALUES ('Admin Familia', 'admin@casa.com', '$2b$10$ZdClgtj9aeJWWDtRQAjnOeWkHeGkEa65IA.A39szeoiqL.PUc4Dum', 'admin', TRUE, 0.00);
