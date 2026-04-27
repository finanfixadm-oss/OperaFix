param(
  [Parameter(Mandatory=$true)] [string]$ExcelPath,
  [string]$ApiBase = "https://operafix-production.up.railway.app/api",
  [string]$SheetName = ""
)

if (!(Test-Path $ExcelPath)) { throw "No existe el archivo: $ExcelPath" }

$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
$workbook = $excel.Workbooks.Open((Resolve-Path $ExcelPath).Path)
try {
  $sheet = if ($SheetName -ne "") { $workbook.Worksheets.Item($SheetName) } else { $workbook.Worksheets.Item(1) }
  $range = $sheet.UsedRange
  $rows = $range.Rows.Count
  $cols = $range.Columns.Count

  $headers = @{}
  for ($c=1; $c -le $cols; $c++) {
    $name = [string]$range.Cells.Item(1,$c).Text
    if ($name.Trim() -ne "") { $headers[$name.Trim().ToLower()] = $c }
  }

  function Get-Cell($aliases, $row) {
    foreach ($a in $aliases) {
      $k = $a.ToLower()
      if ($headers.ContainsKey($k)) { return [string]$range.Cells.Item($row, $headers[$k]).Text }
    }
    return ""
  }

  $ok = 0; $fail = 0
  for ($r=2; $r -le $rows; $r++) {
    $payload = @{
      mandante_name = Get-Cell @('Mandante','Mandante Nombre','Cliente') $r
      management_type = Get-Cell @('Motivo','Tipo','Tipo de exceso','management_type') $r
      entidad = Get-Cell @('Entidad','Entidad (AFP)','AFP') $r
      rut = Get-Cell @('RUT','Rut') $r
      razon_social = Get-Cell @('Razón Social','Razon Social','Empresa') $r
      grupo_empresa = Get-Cell @('Buscar Grupo','Grupo Empresa','Nombre de Grupo de empresa - LM') $r
      estado_gestion = Get-Cell @('Estado Gestión','Estado Gestion','Estado') $r
      numero_solicitud = Get-Cell @('N° Solicitud','N Solicitud','Numero Solicitud') $r
      mes_produccion_2026 = Get-Cell @('Mes de producción 2026','Mes producción','Mes de produccion') $r
      monto_devolucion = (Get-Cell @('Monto Devolución','Monto Devolucion','Monto devolución') $r) -replace '[^0-9,-]','' -replace ',','.'
      confirmacion_cc = ((Get-Cell @('Confirmación CC','Confirmacion CC') $r) -match '^(si|sí|true|1)$')
      confirmacion_poder = ((Get-Cell @('Confirmación Poder','Confirmacion Poder') $r) -match '^(si|sí|true|1)$')
      banco = Get-Cell @('Banco') $r
      tipo_cuenta = Get-Cell @('Tipo de Cuenta','Tipo Cuenta') $r
      numero_cuenta = Get-Cell @('Número cuenta','Numero cuenta','N cuenta') $r
      acceso_portal = Get-Cell @('Acceso portal') $r
    }
    if ([string]::IsNullOrWhiteSpace($payload.rut) -and [string]::IsNullOrWhiteSpace($payload.razon_social)) { continue }
    if ([string]::IsNullOrWhiteSpace($payload.management_type)) { $payload.management_type = "LM" }

    try {
      Invoke-RestMethod -Uri "$ApiBase/records" -Method Post -Body ($payload | ConvertTo-Json -Depth 5) -ContentType 'application/json; charset=utf-8' | Out-Null
      $ok++
      Write-Host "OK fila $r: $($payload.rut) $($payload.razon_social)"
    } catch {
      $fail++
      Write-Warning "Error fila $r: $($_.Exception.Message)"
    }
  }
  Write-Host "Importación terminada. OK=$ok Error=$fail"
}
finally {
  $workbook.Close($false)
  $excel.Quit()
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
}
