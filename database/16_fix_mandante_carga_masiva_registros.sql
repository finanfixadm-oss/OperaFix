-- V121 - Refuerza la asignación de mandante para registros importados y filtros por pestaña.
-- Seguro de ejecutar más de una vez.

ALTER TABLE IF EXISTS lm_records
  ADD COLUMN IF NOT EXISTS mandante_id text,
  ADD COLUMN IF NOT EXISTS mandante text;

ALTER TABLE IF EXISTS tp_records
  ADD COLUMN IF NOT EXISTS mandante_id text,
  ADD COLUMN IF NOT EXISTS mandante text;

-- Backfill: si el registro legacy tiene management_id y el management apunta a un mandante,
-- copia el mandante_id y el nombre oficial del mandante.
UPDATE lm_records lr
SET mandante_id = COALESCE(lr.mandante_id, m.mandante_id),
    mandante = COALESCE(NULLIF(lr.mandante, ''), md.name)
FROM managements m
LEFT JOIN mandantes md ON md.id = m.mandante_id
WHERE lr.management_id = m.id
  AND (lr.mandante_id IS NULL OR lr.mandante_id = '' OR lr.mandante IS NULL OR lr.mandante = '');

UPDATE tp_records tr
SET mandante_id = COALESCE(tr.mandante_id, m.mandante_id),
    mandante = COALESCE(NULLIF(tr.mandante, ''), md.name)
FROM managements m
LEFT JOIN mandantes md ON md.id = m.mandante_id
WHERE tr.management_id = m.id
  AND (tr.mandante_id IS NULL OR tr.mandante_id = '' OR tr.mandante IS NULL OR tr.mandante = '');

-- Normaliza mandantes por nombre cuando existe el texto pero falta el id.
UPDATE lm_records lr
SET mandante_id = md.id
FROM mandantes md
WHERE (lr.mandante_id IS NULL OR lr.mandante_id = '')
  AND lower(trim(lr.mandante)) = lower(trim(md.name));

UPDATE tp_records tr
SET mandante_id = md.id
FROM mandantes md
WHERE (tr.mandante_id IS NULL OR tr.mandante_id = '')
  AND lower(trim(tr.mandante)) = lower(trim(md.name));
