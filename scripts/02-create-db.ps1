param(
    [string]$DbHost = "localhost",
    [string]$DbPort = "5432",
    [string]$DbName = "operafix",
    [string]$DbUser = "postgres",
    [string]$DbPassword = "postgres"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$sqlFile = Join-Path $root "database\01_schema.sql"

$psql = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psql) {
    $possible = @(
        "C:\Program Files\PostgreSQL\16\bin\psql.exe",
        "C:\Program Files\PostgreSQL\15\bin\psql.exe",
        "C:\Program Files\PostgreSQL\14\bin\psql.exe"
    ) | Where-Object { Test-Path $_ } | Select-Object -First 1

    if (-not $possible) {
        throw "No se encontró psql. Instala PostgreSQL o agrega psql al PATH."
    }

    $psqlPath = $possible
} else {
    $psqlPath = $psql.Source
}

$env:PGPASSWORD = $DbPassword

Write-Host "Creando base de datos si no existe..." -ForegroundColor Cyan

$checkDb = & $psqlPath -h $DbHost -p $DbPort -U $DbUser -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$DbName';"
if ($checkDb -ne "1") {
    & $psqlPath -h $DbHost -p $DbPort -U $DbUser -d postgres -c "CREATE DATABASE $DbName;"
    Write-Host "Base de datos $DbName creada." -ForegroundColor Green
} else {
    Write-Host "La base de datos $DbName ya existe." -ForegroundColor Yellow
}

Write-Host "Ejecutando schema SQL..." -ForegroundColor Cyan
& $psqlPath -h $DbHost -p $DbPort -U $DbUser -d $DbName -f $sqlFile

Write-Host "Base de datos lista." -ForegroundColor Green
