$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $root "backend"

Set-Location $backend
Write-Host "Instalando dependencias backend..." -ForegroundColor Cyan
npm install
npm run prisma:generate
Write-Host "Backend listo." -ForegroundColor Green
