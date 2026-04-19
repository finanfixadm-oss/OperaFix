param(
    [string]$DbHost = "localhost",
    [string]$DbPort = "5432",
    [string]$DbName = "operafix",
    [string]$DbUser = "postgres",
    [string]$DbPassword = "postgres"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Write-Host "== OperaFix Setup ==" -ForegroundColor Cyan
Write-Host "Raiz: $root" -ForegroundColor Yellow

Set-Location $root

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw "Node.js no está instalado o no está en PATH."
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    throw "npm no está disponible."
}

$envPath = Join-Path $root "backend\.env"
$envContent = @"
PORT=4000
DATABASE_URL=postgresql://$DbUser`:$DbPassword@$DbHost`:$DbPort/$DbName?schema=public
JWT_SECRET=operafix-super-secret-change-me
UPLOAD_DIR=./storage
CORS_ORIGIN=http://localhost:5173
"@

Set-Content -Path $envPath -Value $envContent -Encoding UTF8
Write-Host "Archivo backend\.env generado." -ForegroundColor Green

& "$PSScriptRoot\02-create-db.ps1" -DbHost $DbHost -DbPort $DbPort -DbName $DbName -DbUser $DbUser -DbPassword $DbPassword
& "$PSScriptRoot\03-install-backend.ps1"
& "$PSScriptRoot\04-install-frontend.ps1"

Write-Host ""
Write-Host "Setup finalizado." -ForegroundColor Green
Write-Host "Backend:  http://localhost:4000" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host ""
Write-Host "Para ejecutar ambos servicios usa:" -ForegroundColor Yellow
Write-Host ".\scripts\05-run-dev.ps1" -ForegroundColor Yellow
