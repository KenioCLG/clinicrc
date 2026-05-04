param(
  [string]$Email = "admin@clinicrc.app",
  [string]$ClinicName = "ClinicRC Admin",
  [string]$Password = ""
)

$ErrorActionPreference = "Stop"

$ApiKey = "AIzaSyCFR9jmFYTuvdDRj9p8AK7rXTRZEbUGIo8"
$FunctionsBaseUrl = "https://us-central1-clinicrc-8ba64.cloudfunctions.net"

if ([string]::IsNullOrWhiteSpace($Password)) {
  $chars = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%"
  $Password = "ClinicRC-" + -join (1..14 | ForEach-Object { $chars[(Get-Random -Maximum $chars.Length)] })
}

Write-Host "Criando usuario Firebase Auth..." -ForegroundColor Cyan

$signupBody = @{
  email = $Email
  password = $Password
  returnSecureToken = $true
} | ConvertTo-Json

try {
  $signup = Invoke-RestMethod `
    -Method Post `
    -Uri "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=$ApiKey" `
    -ContentType "application/json" `
    -Body $signupBody
} catch {
  $message = $_.Exception.Message
  if ($_.Exception.Response) {
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $message = $reader.ReadToEnd()
  }
  throw "Falha ao criar usuario. Verifique se Firebase Console > Authentication esta habilitado. Detalhe: $message"
}

Write-Host "Usuario criado no Auth. Criando clinica inicial..." -ForegroundColor Cyan

$clinicBody = @{ name = $ClinicName } | ConvertTo-Json

try {
  Invoke-RestMethod `
    -Method Post `
    -Uri "$FunctionsBaseUrl/clinicCreate" `
    -ContentType "application/json" `
    -Headers @{ Authorization = "Bearer $($signup.idToken)" } `
    -Body $clinicBody | Out-Null

  $clinicStatus = "Clinica criada"
} catch {
  $clinicStatus = "Usuario criado, mas clinica nao criada. Faça login no app ou publique as Cloud Functions."
}

[pscustomobject]@{
  email = $Email
  password = $Password
  uid = $signup.localId
  clinic = $ClinicName
  status = $clinicStatus
} | Format-List
