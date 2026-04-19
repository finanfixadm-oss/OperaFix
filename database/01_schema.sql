CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS app_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(180) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'admin',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rut VARCHAR(20) NOT NULL UNIQUE,
    business_name VARCHAR(255) NOT NULL,
    mandante VARCHAR(150),
    address TEXT,
    email VARCHAR(180),
    estimated_amount NUMERIC(18,2) DEFAULT 0,
    currency_code VARCHAR(10) DEFAULT 'CLP',
    exchange_rate NUMERIC(18,4) DEFAULT 1,
    owner_user_id UUID REFERENCES app_users(id),
    tag VARCHAR(100),
    unsubscribe_mode VARCHAR(100),
    unsubscribe_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS collaborators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    kam_user_id UUID REFERENCES app_users(id),
    owner_user_id UUID REFERENCES app_users(id),
    full_name VARCHAR(180) NOT NULL,
    position VARCHAR(120),
    email VARCHAR(180),
    phone VARCHAR(50),
    linkedin_url TEXT,
    profile_photo_path TEXT,
    tag VARCHAR(100),
    unsubscribe_mode VARCHAR(100),
    last_activity_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lm_company_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    mandante VARCHAR(150),
    owner_user_id UUID REFERENCES app_users(id),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
    secondary_email VARCHAR(180),
    group_power_file TEXT,
    groups_related TEXT,
    email_opt_out BOOLEAN NOT NULL DEFAULT FALSE,
    tag VARCHAR(100),
    unsubscribe_mode VARCHAR(100),
    unsubscribe_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lm_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lm_group_id UUID REFERENCES lm_company_groups(id) ON DELETE SET NULL,
    owner_user_id UUID REFERENCES app_users(id),
    modified_by_user_id UUID REFERENCES app_users(id),
    search_group VARCHAR(150),
    rut VARCHAR(20) NOT NULL,
    entity VARCHAR(120),
    management_status VARCHAR(120),
    refund_amount NUMERIC(18,2) DEFAULT 0,
    confirmation_cc BOOLEAN DEFAULT FALSE,
    confirmation_power BOOLEAN DEFAULT FALSE,
    actual_paid_amount NUMERIC(18,2) DEFAULT 0,
    excess_type_reason VARCHAR(150),
    worker_status VARCHAR(100),
    request_number VARCHAR(100),
    business_name VARCHAR(255),
    actual_finanfix_amount NUMERIC(18,2) DEFAULT 0,
    production_months TEXT,
    invoice_number VARCHAR(100),
    bank_name VARCHAR(120),
    account_number VARCHAR(100),
    account_type VARCHAR(80),
    client_contract_status VARCHAR(120),
    fee NUMERIC(18,2) DEFAULT 0,
    tag VARCHAR(100),
    unsubscribe_mode VARCHAR(100),
    unsubscribe_at TIMESTAMPTZ,
    connected_to VARCHAR(255),
    finanfix_invoice_payment_date DATE,
    finanfix_invoiced BOOLEAN DEFAULT FALSE,
    client_invoiced BOOLEAN DEFAULT FALSE,
    entity_paid BOOLEAN DEFAULT FALSE,
    afp_payment_date DATE,
    address TEXT,
    client_notification_date DATE,
    afp_submission_date DATE,
    finanfix_invoice_date DATE,
    other_banks TEXT,
    finanfix_group VARCHAR(150),
    rejection_annulment_reason TEXT,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
    client_amount NUMERIC(18,2) DEFAULT 0,
    finanfix_amount NUMERIC(18,2) DEFAULT 0,
    actual_client_amount NUMERIC(18,2) DEFAULT 0,
    contract_end_date DATE,
    rejection_date DATE,
    comment TEXT,
    oc_number VARCHAR(100),
    afp_shipment VARCHAR(120),
    afp_entry_date DATE,
    mandante VARCHAR(150),
    portal_access VARCHAR(100),
    cen_response VARCHAR(120),
    cen_query VARCHAR(120),
    request_entry_month VARCHAR(40),
    cen_content TEXT,
    note_badge BOOLEAN DEFAULT FALSE,
    activity_badge BOOLEAN DEFAULT FALSE,
    last_activity_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tp_company_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    mandante VARCHAR(150),
    owner_user_id UUID REFERENCES app_users(id),
    email VARCHAR(180),
    group_power_file TEXT,
    groups_related TEXT,
    tag VARCHAR(100),
    unsubscribe_mode VARCHAR(100),
    unsubscribe_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ,
    created_by_user_id UUID REFERENCES app_users(id),
    modified_by_user_id UUID REFERENCES app_users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tp_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tp_group_id UUID REFERENCES tp_company_groups(id) ON DELETE SET NULL,
    owner_user_id UUID REFERENCES app_users(id),
    modified_by_user_id UUID REFERENCES app_users(id),
    mandante VARCHAR(150),
    portal_access TEXT,
    production_months TEXT,
    comment TEXT,
    tag VARCHAR(100),
    client_contract_status VARCHAR(120),
    contract_end_date DATE,
    cen_content TEXT,
    cen_query TEXT,
    cen_response_file TEXT,
    image_path TEXT,
    last_activity_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    stored_filename VARCHAR(255) NOT NULL,
    storage_path TEXT NOT NULL,
    related_module VARCHAR(100) NOT NULL,
    related_record_id UUID,
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    mime_type VARCHAR(150),
    file_size BIGINT DEFAULT 0,
    uploaded_by_user_id UUID REFERENCES app_users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    related_module VARCHAR(100) NOT NULL,
    related_record_id UUID NOT NULL,
    author_user_id UUID REFERENCES app_users(id),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    related_module VARCHAR(100) NOT NULL,
    related_record_id UUID NOT NULL,
    user_id UUID REFERENCES app_users(id),
    activity_type VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    related_module VARCHAR(100) NOT NULL,
    related_record_id UUID NOT NULL,
    user_id UUID REFERENCES app_users(id),
    changed_field VARCHAR(150) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_companies_rut ON companies(rut);
CREATE INDEX IF NOT EXISTS idx_collaborators_company_id ON collaborators(company_id);
CREATE INDEX IF NOT EXISTS idx_lm_records_rut ON lm_records(rut);
CREATE INDEX IF NOT EXISTS idx_lm_records_status ON lm_records(management_status);
CREATE INDEX IF NOT EXISTS idx_lm_records_entity ON lm_records(entity);
CREATE INDEX IF NOT EXISTS idx_tp_records_group ON tp_records(tp_group_id);
CREATE INDEX IF NOT EXISTS idx_documents_module ON documents(related_module);
CREATE INDEX IF NOT EXISTS idx_activities_module_record ON activities(related_module, related_record_id);
CREATE INDEX IF NOT EXISTS idx_notes_module_record ON notes(related_module, related_record_id);

INSERT INTO app_users(full_name, email, password_hash, role)
VALUES ('Administrador OperaFix', 'admin@operafix.local', '$2b$10$2KLOp6FZYb8jVdA6Yp4J3.u8q7rd6rjr6w0u58F3QwOpkQF7pDqTq', 'admin')
ON CONFLICT (email) DO NOTHING;

INSERT INTO campaigns(name, description)
VALUES ('General 2026', 'Campaña base del sistema')
ON CONFLICT (name) DO NOTHING;
