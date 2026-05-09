-- 1. Crear la tabla de conceptos de gastos
CREATE TABLE IF NOT EXISTS expense_concepts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    active BOOLEAN DEFAULT TRUE,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Agregar la columna concept_id a la tabla de gastos
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS concept_id INTEGER REFERENCES expense_concepts(id) ON DELETE SET NULL;

-- 3. Insertar conceptos iniciales sugeridos
INSERT INTO expense_concepts (name) VALUES 
('Supermercado'),
('Carnicería'),
('Verdulería'),
('Farmacia'),
('Nafta'),
('Servicios'),
('Otros')
ON CONFLICT (name) DO NOTHING;
