param(
  [string]$ApiBase = "https://operafix-production.up.railway.app/api",
  [string]$ExcelPath = "C:\\Users\\Master\\Desktop\\carga masiva.xlsx"
)

if (!(Test-Path $ExcelPath)) {
  Write-Host "No existe el archivo: $ExcelPath" -ForegroundColor Red
  exit 1
}

Add-Type -AssemblyName System.Net.Http
$client = New-Object System.Net.Http.HttpClient
$form = New-Object System.Net.Http.MultipartFormDataContent
$fileStream = [System.IO.File]::OpenRead($ExcelPath)
$fileContent = New-Object System.Net.Http.StreamContent($fileStream)
$fileContent.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::Parse("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
$form.Add($fileContent, "file", [System.IO.Path]::GetFileName($ExcelPath))

try {
  $previewResponse = $client.PostAsync("$ApiBase/imports/records/preview", $form).Result
  $previewText = $previewResponse.Content.ReadAsStringAsync().Result
  Write-Host "Preview status: $($previewResponse.StatusCode)"
  Write-Host $previewText
} finally {
  $fileStream.Dispose()
  $client.Dispose()
}
