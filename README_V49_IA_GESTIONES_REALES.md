# OperaFix v49 - IA usando gestiones reales del CRM

Corrección aplicada:

- La IA ahora lee primero las tablas operativas reales `lm_records` y `tp_records`.
- Solo usa `managements` si no existen registros LM/TP.
- Esto evita que la IA use datos demo/antiguos como Acciona o Finanfix cuando en el CRM se ven Arcor, Coca Cola, Aramark, etc.
- Se agregó endpoint de diagnóstico:

```txt
GET /api/ai/debug-records
```

Ese endpoint permite confirmar exactamente qué registros está leyendo la IA.

## Prueba recomendada después del deploy

Abrir:

```txt
https://TU_BACKEND/api/ai/debug-records
```

Debe devolver los mismos registros que ves en Registros de empresas.

