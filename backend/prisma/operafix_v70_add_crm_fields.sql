-- OperaFix V70 - Campos oficiales BBDD CRM para LM/TP
-- Ejecutar si NO usarás `npx prisma db push`.

ALTER TABLE lm_records ADD COLUMN IF NOT EXISTS direccion TEXT;
ALTER TABLE lm_records ADD COLUMN IF NOT EXISTS mes_ingreso_solicitud TEXT;
ALTER TABLE lm_records ADD COLUMN IF NOT EXISTS monto_real_cliente DECIMAL(18,2);
ALTER TABLE lm_records ADD COLUMN IF NOT EXISTS monto_real_finanfix_solutions DECIMAL(18,2);
ALTER TABLE lm_records ADD COLUMN IF NOT EXISTS fecha_notificacion_cliente TIMESTAMP;

ALTER TABLE tp_records ADD COLUMN IF NOT EXISTS direccion TEXT;
ALTER TABLE tp_records ADD COLUMN IF NOT EXISTS confirmation_cc BOOLEAN DEFAULT false;
ALTER TABLE tp_records ADD COLUMN IF NOT EXISTS confirmation_power BOOLEAN DEFAULT false;
ALTER TABLE tp_records ADD COLUMN IF NOT EXISTS mes_ingreso_solicitud TEXT;
ALTER TABLE tp_records ADD COLUMN IF NOT EXISTS motivo_tipo_exceso TEXT;
ALTER TABLE tp_records ADD COLUMN IF NOT EXISTS envio_afp TEXT;
ALTER TABLE tp_records ADD COLUMN IF NOT EXISTS fecha_presentacion_afp TIMESTAMP;
ALTER TABLE tp_records ADD COLUMN IF NOT EXISTS fecha_ingreso_afp TIMESTAMP;
ALTER TABLE tp_records ADD COLUMN IF NOT EXISTS fecha_pago_afp TIMESTAMP;
ALTER TABLE tp_records ADD COLUMN IF NOT EXISTS monto_cliente DECIMAL(18,2);
ALTER TABLE tp_records ADD COLUMN IF NOT EXISTS fee DECIMAL(18,2);
ALTER TABLE tp_records ADD COLUMN IF NOT EXISTS monto_finanfix_solutions DECIMAL(18,2);
ALTER TABLE tp_records ADD COLUMN IF NOT EXISTS monto_real_cliente DECIMAL(18,2);
ALTER TABLE tp_records ADD COLUMN IF NOT EXISTS monto_real_finanfix_solutions DECIMAL(18,2);
ALTER TABLE tp_records ADD COLUMN IF NOT EXISTS facturado_finanfix TEXT;
ALTER TABLE tp_records ADD COLUMN IF NOT EXISTS facturado_cliente TEXT;
ALTER TABLE tp_records ADD COLUMN IF NOT EXISTS fecha_factura_finanfix TIMESTAMP;
ALTER TABLE tp_records ADD COLUMN IF NOT EXISTS fecha_pago_factura_finanfix TIMESTAMP;
ALTER TABLE tp_records ADD COLUMN IF NOT EXISTS fecha_notificacion_cliente TIMESTAMP;
ALTER TABLE tp_records ADD COLUMN IF NOT EXISTS numero_factura TEXT;
ALTER TABLE tp_records ADD COLUMN IF NOT EXISTS numero_oc TEXT;
ALTER TABLE tp_records ADD COLUMN IF NOT EXISTS fecha_rechazo TIMESTAMP;
ALTER TABLE tp_records ADD COLUMN IF NOT EXISTS motivo_rechazo TEXT;
