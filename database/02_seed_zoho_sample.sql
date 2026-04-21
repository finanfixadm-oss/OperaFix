-- Datos base de ejemplo inspirados en la estructura exportada desde Zoho
-- Ejecutar solo si quieres poblar datos de demostración en una base limpia.

INSERT INTO companies (id, rut, business_name, mandante, email, created_at, updated_at)
VALUES
  ('11111111-1111-1111-1111-111111111111', '76123456-7', 'Optimiza Consulting', 'Optimiza Consulting', 'informaciones@optimizaco.cl', NOW(), NOW()),
  ('22222222-2222-2222-2222-222222222222', '77987654-3', 'Mundo Previsional', 'Mundo Previsional', 'contacto@mundoprevisional.cl', NOW(), NOW())
ON CONFLICT (rut) DO NOTHING;

INSERT INTO collaborators (id, company_id, full_name, position, email, created_at, updated_at)
VALUES
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Amalia Garay', 'Colaborador', 'agaray@optimizaco.cl', NOW(), NOW()),
  ('44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', 'Sebastián Mendoza', 'Administrador', 'smendoza@finanfix.cl', NOW(), NOW())
ON CONFLICT DO NOTHING;

INSERT INTO lm_company_groups (id, name, mandante, secondary_email, created_at, updated_at)
VALUES
  ('55555555-5555-5555-5555-555555555555', 'ACCIONA', 'Optimiza Consulting', 'apoyo@optimizaco.cl', NOW(), NOW()),
  ('66666666-6666-6666-6666-666666666666', 'AGUNSA', 'Mundo Previsional', 'contacto@mundoprevisional.cl', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

INSERT INTO lm_records (
  id, lm_group_id, rut, business_name, entity, management_status, refund_amount,
  confirmation_cc, confirmation_power, actual_paid_amount, request_number,
  mandante, portal_access, created_at, updated_at
)
VALUES
  ('77777777-7777-7777-7777-777777777777', '55555555-5555-5555-5555-555555555555', '96717980-9', 'ACCIONA CONSTRUCCION S.A. AGENCIA CHILE', 'AFP CAPITAL', 'Pendiente Gestión', 12998, true, true, 0, 'SOL-001', 'Optimiza Consulting', 'Sí', NOW(), NOW()),
  ('88888888-8888-8888-8888-888888888888', '66666666-6666-6666-6666-666666666666', '99567050-K', 'CONSTRUCTORA RUTA 160 S.A.', 'AFP MODELO', 'Pagado', 7710529, true, true, 7710529, 'SOL-002', 'Mundo Previsional', 'Sí', NOW(), NOW())
ON CONFLICT DO NOTHING;
