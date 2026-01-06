-- Casino Management Platform Database Schema
-- Version: 1.0.0
-- Description: Initial schema with all tables for the casino platform

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =======================
-- USERS TABLE
-- =======================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('OWNER', 'ADMIN', 'CASHIER', 'PLAYER')),
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'BLOCKED', 'PENDING')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for parent-child relationships
CREATE INDEX idx_users_parent_user_id ON users(parent_user_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);

-- =======================
-- BALANCES TABLE
-- =======================
CREATE TABLE IF NOT EXISTS balances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    chip_balance NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (chip_balance >= 0),
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_balances_user_id ON balances(user_id);

-- =======================
-- CHIP MOVEMENTS TABLE
-- =======================
CREATE TABLE IF NOT EXISTS chip_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    related_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'SELL_TO_PLAYER', 'BUY_FROM_ADMIN', 'PRIZE', 'LOSS',
        'WITHDRAWAL', 'DEPOSIT', 'RECOVERY', 'ADJUSTMENT',
        'PANEL_ASSIGNMENT', 'PANEL_SALE'
    )),
    amount NUMERIC(15, 2) NOT NULL,
    description TEXT,
    previous_balance NUMERIC(15, 2) NOT NULL,
    new_balance NUMERIC(15, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chip_movements_user_id ON chip_movements(user_id);
CREATE INDEX idx_chip_movements_related_user_id ON chip_movements(related_user_id);
CREATE INDEX idx_chip_movements_type ON chip_movements(type);
CREATE INDEX idx_chip_movements_created_at ON chip_movements(created_at);

-- =======================
-- CASHIER COMPENSATION MODES TABLE
-- =======================
CREATE TABLE IF NOT EXISTS cashier_compensation_modes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cashier_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('PERCENTAGE', 'PANEL', 'FIXED', 'HYBRID')),
    percentage NUMERIC(5, 2) CHECK (percentage >= 0 AND percentage <= 100),
    active_from TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    active_to TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_compensation_modes_cashier_id ON cashier_compensation_modes(cashier_id);
CREATE INDEX idx_compensation_modes_active_from ON cashier_compensation_modes(active_from);
CREATE INDEX idx_compensation_modes_active_to ON cashier_compensation_modes(active_to);

-- =======================
-- CASHIER SETTLEMENTS TABLE
-- =======================
CREATE TABLE IF NOT EXISTS cashier_settlements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cashier_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    total_sales NUMERIC(15, 2) NOT NULL DEFAULT 0,
    total_prizes_paid NUMERIC(15, 2) NOT NULL DEFAULT 0,
    profit NUMERIC(15, 2) NOT NULL DEFAULT 0,
    payable_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'CANCELED', 'PARTIALLY_PAID')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    paid_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT check_period CHECK (period_end > period_start)
);

CREATE INDEX idx_settlements_cashier_id ON cashier_settlements(cashier_id);
CREATE INDEX idx_settlements_period_start ON cashier_settlements(period_start);
CREATE INDEX idx_settlements_period_end ON cashier_settlements(period_end);
CREATE INDEX idx_settlements_status ON cashier_settlements(status);

-- =======================
-- CHIP PANELS TABLE
-- =======================
CREATE TABLE IF NOT EXISTS chip_panels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cashier_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    buy_price_per_chip NUMERIC(10, 2) NOT NULL CHECK (buy_price_per_chip > 0),
    sell_price_per_chip NUMERIC(10, 2) NOT NULL CHECK (sell_price_per_chip > 0),
    total_chips INTEGER NOT NULL CHECK (total_chips > 0),
    sold_chips INTEGER NOT NULL DEFAULT 0 CHECK (sold_chips >= 0 AND sold_chips <= total_chips),
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'FULLY_SOLD', 'SETTLED', 'CANCELED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    settled_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT check_prices CHECK (sell_price_per_chip > buy_price_per_chip)
);

