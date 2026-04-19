# OperaFix

CRM operativo inspirado en Zoho CRM, orientado a la operación de Finanfix Solutions SpA.

## Stack
- Frontend: React + Vite + TypeScript
- Backend: Node.js + Express + TypeScript
- Base de datos: PostgreSQL
- ORM: Prisma
- Documentos: almacenamiento local en `/backend/storage`

## Requisitos
- PowerShell 5+ o PowerShell 7+
- Node.js 20+
- PostgreSQL 16+
- Git opcional

## Instalación rápida en Windows PowerShell

### 1) Descomprime este zip en:
```powershell
C:\Users\Master\Desktop\OperaFix
```

### 2) Abre PowerShell y entra a la carpeta
```powershell
Set-Location "C:\Users\Master\Desktop\OperaFix"
```

### 3) Ejecuta el instalador principal
```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\01-setup-all.ps1
```

Ese script:
- valida Node y npm
- crea la base de datos PostgreSQL
- ejecuta el SQL inicial
- instala dependencias backend y frontend
- genera `.env`
- corre Prisma generate
- deja todo listo para iniciar

### 4) Levantar el proyecto
En dos ventanas PowerShell:

#### Backend
```powershell
Set-Location "C:\Users\Master\Desktop\OperaFix\backend"
npm run dev
```

#### Frontend
```powershell
Set-Location "C:\Users\Master\Desktop\OperaFix\frontend"
npm run dev
```

## Base de datos por defecto
- Base de datos: `operafix`
- Usuario: `postgres`
- Puerto: `5432`

## Variables por defecto backend
```env
PORT=4000
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/operafix?schema=public"
JWT_SECRET="cambiar-por-un-secreto-real"
UPLOAD_DIR="./storage"
CORS_ORIGIN="http://localhost:5173"
```

## Scripts útiles
```powershell
.\scripts\01-setup-all.ps1
.\scripts\02-create-db.ps1
.\scripts\03-install-backend.ps1
.\scripts\04-install-frontend.ps1
.\scripts\05-run-dev.ps1
```

## Módulos iniciales incluidos
- Dashboard
- Empresas
- Colaboradores
- Documentos
- Grupos de empresas - LM
- Registros de empresas
- Grupos empresas - TP
- Gestiones - TP
- Login base
- Carga documental local
- API REST base
- SQL y Prisma listos para PostgreSQL
