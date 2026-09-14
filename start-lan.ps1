$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Split-Path -Parent $MyInvocation.MyCommand.Path)
$ip = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
  Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } |
  Select-Object -First 1 -ExpandProperty IPAddress
if (-not $ip) { throw '未找到局域网 IPv4 地址，请先连接 Wi-Fi 或网线。' }
Write-Host "局域网访问地址: http://$ip`:4175/" -ForegroundColor Green
$env:ZHOUYI_HOST = '0.0.0.0'
$env:ZHOUYI_PORT = '4175'
npm start
