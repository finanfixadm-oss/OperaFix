$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $root "backend"
$frontend = Join-Path $root "frontend"

Start-Process powershell -ArgumentList "-NoExit","-Command","Set-Location '$backend'; npm run dev"
Start-Process powershell -ArgumentList "-NoExit","-Command","Set-Location '$frontend'; npm run dev"

Write-Host "Se abrieron dos ventanas PowerShell para backend y frontend." -ForegroundColor Green
