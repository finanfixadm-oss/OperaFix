$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$frontend = Join-Path $root "frontend"

Set-Location $frontend
Write-Host "Instalando dependencias frontend..." -ForegroundColor Cyan
npm install
Write-Host "Frontend listo." -ForegroundColor Green
