param([string]$ApiBase = "https://operafix-production.up.railway.app/api")
Write-Host "Probando health..."
Invoke-RestMethod -Uri "$ApiBase/health" -Method Get
Write-Host "Probando records..."
Invoke-RestMethod -Uri "$ApiBase/records" -Method Get | Select-Object -First 3 | Format-List
