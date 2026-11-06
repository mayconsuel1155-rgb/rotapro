param([string]$Address)
$ErrorActionPreference = 'Stop'
$projectPath = Split-Path -Parent $PSScriptRoot
$certPath = Join-Path $projectPath '.certs'
if (-not $Address) {
  $route = Get-NetIPConfiguration | Where-Object { $_.IPv4DefaultGateway -and $_.NetAdapter.Status -eq 'Up' } | Select-Object -First 1
  $Address = $route.IPv4Address.IPAddress | Select-Object -First 1
}
if (-not $Address) { throw 'Informe o IP da rede: npm run setup:local -- -Address 192.168.0.12' }
if (Test-Path -LiteralPath (Join-Path $certPath 'config.json')) {
  Write-Host 'Certificados existentes preservados. Use npm start.'
  exit 0
}
New-Item -ItemType Directory -Path $certPath -Force | Out-Null
$root = New-SelfSignedCertificate -Type Custom -Subject 'CN=RotaPro Local CA' -KeyAlgorithm RSA -KeyLength 2048 -HashAlgorithm SHA256 -KeyExportPolicy Exportable -KeyUsage CertSign,CRLSign -TextExtension @('2.5.29.19={critical}{text}ca=1&pathlength=0') -CertStoreLocation 'Cert:\CurrentUser\My' -NotAfter (Get-Date).AddYears(5)
$server = New-SelfSignedCertificate -Type Custom -Subject "CN=$Address" -Signer $root -KeyAlgorithm RSA -KeyLength 2048 -HashAlgorithm SHA256 -KeyExportPolicy Exportable -KeyUsage DigitalSignature,KeyEncipherment -TextExtension @("2.5.29.17={text}DNS=localhost&IPAddress=$Address&IPAddress=127.0.0.1", '2.5.29.37={text}1.3.6.1.5.5.7.3.1') -CertStoreLocation 'Cert:\CurrentUser\My' -NotAfter (Get-Date).AddYears(1)
$password = [Guid]::NewGuid().ToString('N')
Export-PfxCertificate -Cert $server -FilePath (Join-Path $certPath 'server.pfx') -Password (ConvertTo-SecureString $password -AsPlainText -Force) | Out-Null
Export-Certificate -Cert $root -FilePath (Join-Path $certPath 'rotapro-ca.cer') | Out-Null
@{ address = $Address; passphrase = $password } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $certPath 'config.json') -Encoding UTF8
Write-Host "Configurado. Execute npm start. No telefone abra http://${Address}:8081 para obter o certificado publico e as instrucoes."
