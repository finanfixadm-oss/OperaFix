-- V118 / V119 - Carga masiva 42 campos oficiales CRM
-- Agrega soporte para "Porcentaje de liquidaciones" y mantiene compatibilidad
-- con cargas masivas antiguas/legacy. Ejecutar en PostgreSQL/Railway.

ALTER TABLE IF EXISTS managements
  ADD COLUMN IF NOT EXISTS porcentaje_liquidaciones text;

ALTER TABLE IF EXISTS lm_records
  ADD COLUMN IF NOT EXISTS porcentaje_liquidaciones text;

ALTER TABLE IF EXISTS tp_records
  ADD COLUMN IF NOT EXISTS porcentaje_liquidaciones text;

COMMENT ON COLUMN managements.porcentaje_liquidaciones IS 'Campo oficial carga masiva CRM: Porcentaje de liquidaciones. Valores esperados: Si, No, No aplica o vacío.';
COMMENT ON COLUMN lm_records.porcentaje_liquidaciones IS 'Campo oficial carga masiva CRM: Porcentaje de liquidaciones. Valores esperados: Si, No, No aplica o vacío.';
COMMENT ON COLUMN tp_records.porcentaje_liquidaciones IS 'Campo oficial carga masiva CRM: Porcentaje de liquidaciones. Valores esperados: Si, No, No aplica o vacío.';
