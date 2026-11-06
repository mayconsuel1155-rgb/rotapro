$ErrorActionPreference = 'Stop'
$ruleName = 'RotaPro - acesso pela rede local'
$nodePath = (Get-Command node.exe).Source
if (-not (Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue)) {
  New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Action Allow -Protocol TCP -LocalPort 8443,8081 -RemoteAddress LocalSubnet -Profile Private,Public -Program $nodePath | Out-Null
}
Write-Host 'Acesso ao RotaPro permitido somente na rede local.'