CREATE INDEX idx_panels_cashier_id ON chip_panels(cashier_id);
CREATE INDEX idx_panels_status ON chip_panels(status);
CREATE INDEX idx_panels_created_at ON chip_panels(created_at);

-- =======================
-- RECOVERIES TABLE
-- =======================
CREATE TABLE IF NOT EXISTS recoveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cashier_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    related_movement_id UUID REFERENCES chip_movements(id) ON DELETE SET NULL,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    recovery_mode VARCHAR(50) NOT NULL CHECK (recovery_mode IN ('AUTO_DEDUCT_FROM_COMMISSION', 'INSTALMENTS', 'MANUAL')),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PARTIALLY_PAID', 'PAID', 'CANCELED')),
    amount_paid NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0 AND amount_paid <= amount),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_recoveries_admin_id ON recoveries(admin_id);
CREATE INDEX idx_recoveries_cashier_id ON recoveries(cashier_id);
CREATE INDEX idx_recoveries_status ON recoveries(status);
CREATE INDEX idx_recoveries_created_at ON recoveries(created_at);

-- =======================
-- USER GAME PROVIDER BLOCKLIST TABLE
-- =======================
CREATE TABLE IF NOT EXISTS user_game_provider_blocklist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider_id VARCHAR(100) NOT NULL,
    blocked_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, provider_id)
);

CREATE INDEX idx_blocklist_user_id ON user_game_provider_blocklist(user_id);
CREATE INDEX idx_blocklist_provider_id ON user_game_provider_blocklist(provider_id);
CREATE INDEX idx_blocklist_blocked_by ON user_game_provider_blocklist(blocked_by);

-- =======================
-- SESSIONS TABLE
-- =======================
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_refresh_token ON sessions(refresh_token);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- =======================
-- AUDIT LOG TABLE
-- =======================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- =======================
-- TRIGGERS
-- =======================

-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recoveries_updated_at BEFORE UPDATE ON recoveries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update balance last_updated_at automatically
CREATE OR REPLACE FUNCTION update_balance_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_balances_timestamp BEFORE UPDATE ON balances
    FOR EACH ROW EXECUTE FUNCTION update_balance_timestamp();

-- =======================
-- INITIAL DATA
-- =======================

-- Insert owner user (password: owner123456 - should be changed immediately)
-- Password hash for 'owner123456' using bcrypt with 10 rounds
INSERT INTO users (id, parent_user_id, role, username, email, password_hash, status)
VALUES (
    uuid_generate_v4(),
    NULL,
    'OWNER',
    'owner',
    'owner@casino.com',
    '$2b$10$rHHXXnN3qPYGPbMQx9h7SuXKGr6kKmHQGKJZX4qJv5YQv5pXQQQQQ', -- This is a placeholder, will be replaced by bootstrap script
    'ACTIVE'
) ON CONFLICT (username) DO NOTHING;

-- Create initial balance for owner
INSERT INTO balances (user_id, chip_balance)
SELECT id, 0 FROM users WHERE username = 'owner'
ON CONFLICT (user_id) DO NOTHING;

-- =======================
-- COMMENTS
-- =======================

COMMENT ON TABLE users IS 'Stores all users in the casino platform with hierarchical structure';
COMMENT ON TABLE balances IS 'Tracks chip balances for each user';
COMMENT ON TABLE chip_movements IS 'Audit log for all chip transactions';
COMMENT ON TABLE cashier_compensation_modes IS 'Defines how cashiers are compensated';
COMMENT ON TABLE cashier_settlements IS 'Periodic settlements for cashiers with percentage compensation';
COMMENT ON TABLE chip_panels IS 'Panels for cashiers with panel-based compensation';
COMMENT ON TABLE recoveries IS 'Tracks recovery operations between admins and cashiers';
COMMENT ON TABLE user_game_provider_blocklist IS 'Blocklist for game providers per user';
COMMENT ON TABLE sessions IS 'Active user sessions for authentication';
COMMENT ON TABLE audit_logs IS 'System-wide audit trail';
