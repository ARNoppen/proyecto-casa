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
-- 5. Tabla de Préstamos
CREATE TABLE IF NOT EXISTS loans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    entity VARCHAR(255),
    total_amount DECIMAL(15,2) NOT NULL,
    installments_count INTEGER NOT NULL,
    start_date DATE NOT NULL,
    due_day INTEGER NOT NULL, -- Día del mes que vence (1-31)
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    updated_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- 6. Tabla de Pagos de Préstamos
CREATE TABLE IF NOT EXISTS loan_payments (
    id SERIAL PRIMARY KEY,
    loan_id INTEGER NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    installment_number INTEGER, -- Opcional, para indicar qué cuota se está pagando
    payment_date DATE NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    created_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_to_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    payment_method VARCHAR(100),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL
);
