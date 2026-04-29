# OperaFix v53 - Carga masiva inteligente con IA + validación + preview tipo Zoho

## Qué incluye

- Nuevo módulo `/carga-masiva` porque el chat IA del CRM no permite adjuntar archivos.
- Carga de Excel `.xlsx` / `.xls` desde una pantalla dedicada.
- Vista previa tipo Zoho antes de insertar datos.
- Validación automática de columnas, RUT, montos, mandante, razón social y entidad.
- Detección de duplicados dentro del archivo.
- Detección de posibles duplicados en base de datos por RUT / N° Solicitud / Entidad / Mandante.
- Revisión IA con GPT-5.5 cuando `OPENAI_API_KEY` está configurada en Railway.
- Confirmación manual antes de cargar al CRM.
- Inserción en `managements` y respaldo operativo en `lm_records` / `tp_records`.
- Creación automática de Mandante, Grupo, Empresa, Línea y AFP asociada cuando no existen.

## Rutas nuevas

Backend:

- `POST /api/imports/records/preview`
- `POST /api/imports/records/commit`

Frontend:

- `/carga-masiva`

## Instalación

En backend:

```powershell
cd backend
npm install
npm run build
```

En frontend:

```powershell
cd frontend
npm install
npm run build
```

## Railway

Asegúrate de tener:

```env
OPENAI_API_KEY=tu_key_nueva
```

Luego hacer redeploy.

## Uso

1. Entrar a `Carga masiva inteligente`.
2. Seleccionar Excel.
3. Revisar validaciones.
4. Confirmar carga al CRM.
5. Revisar registros en `Registros de empresas`.

## Campos reconocidos

- Mandante
- Estado contrato con cliente
- Motivo (Tipo de exceso)
- Entidad
- Envío AFP
- Estado Gestión
- Fecha Presentación AFP
- Fecha Pago AFP
- N° Solicitud
- Grupo de empresa
- Razón Social
- RUT
- Monto Devolución
- Monto Pagado
- Monto cliente
- FEE
- Monto Finanfix Solutions
- Banco
- Tipo de Cuenta
- Número cuenta
- Confirmación CC
- Confirmación Poder
- Acceso portal
- Facturado Finanfix
- Facturado cliente
- Fecha Factura Finanfix
- Fecha pago factura Finanfix
- N° Factura
- N° OC
- Consulta CEN
- Contenido CEN
- Respuesta CEN
- Estado Trabajador
