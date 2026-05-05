-- Inicialización de Base de Datos para Proyecto Casa (PostgreSQL / Supabase)

-- 1. Tabla de Usuarios Globales
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    is_active BOOLEAN DEFAULT TRUE,
    default_contribution DECIMAL(10,2) DEFAULT 0.00
);

-- 2. Tabla de Configuración Mensual (El "Período Agrupador")
CREATE TABLE IF NOT EXISTS monthly_configs (
    id SERIAL PRIMARY KEY,
    month SMALLINT NOT NULL, -- 1 a 12
    year INTEGER NOT NULL,
    total_budget DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (month, year) -- Evita duplicar el mismo mes
);

-- 3. Tabla Pivote de Configuración de Aportes por Miembro (La "Foto" inmutable del mes)
CREATE TABLE IF NOT EXISTS monthly_member_configs (
    id SERIAL PRIMARY KEY,
    monthly_config_id INTEGER NOT NULL REFERENCES monthly_configs(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expected_contribution DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    is_active_for_month BOOLEAN DEFAULT TRUE,
    UNIQUE (monthly_config_id, user_id) -- Un usuario no puede tener dos configuraciones en el mismo mes
);

-- 4. Tabla de Gastos (Tickets reales)
CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    created_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_to_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    monthly_config_id INTEGER NOT NULL REFERENCES monthly_configs(id) ON DELETE CASCADE,
    date TIMESTAMP NOT NULL, -- Fecha real en la que el usuario hizo el gasto
    amount DECIMAL(10,2) NOT NULL,
    description VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Fecha técnica de carga en sistema
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- En PostgreSQL, esto se actualizará desde el backend al editar
);

-- Insertar un Admin por defecto si no existe ninguno
INSERT INTO users (name, email, password_hash, role, is_active, default_contribution) 
VALUES ('Admin Familia', 'admin@casa.com', '$2b$10$ZdClgtj9aeJWWDtRQAjnOeWkHeGkEa65IA.A39szeoiqL.PUc4Dum', 'admin', TRUE, 0.00)
ON CONFLICT (email) DO NOTHING;
